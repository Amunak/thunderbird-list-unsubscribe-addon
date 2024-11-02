browser.tabs.query({
	active: true,
	currentWindow: true,
}).then(handleActiveTabs)

let shouldAutoclose = false
async function autoclose() {
	if (!shouldAutoclose) {
		return
	}

	const info = await browser.windows.getCurrent()
	 browser.windows.remove(info.id)
}

async function askForMessage() {
	try {
		const response = await browser.runtime.sendMessage({action: 'getSelectedMessage'})
		await handleMessage(response.message)
	} catch (e) {
		console.warn(e)
	}
}

async function handleActiveTabs(tabs) {
	if (tabs[0].type !== 'mail') {
		shouldAutoclose = true
		await askForMessage()

		return
	}

	const message = await browser.messageDisplay.getDisplayedMessage(tabs[0].id)

	if (!message) {
		return
	}

	await handleMessage(message)
}

async function handleMessage(message) {
	let fullMessage = await browser.messages.getFull(message.id)

	const headers = fullMessage.headers
	const messageEl = document.getElementById('message')
	const actionContainerEl = document.getElementById('action-container')

	if (!headers.hasOwnProperty('list-unsubscribe')) {
		messageEl.innerText = browser.i18n.getMessage('noUnsub')
		return
	}

	let unsubEmail = null
	let unsubLink = null
	headers['list-unsubscribe'][0].split(',').forEach(link => {
		let result
		if (result = link.match(/^\s*<(mailto:.+)>/)) {
			unsubEmail = result[1]
			return
		}
		if (result = link.match(/^\s*<(https?:\/\/.+)>/)) {
			unsubLink = result[1]
			return
		}
	})

	// validate link
	if (unsubLink !== null) {
		try {
			unsubLink = new URL(unsubLink)
		} catch (e) {
			console.warn(e)
			unsubLink = null
		}
	}

	// validate and prepare email
	let unsubEmailSubject = null
	if (unsubEmail !== null) {
		try {
			unsubEmail = new URL(unsubEmail)

			// extract subject
			if (unsubEmail.searchParams.has('subject')) {
				unsubEmailSubject = unsubEmail.searchParams.get('subject')
			}

			unsubEmail = unsubEmail.pathname

			if (!unsubEmail.match(/^[^@]+@[^@]+$/)) {
				console.warn('invalid email address', unsubEmail)
				unsubEmail = null
			}
		} catch (e) {
			console.warn(e)
			unsubEmail = null
		}
	}

	if (unsubLink === null && unsubEmail === null) {
		messageEl.innerText = browser.i18n.getMessage('noUnsub')
		console.error('no valid unsubscribe link or email found')
		return
	}

	// check if RFC 8058 is supported
	let unsubCommand = null
	if (headers.hasOwnProperty('list-unsubscribe-post')) {
		unsubCommand = headers['list-unsubscribe-post'][0]
	}

	messageEl.innerText = browser.i18n.getMessage('unsubConfirmPrompt')
	if (unsubLink !== null) {
		const linkContainerEl = document.getElementById('unsub-link-container')
		const linkEl = document.createElement('code')
		linkEl.innerText = unsubLink
		linkEl.addEventListener('click', () => {
			navigator.clipboard.writeText(linkEl.innerText)
			linkEl.classList.add('hl')
			setTimeout(() => {
				linkEl.classList.remove('hl')
			}, 100)
		})

		linkContainerEl.innerText = browser.i18n.getMessage('unsubLink')
		linkContainerEl.appendChild(linkEl)

		if (unsubCommand) {
			const button = document.createElement('button')
			button.innerText = browser.i18n.getMessage('confirmOneClick')
			button.addEventListener('click', async () => {
				linkContainerEl.style.display = 'none'
				actionContainerEl.style.display = 'none'
				messageEl.innerText = browser.i18n.getMessage('oneClickInProgress')

				try {
					await fetch(unsubLink, {
						method: 'POST',
						body: unsubCommand,
					});
					messageEl.innerText = browser.i18n.getMessage(
						'oneClickSuccess'
					);
				} catch (e) {
					messageEl.innerText = browser.i18n.getMessage(
						'oneClickFailure',
						e.message
					);
				}
			})

			actionContainerEl.appendChild(button)
		}

		const button = document.createElement('button')
		button.innerText = browser.i18n.getMessage('confirmOpenLink')
		button.addEventListener('click', async () => {
			browser.tabs.create({
				url: unsubLink.toString(),
			})
			await autoclose()
		})
		actionContainerEl.appendChild(button)
	}

	if (unsubEmail !== null) {
		const button = document.createElement('button')
		button.innerText = browser.i18n.getMessage('confirmComposeEmail')
		button.addEventListener('click', async () => {
			const identityId = await (async (message) => {
				// try to get identityId from the message
				if (typeof message.folder === 'Object') {
					const identities = await messenger.accounts.get(message.folder.accountId).identities
					// we can use it only if there is only one identity
					if (identities.length === 1) {
						return identities[0].id
					}
				}

				// try match email address to identity
				const identities = await messenger.identities.list()
				const matching = identities.find(identity => message.recipients.some(email => identity.email === email))
				if (matching === undefined) {
					console.warn('no matching identity found, using default')
					return identities[0].id
				}

				return matching.id

			})(message)
			browser.compose.beginNew({
				to: unsubEmail,
				subject: unsubEmailSubject ?? 'unsubscribe',
				identityId,
			})
			await autoclose()
		})
		actionContainerEl.appendChild(button)
	}
}

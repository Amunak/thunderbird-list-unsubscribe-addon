import { fetchOptions } from '/modules/options.js'

browser.mailTabs.onSelectedMessagesChanged.addListener(async (tab, messageList) => {
	if (messageList.messages.length !== 1) {
		browser.messageDisplayAction.disable()
		return
	}

	const message = await browser.messages.getFull(messageList.messages[0].id)
	if (message.headers.hasOwnProperty('list-unsubscribe')) {
		browser.messageDisplayAction.enable()
		return
	}

	browser.messageDisplayAction.disable()
})

const menuItemId = 'message-list-unsub-button'
browser.runtime.onMessage.addListener(async (runtimeMessage, sender, sendResponse) => {
	if (runtimeMessage.action !== 'optionsChanged') {
		return
	}

	browser.menus.remove(menuItemId)
	await enableContextButton()
})

window.addEventListener('load', enableContextButton)
async function enableContextButton() {
	const options = await fetchOptions()
	if (options.enableContextButton !== 'enable') {
		return
	}

	let menuItemEnabled = false
	let selectedMessage = null

	const openWindow = () => {
		if (selectedMessage === null) {
			return
		}

		messenger.windows.create({
			url: "popup.html",
			type: "popup",
			height: 240,
			width: 580,
			allowScriptsToClose: true,
		})
	}

	browser.menus.create({
		id: menuItemId,
		contexts: ['message_list'],
		title: browser.i18n.getMessage('unsubButtonLabel'),
		enabled: menuItemEnabled,
		onclick: openWindow
	})

	let lastMenuInstanceId = 0
	let nextMenuInstanceId = 1
	browser.menus.onShown.addListener(async (info, tab) => {
		let menuInstanceId = nextMenuInstanceId++
		lastMenuInstanceId = menuInstanceId

		if (!info.contexts.includes('message_list')) {
			return
		}

		if (info.selectedMessages.messages.length === 1) {
			const message = info.selectedMessages.messages[0]
			const fullMessage = await browser.messages.getFull(message.id)
			selectedMessage = message

			if (menuInstanceId !== lastMenuInstanceId) {
				return
			}

			if (fullMessage.headers.hasOwnProperty('list-unsubscribe')) {
				if (!menuItemEnabled) {
					menuItemEnabled = true
					browser.menus.update(menuItemId, {enabled: menuItemEnabled})
					browser.menus.refresh()
				}
				return
			}
		}

		selectedMessage = null
		if (menuItemEnabled) {
			menuItemEnabled = false
			browser.menus.update(menuItemId, {enabled: menuItemEnabled})
			browser.menus.refresh()
		}
	})
	browser.menus.onHidden.addListener(() => {
		lastMenuInstanceId = 0
	})

	// send last message ID when asked for it
	browser.runtime.onMessage.addListener((runtimeMessage, sender, sendResponse) => {
		if (runtimeMessage.action !== 'getSelectedMessage') {
			return
		}

		sendResponse({message: selectedMessage})
	})
}

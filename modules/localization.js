document.querySelectorAll('[data-l10n-id]').forEach(el => {
	const id = el.dataset.l10nId
	const message = browser.i18n.getMessage(id)

	if (message === '') {
		console.error(`Locale ${browser.i18n.getUILanguage()} is missing translation key "${id}"`)
		return
	}

	el.innerText = message
})
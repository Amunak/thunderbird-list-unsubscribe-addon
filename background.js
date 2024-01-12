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

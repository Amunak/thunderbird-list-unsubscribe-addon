/**
 * @typedef {Object} Options
 * @property { "enable" | "disable" } enableContextButton
 */

/**
 * @type Options
 */
export const defaults = {
	enableContextButton: 'disable',
}

/**
 * @returns {Promise<Options>}
 */
export async function fetchOptions() {
	let options = await browser.storage.local.get()
	options = options.options || {}

	// ignore unknown options
	for (const key in options) {
		if (!(key in defaults)) {
			console.warn(`Deleting unknown option "${key}"`)
			delete options[key]
		}
	}

	return Object.assign({}, defaults, options)
}

/**
 * @param options {Options}
 * @returns {Promise<void>}
 */
export async function saveOptions(options) {
	// don't save defaults
	for (const key in defaults) {
		if (options[key] === defaults[key]) {
			delete options[key]
		}
	}


	await browser.storage.local.set({options})
}

/**
 * @returns {Options}
 */
export function readFormValues() {
	const formElements = document.forms.optionsForm.elements
	const values = structuredClone(defaults)

	for (const key in defaults) {
		const element = formElements[key]
		if (!element) {
			console.error(`Element "${key}" not found`)
		}
		values[key] = element.value
	}

	return values
}

/**
 * @returns {Promise<void>}
 */
export async function setInitialFormValues() {
	const options = await fetchOptions()

	const formElements = document.forms.optionsForm.elements
	for (const key in options) {
		const element = formElements[key]
		if (!element) {
			console.error(`Element "${key}" not found`)
		}

		element.value = options[key]
	}
}

export default async function registerFormChangeHandler() {
	document.addEventListener('DOMContentLoaded', async () => {
		await setInitialFormValues()

		document.forms.optionsForm.addEventListener('change', async () => {
			await saveOptions(readFormValues())
			browser.runtime.sendMessage({action: 'optionsChanged'})
		})
	})
}
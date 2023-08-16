const BLUEPRINT = 'xyxxyxyx'

export function id() {
	let dt = new Date().getTime()
	const RESULT = BLUEPRINT.replace(/[xy]/g, function (c) {
		const r = (dt + Math.random() * 16) % 16 | 0
		dt = Math.floor(dt / 16)
		return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16)
	})
	return RESULT
}

import { event } from '$lib'
export const GET = async function serve() {
  return event(function run(emit) {
    const a = Array(15000).fill(
      'setting-' + (Math.random() + 1).toString(36).substring(7),
    )
    emit(JSON.stringify([`${Date.now()}`, ...a]))
  }).toResponse()
}

import { fail } from '@sveltejs/kit'
import { lobby, updateStore } from '../mock-db.server'

export const actions = {
  async rejoin({ request }) {
    const form = await request.formData()

    const id = form.get('id')
    if (!id || typeof id !== 'string') return fail(400)

    updateStore(lobby, { id, approved: undefined })
  },
}

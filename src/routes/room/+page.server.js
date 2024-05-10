import { fail } from '@sveltejs/kit'
import { lobby, updateStore } from './mock-db.server'

export const actions = {
  async approve({ request }) {
    const data = await request.formData()
    const id = data.get('id')
    if (!id || typeof id !== 'string') return fail(400)

    updateStore(lobby, { id, approved: true })
  },
  async decline({ request }) {
    const data = await request.formData()
    const id = data.get('id')
    if (!id || typeof id !== 'string') return fail(400)

    updateStore(lobby, { id, approved: false })
  },
}

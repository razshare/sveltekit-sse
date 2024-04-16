import { redirect } from '@sveltejs/kit'

export const actions = {
  default() {
    redirect(303, '?anywhere')
  },
}

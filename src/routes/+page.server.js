import { redirect } from '@sveltejs/kit'

const languages = ['en', 'it']

export const actions = {
  default() {
    const lang = languages[Math.floor(Math.random() * languages.length)]
    redirect(303, `?lang=${lang}`)
  },
}

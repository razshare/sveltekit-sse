import { produce } from '$lib'

export function POST() {
  return produce(function start({ emit }) {
    const notifications = [
      { title: 'title-1', body: 'lorem...' },
      { title: 'title-2', body: 'lorem...' },
      { title: 'title-3', body: 'lorem...' },
    ]

    for (const notification of notifications) {
      const { error } = emit('notification', JSON.stringify(notification))
      if (error) {
        // Make sure to check for errors,
        // otherwise your stream will keep producing data
        // and you'll create a memory leak.
        return
      }
    }
  })
}

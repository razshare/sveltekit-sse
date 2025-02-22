import { source } from '$lib/source'

const connection = source('/issue-65/stats')
export const stats = connection.select('message').json(function or() {
  return { cpu_usage: '0.00%', memory: '0.00 MB', time: 0 }
})

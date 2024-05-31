<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'

  source('/issue-48/events', {
    cache: false,
    open() {
      console.log('connected')
      playwright.state.issue48.connected++
    },
  })
    .select('event0')
    .subscribe(function watch(data) {
      playwright.state.issue48.messages.push(data)
      console.log('test', data)
    })

  source('/issue-48/events', {
    cache: true,
    open() {
      console.log('connected')
      playwright.state.issue48.connected++
    },
  })
    .select('event0')
    .subscribe(function watch(data) {
      playwright.state.issue48.messages.push(data)
      console.log('test', data)
    })

  source('/issue-48/events', {
    cache: true,
    open() {
      console.log('connected')
      playwright.state.issue48.connected++
    },
  })
    .select('event0')
    .subscribe(function watch(data) {
      playwright.state.issue48.messages.push(data)
      console.log('test', data)
    })

  setTimeout(function run() {
    source('/issue-48/events', {
      cache: true,
      open() {
        console.log('connected')
        playwright.state.issue48.connected++
      },
    })
      .select('event0')
      .subscribe(function watch(data) {
        playwright.state.issue48.messages.push(data)
        console.log('test', data)
      })
  }, 1000)
</script>

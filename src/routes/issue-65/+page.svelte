<script>
  import { source } from '$lib'

  const connection = source('/events')
  const stats = connection.select('message').json(function or() {
    return { cpu_usage: '0.00%', memory: '0.00 MB', time: 0 }
  })
</script>

<main>
  <h2>Admin dashboard page</h2>

  <span>Cpu usage - {$stats.cpu_usage}</span><br />
  <span>Memory - {$stats.memory}</span><br />
  <span>Time - {$stats.time}</span><br />
</main>

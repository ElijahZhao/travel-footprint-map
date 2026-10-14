// keepalive-db — CloudBase scheduled cloud function.
// Runs every 5 minutes to (1) keep the managed PostgreSQL instance warm so it
// is never auto-suspended, and (2) verify the checkins table is visible to the
// REST gateway. Self-healing (recreating tables) is handled by scripts/keepalive.sh
// on deploy, since that needs elevated privileges not available here.
const ENV_ID = 'travel-footprint-d8em6aa6331d820'
const KEY = process.env.PG_PUBLISH_KEY || ''
const REST = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest`

async function probe(path, method = 'GET', body) {
  try {
    const res = await fetch(`${REST}${path}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.status
  } catch (e) {
    return -1
  }
}

exports.main = async () => {
  // ping_db reaches the engine even if checkins is missing — keeps instance warm.
  const warm = await probe('/rpc/ping_db', 'POST', {})
  // checkins visibility is the real health signal for the app.
  const checkins = await probe('/checkins?select=id&limit=1', 'GET')
  const ok = warm === 200 && checkins !== 404
  console.log(`[keepalive] ping_db=${warm} checkins=${checkins} ok=${ok}`)
  return { warm, checkins, ok }
}

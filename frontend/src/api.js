const BASE = '/api'

async function handle(res) {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json()
}

export async function createClient(formData) {
  return handle(await fetch(`${BASE}/clients`, { method: 'POST', body: formData }))
}

export async function getClient(cid) {
  return handle(await fetch(`${BASE}/clients/${cid}`))
}

export async function saveAssessment(cid, answers, coverage) {
  return handle(await fetch(`${BASE}/clients/${cid}/assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, coverage }),
  }))
}

export function streamAnalysis(cid, onEvent) {
  const es = new EventSource(`${BASE}/clients/${cid}/analyze`)
  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data)
      onEvent(data)
      if (data.type === 'done' || data.type === 'error') {
        es.close()
      }
    } catch (e) {
      console.error('sse parse', e)
    }
  }
  es.onerror = () => { es.close() }
  return es
}

export async function getAnalysis(cid) {
  return handle(await fetch(`${BASE}/clients/${cid}/analysis`))
}

export async function implementDecision(cid, strategy_name, decision) {
  return handle(await fetch(`${BASE}/clients/${cid}/implement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy_name, decision }),
  }))
}

export async function listPortfolio() {
  return handle(await fetch(`${BASE}/portfolio`))
}

export async function deleteFromPortfolio(cid) {
  await fetch(`${BASE}/portfolio/${cid}`, { method: 'DELETE' })
}

export async function seedDemo() {
  return handle(await fetch(`${BASE}/seed`, { method: 'POST' }))
}

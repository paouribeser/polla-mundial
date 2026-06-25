export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { nombre, equipoLocal, equipoVisitante, fechaPartido, cuota } = body

    if (!nombre?.trim() || !equipoLocal?.trim() || !equipoVisitante?.trim()) {
      return Response.json({ error: 'Campos requeridos' }, { status: 400 })
    }

    const id = Math.random().toString(36).substr(2, 6).toUpperCase()
    const creadorToken = Math.random().toString(36).substr(2, 24)
    const now = Date.now()

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL') || 'https://m42ci5ep.us-east.insforge.app'
    const apiKey = Deno.env.get('API_KEY')

    const res = await fetch(`${baseUrl}/rest/v1/pollas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id,
        nombre: nombre.trim(),
        equipoLocal: equipoLocal.trim(),
        equipoVisitante: equipoVisitante.trim(),
        fechaPartido: fechaPartido || '',
        cuota: Math.max(0, parseInt(cuota) || 20000),
        estado: 'registro',
        cierreRegistro: now + 30 * 60 * 1000,
        creadorToken,
        creadoEn: now
      })
    })

    if (!res.ok) {
      const error = await res.text()
      return Response.json({ error }, { status: res.status })
    }

    return Response.json({ id, creadorToken })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { nombre, equipoLocal, equipoVisitante, fechaPartido, cuota } = body

    if (!nombre?.trim() || !equipoLocal?.trim() || !equipoVisitante?.trim()) {
      return Response.json({ error: 'Campos requeridos' }, { status: 400, headers: corsHeaders })
    }

    const id = Math.random().toString(36).substr(2, 6).toUpperCase()
    const creadorToken = Math.random().toString(36).substr(2, 24)
    const now = Date.now()

    // Use Deno.kv for persistence
    const kv = await Deno.openKv()

    const pollaData = {
      id,
      nombre: nombre.trim(),
      equipoLocal: equipoLocal.trim(),
      equipoVisitante: equipoVisitante.trim(),
      fechaPartido: fechaPartido || '',
      cuota: Math.max(0, parseInt(cuota) || 20000),
      estado: 'registro',
      cierreRegistro: now + 30 * 60 * 1000,
      creadorToken,
      creadoEn: now,
      participantes: [],
      ordenSorteo: [],
      turnoActual: 0,
      elecciones: {},
      resultadoFinal: null
    }

    await kv.set(['polla', id], pollaData)

    return Response.json({ id, creadorToken }, { headers: corsHeaders })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders })
  }
}

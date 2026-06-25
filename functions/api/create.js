const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function genId(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function genToken(len = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.POLLAS) {
    return new Response(JSON.stringify({ error: 'KV no configurado. Configura el binding POLLAS en Cloudflare Pages.' }), { status: 500, headers: CORS });
  }
  try {
    const body = await request.json();
    const { nombre, equipoLocal, equipoVisitante, fechaPartido, cuota } = body;

    if (!nombre?.trim() || !equipoLocal?.trim() || !equipoVisitante?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre, equipo local y visitante son obligatorios' }), { status: 400, headers: CORS });
    }

    const id = genId(6);
    const creadorToken = genToken();

    const polla = {
      id,
      nombre: nombre.trim(),
      equipoLocal: equipoLocal.trim(),
      equipoVisitante: equipoVisitante.trim(),
      fechaPartido: fechaPartido || '',
      cuota: Math.max(0, parseInt(cuota) || 20000),
      estado: 'registro',                           // registro | eleccion | terminado
      cierreRegistro: Date.now() + 30 * 60 * 1000, // +30 min
      participantes: [],                            // [{ nombre, token, orden, eleccion }]
      ordenSorteo: [],
      turnoActual: 0,
      elecciones: {},                               // { nombre: { local, visitante } }
      resultadoFinal: null,
      creadorToken,
      creadoEn: Date.now(),
    };

    // TTL 30 días
    await env.POLLAS.put(id, JSON.stringify(polla), { expirationTtl: 60 * 60 * 24 * 30 });

    return new Response(JSON.stringify({ id, creadorToken }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error interno: ' + e.message }), { status: 500, headers: CORS });
  }
}

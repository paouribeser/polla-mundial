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
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400, headers: corsHeaders });
    }

    const kv = await Deno.openKv()
    const result = await kv.get(['polla', id.toUpperCase()])

    if (!result.value) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    const polla = result.value;

    if (polla.estado !== 'registro') {
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (polla.participantes.length < 2) {
      return Response.json({ error: 'Mínimo 2 participantes' }, { status: 400, headers: corsHeaders });
    }

    const shuffled = [...polla.participantes].sort(() => Math.random() - 0.5);
    polla.participantes = shuffled.map((p, i) => ({ ...p, orden: i + 1 }));
    polla.ordenSorteo = shuffled.map(p => p.nombre);
    polla.estado = 'eleccion';
    polla.turnoActual = 0;

    await kv.set(['polla', id.toUpperCase()], polla)

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

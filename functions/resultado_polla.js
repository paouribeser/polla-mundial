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
    const { id, token, local, visitante } = body;

    if (!id || !token || local === undefined || visitante === undefined) {
      return Response.json({ error: 'Parámetros requeridos' }, { status: 400, headers: corsHeaders });
    }

    const kv = await Deno.openKv()
    const result = await kv.get(['polla', id.toUpperCase()])

    if (!result.value) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    const polla = result.value;

    if (token !== polla.creadorToken) {
      return Response.json({ error: 'No autorizado' }, { status: 403, headers: corsHeaders });
    }

    const local_n = parseInt(local);
    const vis_n = parseInt(visitante);

    if (isNaN(local_n) || isNaN(vis_n)) {
      return Response.json({ error: 'Resultado inválido' }, { status: 400, headers: corsHeaders });
    }

    polla.resultadoFinal = { local: local_n, visitante: vis_n };

    await kv.set(['polla', id.toUpperCase()], polla)

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

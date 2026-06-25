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

    const local_n = parseInt(local);
    const vis_n = parseInt(visitante);

    if (isNaN(local_n) || isNaN(vis_n) || local_n < 0 || local_n > 5 || vis_n < 0 || vis_n > 5) {
      return Response.json({ error: 'Marcador inválido' }, { status: 400, headers: corsHeaders });
    }

    const kv = await Deno.openKv()
    const result = await kv.get(['polla', id.toUpperCase()])

    if (!result.value) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    const polla = result.value;

    if (polla.estado !== 'eleccion') {
      return Response.json({ error: 'No es momento de elegir' }, { status: 400, headers: corsHeaders });
    }

    const participante = polla.participantes.find(p => p.token === token);
    if (!participante) {
      return Response.json({ error: 'Token inválido' }, { status: 403, headers: corsHeaders });
    }

    if (participante.nombre !== polla.ordenSorteo[polla.turnoActual]) {
      return Response.json({ error: 'No es tu turno' }, { status: 400, headers: corsHeaders });
    }

    const taken = Object.entries(polla.elecciones).find(([_, e]) => e.local === local_n && e.visitante === vis_n);
    if (taken) {
      return Response.json({ error: `Marcador tomado por ${taken[0]}` }, { status: 400, headers: corsHeaders });
    }

    polla.elecciones[participante.nombre] = { local: local_n, visitante: vis_n };
    const idx = polla.participantes.findIndex(p => p.token === token);
    polla.participantes[idx].eleccion = { local: local_n, visitante: vis_n };
    polla.turnoActual += 1;
    if (polla.turnoActual >= polla.ordenSorteo.length) polla.estado = 'terminado';

    await kv.set(['polla', id.toUpperCase()], polla)

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

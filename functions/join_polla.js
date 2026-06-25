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
    const { id, nombre } = body;

    if (!id || !nombre?.trim()) {
      return Response.json({ error: 'ID y nombre requeridos' }, { status: 400, headers: corsHeaders });
    }

    const kv = await Deno.openKv()
    const result = await kv.get(['polla', id.toUpperCase()])

    if (!result.value) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    const polla = result.value;

    if (polla.estado !== 'registro') {
      return Response.json({ error: 'Registro cerrado' }, { status: 400, headers: corsHeaders });
    }

    if (polla.participantes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      return Response.json({ error: 'Nombre duplicado' }, { status: 400, headers: corsHeaders });
    }

    const token = Math.random().toString(36).substr(2, 24);
    polla.participantes.push({ nombre: nombre.trim(), token, orden: null });

    await kv.set(['polla', id.toUpperCase()], polla)

    return Response.json({ token, nombre: nombre.trim() }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'ID requerido' }, { status: 400, headers: corsHeaders });
  }

  try {
    const kv = await Deno.openKv()
    const result = await kv.get(['polla', id.toUpperCase()])

    if (!result.value) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    return Response.json(result.value, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders })
  }
}

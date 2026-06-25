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

    const baseUrl = Deno.env.get('INSFORGE_BASE_URL') || 'https://m42ci5ep.us-east.insforge.app'
    const apiKey = Deno.env.get('API_KEY')

    const pollaRes = await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}&select=estado`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const pollas = await pollaRes.json();
    if (!pollas || pollas.length === 0) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
    }

    if (pollas[0].estado !== 'registro') {
      return Response.json({ error: 'Registro cerrado' }, { status: 400, headers: corsHeaders });
    }

    const existRes = await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&nombre=eq.${encodeURIComponent(nombre.trim())}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const existing = await existRes.json();
    if (existing && existing.length > 0) {
      return Response.json({ error: 'Nombre duplicado' }, { status: 400, headers: corsHeaders });
    }

    const token = Math.random().toString(36).substr(2, 24);

    const insertRes = await fetch(`${baseUrl}/rest/v1/participantes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pollaId: id.toUpperCase(),
        nombre: nombre.trim(),
        token
      })
    });

    if (!insertRes.ok) {
      const error = await insertRes.text();
      return Response.json({ error }, { status: insertRes.status, headers: corsHeaders });
    }

    return Response.json({ token, nombre: nombre.trim() }, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

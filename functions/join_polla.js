export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { id, nombre } = body;

    if (!id || !nombre?.trim()) {
      return Response.json({ error: 'ID y nombre requeridos' }, { status: 400 });
    }

    const baseUrl = Deno.env.get('INSFORGE_URL') || 'https://m42ci5ep.us-east.insforge.app'
    const apiKey = Deno.env.get('INSFORGE_API_KEY')

    const pollaRes = await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}&select=estado`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const pollas = await pollaRes.json();
    if (!pollas || pollas.length === 0) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404 });
    }

    if (pollas[0].estado !== 'registro') {
      return Response.json({ error: 'Registro cerrado' }, { status: 400 });
    }

    const existRes = await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&nombre=eq.${encodeURIComponent(nombre.trim())}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const existing = await existRes.json();
    if (existing && existing.length > 0) {
      return Response.json({ error: 'Nombre duplicado' }, { status: 400 });
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
      return Response.json({ error }, { status: insertRes.status });
    }

    return Response.json({ token, nombre: nombre.trim() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

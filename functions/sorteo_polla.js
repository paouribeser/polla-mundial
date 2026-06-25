export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400 });
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
      return Response.json({ ok: true });
    }

    const particRes = await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&select=nombre`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const participantes = await particRes.json();
    if (!participantes || participantes.length < 2) {
      return Response.json({ error: 'Mínimo 2 participantes' }, { status: 400 });
    }

    const shuffled = [...participantes].sort(() => Math.random() - 0.5);
    const ordenSorteo = shuffled.map(p => p.nombre);

    await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estado: 'eleccion',
        ordenSorteo,
        turnoActual: 0
      })
    });

    for (let i = 0; i < shuffled.length; i++) {
      await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&nombre=eq.${encodeURIComponent(shuffled[i].nombre)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orden: i + 1 })
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

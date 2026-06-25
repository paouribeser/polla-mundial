export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { id, token, local, visitante } = body;

    if (!id || !token || local === undefined || visitante === undefined) {
      return Response.json({ error: 'Parámetros requeridos' }, { status: 400 });
    }

    const baseUrl = Deno.env.get('INSFORGE_URL') || 'https://m42ci5ep.us-east.insforge.app'
    const apiKey = Deno.env.get('INSFORGE_API_KEY')

    const pollaRes = await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}&select=creadorToken`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const pollas = await pollaRes.json();
    if (!pollas || pollas.length === 0) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404 });
    }

    if (token !== pollas[0].creadorToken) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const local_n = parseInt(local);
    const vis_n = parseInt(visitante);

    if (isNaN(local_n) || isNaN(vis_n)) {
      return Response.json({ error: 'Resultado inválido' }, { status: 400 });
    }

    const resultadoFinal = { local: local_n, visitante: vis_n };

    await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resultadoFinal })
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

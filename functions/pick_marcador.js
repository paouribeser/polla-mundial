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

    const local_n = parseInt(local);
    const vis_n = parseInt(visitante);

    if (isNaN(local_n) || isNaN(vis_n) || local_n < 0 || local_n > 5 || vis_n < 0 || vis_n > 5) {
      return Response.json({ error: 'Marcador inválido' }, { status: 400 });
    }

    const baseUrl = Deno.env.get('INSFORGE_URL') || 'https://m42ci5ep.us-east.insforge.app'
    const apiKey = Deno.env.get('INSFORGE_API_KEY')

    const pollaRes = await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}&select=estado,ordenSorteo,turnoActual`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const pollas = await pollaRes.json();
    if (!pollas || pollas.length === 0) {
      return Response.json({ error: 'Polla no encontrada' }, { status: 404 });
    }

    const polla = pollas[0];
    if (polla.estado !== 'eleccion') {
      return Response.json({ error: 'No es momento de elegir' }, { status: 400 });
    }

    const partRes = await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&token=eq.${token}&select=nombre,id`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const participantes = await partRes.json();
    if (!participantes || participantes.length === 0) {
      return Response.json({ error: 'Token inválido' }, { status: 403 });
    }

    const participante = participantes[0];
    if (participante.nombre !== polla.ordenSorteo[polla.turnoActual]) {
      return Response.json({ error: 'No es tu turno' }, { status: 400 });
    }

    const elecRes = await fetch(`${baseUrl}/rest/v1/elecciones?pollaId=eq.${id.toUpperCase()}&local=eq.${local_n}&visitante=eq.${vis_n}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const elecciones = await elecRes.json();
    if (elecciones && elecciones.length > 0) {
      return Response.json({
        error: `Marcador tomado por ${elecciones[0].nombre}`
      }, { status: 400 });
    }

    await fetch(`${baseUrl}/rest/v1/elecciones`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pollaId: id.toUpperCase(),
        participanteId: participante.id,
        nombre: participante.nombre,
        local: local_n,
        visitante: vis_n
      })
    });

    const newTurno = polla.turnoActual + 1;
    const newEstado = newTurno >= polla.ordenSorteo.length ? 'terminado' : 'eleccion';

    await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        turnoActual: newTurno,
        estado: newEstado
      })
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

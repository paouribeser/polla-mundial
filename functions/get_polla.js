export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'ID requerido' }, { status: 400 });
  }

  const baseUrl = Deno.env.get('INSFORGE_URL') || 'https://m42ci5ep.us-east.insforge.app'
  const anonKey = Deno.env.get('INSFORGE_ANON_KEY')

  const pollaRes = await fetch(`${baseUrl}/rest/v1/pollas?id=eq.${id.toUpperCase()}&select=id,nombre,equipoLocal,equipoVisitante,fechaPartido,cuota,estado,cierreRegistro,ordenSorteo,turnoActual,resultadoFinal,creadoEn`, {
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    }
  });

  const pollas = await pollaRes.json();
  if (!pollas || pollas.length === 0) {
    return Response.json({ error: 'Polla no encontrada' }, { status: 404 });
  }

  const polla = pollas[0];

  const particRes = await fetch(`${baseUrl}/rest/v1/participantes?pollaId=eq.${id.toUpperCase()}&select=nombre,orden`, {
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    }
  });

  const elecRes = await fetch(`${baseUrl}/rest/v1/elecciones?pollaId=eq.${id.toUpperCase()}&select=nombre,local,visitante`, {
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    }
  });

  const participantes = await particRes.json();
  const elecciones = await elecRes.json();

  return Response.json({
    ...polla,
    participantes: participantes || [],
    elecciones: elecciones || []
  });
}

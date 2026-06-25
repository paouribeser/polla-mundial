import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

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

    const dbUrl = Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      return Response.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

    const client = new Client(dbUrl)
    await client.connect()

    try {
      const polla = await client.queryObject`SELECT estado, ordenSorteo, turnoActual FROM public.pollas WHERE id = ${id.toUpperCase()}`
      if (polla.rows.length === 0) {
        return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
      }

      const p = polla.rows[0];
      if (p.estado !== 'eleccion') {
        return Response.json({ error: 'No es momento de elegir' }, { status: 400, headers: corsHeaders });
      }

      const part = await client.queryObject`SELECT nombre FROM public.participantes WHERE pollaId = ${id.toUpperCase()} AND token = ${token}`
      if (part.rows.length === 0) {
        return Response.json({ error: 'Token inválido' }, { status: 403, headers: corsHeaders });
      }

      const orden = JSON.parse(p.ordenSorteo);
      if (part.rows[0].nombre !== orden[p.turnoActual]) {
        return Response.json({ error: 'No es tu turno' }, { status: 400, headers: corsHeaders });
      }

      const taken = await client.queryObject`SELECT nombre FROM public.elecciones WHERE pollaId = ${id.toUpperCase()} AND local = ${local_n} AND visitante = ${vis_n}`
      if (taken.rows.length > 0) {
        return Response.json({ error: `Marcador tomado por ${taken.rows[0].nombre}` }, { status: 400, headers: corsHeaders });
      }

      await client.queryObject`INSERT INTO public.elecciones (pollaId, nombre, local, visitante) VALUES (${id.toUpperCase()}, ${part.rows[0].nombre}, ${local_n}, ${vis_n})`

      const newTurno = p.turnoActual + 1;
      const newEstado = newTurno >= orden.length ? 'terminado' : 'eleccion';
      await client.queryObject`UPDATE public.pollas SET turnoActual = ${newTurno}, estado = ${newEstado} WHERE id = ${id.toUpperCase()}`

      return Response.json({ ok: true }, { headers: corsHeaders });
    } finally {
      await client.end()
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

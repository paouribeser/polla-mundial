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
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'ID requerido' }, { status: 400, headers: corsHeaders });
    }

    const dbUrl = Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      return Response.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

    const client = new Client(dbUrl)
    await client.connect()

    try {
      const polla = await client.queryObject`SELECT estado FROM public.pollas WHERE id = ${id.toUpperCase()}`
      if (polla.rows.length === 0) {
        return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
      }

      if (polla.rows[0].estado !== 'registro') {
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      const participantes = await client.queryObject`SELECT nombre FROM public.participantes WHERE pollaId = ${id.toUpperCase()} ORDER BY nombre`
      if (participantes.rows.length < 2) {
        return Response.json({ error: 'Mínimo 2 participantes' }, { status: 400, headers: corsHeaders });
      }

      const names = participantes.rows.map(r => r.nombre);
      const shuffled = names.sort(() => Math.random() - 0.5);
      const ordenSorteo = JSON.stringify(shuffled);

      await client.queryObject`UPDATE public.pollas SET estado = 'eleccion', ordenSorteo = ${ordenSorteo}, turnoActual = 0 WHERE id = ${id.toUpperCase()}`

      for (let i = 0; i < shuffled.length; i++) {
        await client.queryObject`UPDATE public.participantes SET orden = ${i + 1} WHERE pollaId = ${id.toUpperCase()} AND nombre = ${shuffled[i]}`
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    } finally {
      await client.end()
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

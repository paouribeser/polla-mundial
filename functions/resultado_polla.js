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

    const dbUrl = Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      return Response.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

    const client = new Client(dbUrl)
    await client.connect()

    try {
      const polla = await client.queryObject`SELECT creadorToken FROM public.pollas WHERE id = ${id.toUpperCase()}`
      if (polla.rows.length === 0) {
        return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
      }

      if (token !== polla.rows[0].creadorToken) {
        return Response.json({ error: 'No autorizado' }, { status: 403, headers: corsHeaders });
      }

      const local_n = parseInt(local);
      const vis_n = parseInt(visitante);

      if (isNaN(local_n) || isNaN(vis_n)) {
        return Response.json({ error: 'Resultado inválido' }, { status: 400, headers: corsHeaders });
      }

      const resultadoFinal = JSON.stringify({ local: local_n, visitante: vis_n });
      await client.queryObject`UPDATE public.pollas SET resultadoFinal = ${resultadoFinal} WHERE id = ${id.toUpperCase()}`

      return Response.json({ ok: true }, { headers: corsHeaders });
    } finally {
      await client.end()
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

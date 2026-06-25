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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'ID requerido' }, { status: 400, headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get('DATABASE_URL') || Deno.env.get('INSFORGE_DB_URL') || Deno.env.get('POSTGRES_URL')
    if (!dbUrl) {
      return Response.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

    const client = new Client(dbUrl)
    await client.connect()

    try {
      const result = await client.queryObject`
        SELECT * FROM public.pollas WHERE id = ${id.toUpperCase()}
      `
      if (result.rows.length === 0) {
        return Response.json({ error: 'Polla no encontrada' }, { status: 404, headers: corsHeaders });
      }
      return Response.json(result.rows[0], { headers: corsHeaders });
    } finally {
      await client.end()
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders })
  }
}

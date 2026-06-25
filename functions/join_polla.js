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
    const { id, nombre } = body;

    if (!id || !nombre?.trim()) {
      return Response.json({ error: 'ID y nombre requeridos' }, { status: 400, headers: corsHeaders });
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
        return Response.json({ error: 'Registro cerrado' }, { status: 400, headers: corsHeaders });
      }

      const existing = await client.queryObject`SELECT nombre FROM public.participantes WHERE pollaId = ${id.toUpperCase()} AND LOWER(nombre) = LOWER(${nombre.trim()})`
      if (existing.rows.length > 0) {
        return Response.json({ error: 'Nombre duplicado' }, { status: 400, headers: corsHeaders });
      }

      const token = Math.random().toString(36).substr(2, 24);
      await client.queryObject`INSERT INTO public.participantes (pollaId, nombre, token) VALUES (${id.toUpperCase()}, ${nombre.trim()}, ${token})`

      return Response.json({ token, nombre: nombre.trim() }, { headers: corsHeaders });
    } finally {
      await client.end()
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

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
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { nombre, equipoLocal, equipoVisitante, fechaPartido, cuota } = body

    if (!nombre?.trim() || !equipoLocal?.trim() || !equipoVisitante?.trim()) {
      return Response.json({ error: 'Campos requeridos' }, { status: 400, headers: corsHeaders })
    }

    const id = Math.random().toString(36).substr(2, 6).toUpperCase()
    const creadorToken = Math.random().toString(36).substr(2, 24)
    const now = Date.now()

    const dbUrl = Deno.env.get('DATABASE_URL') || Deno.env.get('INSFORGE_DB_URL') || Deno.env.get('POSTGRES_URL')
    if (!dbUrl) {
      return Response.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders })
    }

    const client = new Client(dbUrl)
    await client.connect()

    try {
      await client.queryObject`
        INSERT INTO public.pollas (id, nombre, equipoLocal, equipoVisitante, fechaPartido, cuota, estado, cierreRegistro, creadorToken, creadoEn)
        VALUES (${id}, ${nombre.trim()}, ${equipoLocal.trim()}, ${equipoVisitante.trim()}, ${fechaPartido || ''}, ${Math.max(0, parseInt(cuota) || 20000)}, 'registro', ${now + 30 * 60 * 1000}, ${creadorToken}, ${now})
      `
    } finally {
      await client.end()
    }

    return Response.json({ id, creadorToken }, { headers: corsHeaders })
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders })
  }
}

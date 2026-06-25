export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const envVars = {
      DATABASE_URL: !!Deno.env.get('DATABASE_URL'),
      INSFORGE_BASE_URL: !!Deno.env.get('INSFORGE_BASE_URL'),
      API_KEY: !!Deno.env.get('API_KEY'),
      ANON_KEY: !!Deno.env.get('ANON_KEY'),
      INSFORGE_DB_URL: !!Deno.env.get('INSFORGE_DB_URL'),
      POSTGRES_URL: !!Deno.env.get('POSTGRES_URL')
    };

    return Response.json(envVars, { headers: corsHeaders });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}

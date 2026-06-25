const { Client } = require('pg');

const client = new Client(process.env.DATABASE_URL);
let connected = false;

async function ensureConnected() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nombre, equipoLocal, equipoVisitante, fechaPartido, cuota } = req.body;
    if (!nombre?.trim() || !equipoLocal?.trim() || !equipoVisitante?.trim()) {
      return res.status(400).json({ error: 'Campos requeridos' });
    }

    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    const creadorToken = Math.random().toString(36).substr(2, 24);
    const now = Date.now();

    await ensureConnected();

    await client.query(
      `INSERT INTO public.pollas (id, nombre, equipoLocal, equipoVisitante, fechaPartido, cuota, estado, cierreRegistro, creadorToken, creadoEn)
       VALUES ($1, $2, $3, $4, $5, $6, 'registro', $7, $8, $9)`,
      [id, nombre.trim(), equipoLocal.trim(), equipoVisitante.trim(), fechaPartido || '', Math.max(0, parseInt(cuota) || 20000), now + 30 * 60 * 1000, creadorToken, now]
    );

    res.json({ id, creadorToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

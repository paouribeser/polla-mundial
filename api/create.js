export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    const polla = {
      id,
      nombre: nombre.trim(),
      equipoLocal: equipoLocal.trim(),
      equipoVisitante: equipoVisitante.trim(),
      fechaPartido: fechaPartido || '',
      cuota: Math.max(0, parseInt(cuota) || 20000),
      estado: 'registro',
      cierreRegistro: Date.now() + 30 * 60 * 1000,
      participantes: [],
      ordenSorteo: [],
      turnoActual: 0,
      elecciones: {},
      resultadoFinal: null,
      creadorToken,
      creadoEn: Date.now()
    };

    global.pollas = global.pollas || {};
    global.pollas[id] = polla;

    res.json({ id, creadorToken });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

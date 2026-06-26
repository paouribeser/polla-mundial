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

    // Call InsForge function
    const response = await fetch('https://m42ci5ep.function2.insforge.app/create_polla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        equipoLocal: equipoLocal.trim(),
        equipoVisitante: equipoVisitante.trim(),
        fechaPartido: fechaPartido || '',
        cuota: Math.max(0, parseInt(cuota) || 20000)
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error del servidor');

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

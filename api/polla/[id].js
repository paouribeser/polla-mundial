export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID requerido' });

  try {
    if (req.method === 'GET') {
      const response = await fetch(`https://m42ci5ep.function2.insforge.app/get_polla?id=${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error del servidor');
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { action, nombre, token, local, visitante } = req.body;

      let funcName, bodyData;

      if (action === 'join') {
        funcName = 'join_polla';
        bodyData = { id, nombre };
      } else if (action === 'sorteo') {
        funcName = 'sorteo_polla';
        bodyData = { id };
      } else if (action === 'pick') {
        funcName = 'pick_marcador';
        bodyData = { id, token, local, visitante };
      } else if (action === 'resultado') {
        funcName = 'resultado_polla';
        bodyData = { id, token, local, visitante };
      } else {
        return res.status(400).json({ error: 'Acción desconocida' });
      }

      const response = await fetch(`https://m42ci5ep.function2.insforge.app/${funcName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error del servidor');
      return res.json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

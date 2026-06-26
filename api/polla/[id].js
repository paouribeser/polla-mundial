global.pollas = global.pollas || {};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const polla = global.pollas[id?.toUpperCase()];

  if (!polla) return res.status(404).json({ error: 'Polla no encontrada' });

  if (req.method === 'GET') {
    return res.json({
      id: polla.id,
      nombre: polla.nombre,
      equipoLocal: polla.equipoLocal,
      equipoVisitante: polla.equipoVisitante,
      fechaPartido: polla.fechaPartido,
      cuota: polla.cuota,
      estado: polla.estado,
      cierreRegistro: polla.cierreRegistro,
      participantes: polla.participantes.map(p => ({ nombre: p.nombre, orden: p.orden })),
      ordenSorteo: polla.ordenSorteo,
      turnoActual: polla.turnoActual,
      elecciones: polla.elecciones,
      resultadoFinal: polla.resultadoFinal,
      creadoEn: polla.creadoEn
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, nombre, token, local, visitante } = req.body;

  if (action === 'join') {
    if (polla.estado !== 'registro') return res.status(400).json({ error: 'Registro cerrado' });
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    if (polla.participantes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      return res.status(400).json({ error: 'Nombre duplicado' });
    }
    const newToken = Math.random().toString(36).substr(2, 24);
    polla.participantes.push({ nombre: nombre.trim(), token: newToken, orden: null });
    return res.json({ token: newToken, nombre: nombre.trim() });
  }

  if (action === 'sorteo') {
    if (polla.estado !== 'registro') return res.json({ ok: true });
    if (polla.participantes.length < 2) return res.status(400).json({ error: 'Mínimo 2 participantes' });
    const arr = [...polla.participantes].sort(() => Math.random() - 0.5);
    polla.participantes = arr.map((p, i) => ({ ...p, orden: i + 1 }));
    polla.ordenSorteo = arr.map(p => p.nombre);
    polla.estado = 'eleccion';
    polla.turnoActual = 0;
    return res.json({ ok: true });
  }

  if (action === 'pick') {
    if (polla.estado !== 'eleccion') return res.status(400).json({ error: 'No es momento de elegir' });
    const local_n = parseInt(local), vis_n = parseInt(visitante);
    if (isNaN(local_n) || isNaN(vis_n) || local_n < 0 || local_n > 5 || vis_n < 0 || vis_n > 5) {
      return res.status(400).json({ error: 'Marcador inválido' });
    }
    const idx = polla.participantes.findIndex(p => p.token === token);
    if (idx === -1) return res.status(403).json({ error: 'Token inválido' });
    const part = polla.participantes[idx];
    if (part.nombre !== polla.ordenSorteo[polla.turnoActual]) return res.status(400).json({ error: 'No es tu turno' });
    const taken = Object.entries(polla.elecciones).find(([_, e]) => e.local === local_n && e.visitante === vis_n);
    if (taken) return res.status(400).json({ error: `Marcador tomado por ${taken[0]}` });
    polla.elecciones[part.nombre] = { local: local_n, visitante: vis_n };
    polla.participantes[idx].eleccion = { local: local_n, visitante: vis_n };
    polla.turnoActual += 1;
    if (polla.turnoActual >= polla.ordenSorteo.length) polla.estado = 'terminado';
    return res.json({ ok: true });
  }

  if (action === 'resultado') {
    if (token !== polla.creadorToken) return res.status(403).json({ error: 'No autorizado' });
    const l = parseInt(req.body.local), v = parseInt(req.body.visitante);
    if (isNaN(l) || isNaN(v)) return res.status(400).json({ error: 'Inválido' });
    polla.resultadoFinal = { local: l, visitante: v };
    return res.json({ ok: true });
  }

  res.status(400).json({ error: 'Acción desconocida' });
}

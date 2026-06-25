const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function ok(data) { return new Response(JSON.stringify(data), { headers: CORS }); }
function err(msg, status = 400) { return new Response(JSON.stringify({ error: msg }), { status, headers: CORS }); }

/** Vista pública: sin creadorToken ni tokens de participantes */
function pub(polla) {
  return {
    id: polla.id,
    nombre: polla.nombre,
    equipoLocal: polla.equipoLocal,
    equipoVisitante: polla.equipoVisitante,
    fechaPartido: polla.fechaPartido,
    cuota: polla.cuota,
    estado: polla.estado,
    cierreRegistro: polla.cierreRegistro,
    creadoEn: polla.creadoEn,
    participantes: polla.participantes.map(p => ({
      nombre: p.nombre,
      orden: p.orden,
      eleccion: p.eleccion,
    })),
    ordenSorteo: polla.ordenSorteo,
    turnoActual: polla.turnoActual,
    elecciones: polla.elecciones,
    resultadoFinal: polla.resultadoFinal || null,
  };
}

export async function onRequest({ request, env, params }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (!env.POLLAS) return err('KV no configurado', 500);

  const id = (params.id || '').toUpperCase();
  const raw = await env.POLLAS.get(id);
  if (!raw) return err('Polla no encontrada', 404);

  const polla = JSON.parse(raw);

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (request.method === 'GET') return ok(pub(polla));

  if (request.method !== 'POST') return err('Método no permitido', 405);

  let body;
  try { body = await request.json(); } catch { return err('JSON inválido'); }
  const { action } = body;

  // ── JOIN ─────────────────────────────────────────────────────────────────────
  if (action === 'join') {
    const nombre = (body.nombre || '').trim();
    if (!nombre) return err('Nombre requerido');
    if (polla.estado !== 'registro') return err('El registro ya cerró');
    if (polla.participantes.length >= 36) return err('Máximo 36 participantes');
    if (polla.participantes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase()))
      return err('Ese nombre ya está registrado');

    const token = Array.from({ length: 24 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('');

    polla.participantes.push({ nombre, token, orden: null, eleccion: null });
    await env.POLLAS.put(id, JSON.stringify(polla), { expirationTtl: 60 * 60 * 24 * 30 });
    return ok({ token, nombre });
  }

  // ── SORTEO ───────────────────────────────────────────────────────────────────
  if (action === 'sorteo') {
    if (polla.estado !== 'registro') return ok({ ok: true, estado: polla.estado }); // idempotente

    const tiempoVencido = Date.now() >= polla.cierreRegistro;
    const esCreador = body.token === polla.creadorToken;
    if (!tiempoVencido && !esCreador) return err('El tiempo de registro no ha terminado', 403);
    if (polla.participantes.length < 2) return err('Mínimo 2 participantes para el sorteo');

    // Fisher-Yates shuffle
    const arr = [...polla.participantes];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    polla.participantes = arr.map((p, i) => ({ ...p, orden: i + 1 }));
    polla.ordenSorteo = arr.map(p => p.nombre);
    polla.estado = 'eleccion';
    polla.turnoActual = 0;

    await env.POLLAS.put(id, JSON.stringify(polla), { expirationTtl: 60 * 60 * 24 * 30 });
    return ok({ ok: true, ordenSorteo: polla.ordenSorteo });
  }

  // ── PICK ─────────────────────────────────────────────────────────────────────
  if (action === 'pick') {
    const { token, local, visitante } = body;
    if (polla.estado !== 'eleccion') return err('No es el momento de elegir');

    const local_n = parseInt(local), vis_n = parseInt(visitante);
    if (isNaN(local_n) || isNaN(vis_n) || local_n < 0 || local_n > 5 || vis_n < 0 || vis_n > 5)
      return err('Marcador inválido (0–5 por equipo)');

    const idx = polla.participantes.findIndex(p => p.token === token);
    if (idx === -1) return err('Token inválido', 403);

    const part = polla.participantes[idx];
    if (part.nombre !== polla.ordenSorteo[polla.turnoActual]) return err('No es tu turno todavía');
    if (part.eleccion) return err('Ya elegiste tu marcador');

    const taken = Object.entries(polla.elecciones).find(([_, e]) => e.local === local_n && e.visitante === vis_n);
    if (taken) return err(`Ese marcador ya fue elegido por ${taken[0]}`);

    polla.elecciones[part.nombre] = { local: local_n, visitante: vis_n };
    polla.participantes[idx].eleccion = { local: local_n, visitante: vis_n };
    polla.turnoActual += 1;
    if (polla.turnoActual >= polla.ordenSorteo.length) polla.estado = 'terminado';

    await env.POLLAS.put(id, JSON.stringify(polla), { expirationTtl: 60 * 60 * 24 * 30 });
    return ok({ ok: true });
  }

  // ── RESULTADO (solo creador) ─────────────────────────────────────────────────
  if (action === 'resultado') {
    if (body.token !== polla.creadorToken) return err('No autorizado', 403);
    const l = parseInt(body.local), v = parseInt(body.visitante);
    if (isNaN(l) || isNaN(v)) return err('Resultado inválido');
    polla.resultadoFinal = { local: l, visitante: v };
    await env.POLLAS.put(id, JSON.stringify(polla), { expirationTtl: 60 * 60 * 24 * 30 });
    return ok({ ok: true });
  }

  return err('Acción desconocida');
}

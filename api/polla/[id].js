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

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID requerido' });

  await ensureConnected();

  try {
    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM public.pollas WHERE id = $1', [id.toUpperCase()]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Polla no encontrada' });
      return res.json(result.rows[0]);
    }

    if (req.method === 'POST') {
      const { action, nombre, token, local, visitante } = req.body;

      if (action === 'join') {
        const polla = await client.query('SELECT estado FROM public.pollas WHERE id = $1', [id.toUpperCase()]);
        if (polla.rows.length === 0 || polla.rows[0].estado !== 'registro') {
          return res.status(400).json({ error: 'Registro cerrado' });
        }

        const exist = await client.query(
          'SELECT nombre FROM public.participantes WHERE pollaId = $1 AND LOWER(nombre) = LOWER($2)',
          [id.toUpperCase(), nombre?.trim()]
        );
        if (exist.rows.length > 0) return res.status(400).json({ error: 'Nombre duplicado' });

        const newToken = Math.random().toString(36).substr(2, 24);
        await client.query(
          'INSERT INTO public.participantes (pollaId, nombre, token) VALUES ($1, $2, $3)',
          [id.toUpperCase(), nombre.trim(), newToken]
        );
        return res.json({ token: newToken, nombre: nombre.trim() });
      }

      if (action === 'sorteo') {
        const polla = await client.query('SELECT estado, ordenSorteo FROM public.pollas WHERE id = $1', [id.toUpperCase()]);
        if (polla.rows.length === 0 || polla.rows[0].estado !== 'registro') {
          return res.json({ ok: true });
        }

        const parts = await client.query('SELECT nombre FROM public.participantes WHERE pollaId = $1 ORDER BY nombre', [id.toUpperCase()]);
        if (parts.rows.length < 2) return res.status(400).json({ error: 'Mínimo 2 participantes' });

        const names = parts.rows.map(r => r.nombre);
        const shuffled = names.sort(() => Math.random() - 0.5);

        await client.query(
          'UPDATE public.pollas SET estado = $1, ordenSorteo = $2, turnoActual = $3 WHERE id = $4',
          ['eleccion', JSON.stringify(shuffled), 0, id.toUpperCase()]
        );

        for (let i = 0; i < shuffled.length; i++) {
          await client.query(
            'UPDATE public.participantes SET orden = $1 WHERE pollaId = $2 AND nombre = $3',
            [i + 1, id.toUpperCase(), shuffled[i]]
          );
        }
        return res.json({ ok: true });
      }

      if (action === 'pick') {
        const local_n = parseInt(local);
        const vis_n = parseInt(visitante);
        if (isNaN(local_n) || isNaN(vis_n) || local_n < 0 || local_n > 5 || vis_n < 0 || vis_n > 5) {
          return res.status(400).json({ error: 'Marcador inválido' });
        }

        const polla = await client.query('SELECT estado, ordenSorteo, turnoActual FROM public.pollas WHERE id = $1', [id.toUpperCase()]);
        if (polla.rows.length === 0 || polla.rows[0].estado !== 'eleccion') {
          return res.status(400).json({ error: 'No es momento de elegir' });
        }

        const p = polla.rows[0];
        const part = await client.query(
          'SELECT nombre FROM public.participantes WHERE pollaId = $1 AND token = $2',
          [id.toUpperCase(), token]
        );
        if (part.rows.length === 0) return res.status(403).json({ error: 'Token inválido' });

        const orden = JSON.parse(p.ordenSorteo);
        if (part.rows[0].nombre !== orden[p.turnoActual]) {
          return res.status(400).json({ error: 'No es tu turno' });
        }

        const taken = await client.query(
          'SELECT nombre FROM public.elecciones WHERE pollaId = $1 AND local = $2 AND visitante = $3',
          [id.toUpperCase(), local_n, vis_n]
        );
        if (taken.rows.length > 0) {
          return res.status(400).json({ error: `Marcador tomado por ${taken.rows[0].nombre}` });
        }

        await client.query(
          'INSERT INTO public.elecciones (pollaId, nombre, local, visitante) VALUES ($1, $2, $3, $4)',
          [id.toUpperCase(), part.rows[0].nombre, local_n, vis_n]
        );

        const newTurno = p.turnoActual + 1;
        const newEstado = newTurno >= orden.length ? 'terminado' : 'eleccion';
        await client.query(
          'UPDATE public.pollas SET turnoActual = $1, estado = $2 WHERE id = $3',
          [newTurno, newEstado, id.toUpperCase()]
        );
        return res.json({ ok: true });
      }

      if (action === 'resultado') {
        const polla = await client.query('SELECT creadorToken FROM public.pollas WHERE id = $1', [id.toUpperCase()]);
        if (polla.rows.length === 0 || token !== polla.rows[0].creadorToken) {
          return res.status(403).json({ error: 'No autorizado' });
        }

        const local_n = parseInt(req.body.local);
        const vis_n = parseInt(req.body.visitante);
        if (isNaN(local_n) || isNaN(vis_n)) return res.status(400).json({ error: 'Inválido' });

        await client.query(
          'UPDATE public.pollas SET resultadoFinal = $1 WHERE id = $2',
          [JSON.stringify({ local: local_n, visitante: vis_n }), id.toUpperCase()]
        );
        return res.json({ ok: true });
      }

      res.status(400).json({ error: 'Acción desconocida' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

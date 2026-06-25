# 🏆 Polla del Mundial 2026 — Cloudflare Pages

App móvil para hacer pollas grupales del Mundial. Cada persona se registra con un link, se hace el sorteo automático del orden a los 30 minutos, y cada uno elige su marcador en turno.

## Flujo

1. **Organizador** crea la polla → obtiene un link único
2. **Comparte el link** en el grupo de WhatsApp — los participantes tienen **30 minutos** para registrarse
3. **Sorteo automático** al vencer el tiempo (o el organizador lo inicia antes)
4. **Elecciones en orden**: el turno 1 entra y elige; el marcador queda bloqueado en la grilla
5. La app avisa quién sigue con un botón de WhatsApp
6. Al finalizar, el organizador ingresa el resultado real y se revela el ganador 🏆

---

## Requisitos

- Cuenta de [Cloudflare](https://cloudflare.com) (plan gratuito es suficiente)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`

---

## Despliegue

### 1. Crear el namespace KV

```bash
wrangler kv:namespace create POLLAS
wrangler kv:namespace create POLLAS --preview
```

Copia los IDs que te devuelve y ponlos en `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "POLLAS"
id = "TU_ID_AQUI"
preview_id = "TU_PREVIEW_ID_AQUI"
```

### 2. Desplegar

```bash
# Desde la carpeta polla-cf/
wrangler pages deploy .
```

O conecta este repositorio a Cloudflare Pages desde el dashboard y agrega el binding KV:

**Dashboard → Pages → Tu proyecto → Settings → Functions → KV namespace bindings**  
Variable name: `POLLAS` → selecciona el namespace que creaste.

### 3. Dominio personalizado (opcional)

En el dashboard de Pages puedes agregar un dominio personalizado como `polla.tudominio.com`.

---

## Desarrollo local

```bash
wrangler pages dev . --kv POLLAS
```

Abre `http://localhost:8788`

---

## Estructura

```
polla-cf/
├── index.html              # SPA frontend (toda la UI)
├── _redirects              # SPA routing para Cloudflare Pages
├── wrangler.toml           # Config de KV para desarrollo local
└── functions/
    └── api/
        ├── create.js       # POST /api/create → crear polla
        └── polla/
            └── [id].js     # GET|POST /api/polla/:id → unirse, sortear, elegir
```

---

## Notas

- Los datos se guardan en **Cloudflare KV** con TTL de 30 días
- Máximo **36 participantes** (una casilla por marcador en la grilla 6×6)
- Las notificaciones son **manuales vía WhatsApp** — la app genera el mensaje listo para copiar
- Sin base de datos propia, sin servidor, sin costo adicional en el plan gratuito de Cloudflare

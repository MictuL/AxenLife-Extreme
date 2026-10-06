# Stripe Checkout — pendientes de integración

Integración de **Stripe Checkout alojado** (el cliente es redirigido a una página de pago de Stripe).
Este archivo es la fuente única de verdad para lo que falta configurar.

## Values to Replace

Los siguientes valores son marcadores y deben actualizarse antes de salir a producción.

**Files containing placeholders:**
- [server/index.js](server/index.js)
- [.env.example](.env.example) → copiar como `.env`

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `payment` | `"payment"` para cargos únicos (abono/boleto del evento) o `"subscription"` para cobro recurrente. Se dejó `payment` según lo acordado. |
| success_url | `${DOMAIN}/?checkout=success&session_id={CHECKOUT_SESSION_ID}` | URL real de la página de éxito tras el pago. Conserva la plantilla `{CHECKOUT_SESSION_ID}`. |
| cancel_url | `${DOMAIN}/?checkout=cancel` | URL real a la que regresa el cliente si cancela. |
| line_items[].price | `price_...` | Price ID real del Dashboard (https://dashboard.stripe.com/prices) o de la API. |
| STRIPE_SECRET_KEY | `sk_test_...` | Llave secreta (solo servidor, sin prefijo `VITE_`). |
| DOMAIN | `http://localhost:5173` | Dominio público del sitio en producción. |

## Configured Parameters

Estos parámetros se configuraron en Checkout Studio y ya están correctos.

**Files containing these parameters:**
- [server/index.js](server/index.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted_page` (SDK `stripe` 23.0.0 ≥ 21.0.0) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: true }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | `true` |
| submit_type | `auto` |
| saved_payment_method_options | `{ payment_method_save: "enabled" }` |
| integration_identifier | `hosted_web_0001` |
| origin_context | `web` |
| payment_method_collection | `always` — solo se envía cuando `mode` es `"subscription"`; con `payment` se omite. |

## Setup

1. `npm install` (ya incluye `stripe`, `express` y `dotenv`).
2. `cp .env.example .env` y llena `STRIPE_SECRET_KEY` con tu llave de prueba (https://dashboard.stripe.com/test/apikeys). `.env` ya está en `.gitignore`.
3. En dos terminales:
   - `npm run server` → servidor de Stripe en http://localhost:4242
   - `npm run dev` → sitio en http://localhost:5173 (Vite reenvía `/api` al puerto 4242)

> Nota: el SDK se inicializa sin versión de API explícita; usa la versión fijada por el SDK instalado.

## Archivos nuevos o modificados

```
server/index.js            NUEVO · endpoint POST /api/create-checkout-session
.env.example               NUEVO · variables de entorno de referencia
STRIPE_INTEGRATION_TODO.md NUEVO · este archivo
package.json               dependencias + script "server"
vite.config.js             proxy /api → localhost:4242 (solo en desarrollo)
.gitignore                 ignora .env
```

## Cómo funciona

1. El navegador hace `POST /api/create-checkout-session`.
2. El servidor crea la Checkout Session con los parámetros de arriba.
3. Responde con redirección `303` a `session.url` (página de pago de Stripe).
4. Al pagar, Stripe envía al cliente a `success_url`; si cancela, a `cancel_url`.

### Conectar el botón del sitio (pendiente)

El sitio sigue mostrando la **demo de abono sin cobro** (`src/components/PaymentDialog.jsx`, textos "sin cobro real" y `chargesMoney: false` en `src/App.jsx`); no se tocó. Para cobrar de verdad, el paso final del diálogo debe enviar un formulario:

```jsx
<form action="/api/create-checkout-session" method="POST">
  <button type="submit">Pagar con Stripe</button>
</form>
```

y actualizar los textos de demo. Ojo: hoy el diálogo deja elegir un **monto libre**, mientras que `line_items` usa un Price fijo. Para monto variable habría que usar `price_data` (o un Price con "customer chooses price") en lugar de un Price ID.

### Hosting

El sitio de Vite es estático, pero `server/index.js` necesita un entorno Node (Render, Railway, un VPS, etc.), o bien convertirse en una función serverless (Vercel `api/`, Netlify Functions). En producción, el sitio y `/api` deben quedar bajo el mismo dominio o ajustar la URL del `action`.

## Pruebas

- Usa llaves `sk_test_...`: ningún cargo es real.
- Tarjeta exitosa: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y CP.
- Requiere autenticación 3DS: `4000 0025 0000 3155`.
- Rechazada: `4000 0000 0000 9995`.
- Más tarjetas: https://docs.stripe.com/testing

## Siguientes pasos

- **Producto y precio**: crea en el Dashboard el producto "Axen Life Extreme" con su precio en la moneda definida (MXN/CAD) y pon el Price ID en `line_items`.
- **Guardar método de pago**: `saved_payment_method_options.payment_method_save` aplica a clientes de Stripe; si la API lo rechaza en modo `payment`, revisa si necesitas asociar un `customer` a la sesión.
- **Fulfillment**: agrega un webhook (`checkout.session.completed`) para confirmar el lugar, enviar el correo de confirmación y registrar el pago. No uses `success_url` como prueba de pago. Secreto del webhook: https://dashboard.stripe.com/workbench/webhooks (`STRIPE_WEBHOOK_SECRET`).
- **Seguimiento de órdenes**: hoy no hay base de datos; define dónde se registrarán los pagos (CRM, hoja, BD) antes de producción.
- **Cambiar a modo live**: reemplaza las llaves de prueba por las de producción solo en el entorno del servidor.

## Recursos

- Soporte de Stripe: https://support.stripe.com
- Stripe MCP: https://docs.stripe.com/mcp

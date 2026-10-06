// Servidor mínimo para Stripe Checkout (página alojada por Stripe).
// Corre aparte del sitio estático de Vite: `npm run server` (puerto 4242).
import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';

// Sin versión de API explícita: se usa la que trae el SDK instalado.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'http://localhost:5173';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  // TODO: usa "subscription" si algún día se venden productos recurrentes.
  const mode = 'payment';

  const sessionParams = {
    // Parámetros configurados en Checkout Studio (no modificar).
    ui_mode: 'hosted_page',
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: false },
    allow_promotion_codes: true,
    submit_type: 'auto',
    saved_payment_method_options: { payment_method_save: 'enabled' },
    integration_identifier: 'hosted_web_0001',
    origin_context: 'web',

    // Marcadores de ejemplo: reemplazar (ver STRIPE_INTEGRATION_TODO.md).
    mode,
    success_url: `${DOMAIN}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${DOMAIN}/?checkout=cancel`,
    line_items: [{ price: 'price_...', quantity: 1 }],
  };
  if (mode === 'subscription') {
    sessionParams.payment_method_collection = 'always';
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe Checkout error:', err.message);
    res.status(500).json({ error: 'No se pudo iniciar el pago.' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server en http://localhost:${PORT}`));

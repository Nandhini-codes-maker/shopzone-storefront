# ShopZone API

The API uses Node.js built-in SQLite storage and requires Node.js 22.5 or newer.
The first server start creates the configured database and seeds the sample
catalog. Locally, it defaults to `data/shopzone.sqlite`; change its path with
`DATABASE_PATH`.

## Run locally

```powershell
npm install
npm run dev
```

The frontend runs separately from `frontend/` with `npm run dev`. Vite forwards
`/api` requests to this server.

## Admin account

Copy `.env.example` to `.env`, set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD`
of at least 12 characters, then restart the API. The configured account is
created or promoted to administrator on startup. Public registration only
creates customer accounts.

## Hosted payments

Checkout creates Stripe Checkout Sessions or PayPal Orders on the server and
redirects the customer to the selected provider. No card details are stored or
handled by ShopZone. Set `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, and
`PAYPAL_CLIENT_SECRET` using provider test credentials for local testing.
PayPal uses the sandbox unless `PAYPAL_ENV=live`. Set `PUBLIC_APP_URL` to the
browser-visible frontend URL and configure provider dashboard return/website
settings as needed before production use.

Do not commit `.env` or real payment credentials. Configure HTTPS, production
provider credentials, and payment webhooks before using this prototype for live
transactions.

The Render free plan has no persistent filesystem disk. If deployed there,
SQLite data can be lost when the service restarts or redeploys. Use a paid
persistent disk or an external database for durable customer, order, and
product data.

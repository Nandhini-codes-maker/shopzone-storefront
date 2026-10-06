# Publish ShopZone

The deployment setup uses Vercel for the storefront and same-origin API proxy,
and Render for the API and persistent SQLite database. The same-origin proxy is
important: browsers can block sign-in cookies when the frontend and API use
different hosting domains.

## 1. Push this project to GitHub

Create a repository and push the project folder to it. Keep `backend/.env` and
all credentials out of Git; `backend/.gitignore` excludes them.

## 2. Deploy the Render backend

In Render, choose **New → Blueprint**, connect the GitHub repository, and let
Render read `render.yaml` from the repository root. The Blueprint creates a
Node API service with a persistent disk mounted at `/var/data` for SQLite.

During setup, provide:

- `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters.
- `PUBLIC_APP_URL`, initially a temporary value; replace it with the Vercel
  production URL after the frontend is deployed.
- `CLIENT_ORIGINS`, set to the Vercel production URL.

After deployment, copy the API service URL, for example
`https://shopzone-api.onrender.com`.

## 3. Deploy the Vercel frontend

Import the same GitHub repository into Vercel and set the project **Root
Directory** to `frontend`. Add the project environment variable:

```text
BACKEND_API_URL=https://<your-render-service>.onrender.com
```

Deploy the project. Vercel publishes the static storefront and the `/api/*`
proxy function from `frontend/api/[...path].js`.

## 4. Finish production settings

Copy the production Vercel URL into Render's `PUBLIC_APP_URL` and
`CLIENT_ORIGINS`, then redeploy the API. If using payments, add production
Stripe and PayPal credentials in Render's environment settings. Until those
credentials are configured, the corresponding checkout option reports that it
is unavailable.

Use provider test credentials before enabling live payments. Do not put
provider secrets in Vercel's frontend environment or commit them to GitHub.

# Clasr Deployment Notes

This package is a deployable frontend/backend shell. It serves the exact current frontend design and exposes backend endpoints that are ready to be replaced with real services.

## What is ready

- The current Clasr frontend is served exactly as designed.
- All existing routes such as `/`, `/pricing/`, `/legal/`, `/dashboard/`, and `/example-reports/author/` work as static pages.
- The backend has JSON routes for session, auth, readings, plans, checkout intent, contact, enterprise contact, and legal document requests.
- Security headers and cache headers are set at the server layer.
- A health check exists at `/health`.
- No framework build step is required.

## What is not connected yet

- Real database
- Real authentication/session storage
- Manuscript upload storage
- AI reading API
- Queue worker for report generation
- Paddle checkout and webhooks
- Email delivery
- Production logs, monitoring, and rate limiting

## Run locally

```bash
npm start
```

Open:

```text
http://127.0.0.1:8029/
```

## Deploy with Docker

```bash
docker build -t clasr-website .
docker run -p 8029:8029 clasr-website
```

## Environment

Copy `.env.example` to `.env` and fill real values when integrations are added.

Important production variables to add later:

```text
DATABASE_URL
SESSION_SECRET
AI_READING_API_URL
AI_READING_API_KEY
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASS
```

## Developer handoff

The frontend should not be rebuilt from scratch. Keep the current HTML/CSS/JS as the design source of truth and progressively replace backend stubs.

Recommended order:

1. Add persistent user/session storage.
2. Replace demo login/register with real auth.
3. Add manuscript upload handling.
4. Replace `/api/readings/start` with queue/job creation.
5. Connect the AI reading API.
6. Store generated reports and connect them to dashboard reading pages.
7. Replace `/api/checkout/intent` with Paddle checkout.
8. Add Paddle webhooks and update subscription state.
9. Add transactional email when a report is ready.

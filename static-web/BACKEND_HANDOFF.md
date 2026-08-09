# Clasr Backend Handoff

This package serves the existing Clasr frontend without changing the design. The HTML, CSS, and client JavaScript are served exactly as static assets, so the visual work stays intact. The backend is intentionally thin: it provides route handling, static hosting, and API placeholders that your developer can replace with real services.

## Run locally

```bash
npm start
```

Default local URL:

```text
http://127.0.0.1:8029/
```

You can change the port with:

```bash
PORT=3000 npm start
```

## What this backend includes

- Static file server for the current website.
- Clean URL support for routes like `/dashboard/`, `/pricing/`, and `/example-reports/author/`.
- JSON stubs for auth, plans, readings, processing, checkout, gift-code, contact, enterprise, legal request, and billing status flows.
- Demo user/session responses so the frontend can be connected without rebuilding screens.
- Reading-start stub that returns the correct report URL depending on selected mode: Author, Reviewer, or Advisor.
- Security headers and cache headers.
- A Dockerfile and deployment notes.

## Stub endpoints

```text
GET  /health
GET  /api/session
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/plans
GET  /api/readings
POST /api/readings/start
GET  /api/readings/:id
GET  /api/processing/:jobId
POST /api/checkout/intent
POST /api/gift-code/apply
GET  /api/billing/status
POST /api/contact
POST /api/enterprise-contact
POST /api/legal/request-access
```

## How the design stays identical

The server does not render templates and does not rebuild the frontend. It serves the same `index.html`, nested `index.html` pages, `styles.css`, `script.js`, fonts, logos, and report assets already approved in preview. This is important: the backend should not recreate the UI. It should only provide data and state to the existing UI.

If the developer changes the frontend, the safest rule is:

```text
Keep existing class names and page structure unless the design is intentionally being changed.
```

## Current demo flow

1. `/api/session` returns Michael Carter as a demo signed-in user.
2. `/api/readings` returns the three demo report modes.
3. `/api/readings/start` creates a temporary in-memory processing job.
4. `/api/processing/:jobId` returns `processing` first and `complete` after a few seconds.
5. The returned `reportUrl` points to one of the existing report pages:
   - `/dashboard/reading/polarization-author/`
   - `/dashboard/reading/polarization-reviewer/`
   - `/dashboard/reading/polarization-advisor/`

This mirrors the future production shape without connecting the actual manuscript reader yet.

## What is intentionally missing

- Real authentication and password handling.
- Database persistence.
- File upload storage and manuscript parsing.
- AI reading pipeline / model API.
- Paddle checkout, Paddle webhooks, invoices, refunds, and subscription state.
- Real processing jobs and queue workers.
- Email notifications when reports are ready.
- Production security hardening, CSRF, rate limits, audit logging, and monitoring.
- Real enterprise document request workflow.

Security headers are present, but they are not a full production security program. Add CSRF protection, input validation, upload scanning, rate limiting, logging, monitoring, and real session storage before launch.

## Developer continuation path

1. Keep serving the current frontend assets from this server so the design remains unchanged.
2. Replace `/api/auth/*` stubs with real auth and sessions.
3. Replace `/api/readings/start` with upload handling, queue creation, and report generation.
4. Replace hard-coded demo readings with database-backed records.
5. Replace `/api/checkout/intent` with Paddle checkout creation.
6. Add Paddle webhooks to update plan, credit, invoice, and subscription state.
7. Replace contact, enterprise, and legal request stubs with email/CRM/legal ops workflows.
8. Add real processing status and completion redirects.
9. Keep the existing frontend routes and CSS class names unless a design change is intentional.

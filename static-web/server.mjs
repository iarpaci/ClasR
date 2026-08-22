import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(__dirname, process.env.CLASR_PUBLIC_DIR || ".");
const port = Number(process.env.PORT || 8029);
const isProduction = process.env.NODE_ENV === "production";
const maxJsonBytes = 1024 * 1024;

const jobs = new Map();

const demoUser = {
  id: "demo-michael-carter",
  firstName: "Michael",
  lastName: "Carter",
  name: "Michael Carter",
  email: "michael.carter@university.edu",
  institution: "University Research Group",
  plan: "trial-pack",
  creditsLeft: 1,
  readingHistoryEnabled: true,
};

const readingTemplates = {
  author: "/dashboard/reading/polarization-author/",
  reviewer: "/dashboard/reading/polarization-reviewer/",
  advisor: "/dashboard/reading/polarization-advisor/",
};

const demoReadings = [
  {
    id: "polarization-author",
    title: "Polarization metrics manuscript, Author Mode",
    mode: "Author",
    studyType: "Quantitative",
    qProfile: "Q1",
    severity: { critical: 5, major: 6, minor: 4 },
    summary: "Plain-language findings with reviewer-facing context and revision considerations.",
    reportUrl: readingTemplates.author,
    createdAt: new Date().toISOString(),
  },
  {
    id: "polarization-reviewer",
    title: "Polarization metrics manuscript, Reviewer Mode",
    mode: "Reviewer",
    studyType: "Quantitative",
    qProfile: "Q1",
    severity: { critical: 5, major: 6, minor: 4 },
    summary: "Signal labels and locations compressed for expert review.",
    reportUrl: readingTemplates.reviewer,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "polarization-advisor",
    title: "Polarization metrics manuscript, Advisor Mode",
    mode: "Advisor",
    studyType: "Quantitative",
    qProfile: "Q1",
    severity: { critical: 5, major: 6, minor: 4 },
    summary: "Highest-risk signals prioritized for supervision and triage.",
    reportUrl: readingTemplates.advisor,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const plans = [
  {
    id: "trial-pack",
    label: "Trial Pack",
    price: 25,
    billing: "one-time",
    credits: 1,
  },
  {
    id: "researcher",
    label: "Researcher",
    monthlyPrice: 59,
    annualPrice: 590,
    creditsPerMonth: 5,
  },
  {
    id: "professional",
    label: "Professional",
    monthlyPrice: 119,
    annualPrice: 1190,
    creditsPerMonth: 12,
  },
];

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".txt", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const sendJson = (res, status, body) => {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    ...securityHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
};

const readJsonBody = async (req) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxJsonBytes) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
};

const setDemoSessionCookie = (res) => {
  res.setHeader(
    "set-cookie",
    `clasr_demo_session=demo; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${isProduction ? "; Secure" : ""}`,
  );
};

// Local-dev-only CSP relaxation (2026-07-27): the /dashboard/v2-preview/
// internal test page needs to fetch() a locally-run backend
// (http://localhost:3000) that isn't in the production connect-src
// allowlist and never should be — this is gated on !isProduction so the
// deployed CSP is completely unaffected. Remove alongside v2-preview once
// that page is no longer needed.
const devConnectSrcExtra = isProduction ? "" : " http://localhost:3000";

const securityHeaders = () => ({
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' https://use.typekit.net https://cdn.paddle.com https://sandbox-cdn.paddle.com https://browser.sentry-cdn.com https://cdn.jsdelivr.net",
    "style-src 'self' https://use.typekit.net 'unsafe-inline'",
    "font-src 'self' https://use.typekit.net https://p.typekit.net data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' https://clasr-production.up.railway.app https://yocebpchsvubixpxiclg.supabase.co https://checkout-service.paddle.com https://checkout.paddle.com https://buy.paddle.com https://sandbox-checkout.paddle.com https://api.paddle.com https://events.paddle.com https://o4511299097985024.ingest.de.sentry.io${devConnectSrcExtra}`,
    "frame-src https://buy.paddle.com https://sandbox-buy.paddle.com https://checkout.paddle.com https://sandbox-checkout.paddle.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
});

const createProcessingJob = (mode) => {
  const cleanMode = readingTemplates[mode] ? mode : "author";
  const jobId = crypto.randomUUID();
  const createdAt = Date.now();
  const job = {
    jobId,
    mode: cleanMode,
    status: "processing",
    createdAt,
    estimatedMinutes: "5-15",
    processingUrl: `/dashboard/processing/?job=${jobId}&mode=${cleanMode}`,
    reportUrl: readingTemplates[cleanMode],
  };

  jobs.set(jobId, job);
  return job;
};

const getJobStatus = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  const elapsedMs = Date.now() - job.createdAt;
  const complete = elapsedMs > 3500;

  return {
    ...job,
    status: complete ? "complete" : "processing",
    progress: complete ? 100 : Math.min(92, 18 + Math.floor(elapsedMs / 80)),
  };
};

const handleApi = async (req, res, url) => {
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "clasr-website",
      environment: process.env.NODE_ENV || "development",
    });
  }

  if (req.method === "GET" && path === "/api/session") {
    return sendJson(res, 200, { authenticated: true, user: demoUser });
  }

  if (req.method === "POST" && path === "/api/auth/register") {
    const body = await readJsonBody(req);
    setDemoSessionCookie(res);
    return sendJson(res, 200, {
      authenticated: true,
      user: { ...demoUser, ...body, id: demoUser.id },
      nextUrl: "/onboarding/role/",
      note: "Demo registration only. Replace with real auth before production.",
    });
  }

  if (req.method === "POST" && path === "/api/auth/login") {
    const body = await readJsonBody(req);
    setDemoSessionCookie(res);
    return sendJson(res, 200, {
      authenticated: true,
      user: { ...demoUser, email: body.email || demoUser.email },
      nextUrl: "/dashboard/",
      note: "Demo login only. Passwords are not checked in this prototype.",
    });
  }

  if (req.method === "POST" && path === "/api/auth/logout") {
    res.setHeader("set-cookie", `clasr_demo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isProduction ? "; Secure" : ""}`);
    return sendJson(res, 200, { authenticated: false, nextUrl: "/login/" });
  }

  if (req.method === "GET" && path === "/api/plans") {
    return sendJson(res, 200, { plans });
  }

  if (req.method === "GET" && path === "/api/readings") {
    return sendJson(res, 200, { readings: demoReadings });
  }

  if (req.method === "POST" && path === "/api/readings/start") {
    const body = await readJsonBody(req);
    const mode = String(body.mode || "author").toLowerCase();
    const job = createProcessingJob(mode);
    return sendJson(res, 202, {
      ...job,
      note: "Stub response. Replace with upload, queue, AI reading, and completion redirect.",
    });
  }

  const processingMatch = path.match(/^\/api\/processing\/([^/]+)$/);
  if (req.method === "GET" && processingMatch) {
    const job = getJobStatus(processingMatch[1]);
    return sendJson(res, job ? 200 : 404, job ? { job } : { error: "Processing job not found" });
  }

  const readingMatch = path.match(/^\/api\/readings\/([^/]+)$/);
  if (req.method === "GET" && readingMatch) {
    const reading = demoReadings.find((item) => item.id === readingMatch[1]);
    return sendJson(res, reading ? 200 : 404, reading ? { reading } : { error: "Reading not found" });
  }

  if (req.method === "POST" && path === "/api/checkout/intent") {
    const body = await readJsonBody(req);
    return sendJson(res, 200, {
      checkoutReady: false,
      plan: body.plan || "trial-pack",
      billing: body.billing || "monthly",
      message: "Paddle checkout is intentionally not connected in this prototype.",
      nextUrl: "/checkout/",
    });
  }

  if (req.method === "POST" && path === "/api/gift-code/apply") {
    const body = await readJsonBody(req);
    return sendJson(res, 501, {
      applied: false,
      code: body.code || null,
      message: "Gift code validation is not connected yet.",
    });
  }

  if (req.method === "POST" && path === "/api/contact") {
    const body = await readJsonBody(req);
    return sendJson(res, 202, {
      received: true,
      messageId: crypto.randomUUID(),
      message: "Contact message accepted by the demo backend. Connect SMTP or a CRM next.",
      submitted: {
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        email: body.email || null,
        topic: body.topic || null,
      },
    });
  }

  if (req.method === "POST" && path === "/api/enterprise-contact") {
    const body = await readJsonBody(req);
    return sendJson(res, 202, {
      received: true,
      requestId: crypto.randomUUID(),
      message: "Enterprise request accepted by the demo backend. Connect CRM/email workflow next.",
      submitted: {
        institution: body.institution || body.organisation || null,
        email: body.email || body.workEmail || null,
        expectedVolume: body.expectedVolume || null,
      },
    });
  }

  if (req.method === "POST" && path === "/api/legal/request-access") {
    const body = await readJsonBody(req);
    return sendJson(res, 202, {
      received: true,
      requestId: crypto.randomUUID(),
      document: body.document || "institutional-document",
      message: "Legal document request accepted by the demo backend. Connect legal ops workflow next.",
    });
  }

  if (req.method === "GET" && path === "/api/billing/status") {
    return sendJson(res, 200, {
      plan: demoUser.plan,
      creditsLeft: demoUser.creditsLeft,
      checkoutProvider: "paddle-not-connected",
      portalReady: false,
    });
  }

  return false;
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveStaticPath = async (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const cleanPath = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  let candidate = resolve(publicRoot, `.${sep}${cleanPath}`);

  if (!candidate.startsWith(publicRoot)) {
    return null;
  }

  const stats = await stat(candidate).catch(() => null);
  if (stats?.isDirectory()) {
    candidate = join(candidate, "index.html");
  }

  if (await fileExists(candidate)) {
    return candidate;
  }

  if (!extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (await fileExists(htmlCandidate)) {
      return htmlCandidate;
    }
  }

  return null;
};

const sendStatic = async (req, res, url) => {
  const filePath = await resolveStaticPath(url.pathname);

  if (!filePath) {
    const notFoundPath = join(publicRoot, "404.html");
    if (await fileExists(notFoundPath)) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      createReadStream(notFoundPath).pipe(res);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    ...securityHeaders(),
    "content-type": mimeTypes.get(ext) || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const apiResponse = await handleApi(req, res, url);

    if (apiResponse !== false) {
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    await sendStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : "Internal server error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Clasr website running at http://127.0.0.1:${port}/`);
});

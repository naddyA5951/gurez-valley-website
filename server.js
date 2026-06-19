const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ENQUIRIES_FILE = path.join(DATA_DIR, "enquiries.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readEnquiries() {
  try {
    const raw = await fs.readFile(ENQUIRIES_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function saveEnquiry(enquiry) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const enquiries = await readEnquiries();
  enquiries.push(enquiry);
  await fs.writeFile(ENQUIRIES_FILE, JSON.stringify(enquiries, null, 2));
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

async function handleEnquiry(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body || "{}");

    const enquiry = {
      id: crypto.randomUUID(),
      name: cleanText(payload.name, 80),
      tripLength: cleanText(payload.length, 40),
      message: cleanText(payload.message, 800),
      createdAt: new Date().toISOString()
    };

    if (!enquiry.name || !enquiry.tripLength) {
      sendJson(response, 400, { error: "Name and trip length are required." });
      return;
    }

    await saveEnquiry(enquiry);
    sendJson(response, 201, {
      message: `Thanks, ${enquiry.name}. Your Gurez trip enquiry has been saved.`,
      enquiry
    });
  } catch (error) {
    sendJson(response, 500, { error: "Could not save enquiry. Please try again." });
  }
}

async function handleEnquiriesList(response) {
  try {
    const enquiries = await readEnquiries();
    sendJson(response, 200, {
      count: enquiries.length,
      enquiries: enquiries.slice().reverse()
    });
  } catch (error) {
    sendJson(response, 500, { error: "Could not load enquiries." });
  }
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/enquiries") {
    await handleEnquiriesList(response);
    return;
  }

  if (request.method === "POST" && request.url === "/api/enquiries") {
    await handleEnquiry(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    await serveStatic(request, response);
    return;
  }

  response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Method not allowed");
});

server.listen(PORT, HOST, () => {
  console.log(`Gurez Valley website running at http://${HOST}:${PORT}`);
});

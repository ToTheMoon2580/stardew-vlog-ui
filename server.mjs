import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname);
const port = Number(process.env.PORT) || 8766;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webm": "video/webm"
};

async function jsonBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 2_000_000) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function generateImage(request, response) {
  try {
    const body = await jsonBody(request);
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("缺少 OpenAI API Key");
    const upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: body.model || "gpt-image-2.5-flare",
        prompt: body.prompt,
        n: 1,
        size: body.size || "1024x1024",
        quality: body.quality || "low",
        background: "transparent",
        output_format: "png"
      })
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(text);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/generate-image") {
    await generateImage(request, response);
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname === "/" ? "/overlay.html" : url.pathname);
    const filePath = path.resolve(root, "." + requested);
    if (!filePath.startsWith(root + path.sep)) throw new Error("Forbidden");
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": "no-cache"
    });
    if (request.method === "HEAD") response.end();
    else response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Stardew Vlog HUD: http://127.0.0.1:" + port + "/overlay.html");
});

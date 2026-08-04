#!/usr/bin/env node
'use strict';

/**
 * Local dev server: serves WebDemo as static files and runs the functions in
 * api/ on the same origin, so the chat proxy behaves the way it does when
 * deployed and the API key never reaches the browser.
 *
 *   node dev-server.js          # http://localhost:8080
 *   PORT=3000 node dev-server.js
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = __dirname;
const STATIC_DIR = path.join(ROOT, 'WebDemo');
const API_DIR = path.join(ROOT, 'api');
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
};

/** Minimal .env reader; anything already in the environment wins. */
function loadEnvFile() {
  let raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch (error) {
    return;
  }
  raw.split(/\r?\n/).forEach((line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) return;
    let value = match[2];
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    process.env[match[1]] = value;
  });
}

/** Map /api/foo/bar to api/foo/bar.js, refusing anything outside api/. */
function resolveApiHandler(pathname) {
  const relative = pathname.replace(/^\/api\//, '');
  if (!relative || path.basename(relative).startsWith('_')) return null;
  const file = path.normalize(path.join(API_DIR, `${relative}.js`));
  if (!file.startsWith(API_DIR + path.sep) || !fs.existsSync(file)) return null;
  return file;
}

/** Give the Node response the handful of Express-style helpers api/ expects. */
function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = (body) => {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    res.end(body);
    return res;
  };
  return res;
}

function serveStatic(req, res, pathname) {
  let relative;
  try {
    relative = decodeURIComponent(pathname);
  } catch (error) {
    res.statusCode = 400;
    return res.end('Bad request');
  }
  if (relative.endsWith('/')) relative += 'index.html';

  const file = path.normalize(path.join(STATIC_DIR, relative));
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + path.sep)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end('Not found');
    }
    res.setHeader('Content-Type', MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    // Always revalidate: this is a demo being edited while it's open.
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(file).pipe(res);
  });
}

loadEnvFile();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (!url.pathname.startsWith('/api/')) {
    return serveStatic(req, res, url.pathname);
  }

  const handlerFile = resolveApiHandler(url.pathname);
  if (!handlerFile) {
    return decorateResponse(res).status(404).json({ error: 'Not found' });
  }

  decorateResponse(res);
  req.query = Object.fromEntries(url.searchParams);
  try {
    await require(handlerFile)(req, res);
  } catch (error) {
    console.error(`[api] ${url.pathname} failed:`, error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`WebDemo   http://localhost:${PORT}`);
  console.log(`API       ${path.relative(ROOT, API_DIR)}/**.js on the same origin`);
  if (!process.env.LUXURY_INTELLIGENCE_API_KEY) {
    console.warn('WARNING   LUXURY_INTELLIGENCE_API_KEY is unset — the chat will answer 500');
  }
});

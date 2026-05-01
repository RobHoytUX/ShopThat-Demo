const crypto = require('crypto');

const SESSION_COOKIE = 'shopthat_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function getSessionSecret() {
  const secret = process.env.SHOPTHAT_AUTH_SECRET;
  if (!secret) {
    throw new Error('SHOPTHAT_AUTH_SECRET is required');
  }
  return secret;
}

function getConfiguredUsers() {
  const rawUsers = process.env.SHOPTHAT_AUTH_USERS;
  if (!rawUsers) {
    throw new Error('SHOPTHAT_AUTH_USERS is required');
  }

  const users = JSON.parse(rawUsers);
  if (!users || typeof users !== 'object' || Array.isArray(users)) {
    throw new Error('SHOPTHAT_AUTH_USERS must be a JSON object');
  }
  return users;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function createSession(email) {
  const payload = base64UrlEncode(JSON.stringify({
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }));
  return `${payload}.${sign(payload)}`;
}

function verifySession(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [payload, signature] = token.split('.');
  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  const session = JSON.parse(base64UrlDecode(payload));
  if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return session;
}

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const [name, ...valueParts] = cookie.split('=');
      cookies[name] = decodeURIComponent(valueParts.join('='));
      return cookies;
    }, {});
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getSession(req) {
  const cookies = parseCookies(req);
  return verifySession(cookies[SESSION_COOKIE]);
}

module.exports = {
  clearSessionCookie,
  createSession,
  getConfiguredUsers,
  getSession,
  readJsonBody,
  sessionCookie,
};

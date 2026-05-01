const {
  createSession,
  getConfiguredUsers,
  readJsonBody,
  sessionCookie,
} = require('./_auth');

module.exports = async function login(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = await readJsonBody(req);
    const users = getConfiguredUsers();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || users[normalizedEmail] !== String(password || '')) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.setHeader('Set-Cookie', sessionCookie(createSession(normalizedEmail)));
    return res.status(200).json({ user: normalizedEmail });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication service is not configured' });
  }
};

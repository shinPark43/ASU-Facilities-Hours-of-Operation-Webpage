const crypto = require('crypto');

/**
 * Constant-time API key authentication middleware for write endpoints.
 * Expects either `X-API-Key: <key>` or `Authorization: Bearer <key>`.
 * Fails closed (503) if ADMIN_API_KEY is not configured in the environment.
 */
function requireAdminKey(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey || configuredKey.trim() === '') {
    return res.status(503).json({
      success: false,
      error: 'Write endpoint disabled',
      message: 'ADMIN_API_KEY is not configured on this server.',
    });
  }

  const headerKey = req.get('x-api-key');
  const authHeader = req.get('authorization');
  const bearerKey = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;
  const providedKey = (headerKey || bearerKey || '').trim();

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing API key. Provide X-API-Key or Authorization: Bearer <key>.',
    });
  }

  const expectedBuf = Buffer.from(configuredKey, 'utf8');
  const providedBuf = Buffer.from(providedKey, 'utf8');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key.',
    });
  }

  return next();
}

module.exports = requireAdminKey;

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function normalizeIp(ip) {
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function requestContext(req, res, next) {
  storage.run(
    { ip: normalizeIp(req.ip), userAgent: (req.get('user-agent') || '').slice(0, 255) || null },
    next
  );
}

function currentContext() {
  return storage.getStore() || {};
}

module.exports = { requestContext, currentContext };

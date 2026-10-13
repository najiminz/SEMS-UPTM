const pool = require('../config/db');

let cache = null;

async function getSettings() {
  if (cache) return cache;
  const [rows] = await pool.query('SELECT * FROM system_settings WHERE id = 1');
  cache = rows[0] || { max_upload_size_mb: 10, allowed_extensions: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png' };
  return cache;
}

function setSettings(settings) {
  cache = settings;
}

module.exports = { getSettings, setSettings };

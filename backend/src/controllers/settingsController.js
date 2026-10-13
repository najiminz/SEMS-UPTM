const pool = require('../config/db');
const { getSettings, setSettings } = require('../utils/settingsCache');
const { logAction } = require('../utils/auditLogger');

const MIME_BY_EXTENSION = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

async function getSystemSettings(req, res) {
  const settings = await getSettings();
  res.json({ settings, availableExtensions: Object.keys(MIME_BY_EXTENSION) });
}

async function updateSystemSettings(req, res) {
  const { max_upload_size_mb, allowed_extensions } = req.body;

  const sizeMb = Number(max_upload_size_mb);
  if (!Number.isFinite(sizeMb) || sizeMb < 1 || sizeMb > 100) {
    return res.status(400).json({ message: 'Max upload size must be between 1 and 100 MB' });
  }

  const extensions = Array.isArray(allowed_extensions) ? allowed_extensions : [];
  const invalid = extensions.filter((ext) => !MIME_BY_EXTENSION[ext]);
  if (extensions.length === 0 || invalid.length > 0) {
    return res.status(400).json({ message: 'Select at least one valid document format' });
  }

  const extensionList = extensions.join(',');
  await pool.query(
    'UPDATE system_settings SET max_upload_size_mb = ?, allowed_extensions = ?, updated_by = ? WHERE id = 1',
    [sizeMb, extensionList, req.user.id]
  );
  setSettings({ id: 1, max_upload_size_mb: sizeMb, allowed_extensions: extensionList });

  await logAction({
    userId: req.user.id,
    action: 'SYSTEM_SETTINGS_UPDATED',
    targetType: 'system_settings',
    targetId: 1,
    details: { max_upload_size_mb: sizeMb, allowed_extensions: extensionList },
  });

  res.json({ message: 'Settings updated' });
}

module.exports = { getSystemSettings, updateSystemSettings, MIME_BY_EXTENSION };

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getSettings } = require('../utils/settingsCache');
const { MIME_BY_EXTENSION } = require('../controllers/settingsController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(24).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

function buildFileFilter(allowedExtensions) {
  const allowedSet = new Set(allowedExtensions);
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedSet.has(ext)) {
      return cb(new Error(`File extension "${ext}" is not allowed`));
    }
    if (file.mimetype !== MIME_BY_EXTENSION[ext]) {
      return cb(new Error(`File type "${file.mimetype}" does not match its extension`));
    }
    cb(null, true);
  };
}

function dynamicUpload(configureFn) {
  return async (req, res, next) => {
    const settings = await getSettings();
    const allowedExtensions = settings.allowed_extensions.split(',').map((e) => e.trim());
    const upload = multer({
      storage,
      fileFilter: buildFileFilter(allowedExtensions),
      limits: { fileSize: settings.max_upload_size_mb * 1024 * 1024 },
    });
    configureFn(upload)(req, res, next);
  };
}

const AVATAR_MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'avatars'));
  },
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(24).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!AVATAR_MIME_BY_EXT[ext]) return cb(new Error(`File extension "${ext}" is not allowed for a profile photo`));
    if (file.mimetype !== AVATAR_MIME_BY_EXT[ext]) return cb(new Error('File type does not match its extension'));
    cb(null, true);
  },
  limits: { fileSize: 3 * 1024 * 1024 },
}).single('avatar');

module.exports = { dynamicUpload, avatarUpload };

const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'docx', 'txt'];
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, DOCX, or TXT files are supported'));
  },
});

// Multer error handler — wraps upload.single('file') so multer errors become JSON responses
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

module.exports = { upload, handleUpload };

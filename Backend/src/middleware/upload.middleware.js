const multer = require('multer');

const fileFilter = (req, file, cb) => {
  // Allow pdf, jpeg, jpg, png
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF, JPEG, PNG are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;

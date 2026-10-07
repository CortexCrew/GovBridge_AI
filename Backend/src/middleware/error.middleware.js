function errorMiddleware(err, req, res, next) {
  console.error(err.stack);
  
  const status = err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 413 : err.name === 'MulterError' ? 400 : 500);
  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'File too large. Maximum file size is 5 MB.'
    : err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorMiddleware;

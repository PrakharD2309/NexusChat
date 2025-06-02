const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(error => error.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate field value entered'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler; 
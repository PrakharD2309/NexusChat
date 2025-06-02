const pagination = (defaultLimit = 20) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || defaultLimit;
    const skip = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      skip,
      sort: req.query.sort || { createdAt: -1 }
    };

    next();
  };
};

module.exports = pagination; 
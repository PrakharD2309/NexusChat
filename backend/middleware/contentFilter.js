const contentFilter = require('../services/contentFilter');

const filterContent = (req, res, next) => {
  if (req.body.content) {
    if (!contentFilter.isClean(req.body.content)) {
      return res.status(400).json({ 
        message: 'Message contains inappropriate content' 
      });
    }
    req.body.content = contentFilter.filter(req.body.content);
  }
  next();
};

module.exports = filterContent; 
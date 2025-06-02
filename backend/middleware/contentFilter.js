const contentFilter = require('../services/contentFilter');

const contentFilterMiddleware = async (req, res, next) => {
  try {
    // Only filter text messages
    if (req.body.type === 'text' && req.body.content) {
      const filterResult = await contentFilter.checkText(req.body.content);
      
      if (!filterResult.isAppropriate) {
        // If content is inappropriate, either reject or filter based on settings
        if (req.body.settings?.strictFiltering) {
          return res.status(400).json({
            message: 'Message contains inappropriate content',
            issues: filterResult.issues,
            score: filterResult.score
          });
        } else {
          // Filter the content
          req.body.content = contentFilter.filterText(req.body.content);
          req.body.filtered = true;
          req.body.filterIssues = filterResult.issues;
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = contentFilterMiddleware; 
const validUrl = require('valid-url');

const urlValidator = (req, res, next) => {
  const { fullUrl } = req.body;
  
  if (!fullUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  if (!validUrl.isWebUri(fullUrl)) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  next();
};

module.exports = urlValidator; 
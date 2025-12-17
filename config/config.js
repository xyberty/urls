const development = {
  app: {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: 'development'
  },
  db: {
    url: process.env.DB_URL || 'mongodb://localhost:27017/urlshortener',
    name: process.env.DB_NAME || 'urlshortener',
    debug: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  }
};

const production = {
  app: {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: 'production'
  },
  db: {
    url: process.env.DB_URL,
    debug: false
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 50
  }
};

const config = {
  development,
  production
};

module.exports = config[process.env.NODE_ENV || 'development'];
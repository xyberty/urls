const express = require("express");
const mongoose = require("mongoose");
const session = require('express-session');
const basicAuth = require('express-basic-auth');
const ShortUrl = require("./shortUrl");
require("dotenv").config();
const app = express();
const config = require('./config/config');
const healthRoutes = require('./routes/health');

// Add error handling for logger import
let logger;
try {
    logger = require('./utils/logger');
} catch (error) {
    console.error('Failed to initialize logger:', error);
    // Fallback logger
    logger = {
        info: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug
    };
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

// Warning handler
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && 
      warning.message.includes('punycode')) {
    return;
  }
  console.warn(warning.name, warning.message);
});

// Set up view engine and middleware first
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
//app.use('/', healthRoutes);
app.use('/health', healthRoutes);  // Only catch /health/* routes

async function connectToDatabase(retryCount = 0) {
  try {
    logger.info(`[${retryCount + 1}/${MAX_RETRIES + 1}] Attempting to connect to database...`);
    await mongoose.connect(config.db.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000,  // Add timeout of 5 seconds
      connectTimeoutMS: 3000,
    });
    logger.info("Connected to database!");
    startServer();
  } catch (err) {
    logger.error(`Database connection error: ${err.message}`);
    
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying connection in ${RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        connectToDatabase(retryCount + 1);
      }, RETRY_DELAY);
    } else {
      logger.error("Failed to connect to primary database after multiple attempts");
      logger.info("Initializing FileStore fallback...");
      
      // Fallback to local storage
      const FileStore = require('./utils/fileStore');
      global.fileStore = new FileStore();
      
      logger.info("FileStore initialized, starting server...");
      startServer();
    }
  }
}

function startServer() {
  logger.info("Starting server setup...");
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Basic authentication
  const auth = basicAuth({
    users: { 
        [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASSWORD || 'change-this-password' 
    },
    challenge: true,
    realm: 'URL Shortener'
  });

  // Define routes
  app.get("/", auth, async (req, res) => {
    logger.info("Handling request to /");
    try {
      const shortUrls = mongoose.connection.readyState === 1 
        ? await ShortUrl.find()
        : await global.fileStore.getAllUrls();
      logger.info(`Found ${shortUrls.length} URLs`);
      res.render("index", { shortUrls: shortUrls });
    } catch (error) {
      logger.error("Error fetching URLs:", error);
      res.render("index", { shortUrls: [] });
    }
  });

  app.post("/shortUrls", auth, async (req, res) => {
    logger.info("Handling request to /shortUrls");
    try {
      const full = req.body.fullUrl;
      if (mongoose.connection.readyState === 1) {
        // MongoDB logic
        let shortUrl = await ShortUrl.findOne({ full });
        if (shortUrl) {
          if (req.body.customSuffix && !shortUrl.alias.includes(req.body.customSuffix)) {
            shortUrl.alias.push(req.body.customSuffix);
            shortUrl.updatedAt = new Date();
            await shortUrl.save();
          }
        } else {
          shortUrl = new ShortUrl({ 
            full: req.body.fullUrl,
            short: nanoid(8),  // Always generate a short ID
            alias: req.body.customSuffix ? [req.body.customSuffix] : [],
            clicks: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await ShortUrl.create(shortUrl);
        }
      } else {
        // FileStore logic
        await global.fileStore.createShortUrl(full, req.body.customSuffix);
      }
      res.redirect("/");
    } catch (error) {
      logger.error("Error creating short URL:", error);
      res.status(500).send("Error creating short URL");
    }
  });

  app.get("/:shortUrl", async (req, res) => {
    logger.info("Handling request to /:shortUrl");
    try {
      let shortUrl;
      if (mongoose.connection.readyState === 1) {
        shortUrl = await ShortUrl.findOne({
          "$or": [
            {short: req.params.shortUrl},
            {alias: req.params.alias}
          ]
        });
        if (shortUrl) {
          shortUrl.clicks++;
          await shortUrl.save();
        }
      } else {
        shortUrl = await global.fileStore.getUrl(req.params.shortUrl);
        if (shortUrl) {
          await global.fileStore.incrementClicks(req.params.shortUrl);
        }
      }
      
      if (!shortUrl) return res.sendStatus(404);
      res.redirect(shortUrl.full);
    } catch (error) {
      logger.error("Error redirecting URL:", error);
      res.status(500).send("Error redirecting to URL");
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send('Something broke!');
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
  });
}

// Initialize the application
logger.info("Starting application...");
connectToDatabase();
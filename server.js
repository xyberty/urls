const express = require("express");
const mongoose = require("mongoose");
const session = require('express-session');
const ShortUrl = require("./shortUrl");
require("dotenv").config();
const app = express();
const config = require('./config/config');
const healthRoutes = require('./routes/health');
const { nanoid } = require('nanoid');

// Simple cookie parsing helper (avoids extra dependency)
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.split('=');
    if (!key) return acc;
    acc[key.trim()] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
}

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
app.use(express.static("public")); // Serve static files from public directory
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
//app.use('/', healthRoutes);
app.use('/health', healthRoutes);  // Only catch /health/* routes

async function connectToDatabase(retryCount = 0) {
  try {
    logger.info(`[${retryCount + 1}/${MAX_RETRIES + 1}] Attempting to connect to database...`);
    await mongoose.connect(config.db.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 3000,
      dbName: config.db.name,
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

  // Owner context middleware
  // Validates owner token format: URL-safe characters (alphanumeric, dash, underscore, dot, tilde, at)
  // This allows tokens like "my.token", "user@domain", "token~123" while staying URL-safe
  function isValidOwnerToken(token) {
    if (!token || typeof token !== 'string') return false;
    if (token.length < 1 || token.length > 128) return false;
    // Allow URL-safe characters: alphanumeric, dash, underscore, dot, tilde, at sign
    // Excludes characters that need URL encoding or could cause issues
    return /^[a-zA-Z0-9._~@-]+$/.test(token);
  }

  app.use((req, res, next) => {
    try {
      // Skip redirect logic for API endpoints (POST requests to /change-owner, /delete, etc.)
      // These endpoints can work without query params, they use cookies/body
      const isApiEndpoint = req.method === 'POST' && (
        req.path === '/change-owner' || 
        req.path === '/delete' || 
        req.path === '/shortUrls'
      );

      const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
      const queryOwner = url.searchParams.get('owner');
      const cookies = parseCookies(req.headers.cookie || '');
      const cookieOwner = cookies.owner;

      // Helper to set cookie
      const setOwnerCookie = (ownerValue) => {
        const maxAgeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
        const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `owner=${encodeURIComponent(ownerValue)}; HttpOnly; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secureFlag}`
        );
      };

      // 1) Query param present -> validate and use it, sync cookie
      if (queryOwner) {
        if (!isValidOwnerToken(queryOwner)) {
          // Invalid token format - generate new one
          if (isApiEndpoint) {
            // For API endpoints, just use cookie or generate new, don't redirect
            if (cookieOwner && isValidOwnerToken(cookieOwner)) {
              req.owner = cookieOwner;
              return next();
            }
            const newOwner = nanoid(16);
            req.owner = newOwner;
            setOwnerCookie(newOwner);
            return next();
          }
          const newOwner = nanoid(16);
          req.owner = newOwner;
          setOwnerCookie(newOwner);
          url.searchParams.set('owner', newOwner);
          return res.redirect(url.pathname + '?' + url.searchParams.toString());
        }
        req.owner = queryOwner;
        if (cookieOwner !== queryOwner) {
          setOwnerCookie(queryOwner);
        }
        return next();
      }

      // 2) Cookie present but no query -> ensure URL is bookmarkable with ?owner=
      if (cookieOwner && isValidOwnerToken(cookieOwner)) {
        req.owner = cookieOwner;
        // For API endpoints, don't redirect, just use the cookie
        if (isApiEndpoint) {
          return next();
        }
        // Avoid redirect loops: only redirect when owner is missing from query
        url.searchParams.set('owner', cookieOwner);
        const target = url.pathname + '?' + url.searchParams.toString();
        if (target !== req.originalUrl) {
          return res.redirect(target);
        }
        return next();
      }

      // 3) Neither present or invalid -> create new owner
      const newOwner = nanoid(16);
      req.owner = newOwner;
      setOwnerCookie(newOwner);
      
      // For API endpoints, don't redirect, just set owner and continue
      if (isApiEndpoint) {
        return next();
      }
      
      // For regular GET requests, redirect to add ?owner= to URL
      url.searchParams.set('owner', newOwner);
      return res.redirect(url.pathname + '?' + url.searchParams.toString());
    } catch (err) {
      logger.error('Error in owner middleware:', err);
      return next(err);
    }
  });

  // Define routes
  app.get("/", async (req, res) => {
    logger.info("Handling request to /");
    try {
      const owner = req.owner;
      const shortUrls = mongoose.connection.readyState === 1 
        ? await ShortUrl.find({ owner })
        : await global.fileStore.getAllUrlsByOwner(owner);
      logger.info(`Found ${shortUrls.length} URLs`);
      res.render("index", { shortUrls: shortUrls, owner });
    } catch (error) {
      logger.error("Error fetching URLs:", error);
      res.render("index", { shortUrls: [], owner: req.owner });
    }
  });

  app.post("/shortUrls", async (req, res) => {
    logger.info("Handling request to /shortUrls");
    try {
      const full = req.body.fullUrl;
      const owner = req.owner;
      if (mongoose.connection.readyState === 1) {
        // MongoDB logic
        let shortUrl = await ShortUrl.findOne({ full, owner });
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
            owner,
            clicks: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await ShortUrl.create(shortUrl);
        }
      } else {
        // FileStore logic
        await global.fileStore.createShortUrl(full, req.body.customSuffix, owner);
      }
      // Preserve owner in redirect so bookmark remains correct
      res.redirect("/?owner=" + encodeURIComponent(owner));
    } catch (error) {
      logger.error("Error creating short URL:", error);
      res.status(500).send("Error creating short URL");
    }
  });

  // Export all URLs for current owner - MUST come before /:shortUrl route
  app.get("/export", async (req, res) => {
    logger.info("Handling export request");
    try {
      const owner = req.owner;
      const shortUrls = mongoose.connection.readyState === 1
        ? await ShortUrl.find({ owner })
        : await global.fileStore.getAllUrlsByOwner(owner);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="urls-${owner}.json"`
      );
      res.send(JSON.stringify(shortUrls, null, 2));
    } catch (error) {
      logger.error("Error exporting URLs:", error);
      res.status(500).send("Error exporting URLs");
    }
  });

  // Change owner token - reassigns all URLs from old owner to new owner
  // MUST come before /:shortUrl route to avoid route conflicts
  app.post("/change-owner", async (req, res) => {
    logger.info("Handling change owner request");
    try {
      const oldOwner = req.owner;
      const newOwner = req.body.newOwner;

      logger.info(`Change owner request: oldOwner=${oldOwner}, newOwner=${newOwner}, body=${JSON.stringify(req.body)}, body type=${typeof req.body.newOwner}`);

      if (!newOwner) {
        logger.warn("No newOwner provided");
        return res.status(400).json({ error: "New owner token is required" });
      }

      // Ensure it's a string
      const newOwnerStr = String(newOwner).trim();
      
      if (!isValidOwnerToken(newOwnerStr)) {
        logger.warn(`Invalid owner token format: ${newOwnerStr} (length: ${newOwnerStr.length})`);
        const validationResult = {
          isString: typeof newOwnerStr === 'string',
          length: newOwnerStr.length,
          matchesPattern: /^[a-zA-Z0-9._~@-]+$/.test(newOwnerStr),
          charCodes: newOwnerStr.split('').map(c => c.charCodeAt(0))
        };
        logger.warn(`Validation details: ${JSON.stringify(validationResult)}`);
        return res.status(400).json({ 
          error: `Invalid owner token format. Token must be 1-128 characters, URL-safe characters only (letters, numbers, dash, underscore, dot, tilde, at). Received: ${newOwnerStr}`,
          details: validationResult
        });
      }

      if (oldOwner === newOwnerStr) {
        return res.json({ success: true, message: "Owner token unchanged" });
      }

      if (mongoose.connection.readyState === 1) {
        try {
          logger.info(`Attempting MongoDB update: { owner: "${oldOwner}" } -> { owner: "${newOwnerStr}" }`);
          const result = await ShortUrl.updateMany(
            { owner: oldOwner },
            { $set: { owner: newOwnerStr } }
          );
          logger.info(`Reassigned ${result.modifiedCount} URLs from ${oldOwner} to ${newOwnerStr}`);
        } catch (mongoError) {
          logger.error(`MongoDB error during owner change: ${mongoError.message}`, mongoError);
          logger.error(`MongoDB error name: ${mongoError.name}, code: ${mongoError.code}`);
          throw new Error(`Database error: ${mongoError.message}`);
        }
      } else {
        await global.fileStore.reassignOwner(oldOwner, newOwnerStr);
      }

      // Update cookie and redirect
      const maxAgeMs = 365 * 24 * 60 * 60 * 1000;
      const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      res.setHeader(
        'Set-Cookie',
        `owner=${encodeURIComponent(newOwnerStr)}; HttpOnly; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secureFlag}`
      );

      res.json({ success: true, newOwner: newOwnerStr });
    } catch (error) {
      logger.error("Error changing owner:", error);
      logger.error("Error stack:", error.stack);
      res.status(500).json({ error: `Error changing owner token: ${error.message}`, details: error.toString() });
    }
  });

  app.get("/:shortUrl", async (req, res) => {
    logger.info("Handling request to /:shortUrl");
    try {
      let shortUrl;
      if (mongoose.connection.readyState === 1) {
        shortUrl = await ShortUrl.findOne({
          "$or": [
            {alias: req.params.shortUrl},
            {short: req.params.shortUrl}
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

  app.post("/delete", async (req, res) => {
    logger.info("Handling delete request");
    try {
      let { selected, short } = req.body;
      const owner = req.owner;

      let toDelete = [];
      if (selected) {
        toDelete = Array.isArray(selected) ? selected : [selected];
      } else if (short) {
        toDelete = Array.isArray(short) ? short : [short];
      }

      if (toDelete.length === 0) {
        logger.info("No URLs selected for deletion");
        return res.redirect("/");
      }

      if (mongoose.connection.readyState === 1) {
        const result = await ShortUrl.deleteMany({ short: { $in: toDelete }, owner });
        logger.info(`Deleted ${result.deletedCount} URL(s) from MongoDB`);
      } else {
        await global.fileStore.deleteUrlsForOwner(toDelete, owner);
      }

      res.redirect("/?owner=" + encodeURIComponent(owner));
    } catch (error) {
      logger.error("Error deleting URLs:", error);
      res.status(500).send("Error deleting URLs");
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
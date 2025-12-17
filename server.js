const express = require("express");
const mongoose = require("mongoose");
const session = require('express-session');
let MongoStore = require('connect-mongo');
if (MongoStore.default) {
  MongoStore = MongoStore.default;
}
const ShortUrl = require("./shortUrl");
const Space = require("./space");
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
  let connected = false;
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
    connected = true;
  } catch (err) {
    logger.error(`Database connection error: ${err.message}`);
    
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying connection in ${RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        connectToDatabase(retryCount + 1);
      }, RETRY_DELAY);
      return;
    } else {
      logger.error("Failed to connect to primary database after multiple attempts");
      logger.info("Initializing FileStore fallback...");
      
      // Fallback to local storage
      const FileStore = require('./utils/fileStore');
      global.fileStore = new FileStore();
      
      logger.info("FileStore initialized, starting server...");
    }
  }
  
  try {
    startServer(connected);
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

function startServer(useMongo = true) {
  logger.info("Starting server setup...");
  
  // Session configuration
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (useMongo && mongoose.connection.readyState === 1) {
    logger.info("Using MongoStore for sessions");
    try {
      sessionConfig.store = MongoStore.create({
        mongoUrl: config.db.url,
        dbName: config.db.name,
        ttl: 24 * 60 * 60 // 1 day
      });
    } catch (storeError) {
      logger.error(`Failed to create MongoStore: ${storeError.message}`);
      logger.warn("Falling back to MemoryStore");
    }
  } else {
    logger.warn("Using MemoryStore for sessions (fallback)");
  }

  app.use(session(sessionConfig));

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

  app.use(async (req, res, next) => {
    try {
      const host = req.get('host');
      const isDev = config.app.nodeEnv === 'development';
      
      // Allow localhost and 127.0.0.1 as management domains in development
      const isManagementDomain = host === config.managementDomain || 
        (isDev && (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')));

      // 1) Handle redirection domains (not management)
      if (!isManagementDomain) {
        // If it's the root of a redirection domain, redirect to management
        if (req.path === '/' && req.method === 'GET') {
          const protocol = isDev ? 'http' : 'https';
          return res.redirect(`${protocol}://${config.managementDomain}`);
        }
        // Otherwise, just proceed (the /:shortUrl route will handle it)
        return next();
      }

      // 2) Handle management domain logic
      const isApiEndpoint = req.method === 'POST' && (
        req.path === '/change-owner' || 
        req.path === '/delete' || 
        req.path === '/shortUrls' ||
        req.path === '/spaces' ||
        req.path.startsWith('/spaces/')
      );

      const url = new URL(req.protocol + '://' + host + req.originalUrl);
      const queryOwner = url.searchParams.get('owner') || req.body.owner;
      const querySpace = url.searchParams.get('space') || req.body.space;
      const cookies = parseCookies(req.headers.cookie || '');
      const cookieOwner = cookies.owner;
      const cookieSpace = cookies.activeSpace;

      // Helper to set cookie
      const setCookie = (name, value) => {
        const maxAgeMs = 365 * 24 * 60 * 60 * 1000;
        const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${secureFlag}`
        );
      };

      // --- Owner Logic ---
      let currentOwner = queryOwner || cookieOwner;
      if (!isValidOwnerToken(currentOwner)) {
        currentOwner = nanoid(16);
        setCookie('owner', currentOwner);
        if (!isApiEndpoint) {
          url.searchParams.set('owner', currentOwner);
          return res.redirect(url.pathname + '?' + url.searchParams.toString());
        }
      }
      req.owner = currentOwner;
      if (cookieOwner !== currentOwner) {
        setCookie('owner', currentOwner);
      }

      // --- Space Logic (only if Mongo is connected) ---
      if (mongoose.connection.readyState === 1) {
        let activeSpace;
        
        // Try query param first, then cookie
        const spaceIdToTry = querySpace || cookieSpace;
        
        if (spaceIdToTry && mongoose.Types.ObjectId.isValid(spaceIdToTry)) {
          activeSpace = await Space.findOne({ _id: spaceIdToTry, owner: currentOwner });
        }

        // If still no active space, find the first one or create Default
        if (!activeSpace) {
          activeSpace = await Space.findOne({ owner: currentOwner }).sort({ createdAt: 1 });
          if (!activeSpace) {
            activeSpace = await Space.create({
              name: 'Default',
              domain: config.allowedDomains[0] || host,
              owner: currentOwner
            });
          }
        }

        req.activeSpace = activeSpace;
        
        // Sync cookie and URL if needed
        if (cookieSpace !== activeSpace._id.toString()) {
          setCookie('activeSpace', activeSpace._id.toString());
        }

        if (!isApiEndpoint && querySpace !== activeSpace._id.toString()) {
          url.searchParams.set('space', activeSpace._id.toString());
          if (url.searchParams.get('owner') !== currentOwner) {
            url.searchParams.set('owner', currentOwner);
          }
          const target = url.pathname + '?' + url.searchParams.toString();
          if (target !== req.originalUrl) {
            return res.redirect(target);
          }
        }
      }

      next();
    } catch (err) {
      logger.error('Error in middleware:', err);
      return next(err);
    }
  });

  // Define routes
  app.get("/", async (req, res) => {
    logger.info("Handling request to /");
    try {
      const owner = req.owner;
      const activeSpace = req.activeSpace;
      
      let spaces = [];
      if (mongoose.connection.readyState === 1) {
        spaces = await Space.find({ owner });
      }

      const shortUrls = mongoose.connection.readyState === 1 
        ? await ShortUrl.find({ owner, spaceId: activeSpace?._id })
        : await global.fileStore.getAllUrlsByOwner(owner);
      
      logger.info(`Found ${shortUrls.length} URLs for space ${activeSpace?.name}`);
      res.render("index", { 
        shortUrls, 
        owner, 
        spaces, 
        activeSpace,
        allowedDomains: config.allowedDomains 
      });
    } catch (error) {
      logger.error("Error fetching URLs:", error);
      res.render("index", { 
        shortUrls: [], 
        owner: req.owner, 
        spaces: [], 
        activeSpace: null,
        allowedDomains: config.allowedDomains
      });
    }
  });

  // Space management routes
  app.post("/spaces", async (req, res) => {
    try {
      const { name, domain } = req.body;
      const owner = req.owner;
      
      if (!name || !domain) {
        return res.status(400).send("Name and domain are required");
      }

      const space = await Space.create({ name, domain, owner });
      res.redirect(`/?owner=${encodeURIComponent(owner)}&space=${space._id}`);
    } catch (error) {
      logger.error("Error creating space:", error);
      res.status(500).send("Error creating space");
    }
  });

  app.post("/spaces/:id/edit", async (req, res) => {
    try {
      const { name, domain } = req.body;
      const owner = req.owner;
      
      const space = await Space.findOneAndUpdate(
        { _id: req.params.id, owner },
        { name, domain },
        { new: true }
      );

      if (space) {
        // Update all URLs in this space to use the new domain
        await ShortUrl.updateMany(
          { spaceId: space._id, owner },
          { domain: space.domain }
        );
      }

      res.redirect(`/?owner=${encodeURIComponent(owner)}&space=${req.params.id}`);
    } catch (error) {
      logger.error("Error editing space:", error);
      res.status(500).send("Error editing space");
    }
  });

  app.post("/spaces/:id/delete", async (req, res) => {
    try {
      const owner = req.owner;
      const spaceId = req.params.id;

      // 1) Delete all URLs in this space (Cascade)
      await ShortUrl.deleteMany({ spaceId, owner });
      
      // 2) Delete the space itself
      await Space.findOneAndDelete({ _id: spaceId, owner });

      res.redirect(`/?owner=${encodeURIComponent(owner)}`);
    } catch (error) {
      logger.error("Error deleting space:", error);
      res.status(500).send("Error deleting space");
    }
  });

  app.post("/shortUrls", async (req, res) => {
    logger.info("Handling request to /shortUrls");
    try {
      const full = req.body.fullUrl;
      const owner = req.owner;
      const activeSpace = req.activeSpace;

      if (!activeSpace) {
        return res.status(400).send("No active space found. Please create a space first.");
      }

      if (mongoose.connection.readyState === 1) {
        // MongoDB logic
        // Check if this URL already exists IN THIS SPACE
        let shortUrl = await ShortUrl.findOne({ full, owner, spaceId: activeSpace._id });
        if (shortUrl) {
          if (req.body.customSuffix && !shortUrl.alias.includes(req.body.customSuffix)) {
            shortUrl.alias.push(req.body.customSuffix);
            shortUrl.updatedAt = new Date();
            await shortUrl.save();
          }
        } else {
          shortUrl = new ShortUrl({ 
            full: req.body.fullUrl,
            short: nanoid(8),
            alias: req.body.customSuffix ? [req.body.customSuffix] : [],
            owner,
            spaceId: activeSpace._id,
            domain: activeSpace.domain,
            clicks: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await ShortUrl.create(shortUrl);
        }
      } else {
        // FileStore logic (simplified, doesn't handle spaces yet)
        await global.fileStore.createShortUrl(full, req.body.customSuffix, owner);
      }
      // Preserve owner and space in redirect
      res.redirect(`/?owner=${encodeURIComponent(owner)}&space=${activeSpace._id}`);
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
      const host = req.get('host');
      let shortUrl;
      if (mongoose.connection.readyState === 1) {
        shortUrl = await ShortUrl.findOne({
          domain: host,
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
        const result = await ShortUrl.deleteMany({ 
          short: { $in: toDelete }, 
          owner,
          spaceId: req.activeSpace?._id
        });
        logger.info(`Deleted ${result.deletedCount} URL(s) from MongoDB`);
      } else {
        await global.fileStore.deleteUrlsForOwner(toDelete, owner);
      }

      res.redirect(`/?owner=${encodeURIComponent(owner)}&space=${req.activeSpace?._id}`);
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
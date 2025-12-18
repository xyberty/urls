const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileStore {
  constructor() {
    this.filePath = path.join(__dirname, '../data/urls.json');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      try {
        await fs.access(this.filePath);
      } catch {
        await fs.writeFile(this.filePath, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error initializing FileStore:', error);
    }
  }

  async getAllUrls() {
    const data = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(data);
  }

  async getAllUrlsByOwner(owner) {
    const urls = await this.getAllUrls();
    // Owner was added later; treat entries without owner as not owned
    return urls.filter(url => url.owner === owner);
  }

  async saveUrl(shortUrl) {
    try {
      const urls = await this.getAllUrls();
      urls.push(shortUrl);
      await fs.writeFile(this.filePath, JSON.stringify(urls, null, 2));
      return shortUrl;
    } catch (error) {
      logger.error('Error saving URL to FileStore:', error);
      throw error;
    }
  }

  async getUrl(shortCode) {
    try {
      const urls = await this.getAllUrls();
      return urls.find(url => {
        // Check for short code match
        if (url.short === shortCode) return true;
        
        // Check for alias match if aliases exist
        if (url.alias && Array.isArray(url.alias)) {
          return url.alias.includes(shortCode);
        }
        
        return false;
      });
    } catch (error) {
      logger.error(`Error finding URL for code ${shortCode}:`, error);
      return null;
    }
  }

  async incrementClicks(shortCode) {
    const urls = await this.getAllUrls();
    const url = urls.find(url => 
      url.short === shortCode || (url.alias && url.alias.includes(shortCode))
    );
    if (url) {
      url.clicks++;
      url.updatedAt = new Date();
      await fs.writeFile(this.filePath, JSON.stringify(urls, null, 2));
    }
    return url;
  }

  async deleteUrls(shortCodes) {
    if (!Array.isArray(shortCodes) || shortCodes.length === 0) {
      return;
    }

    try {
      const urls = await this.getAllUrls();
      const shortSet = new Set(shortCodes);
      const filtered = urls.filter(url => !shortSet.has(url.short));
      await fs.writeFile(this.filePath, JSON.stringify(filtered, null, 2));
      logger.info(`Deleted ${urls.length - filtered.length} URL(s) from FileStore`);
    } catch (error) {
      logger.error('Error deleting URLs from FileStore:', error);
      throw error;
    }
  }

  async deleteUrlsForOwner(shortCodes, owner) {
    if (!Array.isArray(shortCodes) || shortCodes.length === 0) {
      return;
    }

    try {
      const urls = await this.getAllUrls();
      const shortSet = new Set(shortCodes);
      const filtered = urls.filter(url => {
        if (url.owner !== owner) return true;
        return !shortSet.has(url.short);
      });
      await fs.writeFile(this.filePath, JSON.stringify(filtered, null, 2));
      logger.info(`Deleted ${urls.length - filtered.length} URL(s) for owner ${owner} from FileStore`);
    } catch (error) {
      logger.error('Error deleting owner URLs from FileStore:', error);
      throw error;
    }
  }

  async reassignOwner(oldOwner, newOwner) {
    try {
      const urls = await this.getAllUrls();
      let reassignedCount = 0;
      const updatedUrls = urls.map(url => {
        if (url.owner === oldOwner) {
          reassignedCount++;
          return { ...url, owner: newOwner };
        }
        return url;
      });
      await fs.writeFile(this.filePath, JSON.stringify(updatedUrls, null, 2));
      logger.info(`Reassigned ${reassignedCount} URL(s) from owner ${oldOwner} to ${newOwner} in FileStore`);
      return reassignedCount;
    } catch (error) {
      logger.error('Error reassigning owner in FileStore:', error);
      throw error;
    }
  }

  async updateUrl(short, owner, fullUrl, aliasArray, newShort) {
    try {
      const urls = await this.getAllUrls();
      const url = urls.find(u => u.short === short && u.owner === owner);
      if (url) {
        url.full = fullUrl;
        url.alias = aliasArray;
        if (newShort) {
          url.short = newShort;
        }
        url.updatedAt = new Date();
        await fs.writeFile(this.filePath, JSON.stringify(urls, null, 2));
      }
      return url;
    } catch (error) {
      logger.error('Error updating URL in FileStore:', error);
      throw error;
    }
  }
}

module.exports = FileStore;

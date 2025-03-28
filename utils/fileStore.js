const fs = require('fs').promises;
const path = require('path');
const { nanoid } = require('nanoid');
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

  async createShortUrl(fullUrl, customSuffix) {
    const urls = await this.getAllUrls();
    const shortUrl = {
      full: fullUrl,
      short: nanoid(8),  // Always generate a short ID
      alias: customSuffix ? [customSuffix] : [],  // Store custom alias if provided
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    urls.push(shortUrl);
    await fs.writeFile(this.filePath, JSON.stringify(urls, null, 2));
    return shortUrl;
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
      url.short === shortCode || url.alias.includes(shortCode)
    );
    if (url) {
      url.clicks++;
      url.updatedAt = new Date();
      await fs.writeFile(this.filePath, JSON.stringify(urls, null, 2));
    }
    return url;
  }
}

module.exports = FileStore;
const { customAlphabet } = require('nanoid');

// Clean, human-friendly alphabet: no 0, 1, l, I, O, or technical symbols
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet);

/**
 * Generates a unique short slug by checking against a provided existence function.
 * @param {Function} existsFn - A function that returns true if a slug is already taken
 * @param {number} initialLength - Starting length for the slug (default 4)
 * @returns {Promise<string>} A unique slug
 */
async function createUniqueShortUrl(existsFn, initialLength = 4) {
  let length = initialLength;
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    const slug = nanoid(length);
    if (!(await (existsFn(slug)))) {
      return slug;
    }
    
    attempts++;
    // If we're hitting collisions at this length, increase it slightly
    if (attempts > 5 && length < 8) {
      length++;
    }
  }
  
  // Final fallback with more entropy if needed
  return nanoid(10);
}

module.exports = { createUniqueShortUrl, alphabet };


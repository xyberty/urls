const mongoose = require('mongoose');
const ShortUrl = require('../shortUrl');

describe('ShortUrl Model Test', () => {
    beforeAll(async () => {
        await mongoose.connect(global.__MONGO_URI__, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should create & save short url successfully', async () => {
        const validShortUrl = new ShortUrl({
            full: 'https://www.example.com'
        });
        const savedShortUrl = await validShortUrl.save();
        
        expect(savedShortUrl._id).toBeDefined();
        expect(savedShortUrl.full).toBe('https://www.example.com');
        expect(savedShortUrl.short).toBeDefined();
        expect(savedShortUrl.clicks).toBe(0);
    });

    it('should fail to save with invalid URL', async () => {
        const shortUrlWithInvalidUrl = new ShortUrl({
            full: 'invalid-url'
        });
        
        let err;
        try {
            await shortUrlWithInvalidUrl.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });
}); 
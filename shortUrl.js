const mongoose = require('mongoose')
const shortId = require('shortid')

shortId.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_!')

const shortUrlSchema = new mongoose.Schema({
    full: {
        type: String, 
        required: true
    },
    short: {
        type: String, 
        required: true,
        default: shortId.generate
    },
    clicks: {
        type: Number, 
        required: true, 
        default: 0
    }
})

module.exports = mongoose.model('ShortUrl', shortUrlSchema)
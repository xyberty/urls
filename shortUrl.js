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
    alias: {
        type: [String]
    },
    clicks: {
        type: Number, 
        required: true, 
        default: 0
    }
},
{
    timestamps: true
}
)
// shortUrlSchema.index({full: 1}, {unique: true});
shortUrlSchema.index({alias: 1}, {name: "aliases", unique: true, partialFilterExpression: {"alias.$size": {$gte: 0}}});

module.exports = mongoose.model('ShortUrl', shortUrlSchema)
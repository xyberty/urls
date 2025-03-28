const mongoose = require('mongoose')
const { nanoid } = require('nanoid')

const shortUrlSchema = new mongoose.Schema({
    full: {
        type: String, 
        required: true,
        maxLength: 2048
    },
    short: {
        type: String, 
        required: true,
        default: () => nanoid(8),
        index: true
    },
    alias: [{  // Array of custom aliases
        type: String
    }],
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
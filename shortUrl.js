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
    owner: {
        type: String,
        index: true
    },
    domain: {
        type: String,
        required: true,
        index: true
    },
    spaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Space',
        required: true,
        index: true
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
// Unique short codes and aliases per domain
shortUrlSchema.index({ domain: 1, short: 1 }, { unique: true });
shortUrlSchema.index({ domain: 1, alias: 1 }, { name: "domain_aliases", unique: true, partialFilterExpression: { "alias.0": { $exists: true } } });

module.exports = mongoose.model('ShortUrl', shortUrlSchema)
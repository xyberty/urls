const mongoose = require('mongoose')

const spaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    domain: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    owner: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
})

// Ensure space names are unique per owner
spaceSchema.index({ name: 1, owner: 1 }, { unique: true });

module.exports = mongoose.model('Space', spaceSchema)


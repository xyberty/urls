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
    suffix: {
        type: String,
        trim: true,
        default: '',
        // Ensure suffix starts with / if provided and doesn't end with /
        set: function(v) {
            if (!v) return '';
            let normalized = v.trim();
            if (normalized && !normalized.startsWith('/')) {
                normalized = '/' + normalized;
            }
            if (normalized.endsWith('/') && normalized.length > 1) {
                normalized = normalized.slice(0, -1);
            }
            return normalized;
        }
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


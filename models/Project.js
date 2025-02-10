const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['technology', 'design', 'science', 'engineering', 'other']
    },
    tags: [{
        type: String,
        trim: true
    }],
    images: [{
        url: String,
        publicId: String
    }],
    innovator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add text index for search
projectSchema.index({
    title: 'text',
    description: 'text',
    tags: 'text'
});

// Calculate average rating before saving
projectSchema.pre('save', function(next) {
    if (this.reviews.length > 0) {
        this.averageRating = this.reviews.reduce((acc, review) => acc + review.rating, 0) / this.reviews.length;
    }
    next();
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;

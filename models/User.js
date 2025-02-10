const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    accountType: {
        type: String,
        enum: ['innovator', 'buyer'],
        required: true
    },
    projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    purchases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    savedProjects: [{
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project'
        },
        savedAt: {
            type: Date,
            default: Date.now
        }
    }],
    stripeCustomerId: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

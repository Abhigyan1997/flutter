const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    protein: {
        type: Number,
        required: true
    },
    fat: {
        type: Number,
        required: true
    },
    carbs: {
        type: Number,
        required: true
    },
    calories: {
        type: Number,
        required: true
    },
    imageUrl: {
        type: String
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Meal', mealSchema);
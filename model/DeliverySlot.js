const mongoose = require('mongoose');

const deliverySlotSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    deliveryType: {
        type: String,
        enum: ['Delivery', 'Pickup'],
        default: 'Delivery'
    },
    customerName: {
        type: String,
        required: true
    },
    scheduledTime: {
        type: String,
        required: true
    },
    meals: [{
        meal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meal'
        },
        status: {
            type: String,
            enum: ['scheduled', 'skipped', 'swapped', 'moved'],
            default: 'scheduled'
        }
    }],
    address: {
        type: String
    },
    status: {
        type: String,
        enum: ['scheduled', 'rescheduled', 'completed'],
        default: 'scheduled'
    }
}, { timestamps: true });

module.exports = mongoose.model('DeliverySlot', deliverySlotSchema);
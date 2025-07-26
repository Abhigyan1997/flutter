// deliverySlot.js
const mongoose = require('mongoose');

const deliverySlotSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    deliveryType: { type: String, enum: ['Delivery', 'Pickup'], required: true },
    customerName: String,
    scheduledTime: { type: String, required: true }, // "14:00" format
    items: [{
        name: { type: String, required: true },
        protein: Number,
        fat: Number,
        carbs: Number,
        calories: Number,
        status: { type: String, enum: ['scheduled', 'skipped', 'swapped'], default: 'scheduled' }
    }],
    status: { type: String, enum: ['active', 'rescheduled', 'cancelled'], default: 'active' }
});

module.exports = mongoose.model('DeliverySlot', deliverySlotSchema);
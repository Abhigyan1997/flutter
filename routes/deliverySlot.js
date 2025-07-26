const express = require('express');
const router = express.Router();
const DeliverySlot = require('../model/DeliverySlot');
const Meal = require('../model/Meal');

// Get all delivery slots
router.get('/', async (req, res) => {
    try {
        const deliverySlots = await DeliverySlot.find().populate('meals.meal');
        res.json(deliverySlots);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get delivery slots for a specific date
router.get('/date/:date', async (req, res) => {
    try {
        const date = new Date(req.params.date);
        const deliverySlots = await DeliverySlot.find({
            date: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        }).populate('meals.meal');

        res.json(deliverySlots);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a delivery slot
router.post('/', async (req, res) => {
    const deliverySlot = new DeliverySlot({
        date: req.body.date,
        deliveryType: req.body.deliveryType,
        customerName: req.body.customerName,
        scheduledTime: req.body.scheduledTime,
        meals: req.body.meals,
        address: req.body.address
    });

    try {
        const newDeliverySlot = await deliverySlot.save();
        res.status(201).json(newDeliverySlot);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Reschedule a delivery slot
router.patch('/:id/reschedule', async (req, res) => {
    try {
        const deliverySlot = await DeliverySlot.findById(req.params.id);
        if (!deliverySlot) {
            return res.status(404).json({ message: 'Delivery slot not found' });
        }

        if (req.body.date) {
            deliverySlot.date = new Date(req.body.date);
        }
        if (req.body.scheduledTime) {
            deliverySlot.scheduledTime = req.body.scheduledTime;
        }
        if (req.body.deliveryType) {
            deliverySlot.deliveryType = req.body.deliveryType;
        }

        deliverySlot.status = 'rescheduled';
        const updatedDeliverySlot = await deliverySlot.save();
        res.json(updatedDeliverySlot);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a meal in a delivery slot (skip, swap, move)
router.patch('/:slotId/meals/:mealId', async (req, res) => {
    try {
        const deliverySlot = await DeliverySlot.findById(req.params.slotId);
        if (!deliverySlot) {
            return res.status(404).json({ message: 'Delivery slot not found' });
        }

        const mealIndex = deliverySlot.meals.findIndex(
            m => m._id.toString() === req.params.mealId
        );

        if (mealIndex === -1) {
            return res.status(404).json({ message: 'Meal not found in this slot' });
        }

        if (req.body.status) {
            deliverySlot.meals[mealIndex].status = req.body.status;
        }
        if (req.body.meal) {
            deliverySlot.meals[mealIndex].meal = req.body.meal;
        }

        const updatedDeliverySlot = await deliverySlot.save();
        res.json(updatedDeliverySlot);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
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
        // Parse the input date string to Date object
        const inputDate = new Date(req.params.date);

        // Validate the date
        if (isNaN(inputDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Create start and end of day in UTC
        const startOfDay = new Date(Date.UTC(
            inputDate.getUTCFullYear(),
            inputDate.getUTCMonth(),
            inputDate.getUTCDate(),
            0, 0, 0, 0
        ));

        const endOfDay = new Date(Date.UTC(
            inputDate.getUTCFullYear(),
            inputDate.getUTCMonth(),
            inputDate.getUTCDate(),
            23, 59, 59, 999
        ));

        // Query for slots within this UTC day range
        const deliverySlots = await DeliverySlot.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).populate('meals.meal');

        res.json(deliverySlots);
    } catch (err) {
        console.error('Error fetching delivery slots:', err);
        res.status(500).json({ message: 'Server error while fetching delivery slots' });
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
        // Validate request body
        if (!req.body.date || !req.body.scheduledTime) {
            return res.status(400).json({
                success: false,
                message: 'Both date and scheduledTime are required'
            });
        }

        const deliverySlot = await DeliverySlot.findById(req.params.id)
            .populate('meals.meal'); // Populate meal data if needed

        if (!deliverySlot) {
            return res.status(404).json({
                success: false,
                message: 'Delivery slot not found'
            });
        }

        // Convert incoming date to proper Date object
        const newDate = new Date(req.body.date);
        if (isNaN(newDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        // Update fields
        deliverySlot.date = newDate;
        deliverySlot.scheduledTime = req.body.scheduledTime;
        deliverySlot.status = 'rescheduled';

        // Add updatedAt timestamp
        deliverySlot.updatedAt = new Date();

        const updatedDeliverySlot = await deliverySlot.save();

        // Return consistent response format
        res.json({
            success: true,
            data: updatedDeliverySlot,
            message: 'Delivery slot rescheduled successfully'
        });

    } catch (err) {
        console.error('Reschedule error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during rescheduling',
            error: err.message
        });
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
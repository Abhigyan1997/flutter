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
        // Validate required fields exist and are non-null
        if (!req.body.date || !req.body.scheduledTime) {
            return res.status(400).json({
                success: false,
                message: 'Date and scheduledTime are required'
            });
        }

        const slot = await DeliverySlot.findById(req.params.id);
        if (!slot) {
            return res.status(404).json({
                success: false,
                message: 'Slot not found'
            });
        }

        // Ensure all required fields are set
        const updatedSlot = await DeliverySlot.findByIdAndUpdate(
            req.params.id,
            {
                date: new Date(req.body.date),
                scheduledTime: req.body.scheduledTime,
                status: 'rescheduled',
                updatedAt: new Date()
            },
            { new: true, runValidators: true } // Return updated doc and validate
        ).populate('meals.meal');

        res.json({
            success: true,
            data: updatedSlot.toObject(), // Convert to plain object
            message: 'Rescheduled successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
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
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
        const { date, scheduledTime } = req.body;

        if (!date || !scheduledTime) {
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

        // Parse reschedule date and time into a single Date object
        const rescheduleDate = new Date(date);
        const [hours, minutes] = scheduledTime.split(':');
        rescheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const now = new Date();

        let finalTime = scheduledTime;

        // ⚠️ If rescheduling for today AND time has passed → Auto-select next time slot
        const isToday = new Date(now.toDateString())?.getTime() === new Date(date)?.getTime();
        if (isToday && rescheduleDate.getTime() <= now.getTime()) {
            // Define your available time slots
            const timeSlots = ['09:00', '11:00', '13:00', '14:00', '17:00', '19:00'];

            // Find the next available time slot
            const nextSlot = timeSlots.find(ts => {
                const [h, m] = ts.split(':');
                const candidateTime = new Date();
                candidateTime.setHours(parseInt(h), parseInt(m), 0, 0);
                return candidateTime > now;
            });

            if (!nextSlot) {
                return res.status(400).json({
                    success: false,
                    message: 'No available time slots left for today'
                });
            }

            finalTime = nextSlot;
        }

        // Update the slot with final date and time
        const updatedSlot = await DeliverySlot.findByIdAndUpdate(
            req.params.id,
            {
                date: new Date(date),
                scheduledTime: finalTime,
                status: 'rescheduled',
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('meals.meal');

        res.json({
            success: true,
            data: updatedSlot.toObject(),
            message: `Rescheduled successfully to ${finalTime}`
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
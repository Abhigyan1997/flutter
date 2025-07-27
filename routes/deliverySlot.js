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

        // 1. Validate inputs
        if (!date || !scheduledTime) {
            return res.status(400).json({
                success: false,
                message: 'Date and scheduledTime are required'
            });
        }

        console.log(`⏱️ Reschedule requested: ${date} at ${scheduledTime}`);

        // 2. Check if slot exists
        const slot = await DeliverySlot.findById(req.params.id);
        if (!slot) {
            return res.status(404).json({
                success: false,
                message: 'Delivery slot not found'
            });
        }

        // 3. Parse requested date and time into a full Date object
        const rescheduleDate = new Date(date);
        const [inputHour, inputMin] = scheduledTime.split(':');
        rescheduleDate.setHours(parseInt(inputHour), parseInt(inputMin), 0, 0);

        const now = new Date();

        // 4. Define available time slots (can be adjusted)
        const timeSlots = ['09:00', '11:00', '13:00', '14:00', '17:00', '19:00', '21:00', '23:00'];

        let finalTime = scheduledTime;

        // 5. If the requested time is in the past, adjust
        if (rescheduleDate <= now) {
            console.warn(`⚠️ Requested time ${rescheduleDate.toLocaleTimeString()} is in the past.`);

            const nextSlot = timeSlots.find(ts => {
                const [h, m] = ts.split(':');
                const candidate = new Date();
                candidate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                candidate.setHours(parseInt(h), parseInt(m), 0, 0);
                return candidate > now;
            });

            if (!nextSlot) {
                return res.status(400).json({
                    success: false,
                    message: 'No available time slots left for today. Please choose a future date.'
                });
            }

            finalTime = nextSlot;
            const [nextH, nextM] = finalTime.split(':');
            rescheduleDate.setHours(parseInt(nextH), parseInt(nextM), 0, 0);
        }

        // 6. Update the delivery slot
        const updatedSlot = await DeliverySlot.findByIdAndUpdate(
            req.params.id,
            {
                date: new Date(rescheduleDate.toDateString()), // just the date part
                scheduledTime: finalTime,
                status: 'rescheduled',
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).populate('meals.meal');

        return res.status(200).json({
            success: true,
            message: `Rescheduled successfully to ${rescheduleDate.toLocaleString()}`,
            data: updatedSlot.toObject()
        });

    } catch (err) {
        console.error('❌ Error in reschedule route:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
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
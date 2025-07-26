require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mealRoutes = require('./routes/Meal');
const deliverySlotRoutes = require('./routes/deliverySlot');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/meals', mealRoutes);
app.use('/api/delivery-slots', deliverySlotRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));

module.exports = app;
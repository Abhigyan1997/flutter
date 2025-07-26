const express = require('express');
const router = express.Router();
const Meal = require('../model/Meal');

// Get all meals
router.get('/', async (req, res) => {
    try {
        const meals = await Meal.find();
        res.json(meals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single meal
router.get('/:id', async (req, res) => {
    try {
        const meal = await Meal.findById(req.params.id);
        if (!meal) {
            return res.status(404).json({ message: 'Meal not found' });
        }
        res.json(meal);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a meal (for initial data setup)
router.post('/', async (req, res) => {
    const meal = new Meal({
        name: req.body.name,
        description: req.body.description,
        protein: req.body.protein,
        fat: req.body.fat,
        carbs: req.body.carbs,
        calories: req.body.calories,
        imageUrl: req.body.imageUrl
    });

    try {
        const newMeal = await meal.save();
        res.status(201).json(newMeal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
const Animal = require('../models/Animal');
const ProductionRecord = require('../models/ProductionRecord');
const SaleTransaction = require('../models/SaleTransaction');
const Farm = require('../models/Farm');
const Farmer = require('../models/Farmer');
const HealthSnapshot = require('../models/HealthSnapshot');
const Expense = require('../models/Expense');
const VaccinationEvent = require('../models/VaccinationEvent');
const mongoose = require('mongoose');

// Get full summary for logged-in farmer (by farmerId)
exports.getFarmerSummary = async (req, res) => {
    try {
        const { farmerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(farmerId)) {
            return res.status(400).json({ message: 'Invalid farmer ID' });
        }

        // 1. Get farmer and their farms
        const farmer = await Farmer.findById(farmerId).select('farms fullName');
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }

        const farmIds = farmer.farms.map(id => new mongoose.Types.ObjectId(id));
        const farms = await Farm.find({ _id: { $in: farmIds } });

        if (farms.length === 0) {
            return res.status(200).json({
                farmerName: farmer.fullName,
                farmCount: 0,
                farms: [],
                summaryDate: new Date(),
                stats: {
                    totalAnimals: 0,
                    speciesBreakdown: {},
                    genderBreakdown: {},
                    productionLast30Days: [],
                    salesLast30Days: { totalRevenue: 0, count: 0 },
                    expensesLast30Days: { totalExpenses: 0, count: 0 },
                    vaccinationsLast30Days: 0,
                    healthAlerts: 0
                }
            });
        }

        // 2. Animals across all farms
        const animals = await Animal.find({ farmId: { $in: farmIds } });
        const animalCount = animals.length;
        const speciesBreakdown = {};
        const genderBreakdown = { male: 0, female: 0 };

        animals.forEach(animal => {
            speciesBreakdown[animal.species] = (speciesBreakdown[animal.species] || 0) + 1;
            if (animal.gender) genderBreakdown[animal.gender]++;
        });

        // 3. Production in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const production = await ProductionRecord.aggregate([
            { $match: { farmId: { $in: farmIds }, date: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$productType', totalQuantity: { $sum: '$quantity' }, unit: { $first: '$unit' } } }
        ]);

        // 4. Sales in last 30 days
        let sales = [];
        try {
            sales = await SaleTransaction.aggregate([
                { $match: { farmId: { $in: farmIds }, date: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
            ]);
        } catch (err) {
            console.log("SaleTransaction aggregation skipped", err.message);
        }

        // 5. Expenses in last 30 days
        let expenses = [];
        try {
            expenses = await Expense.aggregate([
                { $match: { farmId: { $in: farmIds }, date: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, totalExpenses: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]);
        } catch (err) {
            console.log("Expense aggregation skipped", err.message);
        }

        // Common: animal IDs for vaccination & health queries
        const animalIds = animals.map(a => a._id);

        // 6. Vaccination events in last 30 days
        let vaccinationCount = 0;
        try {
            vaccinationCount = await VaccinationEvent.countDocuments({
                animalId: { $in: animalIds },
                date: { $gte: thirtyDaysAgo }
            });
        } catch (err) {
            console.log("VaccinationEvent count skipped", err.message);
        }

        // 7. Health alerts (HealthSnapshot score < 50)
        let healthAlerts = 0;
        try {
            healthAlerts = await HealthSnapshot.countDocuments({
                animalId: { $in: animalIds },
                score: { $lt: 50 },
                calculatedOn: { $gte: thirtyDaysAgo }
            });
        } catch (err) {
            console.log("HealthSnapshot count skipped", err.message);
        }

        res.status(200).json({
            farmerName: farmer.fullName,
            farmCount: farms.length,
            farms: farms.map(f => ({ _id: f._id, name: f.name, location: f.location })),
            summaryDate: new Date(),
            stats: {
                totalAnimals: animalCount,
                speciesBreakdown,
                genderBreakdown,
                productionLast30Days: production,
                salesLast30Days: sales[0] || { totalRevenue: 0, count: 0 },
                expensesLast30Days: expenses[0] || { totalExpenses: 0, count: 0 },
                vaccinationsLast30Days: vaccinationCount,
                healthAlerts
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

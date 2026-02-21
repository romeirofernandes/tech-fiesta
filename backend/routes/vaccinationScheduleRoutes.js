const express = require('express');
const router = express.Router();
const {
    getSchedulesBySpecies,
    getAllSchedules,
    createSchedule,
    bulkCreateSchedules,
    getDueBeforeAge
} = require('../controllers/vaccinationScheduleController');

router.get('/due-before', getDueBeforeAge);
router.get('/', getSchedulesBySpecies);
router.get('/all', getAllSchedules);
router.post('/', createSchedule);
router.post('/bulk', bulkCreateSchedules);

module.exports = router;

const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const animalController = require('../controllers/animalController');

router.post('/', upload.single('image'), animalController.createAnimal);
router.get('/', animalController.getAnimals);
router.get('/dead', animalController.getDeadAnimals);
router.get('/:id', animalController.getAnimalById);
router.put('/:id', upload.single('image'), animalController.updateAnimal);
router.post('/identify', upload.single('image'), animalController.identifyAnimal);
router.post('/monitor', upload.single('image'), animalController.monitorFarm);
router.post('/:id/death', animalController.reportDeath);
router.delete('/:id', animalController.deleteAnimal);

module.exports = router;
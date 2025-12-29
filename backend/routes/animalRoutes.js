const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const animalController = require('../controllers/animalController');

router.post('/', upload.single('image'), animalController.createAnimal);
router.get('/', animalController.getAnimals);
router.get('/:id', animalController.getAnimalById);
router.put('/:id', upload.single('image'), animalController.updateAnimal);
router.delete('/:id', animalController.deleteAnimal);

module.exports = router;
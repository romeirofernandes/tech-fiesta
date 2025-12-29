const Animal = require('../models/Animal');
const cloudinary = require('../config/cloudinary');

exports.createAnimal = async (req, res) => {
    try {
        const { name, rfid, species, breed, gender, yearOfBirth, farmId } = req.body;
        let imageUrl = null;

        if (req.file) {
            const stream = require("stream");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);
            
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'animals' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                bufferStream.pipe(uploadStream);
            });

            imageUrl = uploadResult.secure_url;
        }

        const newAnimal = new Animal({
            name,
            rfid,
            species,
            breed, 
            gender,
            yearOfBirth,
            farmId,
            imageUrl
        });

        await newAnimal.save();
        res.status(201).json(newAnimal);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAnimals = async (req, res) => {
    try {
        const animals = await Animal.find();
        res.status(200).json(animals);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAnimalById = async (req, res) => {
    try {
        const animal = await Animal.findById(req.params.id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }
        res.status(200).json(animal);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateAnimal = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rfid, species, breed, gender, yearOfBirth, farmId } = req.body;
        let animal = await Animal.findById(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }

        if (name) animal.name = name;
        if (rfid) animal.rfid = rfid;
        if (species) animal.species = species;
        if (breed) animal.breed = breed;    
        if (gender) animal.gender = gender;
        if (yearOfBirth) animal.yearOfBirth = yearOfBirth;
        if (farmId) animal.farmId = farmId;

        if (req.file) {
            const stream = require("stream");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);
            
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'animals' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                bufferStream.pipe(uploadStream);
            });

            animal.imageUrl = uploadResult.secure_url;
        }

        await animal.save();
        res.status(200).json(animal);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteAnimal = async (req, res) => {
    try {
        const { id } = req.params;
        const animal = await Animal.findByIdAndDelete(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }
        res.status(200).json({ message: 'Animal deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
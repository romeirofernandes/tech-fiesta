const Animal = require('../models/Animal');
const VaccinationEvent = require('../models/VaccinationEvent');
const cloudinary = require('../config/cloudinary');
const { generateVaccinationEvents } = require('../services/vaccinationService');

exports.createAnimal = async (req, res) => {
    try {
        const { name, rfid, species, breed, gender, age, ageUnit, farmId, questionsAnswers } = req.body;
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
            age,
            ageUnit,
            farmId,
            imageUrl
        });

        await newAnimal.save();

        // Generate vaccination events using LLM
        if (questionsAnswers && questionsAnswers.length > 0) {
            try {
                const vaccinationData = await generateVaccinationEvents(
                    { species, breed, gender, age, ageUnit },
                    JSON.parse(questionsAnswers)
                );

                // Create vaccination events
                const vaccinationEvents = await Promise.all(
                    vaccinationData.map(event => 
                        VaccinationEvent.create({
                            animalId: newAnimal._id,
                            vaccineName: event.vaccineName,
                            eventType: event.eventType,
                            date: new Date(event.date),
                            notes: event.notes || null,
                            repeatsEvery: event.repeatsEvery || null
                        })
                    )
                );

                return res.status(201).json({ 
                    animal: newAnimal,
                    vaccinationEvents 
                });
            } catch (llmError) {
                console.error('LLM Error:', llmError);
                // Return animal even if vaccination generation fails
                return res.status(201).json({ 
                    animal: newAnimal,
                    vaccinationEvents: [],
                    warning: 'Animal created but vaccination schedule generation failed'
                });
            }
        }

        res.status(201).json({ animal: newAnimal, vaccinationEvents: [] });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAnimals = async (req, res) => {
    try {
        const { farmId } = req.query;
        const filter = farmId ? { farmId } : {};
        
        const animals = await Animal.find(filter).populate('farmId', 'name location imageUrl');
        res.status(200).json(animals);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAnimalById = async (req, res) => {
    try {
        const animal = await Animal.findById(req.params.id).populate('farmId', 'name location imageUrl');
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }
        
        // Get vaccination events for this animal
        const vaccinationEvents = await VaccinationEvent.find({ animalId: req.params.id })
            .sort({ date: 1 });
        
        res.status(200).json({ animal, vaccinationEvents });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateAnimal = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rfid, species, breed, gender, age, ageUnit, farmId } = req.body;
        let animal = await Animal.findById(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }

        if (name) animal.name = name;
        if (rfid) animal.rfid = rfid;
        if (species) animal.species = species;
        if (breed) animal.breed = breed;    
        if (gender) animal.gender = gender;
        if (age !== undefined) animal.age = age;
        if (ageUnit) animal.ageUnit = ageUnit;
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
        
        // Also delete associated vaccination events
        await VaccinationEvent.deleteMany({ animalId: id });
        
        res.status(200).json({ message: 'Animal and associated records deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
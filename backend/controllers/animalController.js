const Animal = require('../models/Animal');
const VaccinationEvent = require('../models/VaccinationEvent');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const cloudinary = require('../config/cloudinary');
const { generateEmbedding, cosineSimilarity, detectAndCropAnimals } = require('../services/embeddingService');
const AnimalEmbedding = require('../models/AnimalEmbedding');

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

        // Generate vaccination events from static schedule data
        try {
            // Ensure species names are handled correctly (case-insensitive or mapped)
            const speciesLower = species.toLowerCase();
            const searchSpecies = (speciesLower === 'cattle') ? 'cow' : speciesLower;

            const filter = {
                species: searchSpecies,
                $or: [
                    { genderSpecific: 'all' },
                    { genderSpecific: gender.toLowerCase() }
                ]
            };
            const schedules = await VaccinationSchedule.find(filter);

            if (schedules.length > 0) {
                const now = new Date();
                const vaccinationEvents = await Promise.all(
                    schedules.map(schedule => {
                        // Calculate target date based on animal age and primary vaccination age
                        let targetDate = new Date(now);
                        const ageInMonths = ageUnit === 'years' ? age * 12 : ageUnit === 'days' ? age / 30 : Number(age);
                        const ageMatch = schedule.primaryVaccinationAge.match(/(\d+)\s*(month|day|week|year)/i);
                        
                        if (ageMatch) {
                            const vaccAge = parseInt(ageMatch[1]);
                            const vaccUnit = ageMatch[2].toLowerCase();
                            let vaccAgeInMonths = vaccAge;
                            if (vaccUnit.startsWith('day')) vaccAgeInMonths = vaccAge / 30;
                            else if (vaccUnit.startsWith('week')) vaccAgeInMonths = vaccAge / 4;
                            else if (vaccUnit.startsWith('year')) vaccAgeInMonths = vaccAge * 12;

                            const monthsUntilVacc = vaccAgeInMonths - ageInMonths;
                            if (monthsUntilVacc > 0) {
                                targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsUntilVacc));
                            }
                        }

                        const notes = [
                            schedule.doseAndRoute !== '—' ? `Dose: ${schedule.doseAndRoute}` : '',
                            schedule.boosterSchedule !== '—' ? `Schedule: ${schedule.boosterSchedule}` : '',
                            schedule.notes || ''
                        ].filter(Boolean).join('. ');

                        return VaccinationEvent.create({
                            animalId: newAnimal._id,
                            vaccineName: schedule.vaccineName !== '—' ? `${schedule.disease} - ${schedule.vaccineName}` : schedule.disease,
                            eventType: 'scheduled',
                            date: targetDate,
                            notes: notes || null,
                            repeatsEvery: null,
                        });
                    })
                );

                // Generate embedding if image exists
                if (imageUrl) {
                    try {
                        // Pass the Cloudinary URL to the embedding service
                        const vector = await generateEmbedding(imageUrl);
                        await AnimalEmbedding.create({
                            animalId: newAnimal._id,
                            embedding: vector
                        });
                    } catch (embError) {
                        console.error('Embedding generation failed:', embError);
                        // We don't fail the request, just log it. 
                        // The animal is created, just not searchable by face yet.
                    }
                }

                return res.status(201).json({ 
                    animal: newAnimal,
                    vaccinationEvents 
                });
            }
        } catch (scheduleError) {
            console.error('Schedule Error:', scheduleError);
            // Return animal even if vaccination generation fails
            return res.status(201).json({ 
                animal: newAnimal,
                vaccinationEvents: [],
                warning: 'Animal created but vaccination schedule generation failed'
            });
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
        let vaccinationEvents = await VaccinationEvent.find({ animalId: req.params.id })
            .sort({ date: 1 });

        // If no events exist, try to generate them from schedule (backfill for existing animals)
        if (vaccinationEvents.length === 0 && animal.species) {
            try {
                const speciesName = animal.species.toLowerCase();
                const gender = animal.gender ? animal.gender.toLowerCase() : 'female'; // default to female if unknown
                
                // Allow both 'cow' and 'cattle' to match 'CATTLE & BUFFALO'
                const searchSpecies = (speciesName === 'cattle') ? 'cow' : speciesName;

                const filter = {
                    species: searchSpecies,
                    $or: [
                        { genderSpecific: 'all' },
                        { genderSpecific: gender }
                    ]
                };
                
                const schedules = await VaccinationSchedule.find(filter);

                if (schedules.length > 0) {
                    const now = new Date();
                    const newEvents = await Promise.all(
                        schedules.map(schedule => {
                            let targetDate = new Date(now);
                            const age = animal.age || 0;
                            const ageUnit = animal.ageUnit || 'months';
                            
                            const ageInMonths = ageUnit === 'years' ? age * 12 : ageUnit === 'days' ? age / 30 : Number(age);
                            const ageMatch = schedule.primaryVaccinationAge.match(/(\d+)\s*(month|day|week|year)/i);
                            
                            if (ageMatch) {
                                const vaccAge = parseInt(ageMatch[1]);
                                const vaccUnit = ageMatch[2].toLowerCase();
                                let vaccAgeInMonths = vaccAge;
                                if (vaccUnit.startsWith('day')) vaccAgeInMonths = vaccAge / 30;
                                else if (vaccUnit.startsWith('week')) vaccAgeInMonths = vaccAge / 4;
                                else if (vaccUnit.startsWith('year')) vaccAgeInMonths = vaccAge * 12;

                                const monthsUntilVacc = vaccAgeInMonths - ageInMonths;
                                if (monthsUntilVacc > 0) {
                                    targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsUntilVacc));
                                }
                            }

                            const notes = [
                                schedule.doseAndRoute !== '—' ? `Dose: ${schedule.doseAndRoute}` : '',
                                schedule.boosterSchedule !== '—' ? `Schedule: ${schedule.boosterSchedule}` : '',
                                schedule.notes || ''
                            ].filter(Boolean).join('. ');

                            return VaccinationEvent.create({
                                animalId: animal._id,
                                vaccineName: schedule.vaccineName !== '—' ? `${schedule.disease} - ${schedule.vaccineName}` : schedule.disease,
                                eventType: 'scheduled',
                                date: targetDate, // If overdue, defaults to now()
                                notes: notes || null,
                                repeatsEvery: null
                            });
                        })
                    );
                    
                    vaccinationEvents = newEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
            } catch (err) {
                console.error("Auto-generation of schedule failed:", err);
                // Continue with empty events if generation fails
            }
        }
        
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

exports.identifyAnimal = async (req, res) => {
    try {
        const { farmId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Image is required for identification' });
        }

        if (!farmId) {
             return res.status(400).json({ message: 'Farm ID is required' });
        }

        // 1. Upload the query image to Cloudinary (temp or standard folder)
        const stream = require("stream");
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'temp_identification' }, // separate folder or same
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            bufferStream.pipe(uploadStream);
        });

        const queryImageUrl = uploadResult.secure_url;

        // 2. Generate embedding for query image
        let queryVector;
        try {
            queryVector = await generateEmbedding(queryImageUrl);
        } catch (err) {
            console.error(err);
             return res.status(500).json({ message: 'Failed to generate embedding for the image' });
        }

        // 3. Fetch all animals for this farm to filter embeddings
        // Optimization: We could fetch embeddings directly if we denormalized farmId, 
        // but for now strict relational check is safer.
        const farmAnimals = await Animal.find({ farmId }).select('_id');
        const farmAnimalIds = farmAnimals.map(a => a._id);

        if (farmAnimalIds.length === 0) {
            return res.status(404).json({ message: 'No animals found for this farm to match against.' });
        }

        // 4. Fetch embeddings for these animals
        const candidateEmbeddings = await AnimalEmbedding.find({
            animalId: { $in: farmAnimalIds }
        }).populate('animalId');

        // 5. Find best match
        let bestMatch = null;
        let maxSimilarity = -1;
        const THRESHOLD = 0.80; // 80% similarity threshold

        for (const candidate of candidateEmbeddings) {
            // Check if embedding exists and is valid
            if (!candidate.embedding || candidate.embedding.length === 0) continue;

            const sim = cosineSimilarity(queryVector, candidate.embedding);
            if (sim > maxSimilarity) {
                maxSimilarity = sim;
                bestMatch = candidate;
            }
        }

        if (bestMatch && maxSimilarity >= THRESHOLD) {
            // Found a match
             return res.status(200).json({
                 match: true,
                 similarity: maxSimilarity,
                 animal: bestMatch.animalId
             });
        } else {
             return res.status(200).json({
                 match: false,
                 similarity: maxSimilarity,
                 message: 'No matching animal found'
             });
        }

    } catch (error) {
        console.error('Identification Error:', error);
        res.status(500).json({ message: 'Server Error during identification', error: error.message });
    }
};

exports.monitorFarm = async (req, res) => {
    try {
        const { farmId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Frame is required for monitoring' });
        }

        if (!farmId) {
             return res.status(400).json({ message: 'Farm ID is required' });
        }

        const buffer = req.file.buffer;

        // 1. Detect and Crop Animals
        let crops = [];
        try {
            crops = await detectAndCropAnimals(buffer);
        } catch (err) {
            console.error('Detection Error:', err);
             return res.status(500).json({ message: 'Failed to detect animals in frame' });
        }

        // 2. Fetch all known embeddings for this farm
        const farmAnimals = await Animal.find({ farmId });
        const farmAnimalIds = farmAnimals.map(a => a._id);
        const candidateEmbeddings = await AnimalEmbedding.find({
            animalId: { $in: farmAnimalIds }
        }).populate('animalId');

        const presentAnimals = new Set();
        const detections = [];

        // 3. For each crop, generate embedding and find match
        for (const crop of crops) {
            let embedding;
            try {
                // Pass buffer directly to embedding generator
                embedding = await generateEmbedding(crop.buffer);
            } catch (err) {
                console.error('Embedding Error for crop:', err);
                continue;
            }

            let bestMatch = null;
            let maxSimilarity = -1;
            const THRESHOLD = 0.65; // Slightly lower threshold for crops which might be lower quality

            for (const candidate of candidateEmbeddings) {
                if (!candidate.embedding) continue;
                const sim = cosineSimilarity(embedding, candidate.embedding);
                if (sim > maxSimilarity) {
                    maxSimilarity = sim;
                    bestMatch = candidate;
                }
            }

            if (bestMatch && maxSimilarity >= THRESHOLD) {
                presentAnimals.add(bestMatch.animalId._id.toString());
                detections.push({
                    box: crop.box,
                    label: crop.label,
                    animal: bestMatch.animalId,
                    similarity: maxSimilarity
                });
            } else {
                detections.push({
                    box: crop.box,
                    label: crop.label,
                    animal: null, // Unknown animal
                    similarity: maxSimilarity
                });
            }
        }

        // 4. Determine Missing Animals
        const missingAnimals = farmAnimals.filter(a => !presentAnimals.has(a._id.toString()));
        const presentList = farmAnimals.filter(a => presentAnimals.has(a._id.toString()));

        res.status(200).json({
            present: presentList,
            missing: missingAnimals,
            detections: detections,
            totalChecked: crops.length
        });

    } catch (error) {
        console.error('Monitoring Error:', error);
        res.status(500).json({ message: 'Server Error during monitoring', error: error.message });
    }
};
const Animal = require('../models/Animal');
const Farmer = require('../models/Farmer');
const DeadAnimal = require('../models/DeadAnimal');
const MarketplaceItem = require('../models/MarketplaceItem');
const VaccinationEvent = require('../models/VaccinationEvent');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const Alert = require('../models/Alert');
const SensorEvent = require('../models/SensorEvent');
const IotSensorReading = require('../models/IotSensorReading');
const HeartRateThreshold = require('../models/HeartRateThreshold');
const HealthSnapshot = require('../models/HealthSnapshot');
const RFIDEvent = require('../models/RFIDEvent');
const cloudinary = require('../config/cloudinary');
const { generateEmbedding, cosineSimilarity, detectAndCropAnimals } = require('../services/embeddingService');
const AnimalEmbedding = require('../models/AnimalEmbedding');
const { parseVaccinationAgeToMonths, computeVaccinationTarget, getCurrentAgeInMonths } = require('../utils/ageUtils');

/**
 * Report the death of an animal.
 * Moves the animal data to DeadAnimals collection and cleans up associated records.
 */
exports.reportDeath = async (req, res) => {
    try {
        const { id } = req.params;
        const { causeOfDeath, deathDate, notes } = req.body;

        const animal = await Animal.findById(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }

        const dateOfDeath = deathDate ? new Date(deathDate) : new Date();

        // Calculate age at death in months
        // Start with initial age converted to months
        let initialAgeMonths = 0;
        if (animal.ageUnit === 'years') initialAgeMonths = animal.age * 12;
        else if (animal.ageUnit === 'days') initialAgeMonths = animal.age / 30.44;
        else initialAgeMonths = animal.age; // default months

        // Add time since creation to death date
        const timeSinceCreation = dateOfDeath - new Date(animal.createdAt);
        const monthsSinceCreation = timeSinceCreation / (1000 * 60 * 60 * 24 * 30.44);
        const finalAgeMonths = Math.max(0, initialAgeMonths + monthsSinceCreation);

        // Create DeadAnimal record
        await DeadAnimal.create({
            originalId: animal._id,
            name: animal.name,
            rfid: animal.rfid,
            species: animal.species,
            breed: animal.breed,
            gender: animal.gender,
            ageAtDeath: parseFloat(finalAgeMonths.toFixed(1)),
            ageUnit: 'months',
            farmId: animal.farmId,
            imageUrl: animal.imageUrl,
            deathDate: dateOfDeath,
            causeOfDeath: causeOfDeath || 'Unknown',
            notes: notes
        });

        // Delete associated records 
        // (Similar to deleteAnimal but we keep historical records if needed? 
        // User said "remove from vaccination schedule... and all my models... cascade"
        // Usually, removing `VaccinationEvent` (future), `Alert` (active), `MarketplaceItem` (active) is key.
        // Historical data like `ProductionRecord` or `HealthSnapshot` is obscure. User said "remove from vaccination schedule okay and like everywhere else its needed".
        // I will follow `deleteAnimal` logic for cleanup to be safe and clean, but maybe keep HealthSnapshot?
        // Actually, user said "delete the animal from the schema and liek go through all my models... cascade needs to be done like remove from vaccination schedule".
        // To be safe and thorough as requested ("everywhere else its needed"), I will remove everything linked to this ID to avoid orphans,
        // EXCEPT I already saved the important info in `DeadAnimal`. 
        
        await Promise.all([
            // Use ID directly
            VaccinationEvent.deleteMany({ animalId: id }),
            Alert.deleteMany({ animalId: id }),
            SensorEvent.deleteMany({ animalId: id }),
            IotSensorReading.deleteMany({ animalId: id }),
            HeartRateThreshold.deleteMany({ animalId: id }),
            HealthSnapshot.deleteMany({ animalId: id }),
            AnimalEmbedding.deleteMany({ animalId: id }),
            RFIDEvent.deleteMany({ animalId: id }),
            // Also remove from Marketplace
            MarketplaceItem.deleteMany({ linkedAnimalId: id })
        ]);

        // Finally delete the animal
        await Animal.findByIdAndDelete(id);

        res.status(200).json({ message: 'Animal death reported and records cleaned up successfully' });
    } catch (error) {
        console.error('Report Death Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


/**
 * Generate vaccination events for an animal based on static vaccination schedules.
 * Computes proper dates based on the animal's actual age (derived from createdAt + age/ageUnit).
 * Skips vaccines that already have a VaccinationEvent for this animal.
 * Past-due vaccinations are marked as 'missed', future ones as 'scheduled'.
 * Previously administered vaccines (from questionnaire) are marked as 'administered'.
 * @param {Object} animal - The animal document
 * @param {string[]} administeredVaccineNames - List of vaccine names already given to this animal
 */
async function generateVaccinationEventsForAnimal(animal, administeredVaccineNames = []) {
    const speciesLower = (animal.species || '').toLowerCase();
    // Map common alternative names to the seed species values
    const speciesMap = { 'cattle': 'cow', 'bull': 'cow', 'calf': 'cow', 'heifer': 'cow', 'water buffalo': 'buffalo', 'hen': 'chicken', 'rooster': 'chicken', 'swine': 'pig', 'boar': 'pig', 'piglet': 'pig', 'lamb': 'sheep', 'ram': 'sheep', 'ewe': 'sheep', 'mare': 'horse', 'stallion': 'horse', 'pony': 'horse', 'equine': 'horse' };
    const searchSpecies = speciesMap[speciesLower] || speciesLower;
    const gender = (animal.gender || 'female').toLowerCase();

    const filter = {
        species: searchSpecies,
        $or: [
            { genderSpecific: 'all' },
            { genderSpecific: gender }
        ]
    };
    const schedules = await VaccinationSchedule.find(filter);
    if (schedules.length === 0) {
        console.log(`[VaccGen] No schedules found for species="${searchSpecies}", gender="${gender}"`);
        return [];
    }
    console.log(`[VaccGen] Found ${schedules.length} schedules for species="${searchSpecies}", gender="${gender}"`);

    // Get existing vaccination events for this animal to avoid duplicates
    const existingEvents = await VaccinationEvent.find({ animalId: animal._id });
    const existingVaccineNames = new Set(existingEvents.map(e => e.vaccineName));

    // Normalize administered vaccine names for matching
    const administeredNormalized = new Set(
        administeredVaccineNames.map(n => n.toLowerCase().trim())
    );

    const eventsToCreate = [];

    for (const schedule of schedules) {
        const vaccineName = schedule.vaccineName !== '—'
            ? `${schedule.disease} - ${schedule.vaccineName}`
            : schedule.disease;

        // Skip if this vaccine already has an event for this animal
        if (existingVaccineNames.has(vaccineName)) continue;

        const vaccAgeInMonths = parseVaccinationAgeToMonths(schedule.primaryVaccinationAge);
        
        let targetDate, eventType;
        if (vaccAgeInMonths !== null) {
            const result = computeVaccinationTarget(animal, vaccAgeInMonths);
            targetDate = result.targetDate;
            eventType = result.eventType;
        } else {
            // Can't parse age — default to scheduled for today
            targetDate = new Date();
            eventType = 'scheduled';
        }

        // Check if this vaccine was already administered (reported by farmer in questionnaire)
        const isAdministered = administeredNormalized.has(vaccineName.toLowerCase()) ||
            administeredNormalized.has(schedule.disease.toLowerCase()) ||
            [...administeredNormalized].some(name => 
                vaccineName.toLowerCase().includes(name) || name.includes(schedule.disease.toLowerCase())
            );

        if (isAdministered) {
            eventType = 'administered';
        }

        const notes = [
            schedule.doseAndRoute !== '—' ? `Dose: ${schedule.doseAndRoute}` : '',
            schedule.boosterSchedule !== '—' ? `Schedule: ${schedule.boosterSchedule}` : '',
            schedule.notes || ''
        ].filter(Boolean).join('. ');

        eventsToCreate.push({
            animalId: animal._id,
            vaccineName,
            eventType,
            date: targetDate,
            notes: notes || null,
            repeatsEvery: null
        });
    }

    if (eventsToCreate.length === 0) return existingEvents;

    const created = await VaccinationEvent.insertMany(eventsToCreate);
    return [...existingEvents, ...created].sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * Check for missed vaccinations across all animals (or a specific animal).
 * Marks scheduled events with past dates as 'missed' and creates alerts.
 * @param {string|null} animalId - Optional: check only this animal
 */
async function checkMissedVaccinations(animalId = null) {
    const now = new Date();
    const filter = {
        eventType: 'scheduled',
        date: { $lt: now }
    };
    if (animalId) filter.animalId = animalId;

    // Find all overdue scheduled events
    const overdueEvents = await VaccinationEvent.find(filter).populate('animalId', 'name rfid');

    if (overdueEvents.length === 0) return;

    // Batch update to 'missed'
    const overdueIds = overdueEvents.map(e => e._id);
    await VaccinationEvent.updateMany(
        { _id: { $in: overdueIds } },
        { $set: { eventType: 'missed' } }
    );

    // Create alerts for each, avoiding duplicates
    for (const event of overdueEvents) {
        if (!event.animalId) continue;
        
        const message = `Missed vaccination: ${event.vaccineName} was due on ${event.date.toLocaleDateString()}`;
        
        // Check if alert already exists
        const existingAlert = await Alert.findOne({
            animalId: event.animalId._id || event.animalId,
            type: 'vaccination',
            message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
            isResolved: false
        });

        if (!existingAlert) {
            const daysPastDue = Math.floor((now - event.date) / (1000 * 60 * 60 * 24));
            await Alert.create({
                animalId: event.animalId._id || event.animalId,
                type: 'vaccination',
                severity: daysPastDue > 30 ? 'high' : 'medium',
                message
            });
        }
    }
}

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

        // Parse questionsAnswers to find previously administered vaccines
        let administeredVaccineNames = [];
        try {
            const qa = typeof questionsAnswers === 'string' ? JSON.parse(questionsAnswers) : questionsAnswers;
            if (Array.isArray(qa)) {
                const hasVaccinations = qa.find(q => q.question && q.question.includes('vaccinations previously'));
                if (hasVaccinations && hasVaccinations.answer === 'yes') {
                    // Look for the administered vaccines list
                    const administeredQ = qa.find(q => q.question && q.question.includes('administered vaccines'));
                    if (administeredQ && administeredQ.answer) {
                        try {
                            administeredVaccineNames = typeof administeredQ.answer === 'string' 
                                ? JSON.parse(administeredQ.answer) 
                                : administeredQ.answer;
                        } catch (e) {
                            // If it's a comma-separated string
                            if (typeof administeredQ.answer === 'string') {
                                administeredVaccineNames = administeredQ.answer.split(',').map(v => v.trim()).filter(Boolean);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing questionsAnswers:', e);
        }

        // Generate vaccination events from static schedule data
        let vaccinationEvents = [];
        try {
            vaccinationEvents = await generateVaccinationEventsForAnimal(newAnimal, administeredVaccineNames);

            // Generate embedding if image exists
            if (imageUrl) {
                try {
                    const vector = await generateEmbedding(imageUrl);
                    await AnimalEmbedding.create({
                        animalId: newAnimal._id,
                        embedding: vector
                    });
                } catch (embError) {
                    console.error('Embedding generation failed:', embError);
                }
            }

            return res.status(201).json({ 
                animal: newAnimal,
                vaccinationEvents 
            });
        } catch (scheduleError) {
            console.error('Schedule Error:', scheduleError);
            // Return animal even if vaccination generation fails
            return res.status(201).json({ 
                animal: newAnimal,
                vaccinationEvents: [],
                warning: 'Animal created but vaccination schedule generation failed'
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getAnimals = async (req, res) => {
    try {
        const { farmId, farmerId } = req.query;
        let filter = {};

        if (farmId) {
            filter.farmId = farmId;
        }

        if (farmerId) {
            const farmer = await Farmer.findById(farmerId);
            if (!farmer) {
                return res.status(404).json({ message: 'Farmer not found' });
            }
            
            if (!farmer.farms || farmer.farms.length === 0) {
                 return res.status(200).json([]);
            }

            if (farmId) {
                const ownsFarm = farmer.farms.some(f => f.toString() === farmId);
                if (!ownsFarm) {
                    return res.status(403).json({ message: 'Access denied: You do not own this farm' });
                }
            } else {
                filter.farmId = { $in: farmer.farms };
            }
        }
        
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
        
        // Check for missed vaccinations and create alerts
        try {
            await checkMissedVaccinations(req.params.id);
        } catch (err) {
            console.error("Missed vaccination check failed:", err);
        }

        // Get vaccination events for this animal
        let vaccinationEvents = await VaccinationEvent.find({ animalId: req.params.id })
            .sort({ date: 1 });

        // If no events exist, try to generate them from schedule (backfill for existing animals)
        if (vaccinationEvents.length === 0 && animal.species) {
            try {
                vaccinationEvents = await generateVaccinationEventsForAnimal(animal);
            } catch (err) {
                console.error("Auto-generation of schedule failed:", err);
            }
        }
        
        res.status(200).json({ animal, vaccinationEvents });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/**
 * Regenerate vaccination events for an animal.
 * Deletes all existing non-administered events and recreates from schedule.
 * Keeps manually added / administered / blockchain-verified events.
 * POST /api/animals/:id/regenerate-vaccinations
 */
exports.regenerateVaccinationEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const animal = await Animal.findById(id);
        if (!animal) {
            return res.status(404).json({ message: 'Animal not found' });
        }

        // Delete only auto-generated events (scheduled/missed without blockchain or certificate)
        // Keep manually added (administered with certificate/blockchain) events
        await VaccinationEvent.deleteMany({
            animalId: id,
            eventType: { $in: ['scheduled', 'missed'] },
            certificateUrl: { $in: [null, undefined, ''] },
            'blockchain.txHash': { $in: [null, undefined, ''] }
        });

        // Also delete related unresolved vaccination alerts
        await Alert.deleteMany({
            animalId: id,
            type: 'vaccination',
            isResolved: false
        });

        // Regenerate from schedules
        const vaccinationEvents = await generateVaccinationEventsForAnimal(animal);

        res.status(200).json({ 
            message: `Regenerated vaccination schedule for ${animal.name}`,
            vaccinationEvents 
        });
    } catch (error) {
        console.error('Regenerate Vaccinations Error:', error);
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

exports.getDeadAnimals = async (req, res) => {
    try {
        const { farmId, farmerId } = req.query;
        let filter = {};
        if (farmId) filter.farmId = farmId;
        
        if (farmerId) {
            const farmer = await Farmer.findById(farmerId);
            // If farmer not found or has no farms, return empty or error
            if (!farmer) return res.status(404).json({ message: 'Farmer not found' });
            
            if (!farmId && farmer.farms && farmer.farms.length > 0) {
                filter.farmId = { $in: farmer.farms };
            } else if (!farmId) {
                // Farmer has no farms
                return res.status(200).json([]);
            }
        }

        const deadAnimals = await DeadAnimal.find(filter).sort({ deathDate: -1 }).populate('farmId', 'name location');
        res.status(200).json(deadAnimals);
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
        
        // Delete ALL associated records in parallel
        await Promise.all([
            VaccinationEvent.deleteMany({ animalId: id }),
            Alert.deleteMany({ animalId: id }),
            SensorEvent.deleteMany({ animalId: id }),
            IotSensorReading.deleteMany({ animalId: id }),
            HeartRateThreshold.deleteMany({ animalId: id }),
            HealthSnapshot.deleteMany({ animalId: id }),
            AnimalEmbedding.deleteMany({ animalId: id }),
            RFIDEvent.deleteMany({ animalId: id }),
        ]);
        
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
const Farm = require('../models/Farm');
const Farmer = require('../models/Farmer');
const cloudinary = require('../config/cloudinary');

/**
 * Try to parse a "lat, lng" string into { lat, lng }.
 * Returns null if not parseable.
 */
const parseCoordinates = (location) => {
    if (!location) return null;
    const parts = location.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
    }
    return null;
};

const getCloudinaryPublicId = (url) => {
    if (!url) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    return match ? match[1] : null;
};

exports.createFarm = async (req, res) => {
    try {
        const { name, location, farmerId, imageUrl: imageUrlFromBody } = req.body;
        let imageUrl = imageUrlFromBody || null;

        if (req.file) {
            const result = await cloudinary.uploader.upload_stream(
                { folder: 'farms' },
                (error, result) => {
                    if (error) throw error;
                    return result;
                }
            );

            const stream = require("stream");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'farms' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                bufferStream.pipe(uploadStream);
            });

            imageUrl = uploadResult.secure_url;
        }

        const coords = parseCoordinates(location);

        const newFarm = new Farm({
            name,
            location,
            imageUrl,
            ...(coords ? { coordinates: coords } : {})
        });

        await newFarm.save();

        if (farmerId) {
            await Farmer.findByIdAndUpdate(farmerId, { $push: { farms: newFarm._id } }, { new: true });
        }
        res.status(201).json(newFarm);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getFarms = async (req, res) => {
    try {
        const { farmerId } = req.query;
        let farms;
        if (farmerId) {
            const farmer = await Farmer.findById(farmerId).select('farms');

            if (!farmer) {
                return res.status(404).json({ message: 'Farmer not found' });
            }

            let farmIds = farmer.farms.map(id => id.toString());

            farms = await Farm.find({ _id: { $in: farmIds } }).sort({ createdAt: -1 });
        } else {
            farms = await Farm.find().sort({ createdAt: -1 });
        }

        return res.status(200).json(farms);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getFarmById = async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }
        res.status(200).json(farm);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateFarm = async (req, res) => {
    try {
        const { name, location, imageUrl: imageUrlFromBody } = req.body;
        const farm = await Farm.findById(req.params.id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        if (req.file) {
            if (farm.imageUrl) {
                const publicId = getCloudinaryPublicId(farm.imageUrl);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            const stream = require("stream");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'farms' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                bufferStream.pipe(uploadStream);
            });

            farm.imageUrl = uploadResult.secure_url;
        } else if (imageUrlFromBody) {
            farm.imageUrl = imageUrlFromBody;
        }

        farm.name = name || farm.name;
        if (location) {
            farm.location = location;
            const coords = parseCoordinates(location);
            if (coords) farm.coordinates = coords;
        }

        await farm.save();
        res.status(200).json(farm);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteFarm = async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        if (farm.imageUrl) {
            const publicId = getCloudinaryPublicId(farm.imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await farm.deleteOne();
        res.status(200).json({ message: 'Farm deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateHerdWatchRadius = async (req, res) => {
    try {
        const { herdWatchRadius } = req.body;

        if (herdWatchRadius == null || herdWatchRadius < 50 || herdWatchRadius > 10000) {
            return res.status(400).json({ message: 'herdWatchRadius must be between 50 and 10000 meters' });
        }

        const farm = await Farm.findById(req.params.id);
        if (!farm) {
            return res.status(404).json({ message: 'Farm not found' });
        }

        farm.herdWatchRadius = herdWatchRadius;
        await farm.save();

        res.status(200).json(farm);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
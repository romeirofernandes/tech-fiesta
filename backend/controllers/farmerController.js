const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');  

// Auth User (Login/Register)
exports.authFarmer = async (req, res) => {
  const { firebaseUid, fullName, email, phoneNumber } = req.body;

  if (!firebaseUid) {
    return res.status(400).json({ message: 'Firebase UID is required' });
  }

  try {
    let farmer = await Farmer.findOne({ firebaseUid }).populate('farms', 'name location');

    if (farmer) {
      // User exists, return user
      return res.status(200).json(farmer);
    }

    // User doesn't exist, create new
    if (!fullName) {
      return res.status(404).json({ message: 'User not found. Please register.' });
    }

    if (email) {
      const existingEmail = await Farmer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    if (phoneNumber) {
      const existingPhone = await Farmer.findOne({ phoneNumber });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
    }

    farmer = new Farmer({
      firebaseUid,
      fullName,
      email,
      phoneNumber
    });

    await farmer.save();
    res.status(201).json(farmer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update Farmer Profile
exports.updateFarmer = async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phoneNumber, farmId } = req.body;

  try {
    let farmer = await Farmer.findById(id);

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    if (fullName) farmer.fullName = fullName;
    if (email) {
      // Check if email is taken by another user
      const existingEmail = await Farmer.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      farmer.email = email;
    }
    if (phoneNumber) {
      // Check if phone is taken by another user
      const existingPhone = await Farmer.findOne({ phoneNumber });
      if (existingPhone && existingPhone._id.toString() !== id) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
      farmer.phoneNumber = phoneNumber;
    }
    if (farmId !== undefined) farmer.farmId = farmId;

    await farmer.save();
    await farmer.populate('farmId', 'name location');
    res.json(farmer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
const Farmer = require('../models/Farmer');

// Auth User (Login/Register)
exports.authFarmer = async (req, res) => {
  const { firebaseUid, fullName, email, phoneNumber } = req.body;

  if (!firebaseUid) {
    return res.status(400).json({ message: 'Firebase UID is required' });
  }

  try {
    let farmer = await Farmer.findOne({ firebaseUid });

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

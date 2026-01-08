const express = require('express');
const router = express.Router();
const multer = require('../config/multer');
const cloudinary = require('../config/cloudinary');

router.post('/upload', multer.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

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

    res.json({ url: uploadResult.secure_url });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

module.exports = router;
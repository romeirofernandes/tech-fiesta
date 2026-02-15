const { pipeline, RawImage } = require('@xenova/transformers');
const AnimalEmbedding = require('../models/AnimalEmbedding');
const Animal = require('../models/Animal');
const sharp = require('sharp');

// Singletons
let extractor = null;
let detector = null;

const getExtractor = async () => {
    if (!extractor) {
        extractor = await pipeline('image-feature-extraction', 'Xenova/vit-base-patch16-224-in21k', {
            quantized: true, 
        });
    }
    return extractor;
};

const getDetector = async () => {
    if (!detector) {
        // DETR (DEtection TRansformer) for object detection
        detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
            quantized: true,
        });
    }
    return detector;
};

/**
 * Converts a buffer to a RawImage compatible with transformers.js
 */
const bufferToRawImage = async (buffer) => {
    const { data, info } = await sharp(buffer)
        .removeAlpha()
        .resize({ width: 800, withoutEnlargement: true }) // meaningful size for detection
        .raw()
        .toBuffer({ resolveWithObject: true });
    
    return new RawImage(data, info.width, info.height, 3);
};

/**
 * Generates an embedding for an image buffer or URL.
 * @param {Buffer|string} imageInput - The image buffer or URL.
 * @returns {Promise<number[]>} - The vector embedding.
 */
const generateEmbedding = async (imageInput) => {
    const extractor = await getExtractor();
    
    // Check if input is buffer, if so convert to RawImage
    let input = imageInput;
    if (Buffer.isBuffer(imageInput)) {
        input = await bufferToRawImage(imageInput);
    }
    
    const output = await extractor(input);
    
    // Check if output is [1, seq_len, hidden_size] (e.g. [1, 197, 768])
    if (output.dims.length === 3 && output.dims[1] > 1) {
        const batchSize = output.dims[0];
        const seqLen = output.dims[1];
        const hiddenSize = output.dims[2];
        
        // We only handle batch size 1 for now
        const pooled = new Float32Array(hiddenSize);
        
        // Sum across sequence dimension
        for (let i = 0; i < seqLen; i++) {
            const offset = i * hiddenSize;
            for (let j = 0; j < hiddenSize; j++) {
                pooled[j] += output.data[offset + j];
            }
        }
        
        // Calculate mean and L2 norm
        let norm = 0;
        for (let j = 0; j < hiddenSize; j++) {
            pooled[j] /= seqLen; // Mean
            norm += pooled[j] * pooled[j];
        }
        
        // Normalize
        norm = Math.sqrt(norm);
        if (norm > 1e-12) { // Avoid divide by zero
            for (let j = 0; j < hiddenSize; j++) {
                pooled[j] /= norm;
            }
        }
        
        return Array.from(pooled);
    }
    
    // Fallback if dimensions are unexpected
    return Array.from(output.data);
};

/**
 * Detects animals in an image and returns their bounding boxes and cropped buffers.
 * FILTERED BY: typical livestock classes (cow, sheep, horse, zebra, elephant, bear, dog, cat, bird, etc. mapping might vary).
 * COCO classes relevant: 'cow', 'sheep', 'horse', 'dog', 'cat', 'elephant', 'bear', 'zebra', 'giraffe'.
 * "bird" is also relevant for chickens.
 * @param {Buffer} imageBuffer 
 */
const detectAndCropAnimals = async (imageBuffer) => {
    const detector = await getDetector();
    
    // Convert to RawImage manually to avoid "Unsupported input type"
    // We resize for detection speed, so we need to track the scale to crop correctly from original
    const { data, info } = await sharp(imageBuffer)
        .removeAlpha()
        .resize({ width: 800, withoutEnlargement: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
        
    const resizedRawImage = new RawImage(data, info.width, info.height, 3);
    
    const output = await detector(resizedRawImage, { threshold: 0.5 });
    
    // Filter for animal classes
    const animalLabels = ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];
    const animals = output.filter(obj => animalLabels.includes(obj.label));
    
    const crops = [];
    const originalMetadata = await sharp(imageBuffer).metadata();
    
    // Calculate scale factors (Original / Resized)
    const scaleX = originalMetadata.width / info.width;
    const scaleY = originalMetadata.height / info.height;

    for (const animal of animals) {
        const { xmax, xmin, ymax, ymin } = animal.box;
        
        // Scale boxes back to original image dimensions
        const box = {
            xmin: xmin * scaleX,
            xmax: xmax * scaleX,
            ymin: ymin * scaleY,
            ymax: ymax * scaleY
        };
        
        // Ensure boundaries are within image
        const left = Math.max(0, Math.floor(box.xmin));
        const top = Math.max(0, Math.floor(box.ymin));
        const w = Math.min(originalMetadata.width - left, Math.floor(box.xmax - box.xmin));
        const h = Math.min(originalMetadata.height - top, Math.floor(box.ymax - box.ymin));
        
        if (w > 10 && h > 10) { 
            try {
                const cropBuffer = await sharp(imageBuffer)
                    .extract({ left, top, width: w, height: h })
                    .toBuffer();
                    
                crops.push({
                    label: animal.label,
                    score: animal.score,
                    buffer: cropBuffer,
                    box: animal.box 
                });
            } catch (e) {
                console.error('Cropping error', e);
            }
        }
    }
    
    return crops;
};

/**
 * Calculates Cosine Similarity between two vectors
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} - Similarity score (-1 to 1)
 */
const cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
    generateEmbedding,
    detectAndCropAnimals,
    cosineSimilarity
};

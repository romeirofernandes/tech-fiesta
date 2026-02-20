/**
 * Herd Watch Data Seeder
 * Generates GPS path data for all animals whose farms already have coordinates in the DB.
 * Does NOT assign coordinates to farms — uses whatever is already stored.
 * One animal per farm is made to stray outside the boundary.
 * 
 * Usage: node scripts/seedHerdWatch.js
 *        node scripts/seedHerdWatch.js --clear (clears existing GPS path data first)
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const AnimalGpsPath = require('../models/AnimalGpsPath');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');

// Realistic farm center coordinates (spread across rural India)
// Only used as fallback if --assign-coords flag is passed
const FARM_COORDINATES = [
  { lat: 28.7041, lng: 77.1025 },  // Delhi region
  { lat: 26.9124, lng: 75.7873 },  // Jaipur region
  { lat: 23.2599, lng: 77.4126 },  // Bhopal region
  { lat: 19.0760, lng: 72.8777 },  // Mumbai region
  { lat: 12.9716, lng: 77.5946 },  // Bangalore region
  { lat: 22.5726, lng: 88.3639 },  // Kolkata region
  { lat: 17.3850, lng: 78.4867 },  // Hyderabad region
  { lat: 13.0827, lng: 80.2707 },  // Chennai region
  { lat: 25.3176, lng: 82.9739 },  // Varanasi region
  { lat: 30.7333, lng: 76.7794 },  // Chandigarh region
];

const DEFAULT_RADIUS = 300; // meters
const WAYPOINT_COUNT_MIN = 8;
const WAYPOINT_COUNT_MAX = 12;
const STRAY_DISTANCE_FACTOR = 1.4; // 1.4x the radius = ~420m for 300m radius
const TIME_SPAN_HOURS = 2; // paths span 2 hours from now

/**
 * Generate a random offset in lat/lng for a given distance in meters
 * ~111,320 meters per degree latitude
 * ~111,320 * cos(lat) meters per degree longitude
 */
function metersToLatLng(meters, centerLat) {
  const latDeg = meters / 111320;
  const lngDeg = meters / (111320 * Math.cos(centerLat * Math.PI / 180));
  return { latDeg, lngDeg };
}

/**
 * Generate a random point within a radius of the center
 */
function randomPointInRadius(centerLat, centerLng, radiusMeters) {
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * radiusMeters * 0.85; // stay well within
  const offset = metersToLatLng(dist, centerLat);
  return {
    lat: centerLat + offset.latDeg * Math.sin(angle),
    lng: centerLng + offset.lngDeg * Math.cos(angle)
  };
}

/**
 * Generate a random walk path (smooth) within a farm's radius
 */
function generatePathInsideFarm(centerLat, centerLng, radiusMeters, waypointCount, startTime, endTime) {
  const waypoints = [];
  const timeStep = (endTime - startTime) / (waypointCount - 1);
  
  // Start from a random point inside the farm
  let current = randomPointInRadius(centerLat, centerLng, radiusMeters * 0.6);
  
  for (let i = 0; i < waypointCount; i++) {
    // Small random walk step (10-40 meters)
    const stepDist = 10 + Math.random() * 30;
    const stepAngle = Math.random() * 2 * Math.PI;
    const offset = metersToLatLng(stepDist, centerLat);
    
    const nextLat = current.lat + offset.latDeg * Math.sin(stepAngle);
    const nextLng = current.lng + offset.lngDeg * Math.cos(stepAngle);
    
    // Check if still inside radius; if not, pull back toward center
    const distFromCenter = Math.sqrt(
      Math.pow((nextLat - centerLat) * 111320, 2) +
      Math.pow((nextLng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180), 2)
    );
    
    if (distFromCenter < radiusMeters * 0.85) {
      current = { lat: nextLat, lng: nextLng };
    } else {
      // Pull back toward center
      const pullFactor = 0.3;
      current = {
        lat: current.lat + (centerLat - current.lat) * pullFactor,
        lng: current.lng + (centerLng - current.lng) * pullFactor
      };
    }

    waypoints.push({
      lat: parseFloat(current.lat.toFixed(6)),
      lng: parseFloat(current.lng.toFixed(6)),
      timestamp: new Date(startTime + i * timeStep)
    });
  }
  
  return waypoints;
}

/**
 * Generate a path that starts inside the farm but strays outside
 */
function generateStrayingPath(centerLat, centerLng, radiusMeters, waypointCount, startTime, endTime) {
  const waypoints = [];
  const timeStep = (endTime - startTime) / (waypointCount - 1);
  
  // Start inside the farm
  let current = randomPointInRadius(centerLat, centerLng, radiusMeters * 0.4);
  
  // First 60% of waypoints stay inside
  const insideCount = Math.floor(waypointCount * 0.6);
  
  for (let i = 0; i < waypointCount; i++) {
    if (i < insideCount) {
      // Normal walk inside
      const stepDist = 10 + Math.random() * 25;
      const stepAngle = Math.random() * 2 * Math.PI;
      const offset = metersToLatLng(stepDist, centerLat);
      current = {
        lat: current.lat + offset.latDeg * Math.sin(stepAngle),
        lng: current.lng + offset.lngDeg * Math.cos(stepAngle)
      };
    } else {
      // Walk outward — consistently move away from center
      const awayAngle = Math.atan2(current.lat - centerLat, current.lng - centerLng);
      const stepDist = 30 + Math.random() * 40; // bigger steps outward
      const offset = metersToLatLng(stepDist, centerLat);
      current = {
        lat: current.lat + offset.latDeg * Math.sin(awayAngle + (Math.random() - 0.5) * 0.3),
        lng: current.lng + offset.lngDeg * Math.cos(awayAngle + (Math.random() - 0.5) * 0.3)
      };
    }

    waypoints.push({
      lat: parseFloat(current.lat.toFixed(6)),
      lng: parseFloat(current.lng.toFixed(6)),
      timestamp: new Date(startTime + i * timeStep)
    });
  }
  
  // Ensure the last waypoint is definitely outside the radius
  const lastWp = waypoints[waypoints.length - 1];
  const distFromCenter = Math.sqrt(
    Math.pow((lastWp.lat - centerLat) * 111320, 2) +
    Math.pow((lastWp.lng - centerLng) * 111320 * Math.cos(centerLat * Math.PI / 180), 2)
  );
  
  if (distFromCenter <= radiusMeters) {
    // Force it outside
    const angle = Math.atan2(lastWp.lat - centerLat, lastWp.lng - centerLng);
    const targetDist = radiusMeters * STRAY_DISTANCE_FACTOR;
    const offset = metersToLatLng(targetDist, centerLat);
    waypoints[waypoints.length - 1] = {
      lat: parseFloat((centerLat + offset.latDeg * Math.sin(angle)).toFixed(6)),
      lng: parseFloat((centerLng + offset.lngDeg * Math.cos(angle)).toFixed(6)),
      timestamp: waypoints[waypoints.length - 1].timestamp
    };
  }
  
  return waypoints;
}

async function seed() {
  const clearMode = process.argv.includes('--clear');
  const assignCoords = process.argv.includes('--assign-coords');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (clearMode) {
      await AnimalGpsPath.deleteMany({});
      console.log('Cleared existing GPS path data');
    }

    // Get all farms
    const farms = await Farm.find();
    if (farms.length === 0) {
      console.log('No farms found. Please create farms first.');
      process.exit(0);
    }

    console.log(`Found ${farms.length} farm(s)`);

    let totalPaths = 0;
    let strayingCount = 0;
    let skippedFarms = 0;

    for (let i = 0; i < farms.length; i++) {
      const farm = farms[i];
      
      // Only assign coordinates if --assign-coords flag is passed AND farm has none
      if (!farm.coordinates || farm.coordinates.lat == null) {
        if (assignCoords) {
          const coordSet = FARM_COORDINATES[i % FARM_COORDINATES.length];
          farm.coordinates = coordSet;
          if (!farm.herdWatchRadius) farm.herdWatchRadius = DEFAULT_RADIUS;
          await farm.save();
          console.log(`  Assigned coordinates to "${farm.name}": ${coordSet.lat}, ${coordSet.lng}`);
        } else {
          console.log(`  ⏭️  Skipping "${farm.name}" — no coordinates in DB (use --assign-coords to set)`);
          skippedFarms++;
          continue;
        }
      }

      const centerLat = farm.coordinates.lat;
      const centerLng = farm.coordinates.lng;
      const radius = farm.herdWatchRadius || DEFAULT_RADIUS;

      console.log(`  📍 Farm "${farm.name}" at (${centerLat}, ${centerLng}), radius=${radius}m`);

      // Get animals for this farm
      const animals = await Animal.find({ farmId: farm._id }).sort({ name: 1 });
      if (animals.length === 0) {
        console.log(`  No animals in farm "${farm.name}", skipping`);
        continue;
      }

      console.log(`  Farm "${farm.name}": ${animals.length} animal(s), radius=${radius}m`);

      const now = Date.now();
      const startTime = now - TIME_SPAN_HOURS * 60 * 60 * 1000;

      for (let j = 0; j < animals.length; j++) {
        const animal = animals[j];
        const waypointCount = WAYPOINT_COUNT_MIN + Math.floor(Math.random() * (WAYPOINT_COUNT_MAX - WAYPOINT_COUNT_MIN + 1));
        
        let waypoints;
        let isStraying = false;

        // First animal (alphabetically) in each farm strays
        if (j === 0) {
          waypoints = generateStrayingPath(centerLat, centerLng, radius, waypointCount, startTime, now);
          isStraying = true;
          strayingCount++;
          console.log(`    🚨 ${animal.name} (${animal.rfid}) — STRAYING path with ${waypointCount} waypoints`);
        } else {
          waypoints = generatePathInsideFarm(centerLat, centerLng, radius, waypointCount, startTime, now);
          console.log(`    ✅ ${animal.name} (${animal.rfid}) — normal path with ${waypointCount} waypoints`);
        }

        // Upsert: replace if path already exists for this animal+farm
        await AnimalGpsPath.findOneAndUpdate(
          { animalId: animal._id, farmId: farm._id },
          {
            animalId: animal._id,
            farmId: farm._id,
            waypoints,
            isStraying,
            movementStartTime: waypoints[0].timestamp,
            movementEndTime: waypoints[waypoints.length - 1].timestamp
          },
          { upsert: true, new: true }
        );

        totalPaths++;
      }
    }

    console.log(`\nDone! Created ${totalPaths} GPS paths (${strayingCount} straying). Skipped ${skippedFarms} farm(s) without coordinates.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

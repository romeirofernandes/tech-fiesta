const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const VaccinationSchedule = require('../models/VaccinationSchedule');

const schedules = [
    // ===== SHEEP & GOAT =====
    {
        species: ['sheep', 'goat'],
        category: 'SHEEP & GOAT',
        disease: 'Peste-des-Petitis Ruminants (PPR)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3 months of age',
        boosterSchedule: 'Booster: Not required. Repeat: After 3 years',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['sheep', 'goat'],
        category: 'SHEEP & GOAT',
        disease: 'Foot & Mouth Disease (FMD)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3 months of age',
        boosterSchedule: 'Booster: 3-4 weeks after 1st. Repeat: Every 6/12 month interval',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT ONLY',
        disease: 'Goat Pox (GP)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3-5 months of age',
        boosterSchedule: 'Booster: 3-4 weeks after 1st. Repeat: Annually',
        doseAndRoute: '—',
        notes: 'Only for goats',
        genderSpecific: 'all'
    },
    {
        species: ['sheep'],
        category: 'SHEEP ONLY',
        disease: 'Sheep Pox (SP)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3-5 months of age',
        boosterSchedule: 'Booster: 3-4 weeks after 1st. Repeat: Annually',
        doseAndRoute: '—',
        notes: 'Only for sheep',
        genderSpecific: 'all'
    },
    {
        species: ['sheep', 'goat'],
        category: 'SHEEP & GOAT',
        disease: 'Enterotoxaemia (ET)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3-5 months of age',
        boosterSchedule: 'Booster: 3-4 weeks after 1st. Repeat: Annually',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['sheep', 'goat'],
        category: 'SHEEP & GOAT',
        disease: 'Haemorrhagic Septicaemia (HS)',
        vaccineName: '—',
        primaryVaccinationAge: 'At 3-5 months of age',
        boosterSchedule: 'Booster: 3-4 weeks after 1st. Repeat: Annually',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },

    // ===== GOAT (Specific) =====
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'Anthrax',
        vaccineName: '—',
        primaryVaccinationAge: '6 months (Kid/Lamb)',
        boosterSchedule: 'Repeat: Annually (In affected areas only)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'Haemorrhagic Septicaemia (HS)',
        vaccineName: '—',
        primaryVaccinationAge: '6 months (Kid/Lamb)',
        boosterSchedule: 'Repeat: Annually (Before monsoon)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'Enterotoxaemia (ET)',
        vaccineName: '—',
        primaryVaccinationAge: '4 months (if dam vaccinated) OR 1st week (if dam not vaccinated)',
        boosterSchedule: 'Booster: 15 days after 1st. Repeat: Annually (Before monsoon/May)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'Black Quarter (B.Q)',
        vaccineName: '—',
        primaryVaccinationAge: '6 months (Kid/Lamb)',
        boosterSchedule: 'Repeat: Annually (Before monsoon)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'PPR',
        vaccineName: '—',
        primaryVaccinationAge: '3 months & above',
        boosterSchedule: 'Repeat: Once in 3 years',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'FMD',
        vaccineName: '—',
        primaryVaccinationAge: '4 months & above',
        boosterSchedule: 'Repeat: Twice a year (Sept & March)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'Goat Pox',
        vaccineName: '—',
        primaryVaccinationAge: '3 months & above',
        boosterSchedule: 'Repeat: Annually (December)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['goat'],
        category: 'GOAT (Specific)',
        disease: 'C.C.P.P',
        vaccineName: '—',
        primaryVaccinationAge: '3 months & above',
        boosterSchedule: 'Repeat: Annually (January)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },

    // ===== PIGS =====
    {
        species: ['pig'],
        category: 'PIGS',
        disease: 'Swine Fever',
        vaccineName: 'F.D. Lapinized Swine Fever vaccine',
        primaryVaccinationAge: '25-30 days',
        boosterSchedule: 'Booster: 1 month after. Subsequent: 6 months interval',
        doseAndRoute: '—',
        notes: 'Source: Inst. of Vet Biologicals',
        genderSpecific: 'all'
    },
    {
        species: ['pig'],
        category: 'PIGS',
        disease: 'Foot & Mouth Disease',
        vaccineName: 'Cell culture (Raksha-Ovac or Clovex)',
        primaryVaccinationAge: '42 days',
        boosterSchedule: 'Booster: 1 month after. Subsequent: 6 months interval',
        doseAndRoute: '—',
        notes: 'Source: Indian Immunologicals / MSD',
        genderSpecific: 'all'
    },
    {
        species: ['pig'],
        category: 'PIGS',
        disease: 'Haemorrhagic Septicaemia',
        vaccineName: 'Raksha-H.S. vaccine',
        primaryVaccinationAge: '2 months',
        boosterSchedule: 'Booster: 1 month after. Subsequent: Annually',
        doseAndRoute: '—',
        notes: 'Source: Inst. of Vet Biologicals',
        genderSpecific: 'all'
    },

    // ===== CATTLE & BUFFALO =====
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Foot & Mouth Disease (FMD)',
        vaccineName: 'Raksha-Ovac / Bovilis Clovax',
        primaryVaccinationAge: '4 months & above (or 3 months onwards)',
        boosterSchedule: 'Booster: 1 month after 1st. Subsequent: Six monthly',
        doseAndRoute: '2ml or 3ml (Deep I/M or S/C)',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Haemorrhagic Septicaemia (HS)',
        vaccineName: 'Raksha-H.S.',
        primaryVaccinationAge: '6 months & above',
        boosterSchedule: 'Repeat: Annually (in endemic areas)',
        doseAndRoute: '2ml S/C',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Black Quarter (BQ)',
        vaccineName: '—',
        primaryVaccinationAge: '6 months & above',
        boosterSchedule: 'Repeat: Annually (in endemic areas)',
        doseAndRoute: '—',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Brucellosis',
        vaccineName: 'Bruvax (Live B. abortus S19)',
        primaryVaccinationAge: '4-8 months',
        boosterSchedule: 'Repeat: Once in a lifetime',
        doseAndRoute: '2ml S/C',
        notes: 'Only serologically negative female calves',
        genderSpecific: 'female'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Theileriosis',
        vaccineName: '—',
        primaryVaccinationAge: '3 months & above',
        boosterSchedule: 'Repeat: Once in a lifetime',
        doseAndRoute: '—',
        notes: 'Only for crossbred/exotic cattle',
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Anthrax',
        vaccineName: 'Raksha-Anthrax',
        primaryVaccinationAge: '4 months & above',
        boosterSchedule: 'Repeat: Annually (in endemic areas)',
        doseAndRoute: '1ml I/M or S/C',
        notes: 'Prophylactic only',
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'IBR',
        vaccineName: '—',
        primaryVaccinationAge: '3 months & above',
        boosterSchedule: 'Booster: 1 month after 1st. Repeat: Six monthly',
        doseAndRoute: '—',
        notes: 'Vaccine not presently produced in India',
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Rabies',
        vaccineName: 'Raksharab',
        primaryVaccinationAge: '3 months & above (Prophylactic)',
        boosterSchedule: 'Post-Bite: Days 0, 3, 7, 14, 28, 90',
        doseAndRoute: '1ml S/C or I/M',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Combined FMD+HS',
        vaccineName: 'Raksha biovac',
        primaryVaccinationAge: '4 months',
        boosterSchedule: '—',
        doseAndRoute: '3ml Deep I/M',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Combined FMD+HS+BQ',
        vaccineName: 'Raksha triovac',
        primaryVaccinationAge: '4 months',
        boosterSchedule: '—',
        doseAndRoute: '3ml Deep I/M',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['cow', 'buffalo'],
        category: 'CATTLE & BUFFALO',
        disease: 'Combined HS+BQ',
        vaccineName: 'Raksha HS+BQ',
        primaryVaccinationAge: '6 months & above',
        boosterSchedule: 'Repeat: Annually',
        doseAndRoute: '2ml S/C',
        notes: null,
        genderSpecific: 'all'
    },

    // ===== POULTRY (Layers — desi chicken) =====
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: "Marek's Disease",
        vaccineName: 'HVT',
        primaryVaccinationAge: '0 day',
        boosterSchedule: '—',
        doseAndRoute: '0.2 ml S/C',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'Ranikhet Disease (1st)',
        vaccineName: 'Strain F1',
        primaryVaccinationAge: '5-7 days',
        boosterSchedule: '—',
        doseAndRoute: 'Ocular/Nasal',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'IBD (Gumboro)',
        vaccineName: '—',
        primaryVaccinationAge: '12-14 days',
        boosterSchedule: '—',
        doseAndRoute: 'Ocular/Nasal or water',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'Infectious Bronchitis',
        vaccineName: '—',
        primaryVaccinationAge: '18-22 days',
        boosterSchedule: 'Booster: 24-27 days (Water). Booster: 12-13th week (Water)',
        doseAndRoute: 'Ocular/Nasal or water',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'Ranikhet Disease (2nd)',
        vaccineName: 'La Sota',
        primaryVaccinationAge: '28-30 days',
        boosterSchedule: 'Repeat: 45-50th week (every 2 months)',
        doseAndRoute: 'Water',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'Fowl Pox',
        vaccineName: '—',
        primaryVaccinationAge: '6th week',
        boosterSchedule: 'Booster: 9th week (Wing web)',
        doseAndRoute: 'S/C',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['chicken'],
        category: 'POULTRY (Layers)',
        disease: 'Ranikhet Disease (3rd)',
        vaccineName: 'R2B / RB',
        primaryVaccinationAge: '8th week',
        boosterSchedule: 'Booster: 18th week',
        doseAndRoute: 'S/C or I/M',
        notes: null,
        genderSpecific: 'all'
    },

    // ===== EQUINE (Horses) =====
    {
        species: ['horse'],
        category: 'EQUINE (Horses)',
        disease: 'Equine Influenza',
        vaccineName: 'Calvenze-03 (Boehringer)',
        primaryVaccinationAge: '—',
        boosterSchedule: 'Twice a year (4 weeks interval), afterwards Yearly',
        doseAndRoute: '2 ml I/M',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['horse'],
        category: 'EQUINE (Horses)',
        disease: 'Equine Herpes',
        vaccineName: 'Pneumabort-K + 1B / Equiherpabort',
        primaryVaccinationAge: '—',
        boosterSchedule: 'During 5th, 7th & 9th month of pregnancy',
        doseAndRoute: '2 ml I/M',
        notes: 'Pregnancy-related vaccination',
        genderSpecific: 'female'
    },
    {
        species: ['horse'],
        category: 'EQUINE (Horses)',
        disease: 'Tetanus',
        vaccineName: 'Tetanus Toxoid AT Serum',
        primaryVaccinationAge: '—',
        boosterSchedule: 'Twice a year (4-8 weeks interval), afterwards Yearly',
        doseAndRoute: '1 ml I/M',
        notes: null,
        genderSpecific: 'all'
    },
    {
        species: ['horse'],
        category: 'EQUINE (Horses)',
        disease: 'Rabies',
        vaccineName: 'Rabies vaccine',
        primaryVaccinationAge: '3-4 months',
        boosterSchedule: 'Repeat: Yearly. Pregnant: Before parturition. Newborn: At 6 months then yearly',
        doseAndRoute: 'I/M',
        notes: null,
        genderSpecific: 'all'
    },
];

async function seedVaccinationSchedules() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Clear existing schedules
        await VaccinationSchedule.deleteMany({});
        console.log('Cleared existing vaccination schedules');

        // Insert all schedules
        const result = await VaccinationSchedule.insertMany(schedules);
        console.log(`Successfully seeded ${result.length} vaccination schedules`);

        // Print summary
        const categories = [...new Set(result.map(s => s.category))];
        categories.forEach(cat => {
            const count = result.filter(s => s.category === cat).length;
            console.log(`  ${cat}: ${count} entries`);
        });

        const femaleOnly = result.filter(s => s.genderSpecific === 'female');
        if (femaleOnly.length > 0) {
            console.log(`\nFemale-specific vaccinations:`);
            femaleOnly.forEach(s => console.log(`  - ${s.disease} (${s.category})`));
        }

        await mongoose.disconnect();
        console.log('\nDone. Database disconnected.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedVaccinationSchedules();

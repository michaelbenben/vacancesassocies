import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize data file if it doesn't exist
function initDataFile() {
    if (!existsSync(DATA_FILE)) {
        const initialData = {
            partners: [
                { id: 1, name: 'Nina Lucas', workDays: { 1: true, 2: true, 3: true, 4: true, 5: true }, allocations: { vacation: 25, trainingGive: 0, trainingReceive: 0 }, vacations: [] },
                { id: 2, name: 'Claire Deroy', workDays: { 1: true, 2: true, 3: true, 4: true, 5: true }, allocations: { vacation: 25, trainingGive: 0, trainingReceive: 0 }, vacations: [] },
                { id: 3, name: 'Michael Bennaim', workDays: { 1: true, 2: true, 3: true, 4: true, 5: true }, allocations: { vacation: 25, trainingGive: 0, trainingReceive: 0 }, vacations: [] },
                { id: 4, name: 'Emilie Fauchon', workDays: { 1: true, 2: true, 3: true, 4: true, 5: true }, allocations: { vacation: 25, trainingGive: 0, trainingReceive: 0 }, vacations: [] },
                { id: 5, name: 'Pauline Denoeux', workDays: { 1: true, 2: true, 3: true, 4: true, 5: true }, allocations: { vacation: 25, trainingGive: 0, trainingReceive: 0 }, vacations: [] },
            ],
            settings: {
                countHolidaysAsLeave: false
            },
            year: 2026
        };
        writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ Created initial data.json');
    }
}

// Helper functions
function readData() {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// GET all data
app.get('/api/data', (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// PUT update all data
app.put('/api/data', (req, res) => {
    try {
        writeData(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to write data' });
    }
});

// PATCH update partner
app.patch('/api/partners/:id', (req, res) => {
    try {
        const data = readData();
        const partnerId = parseInt(req.params.id);
        const partnerIndex = data.partners.findIndex(p => p.id === partnerId);

        if (partnerIndex === -1) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        data.partners[partnerIndex] = { ...data.partners[partnerIndex], ...req.body };
        writeData(data);
        res.json(data.partners[partnerIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

// PATCH update settings
app.patch('/api/settings', (req, res) => {
    try {
        const data = readData();
        data.settings = { ...data.settings, ...req.body };
        writeData(data);
        res.json(data.settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// PATCH update year
app.patch('/api/year', (req, res) => {
    try {
        const data = readData();
        data.year = req.body.year;
        writeData(data);
        res.json({ year: data.year });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update year' });
    }
});

// Start server
initDataFile();
app.listen(PORT, () => {
    console.log(`🚀 Vacation API server running at http://localhost:${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE}`);
});

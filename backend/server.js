require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const alertRoutes = require('./routes/alertRoutes');
const animalRoutes = require('./routes/animalRoutes');
const farmRoutes = require('./routes/farmRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const sensorEventRoutes = require('./routes/sensorEventRoutes');
const vaccinationEventRoutes = require('./routes/vaccinationEventRoutes');
const HealthSnapshotRoutes = require('./routes/healthSnapshotRoutes');
const farmImageRoutes = require('./routes/farmImageRoutes');
const productionRoutes = require('./routes/productionRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const marketPriceRoutes = require('./routes/marketPriceRoutes');
const biRoutes = require('./routes/biRoutes');    
const heartRateThresholdRoutes = require('./routes/heartRateThresholdRoutes');

const app = express();

app.use(cors(
    {
        origin: ['http://localhost:5173'],
    }
));
app.use(express.json());

connectDB();

app.use('/api/farmers', farmerRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sensor-events', sensorEventRoutes);
app.use('/api/vaccination-events', vaccinationEventRoutes); 
app.use('/api/health-snapshots', HealthSnapshotRoutes);
app.use('/api/farm-images', farmImageRoutes);
app.use('/api/production-records', productionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/market-prices', marketPriceRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/heart-rate-thresholds', heartRateThresholdRoutes);

const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Backend is up and running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
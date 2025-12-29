require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');

const app = express();

app.use(cors(
    {
        origin: ['http://localhost:5173'],
    }
));
app.use(express.json());

connectDB();

app.use('/api/farmers', require('./routes/farmerRoutes'));

const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Backend is up and running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
import express from 'express';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Support for __dirname with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration
const dbConfig = {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
    },
};

// Serve the dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get latest readings for a house
app.get('/api/latest/:house', async (req, res) => {
    const { house } = req.params;
    
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        
        const result = await request.query(`
            SELECT SensorType, SensorValue, ReadingTime
            FROM SensorReadings
            WHERE HouseID = @house
            AND ReadingTime = (
                SELECT MAX(ReadingTime) 
                FROM SensorReadings 
                WHERE HouseID = @house
            )
            ORDER BY SensorType
        `, { house });
        
        const readings = {};
        result.recordset.forEach(row => {
            readings[row.SensorType] = row.SensorValue;
        });
        
        res.json(readings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        sql.close();
    }
});

// API endpoint to get historical data for a sensor
app.get('/api/history/:house/:sensor/:days', async (req, res) => {
    const { house, sensor, days } = req.params;
    
    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        
        const result = await request.query(`
            SELECT SensorValue as value, ReadingTime as timestamp
            FROM SensorReadings
            WHERE HouseID = @house
            AND SensorType = @sensor
            AND ReadingTime >= DATEADD(day, -@days, GETDATE())
            ORDER BY ReadingTime
        `, { house, sensor, days: parseInt(days) });
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        sql.close();
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
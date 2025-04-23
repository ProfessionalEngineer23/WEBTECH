import express from 'express';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

const dbConfig = {
  server: 'webtech25.database.windows.net', // Azure SQL Server name
  database: 'Project',
  user: 'Dovydas232',
  password: 'Webtech25',
  options: {
    encrypt: true, // Required for Azure
    trustServerCertificate: false
  }
};

// Serve static files (your HTML, CSS, JS)
app.use(express.static('public'));

app.get('/test-connection', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT 1 as test');
    res.send('Database connection successful!');
    pool.close();
  } catch (err) {
    res.status(500).send('Connection failed: ' + err.message);
  }
});

app.get('/view-data', async (req, res) => {
  const pool = await sql.connect(dbConfig);
  const buildings = await pool.request().query('SELECT * FROM BUILDING');
  const sensors = await pool.request().query('SELECT * FROM SENSOR');
  const readings = await pool.request().query('SELECT TOP 10 * FROM SENSOR_READING ORDER BY Reading_Date_Time DESC');
  const user = await pool.request().query('Select * From User_Data');
  const reportpreference = await pool.request().query('Select * From Report_Preference');
  res.json({
    buildings: buildings.recordset,
    sensors: sensors.recordset,
    recentReadings: readings.recordset,
    user: user.recordset,
    reportpreference: reportpreference.recordset
  });
});

app.get('/api/full-database', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const buildings = await pool.request().query('SELECT * FROM BUILDING');
    const sensors = await pool.request().query('SELECT * FROM SENSOR');
    const readings = await pool.request().query(`
      SELECT TOP 50 * FROM SENSOR_READING 
      ORDER BY Reading_Date_Time DESC
    `);
    const preferences = await pool.request().query('SELECT * FROM Report_Preference');
    
    res.json({
      buildings: buildings.recordset,
      sensors: sensors.recordset,
      recentReadings: readings.recordset,
      reportpreference: preferences.recordset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
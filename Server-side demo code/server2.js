// server.js
import express from 'express';
import sql from 'mssql';
import path from "path" //A Node.js utility for working with file and directory paths.
import { fileURLToPath } from "url" //converts url string to file path

const app = express();
const PORT = process.env.PORT || 3000;

// Support for __dirname with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration using environment variables
// tells mssql module how to connect to database
const dbConfig = {
    server: process.env.AZURE_SQL_SERVER, // Your Azure SQL server name
    database: process.env.AZURE_SQL_DATABASE, // Your database name
    user: process.env.AZURE_SQL_USER, // Your username
    password: process.env.AZURE_SQL_PASSWORD, // Your password
    options: {
      encrypt: true, // Required for Azure SQL
      trustServerCertificate: false, // Don't trust self-signed certificates
    },
}

import path from 'path';
import { fileURLToPath } from 'url';

app.get('/', async (req, res) => {
    const buildingId = req.query.building || 1;
    let sensors = [];
    let chartConfig = {};
    let currentBuilding = '';
  
    try {
      await sql.connect(dbConfig);
  
      const buildingResult = await sql.query`SELECT BuildingName FROM Buildings WHERE BuildingID = ${buildingId}`;
      currentBuilding = buildingResult.recordset[0]?.BuildingName || 'Unknown';
  
      const result = await sql.query`
        SELECT s.SensorID, st.TypeName, st.Unit,
               (SELECT TOP 1 ReadingValue FROM SensorReadings WHERE SensorID = s.SensorID ORDER BY ReadingTime DESC) AS value,
               (SELECT TOP 1 ReadingTime FROM SensorReadings WHERE SensorID = s.SensorID ORDER BY ReadingTime DESC) AS timestamp
        FROM Sensors s
        JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID
        WHERE s.BuildingID = ${buildingId}
      `;
  
      sensors = result.recordset.map(row => ({
        id: row.SensorID,
        type: row.TypeName,
        value: row.value,
        unit: row.Unit,
        timestamp: row.timestamp
      }));
  
      chartConfig = {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu'],
          datasets: [{
            label: 'Temperature',
            data: [22, 23, 21, 24],
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1
          }]
        },
        options: { responsive: true }
      };
  
      res.render('dashboard', { currentBuilding, sensors, chartConfig });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading dashboard');
    } finally {
      sql.close();
    }
});  

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
  })
  
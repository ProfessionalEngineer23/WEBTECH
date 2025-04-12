// server.js
import express from 'express';
import sql from 'mssql';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS to allow your partner's frontend to access your API
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'your-azure-server.database.windows.net',
  database: process.env.DB_NAME || 'SmartBuildingMonitoring',
  user: process.env.DB_USER || 'yourusername',
  password: process.env.DB_PASSWORD || 'yourpassword',
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false
  }
};

// API endpoint: Get all buildings
app.get('/api/buildings', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT * FROM Buildings
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get sensors for a specific building
app.get('/api/buildings/:buildingId/sensors', async (req, res) => {
  const { buildingId } = req.params;
  
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT s.*, st.TypeName, st.Unit
      FROM Sensors s
      JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID
      WHERE s.BuildingID = ${buildingId}
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get sensor readings for a specific sensor (with optional date range)
app.get('/api/sensors/:sensorId/readings', async (req, res) => {
  const { sensorId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    await sql.connect(dbConfig);
    
    let query = `
      SELECT sr.*, s.SensorName, st.TypeName, st.Unit
      FROM SensorReadings sr
      JOIN Sensors s ON sr.SensorID = s.SensorID
      JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID
      WHERE sr.SensorID = @sensorId
    `;
    
    if (startDate && endDate) {
      query += `
        AND sr.ReadingTime BETWEEN @startDate AND @endDate
      `;
    }
    
    query += ` ORDER BY sr.ReadingTime`;
    
    const request = new sql.Request();
    request.input('sensorId', sql.Int, parseInt(sensorId));
    
    if (startDate && endDate) {
      request.input('startDate', sql.DateTime, new Date(startDate));
      request.input('endDate', sql.DateTime, new Date(endDate));
    }
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sensor readings' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get latest readings for all sensors in a building
app.get('/api/buildings/:buildingId/latest-readings', async (req, res) => {
  const { buildingId } = req.params;
  
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT s.SensorID, s.SensorName, st.TypeName, st.Unit, s.Location,
             (SELECT TOP 1 ReadingValue 
              FROM SensorReadings sr 
              WHERE sr.SensorID = s.SensorID 
              ORDER BY ReadingTime DESC) AS LatestReading,
             (SELECT TOP 1 ReadingTime 
              FROM SensorReadings sr 
              WHERE sr.SensorID = s.SensorID 
              ORDER BY ReadingTime DESC) AS ReadingTime
      FROM Sensors s
      JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID
      WHERE s.BuildingID = ${buildingId}
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest readings' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get comparison data for two sensors
app.get('/api/compare-sensors', async (req, res) => {
  const { sensor1Id, sensor2Id, startDate, endDate } = req.query;
  
  if (!sensor1Id || !sensor2Id) {
    return res.status(400).json({ error: 'Both sensor IDs are required' });
  }
  
  try {
    await sql.connect(dbConfig);
    
    const request = new sql.Request();
    
    let timeFilter = '';
    if (startDate && endDate) {
      timeFilter = ` AND sr.ReadingTime BETWEEN @startDate AND @endDate`;
      request.input('startDate', sql.DateTime, new Date(startDate));
      request.input('endDate', sql.DateTime, new Date(endDate));
    }
    
    request.input('sensor1Id', sql.Int, parseInt(sensor1Id));
    request.input('sensor2Id', sql.Int, parseInt(sensor2Id));
    
    const query = `
      SELECT 
        sr.ReadingTime,
        (SELECT s.SensorName FROM Sensors s WHERE s.SensorID = @sensor1Id) AS Sensor1Name,
        (SELECT st.TypeName FROM Sensors s JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID WHERE s.SensorID = @sensor1Id) AS Sensor1Type,
        (SELECT st.Unit FROM Sensors s JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID WHERE s.SensorID = @sensor1Id) AS Sensor1Unit,
        (SELECT s.SensorName FROM Sensors s WHERE s.SensorID = @sensor2Id) AS Sensor2Name,
        (SELECT st.TypeName FROM Sensors s JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID WHERE s.SensorID = @sensor2Id) AS Sensor2Type,
        (SELECT st.Unit FROM Sensors s JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID WHERE s.SensorID = @sensor2Id) AS Sensor2Unit,
        (SELECT ReadingValue FROM SensorReadings WHERE SensorID = @sensor1Id AND ReadingTime = sr.ReadingTime) AS Sensor1Value,
        (SELECT ReadingValue FROM SensorReadings WHERE SensorID = @sensor2Id AND ReadingTime = sr.ReadingTime) AS Sensor2Value
      FROM 
        SensorReadings sr
      WHERE 
        sr.SensorID IN (@sensor1Id, @sensor2Id)
        ${timeFilter}
      GROUP BY 
        sr.ReadingTime
      HAVING 
        COUNT(DISTINCT sr.SensorID) = 2
      ORDER BY 
        sr.ReadingTime
    `;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get reports for a building
app.get('/api/buildings/:buildingId/reports', async (req, res) => {
  const { buildingId } = req.params;
  const { limit } = req.query;
  
  try {
    await sql.connect(dbConfig);
    
    const request = new sql.Request();
    request.input('buildingId', sql.Int, parseInt(buildingId));
    
    let limitClause = '';
    if (limit) {
      limitClause = ` TOP ${parseInt(limit)}`;
      request.input('limit', sql.Int, parseInt(limit));
    }
    
    const query = `
      SELECT${limitClause} r.*, b.BuildingName
      FROM Reports r
      JOIN Buildings b ON r.BuildingID = b.BuildingID
      WHERE r.BuildingID = @buildingId
      ORDER BY r.ReportTime DESC
    `;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  } finally {
    sql.close();
  }
});

// API endpoint: Get details for a specific report
app.get('/api/reports/:reportId/details', async (req, res) => {
  const { reportId } = req.params;
  
  try {
    await sql.connect(dbConfig);
    
    const result = await sql.query`
      SELECT rd.*, s.SensorName, st.TypeName, st.Unit
      FROM ReportDetails rd
      JOIN Sensors s ON rd.SensorID = s.SensorID
      JOIN SensorTypes st ON s.SensorTypeID = st.SensorTypeID
      WHERE rd.ReportID = ${reportId}
    `;
    
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report details' });
  } finally {
    sql.close();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Import required modules
import express from "express"; // Imports the Express framework
import sql from "mssql"; // Allows connection to SQL database on Azure
import path from "path"; // Node.js utility for file/directory paths
import { fileURLToPath } from "url"; // Converts URL string to file path

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url); // Absolute path to server.js
const __dirname = path.dirname(__filename); // Directory path to server.js

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable or port 3000

// Database configuration using environment variables
// Configures mssql module to connect to database
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER, // Azure SQL server name
  database: process.env.AZURE_SQL_DATABASE, // Database name
  user: process.env.AZURE_SQL_USER, // Username
  password: process.env.AZURE_SQL_PASSWORD, // Password
  options: {
    encrypt: true, // Required for Azure SQL
    trustServerCertificate: false, // Don't trust self-signed certificates
  },
};

// Set up the view engine
app.set("view engine", "ejs"); // Configures EJS as template engine
app.set("views", path.join(__dirname, "views")); // Path to template files

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// API endpoint to get latest readings for a house
app.get("/api/latest/:house", async (req, res) => {
  const { house } = req.params;

  try {
    // Connect to the database
    console.log(`Fetching latest readings for house: ${house}`);
    await sql.connect(dbConfig);
    const request = new sql.Request();

    // Query to get the latest readings for each sensor in the house
    const result = await request.query(
      `SELECT SensorType, SensorValue, ReadingTime
       FROM SensorReadings
       WHERE HouseID = @house
       AND ReadingTime = (
         SELECT MAX(ReadingTime)
         FROM SensorReadings 
         WHERE HouseID = @house
       )
       ORDER BY SensorType`,
      { house }
    );

    // Format the data for the frontend
    const readings = {};
    result.recordset.forEach(row => {
      readings[row.SensorType] = row.SensorValue;
    });

    // Send JSON response
    res.json(readings);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ 
      error: err.message,
      details: "Failed to fetch latest readings" 
    });
  } finally {
    // Close the connection
    sql.close();
  }
});

// API endpoint to get historical data for a sensor
app.get("/api/history/:house/:sensor/:days", async (req, res) => {
  const { house, sensor, days } = req.params;

  try {
    // Connect to the database
    console.log(`Fetching ${days} days of ${sensor} data for ${house}`);
    await sql.connect(dbConfig);
    const request = new sql.Request();

    // Query to get historical sensor data
    const result = await request.query(
      `SELECT SensorValue as value, ReadingTime as timestamp
       FROM SensorReadings
       WHERE HouseID = @house
       AND SensorType = @sensor
       AND ReadingTime >= DATEADD(day, -@days, GETDATE())
       ORDER BY ReadingTime`,
      { 
        house, 
        sensor, 
        days: parseInt(days) 
      }
    );

    // Send JSON response
    res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ 
      error: err.message,
      details: "Failed to fetch historical data" 
    });
  } finally {
    // Close the connection
    sql.close();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
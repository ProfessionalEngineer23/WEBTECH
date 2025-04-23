import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import 'dotenv/config';

const app = express(); //start an express application
const PORT = 3000; //Server PORT defined

app.use(cors()); //for security

//azure database configuration information, required for connecting to the database
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true, 
    trustServerCertificate: false
  }
};

//Serve static files (where the html, css and js are stored)
app.use(express.static('public'));

//this api will allow you to view the whole database as a json (go to localhost:3000/view-data)
//same as full-database code but this one is used only for displaying the json out to port for testing if database rendered correctly
app.get('/view-data', async (req, res) => {
  const pool = await sql.connect(dbConfig); //connect to the database using db configuration info
  // store each table in a unique variable
  const buildings = await pool.request().query('SELECT * FROM BUILDING');
  const sensors = await pool.request().query('SELECT * FROM SENSOR');
  const readings = await pool.request().query('SELECT TOP 10 * FROM SENSOR_READING ORDER BY Reading_Date_Time DESC');
  const user = await pool.request().query('Select * From User_Data');
  const reportpreference = await pool.request().query('Select * From Report_Preference');
  //send out the variables in a json format to port 3000
  res.json({
    buildings: buildings.recordset,
    sensors: sensors.recordset,
    recentReadings: readings.recordset,
    user: user.recordset,
    reportpreference: reportpreference.recordset
  });
});

//this api will send out the database so the html can display it
//the code is the same as before but with exception handling and different api name
app.get('/api/full-database', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const buildings = await pool.request().query('SELECT * FROM BUILDING');
    const sensors = await pool.request().query('SELECT * FROM SENSOR');
    const readings = await pool.request().query(`
      SELECT TOP 50 * FROM SENSOR_READING 
      ORDER BY Reading_Date_Time DESC
    `);
    const user = await pool.request().query('SELECT * FROM User_Data');
    const preferences = await pool.request().query('SELECT * FROM Report_Preference');
    
    res.json({
      buildings: buildings.recordset,
      sensors: sensors.recordset,
      recentReadings: readings.recordset,
      user: user.recordset,
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
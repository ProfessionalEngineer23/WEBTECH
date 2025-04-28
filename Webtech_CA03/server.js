import express from 'express'; //creating a web server
import sql from 'mssql'; //connecting the sql database
import cors from 'cors'; //security
import 'dotenv/config'; //allows use of .env file 
import path from 'path';
import { fileURLToPath } from 'url';

//Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); //start an express application
const PORT = process.env.PORT || 3000; //Server PORT defined

app.use(cors()); //for security

//Serve static files (where the html, css and js are stored)
app.use(express.static(path.join(__dirname, 'public')));

//azure database configuration information, required for connecting to the database
//collects info from .env file
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

//this api will send out the database so the html can display it
//the code contains exception handling to make sure database can connect with server
app.get('/api/full-database', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    
    const buildings = await pool.request().query('SELECT * FROM BUILDING');
    const sensors = await pool.request().query('SELECT * FROM SENSOR');
    const readings = await pool.request().query(`SELECT * FROM SENSOR_READING`);
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
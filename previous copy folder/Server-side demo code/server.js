// Import required modules
import express from "express" //imports the express framework that handles routes, HTTP requests, and responses
import sql from "mssql" //mssql allowsmy app to connect to the sql database on azure
import path from "path" //A Node.js utility for working with file and directory paths.
import { fileURLToPath } from "url" //converts url string to file path

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url) //contains absolute path to my server.js file
const __dirname = path.dirname(__filename) //contains directory path to my server.js

// Create Express application
const app = express()
const PORT = process.env.PORT || 3000 //sets up either an environment variable or port 3000

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

// Set up the view engine
app.set("view engine", "ejs") //sets up ejs as the template engine
app.set("views", path.join(__dirname, "views")) //view path to find template files (client side programs)

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")))

// Home route - Show list of tables
app.get("/", async (req, res) => {
  try {
    // Connect to the database
    console.log("Connecting to database...")
    await sql.connect(dbConfig)

    // Query to get all tables
    const result = await sql.query`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `

    // Render the home page with the list of tables
    // if an error occurs, print it and send out empty tables
    res.render("home", {
      tables: result.recordset,
      error: null,
    })
  } catch (err) {
    console.error("Database error:", err)
    res.render("home", {
      tables: [],
      error: err.message,
    })
  } finally {
    // Close the connection
    sql.close()
  }
})

// Route to view table data
app.get("/table/:schema/:name", async (req, res) => {
  const { schema, name } = req.params

  try {
    // Connect to the database
    await sql.connect(dbConfig)

    //creats a new database request object
    //Then directly inserts schema and name
    const request = new sql.Request();
    const result = await request.query(`SELECT TOP 50 * FROM [${schema}].[${name}]`);

    // Render the table view with the data inside
    res.render("table", {
      schema,
      tableName: name,
      data: result.recordset,
      error: null,
    })
  } catch (err) {
    console.error("Database error:", err)
    res.render("table", {
      schema,
      tableName: name,
      data: [],
      error: err.message,
    })
  } finally {
    // Close the connection
    sql.close()
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})

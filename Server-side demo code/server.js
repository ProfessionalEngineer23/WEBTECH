// Import required modules
import express from "express"; //imports the express framework that handles routes, HTTP requests, and responses
import sql from "mssql"; //mssql allowsmy app to connect to the sql database on azure
import path from "path"; //A Node.js utility for working with file and directory paths.
import { fileURLToPath } from "url"; //converts url string to file path

//create express application
const app = express();
const PORT = process.env.PORT || 3000;

//database configuration
//tells mssql module how to connect to database
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

// Serve static files from the 'design' directory
app.use(express.static(path.join(__dirname, "design")))
// Serve static files from the 'java' directory
app.use(express.static(path.join(__dirname, "java")))
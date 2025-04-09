//import sql from 'mssql';
//import fs from 'fs/promises';
const fs = require('fs/promises');

/*
// Configuration using environment variables
const config = {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    options: {
        encrypt: true, // For Azure SQL Database
        trustServerCertificate: false
    }
};
*/

// Configuration using plain text
const sql = require('mssql');
const config = {
    user: 'Dovydas232',
    password: 'Webtech25',
    server: 'webtech25.database.windows.net',
    database: 'worksheetfour”',
    authentication: {
        type: 'default'
    },
    options: { 
        encrypt: true, // Use this if you're on Azure
        trustServerCertificate: false // Change to true for local dev / self-signed certs
    }
};

async function queryDatabase() {
    try {
        console.log('Connecting to Azure SQL Database...');
        await sql.connect(config);
        // Replace this with your actual query
        const query = `
        SELECT *
        FROM Customer
        `;
        console.log('Executing query:', query);
        const result = await sql.query(query);
        console.log(`Query executed successfully. Found ${result.recordset.length} records.`);
        // Generate HTML with the results
        await generateHtml(result.recordset);
        return result.recordset;
    } catch (err) {
        console.error('Database error:', err);
        throw err;
    } finally {
        // Close the connection
        await sql.close();
    }
}

async function generateHtml(data) {
    if (!data || data.length === 0) {
        console.log('No data to display');
        return;
    }
    // Get column names from the first record
    const columns = Object.keys(data[0]);
    // Create HTML table rows
    const tableRows = data.map(row => {
        const cells = columns.map(col => `<td>${row[col]}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    // Create HTML table headers
    const tableHeaders = columns.map(col => `<th>${col}</th>`).join('');
    // Create complete HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure SQL Database Results</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #0078D4;
            text-align: center;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #0078D4;
            color: white;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        tr:hover {
            background-color: #e6f3ff;
        }
        .timestamp {
            text-align: center;
            font-size: 0.8em;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Azure SQL Database Results</h1>
        <table>
            <thead>
                <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
    </div>
</body>
</html>
`;
    // Write HTML to file
    await fs.writeFile('database-results.html', html);
    console.log('HTML file generated: database-results.html');
}

// Execute the main function
queryDatabase()
    .then(data => {
        console.log('Process completed successfully');
    })
    .catch(err => {
        console.error('Error in main process:', err);
    });
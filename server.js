require('dotenv').config();

const express = require('express');
const app = express();

// Render injectera automatiquement la variable process.env.PORT
const PORT = 3000;

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Nombre maximum de connexions simultanées
  queueLimit: 0
});


app.get('/', (req, res) => {
    res.send('Mon serveur Node.js est en ligne sur Render !');
});

app.listen(3000, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

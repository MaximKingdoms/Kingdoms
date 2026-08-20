const express = require('express');
const app = express();

// Render injectera automatiquement la variable process.env.PORT
const PORT = process.env.PORT || 3000;

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});


app.get('/', (req, res) => {
    res.send('Mon serveur Node.js est en ligne sur Render !');
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

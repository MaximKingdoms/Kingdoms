const express = require('express');
const app = express();

// Render injectera automatiquement la variable process.env.PORT
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Mon serveur Node.js est en ligne sur Render !');
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

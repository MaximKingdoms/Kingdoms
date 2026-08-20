require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
cors: {origin: "https://kingdomsofultimates.com",
       methods: ["GET", "POST"]
}
});
// Render injectera automatiquement la variable process.env.PORT


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

const gameState = {
  players: {},
  monsters: {}
}


// 1. LE STOCKAGE EN RAM : Le serveur garde les positions ici en continu
const joueursEnLigne = {}; 

io.on('connection', (socket) => {
  console.log(`Joueur connecté : ${socket.id}`);

  // À la connexion, on peut lier le socket.id à l'ID du compte joueur (ex: id: 42)
  socket.on('playerfound', (data) => {
    joueursEnLigne[socket.id] = {
      id_bdd: data.userId, // L'ID unique du joueur dans votre base Hostinger
      x: data.startX || 0,
      y: data.startY || 0
    };
  });

  // COMMENT LE SERVEUR OBTIENT LA POSITION :
  // Le client (le jeu) va envoyer cet événement "playerMove" en boucle
  socket.on('playerMove', (position) => {
    if (joueursEnLigne[socket.id]) {
      // Le serveur intercepte et met à jour la RAM instantanément
      joueursEnLigne[socket.id].x = position.x;
      joueursEnLigne[socket.id].y = position.y;
    }
  });

  socket.on('disconnect', () => {
    // Optionnel : Sauvegarder immédiatement le joueur chez Hostinger quand il quitte
    sauvegarderJoueur(joueursEnLigne[socket.id]);
    delete joueursEnLigne[socket.id];
  });
});

// 2. LA SAUVEGARDE TOUTES LES MINUTES CHEZ HOSTINGER
setInterval(() => {
  console.log("Sauvegarde automatique des positions chez Hostinger...");
  
  // On boucle sur tous les joueurs actuellement connectés en RAM
  Object.values(joueursEnLigne).forEach(joueur => {
    sauvegarderJoueur(joueur);
  });
}, 60000); // 60 000 ms = 1 minute

// Fonction qui exécute la requête SQL vers Hostinger
function sauvegarderJoueur(joueur) {
  if (!joueur) return;
  
  const sql = "UPDATE HeroesCreated SET X = 500, Y = 500, XY = joueur.x, Yx = joueur.y WHERE WHERE id = joueur";
  // Remplacez 'pool' par le nom de votre variable de pool MySQL Hostinger
  pool.query(sql, [joueur.x, joueur.y, joueur.id_bdd], (err) => {
    if (err) console.error("Erreur de sauvegarde Hostinger:", err);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

app.listen(3000, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

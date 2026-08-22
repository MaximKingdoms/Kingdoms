require('dotenv').config();
require('mysql2/promise');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
cors: {origin: "https://www.kingdomsofultimates.com",
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


// 1. LE STOCKAGE EN RAM : Le serveur garde les positions ici en continu
const joueursEnLigne = {}; 

// Conteneur de tous les joueurs connectÃ©s
const players = {};

io.on('connection', (socket) => {
  console.log('Un utilisateur tente de se connecter :', socket.id);

  // 1. Ã‰couter quand le client envoie ses informations initiales
  socket.on('playerfound', (data) => {
    console.log(`Joueur connectÃ© : ${data.nomjoueur}`);

    // On structure l'objet exactement comme ton ancien fichier 'Loadingspecificplayer.php'
    // Tu peux ajuster la classe ou les points de vie par dÃ©faut si nÃ©cessaire
    players[socket.id] = {
      id: socket.id,
      Nomhero: data.nomjoueur,
      XY: data.mapxxx,      // Position X initiale
      Yx: data.mapyyy,      // Position Y initiale
      Currenthp: data.actualhp,       // Points de vie par dÃ©faut
      Class: data.actualclass      // Classe par dÃ©faut (changera si tu l'envoies dans le emit)
    };

    // Envoyer la liste de TOUS les joueurs existants uniquement Ã  ce nouveau joueur
    socket.emit('currentPlayers', players);

    // Diffuser les infos de ce NOUVEAU joueur Ã  tous les autres dÃ©jÃ  connectÃ©s
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

       // 2. Écouter les mouvements du joueur en temps réel
  socket.on('hitfromplayer', (hitdata) => {
players.forEach(player => {
  if (player.Nomhero === hitdata.playername) {
    player.Currenthp = hitdata.playerhp;
  }
  }
                );

    socket.broadcast.emit('informofhit', {playernametouched: hitdata.playername, playerhptouched: hitdata.playerhp});
      // Met Ã  jour la position sur le serveur
//      players[socket.id].hp = movementData.XY;
  //    players[socket.id].Yx = movementData.Yx;

      // Diffuse la nouvelle position aux autres joueurs
  });

  // 2. Écouter les mouvements du joueur en temps réel
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      // Met Ã  jour la position sur le serveur
      players[socket.id].XY = movementData.XY;
      players[socket.id].Yx = movementData.Yx;
      players[socket.id].Currenthp = movementData.Currenthp;

      // Diffuse la nouvelle position aux autres joueurs
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // 3. Gérer la déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
    
    // Si le joueur existait dans notre liste, on le supprime et on prévient le client
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('disconnectPlayer', socket.id);
    }
  });
});

// 2. LA SAUVEGARDE TOUTES LES MINUTES CHEZ HOSTINGER
setInterval(() => {
  console.log("Sauvegarde automatique des positions chez Hostinger...");
  
  // On boucle sur tous les joueurs actuellement connectés en RAM
    console.log("Chargement des joueurs");
    loaderjoueur();
  Object.values(joueursEnLigne).forEach(joueur => {
    sauvegarderJoueur(joueur);
  });
}, 60000); // 60 000 ms = 1 minute

async function loaderjoueur() {
try {
  // Votre connexion existante (ici nommée 'connection')
  // Remplacer 'nom_de_la_table' par le vrai nom de votre table
  const [rows] = await pool.promise().query('SELECT XY, Yx FROM HeroesCreated');
  
  // 'rows' contient un tableau avec les résultats
//  console.log("Données des joueurs récupérées :", rows);
  
} catch (error) {
  console.error("Erreur lors de la requête SQL :", error);
}
}


// Fonction qui exécute la requête SQL vers Hostinger
function sauvegarderJoueur(joueur) {
  if (!joueur) return;
  
  const sql = "UPDATE HeroesCreated SET X = 500, Y = 500, XY = joueur.x, Yx = joueur.y WHERE id = joueur";
  // Remplacez 'pool' par le nom de votre variable de pool MySQL Hostinger
  pool.query(sql, [joueur.x, joueur.y, joueur.id_bdd], (err) => {
    if (err) console.error("Erreur de sauvegarde Hostinger:", err);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

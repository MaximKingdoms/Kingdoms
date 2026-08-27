require('dotenv').config();
require('mysql2/promise');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://www.kingdomsofultimates.com",
    methods: ["GET", "POST"]
  }
});

const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Le stockage en RAM
const joueursEnLigne = {}; 
const players = {};
const monsters = {};
io.on('connection', (socket) => {
  console.log('Un utilisateur tente de se connecter :', socket.id);

  // 1. Initialisation du joueur
  socket.on('playerfound', (data) => {
    console.log(`Joueur connecté : ${data.nomjoueur}`);

    players[socket.id] = {
      id: data.id,
      Nomhero: data.nomjoueur,
      XY: data.mapxxx,      
      Yx: data.mapyyy,      
      Currenthp: data.actualhp,       
      Class: data.actualclass      
    };

    // Diffuser les infos de ce NOUVEAU joueur à tous les autres déjà connectés
    io.emit('newPlayer', players[socket.id]);
    
    const listeJoueurs = Object.values(players);
    console.log("Liste des joueurs envoyée :", listeJoueurs);
    
    // Envoyer la liste uniquement au joueur qui la demande
    socket.emit('currentPlayers', listeJoueurs); 
  });

  // 3. Gestion des dégâts / coups reçus
  socket.on('hitfromplayer', (hitdata) => {
    Object.values(players).forEach(player => {
      if (player.Nomhero === hitdata.playername) {
        player.Currenthp = hitdata.playerhp;
      }
    });
    // Diffuser l'information du coup à tout le monde
    socket.broadcast.emit('informofhit', {
      playernametouched: hitdata.playername, 
      playerhptouched: hitdata.playerhp
    });
  });

  // 1. Tableau global pour stocker tous les missiles actifs
const listeMissiles = [];
const listeMonstres = [];
  socket.on('monstre', (data) => {
    // Valider ou assigner des valeurs par défaut
    const posX = data.XY ?? 0;
    const posY = data.Yx ?? 0;

    // 3. Création du nouvel objet missile
    new monsterid = Math.random().toString(36).substring(2, 9);
    monsters[monsterid] = {
      id: monsterid,
        x: posX,
        y: posY,
        power: data.hp, // Optionnel : vitesse de déplacement
        class: data.monsterclass
    };

      // Diffuse la nouvelle position aux autres joueurs
    io.emit('informofmonster', {
      monstreid: monsterid,
      XY: data.XY,
      Yx: data.Yx,
      monsterclass: data.monsterclass,
      hp: data.hp
    });

    console.log(`Monstre ajouté ! Total en cours : ${monsters.length}`);
});

// 2. Écoute de l'événement à chaque tir
socket.on('missile', (data) => {
    // Valider ou assigner des valeurs par défaut
    const posX = data.XY ?? 0;
    const posY = data.Yx ?? 0;

    // 3. Création du nouvel objet missile
    const nouveauMissile = {
        id: Math.random().toString(36).substring(2, 9), // Identifiant unique utile pour le nettoyage
        x: posX,
        y: posY,
        power: data.hp // Optionnel : vitesse de déplacement
    };

    // 4. Ajout du missile dans le tableau
    listeMissiles.push(nouveauMissile);
      // Diffuse la nouvelle position aux autres joueurs
    io.emit('informofmissile', {
      playerid: data.id,
      XY: data.XY,
      Yx: data.Yx,
      playerclass: players[socket.id].Class,
      hp: data.hp
    });

    console.log(`Missile ajouté ! Total en cours : ${listeMissiles.length}`);
});

  // 4. Écouter les mouvements du joueur en temps réel
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].XY = movementData.XY;
      players[socket.id].Yx = movementData.Yx;

      // Diffuse la nouvelle position aux autres joueurs
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });
  
  socket.on('monsterMovement', (movementData) => {
      
      // Diffuse la nouvelle position aux autres joueurs
 //socket.emit('monsterMovement', { id: monstersfound.dataset.monstername, newx: monX, newy: monY, actualhp: monstersfound.dataset.hp, actualclass: monstersfound.dataset.monstertype });
      socket.broadcast.emit('monsterMoved', );
    }
  });


  // 5. Gérer la déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
    
    if (players[socket.id]) {
      delete players[socket.id];
      socket.broadcast.emit('disconnectPlayer', socket.id);
    }
  });
});

// Sauvegarde automatique toutes les minutes
setInterval(() => {
  console.log("Sauvegarde automatique des positions chez Hostinger...");
  console.log("Chargement des joueurs");
  
  // Note : Assurez-vous d'alimenter "joueursEnLigne" ou changez cette ligne par Object.values(players)
  Object.values(joueursEnLigne).forEach(joueur => {
    sauvegarderJoueur(joueur);
  });
}, 60000); 

function sauvegarderJoueur(joueur) {
  if (!joueur) return;
  
  // Correction de la requête pour utiliser les placeholders de sécurité (?) de mysql2
  const sql = "UPDATE HeroesCreated SET XY = ?, Yx = ? WHERE id = ?";
  pool.query(sql, [joueur.x, joueur.y, joueur.id_bdd], (err) => {
    if (err) console.error("Erreur de sauvegarde Hostinger:", err);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

require('dotenv').config();
require('mysql2/promise');

const express = require('express');
const http = require('http');

let lastUpdateTime = Date.now();
const MONSTER_SPEED = 50; // Vitesse en pixels par seconde

function moveMonstersServer() {
    const now = Date.now();
    // 1. On calcule le deltaTime UNE SEULE FOIS pour toute la fonction
    const deltaTime = (now - lastUpdateTime) / 1000;
    
    // CORRECTION MAJEURE : On ne met à jour lastUpdateTime qu'à la toute fin de la fonction, pas ici !

    const monsterIds = Object.keys(monsters);
    if (monsterIds.length === 0) {
        lastUpdateTime = now; // On garde le temps à jour même s'il n'y a pas de monstres
        return;
    }

    const playerIds = Object.keys(players);

    monsterIds.forEach(id => {
        let monster = monsters[id];
        let distancemin = Infinity;
        let joueurnear = null;

        // Recherche du joueur le plus proche avec tes bons paramètres (XY et Yx)
        playerIds.forEach(pId => {
            const player = players[pId];
            const distance = Math.sqrt(Math.pow(monster.x - player.XY, 2) + Math.pow(monster.y - player.Yx, 2));
            if (distance < distancemin) {
                distancemin = distance;
                joueurnear = player;
            }
        });

        let chaX = joueurnear ? joueurnear.XY : 175;
        let chaY = joueurnear ? joueurnear.Yx : 175;
        let playerHp = joueurnear ? joueurnear.Currenthp : 0;

        const step = MONSTER_SPEED * deltaTime;

        // 2. Logique de Poursuite ou Fuite avec sécurité "Anti-Tremblement"
        if (playerIds.length === 0 || playerHp <= 0) {
            // FUITE
            monster.x += (monster.x < chaX) ? -step : step;
            monster.y += (monster.y < chaY) ? -step : step;
        } else {
            // POURSUITE
            // Axe X : Si le monstre est plus proche du joueur que la taille du "step", il se colle sur lui
            if (Math.abs(monster.x - chaX) <= step) {
                monster.x = chaX;
            } else {
                monster.x += (monster.x < chaX) ? step : -step;
            }

            // Axe Y
            if (Math.abs(monster.y - chaY) <= step) {
                monster.y = chaY;
            } else {
                monster.y += (monster.y < chaY) ? step : -step;
            }
        }

        // On arrondit pour éviter d'envoyer des nombres à virgule infinis sur le réseau
        monster.x = Math.round(monster.x);
        monster.y = Math.round(monster.y);

        // 3. Vérification des limites
        if (monster.y < 1 || monster.y > 325 || monster.x < 1 || monster.x > 325) {
            delete monsters[id];
            io.emit('monsterRemoved', { id: id });
        } else {
            io.emit('monsterMoved', {
                monid: id,
                monx: monster.x,
                mony: monster.y,
                monhp: monster.power,
                monclass: monster.class
            });
        }
    });

    // CORRECTION MAJEURE : On enregistre le temps ici, une fois que TOUS les monstres ont bougé
    lastUpdateTime = Date.now();
}

  let gameInterval = null; // Variable globale pour stocker l'intervalle

// Dans votre fonction de configuration/connexion :
if (!gameInterval) { 
    // On ne lance l'intervalle que s'il n'existe pas déjà
    gameInterval = setInterval(moveMonstersServer, 110);
}
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
      if (player.id === hitdata.playername) {
        player.Currenthp = hitdata.playerhp;
      }
    });
    // Diffuser l'information du coup à tout le monde
    socket.broadcast.emit('informofhit', {
      playernametouched: hitdata.playername, 
      playerhptouched: hitdata.playerhp
    });
  });
  socket.on('hitmonster', (hitdata) => {
      if (monsters[hitdata.monstername]) {
        monsters[hitdata.monstername].power = hitdata.monsterhp;
      }
          if (hitdata.monsterhp <= 0) {
            delete monsters[hitdata.monstername];
            
            // On informe les clients de le supprimer graphiquement
            io.emit('monsterRemoved', { id: hitdata.monstername });
        
      }

    // Diffuser l'information du coup à tout le monde
    socket.broadcast.emit('informofhitmonster', {
      monsternametouched: hitdata.monstername, 
      monsterhptouched: hitdata.monsterhp
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
    let monsterid = Math.random().toString(36).substring(2, 9);
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

    console.log(`Monstre ajouté !`);
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
  socket.on('player_move', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].XY = movementData.caseX;
      players[socket.id].Yx = movementData.caseY;

      // Diffuse la nouvelle position aux autres joueurs
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });
  

// 5. Boucle d'exécution du serveur (Ex: 30 fois par seconde ou ~33ms)


  // 5. Gérer la déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
    
    if (players[socket.id]) {
      delete players[socket.id];
      socket.broadcast.emit('disconnectPlayer', socket.id);
      socket.disconnect(true);
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

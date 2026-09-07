require('dotenv').config();
require('mysql2/promise');

const express = require('express');
const http = require('http');

let lastUpdateTime = Date.now();
const MONSTER_SPEED = 50; // Vitesse en pixels par seconde
let listeMissiles = [];
const monsters = {};

function moveMonstersServer() {
const survivantsMissiles = [];
        
// --- SUR LE SERVEUR (Dans moveMonstersServer) ---

listeMissiles.forEach((missile) => {
    const targetx = Number(missile.targetx);
    const targety = Number(missile.targety);

    // 1. INITIALISATION DE LA DIAGONALE PURE (Au premier tick du missile)
    if (!missile.dirX && !missile.dirY) {
        const diffX = targetx - missile.x;
        const diffY = targety - missile.y;
        
        // Calcul de la distance réelle vers la cible
        const distanceOrigine = Math.sqrt(diffX * diffX + diffY * diffY) || 1;

        // Calcul du vecteur unitaire (direction de la ligne droite)
        missile.dirX = diffX / distanceOrigine;
        missile.dirY = diffY / distanceOrigine;
    }

    // Vitesse fixe par tick (ajustée pour l'intervalle de 50ms)
    const stepSpeed = (missile.playerclass === "ranger") ? 25 : 15;

    // Calcul de la distance restante avant la cible programmée
    const currentDiffX = targetx - missile.x;
    const currentDiffY = targety - missile.y;
    const distanceRestante = Math.sqrt(currentDiffX * currentDiffX + currentDiffY * currentDiffY);

    // 2. LOGIQUE DE MOUVEMENT EN LIGNE DROITE
    if (distanceRestante <= stepSpeed) {
        // ANTI-DÉPASSEMENT : Si le pas est plus grand que le reste, on se bloque PILE dessus
        missile.x = targetx;
        missile.y = targety;
    } else {
        // Avancement en diagonale exacte
        missile.x += missile.dirX * stepSpeed;
        missile.y += missile.dirY * speed; // Correction : s'aligner sur stepSpeed
    }

    // 3. EXTINCTION LOGIQUE
    if (missile.x === targetx && missile.y === targety) {
        console.log(`Missile arrivé au bout de sa course : ID ${missile.id}`);
        // Il est supprimé ici car il a fini son voyage sans rien toucher
    } else {
        // Tant qu'il n'est pas sur la cible, il continue son transit
        survivantsMissiles.push(missile);
    }
});

// On remplace l'ancienne liste par celle contenant uniquement les missiles actifs
listeMissiles = survivantsMissiles;
// 1. On extrait les objets joueurs depuis le dictionnaire global 'players'
const playersArray = Object.values(players);

const step = 2.4;
        
Object.values(monsters).forEach(monster => {
    // Sécurité au cas où l'objet serait mal défini
    if (!monster) return;

    // Vérification de la classe du monstre
    if (monster.class === 'Gobelin') {
        
        // 2. FILTRAGE : On cherche les joueurs selon vos propriétés exactes (Currenthp)
        const livingPlayers = playersArray.filter(p => p.Currenthp > 0);
        const deadPlayers = playersArray.filter(p => p.Currenthp <= 0);

        let targetPlayer = null;
        let isAllDead = livingPlayers.length === 0;

        const candidates = isAllDead ? deadPlayers : livingPlayers;
        let minDistance = Infinity;

        // 3. RECHERCHE DU JOUEUR LE PLUS PROCHE : Utilisation de XY et Yx
        candidates.forEach(p => {
            const dist = Math.abs(monster.x - p.XY) + Math.abs(monster.y - p.Yx);
            if (dist < minDistance) {
                minDistance = dist;
                targetPlayer = p;
            }
        });

        // Si aucun joueur n'est connecté sur le serveur, le monstre ne bouge pas
        if (!targetPlayer) return;

        // Coordonnées de la cible (XY et Yx)
        const chaX = targetPlayer.XY + 25;
        const chaY = targetPlayer.Yx + 25;

        const distanceDetection = Infinity;
        const joueurnear = minDistance <= distanceDetection;

        // 4. LOGIQUE DE DÉPLACEMENT : Modification via monsters[monster.id]
        if (isAllDead) {
            // FUITE des joueurs morts
            if (joueurnear) {
                if (monster.x < chaX) {
                    monsters[monster.id].x -= step;
                } else if (monster.x > chaX) {
                    monsters[monster.id].x += step;
                } else {
                    monsters[monster.id].x -= step;
                }
                
                if (monster.y < chaY) {
                    monsters[monster.id].y -= step;
                } else if (monster.y > chaY) {
                    monsters[monster.id].y += step;
                } else {
                    monsters[monster.id].y -= step;
                }
            }
        } else {
            // POURSUITE du joueur vivant le plus proche (avec sécurité anti-oscillation)
            // Axe X
            if (Math.abs(monster.x - chaX) <= step) {
                monsters[monster.id].x = chaX;
            } else {
                monsters[monster.id].x += (monster.x < chaX) ? step : -step;
            }
            
            // Axe Y
            if (Math.abs(monster.y - chaY) <= step) {
                monsters[monster.id].y = chaY;
            } else {
                monsters[monster.id].y += (monster.y < chaY) ? step : -step;
            }
        }
    }
});
// CORRECTION MAJEURE : On enregistre le temps ici, une fois que TOUS les monstres ont bougé
    lastUpdateTime = Date.now();
 emitGlobalPositions();
}

  let gameInterval = null; // Variable globale pour stocker l'intervalle

// Dans votre fonction de configuration/connexion :
if (!gameInterval) { 
    // On ne lance l'intervalle que s'il n'existe pas déjà
    gameInterval = setInterval(moveMonstersServer, 50);
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
      Class: data.actualclass,      
      Strength: data.sonstr 
    };

    // Diffuser les infos de ce NOUVEAU joueur à tous les autres déjà connectés
    io.emit('newPlayer', players[socket.id]);
    
    const listeJoueurs = Object.values(players);
    console.log("Liste des joueurs envoyée :", listeJoueurs);
    
    // Envoyer la liste uniquement au joueur qui la demande
//socket.emit('currentPlayers', listeJoueurs); 
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

socket.on('missileisdead', (data) => {
    // Supprime le missile qui correspond à l'ID reçu
    listeMissiles = listeMissiles.filter(missile => missile.id !== data.id);
    
    console.log(`Missile détruit ! Total en cours : ${listeMissiles.length}`);
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

  });


  // 1. Tableau global pour stocker tous les missiles actifs

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

    console.log(`Monstre ' + monsters[monsterid}.class + 'ajouté !`);
});

// 2. Écoute de l'événement à chaque tir
socket.on('missile', (data) => {
    // Valider ou assigner des valeurs par défaut
    const posX = (data.XY) ?? 0;
    const posY = (data.Yx) ?? 0;

    // 3. Création du nouvel objet missile
    const nouveauMissile = {
            
        id: Math.random().toString(36).substring(2, 9), // Identifiant unique utile pour le nettoyage
        x: players[data.id].XY +25,
        y: players[data.id].Yx +25,
        targetx: posX,
        targety: posY,
        power: data.hp, // Optionnel : vitesse de déplacement
        playershot: data.id,
        playerclass: players[data.id].Class,
        createdAt: Date.now()
     
    
    };


    // 4. Ajout du missile dans le tableau
    listeMissiles.push(nouveauMissile);

    console.log(`Missile ajouté ! Total en cours : ${listeMissiles.length}`);
});

  // 4. Écouter les mouvements du joueur en temps réel
socket.on('playerMoved2', (donneesPosition) => {
    if (players[socket.id]) {
            console.log("Nouvelle position = " + donneesPosition.pixelX);
        // On stocke les coordonnées en pixels reçues du client
        players[socket.id].XY = donneesPosition.pixelX;
        players[socket.id].Yx = donneesPosition.pixelY;
//        players[socket.id].caseX = donneesPosition.caseX;
//     players[socket.id].caseY = donneesPosition.caseY;

      // Diffuse la nouvelle position aux autres joueurs
    }
  });
  

// 5. Boucle d'exécution du serveur (Ex: 30 fois par seconde ou ~33ms)


  // 5. Gérer la déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
     sauvegarderJoueur(players[socket.id]);
    
    if (players[socket.id]) {
      delete players[socket.id];
      socket.broadcast.emit('disconnectPlayer', socket.id);
      socket.disconnect(true);
    }
  });
});

// 1. NOUVELLE FONCTION : Émet toutes les positions du jeu d'un coup
function emitGlobalPositions() {
   
        io.emit('globalPositions', {
    players: Object.keys(players).map(id => ({
      id: id,
      Nomhero: players[id].Nomhero,
      XY: players[id].XY,
      Yx: players[id].Yx,
      Currenthp: players[id].Currenthp,
      Class: players[id].Class,
      Strength: players[id].Strength
    })),
    monsters: Object.keys(monsters).map(id => ({
      id: id,
      x: monsters[id].x,
      y: monsters[id].y,
      hp: monsters[id].power,
      class: monsters[id].class
    })),
    missiles: listeMissiles.map(missile => ({
      id: missile.id,
      x: missile.x,
      y: missile.y,
      targetx: missile.targetx,
      targety: missile.targety,
      playerclass: missile.playerclass,
      playershot: missile.playershot,
      power: missile.power
    }))
  });
     listeMissiles.forEach((missile) => {

if (Date.now() - missile.createdAt > 5000) { 
 missile.remove();
}
});
}
                           
// Sauvegarde automatique toutes les minutes
setInterval(() => {
  console.log("Sauvegarde automatique des positions chez Hostinger...");
  console.log("Chargement des joueurs");
  
  // Note : Assurez-vous d'alimenter "joueursEnLigne" ou changez cette ligne par Object.values(players)
   const playerIds = Object.keys(players);

        playerIds.forEach(pId => {
            const player = players[pId];
     sauvegarderJoueur(player);
            // Sécurité : s'assurer que le joueur a bien des coordonnées définies
            
        });

}, 60000); 

function sauvegarderJoueur(joueur) {
  if (!joueur) return;
  
  // Correction de la requête pour utiliser les placeholders de sécurité (?) de mysql2
  const sql = "UPDATE HeroesCreated SET XY = ?, Yx = ? WHERE Nomhero = ?";
  pool.query(sql, [joueur.XY, joueur.Yx, joueur.Nomhero], (err) => {
    if (err) console.error("Erreur de sauvegarde Hostinger:", err);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

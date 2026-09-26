require('dotenv').config();
require('mysql2/promise');

const express = require('express');
const http = require('http');

let lastUpdateTime = Date.now();
const MONSTER_SPEED = 50; // Vitesse en pixels par seconde
let listeMissiles = [];
const monsters = {};
const summons = {};

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


const joueursInactifs = new Map(); // Stocke le minuteur de chaque joueur
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
    
    // 1. Initialiser le minuteur dès la connexion
    resetMiniteurInactivite(socket);

    // 2. Écouter l'événement de mouvement envoyé par le client
socket.on('playerMoved2', (donneesPosition) => {
    if (players[socket.id]) {
            console.log("Nouvelle position = " + donneesPosition.pixelX);
        // On stocke les coordonnées en pixels reçues du client
        players[socket.id].XY = donneesPosition.pixelX;
        players[socket.id].Yx = donneesPosition.pixelY;
//        players[socket.id].caseX = donneesPosition.caseX;
//     players[socket.id].caseY = donneesPosition.caseY;

      // Diffuse la nouvelle position aux autres joueurs
        resetMiniteurInactivite(socket);
    }
  });
        // Le joueur a bougé, on remet le compteur à zéro
        
        // Logique de déplacement ici (ex: mettre à jour les coordonnées x, y)
    });

  // 5. Gérer la déconnexion d'un joueur
  socket.on('disconnect', () => {
    console.log('Joueur déconnecté :', socket.id);
   for (const idMonstre in monsters) {
        // On vérifie si le monstre appartient au joueur qui vient de se déconnecter
        if (monsters[idMonstre].playerbound === socket.id) {
            delete monsters[idMonstre]; // Supprime le monstre de l'objet global
        }
    }
    for (const idSummon in summons) {
        // On vérifie si le monstre appartient au joueur qui vient de se déconnecter
        if (summons[idSummon].playerbound === socket.id) {
            delete summons[idSummon]; // Supprime le monstre de l'objet global
        }
    }
    sauvegarderJoueur(players[socket.id]);
        clearTimeout(joueursInactifs.get(socket.id));
        joueursInactifs.delete(socket.id);
    
    if (players[socket.id]) {
      delete players[socket.id];
      socket.broadcast.emit('disconnectPlayer', socket.id);
      socket.disconnect(true);
    }
  });
        // Le stockage en RAM
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

  });
socket.on('hitsummon', (hitdata) => {
      if (summons[hitdata.monstername]) {
        summons[hitdata.monstername].power = hitdata.monsterhp;
      }

  });


  // 1. Tableau global pour stocker tous les missiles actifs

const monstersArray = [];
const listeSummons = [];
socket.on('monstre', (data) => {
    const posX = data.XY ?? 0;
    const posY = data.Yx ?? 0;

    let monsterid = Math.random().toString(36).substring(2, 9);
    monsters[monsterid] = {
        id: monsterid,
        x: posX,
        y: posY,
        power: data.hp, 
        class: data.monsterclass,
        playerbound: data.playername
    };

    // CORRIGÉ : Syntaxe propre avec des backticks
    console.log(`Monstre ${monsters[monsterid].class} ajouté ! (ID: ${monsterid})`);
});

socket.on('summon', (data) => {
    const posX = data.XY ?? 0;
    const posY = data.Yx ?? 0;

    let summonid = Math.random().toString(36).substring(2, 9);
    summons[summonid] = {
        id: summonid,
        x: posX,
        y: posY,
        power: data.hp, 
        class: data.summonclass,
        playerbound: data.playername
    };

    // CORRIGÉ : Syntaxe propre avec des backticks
    console.log(`Summon ${summons[summonid].class} ajouté ! (ID: ${summonid})`);
});


// 2. Écoute de l'événement à chaque tir
socket.on('missile', (data) => {
    // Valider ou assigner des valeurs par défaut
    const posX = (data.XY) ?? 0;
    const posY = (data.Yx) ?? 0;

    // 3. Création du nouvel objet missile
    const nouveauMissile = {
            
        id: Math.random().toString(36).substring(2, 9), // Identifiant unique utile pour le nettoyage
        x: players[data.id].XY,
        y: players[data.id].Yx,
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

    // Nettoyer si le joueur quitte de lui-même
});

  // 4. Écouter les mouvements du joueur en temps réel
  
function moveMonstersServer() {
function moveMonstersServer() {
    const survivantsMissiles = [];
        
    // --- 1. GESTION DES MISSILES ---
    listeMissiles.forEach((missile) => {
        const targetx = Number(missile.targetx);
        const targety = Number(missile.targety);

        if (!missile.dirX && !missile.dirY) {
            const diffX = targetx - missile.x;
            const diffY = targety - missile.y;
            const distanceOrigine = Math.sqrt(diffX * diffX + diffY * diffY) || 1;

            missile.dirX = diffX / distanceOrigine;
            missile.dirY = diffY / distanceOrigine;
            missile.distanceMaximale = distanceOrigine + 25;
            missile.distanceParcourue = 0;
        }

        const stepSpeed = (missile.playerclass === "ranger") ? 25 : 15;
        let pasCeTick = stepSpeed;
        if (missile.distanceParcourue + stepSpeed >= missile.distanceMaximale) {
            pasCeTick = missile.distanceMaximale - missile.distanceParcourue;
        }

        missile.x += missile.dirX * pasCeTick;
        missile.y += missile.dirY * pasCeTick;
        missile.distanceParcourue += pasCeTick;
        
        if (missile.distanceParcourue >= missile.distanceMaximale) {
            console.log(`Missile arrivé en fin de course prolongée (+25px) : ID ${missile.id}`);
        } else {
            survivantsMissiles.push(missile);
        }
    });
    listeMissiles = survivantsMissiles;

    // --- FILTRAGE AVANT LES BOUCLES (FAIT 1 SEULE FOIS POUR TOUT LE TICK) ---
    const playersArray = Object.values(players);
    const monstersArray = Object.values(monsters);

    const livingPlayers = playersArray.filter(p => p.Currenthp > 0);
    const deadPlayers = playersArray.filter(p => p.Currenthp <= 0);
    const isAllDead = livingPlayers.length === 0;
    const playerCandidates = isAllDead ? deadPlayers : livingPlayers;

    const livingMonsters = monstersArray.filter(m => m && m.power > 0);
    const step = 2.4;
    const MAX_DIST_SQ = 400 * 400; // 160000 (Évite le Math.sqrt)

    // --- 2. GESTION DES MONSTRES ---
    monstersArray.forEach(monster => {
        if (!monster) return;

        // SÉCURITÉ : Si le monstre était lié à un joueur qui a crash / déco
        if (monster.playerbound && !players[monster.playerbound]) {
            io.emit('monsterRemoved', { id: monster.id });
            delete monsters[monster.id];
            return;
        }

        if (monster.power <= 0) return;
        if (playerCandidates.length === 0) return;

        let targetPlayer = null;
        let minDistance = Infinity;

        // Recherche (Distance Manhattan)
        playerCandidates.forEach(p => {
            const dist = Math.abs(monster.x - p.XY) + Math.abs(monster.y - p.Yx);
            if (dist < minDistance) {
                minDistance = dist;
                targetPlayer = p;
            }
        });

        if (!targetPlayer) return;

        // Sécurité de distance max (Optimisé sans Math.sqrt)
        const diffX = monster.x - targetPlayer.XY;
        const diffY = monster.y - targetPlayer.Yx;
        const distSq = (diffX * diffX) + (diffY * diffY);

        if (distSq > MAX_DIST_SQ) {
            io.emit('monsterRemoved', { id: monster.id });
            delete monsters[monster.id];
            return;
        }

        const chaX = targetPlayer.XY + 25;
        const chaY = targetPlayer.Yx + 25;
         
        if (monster.class === 'Gobelin') {
            if (isAllDead) {
                // FUITE
                monsters[monster.id].x += (monster.x < chaX) ? -step : step;
                monsters[monster.id].y += (monster.y < chaY) ? -step : step;
            } else {
                // POURSUITE
                if (Math.abs(monster.x - chaX) <= step) {
                    monsters[monster.id].x = chaX;
                } else {
                    monsters[monster.id].x += (monster.x < chaX) ? step : -step;
                }
                
                if (Math.abs(monster.y - chaY) <= step) {
                    monsters[monster.id].y = chaY;
                } else {
                    monsters[monster.id].y += (monster.y < chaY) ? step : -step;
                }
            }
        }
    });

    // --- 3. GESTION DES SUMMONS ---
    Object.keys(summons).forEach(id => {
        const summon = Array.isArray(summons) ? summons[id] : summons[id];
        
        // Sécurité & Nettoyage immédiat (Fusionné)
        if (!summon || summon.power <= 0 || (summon.hp !== undefined && summon.hp <= 0)) {
            delete summons[id];
            io.emit('summonRemoved', { id: id });
            return;
        }

        if (livingMonsters.length === 0) return;

        let targetMonster = null;
        let minDistance = Infinity;

        // RECHERCHE DU MONSTRE LE PLUS PROCHE
        livingMonsters.forEach(m => {
            if (m.x === undefined || m.y === undefined) return;
            const dist = Math.abs(summon.x - m.x) + Math.abs(summon.y - m.y);
            if (dist < minDistance) {
                minDistance = dist;
                targetMonster = m;
            }
        });

        if (!targetMonster) return;

        // Sécurité de distance max (Optimisé sans Math.sqrt)
        const diffX = summon.x - targetMonster.x;
        const diffY = summon.y - targetMonster.y;
        const distSq = (diffX * diffX) + (diffY * diffY);

        if (distSq > MAX_DIST_SQ) {
            io.emit('summonRemoved', { id: id });
            delete summons[id]; 
            return; 
        }

        const summonStep = summon.speed || 3; 

        if (summon.class === 'Gobelin') {
            // Déplacement Axe X
            if (Math.abs(summon.x - targetMonster.x) <= summonStep) {
                summons[id].x = targetMonster.x;
            } else {
                summons[id].x += (summon.x < targetMonster.x) ? summonStep : -summonStep;
            }
            
            // Déplacement Axe Y
            if (Math.abs(summon.y - targetMonster.y) <= summonStep) {
                summons[id].y = targetMonster.y;
            } else {
                summons[id].y += (summon.y < targetMonster.y) ? summonStep : -summonStep;
            }
        }
    });
      
    // Enregistrement du temps de mise à jour
    lastUpdateTime = Date.now();

    // 4. ENVOI DES POSITIONS NETTOYÉES
    emitGlobalPositions();
}

// Lancement de la boucle globale du serveur (Toutes les 50ms)
setInterval(moveMonstersServer, 50);


// 5. Boucle d'exécution du serveur (Ex: 30 fois par seconde ou ~33ms)


function resetMiniteurInactivite(socket) {
    // Si un minuteur existait déjà pour ce joueur, on l'annule
    if (joueursInactifs.has(socket.id)) {
        clearTimeout(joueursInactifs.get(socket.id));
    }

    // On lance un nouveau compte à rebours de 1 minute (60000 ms)
    const timeout = setTimeout(() => {
  for (const idMonstre in monsters) {
        // On vérifie si le monstre appartient au joueur qui vient de se déconnecter
        if (monsters[idMonstre].playerbound === socket.id) {
            delete monsters[idMonstre]; // Supprime le monstre de l'objet global
        io.emit('monsterRemoved', { id: id });
        }
    }
        for (const idSummon in summons) {
        // On vérifie si le monstre appartient au joueur qui vient de se déconnecter
        if (summons[idSummon].playerbound === socket.id) {
            delete summons[idSummon]; // Supprime le monstre de l'objet global
        io.emit('summonRemoved', { id: id });
        }
    }
      sauvegarderJoueur(players[socket.id]);
        clearTimeout(joueursInactifs.get(socket.id));
        joueursInactifs.delete(socket.id);
    
    if (players[socket.id]) {
      delete players[socket.id];
      socket.broadcast.emit('disconnectPlayer', socket.id);
       console.log(`Expulsion de ${socket.id} pour inactivité.`);
        socket.emit('afk_kick', 'Vous avez été déconnecté pour inactivité.');
        socket.disconnect(true); // Déconnexion forcée
    }
    }, 60000);

    // On sauvegarde la référence du minuteur
    joueursInactifs.set(socket.id, timeout);
}

// 1. DÉFINITION DE LA GRILLE (À placer en haut de votre fichier)
const ZONE_SIZE = 350; // Ajustez cette valeur (ex: la taille moyenne d'un écran de jeu en pixels)

function getZoneKey(x, y) {
    const zoneX = Math.floor(x / ZONE_SIZE);
    const zoneY = Math.floor(y / ZONE_SIZE);
    return `${zoneX},${zoneY}`;
}

// 2. VOTRE FONCTION OPTIMISÉE
function emitGlobalPositions() {
    
    // Nettoyage des missiles expirés
    const now = Date.now();
    listeMissiles = listeMissiles.filter(missile => {
        if (now - missile.createdAt > 5000) { 
            // Si votre objet missile a une méthode de nettoyage (ex: retirer de la physique)
            if (typeof missile.remove === 'function') missile.remove();
            return false;
        }
        return true;
    });

    // Initialiser la grille vide pour ce tick
    const grid = {};
    function ensureZone(key) {
        if (!grid[key]) {
            grid[key] = { players: [], monsters: [], missiles: [], summons: [] };
        }
    }

    // Répartir les JOUEURS dans la grille
    Object.keys(players).forEach(id => {
        const p = players[id];
        const key = getZoneKey(p.XY, p.Yx); // XY = x, Yx = y
        ensureZone(key);
        grid[key].players.push({
            id: id,
            Nomhero: p.Nomhero,
            XY: p.XY,
            Yx: p.Yx,
            Currenthp: p.Currenthp,
            Class: p.Class,
            Strength: p.Strength
        });
    });

    // Répartir les MONSTRES dans la grille
    Object.keys(monsters).forEach(id => {
        const m = monsters[id];
        const key = getZoneKey(m.x, m.y);
        ensureZone(key);
        grid[key].monsters.push({
            id: id,
            x: m.x,
            y: m.y,
            hp: m.power,
            class: m.class
        });
    });
    // Répartir les MONSTRES dans la grille
    Object.keys(summons).forEach(id => {
        const s = summons[id];
        const key = getZoneKey(s.x, s.y);
        ensureZone(key);
        grid[key].summons.push({
            id: id,
            x: s.x,
            y: s.y,
            hp: s.power,
            class: s.class
        });
    });

    // Répartir les MISSILES dans la grille
    listeMissiles.forEach(missile => {
        const key = getZoneKey(missile.x, missile.y);
        ensureZone(key);
        grid[key].missiles.push({
            id: missile.id,
            x: missile.x,
            y: missile.y,
            targetx: missile.targetx,
            targety: missile.targety,
            playerclass: missile.playerclass,
            playershot: missile.playershot,
            power: missile.power
        });
    });

    // ENVOYER les données ciblées à CHAQUE joueur individuellement
    Object.keys(players).forEach(socketId => {
        const p = players[socketId];
        const playerZoneX = Math.floor(p.XY / ZONE_SIZE);
        const playerZoneY = Math.floor(p.Yx / ZONE_SIZE);

        const localData = { players: [], monsters: [], missiles: [], summons: [] };

        // Récupérer les données de la zone du joueur + les 8 zones adjacentes (Grille 3x3)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const targetKey = `${playerZoneX + dx},${playerZoneY + dy}`;
                
                if (grid[targetKey]) {
                    localData.players.push(...grid[targetKey].players);
                    localData.monsters.push(...grid[targetKey].monsters);
                    localData.missiles.push(...grid[targetKey].missiles);
                    localData.summons.push(...grid[targetKey].summons);
                }
            }
        }

        // Envoi exclusif au socket du joueur concerné
        io.to(socketId).emit('globalPositions', localData);
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

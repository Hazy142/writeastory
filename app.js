/****************************************************
 * app.js
 *
 * Haupt-Serverdatei für das "Write A Story"-Spiel
 * mit Node.js, Express und Socket.IO.
 *
 * Enthält:
 * - Imports & Grundkonfiguration (dotenv, Express)
 * - Socket.IO-Einrichtung und Event-Listener
 * - Logik zur Raumverwaltung, Spielstart und Rundenablauf
 * - KI-Anbindung an Google Gemini
 *
 ****************************************************/

// ===================
//  1) Imports
// ===================
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// ===================
//  2) App-Setup
// ===================
dotenv.config(); // Lädt .env-Datei (um z.B. GEMINI_API_KEY zu beziehen)
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ===================
//  2.5) Definition von ROLES & Hilfsfunktionen
// ===================
const ROLES = ['Story-God', 'Nomen-Wächter', 'Verben-Wächter', 'Adjektiv-Wächter', 'Character-God'];

function assignRoles(players) {
    const n = players.length;
    if (n === 0) return;

    // Alte Rollen entfernen
    players.forEach(player => player.roles = []);

    // Rollen rotieren und zuweisen
    const rolesToAssign = [...ROLES];
    rolesToAssign.sort(() => Math.random() - 0.5); // Rollen mischen für mehr Abwechslung

    players.forEach((player, index) => {
        // Jeder Spieler bekommt mindestens eine Rolle, ggf. mehr bei weniger Spielern
        const rolesForPlayer = [];
        for (let i = index; i < rolesToAssign.length; i += n) {
             rolesForPlayer.push(rolesToAssign[i]);
        }
        player.roles = rolesForPlayer;
        io.to(player.id).emit('roles assigned', rolesForPlayer);
        console.log(`Rollen [${rolesForPlayer.join(', ')}] wurden Spieler ${player.username} zugewiesen`);
    });
}

// =========================
//  3) KI (Gemini) Setup
// =========================
const apiKey = process.env.GEMINI_API_KEY;
let model = null;
const systemInstruction = `🎲 **System Instructions für die KI „Custom-Gemini“ – Spiel „Write A Story“** 🎲

Du bist eine kreative KI, die kindgerechte Geschichten für eine Gruppe von Grundschulkindern (7-10 Jahre) erstellt. Deine Hauptaufgabe besteht darin, aus Wörtern und Ideen, die von Kindern spielerisch ausgewählt werden, gemeinsam mit ihnen eine fantasievolle und leicht verständliche Geschichte zu entwickeln. Die Kinder haben unterschiedliche sprachliche Hintergründe und Sprachförderbedarfe, daher musst du auf Einfachheit, Verständlichkeit und Klarheit achten.

## 🎯 **1. Pädagogischer Hintergrund**

Deine Rolle unterstützt die **spielerische Sprachförderung**. Das Ziel ist NICHT, komplexe Satzkonstruktionen zu erzeugen, sondern:

- **einfache, klare Sätze** zu formulieren,
- den **Wortschatz** der Kinder zu erweitern und zu festigen,
- **Selbstwirksamkeit und Stolz** zu fördern,
- die **kreative Fantasie** der Kinder anzuregen,
- das **soziale Gemeinschaftsgefühl** durch gemeinsame Geschichten zu stärken.

## 🏫 **2. Worldbuilding (Unser OGS-Schulhof)**

Die Geschichten spielen auf dem Gelände der **OGS (offener Ganztagsschule)**, das mehrere Außenbereiche umfasst:

- **Oberer Schulhof (Hauptbereich):** Rote Fläche (Kletterwand, Tischtennisplatte, Holzklettergerüst, Bänke), Geräteschuppen (Fahrzeuge, Sandspielzeug), Spielfelder (Basketball, Fußball, Hüpfspiele), Sandkasten, Grünflächen (Bäume, Büsche).
- **Überdachte Außenbereiche:** Durchgang, Pausenbereiche.

Nutze diese Details, um die Umgebung authentisch einzubinden.

## 👩‍🚀 **3. Spielprinzip, Ablauf & Struktur der Inputs**

Das Spiel besteht aus mehreren Runden. In jeder Runde haben Kinder unterschiedliche Rollen und liefern Inputs. Du erhältst die Inputs aller Rollen für die aktuelle Runde sowie den vorherigen Satz der Geschichte (falls vorhanden).

**Rollen und ihre Inputs:**

| Rolle             | Aufgabe                                               | Beispielinput (vereinfacht für Prompt)              | Pflicht?                                   |
|-------------------|-------------------------------------------------------|------------------------------------------------------|--------------------------------------------|
| **Story-God** | Wählt Wo (Ort), Was (Aktion), Wie (Beschreibung)      | Wo: Sandkasten, Was: spielen, Wie: glücklich       | **Ja, alle 3** (falls gewählt)             |
| **Nomen-Wächter** | Wählt 1–2 Nomen                                       | Nomen: Baum, Hund                                    | **Ja, min. 1** (falls gewählt)             |
| **Verben-Wächter**| Wählt 1–2 Verben                                      | Verben: laufen                                       | **Ja, min. 1** (falls gewählt)             |
| **Adjektiv-Wächter**| Wählt 1–2 Adjektive                                 | Adjektive: bunt                                      | **Ja, min. 1** (falls gewählt)             |
| **Character-God** | Wählt Charaktere (max. 5, 1 Änderung pro Runde)     | Aktive Charaktere: Max, Emma                         | Charaktere beeinflussen die Story         |

**Wichtige Hinweise für dich:**

- **Pflichtwörter:** Baue ALLE von den Kindern ausgewählten Wörter (**Wo, Was, Wie, Nomen, Verben, Adjektive**) sinnvoll und gut erkennbar in den Satz ein.
- **Fehlende Wörter:** Wenn eine Rolle (außer Character-God) keine Wörter liefert (sehr unwahrscheinlich durch die Spiellogik), fülle die Lücke kreativ und kindgerecht auf Basis der anderen Inputs.
- **Charaktere:** Beziehe die aktuell aktiven Charaktere in die Handlung ein.
- **Kontext:** Der neue Satz muss logisch an den vorherigen Satz anknüpfen (falls vorhanden).

## 🎈 **4. Deine Ausdrucksweise**

- **Einfach und verständlich:** Kurze, klare Sätze (max. 10–15 Wörter). Verwende einfache Hauptsätze.
- **Kindgerecht & fantasievoll:** Tiere dürfen sprechen, Gegenstände können magisch sein, Abenteuer willkommen. Nutze die Schulhof-Umgebung.
- **Worttreue:** Verwende die gewählten Wörter möglichst exakt. Leichte grammatikalische Anpassungen (z.B. Konjugation von Verben) sind erlaubt und erwünscht.

## ⚠️ **5. Einschränkungen & Regeln**

- **Keine Gewalt, nichts Gruseliges.** Freundlich, lustig und positiv bleiben.
- **Keine komplexen Fachbegriffe.**
- **Geschlecht und Kultur:** Neutral, inklusiv und kulturell sensibel.

## 📌 **6. Erster Satz & Folgesätze**

- Wenn kein vorheriger Satz angegeben ist, beginne die Geschichte mit einem einleitenden Satz, der die Inputs der ersten Runde verwendet.
- Wenn ein vorheriger Satz angegeben ist, knüpfe daran an.

## 📝 **7. Ausgabeformat**

- **Gib NUR den neu generierten Satz aus.** Keine Erklärungen, keine Formatierung, keine Anführungszeichen drumherum.

**Beispiel:**
Input: Wo: Kletterwand, Was: klettern, Wie: hoch, Nomen: Seil, Verben: ziehen, Adjektive: stark, Charaktere: Paul, Lina, Vorheriger Satz: null
Output: Paul und Lina klettern hoch an der Kletterwand und ziehen stark am roten Seil.;;
`;

// Konfiguration für Gemini
const generationConfig = {
    temperature: 0.7, // Etwas kreativer
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 200, // Begrenzt die Satzlänge
    responseMimeType: "text/plain",
};

// Sicherheitseinstellungen
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

if (apiKey) {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-thinking-exp-01-21", // Oder "gemini-1.5-pro"
            systemInstruction: systemInstruction,
            safetySettings: safetySettings,
            generationConfig: generationConfig // Globale generationConfig hier
        });
        console.log("Gemini-Client erfolgreich initialisiert.");
    } catch (error) {
        console.error("Fehler bei der Initialisierung des Gemini-Clients:", error);
        model = null; // Sicherstellen, dass model null ist bei Fehler
    }
} else {
    console.warn("ACHTUNG: Kein GEMINI_API_KEY gesetzt. KI-Funktion ist deaktiviert.");
}

// ==============================
//  4) Standard-Wortlisten
// ==============================
// Für Story-God
const DEFAULT_WO = ["Kletterwand", "Tischtennisplatte", "Holzklettergerüst", "Bank", "Geräteschuppen", "Sandkasten", "Baum", "Busch", "Rote Fläche", "Spielfeld", "Durchgang", "Schulhof", "Klassenzimmer"];
const DEFAULT_WAS = ["klettern", "spielen", "laufen", "springen", "werfen", "fangen", "sitzen", "essen", "trinken", "lachen", "rutschen", "schaukeln", "wippen", "hüpfen", "malen", "lesen", "singen", "tanzen", "verstecken", "suchen", "balancieren", "rollen", "flüstern", "rufen", "bauen"];
const DEFAULT_WIE = ["glücklich", "schnell", "langsam", "leise", "laut", "vorsichtig", "gemeinsam", "alleine", "lustig", "hoch", "tief", "bunt", "heimlich", "mutig", "freundlich"];

// Für Wächter-Rollen
const DEFAULT_NOMEN = ["Ball", "Seil", "Reifen", "Kreide", "Hüpfburg", "Rutsche", "Schaukel", "Wippe", "Basketballkorb", "Fußballtor", "Springseil", "Federball", "Frisbee", "Picknicktisch", "Sonnenschirm", "Wasserbrunnen", "Roller", "Dreirad", "Buch", "Stift", "Blatt", "Sonne", "Wolke", "Wind", "Vogel"];
const DEFAULT_VERBEN = ["kicken", "schieben", "ziehen", "helfen", "fragen", "antworten", "zeigen", "finden", "verlieren", "warten", "träumen", "denken", "wünschen", "probieren", "malen"];
const DEFAULT_ADJEKTIVE = ["rot", "groß", "klein", "müde", "fröhlich", "traurig", "nass", "trocken", "warm", "kalt", "sonnig", "windig", "weich", "hart", "glatt", "rau", "sauber", "neu", "alt", "schön", "spannend", "geheimnisvoll", "magisch", "stark", "schwach"];

const DEFAULT_CHARACTERS = ["Max", "Paul", "Leon", "Finn", "Noah", "Ben", "Elias", "Felix", "Jonas", "Luis", "Emma", "Mia", "Hannah", "Sophia", "Lina", "Lea", "Emilia", "Marie", "Lena", "Anna"];
const DEFAULT_MAX_ROUNDS = 5; // Standardanzahl an Runden

// ==============================
//  5) Globale Speicherstruktur
// ==============================
const activeRooms = new Map();

// ==============================
//  6) Hilfsfunktionen
// ==============================
function generateRoomCode() {
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString();
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            throw new Error("Konnte keinen einzigartigen Raumcode generieren.");
        }
    } while (activeRooms.has(code));
    return code;
}

// Wrapper, um Fehler abzufangen und sicherzustellen, dass ein String zurückgegeben wird
async function generateSentenceWithGeminiSafe(chatSession, prompt) {
    const fallbackSentence = "Die KI konnte leider keinen Satz bilden. Versucht es noch einmal!";
    if (!chatSession) {
        console.warn("Keine Chat-Session verfügbar: Standard-Satz wird zurückgegeben.");
        return fallbackSentence;
    }
    console.log("Sende Prompt an Gemini:", prompt);
    try {
        // Keine History übergeben, da der Kontext im Prompt steht
        const result = await chatSession.sendMessage(prompt);

        // Check, ob die Antwort blockiert wurde
        if (!result.response) {
             console.error("Gemini API-Antwort wurde blockiert oder ist leer.");
             try {
                 // Versuch, den Grund für die Blockierung zu loggen (falls vorhanden)
                 const blockReason = result.response?.promptFeedback?.blockReason;
                 const safetyRatings = result.response?.candidates?.[0]?.safetyRatings;
                 console.error("Blockierungsgrund:", blockReason);
                 console.error("Sicherheitsbewertungen:", safetyRatings);
             } catch (logError) {
                 console.error("Zusätzlicher Fehler beim Loggen der Blockierungsdetails:", logError);
             }
             return "Die KI konnte diesen Satz nicht bilden. Bitte wählt andere Wörter.";
        }

        const response = result.response;
        const text = response.text();

        if (!text || typeof text !== 'string' || text.trim() === '') {
             console.error("Leere oder ungültige Antwort von Gemini:", text);
             return fallbackSentence;
        }

        console.log("Gemini Antwort:", text.trim());
        // Entferne mögliche umschließende Anführungszeichen
        return text.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error("Fehler beim Aufrufen der Gemini API:", error);
        // Detailliertere Fehlermeldung loggen, falls verfügbar
        if (error.response && error.response.promptFeedback) {
            console.error("Gemini Prompt Feedback:", error.response.promptFeedback);
        }
        return fallbackSentence;
    }
}


// ==============================
//  7) Routing & Static Files
// ==============================
// Stelle sicher, dass das 'public'-Verzeichnis existiert und deine statischen Dateien enthält
app.use(express.static(path.join(__dirname, 'public')));

// Route für die Socket.IO-Client-Bibliothek
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
});

// Hauptroute für die index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==============================
//  8) Socket.IO-Logik
// ==============================
io.on('connection', (socket) => {
    console.log('Ein Benutzer hat sich verbunden:', socket.id);

    socket.on('setUsername', (username) => {
        // Einfache Bereinigung des Benutzernamens
        const cleanUsername = username.trim().substring(0, 20); // Max 20 Zeichen
        if (!cleanUsername) {
            return socket.emit('error message', 'Ungültiger Benutzername.');
        }
        socket.data.username = cleanUsername;
        socket.emit('username set');
        console.log(`Benutzername '${socket.data.username}' gesetzt für Socket ${socket.id}`);
    });

    socket.on('create room', () => {
        if (!socket.data.username) {
            return socket.emit('error message', 'Bitte zuerst einen Namen wählen.');
        }
        try {
            const roomCode = generateRoomCode();
            const gmSocketId = socket.id;

            // Initialisiere eine neue Chat-Session für den Raum, falls das Modell verfügbar ist
             let roomChatSession = null;
             if (model) {
                 try {
                     roomChatSession = model.startChat({
                         // generationConfig, // Wird jetzt direkt beim sendMessage verwendet
                         // safetySettings,   // Wird jetzt direkt beim sendMessage verwendet
                         history: [] // Startet mit leerer History
                     });
                     console.log(`Gemini Chat-Session für Raum ${roomCode} gestartet.`);
                 } catch (chatError) {
                     console.error(`Fehler beim Starten der Chat-Session für Raum ${roomCode}:`, chatError);
                 }
             } else {
                 console.warn(`Kein KI-Modell verfügbar für Raum ${roomCode}.`);
             }


            activeRooms.set(roomCode, {
                players: [],
                gmSocketId: gmSocketId,
                configuration: {
                    wo: [...DEFAULT_WO],
                    was: [...DEFAULT_WAS],
                    wie: [...DEFAULT_WIE],
                    nomen: [...DEFAULT_NOMEN],
                    verben: [...DEFAULT_VERBEN],
                    adjektive: [...DEFAULT_ADJEKTIVE],
                    characters: [...DEFAULT_CHARACTERS],
                    maxRounds: DEFAULT_MAX_ROUNDS
                },
                story: [], // Wird Array von { round, sentence, contributions: [{ word, playerId, role }] }
                roundInputs: {}, // Wird Map<role, { inputData, playerId }>
                currentRound: 0, // Startet bei 0, wird 1 beim Spielstart
                gameState: 'lobby', // 'lobby', 'playing', 'finished'
                chatSession: roomChatSession, // Speichert die Chat-Session pro Raum
                activeCharacters: [] // Aktive Charaktere der Runde
            });
            console.log(`Raum ${roomCode} erstellt von GM ${socket.data.username} (${gmSocketId}).`);

            joinRoomLogic(socket, roomCode); // Logik zum Beitreten ausgelagert
            socket.emit('room created', roomCode); // Nur an den Ersteller

        } catch (error) {
            console.error("Fehler beim Erstellen des Raums:", error);
            socket.emit('error message', 'Fehler beim Erstellen des Raums.');
        }
    });

    socket.on('join room', (roomCode) => {
        if (!socket.data.username) {
            return socket.emit('error message', 'Bitte zuerst einen Namen wählen.');
        }
        const upperRoomCode = roomCode.trim().toUpperCase();
        if (!/^[A-Z0-9]{5}$/.test(upperRoomCode)) {
             return socket.emit('error message', 'Ungültiger Raum-Code.');
        }

        if (activeRooms.has(upperRoomCode)) {
            const room = activeRooms.get(upperRoomCode);
            // Prüfe, ob Spieler schon drin ist
            if (room.players.some(p => p.id === socket.id)) {
                return socket.emit('error message', 'Du bist bereits in diesem Raum.');
            }
            // Prüfe, ob das Spiel schon läuft
             if (room.gameState !== 'lobby') {
                 return socket.emit('error message', 'Das Spiel in diesem Raum läuft bereits.');
             }

            joinRoomLogic(socket, upperRoomCode); // Logik zum Beitreten ausgelagert
            socket.emit('joined room', upperRoomCode); // Nur an den Beitreter

        } else {
            socket.emit('error message', `Raum ${upperRoomCode} wurde nicht gefunden.`);
        }
    });

    function joinRoomLogic(socket, roomCode) {
        const room = activeRooms.get(roomCode);
        if (!room) return; // Sollte nicht passieren, aber sicher ist sicher

        socket.join(roomCode);
        socket.roomCode = roomCode; // Wichtig: Raumcode am Socket speichern

        const playerInfo = { id: socket.id, username: socket.data.username, roles: [] };
        room.players.push(playerInfo);

        console.log(`${socket.data.username} (${socket.id}) ist Raum ${roomCode} beigetreten.`);
        socket.emit('nachricht_vom_server', `Willkommen in Raum ${roomCode}, ${socket.data.username}!`);
        socket.to(roomCode).emit('nachricht_vom_server', `${socket.data.username} hat den Raum betreten.`);

        // Konfiguration an den neu beigetretenen Spieler senden
        socket.emit('update configuration', room.configuration);

        // Aktualisierte Spielerliste an alle im Raum senden
        updateAndSendPlayerList(roomCode);
    }

    function updateAndSendPlayerList(roomCode) {
        const room = activeRooms.get(roomCode);
        if (!room) return;
        const playersToSend = room.players.map(p => ({
            id: p.id,
            username: p.username,
            isGM: p.id === room.gmSocketId,
            // roles: p.roles // Rollen werden separat gesendet
        }));
        io.to(roomCode).emit('update player list', playersToSend);
    }


    socket.on('configure room', (configData) => {
        if (!socket.roomCode || !activeRooms.has(socket.roomCode)) return;
        const room = activeRooms.get(socket.roomCode);
        if (room.gmSocketId !== socket.id) {
            return socket.emit('error message', 'Nur der Spielleiter kann die Konfiguration ändern.');
        }
        if (room.gameState !== 'lobby') {
             return socket.emit('error message', 'Konfiguration kann nur vor Spielbeginn geändert werden.');
        }

        // Bereinigung und Validierung der Konfigurationsdaten
        const cleanConfig = {
            wo: sanitizeStringArray(configData.wo, DEFAULT_WO),
            was: sanitizeStringArray(configData.was, DEFAULT_WAS),
            wie: sanitizeStringArray(configData.wie, DEFAULT_WIE),
            nomen: sanitizeStringArray(configData.nomen, DEFAULT_NOMEN),
            verben: sanitizeStringArray(configData.verben, DEFAULT_VERBEN),
            adjektive: sanitizeStringArray(configData.adjektive, DEFAULT_ADJEKTIVE),
            characters: sanitizeStringArray(configData.characters, DEFAULT_CHARACTERS),
            maxRounds: sanitizeNumber(configData.maxRounds, DEFAULT_MAX_ROUNDS, 1, 20) // Min 1, Max 20 Runden
        };

        room.configuration = cleanConfig;
        console.log(`Raum ${socket.roomCode} konfiguriert von GM ${socket.data.username}:`, room.configuration);
        // An GM bestätigen
        socket.emit('configuration saved', room.configuration);
        // An alle im Raum senden (damit sie die aktuellen Listen sehen)
        io.to(socket.roomCode).emit('update configuration', room.configuration);
    });

    // Hilfsfunktionen zur Bereinigung der Konfiguration
    function sanitizeStringArray(input, defaultArray) {
        if (!Array.isArray(input) || input.length === 0) {
            return [...defaultArray];
        }
        const cleaned = input.map(item => typeof item === 'string' ? item.trim() : '').filter(item => item);
        return cleaned.length > 0 ? cleaned : [...defaultArray];
    }

    function sanitizeNumber(input, defaultValue, min = 1, max = Infinity) {
        const num = parseInt(input, 10);
        if (isNaN(num) || num < min || num > max) {
            return defaultValue;
        }
        return num;
    }

    socket.on('start game', () => {
        if (!socket.roomCode || !activeRooms.has(socket.roomCode)) return;
        const room = activeRooms.get(socket.roomCode);

        if (room.gmSocketId !== socket.id) {
            return socket.emit('error message', 'Nur der Spielleiter kann das Spiel starten.');
        }
        if (room.gameState !== 'lobby') {
             return socket.emit('error message', 'Das Spiel läuft bereits oder ist beendet.');
        }
         // Mindestens 2 Spieler benötigt, um alle Rollen sinnvoll zu verteilen? Oder GM spielt mit? PDF sagt nichts. Wir erlauben es mal ab 1 Spieler.
         if (room.players.length < 1) {
             return socket.emit('error message', 'Es wird mindestens 1 Spieler benötigt, um das Spiel zu starten.');
         }

        console.log(`Spiel in Raum ${socket.roomCode} wird von GM ${socket.data.username} gestartet.`);
        room.gameState = 'playing';
        room.currentRound = 1;
        room.story = []; // Alte Story löschen
        room.activeCharacters = []; // Startet ohne Charaktere? Oder GM wählt initiale? PDF unklar. Starten wir leer.
        room.roundInputs = {}; // Eingaben zurücksetzen

         // Initialisiere oder resette die Chat-Session hier, falls nötig
         if (model && !room.chatSession) {
             try {
                 room.chatSession = model.startChat({ history: [] });
                 console.log(`Chat-Session für Raum ${roomCode} beim Spielstart initialisiert.`);
             } catch (chatError) {
                 console.error(`Fehler beim Initialisieren der Chat-Session für Raum ${roomCode}:`, chatError);
             }
         } else if (room.chatSession) {
              // Optional: Verlauf löschen bei Neustart?
              room.chatSession.history = [];
              console.log(`Chat-Verlauf für Raum ${socket.roomCode} zurückgesetzt.`);
         }


        // Rollen zuweisen
        assignRoles(room.players); // Sendet 'roles assigned' an jeden Spieler

        // Spielstart an alle signalisieren und erste Runde starten
        io.to(socket.roomCode).emit('game started');
        io.to(socket.roomCode).emit('start next round', {
            roundNumber: room.currentRound,
            activeCharacters: room.activeCharacters // Leeres Array für Runde 1
        });
        console.log(`Raum ${socket.roomCode}: Spiel gestartet, Runde ${room.currentRound}.`);
    });

   socket.on('submitRoundInput', async (inputData, callback) => {
       if (!socket.roomCode || !activeRooms.has(socket.roomCode)) {
           console.error(`Fehler: Raum ${socket.roomCode} nicht gefunden (Socket: ${socket.id})`);
           return callback({ error: 'Raum nicht gefunden oder Spiel nicht aktiv.' });
       }
       const room = activeRooms.get(socket.roomCode);

       if (room.gameState !== 'playing') {
            console.warn(`Eingabe von ${socket.data.username} empfangen, aber Spiel ist nicht aktiv (Status: ${room.gameState}).`);
            return callback({ error: 'Das Spiel ist nicht aktiv.' });
       }

       const player = room.players.find(p => p.id === socket.id);
       if (!player) {
           console.error(`Fehler: Spieler ${socket.id} nicht im Raum ${socket.roomCode} gefunden.`);
           return callback({ error: 'Spieler nicht gefunden.' });
       }

       const role = inputData.role;
       if (!player.roles.includes(role)) {
           console.warn(`Spieler ${socket.data.username} versuchte, für Rolle ${role} einzureichen, hat diese aber nicht.`);
           return callback({ error: 'Du hast diese Rolle nicht.' });
       }

       // Validierung der Eingaben basierend auf der Rolle
       let isValid = true;
       let submittedWords = []; // Für die Speicherung mit PlayerID
       switch (role) {
           case 'Story-God':
               if (!inputData.words || typeof inputData.words.wo !== 'string' || typeof inputData.words.was !== 'string' || typeof inputData.words.wie !== 'string' || !inputData.words.wo || !inputData.words.was || !inputData.words.wie) {
                   isValid = false;
                   callback({ error: 'Story-God muss Wo, Was und Wie auswählen.' });
               } else {
                    submittedWords = [
                         { word: inputData.words.wo, role: 'wo'},
                         { word: inputData.words.was, role: 'was'},
                         { word: inputData.words.wie, role: 'wie'}
                    ];
               }
               break;
           case 'Nomen-Wächter':
           case 'Verben-Wächter':
           case 'Adjektiv-Wächter':
               const category = role.split('-')[0].toLowerCase() + (role.includes('Adjektiv') ? 'e' : ''); // nomen, verben, adjektive
               if (!inputData.words || !Array.isArray(inputData.words[category]) || inputData.words[category].length !== 1) {
                isValid = false;
                callback({ error: `Bitte wähle genau ein ${category}.` });
            } else {
                submittedWords = inputData.words[category].map(w => ({ word: w, role: category }));
            }
               break;
           case 'Character-God':
                // Validierung der Charakterauswahl (max 5, 1 Änderung Regel wird im Frontend geprüft, hier nur Basisscheck)
               if (!Array.isArray(inputData.characters) || inputData.characters.length > 5) {
                   isValid = false;
                   callback({ error: 'Ungültige Charakterauswahl.' });
               }
                // Keine 'submittedWords' für Charakter-Gott im Sinne von Satzbausteinen
                // Aber wir speichern die Auswahl
               break;
           default:
               isValid = false;
               callback({ error: 'Unbekannte Rolle.' });
       }

       if (!isValid) return; // Callback wurde bereits mit Fehler aufgerufen

       // Speichere die validierte Eingabe MIT PlayerID
       if (room.roundInputs[role]) {
            // Normalerweise sollte das nicht passieren, da der Button deaktiviert wird.
            console.warn(`Rolle ${role} hat bereits eine Eingabe für Runde ${room.currentRound} gemacht.`);
            // return callback({ error: 'Du hast bereits für diese Rolle eingereicht.' }); // Optional: Erneut erlauben?
       }
       room.roundInputs[role] = { inputData, playerId: socket.id, submittedWords };
       console.log(`Raum ${socket.roomCode}: Eingabe von ${socket.data.username} (${socket.id}) für Rolle ${role} in Runde ${room.currentRound} gespeichert.`);

       // Prüfen, ob alle Rollen, die in dieser Runde *vergeben* sind, Eingaben gemacht haben
       const assignedRolesInRoom = new Set(room.players.flatMap(p => p.roles));
       const receivedRoles = Object.keys(room.roundInputs);

       // Prüfe, ob alle *zugewiesenen* Rollen ihre Eingaben gemacht haben
       // Wichtig: Nicht alle ROLES müssen *immer* vergeben sein (bei <5 Spielern)
       const allAssignedRolesSubmitted = [...assignedRolesInRoom].every(assignedRole => receivedRoles.includes(assignedRole));


       if (allAssignedRolesSubmitted) {
           console.log(`Raum ${socket.roomCode}: Alle Inputs für Runde ${room.currentRound} erhalten. Generiere Satz...`);

           // 1. Sammle alle Beiträge für den Prompt und die spätere Hervorhebung
           let allContributions = []; // Array von { word, playerId, role }
           let promptInputs = {}; // Objekt für den Prompt {wo: '...', was: '...', ... nomen: ['...']}

            // Sammle Charakter Info
            const characterGodInput = room.roundInputs['Character-God'];
            if (characterGodInput) {
                 // Update activeCharacters für die *nächste* Runde (oder diese, je nach Logik)
                 // Hier: Update für diesen Satz
                 room.activeCharacters = characterGodInput.inputData.characters || [];
                 promptInputs.characters = room.activeCharacters;
                 // Füge Charaktere nicht zu 'allContributions' hinzu, da sie nicht direkt im Satz hervorgehoben werden? Oder doch?
                 // Vorerst nicht.
            } else {
                 // Falls kein Character-God zugewiesen war, behalte die alten Charaktere
                 promptInputs.characters = room.activeCharacters;
            }


            // Sammle Wort-Inputs
            ['Story-God', 'Nomen-Wächter', 'Verben-Wächter', 'Adjektiv-Wächter'].forEach(r => {
                if (room.roundInputs[r]) {
                    const { inputData, playerId, submittedWords: wordsWithRole } = room.roundInputs[r];
                    // Füge zur Contribution-Liste hinzu (für spätere Hervorhebung)
                     wordsWithRole.forEach(({ word, role: wordRole }) => {
                         allContributions.push({ word, playerId, role: wordRole }); // 'role' hier ist die Wortart (wo, was, wie, nomen, etc.)
                     });

                    // Füge zum Prompt-Input-Objekt hinzu
                    if (r === 'Story-God') {
                        promptInputs.wo = inputData.words.wo;
                        promptInputs.was = inputData.words.was;
                        promptInputs.wie = inputData.words.wie;
                    } else {
                         const category = wordRole; // nomen, verben, adjektive
                        promptInputs[category] = inputData.words[category];
                    }
                }
             });


           // 2. Baue den Prompt für Gemini
           let prompt = '';
            const previousSentence = room.story.length > 0 ? room.story[room.story.length - 1].sentence : null;

            if (previousSentence) {
                prompt += `Vorheriger Satz: "${previousSentence}"\n\n`;
            } else {
                prompt += `Vorheriger Satz: null\n\n`; // Signalisiert den ersten Satz
            }

            prompt += `Aktive Charaktere: ${promptInputs.characters && promptInputs.characters.length > 0 ? promptInputs.characters.join(', ') : 'Keine'}\n`;
            prompt += `Beiträge der Kinder:\n`;
            if (promptInputs.wo) prompt += `- Story-God: Wo [${promptInputs.wo}], Was [${promptInputs.was}], Wie [${promptInputs.wie}]\n`;
            if (promptInputs.nomen) prompt += `- Nomen-Wächter: Nomen [${promptInputs.nomen.join(', ')}]\n`;
            if (promptInputs.verben) prompt += `- Verben-Wächter: Verben [${promptInputs.verben.join(', ')}]\n`;
            if (promptInputs.adjektive) prompt += `- Adjektiv-Wächter: Adjektive [${promptInputs.adjektive.join(', ')}]\n`;

           prompt += `\nGeneriere den ${previousSentence ? 'nächsten' : 'ersten'} Satz der Geschichte. Baue alle Wörter aus den Beiträgen (Wo, Was, Wie, Nomen, Verben, Adjektive) sinnvoll ein. Beziehe die Charaktere mit ein. Knüpfe an den vorherigen Satz an (falls vorhanden). Gib NUR den Satz aus.`;

           // 3. Rufe Gemini auf
           const generatedSentence = await generateSentenceWithGeminiSafe(room.chatSession, prompt);

           // 4. Speichere das Ergebnis
           const storyEntry = {
               round: room.currentRound,
               sentence: generatedSentence,
               contributions: allContributions // Speichert [{ word, playerId, role }]
           };
           room.story.push(storyEntry);

           // 5. Sende Ergebnis an alle
           io.to(socket.roomCode).emit('round result', {
               round: room.currentRound,
               sentence: generatedSentence,
               contributions: allContributions // Sende auch Contributions für sofortige Anzeige? Oder erst am Ende? Senden wir sie mal mit.
           });
           console.log(`Raum ${socket.roomCode}: Runde ${room.currentRound} Ergebnis gesendet: "${generatedSentence}"`);

           // 6. Bereite nächste Runde vor oder beende Spiel
           room.roundInputs = {}; // Eingaben für die nächste Runde zurücksetzen
           room.currentRound++;
           const maxRounds = room.configuration.maxRounds;

           if (room.currentRound > maxRounds) {
               // Spielende
               room.gameState = 'finished';
               console.log(`Raum ${socket.roomCode}: Spiel beendet nach ${maxRounds} Runden.`);
               io.to(socket.roomCode).emit('gameOver', {
                   finalStory: room.story // Enthält jetzt { round, sentence, contributions }
               });
               // Optional: Raum löschen oder für neue Runde vorbereiten? Vorerst lassen wir ihn bestehen.
           } else {
               // Nächste Runde
               console.log(`Raum ${socket.roomCode}: Starte nächste Runde (${room.currentRound}). Rotiere Rollen...`);
               assignRoles(room.players); // Sendet 'roles assigned'
               io.to(socket.roomCode).emit('start next round', {
                   roundNumber: room.currentRound,
                   activeCharacters: room.activeCharacters // Die gerade vom Character-God aktualisierten
               });
               console.log(`Raum ${socket.roomCode}: 'start next round' für Runde ${room.currentRound} gesendet.`);
           }
       } else {
           // Noch nicht alle Eingaben erhalten
           const missingRoles = [...assignedRolesInRoom].filter(assignedRole => !receivedRoles.includes(assignedRole));
           console.log(`Raum ${socket.roomCode}: Warte noch auf Eingaben von: ${missingRoles.join(', ')}`);
           socket.emit('nachricht_vom_server', 'Deine Auswahl wurde gespeichert. Warte auf die anderen Rollen...');
       }

       callback({ success: true }); // Bestätigung an den Client, dass die Eingabe ok war
   });


    socket.on('disconnect', () => {
        console.log(`Benutzer ${socket.data.username || socket.id} hat die Verbindung getrennt.`);
        if (socket.roomCode && activeRooms.has(socket.roomCode)) {
            const roomCode = socket.roomCode;
            const room = activeRooms.get(roomCode);

            const playerIndex = room.players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const disconnectedPlayer = room.players.splice(playerIndex, 1)[0];
                console.log(`${disconnectedPlayer.username} (${socket.id}) hat Raum ${roomCode} verlassen.`);
                socket.to(roomCode).emit('nachricht_vom_server',
                    `${disconnectedPlayer.username} hat den Raum verlassen.`);

                // Aktualisierte Spielerliste senden
                updateAndSendPlayerList(roomCode);

                // Wenn der Raum leer ist, löschen
                if (room.players.length === 0) {
                    activeRooms.delete(roomCode);
                    console.log(`Raum ${roomCode} wurde gelöscht, da er leer ist.`);
                } else {
                    // Wenn der GM gegangen ist, neuen GM bestimmen (ältester Spieler?)
                    if (socket.id === room.gmSocketId) {
                        room.gmSocketId = room.players[0].id; // Erster Spieler in der Liste wird neuer GM
                        console.log(`${room.players[0].username} ist neuer GM in Raum ${roomCode}.`);
                        // GM-Status an alle senden (via update player list)
                        updateAndSendPlayerList(roomCode);
                        // Neuen GM informieren
                        io.to(room.gmSocketId).emit('nachricht_vom_server', 'Du bist jetzt der neue Spielleiter!');
                         // Wenn das Spiel lief, muss es evtl. abgebrochen werden oder der neue GM kann weitermachen?
                         // Einfachste Lösung: Spiel abbrechen, wenn GM geht? Oder weitermachen lassen.
                         // Wir lassen es weiterlaufen, der neue GM kann aber nichts mehr konfigurieren.
                         if (room.gameState === 'playing') {
                              io.to(roomCode).emit('nachricht_vom_server', `Das Spiel geht weiter, ${room.players[0].username} ist neuer Spielleiter.`);
                         } else if (room.gameState === 'lobby') {
                              // Dem neuen GM den Start-Button etc. zeigen
                               io.to(room.gmSocketId).emit('become new GM'); // Signal für Frontend
                         }
                    }
                     // Wenn das Spiel lief und nun zu wenige Spieler da sind?
                     // Optional: Spiel abbrechen bei < X Spielern?
                     // if (room.gameState === 'playing' && room.players.length < MIN_PLAYERS_TO_CONTINUE) { ... }
                }
            }
        }
    });

    socket.on('error', (err) => {
        console.error(`Socket Error von ${socket.id}:`, err);
        // Optional: Dem Client eine generische Fehlermeldung senden
        socket.emit('error message', 'Ein interner Fehler ist aufgetreten.');
    });
});

// ==============================
//  9) Serverstart
// ==============================
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
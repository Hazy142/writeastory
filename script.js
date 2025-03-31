document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // === Zustand ===
    let currentRoomCode = null;
    let isGM = false;
    let myRoles = [];
    let availableWords = { wo: [], was: [], wie: [], nomen: [], verben: [], adjektive: [], characters: [] };
    let selectedWords = { wo: null, was: null, wie: null, nomen: [], verben: [], adjektive: [] };
    let selectedCharacters = [];
    let initialCharactersForRound = []; // Für Charakter-Gott-Regel
    let playerColors = {}; // Map<playerId, color>
    let myPlayerId = null; // Eigene Socket-ID

    const gameState = {
        state: 'init', // init, lobby, playing, finished
        currentRound: 0,
        isSelectionActive: false,
        hasSubmittedThisRound: false,
        maxRounds: 5,
        update(changes) {
            Object.assign(this, changes);
            this.updateUI();
        },
        updateUI() {
            updateVisibility();
            updateRoundInfo();
        }
    };

    // === DOM-Elemente ===
    const gameContainer = document.getElementById('gameContainer');
    const benutzerBereich = document.getElementById('benutzerBereich');
    const raumBereich = document.getElementById('raumBereich');
    const spielBereich = document.getElementById('spielBereich');
    const configSection = document.getElementById('configSection');
    const finalStorySection = document.getElementById('finalStorySection');

    const usernameInput = document.getElementById('usernameInput');
    const nameButton = document.getElementById('nameButton');
    const createRoomButton = document.getElementById('createRoomButton');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const joinRoomButton = document.getElementById('joinRoomButton');
    const roomError = document.getElementById('roomError');

    const roomInfo = document.getElementById('roomInfo');
    const roundInfo = document.getElementById('roundInfo');
    const playerList = document.getElementById('playerList');
    const startButton = document.getElementById('startButton');
    const messagesList = document.getElementById('messagesList');
    const storyProgress = document.getElementById('storyProgress');
    const finalStoryList = document.getElementById('finalStoryList');

    // Config Inputs
    const woInput = document.getElementById('woInput');
    const wasInput = document.getElementById('wasInput');
    const wieInput = document.getElementById('wieInput');
    const nomenInput = document.getElementById('nomenInput');
    const verbenInput = document.getElementById('verbenInput');
    const adjektiveInput = document.getElementById('adjektiveInput');
    const charactersInput = document.getElementById('charactersInput');
    const maxRoundsInput = document.getElementById('maxRoundsInput');
    const saveConfigButton = document.getElementById('saveConfigButton');

    // Selection Area
    const selectionArea = document.getElementById('selectionArea');
    const characterSelection = document.getElementById('characterSelection');
    const charactersList = document.getElementById('charactersList');
    const storyGodSelection = document.getElementById('storyGodSelection');
    const woSelection = document.getElementById('woSelection');
    const wasSelection = document.getElementById('wasSelection');
    const wieSelection = document.getElementById('wieSelection');
    const wordSelectionSection = document.getElementById('wordSelectionSection'); // Wächter Bereich
    const nomenWachterSelection = document.getElementById('nomenWachterSelection');
    const verbenWachterSelection = document.getElementById('verbenWachterSelection');
    const adjektiveWachterSelection = document.getElementById('adjektiveWachterSelection');
    const confirmSelectionButton = document.getElementById('confirmSelectionButton');
    const selectionError = document.getElementById('selectionError');
     const waitingMessage = document.getElementById('waitingMessage');

    // === Farbpalette ===
    // Quelle: https://coolors.co/palettes/trending
    const playerColorPalette = [
        '#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500',
        '#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'
    ];
    let colorIndex = 0;

    // === Hilfsfunktionen ===
    function addServerMessage(message, type = 'info') {
        const item = document.createElement('li');
        item.textContent = message;
        if (type === 'error') {
            item.style.color = 'red';
            item.style.fontWeight = 'bold';
        } else if (type === 'success') {
            item.style.color = 'green';
        } else if (type === 'system') {
             item.style.fontStyle = 'italic';
             item.style.color = '#0056b3';
        }
        messagesList.appendChild(item);
        messagesList.scrollTop = messagesList.scrollHeight; // Auto-scroll
    }

    function updateVisibility() {
        // Bereiche ein-/ausblenden
        benutzerBereich.classList.toggle('hidden', gameState.state !== 'init');
        raumBereich.classList.toggle('hidden', gameState.state !== 'username_set');
        spielBereich.classList.toggle('hidden', gameState.state !== 'lobby' && gameState.state !== 'playing');
        finalStorySection.classList.toggle('hidden', gameState.state !== 'finished');

        // Lobby-spezifische Elemente
        configSection.classList.toggle('hidden', !(gameState.state === 'lobby' && isGM));
        startButton.classList.toggle('hidden', !(gameState.state === 'lobby' && isGM));

        // Spiel-spezifische Elemente
        selectionArea.classList.toggle('hidden', gameState.state !== 'playing' || !gameState.isSelectionActive);
        confirmSelectionButton.classList.toggle('hidden', gameState.state !== 'playing' || !gameState.isSelectionActive || gameState.hasSubmittedThisRound);
         waitingMessage.classList.toggle('hidden', !(gameState.state === 'playing' && (!gameState.isSelectionActive || gameState.hasSubmittedThisRound)));


        // Rollen-spezifische Auswahlbereiche (nur wenn Auswahl aktiv ist)
        characterSelection.classList.add('hidden');
        storyGodSelection.classList.add('hidden');
        wordSelectionSection.classList.add('hidden'); // Gesamt Wächter
        nomenWachterSelection.classList.add('hidden');
        verbenWachterSelection.classList.add('hidden');
        adjektiveWachterSelection.classList.add('hidden');

        if (gameState.state === 'playing' && gameState.isSelectionActive && !gameState.hasSubmittedThisRound) {
            if (myRoles.includes('Character-God')) characterSelection.classList.remove('hidden');
            if (myRoles.includes('Story-God')) storyGodSelection.classList.remove('hidden');

            const hasWachterRole = myRoles.some(r => ['Nomen-Wächter', 'Verben-Wächter', 'Adjektiv-Wächter'].includes(r));
            if (hasWachterRole) wordSelectionSection.classList.remove('hidden');
            if (myRoles.includes('Nomen-Wächter')) nomenWachterSelection.classList.remove('hidden');
            if (myRoles.includes('Verben-Wächter')) verbenWachterSelection.classList.remove('hidden');
            if (myRoles.includes('Adjektiv-Wächter')) adjektiveWachterSelection.classList.remove('hidden');
        }
    }

    function updateRoundInfo() {
         if (gameState.state === 'playing') {
             roundInfo.textContent = `Runde: ${gameState.currentRound} / ${gameState.maxRounds}`;
         } else {
             roundInfo.textContent = '';
         }
    }

    function resetSelectionUI() {
        // Alle Buttons deselektieren
        document.querySelectorAll('#selectionArea button.selected').forEach(btn => {
            btn.classList.remove('selected');
        });
        // Auswahl-Speicher leeren
        selectedWords = { wo: null, was: null, wie: null, nomen: [], verben: [], adjektive: [] };
        // Charakterauswahl: Behält die Auswahl bei, da sie persistenter ist
        // selectedCharacters = []; // Wird durch 'start next round' gesetzt
        selectionError.textContent = '';
    }

    function populateStoryGodSelection() {
        populateButtonList(woSelection, availableWords.wo, 'wo', 1);
        populateButtonList(wasSelection, availableWords.was, 'was', 1);
        populateButtonList(wieSelection, availableWords.wie, 'wie', 1);
    }

    function populateWachterSelection() {
        populateButtonList(nomenWachterSelection, availableWords.nomen, 'nomen', 1);
        populateButtonList(verbenWachterSelection, availableWords.verben, 'verben', 1);
        populateButtonList(adjektiveWachterSelection, availableWords.adjektive, 'adjektive', 1);
    }

     function populateCharacterSelection() {
         charactersList.innerHTML = ''; // Clear previous buttons
         availableWords.characters.forEach(char => {
             const btn = document.createElement('button');
             btn.textContent = char;
             btn.classList.add('character-button');
             // Markiere initial ausgewählte Charaktere der Runde
             if (selectedCharacters.includes(char)) {
                 btn.classList.add('selected');
             }
             btn.addEventListener('click', () => handleCharacterButtonClick(char, btn));
             charactersList.appendChild(btn);
         });
     }

    function populateButtonList(containerElement, words, category, maxSelection) {
        // Remove category name from ID if needed, find the h4 instead
         const heading = containerElement.querySelector('h4');
         containerElement.innerHTML = ''; // Clear previous buttons
         if (heading) {
              containerElement.appendChild(heading); // Re-add heading
         } else {
              // Fallback: create heading
               const h4 = document.createElement('h4');
               h4.textContent = category.charAt(0).toUpperCase() + category.slice(1);
               containerElement.appendChild(h4);
         }

        if (!Array.isArray(words)) {
            console.error(`Wortliste für Kategorie "${category}" ist kein Array:`, words);
            return;
        }

        words.forEach(word => {
            const btn = document.createElement('button');
            btn.textContent = word;
            btn.dataset.word = word; // Store word in data attribute
            btn.classList.add('word-button', category); // Add category class for styling

            // Add click listener based on category type
            if (['wo', 'was', 'wie'].includes(category)) {
                btn.addEventListener('click', () => selectStoryGodWord(category, word, btn, containerElement));
            } else if (['nomen', 'verben', 'adjektive'].includes(category)) {
                btn.addEventListener('click', () => selectWachterWord(category, word, btn, maxSelection));
            }
            containerElement.appendChild(btn);
        });
    }

    // Auswahl für Story-God (nur 1 pro Kategorie erlaubt)
    function selectStoryGodWord(category, word, clickedBtn, container) {
        if (!myRoles.includes('Story-God')) return;

        const currentSelection = selectedWords[category];
        const buttonsInCategory = container.querySelectorAll('button.word-button');

        if (currentSelection === word) {
            // Deselect
            selectedWords[category] = null;
            clickedBtn.classList.remove('selected');
        } else {
            // Deselect previous button in this category
            buttonsInCategory.forEach(btn => btn.classList.remove('selected'));
            // Select new one
            selectedWords[category] = word;
            clickedBtn.classList.add('selected');
        }
        validateSelection(); // Update error messages if any
    }

    // Auswahl für Wächter (max N pro Kategorie)
    function selectWachterWord(category, word, clickedBtn, maxSelection) {
        const roleMap = { 'nomen': 'Nomen-Wächter', 'verben': 'Verben-Wächter', 'adjektive': 'Adjektiv-Wächter' };
        if (!myRoles.includes(roleMap[category])) return;

        const currentCategorySelection = selectedWords[category]; // Should be an array

        if (currentCategorySelection.includes(word)) {
            // Deselect
            selectedWords[category] = currentCategorySelection.filter(w => w !== word);
            clickedBtn.classList.remove('selected');
        } else {
            // Select if limit not reached
            if (currentCategorySelection.length < maxSelection) {
                selectedWords[category].push(word);
                clickedBtn.classList.add('selected');
            } else {
                selectionError.textContent = `Du kannst nur bis zu ${maxSelection} ${category} auswählen.`;
                 setTimeout(() => { selectionError.textContent = ''; }, 3000);
            }
        }
         validateSelection(); // Update error messages if any
    }

     // Charakterauswahl Logik
     function handleCharacterButtonClick(char, btn) {
         if (!myRoles.includes('Character-God')) return;

         const isSelected = selectedCharacters.includes(char);
         const maxChars = 5;

         // Regel: Runde 1 -> frei wählen bis max. 5
         if (gameState.currentRound === 1) {
             if (isSelected) {
                 selectedCharacters = selectedCharacters.filter(c => c !== char);
                 btn.classList.remove('selected');
             } else {
                 if (selectedCharacters.length < maxChars) {
                     selectedCharacters.push(char);
                     btn.classList.add('selected');
                 } else {
                     selectionError.textContent = `Maximal ${maxChars} Charaktere erlaubt.`;
                     setTimeout(() => { selectionError.textContent = ''; }, 3000);
                 }
             }
         }
         // Regel: Runde > 1 -> max. 1 Änderung (hinzufügen ODER entfernen)
         else {
             let changesMade = 0;
             // Zähle Hinzufügungen
             selectedCharacters.forEach(c => { if (!initialCharactersForRound.includes(c)) changesMade++; });
             // Zähle Entfernungen
             initialCharactersForRound.forEach(c => { if (!selectedCharacters.includes(c)) changesMade++; });

             if (isSelected) { // Versuch zu entfernen
                  const tempSelection = selectedCharacters.filter(c => c !== char);
                  let potentialChanges = 0;
                  tempSelection.forEach(c => { if (!initialCharactersForRound.includes(c)) potentialChanges++; });
                  initialCharactersForRound.forEach(c => { if (!tempSelection.includes(c)) potentialChanges++; });

                  if (potentialChanges <= 1) {
                       selectedCharacters = tempSelection;
                       btn.classList.remove('selected');
                  } else {
                       selectionError.textContent = "Du darfst pro Runde nur einen Charakter hinzufügen oder entfernen.";
                        setTimeout(() => { selectionError.textContent = ''; }, 3000);
                  }

             } else { // Versuch hinzuzufügen
                 if (selectedCharacters.length >= maxChars) {
                     selectionError.textContent = `Maximal ${maxChars} Charaktere erlaubt.`;
                      setTimeout(() => { selectionError.textContent = ''; }, 3000);
                     return;
                 }

                  const tempSelection = [...selectedCharacters, char];
                   let potentialChanges = 0;
                   tempSelection.forEach(c => { if (!initialCharactersForRound.includes(c)) potentialChanges++; });
                   initialCharactersForRound.forEach(c => { if (!tempSelection.includes(c)) potentialChanges++; });

                 if (potentialChanges <= 1) {
                     selectedCharacters.push(char);
                     btn.classList.add('selected');
                 } else {
                     selectionError.textContent = "Du darfst pro Runde nur einen Charakter hinzufügen oder entfernen.";
                     setTimeout(() => { selectionError.textContent = ''; }, 3000);
                 }
             }
         }
          validateSelection(); // Update error messages if any
     }

     // Validiert die aktuelle Auswahl basierend auf den Rollen
     function validateSelection() {
         let isValid = true;
         let errorMsg = "";

         myRoles.forEach(role => {
             switch (role) {
                 case 'Story-God':
                     if (!selectedWords.wo || !selectedWords.was || !selectedWords.wie) {
                         isValid = false;
                         errorMsg += "Story-God: Bitte Wo, Was und Wie auswählen. ";
                     }
                     break;
                 case 'Nomen-Wächter':
                     if (selectedWords.nomen.length < 1 || selectedWords.nomen.length > 2) {
                         isValid = false;
                         errorMsg += "Nomen-Wächter: Bitte 1 Nomen auswählen. ";
                     }
                     break;
                 case 'Verben-Wächter':
                     if (selectedWords.verben.length < 1 || selectedWords.verben.length > 2) {
                         isValid = false;
                         errorMsg += "Verben-Wächter: Bitte 1 Verb auswählen. ";
                     }
                     break;
                 case 'Adjektiv-Wächter':
                     if (selectedWords.adjektive.length < 1 || selectedWords.adjektive.length > 2) {
                         isValid = false;
                         errorMsg += "Adjektiv-Wächter: Bitte 1 Adjektiv auswählen. ";
                     }
                     break;
                 case 'Character-God':
                      // Grundlegende Prüfung (Anzahl), Detailprüfung in handleCharacterButtonClick
                     if (selectedCharacters.length > 5) {
                          isValid = false;
                          errorMsg += "Character-God: Zu viele Charaktere ausgewählt. ";
                     }
                     // Die "1-Änderung"-Regel wird beim Klicken geprüft, nicht erst beim Bestätigen.
                     break;
             }
         });

         selectionError.textContent = errorMsg;
         confirmSelectionButton.disabled = !isValid; // Button nur aktivieren, wenn Auswahl gültig ist
         return isValid;
     }


    // === Event-Listener ===
    nameButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            socket.emit('setUsername', username);
        } else {
            alert('Bitte gib einen Benutzernamen ein!');
        }
    });

    createRoomButton.addEventListener('click', () => {
        socket.emit('create room');
    });

    joinRoomButton.addEventListener('click', () => {
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (roomCode && roomCode.length === 5) {
            socket.emit('join room', roomCode);
            roomError.textContent = '';
        } else {
            roomError.textContent = 'Bitte gib einen 5-stelligen Raum-Code ein.';
        }
    });

    startButton.addEventListener('click', () => {
        if (isGM && gameState.state === 'lobby') {
            socket.emit('start game');
            startButton.disabled = true; // Wird durch State-Update wieder korrekt gesetzt
            startButton.textContent = 'Spiel wird gestartet...';
        }
    });

    saveConfigButton.addEventListener('click', () => {
        if (!isGM || gameState.state !== 'lobby') return;
        const configData = {
             wo: woInput.value.split(',').map(word => word.trim()).filter(word => word),
             was: wasInput.value.split(',').map(word => word.trim()).filter(word => word),
             wie: wieInput.value.split(',').map(word => word.trim()).filter(word => word),
            nomen: nomenInput.value.split(',').map(word => word.trim()).filter(word => word),
            verben: verbenInput.value.split(',').map(word => word.trim()).filter(word => word),
            adjektive: adjektiveInput.value.split(',').map(word => word.trim()).filter(word => word),
            characters: charactersInput.value.split(',').map(char => char.trim()).filter(char => char),
             maxRounds: parseInt(maxRoundsInput.value, 10) || 5
        };
        socket.emit('configure room', configData);
    });

    confirmSelectionButton.addEventListener('click', () => {
        if (!validateSelection()) {
             console.warn("Bestätigungsversuch trotz ungültiger Auswahl.");
             return; // Sollte nicht passieren, da Button disabled ist
        }

        confirmSelectionButton.disabled = true;
        gameState.update({ hasSubmittedThisRound: true }); // UI aktualisieren (versteckt Auswahl, zeigt Warten)

        // Sende die Daten für JEDE deiner Rollen
        myRoles.forEach(role => {
             let submissionData = { role: role };
             let needsSubmission = false;

            switch (role) {
                case 'Story-God':
                    submissionData.words = { wo: selectedWords.wo, was: selectedWords.was, wie: selectedWords.wie };
                     needsSubmission = true;
                    break;
                case 'Nomen-Wächter':
                    submissionData.words = { nomen: selectedWords.nomen };
                     needsSubmission = true;
                    break;
                case 'Verben-Wächter':
                    submissionData.words = { verben: selectedWords.verben };
                     needsSubmission = true;
                    break;
                case 'Adjektiv-Wächter':
                    submissionData.words = { adjektive: selectedWords.adjektive };
                     needsSubmission = true;
                    break;
                case 'Character-God':
                     submissionData.characters = selectedCharacters;
                      needsSubmission = true;
                     break;
            }

             if (needsSubmission) {
                 console.log(`Sende Input für Rolle ${role}:`, submissionData);
                 socket.emit('submitRoundInput', submissionData, (response) => {
                     if (response.error) {
                         addServerMessage(`Fehler beim Senden (${role}): ${response.error}`, 'error');
                         // Bei Fehler: Auswahl wieder ermöglichen?
                         confirmSelectionButton.disabled = false; // Reset button
                          gameState.update({ hasSubmittedThisRound: false });
                     } else {
                         // Erfolgreich gesendet (oder zumindest vom Server angenommen)
                         console.log(`Input für ${role} erfolgreich gesendet.`);
                          // Nachricht "Warte auf andere" wird durch gameState gesteuert
                     }
                 });
             }
        });

        // Lokale Auswahl für die nächste Runde zurücksetzen (wird durch 'start next round' neu gefüllt)
        // resetSelectionUI(); // Reset UI nicht hier, sondern wenn nächste Runde startet
    });


    // === Socket.IO-Ereignisse ===
     socket.on('connect', () => {
         myPlayerId = socket.id;
         console.log('Verbunden mit Server, meine ID:', myPlayerId);
          // Falls man mitten im Spiel neu verbindet, Zustand wiederherstellen? Schwierig.
          // Vorerst: Bei Verbindung immer zum Login.
           gameState.update({ state: 'init' });
     });

    socket.on('username set', () => {
        gameState.update({ state: 'username_set' });
        addServerMessage('Benutzername gesetzt. Wähle oder erstelle einen Raum.', 'success');
        roomError.textContent = ''; // Fehler von vorher löschen
    });

    socket.on('room created', (newRoomCode) => {
        isGM = true;
        currentRoomCode = newRoomCode;
        roomInfo.textContent = `Raum-Code: ${currentRoomCode} (Du bist Spielleiter)`;
        gameState.update({ state: 'lobby' });
        addServerMessage(`Raum ${newRoomCode} erstellt. Warte auf Mitspieler...`, 'system');
    });

    socket.on('joined room', (joinedRoomCode) => {
        isGM = false;
        currentRoomCode = joinedRoomCode;
        roomInfo.textContent = `Raum-Code: ${joinedRoomCode}`;
        gameState.update({ state: 'lobby' });
        addServerMessage(`Raum ${joinedRoomCode} beigetreten. Warte auf Spielstart...`, 'system');
    });

     socket.on('become new GM', () => {
          isGM = true;
          roomInfo.textContent = `Raum-Code: ${currentRoomCode} (Du bist jetzt Spielleiter)`;
          addServerMessage('Der vorherige Spielleiter hat den Raum verlassen. Du bist jetzt der neue Spielleiter!', 'system');
           // Sicherstellen, dass GM-Elemente sichtbar sind (falls im Lobby-State)
           if (gameState.state === 'lobby') {
               gameState.update({}); // Trigger UI update
           }
     });

    socket.on('error message', (message) => {
        if (gameState.state === 'username_set') { // Raum-Fehler
             roomError.textContent = message;
        } else { // Allgemeine Fehler
            addServerMessage(`FEHLER: ${message}`, 'error');
        }
    });

    socket.on('nachricht_vom_server', (nachricht) => {
        addServerMessage(nachricht, 'info');
    });

    socket.on('update player list', (players) => {
        playerList.innerHTML = '';
        players.forEach((player, index) => {
            // Spielerfarbe zuweisen oder abrufen
            if (!playerColors[player.id]) {
                playerColors[player.id] = playerColorPalette[colorIndex % playerColorPalette.length];
                colorIndex++;
            }

            const item = document.createElement('li');
            let text = player.username;
            if (player.id === myPlayerId) text += ' (Du)';
            if (player.isGM) text += ' [GM]';
            item.textContent = text;
            item.style.color = playerColors[player.id]; // Farbe für den Namen
             item.style.fontWeight = 'bold';
            playerList.appendChild(item);
        });
    });

    socket.on('update configuration', (configData) => {
        console.log('Konfiguration vom Server erhalten:', configData);
        availableWords = { ...configData }; // Lokale Kopie der verfügbaren Wörter speichern
        gameState.maxRounds = configData.maxRounds || 5;

        // Update Config Inputs (nur für GM relevant, aber schadet nicht)
        if (isGM) {
             woInput.value = configData.wo.join(', ');
             wasInput.value = configData.was.join(', ');
             wieInput.value = configData.wie.join(', ');
            nomenInput.value = configData.nomen.join(', ');
            verbenInput.value = configData.verben.join(', ');
            adjektiveInput.value = configData.adjektive.join(', ');
            charactersInput.value = configData.characters.join(', ');
             maxRoundsInput.value = configData.maxRounds;
        }

        // Update Auswahlmöglichkeiten falls das Spiel läuft (oder Lobby)
        populateStoryGodSelection();
        populateWachterSelection();
        populateCharacterSelection(); // Baut Buttons neu auf Basis availableWords.characters

         // Update gameState UI (Rundenanzeige)
         gameState.update({});
    });

    socket.on('configuration saved', (configData) => {
        addServerMessage('Konfiguration erfolgreich gespeichert.', 'success');
        // Die 'update configuration' Nachricht wird sowieso an alle gesendet,
        // also muss hier nichts weiter getan werden.
    });


    socket.on('game started', () => {
        addServerMessage("--- Das Spiel beginnt! ---", 'system');
        storyProgress.innerHTML = ''; // Alte Story löschen
        gameState.update({
             state: 'playing',
             // currentRound wird durch 'start next round' gesetzt
        });
    });

    socket.on('roles assigned', (roles) => {
        myRoles = roles;
        addServerMessage(`Deine Rollen für Runde ${gameState.currentRound}: ${roles.join(', ')}`, 'system');

        // Setzt UI zurück und aktiviert Auswahl basierend auf Rollen
        resetSelectionUI();
        gameState.update({
             isSelectionActive: true,
             hasSubmittedThisRound: false
        });
        confirmSelectionButton.disabled = true; // Erst aktivieren, wenn Auswahl gültig ist
         setTimeout(validateSelection, 100); // Kurze Verzögerung, um sicherzustellen, dass die UI bereit ist
    });

    socket.on('start next round', (data) => {
         addServerMessage(`--- Runde ${data.roundNumber} beginnt! ---`, 'system');

         // Wichtig: Aktive Charaktere und initiale Liste für Regel speichern
         selectedCharacters = [...data.activeCharacters]; // Startet mit den Chars der letzten Runde
         initialCharactersForRound = [...data.activeCharacters]; // Für die 1-Änderung-Regel

         // UI/Buttons neu aufbauen (falls Konfiguration sich geändert hat - unwahrscheinlich, aber sicher)
         populateStoryGodSelection();
         populateWachterSelection();
         populateCharacterSelection(); // Baut Buttons neu auf und markiert 'selectedCharacters'

        gameState.update({
            currentRound: data.roundNumber,
            isSelectionActive: false, // Wird durch 'roles assigned' aktiviert
            hasSubmittedThisRound: false
        });
        // 'roles assigned' wird kurz danach vom Server gesendet und aktiviert die Auswahl
    });

    socket.on('round result', (data) => {
        const item = document.createElement('li');
        // Hier noch KEINE Hervorhebung, das passiert erst am Ende
        item.innerHTML = `<span>${data.sentence}</span>`; // Einfaches Span, ohne Hervorhebung
        storyProgress.appendChild(item);
        storyProgress.scrollTop = storyProgress.scrollHeight;

         // Warte auf 'start next round' oder 'gameOver'
         gameState.update({ isSelectionActive: false, hasSubmittedThisRound: false }); // Auswahl beendet
    });

    socket.on('gameOver', (data) => {
         addServerMessage("--- Spiel beendet! ---", 'system');
         gameState.update({ state: 'finished' });

         finalStoryList.innerHTML = ''; // Leere die Liste
         if (data.finalStory && data.finalStory.length > 0) {
             data.finalStory.forEach(entry => {
                 const item = document.createElement('li');
                 let sentenceHTML = entry.sentence; // Start mit dem rohen Satz

                 // Iteriere durch die Beiträge und ersetze Wörter im Satz durch farbige Spans
                 if (entry.contributions && Array.isArray(entry.contributions)) {
                     // Sortiere Beiträge von lang nach kurz, um Teilwort-Ersetzungen zu vermeiden
                     const sortedContributions = [...entry.contributions].sort((a, b) => b.word.length - a.word.length);

                     sortedContributions.forEach(contrib => {
                         const playerColor = playerColors[contrib.playerId] || '#777'; // Fallback-Farbe
                         const wordToHighlight = contrib.word;
                         // Ersetze nur ganze Wörter (case-insensitive, aber behalte Original-Großschreibung im Satz bei)
                          // Regex: \b (Wortgrenze), optional 's' am Ende (Plural etc.), i (case-insensitive)
                          // Ersetzt nur das erste Vorkommen pro Wortbeitrag, um Endlosschleifen bei gleichen Wörtern zu vermeiden
                         const regex = new RegExp(`\\b(${wordToHighlight})\\b`, 'i');
                         if (sentenceHTML.match(regex)) {
                              // Hole das Originalwort aus dem Satz (wegen Groß/Kleinschreibung)
                              const originalWordInSentence = sentenceHTML.match(regex)[1];
                              const highlightedWord = `<span class="highlighted-word" style="background-color: ${playerColor};" title="${contrib.role}: ${wordToHighlight}">${originalWordInSentence}</span>`;
                              sentenceHTML = sentenceHTML.replace(regex, highlightedWord);
                         } else {
                              console.warn(`Wort "${wordToHighlight}" aus Beitrag nicht exakt im Satz gefunden: "${entry.sentence}"`);
                         }
                     });
                 }

                 item.innerHTML = sentenceHTML; // Füge den (potenziell) modifizierten Satz ein
                 finalStoryList.appendChild(item);
             });
         } else {
             finalStoryList.innerHTML = '<li>Keine Geschichte verfügbar.</li>';
         }
    });


    // Initial UI State
    gameState.update({});

}); // END DOMContentLoaded

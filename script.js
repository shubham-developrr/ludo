document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Add initial lobby screen class
    document.body.classList.add('lobby-screen');

    // --- DOM Elements ---
    const lobbyContainer = document.getElementById('lobby-container');
    const createGameBtn = document.getElementById('create-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const lobbyError = document.getElementById('lobby-error');
    const roomInfo = document.getElementById('room-info');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const playerList = document.getElementById('player-list');
    const startGameBtn = document.getElementById('start-game-btn');

    // Local game elements
    const onlineModeBtn = document.getElementById('online-mode-btn');
    const localModeBtn = document.getElementById('local-mode-btn');
    const onlineMode = document.getElementById('online-mode');
    const localMode = document.getElementById('local-mode');
    const playerCountSelect = document.getElementById('player-count');
    const playerTypeSelects = document.querySelectorAll('.player-type');
    const playerConfigs = document.querySelectorAll('.player-config');
    const startLocalGameBtn = document.getElementById('start-local-game-btn');

    const gameContainer = document.querySelector('.game-container');
    const board = document.getElementById('ludo-board');
    const dice = document.getElementById('dice');
    const status = document.getElementById('game-status');
    const winnerOverlay = document.getElementById('winner-overlay');
    const winnerMessage = document.getElementById('winner-message');
    const restartBtn = document.getElementById('restart-btn');

    // --- Client State ---
    let myPlayerInfo = null;
    let currentHostId = null;
    let localGame = null;
    let isLocalMode = false;

    // --- Sound Manager ---
    const soundManager = new SoundManager();

    // ################# LOBBY LOGIC #################

    // Mode switching
    function switchToOnlineMode() {
        onlineModeBtn.classList.add('active');
        localModeBtn.classList.remove('active');
        onlineMode.style.display = 'block';
        localMode.style.display = 'none';
        isLocalMode = false;
    }

    function switchToLocalMode() {
        localModeBtn.classList.add('active');
        onlineModeBtn.classList.remove('active');
        localMode.style.display = 'block';
        onlineMode.style.display = 'none';
        isLocalMode = true;
    }

    // Player count change handler
    function updatePlayerConfigs() {
        const playerCount = parseInt(playerCountSelect.value);
        const colors = ['red', 'yellow', 'green', 'blue'];
        
        playerConfigs.forEach((config, index) => {
            if (index < playerCount) {
                config.style.display = 'flex';
            } else {
                config.style.display = 'none';
            }
        });
    }

    function setupLobbyListeners() {
        // Mode switching
        onlineModeBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            switchToOnlineMode();
        });
        localModeBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            switchToLocalMode();
        });
        
        // Online mode
        createGameBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            socket.emit('createGame');
        });
        joinGameBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            const code = roomCodeInput.value.trim();
            if (code) socket.emit('joinGame', code);
        });
        startGameBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            socket.emit('startGame');
        });
        
        // Local mode
        playerCountSelect.addEventListener('change', updatePlayerConfigs);
        startLocalGameBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            startLocalGame();
        });
        
        // Initialize player configs
        updatePlayerConfigs();
    }

    function startLocalGame() {
        soundManager.play('gameStart');
        const playerCount = parseInt(playerCountSelect.value);
        const colors = ['red', 'yellow', 'green', 'blue'];
        const players = [];
        
        for (let i = 0; i < playerCount; i++) {
            const color = colors[i];
            const typeSelect = document.querySelector(`[data-color="${color}"]`);
            players.push({
                color: color,
                type: typeSelect.value
            });
        }
        
        localGame = new LocalGame(players, () => {
            if (localGame) render(localGame.getState());
        });
        
        // Hide lobby and show game
        lobbyContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        
        // Add local game class to body for CSS styling
        document.body.classList.add('local-game');
        document.body.classList.remove('lobby-screen');
        
        createBoard();
        createTokenElements(players);
        
        // Render initial state
        render(localGame.getState());
    }

    socket.on('gameCreated', ({ roomCode, player, hostId }) => {
        myPlayerInfo = player;
        currentHostId = hostId;
        lobbyContainer.querySelector('.lobby-box .join-game-section').style.display = 'none';
        createGameBtn.style.display = 'none';
        roomInfo.style.display = 'block';
        roomCodeDisplay.textContent = roomCode;
    });

    socket.on('gameJoined', ({ roomCode, player, hostId }) => {
        myPlayerInfo = player;
        currentHostId = hostId;
        lobbyContainer.querySelector('.lobby-box .join-game-section').style.display = 'none';
        createGameBtn.style.display = 'none';
        roomInfo.style.display = 'block';
        roomCodeDisplay.textContent = roomCode;
    });

    socket.on('playerListUpdate', (players) => {
        playerList.innerHTML = '';
        players.forEach(p => {
            const playerEl = document.createElement('div');
            playerEl.classList.add('player-list-item');
            playerEl.innerHTML = `
                <span class="player-color-dot" style="background-color: ${p.color};"></span>
                <span class="player-name">Player (${p.color})${p.id === myPlayerInfo.id ? ' (You)' : ''}</span>
            `;
            if (myPlayerInfo.id === currentHostId && p.id !== myPlayerInfo.id) {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'kick-btn';
                kickBtn.innerHTML = '&times;';
                kickBtn.onclick = () => socket.emit('kickPlayer', p.id);
                playerEl.appendChild(kickBtn);
            }
            playerList.appendChild(playerEl);
        });

        if (myPlayerInfo.id === currentHostId) {
            startGameBtn.style.display = 'block';
            startGameBtn.disabled = players.length < 2;
        } else {
            startGameBtn.style.display = 'none';
        }
    });

    socket.on('hostUpdate', (newHostId) => {
        currentHostId = newHostId;
    });

    socket.on('kicked', () => {
        alert('You have been kicked from the room.');
        window.location.reload();
    });

    socket.on('lobbyError', (message) => {
        lobbyError.textContent = message;
        setTimeout(() => { lobbyError.textContent = ''; }, 3000);
    });


    // ################# GAME LOGIC #################

    const staticColors = { red: '#ff4d4d', green: '#4caf50', yellow: '#ffeb3b', blue: '#2196f3' };
    const homePaths = {
        red: [101, 102, 103, 104, 105, 106],
        green: [201, 202, 203, 204, 205, 206],
        yellow: [301, 302, 303, 304, 305, 306],
        blue: [401, 402, 403, 404, 405, 406]
    };
     const pathCoords = [
        {r:7,c:2}, {r:7,c:3}, {r:7,c:4}, {r:7,c:5}, {r:7,c:6}, {r:6,c:7}, {r:5,c:7}, {r:4,c:7}, {r:3,c:7}, {r:2,c:7}, {r:1,c:7}, {r:1,c:8}, {r:1,c:9},
        {r:2,c:9}, {r:3,c:9}, {r:4,c:9}, {r:5,c:9}, {r:6,c:9}, {r:7,c:10}, {r:7,c:11}, {r:7,c:12}, {r:7,c:13}, {r:7,c:14}, {r:7,c:15}, {r:8,c:15}, {r:9,c:15},
        {r:9,c:14}, {r:9,c:13}, {r:9,c:12}, {r:9,c:11}, {r:9,c:10}, {r:10,c:9}, {r:11,c:9}, {r:12,c:9}, {r:13,c:9}, {r:14,c:9}, {r:15,c:9}, {r:15,c:8}, {r:15,c:7},
        {r:14,c:7}, {r:13,c:7}, {r:12,c:7}, {r:11,c:7}, {r:10,c:7}, {r:9,c:6}, {r:9,c:5}, {r:9,c:4}, {r:9,c:3}, {r:9,c:2}, {r:9,c:1}, {r:8,c:1}, {r:7,c:1},
    ];
    const homePathCoords = {
        red: [{r:8,c:2}, {r:8,c:3}, {r:8,c:4}, {r:8,c:5}, {r:8,c:6}, {r:8,c:7}],
        green: [{r:2,c:8}, {r:3,c:8}, {r:4,c:8}, {r:5,c:8}, {r:6,c:8}, {r:7,c:8}],
        yellow: [{r:8,c:14}, {r:8,c:13}, {r:8,c:12}, {r:8,c:11}, {r:8,c:10}, {r:8,c:9}],
        blue: [{r:14,c:8}, {r:13,c:8}, {r:12,c:8}, {r:11,c:8}, {r:10,c:8}, {r:9,c:8}]
    };
    const safeSpots = [1, 9, 14, 22, 27, 35, 40, 48];

    let clientGameState = {};
    let tokenElements = {};
    let turnTimerInterval = null;

    function createBoard() {
        board.innerHTML = `
            <div id="red-base" class="base"><div class="home-area"></div></div>
            <div id="green-base" class="base"><div class="home-area"></div></div>
            <div id="yellow-base" class="base"><div class="home-area"></div></div>
            <div id="blue-base" class="base"><div class="home-area"></div></div>
            <div id="home-triangle"><div></div><div></div></div>
        `;

        pathCoords.forEach((coord, i) => {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'path');
            cell.style.gridRow = coord.r;
            cell.style.gridColumn = coord.c;
            cell.dataset.pathIndex = i + 1;
            if (safeSpots.includes(i + 1)) cell.classList.add('safe');
            board.appendChild(cell);
        });

        Object.keys(homePathCoords).forEach(color => {
            homePathCoords[color].forEach((coord, i) => {
                const cell = document.createElement('div');
                cell.classList.add('cell', `${color}-path`);
                cell.style.gridRow = coord.r;
                cell.style.gridColumn = coord.c;
                cell.dataset.homePathIndex = homePaths[color][i];
                board.appendChild(cell);
            });
        });
    }

    function createTokenElements(players) {
        tokenElements = {};
        players.forEach(player => {
            const color = player.color;
            tokenElements[color] = [];
            const base = document.querySelector(`#${color}-base .home-area`);
            base.innerHTML = '';
            
            // Create 4 fixed yard spots first
            for (let i = 0; i < 4; i++) {
                const yardSpot = document.createElement('div');
                yardSpot.classList.add('token-yard');
                yardSpot.id = `${color}-yard-${i}`;
                base.appendChild(yardSpot);
            }
            
            // Then create tokens
            for (let i = 0; i < 4; i++) {
                const tokenEl = document.createElement('div');
                tokenEl.classList.add('token', `${color}-token`);
                tokenEl.id = `${color}-token-${i}`;

                tokenEl.addEventListener('click', () => {
                    if (tokenEl.classList.contains('movable')) {
                        soundManager.play('tokenMove');
                        if (isLocalMode && localGame) {
                            localGame.moveToken(color, i);
                        } else {
                            socket.emit('moveToken', { color: color, tokenId: i });
                        }
                    }
                });

                tokenElements[color].push(tokenEl);
                
                // Place token in its designated yard spot
                const yardSpot = document.getElementById(`${color}-yard-${i}`);
                yardSpot.appendChild(tokenEl);
            }
        });
    }
    
    function render(gameState) {
        // --- Sound Effects ---
        // Dice Roll End
        if (gameState.diceValue && gameState.diceValue !== clientGameState.diceValue) {
            soundManager.play('diceRollEnd');
            if (gameState.diceValue === 6) {
                soundManager.play('rollingASix');
            }
        }
        // Your Turn Alert
        const oldPlayer = clientGameState.currentPlayerColor;
        const newPlayer = gameState.currentPlayerColor;
        if (newPlayer !== oldPlayer) {
            const isMyTurnOnline = !gameState.isLocalGame && myPlayerInfo && newPlayer === myPlayerInfo.color;
            const isHumanTurnLocal = gameState.isLocalGame && gameState.currentPlayerType === 'human';
            if (isMyTurnOnline || isHumanTurnLocal) {
                soundManager.play('yourTurnAlert');
            }
        }
        // Capture and Home
        if (gameState.lastMoveEvents) {
            if (gameState.lastMoveEvents.capture) {
                soundManager.play('tokenCapture');
            }
            if (gameState.lastMoveEvents.home) {
                soundManager.play('tokenSafeHome');
            }
            if (gameState.lastMoveEvents.tripleSixPenalty) {
                soundManager.play('tripleSixPenalty');
            }
        }

        clientGameState = gameState;
        const { players, currentPlayerColor, diceValue, turnState, movableTokens, winner, turnEndsAt, isLocalGame, currentPlayerType } = gameState;

        // Handle timer display only for online games
        if (turnTimerInterval) clearInterval(turnTimerInterval);
        
        if (!isLocalGame && turnEndsAt) {
            // Only show timer for online multiplayer games
            turnTimerInterval = setInterval(() => {
                const timeLeft = Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000));
                if (timeLeft <= 0) {
                    // Timer ran out - emit timeout event to server
                    clearInterval(turnTimerInterval);
                    socket.emit('turnTimeout');
                    status.textContent = `${currentPlayerColor}'s turn (Time's up!)`;
                    return;
                }
                status.textContent = `${currentPlayerColor}'s turn (${timeLeft}s)`;
            }, 500);
        } else if (isLocalGame) {
            // Local game - no timer, just show current player
            if (currentPlayerType === 'ai') {
                status.textContent = `${currentPlayerColor} (AI) is thinking...`;
            } else {
                status.textContent = `${currentPlayerColor}'s turn`;
            }
        }

        Object.keys(tokenElements).forEach(color => {
            if (!players[color]) { // Player might have disconnected
                 tokenElements[color].forEach(el => el.style.display = 'none');
                 return;
            }
            players[color].forEach(token => {
                const tokenEl = tokenElements[color][token.id];
                let targetCell;
                if (token.position === -1) { // In base
                    targetCell = document.getElementById(`${color}-yard-${token.id}`);
                } else if (token.position === -2) { // At home or disconnected
                    if (token.isHome) {
                        targetCell = document.querySelector(`#home-triangle`);
                    } else {
                        tokenEl.style.display = 'none';
                        return;
                    }
                } else if (token.position > 100) { // Home path
                    targetCell = document.querySelector(`[data-home-path-index='${token.position}']`);
                } else { // Main path
                    targetCell = document.querySelector(`[data-path-index='${token.position}']`);
                }
                if (targetCell && tokenEl.parentElement !== targetCell) {
                    targetCell.appendChild(tokenEl);
                }
                tokenEl.style.display = 'flex'; // Ensure token is visible
            });
        });

        document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));
        document.querySelectorAll('.current-player').forEach(el => el.classList.remove('current-player'));
        
        // Add current-player class to current player's tokens for better layering on safe spots
        if (tokenElements[currentPlayerColor]) {
            tokenElements[currentPlayerColor].forEach(tokenEl => {
                tokenEl.classList.add('current-player');
            });
        }
        
        if (movableTokens && (!isLocalGame || currentPlayerType === 'human')) {
            if (!isLocalGame && currentPlayerColor === myPlayerInfo.color) {
                movableTokens.forEach(t => {
                    tokenElements[t.color][t.id].classList.add('movable');
                });
            } else if (isLocalGame && currentPlayerType === 'human') {
                movableTokens.forEach(t => {
                    tokenElements[t.color][t.id].classList.add('movable');
                });
            }
        }
        
        dice.textContent = diceValue ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1] : '🎲';
        status.style.color = staticColors[currentPlayerColor];
        dice.style.borderColor = staticColors[currentPlayerColor];
        
        if (winner) {
            if (!clientGameState.winner) { // Play sound only on first detection
                soundManager.play('victory');
            }
            clearInterval(turnTimerInterval);
            winnerMessage.textContent = `${winner} wins!`;
            winnerOverlay.style.display = 'flex';
        } else {
            winnerOverlay.style.display = 'none';
        }
    }

    function setupGameListeners() {
        dice.addEventListener('click', () => {
            const isMyTurnOnline = clientGameState.currentPlayerColor === myPlayerInfo?.color;
            const isMyTurnLocal = isLocalMode && localGame?.getState().currentPlayerType === 'human';

            if ((isMyTurnOnline || isMyTurnLocal) && clientGameState.turnState === 'rolling') {
                soundManager.play('diceRollStart');
                if (isLocalMode) {
                    localGame.rollDice();
                } else {
                    socket.emit('rollDice');
                }
            }
        });
        restartBtn.addEventListener('click', () => {
            soundManager.play('buttonClick');
            // Reset body classes before reload
            document.body.classList.remove('local-game', 'online-game');
            document.body.classList.add('lobby-screen');
            window.location.reload();
        });

        gameContainer.addEventListener('click', (e) => {
            const clickedEl = e.target.closest('.token');
            if (clickedEl && !clickedEl.classList.contains('movable')) {
                const isMyTurnOnline = clientGameState.currentPlayerColor === myPlayerInfo?.color;
                const isMyTurnLocal = isLocalMode && localGame?.getState().currentPlayerType === 'human';
                const tokenColor = Array.from(clickedEl.classList).find(c => c.endsWith('-token'))?.split('-')[0];

                if ((isMyTurnOnline || isMyTurnLocal) && tokenColor === clientGameState.currentPlayerColor) {
                    soundManager.play('invalidMove');
                }
            }
        });

        // Resize/orientation handling: rebuild board grid and re-attach tokens into proper cells
        const handleResize = () => {
            if (getComputedStyle(gameContainer).display === 'none') return;
            const players = Object.keys(tokenElements).map(color => ({ color }));
            const savedPositions = {};
            Object.keys(tokenElements).forEach(color => {
                savedPositions[color] = tokenElements[color].map((el, idx) => {
                    // Determine logical position from current game state
                    const tokenState = clientGameState.players?.[color]?.[idx];
                    return tokenState ? tokenState.position : -1;
                });
            });
            createBoard();
            createTokenElements(players);
            // Restore token locations according to saved positions
            Object.keys(savedPositions).forEach(color => {
                savedPositions[color].forEach((pos, idx) => {
                    const tokenEl = tokenElements[color][idx];
                    let targetCell;
                    if (pos === -1) {
                        targetCell = document.getElementById(`${color}-yard-${idx}`);
                    } else if (pos === -2) {
                        targetCell = document.querySelector('#home-triangle');
                    } else if (pos > 100) {
                        targetCell = document.querySelector(`[data-home-path-index='${pos}']`);
                    } else if (pos > 0) {
                        targetCell = document.querySelector(`[data-path-index='${pos}']`);
                    }
                    if (targetCell) targetCell.appendChild(tokenEl);
                });
            });
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
    }

    socket.on('gameStarted', ({ players }) => {
        soundManager.play('gameStart');
        lobbyContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        
        // Add online game class to body for CSS styling
        document.body.classList.remove('lobby-screen', 'local-game');
        document.body.classList.add('online-game');
        
        createBoard();
        createTokenElements(players);
    });

    socket.on('gameStateUpdate', render);
    
    // --- CHAT LOGIC ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatContainer = document.getElementById('chat-container');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');

    // Chat toggle functionality
    chatToggleBtn.addEventListener('click', () => {
        soundManager.play('buttonClick');
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'flex';
            localStorage.setItem('ludoChatVisible', 'true');
        } else {
            chatContainer.style.display = 'none';
            localStorage.setItem('ludoChatVisible', 'false');
        }
    });

    // Load chat visibility preference
    const chatVisible = localStorage.getItem('ludoChatVisible');
    if (chatVisible === 'false') {
        chatContainer.style.display = 'none';
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (chatInput.value) {
            soundManager.play('buttonClick');
            socket.emit('sendMessage', chatInput.value);
            chatInput.value = '';
        }
    });

    socket.on('newMessage', ({ senderColor, message }) => {
        soundManager.play('chatMessage');
        const item = document.createElement('li');
        const colorSpan = document.createElement('span');
        colorSpan.textContent = `${senderColor}: `;
        colorSpan.style.color = staticColors[senderColor];
        colorSpan.classList.add('chat-player-color');

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.classList.add('chat-message');

        item.appendChild(colorSpan);
        item.appendChild(messageSpan);
        chatMessages.appendChild(item);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('connect_error', (err) => {
        lobbyError.textContent = `Connection failed: ${err.message}. Please refresh.`;
    });

    // --- THEME/SOUND LOGIC ---
    const themeBtn = document.getElementById('theme-btn');
    const themeMenu = document.getElementById('theme-menu');
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // Audio controls
    const audioBtn = document.getElementById('audio-btn');
    const audioMenu = document.getElementById('audio-menu');
    const musicToggle = document.getElementById('music-toggle');
    const sfxToggle = document.getElementById('sfx-toggle');
    const musicVolumeSlider = document.getElementById('music-volume');
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    const musicVolumeValue = musicVolumeSlider.nextElementSibling;
    const sfxVolumeValue = sfxVolumeSlider.nextElementSibling;
    
    // Theme functionality
    themeBtn.addEventListener('click', () => {
        soundManager.play('buttonClick');
        themeMenu.classList.toggle('hidden');
        // Close audio menu if open
        audioMenu.classList.add('hidden');
    });
    
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            soundManager.play('buttonClick');
            applyTheme(option.dataset.theme);
            themeMenu.classList.add('hidden');
        });
    });
    
    // Audio dropdown functionality
    audioBtn.addEventListener('click', () => {
        soundManager.play('buttonClick');
        audioMenu.classList.toggle('hidden');
        // Close theme menu if open
        themeMenu.classList.add('hidden');
    });
    
    // Music controls
    musicToggle.addEventListener('change', () => {
        soundManager.play('buttonClick');
        const isMuted = !musicToggle.checked;
        soundManager.setMusicMuted(isMuted);
        localStorage.setItem('ludoMusicMuted', isMuted);
    });
    
    musicVolumeSlider.addEventListener('input', () => {
        const volume = musicVolumeSlider.value / 100;
        soundManager.setMusicVolume(volume);
        musicVolumeValue.textContent = `${musicVolumeSlider.value}%`;
        localStorage.setItem('ludoMusicVolume', volume);
    });
    
    // SFX controls
    sfxToggle.addEventListener('change', () => {
        soundManager.play('buttonClick');
        const isMuted = !sfxToggle.checked;
        soundManager.setSfxMuted(isMuted);
        localStorage.setItem('ludoSfxMuted', isMuted);
    });
    
    sfxVolumeSlider.addEventListener('input', () => {
        const volume = sfxVolumeSlider.value / 100;
        soundManager.setSfxVolume(volume);
        sfxVolumeValue.textContent = `${sfxVolumeSlider.value}%`;
        localStorage.setItem('ludoSfxVolume', volume);
        // Play a test sound to demonstrate volume change
        soundManager.play('buttonClick');
    });
    
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themeMenu.contains(e.target)) {
            themeMenu.classList.add('hidden');
        }
        if (!audioBtn.contains(e.target) && !audioMenu.contains(e.target)) {
            audioMenu.classList.add('hidden');
        }
    });
    
    function applyTheme(theme) {
        document.body.className = '';
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('ludoTheme', theme);
        soundManager.setCurrentTheme(theme);
        
        // Play theme music if not muted
        if (!soundManager.isMusicMuted) {
            soundManager.playThemeMusic(theme);
        }
    }
    
    // Load saved audio settings
    const savedTheme = localStorage.getItem('ludoTheme') || 'cyberpunk';
    const savedMusicMuted = localStorage.getItem('ludoMusicMuted') === 'true';
    const savedSfxMuted = localStorage.getItem('ludoSfxMuted') === 'true';
    const savedMusicVolume = parseFloat(localStorage.getItem('ludoMusicVolume')) || 0.5;
    const savedSfxVolume = parseFloat(localStorage.getItem('ludoSfxVolume')) || 0.5;
    
    // Apply saved settings
    soundManager.setMusicMuted(savedMusicMuted);
    soundManager.setSfxMuted(savedSfxMuted);
    soundManager.setMusicVolume(savedMusicVolume);
    soundManager.setSfxVolume(savedSfxVolume);
    
    // Update UI controls
    musicToggle.checked = !savedMusicMuted;
    sfxToggle.checked = !savedSfxMuted;
    musicVolumeSlider.value = savedMusicVolume * 100;
    sfxVolumeSlider.value = savedSfxVolume * 100;
    musicVolumeValue.textContent = `${Math.round(savedMusicVolume * 100)}%`;
    sfxVolumeValue.textContent = `${Math.round(savedSfxVolume * 100)}%`;
    
    applyTheme(savedTheme);
    
    // Add click sound to all buttons that don't already have it
    document.addEventListener('click', (e) => {
        if (e.target.matches('button:not(.ui-btn):not(.theme-option)') || 
            e.target.closest('button:not(.ui-btn):not(.theme-option)')) {
            soundManager.play('buttonClick');
        }
    // Add click sound to all buttons that don't already have it (delegated to lobbyContainer)
    if (lobbyContainer) {
        lobbyContainer.addEventListener('click', (e) => {
            if (e.target.matches('button:not(.ui-btn):not(.theme-option)') || 
                e.target.closest('button:not(.ui-btn):not(.theme-option)')) {
                soundManager.play('buttonClick');
            }
        });
    }


    // --- INITIALIZATION ---
    setupLobbyListeners();
    setupGameListeners();
});

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

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
        onlineModeBtn.addEventListener('click', switchToOnlineMode);
        localModeBtn.addEventListener('click', switchToLocalMode);
        
        // Online mode
        createGameBtn.addEventListener('click', () => socket.emit('createGame'));
        joinGameBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.trim();
            if (code) socket.emit('joinGame', code);
        });
        startGameBtn.addEventListener('click', () => socket.emit('startGame'));
        
        // Local mode
        playerCountSelect.addEventListener('change', updatePlayerConfigs);
        startLocalGameBtn.addEventListener('click', startLocalGame);
        
        // Initialize player configs
        updatePlayerConfigs();
    }

    function startLocalGame() {
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
        clientGameState = gameState;
        const { players, currentPlayerColor, diceValue, turnState, movableTokens, winner, turnEndsAt, isLocalGame, currentPlayerType } = gameState;

        if (turnTimerInterval) clearInterval(turnTimerInterval);
        turnTimerInterval = setInterval(() => {
            const timeLeft = Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000));
            let statusText = `${currentPlayerColor}'s turn (${timeLeft}s)`;
            if (isLocalGame && currentPlayerType === 'ai') {
                statusText = `${currentPlayerColor} (AI) - ${timeLeft}s`;
            }
            status.textContent = statusText;
        }, 500);

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
            clearInterval(turnTimerInterval);
            winnerMessage.textContent = `${winner} wins!`;
            winnerOverlay.style.display = 'flex';
        } else {
            winnerOverlay.style.display = 'none';
        }
    }

    function setupGameListeners() {
        dice.addEventListener('click', () => {
            if (isLocalMode && localGame) {
                const gameState = localGame.getState();
                if (gameState.turnState === 'rolling' && gameState.currentPlayerType === 'human') {
                    localGame.rollDice();
                }
            } else if (clientGameState.currentPlayerColor === myPlayerInfo.color && clientGameState.turnState === 'rolling') {
                socket.emit('rollDice');
            }
        });
        restartBtn.addEventListener('click', () => window.location.reload());
    }

    socket.on('gameStarted', ({ players }) => {
        lobbyContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        createBoard();
        createTokenElements(players);
    });

    socket.on('gameStateUpdate', render);
    
    // --- CHAT LOGIC ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (chatInput.value) {
            socket.emit('sendMessage', chatInput.value);
            chatInput.value = '';
        }
    });

    socket.on('newMessage', ({ senderColor, message }) => {
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
    // ... (rest of the theme logic is the same)
    const themeMenu = document.getElementById('theme-menu');
    const themeOptions = document.querySelectorAll('.theme-option');
    themeBtn.addEventListener('click', () => themeMenu.classList.toggle('hidden'));
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            applyTheme(option.dataset.theme);
            themeMenu.classList.add('hidden');
        });
    });
    const music = document.getElementById('background-music');
    const muteBtn = document.getElementById('mute-btn');
    const volumeUpIcon = document.getElementById('volume-up-icon');
    const volumeMuteIcon = document.getElementById('volume-mute-icon');
    const musicMap = {
        cyberpunk: 'assets/audio/cyberpunk.mp3',
        egypt: 'assets/audio/egypt.mp3',
        jurassic: 'assets/audio/jurassic.mp3',
        space: 'assets/audio/space.mp3'
    };
    function toggleMute() {
        music.muted = !music.muted;
        localStorage.setItem('ludoMuted', music.muted);
        updateMuteButton();
    }
    function updateMuteButton() {
        if (music.muted) {
            volumeUpIcon.classList.add('hidden');
            volumeMuteIcon.classList.remove('hidden');
        } else {
            volumeUpIcon.classList.remove('hidden');
            volumeMuteIcon.classList.add('hidden');
        }
    }
    muteBtn.addEventListener('click', toggleMute);
    function applyTheme(theme) {
        document.body.className = '';
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('ludoTheme', theme);
        music.src = musicMap[theme];
        if (!music.muted) music.play().catch(e => console.log("Audio play failed"));
    }
    const savedTheme = localStorage.getItem('ludoTheme') || 'cyberpunk';
    const savedMuted = localStorage.getItem('ludoMuted') === 'true';
    music.muted = savedMuted;
    updateMuteButton();
    applyTheme(savedTheme);


    // --- INITIALIZATION ---
    setupLobbyListeners();
    setupGameListeners();
});

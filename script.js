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
        window.localGame = localGame; // Expose for testing
        
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
    let isAnimating = false; // Animation lock
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
    
    function animateTokenMove(tokenEl, startCell, endCell) {
        return new Promise(resolve => {
            const startRect = startCell.getBoundingClientRect();
            const endRect = endCell.getBoundingClientRect();

            const deltaX = endRect.left - startRect.left;
            const deltaY = endRect.top - startRect.top;
            const distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

            const isPlayful = document.body.classList.contains('animation-playful');
            const speedMultiplier = parseFloat(localStorage.getItem('ludoAnimSpeed') || '1');

            let duration, keyframes;
            const isShortMove = distance < (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) * 3);

            if (isShortMove) { // Hop animation
                duration = 300 / speedMultiplier;
                const midX = deltaX / 2;
                const midY = deltaY / 2 - 30; // Arc height
                if (isPlayful) {
                    keyframes = [
                        { transform: `translate(0, 0) scale(1)`, zIndex: 50, easing: 'ease-in' },
                        { transform: `translate(${deltaX*0.2}px, ${deltaY*0.2}px) scale(1.2, 0.8)`, zIndex: 50 },
                        { transform: `translate(${midX}px, ${midY}px) scale(0.9, 1.1) rotate(5deg)`, zIndex: 50, easing: 'linear' },
                        { transform: `translate(${deltaX}px, ${deltaY}px) scale(1)`, zIndex: 50, easing: 'ease-out' }
                    ];
                } else { // Modern Hop
                     keyframes = [
                        { transform: `translate(0, 0) scale(1.1)`, zIndex: 50, easing: 'ease-in' },
                        { transform: `translate(${midX}px, ${midY}px) scale(1.1)`, zIndex: 50, easing: 'linear' },
                        { transform: `translate(${deltaX}px, ${deltaY}px) scale(1)`, zIndex: 50, easing: 'ease-out' }
                    ];
                }
            } else { // Glide animation
                duration = (100 * distance / 100) / speedMultiplier; // Duration based on distance
                if (isPlayful) {
                    keyframes = [
                        { transform: `translate(0, 0) rotate(0deg)`, zIndex: 50 },
                        { transform: `translate(${deltaX * 0.25}px, ${deltaY * 0.25}px) rotate(-5deg)`, zIndex: 50, offset: 0.25 },
                        { transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.5}px) rotate(5deg)`, zIndex: 50, offset: 0.5 },
                        { transform: `translate(${deltaX * 0.75}px, ${deltaY * 0.75}px) rotate(-5deg)`, zIndex: 50, offset: 0.75 },
                        { transform: `translate(${deltaX}px, ${deltaY}px) rotate(0deg)`, zIndex: 50 }
                    ];
                } else { // Modern Glide
                    keyframes = [
                        { transform: 'translate(0, 0)', zIndex: 50 },
                        { transform: `translate(${deltaX}px, ${deltaY}px)`, zIndex: 50 }
                    ];
                }
            }

            const animation = tokenEl.animate(keyframes, {
                duration: Math.max(200, duration), // Ensure a minimum duration
                easing: 'ease-in-out',
                fill: 'forwards'
            });

            animation.onfinish = () => {
                tokenEl.style.transform = '';
                tokenEl.style.zIndex = '';
                endCell.appendChild(tokenEl);
                resolve();
            };
        });
    }

    function animateDiceRoll(newValue) {
        const dice = document.getElementById('dice');
        const isPlayful = document.body.classList.contains('animation-playful');
        const speedMultiplier = parseFloat(localStorage.getItem('ludoAnimSpeed') || '1');

        let keyframes;
        let duration;

        if (isPlayful) {
            duration = 800 / speedMultiplier;
            keyframes = [
                { transform: 'scale(1) rotate(0deg)' },
                { transform: 'scale(1.3, 0.8) rotate(-5deg)', offset: 0.2 },
                { transform: 'scale(0.9, 1.2) rotate(10deg) translateY(-20px)', offset: 0.4 },
                { transform: 'scale(1.1, 0.9) rotate(-10deg)', offset: 0.6 },
                { transform: 'scale(0.95, 1.05) rotate(5deg)', offset: 0.8 },
                { transform: 'scale(1) rotate(0deg)' }
            ];
        } else { // Modern
            duration = 700 / speedMultiplier;
            keyframes = [
                { transform: 'rotateX(0deg) rotateY(0deg) scale(1)' },
                { transform: 'rotateX(-180deg) rotateY(0deg) scale(1.2)', offset: 0.25 },
                { transform: 'rotateX(-180deg) rotateY(-180deg) scale(1.2)', offset: 0.5 },
                { transform: 'rotateX(-360deg) rotateY(-180deg) scale(1.2)', offset: 0.75 },
                { transform: 'rotateX(-360deg) rotateY(-360deg) scale(1)' }
            ];
        }

        const animation = dice.animate(keyframes, { duration, easing: 'ease-in-out' });

        animation.onfinish = () => {
            dice.textContent = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][newValue - 1];
            dice.dataset.value = newValue;
        };

        return animation.finished;
    }

    async function render(gameState) {
        if (isAnimating) {
            // If we get a new state while animating, queue it up to render after.
            // This prevents visual bugs from concurrent renders.
            setTimeout(() => render(gameState), 100);
            return;
        }

        const previousGameState = JSON.parse(JSON.stringify(clientGameState));
        clientGameState = gameState;
        const { players, currentPlayerColor, diceValue, turnState, movableTokens, winner, turnEndsAt, isLocalGame, currentPlayerType } = gameState;

        isAnimating = true;

        // --- Handle Animations ---
        const animationPromises = [];

        // Animate dice roll if value has changed
        if (diceValue && (!previousGameState.diceValue || previousGameState.diceValue !== diceValue)) {
            animationPromises.push(animateDiceRoll(diceValue));
        }

        // Animate token movements
        Object.keys(players).forEach(color => {
            players[color].forEach(token => {
                const oldPlayerState = previousGameState.players ? previousGameState.players[color] : null;
                const oldToken = oldPlayerState ? oldPlayerState.find(t => t.id === token.id) : null;

                if (oldToken && oldToken.position !== token.position) {
                    const tokenEl = tokenElements[color][token.id];
                    const startCell = getCellFromPosition(color, oldToken.position, oldToken.id);
                    const endCell = getCellFromPosition(color, token.position, token.id);

                    // Home arrival detection
                    if (token.position === -2 && oldToken.position !== -2) {
                        playHomeEffect(color);
                    }

                    // Capture detection
                    if (token.position === -1 && oldToken.position > 0) {
                        const capturedCell = getCellFromPosition(color, oldToken.position, oldToken.id);
                        if(capturedCell) playCaptureEffect(color, capturedCell);
                    }


                    if (startCell && endCell) {
                        animationPromises.push(animateTokenMove(tokenEl, startCell, endCell));
                    }
                }
            });
        });

        await Promise.all(animationPromises);

        // --- Sync DOM state after animations ---

        if (turnTimerInterval) clearInterval(turnTimerInterval);
        turnTimerInterval = setInterval(() => {
            const timeLeft = Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000));
            let statusText = `${currentPlayerColor}'s turn (${timeLeft}s)`;
            if (isLocalGame && currentPlayerType === 'ai') {
                statusText = `${currentPlayerColor} (AI) - ${timeLeft}s`;
            }
            status.textContent = statusText;
        }, 500);

        // Place all tokens in their final positions
        Object.keys(tokenElements).forEach(color => {
            if (!players[color]) {
                 tokenElements[color].forEach(el => el.style.display = 'none');
                 return;
            }
            players[color].forEach(token => {
                const tokenEl = tokenElements[color][token.id];
                const targetCell = getCellFromPosition(color, token.position, token.id);

                if (targetCell && tokenEl.parentElement !== targetCell) {
                    if(token.isHome) {
                        // Special handling for home triangle - just place it
                        targetCell.appendChild(tokenEl);
                    } else {
                       targetCell.appendChild(tokenEl);
                    }
                }
                 tokenEl.style.display = token.position === -2 && !token.isHome ? 'none' : 'flex';
            });
        });

        // Update UI classes
        document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));
        document.querySelectorAll('.current-player').forEach(el => el.classList.remove('current-player'));
        
        if (tokenElements[currentPlayerColor]) {
            tokenElements[currentPlayerColor].forEach(tokenEl => {
                tokenEl.classList.add('current-player');
            });
        }
        
        if (movableTokens && (!isLocalGame || currentPlayerType === 'human')) {
            const playerColor = isLocalGame ? currentPlayerColor : myPlayerInfo.color;
            if (currentPlayerColor === playerColor) {
                movableTokens.forEach(t => {
                    tokenElements[t.color][t.id].classList.add('movable');
                });
            }
        }
        
        if (!diceValue) {
            dice.textContent = '🎲';
            dice.dataset.value = '';
        }

        // --- Lucky Streak Indicator ---
        const streakContainer = document.getElementById('lucky-streak-container');
        if (gameState.consecutiveSixes >= 2) {
            if (streakContainer.children.length === 0) { // Only add if not already there
                const isPlayful = document.body.classList.contains('animation-playful');
                for (let i = 0; i < 3; i++) {
                    const flame = document.createElement('div');
                    flame.className = `flame ${isPlayful ? 'playful' : 'modern'}`;
                    streakContainer.appendChild(flame);
                }
            }
        } else {
            streakContainer.innerHTML = '';
        }
        status.style.color = staticColors[currentPlayerColor];
        dice.style.borderColor = staticColors[currentPlayerColor];
        
        if (winner) {
            clearInterval(turnTimerInterval);
            winnerMessage.textContent = `${winner} wins!`;
            winnerOverlay.style.display = 'flex';
        } else {
            winnerOverlay.style.display = 'none';
        }

        isAnimating = false;
        window.isAnimating = false; // Expose for testing
    }

    function playCaptureEffect(tokenColor, atCell) {
        const effectContainer = document.getElementById('effect-container');
        const isPlayful = document.body.classList.contains('animation-playful');
        const atRect = atCell.getBoundingClientRect();
        const boardRect = document.getElementById('ludo-board').getBoundingClientRect();

        const x = atRect.left - boardRect.left + atRect.width / 2;
        const y = atRect.top - boardRect.top + atRect.height / 2;

        if (isPlayful) {
            const swatEl = document.createElement('div');
            swatEl.textContent = '✋';
            swatEl.className = 'swat-effect';
            swatEl.style.left = `${x}px`;
            swatEl.style.top = `${y}px`;
            effectContainer.appendChild(swatEl);
            setTimeout(() => swatEl.remove(), 500);
        } else { // Modern
            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'shatter-particle';
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.color = staticColors[tokenColor];
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * 50 + 20;
                particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
                effectContainer.appendChild(particle);
                setTimeout(() => particle.remove(), 800);
            }
        }
    }

    function playHomeEffect(tokenColor) {
        const isPlayful = document.body.classList.contains('animation-playful');
        const homeTriangle = document.querySelector('#home-triangle');

        if (isPlayful) {
            const effectContainer = document.getElementById('effect-container');
            const atRect = homeTriangle.getBoundingClientRect();
            const boardRect = document.getElementById('ludo-board').getBoundingClientRect();
            const x = atRect.left - boardRect.left;
            const y = atRect.top - boardRect.top;

            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.className = 'confetti-particle';
                particle.style.left = `${x + Math.random() * atRect.width}px`;
                particle.style.top = `${y + Math.random() * atRect.height}px`;
                particle.style.setProperty('--bg', staticColors[Object.keys(staticColors)[Math.floor(Math.random() * 4)]]);
                particle.style.animationDelay = `${Math.random() * 1}s`;
                effectContainer.appendChild(particle);
                setTimeout(() => particle.remove(), 3000);
            }
        } else { // Modern
            homeTriangle.style.setProperty('--glow-color', staticColors[tokenColor]);
            homeTriangle.classList.add('home-glow-pulse');
            setTimeout(() => homeTriangle.classList.remove('home-glow-pulse'), 2000);
        }
    }

    function getCellFromPosition(color, position, tokenId) {
        if (position === -1) { // In base
            return document.getElementById(`${color}-yard-${tokenId}`);
        } else if (position === -2) { // At home
            return document.querySelector(`#home-triangle`);
        } else if (position > 100) { // Home path
            return document.querySelector(`[data-home-path-index='${position}']`);
        } else { // Main path
            return document.querySelector(`[data-path-index='${position}']`);
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
    const chatContainer = document.getElementById('chat-container');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');

    // Chat toggle functionality
    chatToggleBtn.addEventListener('click', () => {
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

// script.js extracted from hello.html

document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('ludo-board');
    const dice = document.getElementById('dice');
    const status = document.getElementById('game-status');
    const winnerOverlay = document.getElementById('winner-overlay');
    const winnerMessage = document.getElementById('winner-message');
    const restartBtn = document.getElementById('restart-btn');
   

    const players = ['red', 'green', 'yellow', 'blue'];
    const colors = { red: '#ff4d4d', green: '#4caf50', yellow: '#ffeb3b', blue: '#2196f3' };
    const startPositions = { red: 1, green: 14, yellow: 27, blue: 40 };
    const lapEndPositions = { red: 51, green: 12, yellow: 25, blue: 38 };
    const homePaths = {
        red: [101, 102, 103, 104, 105, 106],
        green: [201, 202, 203, 204, 205, 206],
        yellow: [301, 302, 303, 304, 305, 306],
        blue: [401, 402, 403, 404, 405, 406]
    };

    let currentPlayerIndex = 0;
    let diceValue = 0;
    let diceRolled = false;
    let tokens = {};
    let consecutiveSixes = 0;
    const playerPaths = {};

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

    function isBlock(position) {
        if (position < 1 || position > 52 || safeSpots.includes(position)) {
            return null;
        }
        const tokensAtPosition = [];
        for (const player of players) {
            for (const token of tokens[player]) {
                if (token.position === position) {
                    tokensAtPosition.push(token);
                }
            }
        }
        if (tokensAtPosition.length >= 2) {
            const firstColor = tokensAtPosition[0].color;
            if (tokensAtPosition.every(t => t.color === firstColor)) {
                return firstColor;
            }
        }
        return null;
    }

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
            if (i + 1 === startPositions.red) cell.style.backgroundColor = 'rgba(255, 77, 77, 0.3)';
            if (i + 1 === startPositions.green) cell.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            if (i + 1 === startPositions.yellow) cell.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
            if (i + 1 === startPositions.blue) cell.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
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

    function createTokens() {
        tokens = {};
        players.forEach(player => {
            tokens[player] = [];
            const base = document.querySelector(`#${player}-base .home-area`);
            base.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const tokenEl = document.createElement('div');
                tokenEl.classList.add('token', `${player}-token`);
                tokenEl.id = `${player}-token-${i}`;
                
                const tokenObj = { id: i, color: player, position: -1, element: tokenEl, isHome: false };
                tokens[player].push(tokenObj);

                const yardSpot = document.createElement('div');
                yardSpot.classList.add('token-yard');
                yardSpot.appendChild(tokenEl);
                base.appendChild(yardSpot);
                
                tokenEl.addEventListener('click', () => onTokenClick(tokenObj));
            }
        });
    }

    function rollDice() {
        if (diceRolled) return;
        dice.classList.add('rolling');
        
        setTimeout(() => {
            diceValue = Math.floor(Math.random() * 6) + 1;
            dice.textContent = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1];
            dice.classList.remove('rolling');

            if (diceValue === 6) {
                consecutiveSixes++;
            } else {
                consecutiveSixes = 0;
            }

            if (consecutiveSixes === 3) {
                status.textContent = `${players[currentPlayerIndex]} rolled three 6s! Turn forfeited.`;
                setTimeout(nextTurn, 1000);
                return;
            }

            diceRolled = true;
            status.textContent = `${players[currentPlayerIndex]} rolled a ${diceValue}`;
            checkMovableTokens();
        }, 500);
    }

    function checkMovableTokens() {
        const currentPlayer = players[currentPlayerIndex];
        const playerTokens = tokens[currentPlayer];
        let hasMovableToken = false;

        document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));

        playerTokens.forEach(token => {
            if (isMovable(token)) {
                token.element.classList.add('movable');
                hasMovableToken = true;
            }
        });

        if (!hasMovableToken && diceRolled) {
            setTimeout(nextTurn, 1000);
        }
    }
    
    function isMovable(token) {
        if (token.isHome) return false;
        if (token.position === -1) return diceValue === 6;

        if (token.position > 100) {
            const homePath = homePaths[token.color];
            const currentHomeIndex = homePath.indexOf(token.position);
            return currentHomeIndex + diceValue < homePath.length;
        }

        const path = playerPaths[token.color];
        const currentPathIndex = path.indexOf(token.position);

        for (let i = 1; i <= diceValue; i++) {
            const nextPathIndex = currentPathIndex + i;
            if (nextPathIndex >= 51) break;

            const posOnPath = path[nextPathIndex];
            const blockColor = isBlock(posOnPath);
            if (blockColor && blockColor !== token.color) {
                return false;
            }
        }

        return true;
    }

    function onTokenClick(token) {
        if (token.color !== players[currentPlayerIndex] || !diceRolled || !token.element.classList.contains('movable')) {
            return;
        }
        moveToken(token);
    }

    function moveToken(token) {
        document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));

        if (token.position === -1 && diceValue === 6) {
            token.position = startPositions[token.color];
        } else if (token.position > 0) {
            if (token.position > 100) {
                const homePath = homePaths[token.color];
                const currentHomeIndex = homePath.indexOf(token.position);
                const newHomeIndex = currentHomeIndex + diceValue;
                token.position = homePath[newHomeIndex];
                if (newHomeIndex === homePath.length - 1) {
                    token.isHome = true;
                }
            } else {
                const path = playerPaths[token.color];
                const currentPathIndex = path.indexOf(token.position);
                const newPathIndex = currentPathIndex + diceValue;

                if (newPathIndex >= 51) {
                    const homePath = homePaths[token.color];
                    const stepsIntoHome = newPathIndex - 51;
                    if (stepsIntoHome < homePath.length) {
                        token.position = homePath[stepsIntoHome];
                        if (stepsIntoHome === homePath.length - 1) token.isHome = true;
                    }
                } else {
                    token.position = path[newPathIndex];
                }
            }
        }
        
        const captureOccurred = checkCapture(token);
        updateBoard();
        
        const winner = checkWin();
        if (winner) return;

        if (diceValue === 6 || captureOccurred) {
            resetTurn();
        } else {
            nextTurn();
        }
    }
    
    function updateBoard() {
        players.forEach(player => {
            tokens[player].forEach(token => {
                let targetCell;
                if (token.position === -1) {
                    const base = document.querySelector(`#${player}-base .home-area`);
                    const yardSpots = base.querySelectorAll('.token-yard');
                    for(let spot of yardSpots) {
                        if(spot.childElementCount === 0) {
                            targetCell = spot;
                            break;
                        }
                    }
                } else if (token.position > 100) {
                    if (token.isHome) {
                        targetCell = document.querySelector(`#home-triangle`);
                    } else {
                        targetCell = document.querySelector(`[data-home-path-index='${token.position}']`);
                    }
                } else {
                    targetCell = document.querySelector(`[data-path-index='${token.position}']`);
                }
                if (targetCell) targetCell.appendChild(token.element);
            });
        });

        document.querySelectorAll('.cell').forEach(cell => {
            const tokensInCell = cell.querySelectorAll('.token');
            if (tokensInCell.length > 1) {
                tokensInCell.forEach((tokenEl, i) => {
                    tokenEl.style.transform = `translate(${i * 4}px, ${i * 4}px)`;
                    tokenEl.style.zIndex = 10 + i;
                });
            } else if (tokensInCell.length === 1) {
                tokensInCell[0].style.transform = 'translate(0,0)';
                tokensInCell[0].style.zIndex = 10;
            }
        });
    }

    function checkCapture(movedToken) {
        if (movedToken.position > 100 || safeSpots.includes(movedToken.position)) return false;

        const targetCell = movedToken.element.parentElement;
        if (!targetCell) return false;

        const tokensInCell = Array.from(targetCell.querySelectorAll('.token'));
        let captureOccurred = false;

        tokensInCell.forEach(tEl => {
            if (tEl.id === movedToken.element.id) return;
            const t = findTokenByElement(tEl);
            if (t && t.color !== movedToken.color) {
                t.position = -1;
                captureOccurred = true;
            }
        });
        return captureOccurred;
    }
    
    function findTokenByElement(el) {
        for (const player of players) {
            for (const token of tokens[player]) {
                if (token.element === el) return token;
            }
        }
        return null;
    }

    function nextTurn() {
        consecutiveSixes = 0;
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        resetTurn();
    }

    function resetTurn() {
        diceRolled = false;
        diceValue = 0;
        dice.textContent = '🎲';
        const currentPlayer = players[currentPlayerIndex];
        status.textContent = `${currentPlayer}'s turn`;
        status.style.color = colors[currentPlayer];
        dice.style.borderColor = colors[currentPlayer];
    }

    function checkWin() {
        const winner = players.find(p => tokens[p] && tokens[p].every(t => t.isHome));
        if (winner) {
            winnerMessage.textContent = `${winner} wins!`;
            winnerMessage.style.color = colors[winner];
            restartBtn.style.backgroundColor = colors[winner];
            winnerOverlay.style.display = 'flex';
            return winner;
        }
        return null;
    }
    
    function initGame() {
        winnerOverlay.style.display = 'none';

        players.forEach(player => {
            const path = [];
            const start = startPositions[player];
            for (let i = 0; i < 52; i++) {
                let pos = start + i;
                if (pos > 52) pos %= 52;
                if (pos === 0) pos = 52;
                path.push(pos);
            }
            playerPaths[player] = path;
        });

        createBoard();
        createTokens();
        currentPlayerIndex = 0;
        resetTurn();
        updateBoard();
    }

    dice.addEventListener('click', rollDice);
    restartBtn.addEventListener('click', initGame);

    initGame();
});

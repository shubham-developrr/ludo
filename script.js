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
    const homeEntrances = { red: 52, green: 58, yellow: 64, blue: 70 };
    const homePaths = {
        red: [52, 53, 54, 55, 56, 57],
        green: [58, 59, 60, 61, 62, 63],
        yellow: [64, 65, 66, 67, 68, 69],
        blue: [70, 71, 72, 73, 74, 75]
    };

    let currentPlayerIndex = 0;
    let diceValue = 0;
    let diceRolled = false;
    let tokens = {};

    // Path coordinates for placing cells
    const pathCoords = [
        // Red Path
        {r:7,c:2}, {r:7,c:3}, {r:7,c:4}, {r:7,c:5}, {r:7,c:6},
        {r:6,c:7}, {r:5,c:7}, {r:4,c:7}, {r:3,c:7}, {r:2,c:7},
        {r:1,c:7}, {r:1,c:8}, {r:1,c:9},
        // Green Path
        {r:2,c:9}, {r:3,c:9}, {r:4,c:9}, {r:5,c:9}, {r:6,c:9},
        {r:7,c:10}, {r:7,c:11}, {r:7,c:12}, {r:7,c:13}, {r:7,c:14},
        {r:7,c:15}, {r:8,c:15}, {r:9,c:15},
        // Blue Path
        {r:9,c:14}, {r:9,c:13}, {r:9,c:12}, {r:9,c:11}, {r:9,c:10},
        {r:10,c:9}, {r:11,c:9}, {r:12,c:9}, {r:13,c:9}, {r:14,c:9},
        {r:15,c:9}, {r:15,c:8}, {r:15,c:7},
        
        // Yellow Path
        {r:14,c:7}, {r:13,c:7}, {r:12,c:7}, {r:11,c:7}, {r:10,c:7},
        {r:9,c:6}, {r:9,c:5}, {r:9,c:4}, {r:9,c:3}, {r:9,c:2},
        {r:9,c:1}, {r:8,c:1}, {r:7,c:1},
        
    ];

    const homePathCoords = {
        red: [{r:8,c:2}, {r:8,c:3}, {r:8,c:4}, {r:8,c:5}, {r:8,c:6}, {r:8,c:7}],
        green: [{r:2,c:8}, {r:3,c:8}, {r:4,c:8}, {r:5,c:8}, {r:6,c:8}, {r:7,c:8}],
        yellow: [{r:8,c:14}, {r:8,c:13}, {r:8,c:12}, {r:8,c:11}, {r:8,c:10}, {r:8,c:9}],
        blue: [{r:14,c:8}, {r:13,c:8}, {r:12,c:8}, {r:11,c:8}, {r:10,c:8}, {r:9,c:8}]
    };

    const safeSpots = [1, 9, 14, 22, 27, 35, 40, 48];

    function createBoard() {
        // Bases
        board.innerHTML = `
            <div id="red-base" class="base"><div class="home-area"></div></div>
            <div id="green-base" class="base"><div class="home-area"></div></div>
            <div id="yellow-base" class="base"><div class="home-area"></div></div>
            <div id="blue-base" class="base"><div class="home-area"></div></div>
            <div id="home-triangle"><div></div><div></div></div>
        `;

        // Main path
        pathCoords.forEach((coord, i) => {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'path');
            cell.style.gridRow = coord.r;
            cell.style.gridColumn = coord.c;
            cell.dataset.pathIndex = i + 1;
            if (safeSpots.includes(i + 1)) {
                cell.classList.add('safe');
            }
            if (i + 1 === startPositions.red) cell.style.backgroundColor = 'rgba(255, 77, 77, 0.3)';
            if (i + 1 === startPositions.green) cell.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            if (i + 1 === startPositions.yellow) cell.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
            if (i + 1 === startPositions.blue) cell.style.backgroundColor = 'rgba(33, 150, 243, 0.3)';
            board.appendChild(cell);
        });

        // Home paths
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
            base.innerHTML = ''; // Clear previous tokens
            for (let i = 0; i < 4; i++) {
                const tokenEl = document.createElement('div');
                tokenEl.classList.add('token', `${player}-token`);
                tokenEl.id = `${player}-token-${i}`;
                
                const tokenObj = {
                    id: i,
                    color: player,
                    position: -1, // -1 means in base
                    element: tokenEl,
                    isHome: false
                };
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
            diceRolled = true;
            status.textContent = `${players[currentPlayerIndex]} rolled a ${diceValue}`;
            checkMovableTokens();
        }, 500);
    }

    function checkMovableTokens() {
        const currentPlayer = players[currentPlayerIndex];
        const playerTokens = tokens[currentPlayer];
        let hasMovableToken = false;

        playerTokens.forEach(token => {
            if (isMovable(token)) {
                token.element.classList.add('movable');
                hasMovableToken = true;
            }
        });

        if (!hasMovableToken) {
            setTimeout(nextTurn, 1000);
        }
    }
    
    function isMovable(token) {
        if (token.isHome) return false;

        if (token.position === -1) { // In base
            return diceValue === 6;
        }
        
        // Check if move is within home path
        const homePathIndex = homePaths[token.color].indexOf(token.position);
        if (homePathIndex !== -1) {
            return homePathIndex + diceValue < homePaths[token.color].length;
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
        // Clear movable highlights
        document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));

        if (token.position === -1 && diceValue === 6) {
            token.position = startPositions[token.color];
        } else {
            const homeEntrance = homeEntrances[token.color];
            const currentPathIndex = pathCoords.findIndex(p => p.r === token.element.parentElement.style.gridRow.slice(0,-2) && p.c === token.element.parentElement.style.gridColumn.slice(0,-2)) + 1;
            
            const stepsToHomeEntrance = (homeEntrance >= token.position) 
                ? homeEntrance - token.position 
                : (52 - token.position) + homeEntrance;

            if (token.position > 51) { // Already in home path
                const homePathIdx = homePaths[token.color].indexOf(token.position);
                token.position = homePaths[token.color][homePathIdx + diceValue];
            } else if (diceValue > stepsToHomeEntrance + 1) { // Moving into home path
                const stepsIntoHome = diceValue - (stepsToHomeEntrance + 1);
                token.position = homePaths[token.color][stepsIntoHome];
            } else { // Moving on main path
                token.position = (token.position + diceValue - 1) % 52 + 1;
            }
        }
        
        if (token.position === homePaths[token.color][5]) { // Reached home
            token.isHome = true;
        }

        updateBoard();
        checkCapture(token);
        
        if (diceValue === 6 || token.isHome) {
            resetTurn();
        } else {
            nextTurn();
        }
        checkWin();
    }
    
    function updateBoard() {
        players.forEach(player => {
            tokens[player].forEach(token => {
                let targetCell;
                if (token.position === -1) {
                     targetCell = document.querySelector(`#${player}-token-${token.id}`).parentElement;
                } else if (token.position > 51) { // Home path
                    if (token.isHome) {
                        targetCell = document.querySelector(`#home-triangle`);
                    } else {
                        targetCell = document.querySelector(`[data-home-path-index='${token.position}']`);
                    }
                } else { // Main path
                    targetCell = document.querySelector(`[data-path-index='${token.position}']`);
                }
                if (targetCell) {
                   // Handle multiple tokens on one cell
                    const existingTokens = targetCell.querySelectorAll('.token');
                    if (existingTokens.length > 0 && !safeSpots.includes(token.position)) {
                        let offset = existingTokens.length * 5;
                        token.element.style.transform = `translate(${offset}px, ${offset}px)`;
                    } else {
                        token.element.style.transform = 'translate(0,0)';
                    }
                    targetCell.appendChild(token.element);
                }
            });
        });
    }

    function checkCapture(movedToken) {
        if (movedToken.position > 51 || safeSpots.includes(movedToken.position)) return;

        const targetCell = movedToken.element.parentElement;
        const tokensInCell = Array.from(targetCell.querySelectorAll('.token'));

        tokensInCell.forEach(tEl => {
            const t = findTokenByElement(tEl);
            if (t && t.color !== movedToken.color) {
                t.position = -1; // Send back to base
            }
        });
        updateBoard();
    }
    
    function findTokenByElement(el) {
        for (const player of players) {
            for (const token of tokens[player]) {
                if (token.element === el) {
                    return token;
                }
            }
        }
        return null;
    }

    function nextTurn() {
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
        const currentPlayer = players[currentPlayerIndex];
        const playerTokens = tokens[currentPlayer];
        if (playerTokens.every(t => t.isHome)) {
            winnerMessage.textContent = `${currentPlayer} wins!`;
            winnerMessage.style.color = colors[currentPlayer];
            restartBtn.style.backgroundColor = colors[currentPlayer];
            winnerOverlay.style.display = 'flex';
        }
    }
    
    function initGame() {
        board.innerHTML = '';
        winnerOverlay.style.display = 'none';
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
const currentPathIndex = pathCoords.findIndex(p => p.r === token.element.parentElement.style.gridRow.slice(0,-2) && p.c === token.element.parentElement.style.gridColumn.slice(0,-2)) + 1;
if (existingTokens.length > 0 && !safeSpots.includes(token.position)) {
    let offset = existingTokens.length * 5;
    token.element.style.transform = `translate(${offset}px, ${offset}px)`;
} else {
    token.element.style.transform = 'translate(0,0)';
}
const stepsToHomeEntrance = (homeEntrance >= token.position) 
    ? homeEntrance - token.position 
    : (52 - token.position) + homeEntrance;
// ...
if (diceValue > stepsToHomeEntrance + 1) {
    // Move token to home entrance
    token.position = homeEntrance;
}
function moveToken(token) {
    document.querySelectorAll('.movable').forEach(el => el.classList.remove('movable'));

    // Case 1: Token is in the base, needs a 6 to get out
    if (token.position === -1 && diceValue === 6) {
        token.position = startPositions[token.color];
    
    // Case 2: Token is already in its final home path
    } else if (token.position > 51) {
        const homePath = homePaths[token.color];
        const currentHomeIndex = homePath.indexOf(token.position);
        token.position = homePath[currentHomeIndex + diceValue];

    // Case 3: Token is on the main board
    } else {
        const homeEntrance = homeEntrances[token.color];
        // The last square on the main path before the token's home path entrance.
        const lapEndPosition = (homeEntrance - 1 > 0) ? homeEntrance - 1 : 52; 

        // Check if the move will pass or land on the entrance
        let newPos = token.position + diceValue;

        // Logic to handle entering the home path
        if ( (token.position <= lapEndPosition && newPos > lapEndPosition) || 
             (lapEndPosition < token.position && newPos > 52 && (newPos % 52) > lapEndPosition) ) {
            
            const stepsIntoHome = newPos - lapEndPosition - 1;
            token.position = homePaths[token.color][stepsIntoHome];
        } else {
            // Standard move on the circular main path
            token.position = (token.position + diceValue - 1) % 52 + 1;
        }
    }
    
    // Check if token reached the final home spot
    if (token.position === homePaths[token.color][5]) {
        token.isHome = true;
    }

    updateBoard();
    checkCapture(token);
    
    if (diceValue === 6 || token.isHome || captureWasMade) { // Assume checkCapture returns true on a capture
        resetTurn(); // Give player another turn
    } else {
        nextTurn();
    }
    checkWin();
}

class LocalGame {
    constructor(players, callback) {
        this.players = {};
        this.playerConfigs = players; // Contains type: 'human' or 'ai' for each color
        this.activeColors = players.map(p => p.color);
        this.currentPlayerIndex = 0;
        this.diceValue = null;
        this.turnState = 'rolling'; // 'rolling', 'moving'
        this.movableTokens = [];
        this.winner = null;
        this.turnStartTime = Date.now();
        this.turnDuration = 30000; // 30 seconds per turn
        this.callback = callback;
        this.aiMoveTimeout = null;

        this.initializePlayers();
        this.callback(); // Initial state broadcast
        
        // Start AI turn if first player is AI
        if (this.isCurrentPlayerAI()) {
            setTimeout(() => {
                if (this.turnState === 'rolling' && !this.winner) {
                    console.log(`AI ${this.getCurrentPlayer()} is rolling dice...`);
                    this.rollDice();
                }
            }, 1000);
        }
    }

    initializePlayers() {
        this.activeColors.forEach(color => {
            this.players[color] = [
                { id: 0, position: -1, isHome: false },
                { id: 1, position: -1, isHome: false },
                { id: 2, position: -1, isHome: false },
                { id: 3, position: -1, isHome: false }
            ];
        });
    }

    getCurrentPlayer() {
        return this.activeColors[this.currentPlayerIndex];
    }

    getCurrentPlayerConfig() {
        const currentColor = this.getCurrentPlayer();
        return this.playerConfigs.find(p => p.color === currentColor);
    }

    isCurrentPlayerAI() {
        return this.getCurrentPlayerConfig().type === 'ai';
    }

    rollDice() {
        if (this.turnState !== 'rolling' || this.winner) return;

        this.diceValue = Math.floor(Math.random() * 6) + 1;
        this.turnState = 'moving';
        this.updateMovableTokens();

        this.callback(); // Update UI immediately after rolling

        if (this.movableTokens.length === 0) {
            // No valid moves, end turn
            setTimeout(() => this.endTurn(), 1500);
        } else if (this.isCurrentPlayerAI()) {
            // AI player - make automatic move
            console.log(`AI ${this.getCurrentPlayer()} making move with dice ${this.diceValue}...`);
            this.aiMoveTimeout = setTimeout(() => this.makeAIMove(), 2000);
        }
    }

    updateMovableTokens() {
        this.movableTokens = [];
        const currentColor = this.getCurrentPlayer();
        const tokens = this.players[currentColor];

        tokens.forEach(token => {
            if (this.canMoveToken(currentColor, token.id)) {
                this.movableTokens.push({ color: currentColor, id: token.id });
            }
        });
    }

    canMoveToken(color, tokenId) {
        const token = this.players[color][tokenId];
        
        // Token is at home
        if (token.isHome) return false;
        
        // Token is in base
        if (token.position === -1) {
            return this.diceValue === 6;
        }
        
        // Calculate new position
        const newPosition = this.calculateNewPosition(color, token.position, this.diceValue);
        return newPosition !== null;
    }

    calculateNewPosition(color, currentPosition, steps) {
        if (currentPosition === -1) {
            // Coming out of base - only possible with dice value 6
            if (steps === 6) {
                return this.getStartPosition(color);
            }
            return null;
        }
        
        if (currentPosition > 100) {
            // Already in home path - figure out which color's home path
            const homePrefix = this.getHomePathPrefix(color);
            const homePathIndex = currentPosition - homePrefix;
            const newHomeIndex = homePathIndex + steps;
            if (newHomeIndex > 6) return null; // Can't overshoot home
            if (newHomeIndex === 6) return -2; // Reached home
            return homePrefix + newHomeIndex;
        }
        
        // On main path
        const newPos = (currentPosition - 1 + steps) % 52 + 1;
        const homeEntrance = this.getHomeEntrancePosition(color);
        
        // Check if crossing home entrance
        const crossedHome = (currentPosition <= homeEntrance && currentPosition + steps > homeEntrance);
        if (crossedHome) {
            const stepsIntoHome = (currentPosition + steps) - homeEntrance;
            if (stepsIntoHome > 6) return null; // Can't overshoot
            if (stepsIntoHome === 6) return -2; // Reached home
            return this.getHomePathPrefix(color) + stepsIntoHome;
        }
        
        return newPos;
    }

    getStartPosition(color) {
        const startPositions = { red: 1, green: 14, yellow: 27, blue: 40 };
        return startPositions[color];
    }

    getHomeEntrancePosition(color) {
        const homeEntrances = { red: 51, green: 12, yellow: 25, blue: 38 };
        return homeEntrances[color];
    }

    getHomePathPrefix(color) {
        const homePrefixes = { red: 100, green: 200, yellow: 300, blue: 400 };
        return homePrefixes[color];
    }

    moveToken(color, tokenId) {
        if (this.turnState !== 'moving' || this.getCurrentPlayer() !== color || this.winner) return;
        
        const token = this.players[color][tokenId];
        console.log(`Moving ${color} token ${tokenId} from position ${token.position} with dice ${this.diceValue}`);
        
        const newPosition = this.calculateNewPosition(color, token.position, this.diceValue);
        console.log(`New position calculated: ${newPosition}`);
        
        if (newPosition === null) return;
        
        // Handle capturing
        let captureOccurred = false;
        if (newPosition > 0 && newPosition <= 52) {
            captureOccurred = this.handleCapture(newPosition, color);
        }
        
        // Move the token
        if (newPosition === -2) {
            token.isHome = true;
            token.position = -2;
            console.log(`${color} token ${tokenId} reached home!`);
        } else {
            token.position = newPosition;
            console.log(`${color} token ${tokenId} moved to position ${newPosition}`);
        }
        
        // Check for winner
        this.checkWinner();
        
        const reachedHome = (newPosition === -2);
        
        // End turn or give another turn for rolling 6, capturing, or reaching home
        if ((this.diceValue === 6 || captureOccurred || reachedHome) && !this.winner) {
            this.turnState = 'rolling';
            this.turnStartTime = Date.now();
            console.log(`${color} gets another turn for ${this.diceValue === 6 ? 'rolling 6' : captureOccurred ? 'capturing' : 'reaching home'}`);
            
            // If current player is AI, automatically roll again
            if (this.isCurrentPlayerAI()) {
                setTimeout(() => {
                    if (this.turnState === 'rolling' && !this.winner) {
                        console.log(`AI ${this.getCurrentPlayer()} is rolling dice again after getting bonus turn...`);
                        this.rollDice();
                    }
                }, 1500);
            }
        } else {
            this.endTurn();
        }
        
        this.callback();
    }

    handleCapture(position, movingColor) {
        // Check if position is safe
        const safeSpots = [1, 9, 14, 22, 27, 35, 40, 48];
        if (safeSpots.includes(position)) return false;
        
        let captured = false;
        // Check for other tokens at this position
        Object.keys(this.players).forEach(color => {
            if (color === movingColor) return;
            
            this.players[color].forEach(token => {
                if (token.position === position) {
                    token.position = -1; // Send back to base
                    captured = true;
                }
            });
        });
        return captured;
    }

    checkWinner() {
        for (const color of this.activeColors) {
            const allHome = this.players[color].every(token => token.isHome);
            if (allHome) {
                this.winner = color;
                break;
            }
        }
    }

    endTurn() {
        if (this.aiMoveTimeout) {
            clearTimeout(this.aiMoveTimeout);
            this.aiMoveTimeout = null;
        }
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activeColors.length;
        this.diceValue = null;
        this.turnState = 'rolling';
        this.movableTokens = [];
        this.turnStartTime = Date.now();
        
        this.callback();
        
        // If next player is AI, auto-roll after a short delay
        if (this.isCurrentPlayerAI() && !this.winner) {
            setTimeout(() => {
                if (this.turnState === 'rolling' && !this.winner) {
                    console.log(`AI ${this.getCurrentPlayer()} is rolling dice...`);
                    this.rollDice();
                }
            }, 1000);
        }
    }

    makeAIMove() {
        console.log(`AI ${this.getCurrentPlayer()} analyzing moves...`, this.movableTokens);
        
        if (this.movableTokens.length === 0) {
            console.log(`No moves available for AI ${this.getCurrentPlayer()}, ending turn`);
            this.endTurn();
            return;
        }
        
        // Simple AI strategy: prioritize moving tokens out of base, then closest to home
        let bestMove = this.movableTokens[0];
        let bestScore = -1;
        
        this.movableTokens.forEach(move => {
            const token = this.players[move.color][move.id];
            let score = 0;
            
            // Prioritize moving out of base
            if (token.position === -1) score += 10;
            
            // Prioritize tokens closer to home
            if (token.position > 0) score += token.position / 10;
            
            // Prioritize entering home path
            if (token.position > 100) score += 5;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });
        
        console.log(`AI ${this.getCurrentPlayer()} chose to move token ${bestMove.id} from position ${this.players[bestMove.color][bestMove.id].position}`);
        this.moveToken(bestMove.color, bestMove.id);
    }

    getState() {
        return {
            players: this.players,
            currentPlayerColor: this.getCurrentPlayer(),
            diceValue: this.diceValue,
            turnState: this.turnState,
            movableTokens: this.movableTokens,
            winner: this.winner,
            turnEndsAt: this.turnStartTime + this.turnDuration,
            isLocalGame: true,
            currentPlayerType: this.getCurrentPlayerConfig().type
        };
    }
}

// Make it available globally
window.LocalGame = LocalGame;

class Game {
    constructor(players, onStateChange) {
        this.players = players; // array of {id, color}
        this.playerOrder = players.map(p => p.color);
        this.onStateChange = onStateChange; // Callback to broadcast changes

        this.currentPlayerIndex = 0;
        this.turnTimer = null;
        this.turnEndsAt = null;

        this.state = {
            turnState: 'rolling', // rolling, moving
            diceValue: 0,
            movableTokens: [],
            winner: null,
            tokens: this.initializeTokens()
        };

        // Game constants
        this.startPositions = { red: 1, green: 14, yellow: 27, blue: 40 };
        this.homePaths = {
            red: [101, 102, 103, 104, 105, 106],
            green: [201, 202, 203, 204, 205, 206],
            yellow: [301, 302, 303, 304, 305, 306],
            blue: [401, 402, 403, 404, 405, 406]
        };
        this.playerPaths = this.initializePlayerPaths();
        this.safeSpots = [1, 9, 14, 22, 27, 35, 40, 48];

        this.startTurn();
    }

    initializeTokens() { /* ... same as before ... */ }
    initializePlayerPaths() { /* ... same as before ... */ }

    // ... (The copy-paste for the above functions didn't work, I'll have to re-write them from my memory of the previous step)
    initializeTokens() {
        const tokens = {};
        this.players.forEach(p => {
            tokens[p.color] = [];
            for (let i = 0; i < 4; i++) {
                tokens[p.color].push({ id: i, color: p.color, position: -1, isHome: false });
            }
        });
        return tokens;
    }

    initializePlayerPaths() {
        const paths = {};
        this.players.forEach(p => {
            const path = [];
            const start = this.startPositions[p.color];
            for (let i = 0; i < 52; i++) {
                path.push(((start + i - 1) % 52) + 1);
            }
            paths[p.color] = path;
        });
        return paths;
    }


    getState() {
        return {
            players: this.state.tokens,
            currentPlayerColor: this.playerOrder[this.currentPlayerIndex],
            diceValue: this.state.diceValue,
            turnState: this.state.turnState,
            movableTokens: this.state.movableTokens,
            winner: this.state.winner,
            turnEndsAt: this.turnEndsAt
        };
    }

    startTurnTimer() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        this.turnEndsAt = Date.now() + 10000;
        this.turnTimer = setTimeout(() => {
            console.log(`Player ${this.playerOrder[this.currentPlayerIndex]}'s turn timed out.`);
            this.nextTurn();
        }, 10000);
    }

    startTurn() {
        this.state.turnState = 'rolling';
        this.state.diceValue = 0;
        this.state.movableTokens = [];
        this.startTurnTimer();
        this.onStateChange();
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
        this.startTurn();
    }

    rollDice(playerId) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId || this.state.turnState !== 'rolling') return;

        this.state.diceValue = Math.floor(Math.random() * 6) + 1;
        this.state.turnState = 'moving';

        this.updateMovableTokens();

        if (this.state.movableTokens.length === 0) {
            this.startTurnTimer(); // Reset timer before ending turn
            setTimeout(() => this.nextTurn(), 500); // Give user time to see dice
        } else {
            this.startTurnTimer(); // Reset timer for move
        }
        this.onStateChange();
    }

    moveToken(playerId, color, tokenId) {
        const player = this.players[this.currentPlayerIndex];
        if (player.id !== playerId || this.state.turnState !== 'moving' || player.color !== color) return;

        const token = this.state.tokens[color].find(t => t.id === tokenId);
        const isMovable = this.state.movableTokens.some(mt => mt.id === tokenId && mt.color === color);
        if (!token || !isMovable) return;

        if (token.position === -1) {
            token.position = this.startPositions[color];
        } else {
            const path = this.playerPaths[color];
            const currentPathIndex = path.indexOf(token.position);
            const newPathIndex = currentPathIndex + this.state.diceValue;
            const homeEntrance = this.getHomeEntrancePosition(color);

            // Check if the move crosses the home entrance
            const currentPosition = token.position;
            const stepsToMove = this.state.diceValue;
            const willCrossHome = this.willCrossHomeEntrance(color, currentPosition, stepsToMove);

            if (willCrossHome) {
                const stepsAfterHome = this.getStepsAfterHomeEntrance(color, currentPosition, stepsToMove);
                if (stepsAfterHome <= 6) {
                    if (stepsAfterHome === 6) {
                        token.position = -2; // Reached final home
                        token.isHome = true;
                    } else {
                        token.position = this.homePaths[color][stepsAfterHome - 1];
                    }
                } else {
                    // Can't overshoot home - invalid move
                    return;
                }
            } else if (newPathIndex < 52) {
                token.position = path[newPathIndex];
            } else {
                // Completing a full loop without entering home (shouldn't happen normally)
                token.position = path[newPathIndex % 52];
            }
        }

        const captureOccurred = this.checkCapture(token);
        const reachedHome = token.isHome && token.position === -2;
        this.checkWin();

        if (this.state.diceValue === 6 || captureOccurred || reachedHome) {
            this.startTurn(); // Same player's turn again
        } else {
            this.nextTurn();
        }
        this.onStateChange();
    }

    updateMovableTokens() {
        const color = this.playerOrder[this.currentPlayerIndex];
        if (!this.state.tokens[color]) {
            this.state.movableTokens = [];
            return;
        }
        this.state.movableTokens = this.state.tokens[color].filter(t => this.isTokenMovable(t));
    }

    isTokenMovable(token) {
        if (token.isHome) return false;
        if (token.position === -1) return this.state.diceValue === 6;

        if (token.position > 100) {
            const homePath = this.homePaths[token.color];
            const currentHomeIndex = homePath.indexOf(token.position);
            return currentHomeIndex + this.state.diceValue < homePath.length;
        }
        return true;
    }

    checkCapture(movedToken) {
        if (movedToken.position > 100 || this.safeSpots.includes(movedToken.position)) return false;
        let captured = false;
        Object.keys(this.state.tokens).forEach(color => {
            if (color === movedToken.color) return;
            this.state.tokens[color].forEach(token => {
                if (token.position === movedToken.position) {
                    token.position = -1;
                    captured = true;
                }
            });
        });
        return captured;
    }

    getHomeEntrancePosition(color) {
        const homeEntrances = { red: 51, green: 12, yellow: 25, blue: 38 };
        return homeEntrances[color];
    }

    willCrossHomeEntrance(color, currentPosition, steps) {
        const homeEntrance = this.getHomeEntrancePosition(color);
        const path = this.playerPaths[color];
        const currentIndex = path.indexOf(currentPosition);
        
        if (currentIndex === -1) return false;
        
        for (let i = 1; i <= steps; i++) {
            const nextIndex = currentIndex + i;
            if (nextIndex < path.length && path[nextIndex] === homeEntrance) {
                return true;
            }
        }
        return false;
    }

    getStepsAfterHomeEntrance(color, currentPosition, totalSteps) {
        const homeEntrance = this.getHomeEntrancePosition(color);
        const path = this.playerPaths[color];
        const currentIndex = path.indexOf(currentPosition);
        
        for (let i = 1; i <= totalSteps; i++) {
            const nextIndex = currentIndex + i;
            if (nextIndex < path.length && path[nextIndex] === homeEntrance) {
                return totalSteps - i;
            }
        }
        return 0;
    }

    checkWin() {
        const color = this.playerOrder[this.currentPlayerIndex];
        if (!this.state.tokens[color]) return;
        const allHome = this.state.tokens[color].every(t => t.isHome);
        if (allHome) this.state.winner = color;
    }

    removePlayer(color) {
        const index = this.playerOrder.indexOf(color);
        if (index > -1) {
            if (this.currentPlayerIndex === index) {
                // If it was their turn, immediately advance to the next player
                this.currentPlayerIndex = this.currentPlayerIndex % (this.playerOrder.length -1);
                this.playerOrder.splice(index, 1);
                this.startTurn();
            } else {
                this.playerOrder.splice(index, 1);
                if (this.currentPlayerIndex > index) {
                    this.currentPlayerIndex--;
                }
            }
        }
        if (this.state.tokens[color]) {
            delete this.state.tokens[color];
        }
    }
}

module.exports = Game;

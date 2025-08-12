class AnimationManager {
    constructor() {
        this.settings = {
            gameSpeed: 1,
            animationStyle: 'modern', // 'modern' or 'playful'
            isPlayfulMode: false
        };
        
        this.luckyStreakCount = 0;
        this.lastDiceValue = null;
        
        this.loadSettings();
        // setupEventListeners will be called after DOM is ready
    }

    loadSettings() {
        // Load settings from localStorage
        const savedSpeed = localStorage.getItem('ludoGameSpeed');
        const savedStyle = localStorage.getItem('ludoAnimationStyle');
        
        if (savedSpeed) this.settings.gameSpeed = parseFloat(savedSpeed);
        if (savedStyle) {
            this.settings.animationStyle = savedStyle;
            this.settings.isPlayfulMode = savedStyle === 'playful';
        }
        
        this.applySettings();
    }

    saveSettings() {
        localStorage.setItem('ludoGameSpeed', this.settings.gameSpeed.toString());
        localStorage.setItem('ludoAnimationStyle', this.settings.animationStyle);
    }

    setupEventListeners() {
        // Speed controls
        const speedOptions = document.querySelectorAll('.speed-option');
        speedOptions.forEach(option => {
            option.addEventListener('click', () => {
                const speed = parseFloat(option.dataset.speed);
                this.setGameSpeed(speed);
                
                // Update active state
                speedOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });

        // Animation style toggle
        const animationToggle = document.getElementById('animation-style-toggle');
        if (animationToggle) {
            animationToggle.checked = this.settings.isPlayfulMode;
            animationToggle.addEventListener('change', () => {
                this.setAnimationStyle(animationToggle.checked ? 'playful' : 'modern');
            });
        }
    }

    setGameSpeed(speed) {
        this.settings.gameSpeed = speed;
        this.saveSettings();
        this.applySettings();
    }

    setAnimationStyle(style) {
        this.settings.animationStyle = style;
        this.settings.isPlayfulMode = style === 'playful';
        this.saveSettings();
        this.applySettings();
    }

    applySettings() {
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;

        // Remove existing speed classes
        gameContainer.classList.remove('game-speed-1', 'game-speed-1-5', 'game-speed-2');
        
        // Add current speed class
        if (this.settings.gameSpeed === 1.5) {
            gameContainer.classList.add('game-speed-1-5');
        } else if (this.settings.gameSpeed === 2) {
            gameContainer.classList.add('game-speed-2');
        } else {
            gameContainer.classList.add('game-speed-1');
        }
    }

    // Dice Roll Animation
    animateDiceRoll(diceElement, diceValue) {
        const isPlayful = this.settings.isPlayfulMode;
        const animationClass = isPlayful ? 'playful-rolling' : 'modern-rolling';
        
        // Remove existing animation classes
        diceElement.classList.remove('rolling', 'modern-rolling', 'playful-rolling');
        
        // Add new animation class
        diceElement.classList.add(animationClass);
        
        // Track lucky streak
        this.trackLuckyStreak(diceValue);
        
        // Remove animation class after animation completes
        const duration = isPlayful ? 700 : 400;
        const adjustedDuration = duration / this.settings.gameSpeed;
        
        setTimeout(() => {
            diceElement.classList.remove(animationClass);
        }, adjustedDuration);
    }

    // Token Movement Animation
    animateTokenMove(tokenElement, targetCell, distance = 1) {
        const isPlayful = this.settings.isPlayfulMode;
        const animationClass = isPlayful ? 'playful-moving' : 'modern-moving';
        
        // Remove existing animation classes
        tokenElement.classList.remove('modern-moving', 'playful-moving');
        
        if (isPlayful) {
            // Playful: Use CSS animation for hop effect
            tokenElement.classList.add(animationClass);
            
            // Move token to target cell
            targetCell.appendChild(tokenElement);
            
            // Remove animation class after completion
            const duration = 300 / this.settings.gameSpeed;
            setTimeout(() => {
                tokenElement.classList.remove(animationClass);
            }, duration);
        } else {
            // Modern: Use CSS transition for smooth movement
            tokenElement.classList.add(animationClass);
            
            // Move token to target cell
            targetCell.appendChild(tokenElement);
            
            // Remove animation class after transition
            const duration = 200 / this.settings.gameSpeed;
            setTimeout(() => {
                tokenElement.classList.remove(animationClass);
            }, duration);
        }
    }

    // Long Distance Token Movement (3+ spaces)
    animateLongTokenMove(tokenElement, path, onComplete) {
        const isPlayful = this.settings.isPlayfulMode;
        const stepDelay = isPlayful ? 100 : 100; // ms between steps
        const adjustedStepDelay = stepDelay / this.settings.gameSpeed;
        
        let currentStep = 0;
        
        const moveNextStep = () => {
            if (currentStep >= path.length) {
                if (onComplete) onComplete();
                return;
            }
            
            const targetCell = path[currentStep];
            this.animateTokenMove(tokenElement, targetCell, 1);
            
            currentStep++;
            setTimeout(moveNextStep, adjustedStepDelay);
        };
        
        moveNextStep();
    }

    // Capture Effect Animation
    animateCapture(capturedTokenElement, capturingTokenElement) {
        const isPlayful = this.settings.isPlayfulMode;
        const effectClass = isPlayful ? 'capture-effect playful' : 'capture-effect modern';
        
        // Create capture effect element
        const effectElement = document.createElement('div');
        effectElement.className = effectClass;
        effectElement.style.position = 'absolute';
        effectElement.style.left = '50%';
        effectElement.style.top = '50%';
        effectElement.style.transform = 'translate(-50%, -50%)';
        effectElement.style.width = '20px';
        effectElement.style.height = '20px';
        effectElement.style.borderRadius = '50%';
        effectElement.style.backgroundColor = capturedTokenElement.style.backgroundColor || '#fff';
        effectElement.style.zIndex = '1000';
        
        // Add to the captured token's parent
        const parent = capturedTokenElement.parentElement;
        parent.appendChild(effectElement);
        
        // Remove effect after animation
        const duration = isPlayful ? 500 : 200;
        const adjustedDuration = duration / this.settings.gameSpeed;
        
        setTimeout(() => {
            if (effectElement.parentElement) {
                effectElement.parentElement.removeChild(effectElement);
            }
        }, adjustedDuration);
    }

    // Home Arrival Effect Animation
    animateHomeArrival(tokenElement, homeCell) {
        const isPlayful = this.settings.isPlayfulMode;
        const effectClass = isPlayful ? 'home-arrival playful' : 'home-arrival modern';
        
        // Add effect class to home cell
        homeCell.classList.add(effectClass);
        
        // Remove effect class after animation
        const duration = isPlayful ? 500 : 600;
        const adjustedDuration = duration / this.settings.gameSpeed;
        
        setTimeout(() => {
            homeCell.classList.remove(effectClass);
        }, adjustedDuration);
    }

    // Lucky Streak Tracking and Animation
    trackLuckyStreak(diceValue) {
        if (diceValue === 6) {
            if (this.lastDiceValue === 6) {
                this.luckyStreakCount++;
                
                // Show lucky streak indicator after 3 consecutive sixes
                if (this.luckyStreakCount >= 3) {
                    this.showLuckyStreak();
                }
            } else {
                this.luckyStreakCount = 1;
            }
        } else {
            this.luckyStreakCount = 0;
        }
        
        this.lastDiceValue = diceValue;
    }

    showLuckyStreak() {
        const indicator = document.getElementById('lucky-streak-indicator');
        if (!indicator) return;
        
        const isPlayful = this.settings.isPlayfulMode;
        const styleClass = isPlayful ? 'playful' : 'modern';
        
        // Remove existing style classes
        indicator.classList.remove('modern', 'playful', 'hidden');
        
        // Add current style class and show
        indicator.classList.add(styleClass);
        
        // Hide after animation
        const duration = isPlayful ? 1000 : 800;
        const adjustedDuration = duration / this.settings.gameSpeed;
        
        setTimeout(() => {
            indicator.classList.add('hidden');
        }, adjustedDuration);
    }

    // Utility method to get animation duration based on current settings
    getAnimationDuration(baseDuration) {
        return baseDuration / this.settings.gameSpeed;
    }

    // Method to check if animations are enabled
    isAnimationsEnabled() {
        return true; // Always enabled, just different styles
    }

    // Method to get current animation style
    getAnimationStyle() {
        return this.settings.animationStyle;
    }

    // Method to get current game speed
    getGameSpeed() {
        return this.settings.gameSpeed;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationManager;
}
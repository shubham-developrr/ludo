class SoundManager {
    constructor() {
        // Priority 1: Core Actions
        this.sounds = {
            diceRollStart: new Audio('assets/audio/dice_roll_start.mp3'),
            diceRollEnd: new Audio('assets/audio/dice_roll_end.mp3'),
            tokenMove: new Audio('assets/audio/token_move.mp3'),
            tokenCapture: new Audio('assets/audio/capture.mp3'),
            tokenSafeHome: new Audio('assets/audio/safe_home.mp3'),
            yourTurnAlert: new Audio('assets/audio/your_turn.mp3'),

            // Priority 2: Feedback Sounds
            rollingASix: new Audio('assets/audio/roll_six.mp3'),
            tripleSixPenalty: new Audio('assets/audio/wah_wah.mp3'),
            buttonClick: new Audio('assets/audio/button_click.mp3'),
            invalidMove: new Audio('assets/audio/invalid_move.mp3'),
            gameStart: new Audio('assets/audio/game_start.mp3'),
            victory: new Audio('assets/audio/victory.mp3'),

            // Priority 3: Polish Sounds
            tokenSelect: new Audio('assets/audio/token_select.mp3'),
            blockade: new Audio('assets/audio/blockade.mp3'),
            opponentJoins: new Audio('assets/audio/opponent_joins.mp3'),
            chatMessage: new Audio('assets/audio/chat_pop.mp3'),
            emojiReaction: new Audio('assets/audio/boop.mp3'),
        };

        this.isMuted = false;
        this.masterVolume = 1.0;

        // Set default volumes
        this.sounds.tokenMove.volume = 0.5;
        this.sounds.buttonClick.volume = 0.3;
        this.sounds.yourTurnAlert.volume = 0.4;
    }

    play(name, options = {}) {
        if (this.isMuted) return;

        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound not found: ${name}`);
            return;
        }

        const soundInstance = sound.cloneNode(true);
        soundInstance.volume = (options.volume || sound.volume) * this.masterVolume;
        soundInstance.playbackRate = options.speed || 1;
        soundInstance.play().catch(e => console.error(`Error playing sound: ${name}`, e));
    }

    setMuted(muted) {
        this.isMuted = muted;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

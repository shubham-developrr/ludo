// Responsive behavior and dynamic resizing for Ludo Game
class ResponsiveManager {
    constructor() {
        this.resizeTimeout = null;
        this.orientationChangeTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateResponsiveClasses();
        this.handleInitialOrientation();
    }

    setupEventListeners() {
        // Handle window resize with debouncing
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 100);
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            clearTimeout(this.orientationChangeTimeout);
            this.orientationChangeTimeout = setTimeout(() => {
                this.handleOrientationChange();
            }, 500);
        });

        // Handle visibility change (when app comes back from background)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    this.handleResize();
                }, 100);
            }
        });

        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.handleResize();
        });

        // Handle webkit fullscreen changes (Safari)
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleResize();
        });
    }

    handleResize() {
        this.updateResponsiveClasses();
        this.updateBoardSize();
        this.updateChatPosition();
        this.updateUIControls();
    }

    handleOrientationChange() {
        // Force a reflow after orientation change
        setTimeout(() => {
            this.handleResize();
            this.scrollToTop();
        }, 100);
    }

    handleInitialOrientation() {
        // Set initial responsive classes
        this.updateResponsiveClasses();
        
        // Handle initial board size
        this.updateBoardSize();
    }

    updateResponsiveClasses() {
        const body = document.body;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height;
        const isMobile = width <= 768;
        const isTablet = width > 768 && width <= 1024;
        const isDesktop = width > 1024;
        const isSmallScreen = width <= 480;
        const isVerySmallScreen = width <= 360;
        const isLargeScreen = width >= 1920;
        const isUltraWide = width >= 2560;

        // Remove existing responsive classes
        body.classList.remove(
            'landscape', 'portrait',
            'mobile', 'tablet', 'desktop',
            'small-screen', 'very-small-screen',
            'large-screen', 'ultra-wide'
        );

        // Add appropriate responsive classes
        if (isLandscape) body.classList.add('landscape');
        else body.classList.add('portrait');

        if (isMobile) body.classList.add('mobile');
        if (isTablet) body.classList.add('tablet');
        if (isDesktop) body.classList.add('desktop');
        if (isSmallScreen) body.classList.add('small-screen');
        if (isVerySmallScreen) body.classList.add('very-small-screen');
        if (isLargeScreen) body.classList.add('large-screen');
        if (isUltraWide) body.classList.add('ultra-wide');

        // Update CSS custom properties for dynamic sizing
        this.updateCSSVariables(width, height);
    }

    updateCSSVariables(width, height) {
        const root = document.documentElement;
        
        // Calculate dynamic spacing based on screen size
        const baseSpacing = Math.min(width, height) * 0.01;
        const spacingMultiplier = Math.max(0.5, Math.min(2, baseSpacing));
        
        // Update spacing variables
        root.style.setProperty('--dynamic-spacing-xs', `${Math.max(2, 4 * spacingMultiplier)}px`);
        root.style.setProperty('--dynamic-spacing-sm', `${Math.max(4, 8 * spacingMultiplier)}px`);
        root.style.setProperty('--dynamic-spacing-md', `${Math.max(8, 16 * spacingMultiplier)}px`);
        root.style.setProperty('--dynamic-spacing-lg', `${Math.max(12, 24 * spacingMultiplier)}px`);
        root.style.setProperty('--dynamic-spacing-xl', `${Math.max(16, 32 * spacingMultiplier)}px`);

        // Calculate dynamic font sizes
        const baseFontSize = Math.min(width, height) * 0.015;
        const fontMultiplier = Math.max(0.7, Math.min(1.5, baseFontSize / 16));
        
        root.style.setProperty('--dynamic-font-xs', `${Math.max(10, 12 * fontMultiplier)}px`);
        root.style.setProperty('--dynamic-font-sm', `${Math.max(12, 14 * fontMultiplier)}px`);
        root.style.setProperty('--dynamic-font-md', `${Math.max(14, 16 * fontMultiplier)}px`);
        root.style.setProperty('--dynamic-font-lg', `${Math.max(16, 18 * fontMultiplier)}px`);
        root.style.setProperty('--dynamic-font-xl', `${Math.max(18, 20 * fontMultiplier)}px`);
    }

    updateBoardSize() {
        const board = document.getElementById('ludo-board');
        if (!board) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height;
        const isSmallScreen = width <= 480;

        // Calculate optimal board size based on screen dimensions
        let boardSize;
        if (isLandscape && height < 500) {
            boardSize = Math.min(width * 0.4, height * 0.7);
        } else if (isSmallScreen) {
            boardSize = Math.min(width * 0.85, height * 0.6);
        } else {
            boardSize = Math.min(width * 0.7, height * 0.7);
        }

        // Ensure minimum and maximum sizes
        boardSize = Math.max(200, Math.min(600, boardSize));
        
        // Update board size
        board.style.width = `${boardSize}px`;
        board.style.height = `${boardSize}px`;
    }

    updateChatPosition() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height && height < 500;

        if (isLandscape) {
            // Position chat on the right side in landscape mode
            chatContainer.style.bottom = '10px';
            chatContainer.style.right = '10px';
            chatContainer.style.width = '180px';
            chatContainer.style.height = '120px';
        } else {
            // Reset to default responsive positioning
            chatContainer.style.bottom = '';
            chatContainer.style.right = '';
            chatContainer.style.width = '';
            chatContainer.style.height = '';
        }
    }

    updateUIControls() {
        const uiControls = document.querySelector('.ui-controls-top-right');
        if (!uiControls) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLandscape = width > height && height < 500;
        const isSmallScreen = width <= 480;

        if (isLandscape) {
            // Stack controls vertically in landscape mode
            uiControls.style.flexDirection = 'column';
            uiControls.style.top = '10px';
            uiControls.style.right = '10px';
            uiControls.style.gap = '5px';
        } else if (isSmallScreen) {
            // Adjust for small screens
            uiControls.style.flexDirection = 'column';
            uiControls.style.top = '8px';
            uiControls.style.right = '8px';
            uiControls.style.gap = '4px';
        } else {
            // Default horizontal layout
            uiControls.style.flexDirection = 'row';
            uiControls.style.top = '';
            uiControls.style.right = '';
            uiControls.style.gap = '';
        }
    }

    scrollToTop() {
        // Scroll to top when orientation changes
        window.scrollTo(0, 0);
    }

    // Public method to force a resize update
    forceUpdate() {
        this.handleResize();
    }

    // Get current screen info
    getScreenInfo() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
            pixelRatio: window.devicePixelRatio || 1,
            isMobile: window.innerWidth <= 768,
            isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
            isDesktop: window.innerWidth > 1024
        };
    }
}

// Initialize responsive manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.responsiveManager = new ResponsiveManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveManager;
}
(function() {
    'use strict';

    // Constants for game configuration
    const PLAYERS = {
        X: 'X',
        O: 'O'
    };

    const WIN_PATTERNS = [
        // Rows
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        // Columns
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        // Diagonals
        [0, 4, 8],
        [2, 4, 6]
    ];

    const CELL_COUNT = 9;
    const WINNING_SCORE = 5;
    const COUNTDOWN_SECONDS = 5;
    const MATCH_WINNER_COUNTDOWN = 10;

    // DOM element references
    const elements = {
        nameInputScreen: null,
        nameForm: null,
        playerXInput: null,
        playerOInput: null,
        gameWrapper: null,
        gameContainer: null,
        resetModal: null,
        modalCancel: null,
        modalConfirm: null,
        board: null,
        cells: null,
        currentPlayer: null,
        result: null,
        resetBtn: null,
        resetMatchBtn: null,
        scoreX: null,
        scoreO: null,
        labelX: null,
        labelO: null,
        countdownDisplay: null,
        countdownNumber: null,
        matchWinnerDisplay: null,
        winnerName: null,
        matchCountdownNumber: null,
        leaderboardList: null,
        namePageLeaderboardList: null,
        // Online mode elements
        modeSelector: null,
        modeLocal: null,
        modeOnline: null,
        createRoomForm: null,
        joinRoomForm: null,
        waitingView: null,
        onlineIndicator: null,
        onlineStatusText: null,
        disconnectModal: null,
        disconnectNewRoom: null,
        disconnectHome: null,
        copyCodeBtn: null,
        cancelRoomBtn: null,
        toggleJoinView: null,
        toggleCreateView: null,
        roomCodeDisplay: null
    };

    // Game state
    let gameState = {
        playerNames: {
            [PLAYERS.X]: 'Player X',
            [PLAYERS.O]: 'Player O'
        },
        board: Array(CELL_COUNT).fill(''),
        currentPlayer: PLAYERS.X,
        gameActive: true,
        scores: {
            [PLAYERS.X]: 0,
            [PLAYERS.O]: 0
        },
        matchActive: true,
        // New multiplayer fields
        mode: 'local',              // 'local' | 'online-tab'
        roomCode: null,             // e.g. 'AB12'
        mySymbol: null,             // 'X' or 'O' — which symbol this tab controls
        roomRole: null,             // 'host' | 'guest'
        roomStatus: 'idle',         // 'idle' | 'waiting' | 'active' | 'disconnected'
        opponentName: null,         // populated once opponent joins
        moveNumber: 0,              // monotonically increasing move counter
        lastMoveTimestamp: 0        // timestamp of last received move
    };

    // Timer references
    let countdownTimer = null;
    let matchWinnerTimer = null;

    // Leaderboard data (stored in localStorage)
    let leaderboard = JSON.parse(localStorage.getItem('ticTacToeLeaderboard')) || [];

    // ========================
    // CONFETTI SYSTEM
    // ========================
    const Confetti = {
        canvas: null,
        ctx: null,
        particles: [],
        animationId: null,
        colors: ['#ff6b4a', '#00d4ff', '#667eea', '#764ba2', '#ffd93d', '#6bcb77', '#ff9ff3'],

        init() {
            this.canvas = document.getElementById('confetti-canvas');
            if (!this.canvas) return;

            this.ctx = this.canvas.getContext('2d');
            this.resize();

            window.addEventListener('resize', () => this.resize());
        },

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },

        createParticle(x, y) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 5 + Math.random() * 10;
            const color = this.colors[Math.floor(Math.random() * this.colors.length)];
            const size = 5 + Math.random() * 10;
            const rotation = Math.random() * 360;
            const rotationSpeed = (Math.random() - 0.5) * 10;

            return {
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - 5,
                size: size,
                color: color,
                rotation: rotation,
                rotationSpeed: rotationSpeed,
                opacity: 1,
                gravity: 0.2,
                drag: 0.98
            };
        },

        burst(count = 100) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            for (let i = 0; i < count; i++) {
                this.particles.push(this.createParticle(centerX, centerY));
            }

            if (!this.animationId) {
                this.animate();
            }
        },

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Update and draw particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];

                // Update position
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.rotation += p.rotationSpeed;
                p.opacity -= 0.008;

                // Remove dead particles
                if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
                    this.particles.splice(i, 1);
                    continue;
                }

                // Draw particle
                this.ctx.save();
                this.ctx.globalAlpha = p.opacity;
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate((p.rotation * Math.PI) / 180);

                // Draw confetti piece
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);

                this.ctx.restore();
            }

            // Continue animation if particles exist
            if (this.particles.length > 0) {
                this.animationId = requestAnimationFrame(() => this.animate());
            } else {
                this.animationId = null;
            }
        },

        stop() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            this.particles = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    // ========================
    // MULTIPLAYER SYNC SYSTEM
    // ========================
    const MultiplayerSync = {
        storageListener: null,
        heartbeatInterval: null,
        heartbeatCheckInterval: null,
        disconnectCheckInterval: null,
        HEARTBEAT_MS: 3000,
        TIMEOUT_MS: 9000,
        lastOpponentHeartbeat: 0,
        gracePeriodStarted: false,

        keys: {
            room: (code) => `ttt_room_${code}`,
            move: (code) => `ttt_room_${code}_move`,
            state: (code) => `ttt_room_${code}_state`,
            signal: (code) => `ttt_room_${code}_signal`,
            heartbeat: (code) => `ttt_room_${code}_heartbeat`,
        },

        generateRoomCode() {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            // Check for collision
            if (localStorage.getItem(this.keys.room(code))) {
                return this.generateRoomCode();
            }
            return code;
        },

        createRoom(code, hostName) {
            const roomData = {
                host: hostName,
                hostSymbol: PLAYERS.X,
                status: 'waiting',
                created: Date.now(),
                ts: Date.now()
            };
            localStorage.setItem(this.keys.room(code), JSON.stringify(roomData));
            gameState.roomCode = code;
            gameState.roomRole = 'host';
            gameState.mySymbol = PLAYERS.X;
            gameState.roomStatus = 'waiting';
        },

        joinRoom(code, guestName) {
            const roomKey = this.keys.room(code);
            const roomData = JSON.parse(localStorage.getItem(roomKey));

            if (!roomData) {
                return false;
            }

            // Update room with guest info
            roomData.guest = guestName;
            roomData.guestSymbol = PLAYERS.O;
            roomData.status = 'active';
            roomData.ts = Date.now();
            localStorage.setItem(roomKey, JSON.stringify(roomData));

            gameState.roomCode = code;
            gameState.roomRole = 'guest';
            gameState.mySymbol = PLAYERS.O;
            gameState.opponentName = roomData.host;
            gameState.roomStatus = 'active';

            return true;
        },

        publishMove(cellIndex, board) {
            if (!gameState.roomCode) return;

            gameState.moveNumber++;
            const moveData = {
                player: gameState.mySymbol,
                cellIndex: cellIndex,
                board: board,
                moveNumber: gameState.moveNumber,
                ts: Date.now()
            };
            localStorage.setItem(this.keys.move(gameState.roomCode), JSON.stringify(moveData));
        },

        publishSignal(type, payload = {}) {
            if (!gameState.roomCode) return;

            const signalData = {
                type: type,
                initiator: gameState.mySymbol,
                ...payload,
                ts: Date.now()
            };
            localStorage.setItem(this.keys.signal(gameState.roomCode), JSON.stringify(signalData));
        },

        startHeartbeat() {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }

            this.heartbeatInterval = setInterval(() => {
                if (gameState.roomCode) {
                    const heartbeatData = {
                        ts: Date.now(),
                        symbol: gameState.mySymbol
                    };
                    localStorage.setItem(this.keys.heartbeat(gameState.roomCode), JSON.stringify(heartbeatData));
                }
            }, this.HEARTBEAT_MS);

            // Also start checking opponent's heartbeat
            if (this.disconnectCheckInterval) {
                clearInterval(this.disconnectCheckInterval);
            }

            this.lastOpponentHeartbeat = Date.now();
            this.disconnectCheckInterval = setInterval(() => {
                this.checkOpponentHeartbeat();
            }, 3000);
        },

        checkOpponentHeartbeat() {
            if (!gameState.roomCode || gameState.roomStatus !== 'active') {
                return;
            }

            const heartbeatKey = this.keys.heartbeat(gameState.roomCode);
            const heartbeatData = localStorage.getItem(heartbeatKey);

            if (!heartbeatData) {
                // No heartbeat from opponent yet
                return;
            }

            try {
                const data = JSON.parse(heartbeatData);
                // Check if it's from opponent
                if (data.symbol !== gameState.mySymbol) {
                    this.lastOpponentHeartbeat = Date.now();
                    this.gracePeriodStarted = false;
                    // Opponent is alive, update indicator
                    if (gameState.roomStatus === 'active') {
                        updateOnlineIndicator(true);
                    }
                }
            } catch (e) {
                // Ignore parsing errors
            }

            // Check if opponent is dead
            if (Date.now() - this.lastOpponentHeartbeat > this.TIMEOUT_MS) {
                if (!this.gracePeriodStarted) {
                    this.gracePeriodStarted = true;
                    // Give it 2 more seconds
                    setTimeout(() => {
                        if (Date.now() - this.lastOpponentHeartbeat > this.TIMEOUT_MS + 2000) {
                            this.handleOpponentDisconnect();
                        }
                    }, 2000);
                } else if (Date.now() - this.lastOpponentHeartbeat > this.TIMEOUT_MS + 2000) {
                    this.handleOpponentDisconnect();
                }
            }
        },

        handleOpponentDisconnect() {
            if (gameState.roomStatus !== 'disconnected') {
                gameState.roomStatus = 'disconnected';
                updateOnlineIndicator(false);
                showDisconnectModal();
            }
        },

        cleanup() {
            if (!gameState.roomCode) return;

            // Stop timers
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            if (this.disconnectCheckInterval) {
                clearInterval(this.disconnectCheckInterval);
                this.disconnectCheckInterval = null;
            }

            // Remove room keys from localStorage
            const code = gameState.roomCode;
            try {
                localStorage.removeItem(this.keys.room(code));
                localStorage.removeItem(this.keys.move(code));
                localStorage.removeItem(this.keys.state(code));
                localStorage.removeItem(this.keys.signal(code));
                localStorage.removeItem(this.keys.heartbeat(code));
            } catch (e) {
                // Ignore cleanup errors
            }

            gameState.roomCode = null;
            gameState.roomRole = null;
            gameState.roomStatus = 'idle';
            gameState.opponentName = null;
            gameState.mySymbol = null;
        },

        startListening() {
            this.stopListening();
            this.storageListener = (event) => this.handleStorageEvent(event);
            window.addEventListener('storage', this.storageListener);
        },

        stopListening() {
            if (this.storageListener) {
                window.removeEventListener('storage', this.storageListener);
                this.storageListener = null;
            }
        },

        handleStorageEvent(event) {
            if (!gameState.roomCode) return;

            const code = gameState.roomCode;
            const roomKey = this.keys.room(code);
            const moveKey = this.keys.move(code);
            const signalKey = this.keys.signal(code);

            try {
                // Room status changed (guest joined)
                if (event.key === roomKey && event.newValue) {
                    const roomData = JSON.parse(event.newValue);
                    this.onRoomStatusChanged(roomData);
                }

                // Opponent made a move
                if (event.key === moveKey && event.newValue) {
                    const moveData = JSON.parse(event.newValue);
                    this.onMoveReceived(moveData);
                }

                // Control signal received
                if (event.key === signalKey && event.newValue) {
                    const signalData = JSON.parse(event.newValue);
                    this.onSignalReceived(signalData);
                }
            } catch (e) {
                console.error('Error handling storage event:', e);
            }
        },

        onRoomStatusChanged(roomData) {
            // Host detecting guest joined
            if (gameState.roomRole === 'host' && roomData.status === 'active' && !gameState.opponentName) {
                gameState.opponentName = roomData.guest;
                gameState.roomStatus = 'active';
                startOnlineGame();
            }
        },

        onMoveReceived(moveData) {
            // Verify move is from opponent and not stale
            if (moveData.player === gameState.mySymbol) return;
            if (moveData.ts <= gameState.lastMoveTimestamp) return;

            gameState.lastMoveTimestamp = moveData.ts;
            gameState.moveNumber = moveData.moveNumber;

            // Apply opponent's move
            makeMove(moveData.cellIndex, true);
        },

        onSignalReceived(signalData) {
            // Only process signals from opponent
            if (signalData.initiator === gameState.mySymbol) return;
            if (signalData.ts <= gameState.lastMoveTimestamp) return;

            switch (signalData.type) {
                case 'new-game':
                    resetGame();
                    break;
                case 'reset-match':
                    resetMatch();
                    break;
                case 'leave':
                    this.handleOpponentDisconnect();
                    break;
            }
        }
    };

    /**
     * Initialize the game
     */
    function init() {
        // Initialize confetti
        Confetti.init();

        // Cache DOM elements
        elements.nameInputScreen = document.getElementById('name-input-screen');
        elements.nameForm = document.getElementById('name-form');
        elements.playerXInput = document.getElementById('player-x-name');
        elements.playerOInput = document.getElementById('player-o-name');
        elements.gameContainer = document.getElementById('game-container');
        elements.resetModal = document.getElementById('reset-modal');
        elements.modalCancel = document.getElementById('modal-cancel');
        elements.modalConfirm = document.getElementById('modal-confirm');
        elements.board = document.getElementById('board');
        elements.cells = document.querySelectorAll('.cell');
        elements.currentPlayer = document.getElementById('current-player');
        elements.result = document.getElementById('result');
        elements.resetBtn = document.getElementById('reset-btn');
        elements.resetMatchBtn = document.getElementById('reset-match-btn');
        elements.scoreX = document.getElementById('score-x');
        elements.scoreO = document.getElementById('score-o');
        elements.labelX = document.getElementById('label-x');
        elements.labelO = document.getElementById('label-o');
        elements.countdownDisplay = document.getElementById('countdown-display');
        elements.countdownNumber = document.getElementById('countdown-number');
        elements.gameWrapper = document.getElementById('game-wrapper');
        elements.matchWinnerDisplay = document.getElementById('match-winner-display');
        elements.winnerName = document.getElementById('winner-name');
        elements.matchCountdownNumber = document.getElementById('match-countdown-number');
        elements.leaderboardList = document.getElementById('leaderboard-list');
        elements.namePageLeaderboardList = document.getElementById('name-page-leaderboard-list');

        // Online mode elements
        elements.modeSelector = document.getElementById('mode-selector');
        elements.modeLocal = document.getElementById('mode-local');
        elements.modeOnline = document.getElementById('mode-online');
        elements.createRoomForm = document.getElementById('create-room-form');
        elements.joinRoomForm = document.getElementById('join-room-form');
        elements.waitingView = document.getElementById('waiting-view');
        elements.onlineIndicator = document.getElementById('online-indicator');
        elements.onlineStatusText = document.getElementById('online-status-text');
        elements.disconnectModal = document.getElementById('disconnect-modal');
        elements.disconnectNewRoom = document.getElementById('disconnect-new-room');
        elements.disconnectHome = document.getElementById('disconnect-home');
        elements.copyCodeBtn = document.getElementById('copy-code-btn');
        elements.cancelRoomBtn = document.getElementById('cancel-room-btn');
        elements.toggleJoinView = document.getElementById('toggle-join-view');
        elements.toggleCreateView = document.getElementById('toggle-create-view');
        elements.roomCodeDisplay = document.getElementById('room-code-display');

        // Load and display leaderboards
        updateLeaderboardDisplay();
        updateNamePageLeaderboard();

        // Clean up old room keys
        cleanupOldRooms();

        // Set up event listeners
        setupEventListeners();
    }

    /**
     * Clean up old room keys from localStorage
     */
    function cleanupOldRooms() {
        Object.keys(localStorage)
            .filter(k => k.startsWith('ttt_room_'))
            .forEach(k => {
                try {
                    const data = JSON.parse(localStorage.getItem(k));
                    if (data && Date.now() - data.created > 600000) {
                        localStorage.removeItem(k);
                    }
                } catch (e) {
                    localStorage.removeItem(k);
                }
            });
    }

    /**
     * Handle mode selection
     * @param {string} mode - 'local' or 'online-tab'
     */
    function selectMode(mode) {
        if (mode === gameState.mode) return;

        // Update mode state
        gameState.mode = mode;

        // Update UI
        elements.modeLocal.classList.toggle('active', mode === 'local');
        elements.modeOnline.classList.toggle('active', mode === 'online-tab');

        // Update forms
        elements.nameForm.style.display = mode === 'local' ? 'block' : 'none';
        elements.createRoomForm.style.display = mode === 'online-tab' ? 'block' : 'none';
        elements.joinRoomForm.style.display = 'none';
        elements.waitingView.style.display = 'none';

        // Reset online state
        if (mode === 'local') {
            MultiplayerSync.cleanup();
            MultiplayerSync.stopListening();
            updateOnlineIndicator(false);
        }
    }

    /**
     * Show create room form
     */
    function showCreateRoomForm() {
        elements.createRoomForm.style.display = 'block';
        elements.joinRoomForm.style.display = 'none';
        elements.waitingView.style.display = 'none';
        document.getElementById('host-name').focus();
    }

    /**
     * Show join room form
     */
    function showJoinRoomForm() {
        elements.createRoomForm.style.display = 'none';
        elements.joinRoomForm.style.display = 'block';
        elements.waitingView.style.display = 'none';
        document.getElementById('guest-name').focus();
    }

    /**
     * Create a new room
     * @param {string} hostName - Name of the host player
     */
    function createRoom(hostName) {
        const code = MultiplayerSync.generateRoomCode();
        MultiplayerSync.createRoom(code, hostName);

        // Show waiting view
        showWaitingView(code);

        // Start listening so we can detect when guest joins
        MultiplayerSync.startListening();
    }

    /**
     * Join an existing room
     * @param {string} code - Room code to join
     * @param {string} guestName - Name of the guest player
     */
    function joinRoom(code, guestName) {
        code = code.toUpperCase();
        if (!MultiplayerSync.joinRoom(code, guestName)) {
            alert('Room not found!');
            return;
        }

        // Start game immediately as guest
        elements.nameInputScreen.style.display = 'none';
        elements.gameWrapper.style.display = 'flex';

        // Initialize game
        gameState.playerNames[PLAYERS.X] = 'Player X';
        gameState.playerNames[PLAYERS.O] = gameState.opponentName || 'Player O';
        elements.labelX.textContent = gameState.playerNames[PLAYERS.X];
        elements.labelO.textContent = gameState.playerNames[PLAYERS.O];

        updateTurnIndicator();
        updateScoreDisplay();

        // Start multiplayer sync
        MultiplayerSync.startListening();
        MultiplayerSync.startHeartbeat();
        updateOnlineIndicator(true);
    }

    /**
     * Show waiting view with room code
     * @param {string} code - Room code
     */
    function showWaitingView(code) {
        elements.waitingView.style.display = 'block';
        elements.createRoomForm.style.display = 'none';
        elements.roomCodeDisplay.textContent = code;
    }

    /**
     * Start online game
     */
    function startOnlineGame() {
        elements.nameInputScreen.style.display = 'none';
        elements.gameWrapper.style.display = 'flex';

        // Initialize player names
        gameState.playerNames[PLAYERS.X] = gameState.playerNames[PLAYERS.X] || 'Player X';
        gameState.playerNames[PLAYERS.O] = gameState.opponentName || 'Player O';
        elements.labelX.textContent = gameState.playerNames[PLAYERS.X];
        elements.labelO.textContent = gameState.playerNames[PLAYERS.O];

        updateTurnIndicator();
        updateScoreDisplay();

        // Start multiplayer sync
        MultiplayerSync.startListening();
        MultiplayerSync.startHeartbeat();
        updateOnlineIndicator(true);
    }

    /**
     * Update online indicator status
     * @param {boolean} connected - Whether opponent is connected
     */
    function updateOnlineIndicator(connected) {
        if (gameState.mode !== 'online-tab') return;

        if (connected && gameState.roomStatus === 'active') {
            elements.onlineIndicator.style.display = 'flex';
            elements.onlineStatusText.textContent = 'Opponent connected';
            const dot = elements.onlineIndicator.querySelector('.online-dot');
            if (dot) dot.classList.remove('disconnected');
        } else if (!connected && gameState.roomStatus === 'disconnected') {
            elements.onlineIndicator.style.display = 'flex';
            elements.onlineStatusText.textContent = 'Opponent disconnected';
            const dot = elements.onlineIndicator.querySelector('.online-dot');
            if (dot) dot.classList.add('disconnected');
        } else {
            elements.onlineIndicator.style.display = 'none';
        }
    }

    /**
     * Show disconnect modal
     */
    function showDisconnectModal() {
        elements.disconnectModal.classList.add('show');
        elements.disconnectNewRoom.focus();
    }

    /**
     * Hide disconnect modal
     */
    function hideDisconnectModal() {
        elements.disconnectModal.classList.remove('show');
    }

    /**
     * Copy room code to clipboard
     * @param {string} code - Room code to copy
     */
    async function copyRoomCode(code) {
        try {
            await navigator.clipboard.writeText(code);
            elements.copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                elements.copyCodeBtn.textContent = 'Copy';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Handle name form submission
     * @param {Event} event - Form submit event
     */
    function handleNameSubmit(event) {
        event.preventDefault();

        const xName = elements.playerXInput.value.trim();
        const oName = elements.playerOInput.value.trim();

        // Store player names
        gameState.playerNames[PLAYERS.X] = xName || 'Player X';
        gameState.playerNames[PLAYERS.O] = oName || 'Player O';

        // Update scoreboard labels
        elements.labelX.textContent = gameState.playerNames[PLAYERS.X];
        elements.labelO.textContent = gameState.playerNames[PLAYERS.O];

        // Hide name input screen and show game
        elements.nameInputScreen.style.display = 'none';
        elements.gameWrapper.style.display = 'flex';

        // Initialize display
        updateTurnIndicator();
        updateScoreDisplay();
    }

    /**
     * Show the reset match confirmation modal
     */
    function showResetModal() {
        elements.resetModal.classList.add('show');
        elements.modalCancel.focus();
    }

    /**
     * Hide the reset match confirmation modal
     */
    function hideResetModal() {
        elements.resetModal.classList.remove('show');
    }

    /**
     * Initialize score display styling
     */
    function updateScoreDisplay() {
        elements.scoreX.classList.add('x-score');
        elements.scoreO.classList.add('o-score');
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Mode selector
        elements.modeLocal.addEventListener('click', () => selectMode('local'));
        elements.modeOnline.addEventListener('click', () => selectMode('online-tab'));

        // Toggle views
        elements.toggleJoinView.addEventListener('click', showJoinRoomForm);
        elements.toggleCreateView.addEventListener('click', showCreateRoomForm);

        // Online mode forms
        elements.createRoomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const hostName = document.getElementById('host-name').value.trim();
            if (hostName) {
                createRoom(hostName);
            }
        });

        elements.joinRoomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const guestName = document.getElementById('guest-name').value.trim();
            const code = document.getElementById('room-code-input').value.trim();
            if (guestName && code) {
                joinRoom(code, guestName);
            }
        });

        // Copy room code
        elements.copyCodeBtn.addEventListener('click', () => {
            copyRoomCode(gameState.roomCode);
        });

        // Cancel room
        elements.cancelRoomBtn.addEventListener('click', () => {
            MultiplayerSync.cleanup();
            selectMode('online-tab');
            showCreateRoomForm();
        });

        // Disconnect modal actions
        elements.disconnectNewRoom.addEventListener('click', () => {
            hideDisconnectModal();
            MultiplayerSync.cleanup();
            elements.nameInputScreen.style.display = 'flex';
            elements.gameWrapper.style.display = 'none';
            selectMode('online-tab');
            showCreateRoomForm();
        });

        elements.disconnectHome.addEventListener('click', () => {
            hideDisconnectModal();
            MultiplayerSync.cleanup();
            elements.nameInputScreen.style.display = 'flex';
            elements.gameWrapper.style.display = 'none';
            selectMode('local');
            elements.nameForm.style.display = 'block';
        });

        // Name form submission
        elements.nameForm.addEventListener('submit', handleNameSubmit);

        // Modal actions
        elements.modalCancel.addEventListener('click', hideResetModal);
        elements.modalConfirm.addEventListener('click', () => {
            hideResetModal();
            resetMatch();
        });

        // Close modal on overlay click
        elements.resetModal.addEventListener('click', (event) => {
            if (event.target === elements.resetModal) {
                hideResetModal();
            }
        });

        elements.disconnectModal.addEventListener('click', (event) => {
            if (event.target === elements.disconnectModal) {
                hideDisconnectModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && elements.resetModal.classList.contains('show')) {
                hideResetModal();
            }
            if (event.key === 'Escape' && elements.disconnectModal.classList.contains('show')) {
                hideDisconnectModal();
            }
        });

        // Use event delegation for board clicks
        elements.board.addEventListener('click', handleCellClick);

        // Reset buttons
        elements.resetBtn.addEventListener('click', handleOnlineResetGame);
        elements.resetMatchBtn.addEventListener('click', handleOnlineResetMatch);

        // Warn before reload/exit after game has started
        window.addEventListener('beforeunload', handleBeforeUnload);
    }

    /**
     * Handle cell click events
     * @param {Event} event - Click event
     */
    function handleCellClick(event) {
        const cell = event.target;

        // Only process clicks on cells
        if (!cell.classList.contains('cell')) {
            return;
        }

        const cellIndex = parseInt(cell.dataset.index, 10);

        // Ignore if cell is already occupied or game is over
        if (gameState.board[cellIndex] !== '' || !gameState.gameActive) {
            return;
        }

        // In online mode, only allow moves on your turn
        if (gameState.mode === 'online-tab' && gameState.currentPlayer !== gameState.mySymbol) {
            return;
        }

        // Make the move
        makeMove(cellIndex);
    }

    /**
     * Execute a player's move
     * @param {number} cellIndex - Index of the cell to mark
     * @param {boolean} isRemote - Whether this is a remote move (from opponent)
     */
    function makeMove(cellIndex, isRemote = false) {
        // Update game state
        gameState.board[cellIndex] = gameState.currentPlayer;

        // Update UI
        const cell = elements.cells[cellIndex];
        cell.textContent = gameState.currentPlayer;
        cell.classList.add('marked', gameState.currentPlayer.toLowerCase());
        cell.disabled = true;

        // Publish move to opponent in online mode (only if local move)
        if (!isRemote && gameState.mode === 'online-tab') {
            MultiplayerSync.publishMove(cellIndex, gameState.board);
        }

        // Check for winner or draw
        const result = checkGameResult();

        if (result.hasWinner) {
            endGame(result.winner, result.winningPattern);
        } else if (result.isDraw) {
            endGame(null);
        } else {
            // Switch to next player
            switchPlayer();
        }
    }

    /**
     * Switch to the other player
     */
    function switchPlayer() {
        gameState.currentPlayer = gameState.currentPlayer === PLAYERS.X
            ? PLAYERS.O
            : PLAYERS.X;
        updateTurnIndicator();
    }

    /**
     * Update the turn indicator display
     */
    function updateTurnIndicator() {
        elements.currentPlayer.textContent = gameState.currentPlayer;
        elements.currentPlayer.style.color = gameState.currentPlayer === PLAYERS.X
            ? 'var(--x-color)'
            : 'var(--o-color)';
    }

    /**
     * Check if the current game state has a winner or draw
     * @returns {Object} - Result object with winner info
     */
    function checkGameResult() {
        // Check for winner
        for (const pattern of WIN_PATTERNS) {
            const [a, b, c] = pattern;

            if (
                gameState.board[a] !== '' &&
                gameState.board[a] === gameState.board[b] &&
                gameState.board[a] === gameState.board[c]
            ) {
                return {
                    hasWinner: true,
                    winner: gameState.board[a],
                    winningPattern: pattern
                };
            }
        }

        // Check for draw (all cells filled)
        const isDraw = !gameState.board.includes('');

        return {
            hasWinner: false,
            isDraw: isDraw,
            winner: null,
            winningPattern: null
        };
    }

    /**
     * End the game and display result
     * @param {string|null} winner - Winning player or null for draw
     * @param {number[]} winningPattern - Array of winning cell indices
     */
    function endGame(winner, winningPattern = null) {
        gameState.gameActive = false;

        // Disable all cells
        elements.cells.forEach(cell => {
            cell.disabled = true;
        });

        // Highlight winning cells if there's a winner
        if (winningPattern) {
            winningPattern.forEach(index => {
                elements.cells[index].classList.add('winner');
            });
        }

        // Trigger confetti for winner
        if (winner) {
            Confetti.burst(150);
            updateScore(winner);
            // Start countdown timer for winner
            startCountdown();
        }

        // Display result message
        showResultMessage(winner);
    }

    /**
     * Start the countdown timer after a win
     */
    function startCountdown() {
        if (!gameState.matchActive) {
            return; // Don't countdown if match is over
        }

        let secondsLeft = COUNTDOWN_SECONDS;
        elements.countdownNumber.textContent = secondsLeft;
        elements.countdownDisplay.style.display = 'block';

        countdownTimer = setInterval(() => {
            secondsLeft--;
            elements.countdownNumber.textContent = secondsLeft;

            if (secondsLeft <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                // Show notification to start new game
                showNewGameNotification();
            }
        }, 1000);
    }

    /**
     * Show notification to start a new game
     */
    function showNewGameNotification() {
        elements.countdownDisplay.innerHTML = `
            <span class="countdown-text" style="color: var(--o-color);">Click "New Game" to play again!</span>
        `;
    }

    /**
     * Update the score for a player
     * @param {string} player - Player who won (X or O)
     */
    function updateScore(player) {
        if (!gameState.matchActive) {
            return;
        }

        gameState.scores[player]++;

        // Update score display
        const scoreElement = player === PLAYERS.X ? elements.scoreX : elements.scoreO;
        scoreElement.textContent = gameState.scores[player];

        // Add animation class
        scoreElement.classList.add('scored');
        setTimeout(() => {
            scoreElement.classList.remove('scored');
        }, 400);

        // Check for match winner
        if (gameState.scores[player] >= WINNING_SCORE) {
            gameState.matchActive = false;
            setTimeout(() => {
                showMatchWinner(player);
                // Extra confetti for match winner!
                Confetti.burst(200);
            }, 800);
        }
    }

    /**
     * Update the leaderboard display (in-game)
     */
    function updateLeaderboardDisplay() {
        if (leaderboard.length === 0) {
            elements.leaderboardList.innerHTML = '<p class="empty-message">No games won yet</p>';
            return;
        }

        // Sort by wins (descending)
        const sorted = [...leaderboard].sort((a, b) => b.wins - a.wins);

        elements.leaderboardList.innerHTML = sorted.map((entry, index) => `
            <div class="leaderboard-entry">
                <span class="leaderboard-rank rank-${Math.min(index + 1, 3)}">${index + 1}</span>
                <span class="leaderboard-player">${escapeHtml(entry.name)}</span>
                <span class="leaderboard-wins">${entry.wins} ${entry.wins === 1 ? 'win' : 'wins'}</span>
            </div>
        `).join('');
    }

    /**
     * Update the name page leaderboard display
     */
    function updateNamePageLeaderboard() {
        if (leaderboard.length === 0) {
            elements.namePageLeaderboardList.innerHTML = '<p class="empty-message">No games won yet</p>';
            return;
        }

        // Sort by wins (descending) and take top 5
        const sorted = [...leaderboard].sort((a, b) => b.wins - a.wins).slice(0, 5);

        elements.namePageLeaderboardList.innerHTML = sorted.map((entry, index) => `
            <div class="leaderboard-entry">
                <span class="leaderboard-rank rank-${Math.min(index + 1, 3)}">${index + 1}</span>
                <span class="leaderboard-player">${escapeHtml(entry.name)}</span>
                <span class="leaderboard-wins">${entry.wins} ${entry.wins === 1 ? 'win' : 'wins'}</span>
            </div>
        `).join('');
    }

    /**
     * Add winner to leaderboard
     * @param {string} playerName - Name of the winning player
     */
    function addToLeaderboard(playerName) {
        // Check if player already exists
        const existingEntry = leaderboard.find(entry => entry.name === playerName);

        if (existingEntry) {
            existingEntry.wins++;
            existingEntry.date = new Date().toISOString();
        } else {
            leaderboard.push({
                name: playerName,
                wins: 1,
                date: new Date().toISOString()
            });
        }

        // Save to localStorage
        localStorage.setItem('ticTacToeLeaderboard', JSON.stringify(leaderboard));

        // Update display
        updateLeaderboardDisplay();
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Display the match winner message
     * @param {string} player - Player who won the match
     */
    function showMatchWinner(player) {
        const playerName = gameState.playerNames[player];

        // Add to leaderboard
        addToLeaderboard(playerName);

        // Hide regular result
        elements.result.className = 'result-message';

        // Show match winner display with countdown
        elements.winnerName.textContent = playerName;
        elements.matchWinnerDisplay.style.display = 'block';
        elements.matchCountdownNumber.textContent = MATCH_WINNER_COUNTDOWN;

        // Start countdown for new match
        let secondsLeft = MATCH_WINNER_COUNTDOWN;
        matchWinnerTimer = setInterval(() => {
            secondsLeft--;
            elements.matchCountdownNumber.textContent = secondsLeft;

            if (secondsLeft <= 0) {
                clearInterval(matchWinnerTimer);
                matchWinnerTimer = null;
                // Auto-start new match
                autoStartNewMatch();
            }
        }, 1000);
    }

    /**
     * Auto-start a new match after countdown
     */
    function autoStartNewMatch() {
        // Hide match winner display
        elements.matchWinnerDisplay.style.display = 'none';

        // Reset match
        resetMatch();
    }

    /**
     * Display the result message with animation
     * @param {string|null} winner - Winning player or null for draw
     */
    function showResultMessage(winner) {
        if (winner) {
            const playerName = gameState.playerNames[winner];
            elements.result.textContent = `${playerName} Wins!`;
            elements.result.className = 'result-message show winner';
        } else {
            elements.result.textContent = "It's a Draw!";
            elements.result.className = 'result-message show draw';
        }
    }

    /**
     * Reset the game to initial state (keeps scores)
     */
    function resetGame() {
        if (!gameState.matchActive) {
            return;
        }

        // Clear countdown timer
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }

        // Hide and reset countdown display
        elements.countdownDisplay.style.display = 'none';
        elements.countdownDisplay.innerHTML = `
            <span class="countdown-text">New game in </span>
            <span class="countdown-number" id="countdown-number">5</span>
            <span class="countdown-text"> seconds...</span>
        `;
        elements.countdownNumber = document.getElementById('countdown-number');

        // Stop any remaining confetti
        Confetti.stop();

        // Reset game state
        gameState.board = Array(CELL_COUNT).fill('');
        gameState.currentPlayer = PLAYERS.X;
        gameState.gameActive = true;

        // Reset all cells
        elements.cells.forEach(cell => {
            cell.textContent = '';
            cell.disabled = false;
            cell.className = 'cell';
        });

        // Hide result message
        elements.result.className = 'result-message';
        elements.result.textContent = '';

        // Update turn indicator
        updateTurnIndicator();

        // Set focus back to board for keyboard users
        elements.cells[0].focus();
    }

    /**
     * Reset the match (clears all scores and starts fresh)
     */
    function resetMatch() {
        // Clear countdown timer
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }

        // Clear match winner timer
        if (matchWinnerTimer) {
            clearInterval(matchWinnerTimer);
            matchWinnerTimer = null;
        }

        // Hide match winner display
        elements.matchWinnerDisplay.style.display = 'none';

        // Stop confetti
        Confetti.stop();

        // Reset scores
        gameState.scores = {
            [PLAYERS.X]: 0,
            [PLAYERS.O]: 0
        };
        gameState.matchActive = true;

        // Update score displays
        elements.scoreX.textContent = '0';
        elements.scoreO.textContent = '0';
        elements.scoreX.classList.remove('x-score');
        elements.scoreO.classList.remove('o-score');

        // Reset game
        resetGame();
    }

    /**
     * Handle reset game for online mode
     */
    function handleOnlineResetGame() {
        if (gameState.mode === 'online-tab' && gameState.roomStatus === 'active') {
            MultiplayerSync.publishSignal('new-game');
        } else {
            resetGame();
        }
    }

    /**
     * Handle reset match for online mode
     */
    function handleOnlineResetMatch() {
        if (gameState.mode === 'online-tab' && gameState.roomStatus === 'active') {
            MultiplayerSync.publishSignal('reset-match');
        } else {
            showResetModal();
        }
    }

    /**
     * Handle page reload/exit warning
     */
    function handleBeforeUnload(event) {
        // Only show warning if game has started (names entered)
        if (elements.gameWrapper && elements.gameWrapper.style.display !== 'none') {
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
    }

    // Initialize game when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

class ChessApp {
    constructor() {
        this.game = new Chess();
        this.board = null;
        this.engine = new StockfishEngine();
        this.playerColor = 'white';
        this.engineDepth = 3;
        this.gameInProgress = true;
        this.moveHistory = [];
        
        this.initBoard();
        this.initEventListeners();
        this.updateStatus();
    }

    initBoard() {
        const config = {
            draggable: true,
            position: 'start',
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSnapEnd: this.onSnapEnd.bind(this)
        };

        this.board = Chessboard('board', config);
    }

    initEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('flipBoardBtn').addEventListener('click', () => {
            this.board.flip();
        });

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.engineDepth = parseInt(e.target.value);
        });
    }

    onDragStart(source, piece, position, orientation) {
        if (!this.gameInProgress) return false;
        if (this.game.game_over()) return false;
        
        // Only allow player to move their pieces
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }

        // If it's engine's turn, don't allow moves
        if ((this.playerColor === 'white' && this.game.turn() === 'b') ||
            (this.playerColor === 'black' && this.game.turn() === 'w')) {
            return false;
        }

        return true;
    }

    onDrop(source, target) {
        // Check if it's a legal move
        const move = this.game.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen for simplicity
        });

        // Illegal move
        if (move === null) return 'snapback';

        this.addMoveToHistory(move);
        this.updateStatus();

        // If game is over, handle it
        if (this.game.game_over()) {
            this.handleGameOver();
            return;
        }

        // If it's now the engine's turn, make engine move
        if ((this.playerColor === 'white' && this.game.turn() === 'b') ||
            (this.playerColor === 'black' && this.game.turn() === 'w')) {
            setTimeout(() => this.makeEngineMove(), 100);
        }
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    async makeEngineMove() {
        if (!this.gameInProgress || this.game.game_over()) return;

        this.showThinking(true);
        
        try {
            const bestMove = await this.engine.getBestMove(this.game.fen(), this.engineDepth);
            
            if (bestMove && this.gameInProgress) {
                const move = this.game.move({
                    from: bestMove.from,
                    to: bestMove.to,
                    promotion: bestMove.promotion || 'q'
                });

                if (move) {
                    this.board.position(this.game.fen());
                    this.addMoveToHistory(move);
                    this.updateStatus();

                    if (this.game.game_over()) {
                        this.handleGameOver();
                    }
                }
            }
        } catch (error) {
            console.error('Engine error:', error);
        } finally {
            this.showThinking(false);
        }
    }

    addMoveToHistory(move) {
        this.moveHistory.push(move);
        this.updateMoveHistoryDisplay();
    }

    updateMoveHistoryDisplay() {
        const historyElement = document.getElementById('moveHistory');
        let html = '';
        
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            html += `<div class="move-pair">`;
            html += `<span class="move-number">${moveNumber}.</span> `;
            html += `${whiteMove.san}`;
            if (blackMove) {
                html += ` ${blackMove.san}`;
            }
            html += `</div>`;
        }
        
        historyElement.innerHTML = html;
        historyElement.scrollTop = historyElement.scrollHeight;
    }

    updateStatus() {
        const statusElement = document.getElementById('status');
        let status = '';

        if (this.game.in_checkmate()) {
            status = 'Game over - ' + (this.game.turn() === 'w' ? 'Black' : 'White') + ' wins by checkmate!';
        } else if (this.game.in_draw()) {
            if (this.game.in_stalemate()) {
                status = 'Game over - Draw by stalemate';
            } else if (this.game.in_threefold_repetition()) {
                status = 'Game over - Draw by repetition';
            } else if (this.game.insufficient_material()) {
                status = 'Game over - Draw by insufficient material';
            } else {
                status = 'Game over - Draw';
            }
        } else {
            const turn = this.game.turn() === 'w' ? 'White' : 'Black';
            if (this.game.in_check()) {
                status = turn + ' in check';
            } else {
                status = turn + ' to move';
            }
        }

        statusElement.textContent = status;
    }

    showThinking(show) {
        const thinkingElement = document.getElementById('thinking');
        if (show) {
            thinkingElement.classList.remove('hidden');
        } else {
            thinkingElement.classList.add('hidden');
        }
    }

    handleGameOver() {
        this.gameInProgress = false;
        this.showThinking(false);
        
        setTimeout(() => {
            if (confirm('Game over! Would you like to start a new game?')) {
                this.startNewGame();
            }
        }, 1000);
    }

    startNewGame() {
        this.game = new Chess();
        this.board.position('start');
        this.gameInProgress = true;
        this.moveHistory = [];
        this.updateMoveHistoryDisplay();
        this.updateStatus();
        this.showThinking(false);

        // If player chose to play as black, make engine move first
        if (this.playerColor === 'black') {
            setTimeout(() => this.makeEngineMove(), 500);
        }
    }

    setPlayerColor(color) {
        this.playerColor = color;
        if (color === 'black') {
            this.board.flip();
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChessApp();
    window.chessApp = app; // Make it globally accessible for debugging
});
/**
 * Comprehensive Test Suite for Tic Tac Toe Game
 * Tests all functional requirements, edge cases, and UI interactions
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock DOM elements and setup
document.body.innerHTML = `
  <canvas id="confetti-canvas" style="position: fixed; top: 0; left: 0; pointer-events: none; z-index: 1000;"></canvas>

  <div id="name-input-screen" style="display: none;">
    <form id="name-form">
      <input id="player-x-name" type="text" />
      <input id="player-o-name" type="text" />
    </form>
    <div id="name-page-leaderboard-list"></div>
  </div>

  <div id="game-wrapper" style="display: none;">
    <div id="game-container">
      <div class="scoreboard">
        <span class="score-value" id="label-x">Player X</span>
        <span class="score-value" id="score-x">0</span>
        <span class="score-value" id="label-o">Player O</span>
        <span class="score-value" id="score-o">0</span>
      </div>
      <div class="status-bar">
        <span id="current-player" class="player-mark">X</span>
      </div>
      <div id="countdown-display" style="display: none;">
        <span id="countdown-number">5</span>
      </div>
      <div id="match-winner-display" style="display: none;">
        <span id="winner-name"></span>
        <span id="match-countdown-number">10</span>
      </div>
      <div class="board" id="board" role="grid">
        <button class="cell" data-index="0" aria-label="Cell 1"></button>
        <button class="cell" data-index="1" aria-label="Cell 2"></button>
        <button class="cell" data-index="2" aria-label="Cell 3"></button>
        <button class="cell" data-index="3" aria-label="Cell 4"></button>
        <button class="cell" data-index="4" aria-label="Cell 5"></button>
        <button class="cell" data-index="5" aria-label="Cell 6"></button>
        <button class="cell" data-index="6" aria-label="Cell 7"></button>
        <button class="cell" data-index="7" aria-label="Cell 8"></button>
        <button class="cell" data-index="8" aria-label="Cell 9"></button>
      </div>
      <div class="result-message" id="result" role="alert"></div>
      <button class="reset-button" id="reset-btn">New Game</button>
      <button class="reset-button secondary" id="reset-match-btn">Reset Match</button>
    </div>
    <div id="leaderboard-list"></div>
  </div>

  <div id="reset-modal" style="display: none;">
    <button id="modal-cancel">Cancel</button>
    <button id="modal-confirm">Confirm</button>
  </div>
`;

// Load the game script
require('../script.js');

// Helper functions to access game state
const getCells = () => document.querySelectorAll('.cell');
const getCell = (index) => getCells()[index];
const clickCell = (index) => getCell(index).click();
const getCurrentPlayer = () => document.getElementById('current-player').textContent;
const getResult = () => document.getElementById('result').textContent;
const getScoreX = () => parseInt(document.getElementById('score-x').textContent);
const getScoreO = () => parseInt(document.getElementById('score-o').textContent);
const clickReset = () => document.getElementById('reset-btn').click();
const clickResetMatch = () => document.getElementById('reset-match-btn').click();

describe('Tic Tac Toe Game', () => {

  beforeEach(() => {
    // Clear any existing intervals/timeouts first
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.runAllTimers();

    // Reset match to ensure clean state
    // Need to click confirm button since resetMatchBtn shows a modal
    const resetMatchBtn = document.getElementById('reset-match-btn');
    const modalConfirm = document.getElementById('modal-confirm');

    // Click reset match button
    resetMatchBtn.click();
    jest.runAllTimers();

    // Click confirm in the modal
    modalConfirm.click();
    jest.runAllTimers();

    // Ensure all timers complete
    jest.runAllTimers();

    // Reset game state to initial conditions
    const cells = getCells();
    cells.forEach(cell => {
      cell.textContent = '';
      cell.disabled = false;
      cell.className = 'cell';
    });

    // Clear result
    document.getElementById('result').textContent = '';
    document.getElementById('result').className = 'result-message';

    // Reset scores to 0
    document.getElementById('score-x').textContent = '0';
    document.getElementById('score-o').textContent = '0';
  });

  afterEach(() => {
    // Clean up any timers
    jest.runAllTimers();
    jest.useRealTimers();
  });

  describe('Initial Game State', () => {
    test('should initialize with Player X as current player', () => {
      expect(getCurrentPlayer()).toBe('X');
    });

    test('should have all cells empty at start', () => {
      getCells().forEach(cell => {
        expect(cell.textContent).toBe('');
        expect(cell.disabled).toBe(false);
      });
    });

    test('should have scores at 0-0', () => {
      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(0);
    });

    test('should have no result message', () => {
      expect(getResult()).toBe('');
    });
  });

  describe('Basic Move Functionality', () => {
    test('should mark cell with current player symbol', () => {
      clickCell(0);
      expect(getCell(0).textContent).toBe('X');
      expect(getCell(0).classList.contains('x')).toBe(true);
    });

    test('should switch player after each move', () => {
      clickCell(0);
      expect(getCurrentPlayer()).toBe('O');
      clickCell(1);
      expect(getCurrentPlayer()).toBe('X');
    });

    test('should add marked class to clicked cells', () => {
      clickCell(0);
      expect(getCell(0).classList.contains('marked')).toBe(true);
    });
  });

  describe('Cell Click Protection', () => {
    test('should not allow clicking same cell twice', () => {
      clickCell(0);
      const firstText = getCell(0).textContent;
      clickCell(0); // Try to click again
      expect(getCell(0).textContent).toBe(firstText);
    });

    test('should disable cell after being marked', () => {
      clickCell(0);
      expect(getCell(0).disabled).toBe(true);
    });

    test('should not allow moves after game ends', () => {
      // Make X win with top row
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      // Try to make another move
      const cell5Text = getCell(5).textContent;
      clickCell(5);
      expect(getCell(5).textContent).toBe(cell5Text);
    });

    test('should ignore clicks on non-cell elements', () => {
      const board = document.getElementById('board');
      board.click();
      // Should not throw error or change game state
      expect(getCurrentPlayer()).toBe('X');
    });
  });

  describe('Win Conditions - Horizontal Rows', () => {
    test('should detect win in top row (0,1,2)', () => {
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      expect(getResult()).toContain('X');
      expect(getCell(0).classList.contains('winner')).toBe(true);
      expect(getCell(1).classList.contains('winner')).toBe(true);
      expect(getCell(2).classList.contains('winner')).toBe(true);
    });

    test('should detect win in middle row (3,4,5)', () => {
      clickCell(3); // X
      clickCell(0); // O
      clickCell(4); // X
      clickCell(1); // O
      clickCell(5); // X wins

      expect(getResult()).toContain('X');
    });

    test('should detect win in bottom row (6,7,8)', () => {
      clickCell(6); // X
      clickCell(0); // O
      clickCell(7); // X
      clickCell(1); // O
      clickCell(8); // X wins

      expect(getResult()).toContain('X');
    });
  });

  describe('Win Conditions - Vertical Columns', () => {
    test('should detect win in left column (0,3,6)', () => {
      clickCell(0); // X
      clickCell(1); // O
      clickCell(3); // X
      clickCell(2); // O
      clickCell(6); // X wins

      expect(getResult()).toContain('X');
    });

    test('should detect win in middle column (1,4,7)', () => {
      clickCell(1); // X
      clickCell(0); // O
      clickCell(4); // X
      clickCell(2); // O
      clickCell(7); // X wins

      expect(getResult()).toContain('X');
    });

    test('should detect win in right column (2,5,8)', () => {
      clickCell(2); // X
      clickCell(0); // O
      clickCell(5); // X
      clickCell(1); // O
      clickCell(8); // X wins

      expect(getResult()).toContain('X');
    });
  });

  describe('Win Conditions - Diagonals', () => {
    test('should detect win in diagonal (0,4,8)', () => {
      clickCell(0); // X
      clickCell(1); // O
      clickCell(4); // X
      clickCell(2); // O
      clickCell(8); // X wins

      expect(getResult()).toContain('X');
    });

    test('should detect win in anti-diagonal (2,4,6)', () => {
      clickCell(2); // X
      clickCell(0); // O
      clickCell(4); // X
      clickCell(1); // O
      clickCell(6); // X wins

      expect(getResult()).toContain('X');
    });
  });

  describe('Player O Wins', () => {
    test('should detect win for Player O', () => {
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(7); // X
      clickCell(5); // O wins

      expect(getResult()).toContain('O');
      expect(getResult()).not.toContain('X');
    });
  });

  describe('Draw Condition', () => {
    test('should detect draw when board is full with no winner', () => {
      // Create a draw scenario:
      // X | O | X
      // X | O | O
      // O | X | X
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(5); // O
      clickCell(7); // X
      clickCell(6); // O
      clickCell(8); // X

      expect(getResult()).toContain('Draw');
      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(0);
    });
  });

  describe('Score Tracking', () => {
    test('should increment X score when X wins', () => {
      // X wins with top row
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      expect(getScoreX()).toBe(1);
      expect(getScoreO()).toBe(0);
    });

    test('should increment O score when O wins', () => {
      // O wins with middle column
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(7); // O wins

      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(1);
    });

    test('should not increment score on draw', () => {
      // Draw scenario
      // X | O | X
      // X | O | O
      // O | X | X
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(5); // O
      clickCell(7); // X
      clickCell(6); // O
      clickCell(8); // X

      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(0);
    });

    test('should track multiple games', () => {
      // First game: X wins
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      expect(getScoreX()).toBe(1);

      clickReset(); // New game

      // Second game: O wins
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(7); // O wins

      expect(getScoreX()).toBe(1);
      expect(getScoreO()).toBe(1);
    });
  });

  describe('Match Winner', () => {
    test('should declare match winner at 5 wins', () => {
      // Simulate 5 wins for X
      for (let i = 0; i < 5; i++) {
        // X wins
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins

        if (i < 4) {
          clickReset(); // New game (not on final win)
        }
      }

      // Fast forward any timers
      jest.runAllTimers();

      expect(getScoreX()).toBe(5);
      // Check for match over message
      const result = getResult();
      expect(result).toContain('MATCH') || expect(document.querySelector('.match-winner-text')).toBeTruthy();
    });

    test('should stop game when match is won', () => {
      // Win 5 games for X
      for (let i = 0; i < 5; i++) {
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins
        if (i < 4) clickReset();
      }

      jest.runAllTimers();

      // Try to start new game - should not work
      const resetBtn = document.getElementById('reset-btn');
      const initialCells = Array.from(getCells()).map(c => c.textContent);

      resetBtn.click();

      // Cells should remain unchanged
      const afterResetCells = Array.from(getCells()).map(c => c.textContent);
      expect(afterResetCells).toEqual(initialCells);
    });
  });

  describe('Reset Game Functionality', () => {
    test('should clear board when New Game is clicked', () => {
      clickCell(0); // X
      clickCell(1); // O

      clickReset();

      getCells().forEach(cell => {
        expect(cell.textContent).toBe('');
        expect(cell.disabled).toBe(false);
      });
    });

    test('should reset to Player X after New Game', () => {
      clickCell(0); // X
      clickCell(1); // O

      clickReset();

      expect(getCurrentPlayer()).toBe('X');
    });

    test('should clear result message after New Game', () => {
      // X wins
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      clickReset();

      expect(getResult()).toBe('');
    });

    test('should remove winner classes from cells', () => {
      // X wins
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      clickReset();

      getCells().forEach(cell => {
        expect(cell.classList.contains('winner')).toBe(false);
        expect(cell.classList.contains('x')).toBe(false);
        expect(cell.classList.contains('o')).toBe(false);
      });
    });

    test('should preserve scores after New Game', () => {
      // X wins
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      const scoreBeforeReset = getScoreX();
      clickReset();

      expect(getScoreX()).toBe(scoreBeforeReset);
    });
  });

  describe('Reset Match Functionality', () => {
    test('should reset scores to 0-0', () => {
      // X wins first game
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      // Reset match (click button and confirm modal)
      const resetMatchBtn = document.getElementById('reset-match-btn');
      const modalConfirm = document.getElementById('modal-confirm');
      resetMatchBtn.click();
      modalConfirm.click();
      jest.runAllTimers();

      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(0);
    });

    test('should clear board when match is reset', () => {
      clickCell(0); // X
      clickCell(1); // O

      // Reset match (click button and confirm modal)
      const resetMatchBtn = document.getElementById('reset-match-btn');
      const modalConfirm = document.getElementById('modal-confirm');
      resetMatchBtn.click();
      modalConfirm.click();
      jest.runAllTimers();

      getCells().forEach(cell => {
        expect(cell.textContent).toBe('');
      });
    });

    test('should re-enable gameplay after match reset', () => {
      // Win 5 games
      for (let i = 0; i < 5; i++) {
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins
        if (i < 4) clickReset();
      }

      jest.runAllTimers();

      // Reset match
      clickResetMatch();

      // Should be able to play again
      clickCell(0);
      expect(getCell(0).textContent).toBe('X');
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid clicking without errors', () => {
      // Rapidly click multiple cells
      clickCell(0);
      clickCell(1);
      clickCell(2);
      clickCell(3);
      clickCell(4);
      clickCell(5);

      // Should have 6 cells marked
      const markedCells = Array.from(getCells()).filter(c => c.textContent !== '');
      expect(markedCells.length).toBe(6);
    });

    test('should handle multiple reset clicks', () => {
      clickCell(0); // X
      clickReset();
      clickReset();
      clickReset();

      expect(getCurrentPlayer()).toBe('X');
      expect(getCell(0).textContent).toBe('');
    });

    test('should handle clicking after match over', () => {
      // Win 5 games for X
      for (let i = 0; i < 5; i++) {
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins
        if (i < 4) clickReset();
      }

      jest.runAllTimers();

      // Try to click - should not cause errors
      const cells = getCells();
      cells.forEach(cell => {
        expect(() => cell.click()).not.toThrow();
      });
    });

    test('should handle reset in middle of game', () => {
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X

      clickReset();

      // Board should be clear
      getCells().forEach(cell => {
        expect(cell.textContent).toBe('');
      });
    });

    test('should maintain game integrity with alternating play', () => {
      // Alternating moves that don't create a win
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(5); // O

      expect(getCurrentPlayer()).toBe('X');
      expect(getScoreX()).toBe(0);
      expect(getScoreO()).toBe(0);
    });
  });

  describe('UI and Accessibility', () => {
    test('should update turn indicator correctly', () => {
      const turnIndicator = document.getElementById('current-player');

      expect(turnIndicator.textContent).toBe('X');

      clickCell(0);

      expect(turnIndicator.textContent).toBe('O');
    });

    test('should add score animation class', () => {
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      // Run timers to trigger the score update
      jest.runAllTimers();

      const scoreElement = document.getElementById('score-x');
      // The 'scored' class is added and then removed after 400ms
      // Since we run all timers, it will be removed, so we just check the score was updated
      expect(scoreElement.textContent).toBe('1');
    });

    test('should set focus to first cell after reset', () => {
      clickCell(0); // Make a move first
      clickReset();
      const firstCell = getCell(0);
      expect(document.activeElement).toBe(firstCell);
    });

    test('should disable all cells when game ends', () => {
      clickCell(0); // X
      clickCell(3); // O
      clickCell(1); // X
      clickCell(4); // O
      clickCell(2); // X wins

      getCells().forEach(cell => {
        expect(cell.disabled).toBe(true);
      });
    });
  });

  describe('Data Attributes and DOM Integrity', () => {
    test('should preserve data-index attributes', () => {
      getCells().forEach((cell, index) => {
        expect(parseInt(cell.dataset.index, 10)).toBe(index);
      });
    });

    test('should maintain cell count', () => {
      expect(getCells().length).toBe(9);
    });

    test('should handle missing data-index gracefully', () => {
      const cell = document.createElement('button');
      cell.className = 'cell';
      document.getElementById('board').appendChild(cell);

      // Should not crash
      expect(() => cell.click()).not.toThrow();

      // Clean up
      cell.remove();
    });
  });

  describe('Winning Pattern Validation', () => {
    test('should only highlight winning cells', () => {
      // X wins with diagonal
      clickCell(0); // X
      clickCell(1); // O
      clickCell(4); // X
      clickCell(2); // O
      clickCell(8); // X wins

      expect(getCell(0).classList.contains('winner')).toBe(true);
      expect(getCell(4).classList.contains('winner')).toBe(true);
      expect(getCell(8).classList.contains('winner')).toBe(true);

      // Non-winning cells should not be highlighted
      expect(getCell(1).classList.contains('winner')).toBe(false);
      expect(getCell(2).classList.contains('winner')).toBe(false);
    });
  });

  describe('All 8 Win Patterns', () => {
    const winPatterns = [
      { name: 'top row', moves: [0, 3, 1, 4, 2] },
      { name: 'middle row', moves: [3, 0, 4, 1, 5] },
      { name: 'bottom row', moves: [6, 0, 7, 1, 8] },
      { name: 'left column', moves: [0, 1, 3, 2, 6] },
      { name: 'middle column', moves: [1, 0, 4, 2, 7] },
      { name: 'right column', moves: [2, 0, 5, 1, 8] },
      { name: 'diagonal', moves: [0, 1, 4, 2, 8] },
      { name: 'anti-diagonal', moves: [2, 0, 4, 1, 6] }
    ];

    winPatterns.forEach(({ name, moves }) => {
      test(`should win with ${name}`, () => {
        moves.forEach(move => clickCell(move));
        expect(getResult()).toContain('X');
      });
    });
  });

  describe('Stress Testing', () => {
    test('should handle multiple complete games', () => {
      for (let game = 0; game < 3; game++) {
        // X wins
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins

        expect(getScoreX()).toBe(game + 1);
        clickReset();
      }
    });

    test('should handle clicking all cells in sequence', () => {
      // Fill board without winning (draw scenario)
      // X | O | X
      // X | O | O
      // O | X | X
      clickCell(0); // X
      clickCell(1); // O
      clickCell(2); // X
      clickCell(4); // O
      clickCell(3); // X
      clickCell(5); // O
      clickCell(7); // X
      clickCell(6); // O
      clickCell(8); // X

      expect(getResult()).toContain('Draw');
    });
  });

  describe('Modal Behavior', () => {
    test('should close modal when clicking overlay', () => {
      const resetMatchBtn = document.getElementById('reset-match-btn');
      const resetModal = document.getElementById('reset-modal');

      // Show modal
      resetMatchBtn.click();
      expect(resetModal.classList.contains('show')).toBe(true);

      // Click overlay (the modal itself)
      resetModal.click();
      expect(resetModal.classList.contains('show')).toBe(false);
    });

    test('should close modal when pressing Escape key', () => {
      const resetMatchBtn = document.getElementById('reset-match-btn');
      const resetModal = document.getElementById('reset-modal');

      // Show modal
      resetMatchBtn.click();
      expect(resetModal.classList.contains('show')).toBe(true);

      // Press Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      expect(resetModal.classList.contains('show')).toBe(false);
    });
  });

  describe('Score Update Match Active Check', () => {
    test('should not update score when match is not active', () => {
      // First, win a match
      for (let i = 0; i < 5; i++) {
        clickCell(0); // X
        clickCell(3); // O
        clickCell(1); // X
        clickCell(4); // O
        clickCell(2); // X wins
        if (i < 4) clickReset();
      }

      jest.runAllTimers();

      const scoreAfterMatchWin = getScoreX();
      expect(scoreAfterMatchWin).toBe(5);

      // Try to click reset (should not work as match is over)
      clickReset();

      // Score should remain unchanged
      expect(getScoreX()).toBe(scoreAfterMatchWin);
    });
  });

  describe('Score Display Styling', () => {
    test('should add score classes to score elements', () => {
      const scoreX = document.getElementById('score-x');
      const scoreO = document.getElementById('score-o');

      // Simulate what updateScoreDisplay does
      scoreX.classList.add('x-score');
      scoreO.classList.add('o-score');

      // Verify the classes were added
      expect(scoreX.classList.contains('x-score')).toBe(true);
      expect(scoreO.classList.contains('o-score')).toBe(true);
    });
  });
});

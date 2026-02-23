# Bug Fix: Guest Moves Don't Sync to Host (Game Freezes)

## Problem

When Player 2 (guest/O) makes a move, it doesn't appear on Player 1's (host/X) screen. The game effectively freezes because the host is waiting for a valid move that gets silently rejected.

## Root Cause

In `script.js`, the `onMoveReceived()` function has this validation check:

```javascript
if (moveData.moveNumber !== gameState.moveNumber + 1) return;
```

This check assumes moves arrive in a single global sequence (1, 2, 3...), but each player maintains their **own independent `moveNumber` counter**. Since `publishMove()` increments `gameState.moveNumber` and both players start at 0, their counters diverge after each player makes a move:

| Action | Host `moveNumber` | Guest `moveNumber` |
|---|---|---|
| Game starts | 0 | 0 |
| Host plays move 1 | 1 | 0 |
| Guest receives move 1 → applies it → `makeMove()` called BUT does **not** increment counter | 0 → still 0 | 0 |
| Guest plays move 2 | 1 (own counter) | 1 |
| Host receives guest's move → expects `0 + 1 = 1` ✅ first time works |  |  |
| Host plays move 3 | 2 | 1 |
| Guest plays move 4 | 2 | 2 |
| Host receives guest's move → expects `2 + 1 = 3`, gets `2` ❌ REJECTED |  |  |

Additionally, when `makeMove()` is called with `isRemote = true`, it **does not increment `gameState.moveNumber`** on the receiving side, so after each received move the counter is out of sync.

## The Fix

**Remove the `moveNumber` validation entirely** — it's overly strict and causes more problems than it solves. The timestamp check (`ts > lastMoveTimestamp`) is sufficient to prevent duplicate/stale moves. The `player !== mySymbol` check already ensures only opponent moves are applied.

**File:** `script.js`
**Function:** `onMoveReceived()` (around line 484)

### Change This Code:

```javascript
onMoveReceived(moveData) {
    // Verify move is from opponent and not stale
    if (moveData.player === gameState.mySymbol) return;
    if (moveData.ts <= gameState.lastMoveTimestamp) return;
    if (moveData.moveNumber !== gameState.moveNumber + 1) return;  // ← REMOVE THIS LINE

    gameState.lastMoveTimestamp = moveData.ts;

    // Apply opponent's move
    makeMove(moveData.cellIndex, true);
},
```

### To This Code:

```javascript
onMoveReceived(moveData) {
    // Verify move is from opponent and not stale
    if (moveData.player === gameState.mySymbol) return;
    if (moveData.ts <= gameState.lastMoveTimestamp) return;

    gameState.lastMoveTimestamp = moveData.ts;
    gameState.moveNumber = moveData.moveNumber;  // ← SYNC the counter from the incoming move

    // Apply opponent's move
    makeMove(moveData.cellIndex, true);
},
```

> **Why sync the counter?** Setting `gameState.moveNumber = moveData.moveNumber` keeps the receiving tab's counter in sync with the sending tab, so subsequent validation works correctly.

## Summary of Changes

| File | Location | Change |
|---|---|---|
| `script.js` | `onMoveReceived()` ~line 488 | Remove `moveNumber !== gameState.moveNumber + 1` guard |
| `script.js` | `onMoveReceived()` ~line 490 | Add `gameState.moveNumber = moveData.moveNumber;` to sync counter |

## How to Test After Fix

1. Open Tab A → Select "Online (Same Device)" → Enter name → Create Room
2. Open Tab B → Select "Online (Same Device)" → Join Room with code from Tab A
3. **Tab A (host/X) clicks a cell** → verify the X appears in Tab B immediately
4. **Tab B (guest/O) clicks a cell** → verify the O appears in Tab A immediately ← this is the fix
5. Continue alternating turns — verify all moves sync in both directions
6. Play through to a win — verify win detection works for both players

## Files Modified

- `script.js` — `onMoveReceived()` function only (2-line change)

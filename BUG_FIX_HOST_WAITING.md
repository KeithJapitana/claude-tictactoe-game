# Bug Fix: Host Stuck on Waiting Screen

## Problem

When the host creates a room, they get stuck on the "Waiting for opponent..." screen even after the guest has joined. The game never starts for the host (but it does start for the guest).

## Root Cause

In `script.js`, the `createRoom()` function creates the room and shows the waiting view but **never calls `MultiplayerSync.startListening()`**.

Without the storage event listener active, when the guest joins and updates localStorage, the host's browser never receives the `storage` event. Therefore `onRoomStatusChanged()` is never called, and `startOnlineGame()` is never triggered.

## The Fix

**File:** `script.js`
**Function:** `createRoom()` (around line 649)

### Change This Code:

```javascript
function createRoom(hostName) {
    const code = MultiplayerSync.generateRoomCode();
    MultiplayerSync.createRoom(code, hostName);

    // Show waiting view
    showWaitingView(code);
}
```

### To This Code:

```javascript
function createRoom(hostName) {
    const code = MultiplayerSync.generateRoomCode();
    MultiplayerSync.createRoom(code, hostName);

    // Show waiting view
    showWaitingView(code);

    // CRITICAL: Start listening for storage events so we can detect when guest joins
    MultiplayerSync.startListening();
}
```

## What This Fixes

- After creating a room, the host now has the storage event listener active
- When the guest joins and updates localStorage, the `storage` event fires in the host's tab
- The `onRoomStatusChanged()` handler detects the guest joined
- `startOnlineGame()` is called, transitioning both tabs to the game

## How to Test

1. Open Tab A → Select "Online (Same Device)" → Enter name → Click "Create Room"
2. Open Tab B → Select "Online (Same Device)" → Click "Join a Room" → Enter room code → Click "Join Room"
3. **Expected:** Both tabs should show the game board simultaneously
4. Host should see their name as "X" and guest's name as "O"

## Files Modified

- `script.js` - Add one line to `createRoom()` function

## Status

- Fix applied in `script.js`
- Manual walkthrough not executed here (no browser/UI in this environment). Please run the steps above to verify.

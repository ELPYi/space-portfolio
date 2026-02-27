const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function sendFile(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      if (req.method !== 'HEAD') res.end('Not Found');
      else res.end();
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    if (req.method !== 'HEAD') res.end(data);
    else res.end();
  });
}

function serveApp(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  if (!fs.existsSync(DIST_DIR)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build assets not found. Run "npm run build" in project root.');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  let requestedPath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.resolve(DIST_DIR, `.${requestedPath}`);

  if (!resolvedPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    sendFile(req, res, resolvedPath);
    return;
  }

  if (!path.extname(requestedPath)) {
    sendFile(req, res, path.join(DIST_DIR, 'index.html'));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

const server = http.createServer(serveApp);
const wss = new WebSocketServer({ server });

// players: Map<id, { ws, id, callsign, color, x, y, z, qx, qy, qz, qw }>
const players = new Map();

// ── Game state (server is authoritative) ─────────────────────────────────────
// Phases: 0=gathering, 1=escort, 2=boss, 3=victory
const gameState = {
  phase:              0,
  panelsBuilt:        0,
  panelsTarget:       15,   // recalculated on join while phase=0
  cargoHp:            200,
  cargoMaxHp:         200,
  // Internal pools (not broadcast)
  orePool:            0,
  partsPool:          0,
};
let panelsTargetLocked = false;

// ── Session end timer (runs during phase 3) ───────────────────────────────────
const SESSION_RESET_DELAY = 45; // seconds after victory before full reset
let _sessionTimer    = null;
let _sessionSecondsLeft = 0;

function broadcastState() {
  const msg = JSON.stringify({
    type:         'game_state',
    phase:        gameState.phase,
    panelsBuilt:  gameState.panelsBuilt,
    panelsTarget: gameState.panelsTarget,
    cargoHp:      gameState.cargoHp,
    cargoMaxHp:   gameState.cargoMaxHp,
    playerCount:  players.size,
  });
  for (const [, p] of players) {
    if (p.ws.readyState === 1 /* OPEN */) p.ws.send(msg);
  }
}

function broadcast(data, exceptId = null) {
  const msg = JSON.stringify(data);
  for (const [id, p] of players) {
    if (id !== exceptId && p.ws.readyState === 1 /* OPEN */) {
      p.ws.send(msg);
    }
  }
}

function resetMission() {
  cancelSessionTimer();
  gameState.panelsBuilt  = 0;
  gameState.cargoHp      = gameState.cargoMaxHp;
  gameState.orePool      = 0;
  gameState.partsPool    = 0;
  panelsTargetLocked     = false;
  // Recalculate target for current player count
  gameState.panelsTarget = Math.max(10, 10 + players.size * 5);
}

function cancelSessionTimer() {
  if (_sessionTimer) {
    clearInterval(_sessionTimer);
    _sessionTimer = null;
  }
}

/**
 * Start the 45-second post-victory countdown.
 * Broadcasts session_countdown every second, then kicks all players and
 * fully resets the game so the next match can begin immediately.
 */
function startSessionEndTimer() {
  if (_sessionTimer) return; // already counting down

  _sessionSecondsLeft = SESSION_RESET_DELAY;

  // Announce immediately so clients can show the timer right away
  broadcast({ type: 'session_countdown', secondsLeft: _sessionSecondsLeft });
  console.log(`[Game] Victory! Session resets in ${SESSION_RESET_DELAY}s`);

  _sessionTimer = setInterval(() => {
    _sessionSecondsLeft--;

    if (_sessionSecondsLeft > 0) {
      broadcast({ type: 'session_countdown', secondsLeft: _sessionSecondsLeft });
    } else {
      // ── Time's up — end the session ────────────────────────────────────────
      clearInterval(_sessionTimer);
      _sessionTimer = null;

      // Tell clients the session is over before closing their sockets
      broadcast({ type: 'session_end' });

      // Force-close every player connection
      for (const [, p] of players) {
        try { p.ws.close(1000, 'session_end'); } catch {}
      }
      players.clear();

      // Full game state reset — ready for next match
      gameState.phase = 0;
      resetMission();
      panelsTargetLocked = false;

      console.log('[Game] Session ended — game reset, ready for next match');
    }
  }, 1000);
}

wss.on('connection', (ws) => {
  const id = uuidv4();
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── Hello: player join ───────────────────────────────────────────────────
    if (msg.type === 'hello') {
      const callsign = String(msg.callsign || 'PILOT').slice(0, 12).replace(/[^A-Z0-9_-]/gi, '').toUpperCase() || 'PILOT';
      const color    = (Number.isFinite(msg.color) ? msg.color : 0x00aaff) >>> 0;

      player = { ws, id, callsign, color, x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };
      players.set(id, player);

      // Update panel target while still in gathering phase
      if (gameState.phase === 0 && !panelsTargetLocked) {
        gameState.panelsTarget = Math.max(10, 10 + players.size * 5);
      }

      // Send welcome with roster + current game state
      const existing = [];
      for (const [pid, p] of players) {
        if (pid !== id) {
          existing.push({ id: pid, callsign: p.callsign, color: p.color,
            x: p.x, y: p.y, z: p.z, qx: p.qx, qy: p.qy, qz: p.qz, qw: p.qw });
        }
      }
      ws.send(JSON.stringify({
        type:      'welcome',
        id,
        players:   existing,
        gameState: {
          phase:           gameState.phase,
          panelsBuilt:     gameState.panelsBuilt,
          panelsTarget:    gameState.panelsTarget,
          cargoHp:         gameState.cargoHp,
          cargoMaxHp:      gameState.cargoMaxHp,
          playerCount:     players.size,
          // If a session timer is already running, tell the joining client how long is left
          sessionCountdown: _sessionTimer ? _sessionSecondsLeft : null,
        },
      }));

      // Announce new player to everyone else
      broadcast({ type: 'joined', id, callsign, color,
        x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 }, id);

      // Broadcast updated player count + potentially updated panelsTarget
      broadcastState();

      console.log(`[+] ${callsign} joined (${id.slice(0, 8)}) — ${players.size} online, target=${gameState.panelsTarget}`);
    }

    // ── Pos: position update ─────────────────────────────────────────────────
    else if (msg.type === 'pos' && player) {
      const { x = 0, y = 0, z = 0, qx = 0, qy = 0, qz = 0, qw = 1 } = msg;
      Object.assign(player, { x, y, z, qx, qy, qz, qw });
      broadcast({ type: 'pos', id, x, y, z, qx, qy, qz, qw }, id);
    }

    // ── Deposit: player deposits ore + parts at the mothership ───────────────
    else if (msg.type === 'deposit' && player) {
      if (gameState.phase !== 0) return; // only deposit during gathering
      const ore   = Math.min(Math.max(Math.floor(Number(msg.ore)   || 0), 0), 10);
      const parts = Math.min(Math.max(Math.floor(Number(msg.parts) || 0), 0), 10);
      if (ore === 0 && parts === 0) return;

      gameState.orePool   += ore;
      gameState.partsPool += parts;

      const buildable = Math.min(gameState.orePool, gameState.partsPool);
      const prev      = gameState.panelsBuilt;
      const newPanels = Math.min(prev + buildable, gameState.panelsTarget);
      const built     = newPanels - prev;

      gameState.panelsBuilt = newPanels;
      gameState.orePool    -= built;
      gameState.partsPool  -= built;

      // Transition 0→1 when target reached
      if (gameState.panelsBuilt >= gameState.panelsTarget) {
        gameState.panelsBuilt = gameState.panelsTarget;
        gameState.phase = 1; // escort
        panelsTargetLocked = true;
        console.log(`[Game] Panel target reached (${gameState.panelsTarget}) → ESCORT phase`);
      }

      broadcastState();
      if (built > 0) {
        console.log(`[Game] ${player.callsign}: ore=${ore} parts=${parts} → built ${built} panels (total: ${gameState.panelsBuilt}/${gameState.panelsTarget})`);
      }
    }

    // ── Cargo arrived: cargo ship reached the sun ────────────────────────────
    else if (msg.type === 'cargo_arrived' && player) {
      if (gameState.phase === 1) {
        gameState.phase = 2; // boss fight
        broadcastState();
        console.log(`[Game] Cargo arrived at sun → BOSS phase`);
      }
    }

    // ── Cargo hit: enemy damaged the cargo ship ──────────────────────────────
    else if (msg.type === 'cargo_hit' && player) {
      if (gameState.phase !== 1) return;
      const damage = Math.min(Math.max(Number(msg.damage) || 0, 0), 50);
      gameState.cargoHp -= damage;
      if (gameState.cargoHp <= 0) {
        gameState.cargoHp = 0;
        // Reset mission back to gathering
        console.log(`[Game] Cargo ship destroyed! Resetting to gathering...`);
        gameState.phase = 0;
        resetMission();
      }
      broadcastState();
    }

    // ── Boss kill: a player dealt the killing blow to the Goliath ───────────
    else if (msg.type === 'boss_kill' && player) {
      if (gameState.phase === 2) {
        gameState.phase = 3; // victory
        broadcastState();
        console.log(`[Game] ${player.callsign} defeated the GOLIATH! Victory! Phase → 3`);
        startSessionEndTimer(); // start the 45s countdown to full reset
      }
    }
  });

  ws.on('close', () => {
    if (player) {
      players.delete(id);
      broadcast({ type: 'left', id });
      console.log(`[-] ${player.callsign} left — ${players.size} online`);

      if (players.size === 0 && gameState.phase !== 0) {
        // Last player left mid-game — cancel any timers and fully reset
        cancelSessionTimer();
        gameState.phase = 0;
        resetMission();
        console.log('[Game] Lobby empty — game reset to phase 0 for next match');
      } else {
        broadcastState();
      }
    }
  });

  ws.on('error', (err) => console.error('WS error:', err.message));
});

server.listen(PORT, () => {
  console.log(`[HTTP] Serving app on http://0.0.0.0:${PORT}`);
  console.log(`[WS] Multiplayer endpoint on ws://0.0.0.0:${PORT}`);
});

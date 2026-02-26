/**
 * NetworkManager — client-side WebSocket handler.
 * Connects to the multiplayer server, sends position at ~20 Hz,
 * and routes incoming messages to registered callbacks.
 */
export class NetworkManager {
  constructor(url) {
    this._url = url;
    this._ws = null;
    this._id = null;
    this._connected = false;
    this._sendTimer = 0;
    this._sendInterval = 1 / 20; // 20 Hz
    this._localDisconnect = false; // true when WE close the socket (not the server)

    // Callbacks (set externally)
    this.onWelcome          = null; // (id, players[], gameState) => void
    this.onJoined           = null; // (playerData) => void
    this.onPos              = null; // (id, data) => void
    this.onLeft             = null; // (id) => void
    this.onGameState        = null; // (data) => void
    this.onSessionCountdown = null; // (secondsLeft: number) => void
    this.onSessionEnd       = null; // () => void  — server is about to kick everyone
    this.onOpen             = null; // () => void
    /**
     * Called when the server closes the connection (NOT when we call disconnect()).
     * Use this to trigger a client-side game reset on a server-initiated kick.
     */
    this.onServerClose      = null; // () => void

    // Getter called each tick to get local ship transform
    // Must return { pos: Vector3, quat: Quaternion }
    this._posGetter = null;
  }

  connect(callsign, color, posGetter) {
    if (this._ws) return; // already connected or connecting
    this._posGetter = posGetter;

    this._ws = new WebSocket(this._url);

    this._ws.addEventListener('open', () => {
      this._connected = true;
      this._ws.send(JSON.stringify({
        type: 'hello',
        callsign: String(callsign).slice(0, 12).toUpperCase() || 'PILOT',
        color: Number(color) || 0x00aaff,
      }));
      if (this.onOpen) this.onOpen();
    });

    this._ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this._handle(msg);
    });

    this._ws.addEventListener('close', () => {
      const wasLocal = this._localDisconnect;
      this._localDisconnect = false;
      this._connected = false;
      this._ws = null;

      // Only fire onServerClose when the server (not us) ended the connection
      if (!wasLocal && this.onServerClose) this.onServerClose();
    });

    this._ws.addEventListener('error', () => {
      // close event fires after error — nothing extra needed
    });
  }

  /** Call from the main game loop with delta time. Throttles position sends to 20 Hz. */
  update(delta) {
    if (!this._connected || !this._posGetter) return;
    this._sendTimer += delta;
    if (this._sendTimer >= this._sendInterval) {
      this._sendTimer = 0;
      this._sendPos();
    }
  }

  _sendPos() {
    const { pos, quat } = this._posGetter();
    this._ws.send(JSON.stringify({
      type: 'pos',
      x: pos.x, y: pos.y, z: pos.z,
      qx: quat.x, qy: quat.y, qz: quat.z, qw: quat.w,
    }));
  }

  _handle(msg) {
    switch (msg.type) {
      case 'welcome':
        this._id = msg.id;
        if (this.onWelcome) this.onWelcome(msg.id, msg.players, msg.gameState);
        break;
      case 'joined':
        if (this.onJoined) this.onJoined(msg);
        break;
      case 'pos':
        if (this.onPos) this.onPos(msg.id, msg);
        break;
      case 'left':
        if (this.onLeft) this.onLeft(msg.id);
        break;
      case 'game_state':
        if (this.onGameState) this.onGameState(msg);
        break;
      case 'session_countdown':
        if (this.onSessionCountdown) this.onSessionCountdown(msg.secondsLeft);
        break;
      case 'session_end':
        if (this.onSessionEnd) this.onSessionEnd();
        break;
    }
  }

  /** Send ore + parts deposit to the server — server processes them into panels. */
  sendDeposit(ore, parts) {
    if (!this._connected || !this._ws) return;
    this._ws.send(JSON.stringify({ type: 'deposit', ore: Math.floor(ore), parts: Math.floor(parts) }));
  }

  /** Send a generic message to the server. */
  sendMessage(data) {
    if (!this._connected || !this._ws) return;
    this._ws.send(JSON.stringify(data));
  }

  /** Notify the server that the Goliath boss was killed — triggers phase 3 (victory). */
  sendBossKill() {
    if (!this._connected || !this._ws) return;
    this._ws.send(JSON.stringify({ type: 'boss_kill' }));
  }

  get id() { return this._id; }
  get connected() { return this._connected; }

  /**
   * Cleanly close the WebSocket from the client side.
   * Sets the _localDisconnect flag so onServerClose does NOT fire —
   * prevents doResetGame() from being double-called when we disconnect ourselves.
   */
  disconnect() {
    if (this._ws) {
      this._localDisconnect = true;
      this._ws.close();
    }
  }
}

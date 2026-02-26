export class TouchControls {
  constructor(shipControls) {
    this.shipControls = shipControls;

    // Joystick state
    this._joystickActive = false;
    this._joystickTouchId = null;
    this._joystickOrigin = { x: 0, y: 0 };
    this._joystickDisplacement = { x: 0, y: 0 };
    this._joystickMaxRadius = 50;

    // Look state
    this._lookTouchId = null;
    this._lookPrev = { x: 0, y: 0 };

    // Boost state
    this._boosting = false;

    this._createUI();
    this._bindEvents();
  }

  _createUI() {
    // Joystick container (left side)
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickThumb = document.getElementById('joystick-thumb');

    // Boost button (bottom right)
    this.boostBtn = document.getElementById('boost-btn');

    // Fire button (above boost)
    this.fireBtn = document.getElementById('fire-btn');

    // Look zone (right side — handled via touch events on the canvas area)
    this.lookZone = document.getElementById('look-zone');
  }

  _bindEvents() {
    // Joystick touch
    this.joystickZone.addEventListener('touchstart', (e) => this._onJoystickStart(e), { passive: false });
    this.joystickZone.addEventListener('touchmove', (e) => this._onJoystickMove(e), { passive: false });
    this.joystickZone.addEventListener('touchend', (e) => this._onJoystickEnd(e), { passive: false });
    this.joystickZone.addEventListener('touchcancel', (e) => this._onJoystickEnd(e), { passive: false });

    // Look touch
    this.lookZone.addEventListener('touchstart', (e) => this._onLookStart(e), { passive: false });
    this.lookZone.addEventListener('touchmove', (e) => this._onLookMove(e), { passive: false });
    this.lookZone.addEventListener('touchend', (e) => this._onLookEnd(e), { passive: false });
    this.lookZone.addEventListener('touchcancel', (e) => this._onLookEnd(e), { passive: false });

    // Boost button
    this.boostBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._boosting = true;
      this.shipControls.setTouchBoosting(true);
      this.boostBtn.classList.add('active');
    }, { passive: false });

    this.boostBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this._boosting = false;
      this.shipControls.setTouchBoosting(false);
      this.boostBtn.classList.remove('active');
    }, { passive: false });

    this.boostBtn.addEventListener('touchcancel', () => {
      this._boosting = false;
      this.shipControls.setTouchBoosting(false);
      this.boostBtn.classList.remove('active');
    });

    // Fire button
    this.fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.fireBtn.classList.add('active');
      if (this.shipControls.onShoot) this.shipControls.onShoot();
    }, { passive: false });

    this.fireBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.fireBtn.classList.remove('active');
    }, { passive: false });

    this.fireBtn.addEventListener('touchcancel', () => {
      this.fireBtn.classList.remove('active');
    });
  }

  _onJoystickStart(e) {
    e.preventDefault();
    if (this._joystickActive) return;

    const touch = e.changedTouches[0];
    this._joystickTouchId = touch.identifier;
    this._joystickActive = true;

    // Place joystick base at touch position
    const rect = this.joystickZone.getBoundingClientRect();
    this._joystickOrigin.x = touch.clientX - rect.left;
    this._joystickOrigin.y = touch.clientY - rect.top;

    this.joystickBase.style.display = 'block';
    this.joystickBase.style.left = (this._joystickOrigin.x - 60) + 'px';
    this.joystickBase.style.top = (this._joystickOrigin.y - 60) + 'px';

    this.joystickThumb.style.left = '50%';
    this.joystickThumb.style.top = '50%';
  }

  _onJoystickMove(e) {
    e.preventDefault();
    if (!this._joystickActive) return;

    for (const touch of e.changedTouches) {
      if (touch.identifier !== this._joystickTouchId) continue;

      const rect = this.joystickZone.getBoundingClientRect();
      const dx = (touch.clientX - rect.left) - this._joystickOrigin.x;
      const dy = (touch.clientY - rect.top) - this._joystickOrigin.y;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, this._joystickMaxRadius);
      const angle = Math.atan2(dy, dx);

      this._joystickDisplacement.x = (clamped / this._joystickMaxRadius) * Math.cos(angle);
      this._joystickDisplacement.y = (clamped / this._joystickMaxRadius) * Math.sin(angle);

      // Update thumb position
      const thumbX = 50 + (this._joystickDisplacement.x * 50);
      const thumbY = 50 + (this._joystickDisplacement.y * 50);
      this.joystickThumb.style.left = thumbX + '%';
      this.joystickThumb.style.top = thumbY + '%';

      // Send input to ship: x = left/right, z = forward(up)/back(down)
      this.shipControls.setTouchInput(this._joystickDisplacement.x, -this._joystickDisplacement.y);
    }
  }

  _onJoystickEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier !== this._joystickTouchId) continue;

      this._joystickActive = false;
      this._joystickTouchId = null;
      this._joystickDisplacement.x = 0;
      this._joystickDisplacement.y = 0;

      this.joystickBase.style.display = 'none';
      this.shipControls.setTouchInput(0, 0);
    }
  }

  _onLookStart(e) {
    e.preventDefault();
    if (this._lookTouchId !== null) return;

    const touch = e.changedTouches[0];
    this._lookTouchId = touch.identifier;
    this._lookPrev.x = touch.clientX;
    this._lookPrev.y = touch.clientY;
  }

  _onLookMove(e) {
    e.preventDefault();
    if (this._lookTouchId === null) return;

    for (const touch of e.changedTouches) {
      if (touch.identifier !== this._lookTouchId) continue;

      const dx = touch.clientX - this._lookPrev.x;
      const dy = touch.clientY - this._lookPrev.y;

      this._lookPrev.x = touch.clientX;
      this._lookPrev.y = touch.clientY;

      this.shipControls.setTouchLook(dx, dy);
    }
  }

  _onLookEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier !== this._lookTouchId) continue;
      this._lookTouchId = null;
    }
  }

  show() {
    this.joystickZone.style.display = 'block';
    this.lookZone.style.display = 'block';
    this.boostBtn.style.display = 'flex';
    this.fireBtn.style.display = 'flex';
  }

  hide() {
    this.joystickZone.style.display = 'none';
    this.lookZone.style.display = 'none';
    this.boostBtn.style.display = 'none';
    this.fireBtn.style.display = 'none';
  }
}

const PALETTE = [
  { name: 'Cyan',   hex: 0x00aaff },
  { name: 'Green',  hex: 0x00ff88 },
  { name: 'Orange', hex: 0xff6600 },
  { name: 'Purple', hex: 0xaa44ff },
  { name: 'Red',    hex: 0xff2244 },
  { name: 'Yellow', hex: 0xffcc00 },
  { name: 'Pink',   hex: 0xff44cc },
  { name: 'White',  hex: 0xffffff },
];

export class JoinGameUI {
  constructor() {
    this._el            = document.getElementById('join-game-ui');
    this._callsignInput = document.getElementById('join-callsign');
    this._colorPicker   = document.getElementById('join-color-picker');
    this._joinBtn       = document.getElementById('join-btn');
    this._cancelBtn     = document.getElementById('join-cancel-btn');

    this.onJoin   = null; // (callsign: string, color: number) => void
    this.onCancel = null; // () => void

    this._selectedColor = PALETTE[0].hex;
    this._buildPalette();
    this._bindEvents();
  }

  _buildPalette() {
    for (const c of PALETTE) {
      const btn = document.createElement('button');
      btn.className = 'color-swatch';
      btn.title = c.name;
      btn.style.background = '#' + c.hex.toString(16).padStart(6, '0');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this._selectedColor = c.hex;
      });
      if (c.hex === this._selectedColor) btn.classList.add('selected');
      this._colorPicker.appendChild(btn);
    }
  }

  _bindEvents() {
    this._joinBtn.addEventListener('click', () => this._confirm());
    this._cancelBtn.addEventListener('click', () => {
      if (this.onCancel) this.onCancel();
      this.hide();
    });
    this._callsignInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirm();
      if (e.key === 'Escape') this._cancelBtn.click();
      e.stopPropagation(); // don't let WASD etc. reach the game
    });
    // Stop game inputs from firing while UI is open
    this._el.addEventListener('keydown', (e) => e.stopPropagation());
  }

  _confirm() {
    const raw = this._callsignInput.value.trim();
    const callsign = (raw || 'PILOT').slice(0, 12).toUpperCase();
    if (this.onJoin) this.onJoin(callsign, this._selectedColor);
    this.hide();
  }

  show() {
    this._el.classList.remove('hidden');
    this._callsignInput.value = '';
    // Small delay so pointer-lock exit doesn't immediately eat the focus
    setTimeout(() => this._callsignInput.focus(), 80);
  }

  hide() {
    this._el.classList.add('hidden');
  }

  get isVisible() {
    return !this._el.classList.contains('hidden');
  }
}

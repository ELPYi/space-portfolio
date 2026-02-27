export class NavMenu {
  /**
   * @param {Array} projects - PROJECTS config array
   * @param {Function} onWarp - callback(project) when a planet is selected
   */
  constructor(projects, onWarp) {
    this.projects = projects;
    this.onWarp = onWarp;
    this.isOpen  = false;
    this._shown  = false;
    this.onLeaveToLanding = null;
    this.allowAutoOpen = true;

    this.hamburger = document.getElementById('nav-hamburger');
    this.panel = document.getElementById('nav-panel');
    this.panelInner = document.getElementById('nav-panel-inner');
    this.list = document.getElementById('nav-planet-list');

    this._buildList();
    this._buildBottomActions();
    this._bindEvents();
  }

  _buildList() {
    for (const project of this.projects) {
      const item = document.createElement('button');
      item.className = 'nav-planet-item';

      const dot = document.createElement('span');
      dot.className = 'nav-planet-dot';
      const color = '#' + project.planetColor.toString(16).padStart(6, '0');
      dot.style.background = color;
      dot.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}`;

      const name = document.createElement('span');
      name.className = 'nav-planet-name';
      name.textContent = project.name;

      item.appendChild(dot);
      item.appendChild(name);

      item.addEventListener('click', () => {
        this.close();
        this.onWarp(project);
      });

      this.list.appendChild(item);
    }

    // Separator + Return to Spawn option
    const sep = document.createElement('div');
    sep.className = 'nav-spawn-separator';
    this.list.appendChild(sep);

    const spawnItem = document.createElement('button');
    spawnItem.className = 'nav-planet-item';

    const spawnDot = document.createElement('span');
    spawnDot.className = 'nav-planet-dot';
    spawnDot.style.background = '#ffffff';
    spawnDot.style.boxShadow = '0 0 8px #ffffff, 0 0 16px #ffffff';

    const spawnName = document.createElement('span');
    spawnName.className = 'nav-planet-name';
    spawnName.textContent = 'Return to Spawn';

    spawnItem.appendChild(spawnDot);
    spawnItem.appendChild(spawnName);

    spawnItem.addEventListener('click', () => {
      this.close();
      if (this.onSpawn) this.onSpawn();
    });

    this.list.appendChild(spawnItem);
  }

  _buildBottomActions() {
    const wrap = document.createElement('div');
    wrap.className = 'nav-bottom-action';

    const leaveLandingBtn = document.createElement('button');
    leaveLandingBtn.className = 'nav-planet-item nav-landing-item';

    const icon = document.createElement('span');
    icon.className = 'nav-landing-icon';
    icon.textContent = '↩';

    const label = document.createElement('span');
    label.className = 'nav-planet-name';
    label.textContent = 'Leave to Landing Page';

    leaveLandingBtn.appendChild(icon);
    leaveLandingBtn.appendChild(label);
    leaveLandingBtn.addEventListener('click', () => {
      this.close();
      this.onLeaveToLanding?.();
    });

    wrap.appendChild(leaveLandingBtn);
    this.panelInner?.appendChild(wrap);
  }

  _bindEvents() {
    this.hamburger.addEventListener('click', () => {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    // Close on overlay click (clicking outside panel)
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) {
        this.close();
      }
    });

    // Open when window loses focus (user tabs away)
    window.addEventListener('blur', () => {
      if (this.allowAutoOpen && this._shown && !this.isOpen) this.open();
    });
  }

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
    this.hamburger.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    this.hamburger.classList.remove('open');
  }

  /**
   * Show a "Leave Game" button in the nav menu while connected to multiplayer.
   * Visible during any phase (0–3) — lets a player quit mid-mission.
   */
  showLeaveButton(callback) {
    if (this._leaveItem) return;

    const sep = document.createElement('div');
    sep.className = 'nav-spawn-separator';

    const item = document.createElement('button');
    item.className = 'nav-planet-item nav-leave-item';

    const icon = document.createElement('span');
    icon.className = 'nav-leave-icon';
    icon.textContent = '✕';

    const label = document.createElement('span');
    label.className = 'nav-planet-name';
    label.textContent = 'Leave Game';

    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener('click', () => {
      this.close();
      callback();
    });

    this._leaveItem = item;
    this._leaveSep  = sep;
    this.list.insertBefore(sep,  this.list.firstChild);
    this.list.insertBefore(item, this.list.firstChild);
  }

  /** Remove the leave button if visible. */
  hideLeaveButton() {
    this._leaveItem?.remove();
    this._leaveSep?.remove();
    this._leaveItem = null;
    this._leaveSep  = null;
  }

  /** Show a "Restart Mission" entry at the top of the nav list. */
  showRestartButton(callback) {
    if (this._restartItem) return;

    const sep = document.createElement('div');
    sep.className = 'nav-spawn-separator';

    const item = document.createElement('button');
    item.className = 'nav-planet-item nav-restart-item';

    const icon = document.createElement('span');
    icon.className = 'nav-restart-icon';
    icon.textContent = '↺';

    const label = document.createElement('span');
    label.className = 'nav-planet-name';
    label.textContent = 'Restart Mission';

    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener('click', () => {
      this.close();
      callback();
    });

    // Insert at top: restart button, then separator, then planets
    this._restartItem = item;
    this._restartSep  = sep;
    this.list.insertBefore(sep,  this.list.firstChild);
    this.list.insertBefore(item, this.list.firstChild);
  }

  /** Remove the restart button if visible. */
  hideRestartButton() {
    this._restartItem?.remove();
    this._restartSep?.remove();
    this._restartItem = null;
    this._restartSep  = null;
  }

  show() {
    this._shown = true;
    this.hamburger.style.display = 'flex';
  }

  hide() {
    this.hamburger.style.display = 'none';
    this.close();
  }
}

import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { SceneManager } from './scene/SceneManager.js';
import { Lighting } from './scene/Lighting.js';
import { Starfield } from './scene/Starfield.js';
import { SpaceDebris } from './scene/SpaceDebris.js';
import { Meteorites } from './scene/Meteorites.js';
import { Spaceship } from './objects/Spaceship.js';
import { ShipControls } from './controls/ShipControls.js';
import { TouchControls } from './controls/TouchControls.js';
import { PortalManager } from './objects/PortalManager.js';
import { PostProcessing } from './effects/PostProcessing.js';
import { EntryAnimation } from './effects/EntryAnimation.js';
import { IntroAnimation } from './effects/IntroAnimation.js';
import { WarpAnimation } from './effects/WarpAnimation.js';
import { LaserSystem } from './effects/LaserSystem.js';
import { SoundManager } from './audio/SoundManager.js';
import { HUD } from './ui/HUD.js';
import { ProjectCard } from './ui/ProjectCard.js';
import { NavMenu } from './ui/NavMenu.js';
import { LostDetector } from './ui/LostDetector.js';
import { FunnyDebris } from './scene/FunnyDebris.js';
import { PROJECTS } from './config/projects.js';
import { Sun } from './scene/Sun.js';
import { Mothership } from './objects/Mothership.js';
import { CargoShip } from './objects/CargoShip.js';
import { DysonSphere } from './objects/DysonSphere.js';
import { NetworkManager } from './network/NetworkManager.js';
import { RemotePlayer } from './objects/RemotePlayer.js';
import { JoinBeacon } from './objects/JoinBeacon.js';
import { JoinGameUI } from './ui/JoinGameUI.js';
import { GameState } from './game/GameState.js';
import { GameHUD } from './ui/GameHUD.js';
import { MaterialsSystem } from './game/MaterialsSystem.js';
import { EnemyManager } from './game/EnemyManager.js';
import { ShipHealth } from './game/ShipHealth.js';
import { GoliathBoss } from './objects/GoliathBoss.js';
import { VictoryScreen } from './ui/VictoryScreen.js';

// Mobile detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Init
const container = document.getElementById('canvas-container');
const sm = new SceneManager(container);

// CSS2D renderer for portal labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

window.addEventListener('resize', () => {
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Scene setup
new Lighting(sm.scene);
const starfield = new Starfield(sm.scene);
const spaceDebris = new SpaceDebris(sm.scene);
const funnyDebris = new FunnyDebris(sm.scene);
const shootingStars = new Meteorites(sm.scene);

// World objects (game mode)
let sun, mothership, cargoShip, dysonSphere;
try {
  sun         = new Sun(sm.scene);
  mothership  = new Mothership(sm.scene);
  cargoShip   = new CargoShip(sm.scene);
  dysonSphere = new DysonSphere(sm.scene);
  // Portfolio mode: show the Dyson sphere fully constructed by default
  dysonSphere?.syncPanels?.(dysonSphere.totalPanels);
} catch (err) {
  console.error('[World] Failed to initialise world objects:', err);
}

// Dyson shockwave impulse for debris fly-past + player pushback
dysonSphere && (dysonSphere.onShockwave = (pos) => {
  const playerPos = controls.getPosition();

  const dir = new THREE.Vector3().subVectors(playerPos, pos);
  const dist = dir.length();
  if (dist > 1) {
    dir.normalize();
    const radius = 2200;
    const falloff = Math.max(0, 1 - (dist / radius));
    const impulse = 0.9 * (0.35 + falloff * falloff);
    controls.applyImpulse(dir, impulse);
  }
});
const spaceship = new Spaceship(sm.scene);
const controls = new ShipControls(sm.camera, spaceship.group, spaceship.mesh, sm.renderer.domElement);
controls.isMobile = isMobile;

// Position camera behind ship at start so idle animation doesn't clip
sm.camera.position.copy(spaceship.group.position).add(controls.cameraOffset);
const initLookTarget = spaceship.group.position.clone().add(controls._camLookAheadOffset);
sm.camera.lookAt(initLookTarget);

const portalManager = new PortalManager(sm.scene, PROJECTS);
const postProcessing = new PostProcessing(sm.renderer, sm.scene, sm.camera);
const projectCard = new ProjectCard();
const _baseExposure = sm.renderer.toneMappingExposure;
const _baseBloom = 1.5;

function updateAutoExposure(playerPos) {
  if (!sun || !playerPos) return;
  // Smoothly reduce exposure/bloom as the player approaches the sun
  const dist = playerPos.distanceTo(sun.group.position);
  const fadeStart = 2600;
  const fadeEnd = 900;
  let t = (fadeStart - dist) / (fadeStart - fadeEnd);
  t = Math.max(0, Math.min(1, t));
  const eased = t * t * (3 - 2 * t);

  const exposure = _baseExposure - eased * 0.35; // 1.0 -> 0.65
  const bloom = _baseBloom - eased * 0.7;        // 1.5 -> 0.8

  sm.renderer.toneMappingExposure = exposure;
  postProcessing.setBloomStrength(bloom);
}

// Entry animation + sound
const flashEl = document.getElementById('entry-flash');
const entryAnimation = new EntryAnimation(sm.camera, controls, postProcessing, flashEl);
const introAnimation = new IntroAnimation(sm.camera, spaceship.group, spaceship.mesh, controls.cameraOffset, controls._camLookAheadOffset);
const soundManager = new SoundManager();
let _dysonIntroActive = false;

// Projectile predictor HUD element
const leadIndicatorEl = document.getElementById('lead-indicator');

// Laser system
const laserSystem = new LaserSystem(sm.scene, spaceDebris);

// Warp animation
const warpAnimation = new WarpAnimation(sm.camera, controls, postProcessing, starfield, flashEl, portalManager, spaceship.group, spaceDebris, laserSystem);
warpAnimation.shootingStars  = shootingStars;
warpAnimation.funnyDebris    = funnyDebris;
laserSystem.funnyDebris      = funnyDebris;
// laserSystem.enemyManager and .goliath wired after those objects are created (below)

// Gatling fires via held mouse — no onShoot callback needed

// Touch controls (mobile only)
let touchControls = null;
if (isMobile) {
  touchControls = new TouchControls(controls);
}

// Synthetic "spawn" project for warp-back
const spawnProject = {
  id: 'spawn',
  name: 'Spawn',
  position: { x: 0, y: 0, z: 0 },
  scale: 1.0,
};

// Warp to spawn helper (shared by nav menu + lost detector)
function warpToSpawn() {
  if (warpAnimation.isActive || entryAnimation.isActive) return;
  soundManager.playEntry();
  warpAnimation.start(spawnProject, () => {
    controls.lock();
  });
}

// Nav menu — warp to any planet
const navMenu = new NavMenu(PROJECTS, (project) => {
  if (networkManager.connected) return; // disable portal warps during multiplayer
  if (warpAnimation.isActive || entryAnimation.isActive) return;
  soundManager.playEntry();
  warpAnimation.start(project, (arrivedProject) => {
    // After warp, trigger entry animation to fly into the planet
    const portal = portalManager.portals.find(p => p.project.id === arrivedProject.id);
    if (portal) {
      const url = portal.project.liveUrl && portal.project.liveUrl !== '#'
        ? portal.project.liveUrl
        : portal.project.github;
      soundManager.mute();
      entryAnimation.start(portal, url, () => {
        soundManager.unmute();
        controls.lock();
      });
    }
  });
});
navMenu.onSpawn = warpToSpawn;
navMenu.hamburger?.addEventListener('click', () => {
  if (!navMenu.isOpen && document.pointerLockElement) {
    document.exitPointerLock();
  }
  // The NavMenu toggles open/close on click; hide the hint once opened.
  setTimeout(() => {
    if (navMenu.isOpen) dismissWarpHint();
  }, 0);
});

// Controls hint elements
const controlsHintEl = document.getElementById('controls-hint');
const waveWarningEl  = document.getElementById('wave-warning');
const waveWarningTextEl = document.getElementById('wave-warning-text');

function showControlsHint() {
  if (isMobile) return; // mobile has its own touch UI
  controlsHintEl.classList.remove('hidden');
  requestAnimationFrame(() => {
    controlsHintEl.classList.add('visible');
    setTimeout(() => {
      controlsHintEl.classList.remove('visible');
      setTimeout(() => controlsHintEl.classList.add('hidden'), 700);
    }, 5000);
  });
}

function showMissionCountdown(onComplete) {
  const el    = document.getElementById('mission-countdown');
  const numEl = document.getElementById('mission-countdown-number');
  const textEl = document.getElementById('mission-countdown-text');
  if (!el) { onComplete?.(); return; }

  textEl.style.display = 'none';
  el.classList.remove('hidden');

  let count = 3;
  function next() {
    if (count > 0) {
      numEl.style.display = '';
      numEl.textContent = count;
      // Re-trigger CSS animation each tick
      numEl.style.animation = 'none';
      void numEl.offsetHeight;
      numEl.style.animation = '';
      count--;
      setTimeout(next, 1000);
    } else {
      numEl.style.display = 'none';
      textEl.style.display = '';
      textEl.style.animation = 'none';
      void textEl.offsetHeight;
      textEl.style.animation = '';
      setTimeout(() => {
        el.classList.add('hidden');
        onComplete?.();
      }, 1200);
    }
  }
  next();
}

function showWaveWarning(text) {
  waveWarningTextEl.textContent = text;
  waveWarningEl.classList.remove('hidden');
  requestAnimationFrame(() => {
    waveWarningEl.classList.add('visible');
    setTimeout(() => {
      waveWarningEl.classList.remove('visible');
      setTimeout(() => waveWarningEl.classList.add('hidden'), 500);
    }, 3500);
  });
}

// HUD
const hud = new HUD(() => {
  soundManager.init();
  soundManager.playLaunchBeep();

  if (isMobile) {
    introAnimation.start(() => {
      controls.syncToCamera(sm.camera);
      controls.lock();
      showWarpHint();
      touchControls.show();
      navMenu.show();
    });
  } else {
    introAnimation.start(() => {
      controls.syncToCamera(sm.camera);
      controls.lock();
      showWarpHint();
      navMenu.show();
      runPortfolioDysonSequence();
    });
  }
});

const hudWarpHint = document.getElementById('hud-warp-hint');
let _warpHintDismissed = false;
function showWarpHint() {
  if (!hudWarpHint || _warpHintDismissed) return;
  hudWarpHint.classList.remove('hidden');
}

function dismissWarpHint() {
  if (!hudWarpHint) return;
  _warpHintDismissed = true;
  hudWarpHint.classList.add('hidden');
}

if (isMobile) {
  const warning = document.getElementById('mobile-warning');
  const okBtn = document.getElementById('mobile-warning-ok');
  if (warning && okBtn) {
    warning.classList.remove('hidden');
    okBtn.addEventListener('click', () => {
      warning.classList.add('hidden');
    });
  }
}

function runPortfolioDysonSequence() {
  if (!dysonSphere || networkManager.connected || _dysonIntroActive) return;
  _dysonIntroActive = true;

  // Cinematic construction + startup sequence
  const prevTimings = {
    slotInSpeed: dysonSphere._slotInSpeed,
    powerUpDuration: dysonSphere._powerUpDuration,
    ringPowerUpDuration: dysonSphere._ringPowerUpDuration,
  };
  const restoreTimings = () => {
    if (!dysonSphere) return;
    dysonSphere._slotInSpeed = prevTimings.slotInSpeed;
    dysonSphere._powerUpDuration = prevTimings.powerUpDuration;
    dysonSphere._ringPowerUpDuration = prevTimings.ringPowerUpDuration;
  };

  // Slow, cinematic intro timings
  dysonSphere._slotInSpeed = 2.2;
  dysonSphere._powerUpDuration = 7.0;
  dysonSphere._ringPowerUpDuration = 2.6;

  dysonSphere.reset?.();
  dysonSphere.syncPanels?.(0);
  soundManager.startDysonConstruct();

  const total = dysonSphere.totalPanels || 0;
  const buildDuration = 8.5; // seconds for full construction
  const preLockHold = 1.6;   // pause before lockDown for a cinematic beat
  const startTime = performance.now();
  let lockAt = null;

  const easeInOutCubic = (x) => (
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
  );

  const tick = () => {
    if (networkManager.connected) {
      soundManager.stopDysonConstruct();
      restoreTimings();
      _dysonIntroActive = false;
      return;
    }
    const now = performance.now();
    const tRaw = Math.min((now - startTime) / 1000 / buildDuration, 1);
    const t = easeInOutCubic(tRaw);
    const target = Math.floor(t * total);
    for (let i = dysonSphere.visiblePanels; i < target; i++) {
      dysonSphere.showPanel(i);
    }
    if (tRaw < 1) {
      requestAnimationFrame(tick);
    } else {
      if (lockAt === null) {
        lockAt = now + preLockHold * 1000;
      }
      if (now >= lockAt) {
        dysonSphere.lockDown?.();
        soundManager.stopDysonConstruct();
        soundManager.playDysonActivate();
        _dysonIntroActive = false;
        const restoreDelay = ((dysonSphere._powerUpDuration ?? 4) * 1000) + 500;
        setTimeout(restoreTimings, restoreDelay);
      } else {
        requestAnimationFrame(tick);
      }
    }
  };

  requestAnimationFrame(tick);
}

// Lost player detection
const lostDetector = new LostDetector({
  onYes: () => {
    warpToSpawn();
  },
});

// ── Multiplayer ────────────────────────────────────────────────────────────────
const WS_URL = 'ws://localhost:3001';
const networkManager  = new NetworkManager(WS_URL);
const remotePlayers   = new Map(); // id → RemotePlayer
const gameState       = new GameState();
const gameHUD         = new GameHUD();
const materialsSystem = new MaterialsSystem(networkManager);
const enemyManager    = new EnemyManager(sm.scene);
const shipHealth      = new ShipHealth();
const goliath         = new GoliathBoss(sm.scene);

// ── Shader warm-up ────────────────────────────────────────────────────────────
// renderer.compile() is NOT sufficient here. Three.js bakes the render-target's
// encoding/colour-space into every shader cache key. The EffectComposer renders
// the scene to its own internal render target (different key from screen output),
// so any program compiled via renderer.compile() has a mismatched key and gets
// recompiled on first actual draw anyway — causing the mid-game frozen screen.
//
// Fix: call postProcessing.render() once with ALL normally-hidden objects visible.
// That forces the FULL pipeline (RenderPass → UnrealBloomPass) to compile every
// MeshStandardMaterial / MeshBasicMaterial variant the game will ever need.
// The result is discarded; the intro-screen div sits on top of the canvas.
{
  goliath._group.visible = true;
  dysonSphere?.panels.forEach(p => { p.visible = true; });
  dysonSphere?._ldBeams?.forEach(b => { b.line.visible = true; });
  dysonSphere?._ldShockwaves?.forEach(s => { s.mesh.visible = true; });

  postProcessing.render();

  goliath._group.visible = false;
  dysonSphere?.panels.forEach(p => { p.visible = false; });
  dysonSphere?._ldBeams?.forEach(b => { b.line.visible = false; });
  dysonSphere?._ldShockwaves?.forEach(s => { s.mesh.visible = false; });
}

const victoryScreen   = new VictoryScreen();

// Wire laser system to enemy targets (must be after declarations above)
laserSystem.enemyManager = enemyManager;
laserSystem.goliath      = goliath;

// Dyson panel tracking during escort + boss phases
let _dysonPanelsShown  = 0;
let _bossPhaseTime     = 0; // seconds elapsed in phase 2
let _lastPanelSnapTime = 0; // ms — throttle construction tick sound

// ── Shared game reset — used by victory panel "Leave" and nav "Restart" ──────
function doResetGame() {
  networkManager.disconnect();

  // Stop combat music — fade back to ambient
  soundManager.stopCombatMusic();

  // Hide all game HUD panels (shield bar stays — it's always-on)
  gameHUD.hide();
  gameHUD.hideShield();
  gameHUD.hideBossBar();
  gameHUD.hideCargoHp();
  gameHUD.hideObjective();
  gameHUD.hideCountdown();
  gameHUD.setCountdownLabel('⏱ CONSTRUCTION WINDOW'); // restore label for next boss phase

  // Force-hide any lingering wave-warning / notification banners
  waveWarningEl.classList.remove('visible');
  waveWarningEl.classList.add('hidden');

  // Remove all remote players from the scene
  for (const rp of remotePlayers.values()) rp.dispose();
  remotePlayers.clear();

  // Clear enemies and boss
  enemyManager.reset();
  enemyManager.setPhase(0);
  goliath.despawn();

  // Full Dyson sphere reset — clears lockDown beams, panel materials, powered state
  _dysonPanelsShown  = 0;
  _bossPhaseTime     = 0;
  _lastPanelSnapTime = 0;
  dysonSphere?.reset();

  // Reset world objects to idle state
  cargoShip?.returnToDock();

  // Reset local game state so HUD doesn't flash stale VICTORY objective on rejoin
  gameState.phase        = 0;
  gameState.panelsBuilt  = 0;
  gameState.panelsTarget = 15;
  gameState.cargoHp      = 200;
  gameState.cargoMaxHp   = 200;

  // Hide victory panel, restart button, and leave button
  victoryScreen.hide();
  navMenu.hideRestartButton();
  navMenu.hideLeaveButton();

  // Show beacon again so the player can walk back up and re-join
  joinBeacon.show();
  beaconHint.classList.remove('visible');

  // Warp the player back to the portfolio spawn
  warpToSpawn();
}

// ── Victory screen — keep playing (just dismiss the panel) ───────────────────
victoryScreen.onKeepPlaying = () => {
  // Pointer stays locked — game continues, restart button remains in nav menu
};

// ── Victory screen — restart mission ─────────────────────────────────────────
victoryScreen.onRestart = doResetGame;

// ── Victory screen — leave game ───────────────────────────────────────────────
victoryScreen._onContinue = doResetGame;

// ── Ship health ──────────────────────────────────────────────────────────────
shipHealth.onChange = (hp, maxHp) => {
  gameHUD.updateShield(hp, maxHp);
};

let _deathInProgress = false;
shipHealth.onDeath = () => {
  if (_deathInProgress) return;
  _deathInProgress = true;
  soundManager.playAsteroidBreak();

  // Flash screen red
  flashEl.style.background = 'rgba(200, 0, 0, 0.55)';
  flashEl.style.transition = 'none';
  flashEl.style.opacity    = '1';
  setTimeout(() => {
    flashEl.style.transition = 'opacity 1.2s ease';
    flashEl.style.opacity    = '0';
    setTimeout(() => {
      flashEl.style.background = '';
      flashEl.style.opacity    = '';
      flashEl.style.transition = '';
    }, 1300);
  }, 80);

  // Warp back to spawn after brief pause
  setTimeout(() => {
    shipHealth.respawn();
    gameHUD.updateShield(shipHealth.hp, shipHealth.maxHp);
    enemyManager.reset();
    warpToSpawn();
    _deathInProgress = false;
  }, 1500);
};

// ── Enemy bolt hits player ────────────────────────────────────────────────────
enemyManager.onPlayerHit = (damage) => {
  if (_deathInProgress) return;
  shipHealth.takeDamage(damage);
  soundManager.playAsteroidBreak();
};

// ── Goliath callbacks ─────────────────────────────────────────────────────────
goliath.onDefeated = () => {
  // Complete the sphere instantly when Goliath falls
  if (dysonSphere && !dysonSphere._lockedDown) {
    dysonSphere.syncPanels(dysonSphere.totalPanels);
    dysonSphere.lockDown();
    soundManager.playDysonActivate();
  }
  gameHUD.hideCountdown();
  networkManager.sendBossKill();
  gameHUD.hideBossBar();
};

goliath.onPlayerHit = (damage) => {
  if (_deathInProgress) return;
  shipHealth.takeDamage(damage);
  soundManager.playAsteroidBreak();
};

// ── Cargo ship callbacks ──────────────────────────────────────────────────────
if (cargoShip) {
  cargoShip.onArrived = () => {
    if (networkManager.connected) {
      networkManager.sendMessage({ type: 'cargo_arrived' });
    }
  };

  cargoShip.onDestroyed = () => {
    showWaveWarning('CARGO SHIP DESTROYED — MISSION RESET');
    soundManager.playAsteroidBreak();
    // Server will reset phase to 0 and broadcast game_state
  };
}

// ── Phase change handler ──────────────────────────────────────────────────────
gameState.onPhaseChange = (phase, prevPhase) => {
  if (phase === 0) {
    // Gathering — reset/clean up from previous run
    if (prevPhase === 1) {
      showWaveWarning('CARGO SHIP DESTROYED — MISSION RESET');
      soundManager.playAsteroidBreak();
    }
    gameHUD.showObjective('↓ DEPOSIT MATERIALS AT MOTHERSHIP');
    enemyManager.setPhase(0);
    _dysonPanelsShown  = 0;
    _bossPhaseTime     = 0;
    _lastPanelSnapTime = 0;
    // Full sphere reset if it was powered/locked from a previous victory
    if (dysonSphere?._lockedDown || dysonSphere?._poweredUp) {
      dysonSphere.reset();
    } else {
      dysonSphere?.syncPanels(0);
      dysonSphere?.setBeamTarget(null);
    }
    gameHUD.hideCargoHp();
    gameHUD.hideBossBar();
    gameHUD.hideCountdown();
    navMenu.hideRestartButton();
    goliath.despawn();
    cargoShip?.returnToDock();
    cargoShip?.setDefendMode(false);
    mothership?.setDepositPrompt(false);
  } else if (phase === 1) {
    // Escort — cargo ship departs, enemies target it
    gameHUD.showObjective('⚠ DEFEND THE CARGO SHIP', true);
    enemyManager.setPhase(1);
    _dysonPanelsShown = 0;
    cargoShip?.departToSun();
    cargoShip?.setDefendMode(true);
    gameHUD.showCargoHp();
    gameHUD.hideBossBar();
    if (cargoShip) gameHUD.updateCargoHp(cargoShip.hp, cargoShip.maxHp);
    // Start construction beam: cargo ship → dyson sphere
    if (dysonSphere && cargoShip) dysonSphere.setBeamTarget(cargoShip.group);
    showWaveWarning('CARGO SHIP DEPARTING — DEFEND IT!');
  } else if (phase === 2) {
    // Boss phase — 60s construction window while fighting Goliath
    gameHUD.hideObjective();
    cargoShip?.setDefendMode(false);
    enemyManager.reset();
    enemyManager.setPhase(2);
    goliath.spawn(controls.getPosition());
    gameHUD.showBossBar();
    gameHUD.updateBoss(goliath.hp, goliath.maxHp);
    gameHUD.hideCargoHp();
    gameHUD.setCountdownLabel('⏱ CONSTRUCTION WINDOW');
    gameHUD.showCountdown();
    gameHUD.updateCountdown(60);
    // Kill construction beam — sphere will build during the 60s boss fight
    dysonSphere?.setBeamTarget(null);
    _bossPhaseTime = 0;
    showWaveWarning('GOLIATH INBOUND — 60s TO BUILD THE SPHERE!');
  } else if (phase === 3) {
    // Victory
    gameHUD.hideObjective();
    goliath.despawn();
    gameHUD.hideBossBar();
    gameHUD.hideCargoHp();
    enemyManager.reset();
    dysonSphere?.powerUp();
    victoryScreen.show(gameState.panelsBuilt, gameState.playerCount);
    // Swap leave button → restart button in nav (both do doResetGame)
    navMenu.hideLeaveButton();
    navMenu.showRestartButton(doResetGame);
    // Show HUD countdown repurposed as the session reset timer
    gameHUD.setCountdownLabel('⏳ MATCH RESETS');
    gameHUD.showCountdown();
    gameHUD.updateCountdown(45);
  }
};

// ── When joining mid-game: sync state ────────────────────────────────────────
const joinBeacon  = new JoinBeacon(sm.scene);
const joinGameUI  = new JoinGameUI();
const beaconHint  = document.getElementById('join-beacon-hint');

let _nearBeacon = false;

joinBeacon.onEnterPrompt = () => {
  _nearBeacon = true;
  if (!networkManager.connected) beaconHint.classList.add('visible');
};
joinBeacon.onLeavePrompt = () => {
  _nearBeacon = false;
  beaconHint.classList.remove('visible');
};
joinBeacon.onInteract = () => {
  if (!networkManager.connected && !joinGameUI.isVisible) {
    document.exitPointerLock();
    joinGameUI.show();
  }
};

// E key — open join UI while near beacon
document.addEventListener('keydown', (e) => {
  if ((e.key === 'e' || e.key === 'E') && _nearBeacon && !networkManager.connected && !joinGameUI.isVisible) {
    document.exitPointerLock();
    joinGameUI.show();
  }
});

joinGameUI.onJoin = (callsign, color) => {
  networkManager.connect(callsign, color, () => ({
    pos:  spaceship.group.position,
    quat: controls.orientation,
  }));
};

joinGameUI.onCancel = () => {
  // nothing extra; UI hides itself
};

// Network events
networkManager.onWelcome = (_id, players, initialGameState) => {
  for (const p of players) {
    remotePlayers.set(p.id, new RemotePlayer(sm.scene, p));
  }

  // Ensure Dyson sphere is reset from portfolio mode before applying game state
  dysonSphere?.reset?.();

  if (initialGameState) {
    const prevPhase = gameState.phase;
    gameState.apply(initialGameState);

    // Sync dyson sphere panels
    const phase = initialGameState.phase ?? 0;
    if (phase === 0) {
      dysonSphere?.syncPanels(0); // not shown during gathering
    } else {
      dysonSphere?.syncPanels(initialGameState.panelsBuilt ?? 0);
    }

    // Sync enemy phase
    enemyManager.setPhase(phase);

    if (phase === 0) {
      gameHUD.showObjective('↓ DEPOSIT MATERIALS AT MOTHERSHIP');
    } else if (phase === 1) {
      // Mid-escort join: start cargo ship transit (skip to estimated position)
      gameHUD.showObjective('⚠ DEFEND THE CARGO SHIP', true);
      cargoShip?.departToSun();
      gameHUD.showCargoHp();
      if (cargoShip) gameHUD.updateCargoHp(
        initialGameState.cargoHp ?? cargoShip.maxHp,
        cargoShip.maxHp
      );
    } else if (phase === 2) {
      // Mid-boss join — show sphere at current build state, start countdown fresh
      goliath.spawn(controls.getPosition());
      gameHUD.showBossBar();
      gameHUD.updateBoss(goliath.hp, goliath.maxHp);
      gameHUD.showCountdown();
      gameHUD.updateCountdown(60);
      _bossPhaseTime = 0;
      dysonSphere?.syncPanels(initialGameState.panelsBuilt ?? 0);
    } else if (phase === 3) {
      // Mid-victory join — server may already be partway through the 45s countdown
      const secsLeft = initialGameState.sessionCountdown ?? 45;
      dysonSphere?.powerUp();
      navMenu.hideLeaveButton();
      navMenu.showRestartButton(doResetGame);
      victoryScreen.show(
        initialGameState.panelsBuilt ?? gameState.panelsTarget,
        initialGameState.playerCount ?? 1,
        secsLeft,
      );
      gameHUD.setCountdownLabel('⏳ MATCH RESETS');
      gameHUD.showCountdown();
      gameHUD.updateCountdown(secsLeft);
    }
  }

  gameHUD.show();
  gameHUD.update(gameState);
  gameHUD.showShield();
  gameHUD.updateShield(shipHealth.hp, shipHealth.maxHp);
  joinBeacon.hide();
  beaconHint.classList.remove('visible');
  showMissionCountdown();

  // Switch to combat music for the duration of the mission
  soundManager.startCombatMusic();

  // Show leave button in nav menu for all phases
  navMenu.showLeaveButton(doResetGame);
};

// Live game state updates from the server
networkManager.onGameState = (data) => {
  const prevPhase    = gameState.phase;
  const prevPanels   = gameState.panelsBuilt;
  const prevCargoHp  = gameState.cargoHp;
  gameState.apply(data);

  // During escort: update cargo HP bar
  if (gameState.phase === 1) {
    gameHUD.updateCargoHp(gameState.cargoHp, gameState.cargoMaxHp);
  }

  gameHUD.update(gameState);
};

networkManager.onJoined = (data) => {
  remotePlayers.set(data.id, new RemotePlayer(sm.scene, data));
};

networkManager.onPos = (id, data) => {
  const rp = remotePlayers.get(id);
  if (rp) rp.updateTransform(data.x, data.y, data.z, data.qx, data.qy, data.qz, data.qw);
};

networkManager.onLeft = (id) => {
  const rp = remotePlayers.get(id);
  if (rp) { rp.dispose(); remotePlayers.delete(id); }
};

// ── Session countdown — server ticks down 45→0 after victory ─────────────────
networkManager.onSessionCountdown = (secondsLeft) => {
  gameHUD.updateCountdown(secondsLeft);
  victoryScreen.updateResetCountdown(secondsLeft);
};

// ── Session end — server is about to close all connections ───────────────────
networkManager.onSessionEnd = () => {
  showWaveWarning('MATCH RESET — RETURNING TO BASE');
  soundManager.stopCombatMusic();
};

// ── Server-initiated close — server kicked us (e.g. session_end) ─────────────
// Note: this does NOT fire when WE call disconnect() — only for server-side closes.
networkManager.onServerClose = () => {
  doResetGame();
};

// Pointer lock change — show/hide crosshair (desktop only)
if (!isMobile) {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !introAnimation.isActive && !warpAnimation.isActive && !entryAnimation.isActive) {
      if (navMenu.isOpen) {
        navMenu.close();
      } else {
        if (document.pointerLockElement) document.exitPointerLock();
        navMenu.open();
      }
      dismissWarpHint();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === sm.renderer.domElement;
    hud.showCrosshair(locked);
    if (!locked) {
      leadIndicatorEl.style.display = 'none';
      dismissWarpHint();
      if (!introAnimation.isActive && !warpAnimation.isActive && !entryAnimation.isActive) {
        navMenu.open();
      }
    }
  });

  sm.renderer.domElement.addEventListener('click', () => {
    if (!controls.isLocked && !introAnimation.isActive && !joinGameUI.isVisible) {
      controls.lock();
    }
  });
} else {
  hud.showCrosshair(false);
}

// Game loop
const clock = new THREE.Clock();
const _shakeOffset = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  const { portal: nearestPortal, entered, nearestDist, entryPortal, minDistToAny } = portalManager.update(delta, controls.getPosition());

  lostDetector.update(minDistToAny, delta);

  // Portal entry — release pointer lock first so window.open() isn't blocked
  if (entryPortal && !networkManager.connected && !entryAnimation.isActive && !warpAnimation.isActive) {
    const url = entryPortal.project.liveUrl && entryPortal.project.liveUrl !== '#'
      ? entryPortal.project.liveUrl
      : entryPortal.project.github;
    document.exitPointerLock(); // must release before window.open()
    soundManager.playEntry();
    soundManager.mute();
    entryAnimation.start(entryPortal, url, () => {
      soundManager.unmute();
      controls.lock(); // re-engage after animation
    });
  }

  // Update intro, entry, warp animation, or normal controls
  if (introAnimation.isActive) {
    introAnimation.update(delta);
  } else if (warpAnimation.isActive) {
    warpAnimation.update(delta);
  } else if (entryAnimation.isActive) {
    entryAnimation.update(delta);
  } else if (controls.isLocked) {
    controls.update(delta);
    starfield.update(delta, controls.getPosition());

    // Gatling system — pass held-mouse state so it manages spin + fire internally
    const muzzleWorld = spaceship.getMuzzleWorldPosition();
    const { fired: gatlingFired, hit: laserHit } = laserSystem.update(
      delta, controls._mouseHeld, sm.camera, controls.getPosition(), muzzleWorld
    );
    if (gatlingFired) soundManager.playGatlingShot();
    if (laserHit) {
      soundManager.playAsteroidBreak();
      if (networkManager.connected) {
        if (laserHit.type === 'parts') materialsSystem.collectParts();
        else if (laserHit.type === 'ore') materialsSystem.collectOre();
      }
    }
    // Barrel spin visual + motor whir
    spaceship.setGatlingState(laserSystem.spinAngle, gatlingFired);
    soundManager.setGatlingMotor(laserSystem.spinRate);

    // ── Projectile predictor HUD ──────────────────────────────────────────────
    if (controls.isLocked) {
      // Lead indicator: solve quadratic for bolt→enemy intercept time
      let leadTarget = null;
      if (gameState.phase === 2 && goliath._alive) {
        leadTarget = { position: goliath.group.position.clone(), velocity: new THREE.Vector3() };
      } else if (gameState.phase <= 1) {
        leadTarget = enemyManager.getNearestEnemy(controls.getPosition());
      }

      if (leadTarget) {
        const D  = leadTarget.position.clone().sub(controls.getPosition());
        const v  = leadTarget.velocity;
        const spd = laserSystem._boltSpeed;
        const a  = v.dot(v) - spd * spd;
        const b  = 2 * D.dot(v);
        const c  = D.dot(D);
        let t = 0;
        if (Math.abs(a) < 0.01) {
          t = b !== 0 ? -c / b : 0;
        } else {
          const disc = b * b - 4 * a * c;
          if (disc >= 0) {
            const sq = Math.sqrt(disc);
            const t1 = (-b + sq) / (2 * a);
            const t2 = (-b - sq) / (2 * a);
            t = (t1 > 0 && t2 > 0) ? Math.min(t1, t2) : Math.max(t1, t2);
          }
        }
        const intercept = t > 0 && t < 6
          ? leadTarget.position.clone().addScaledVector(v, t)
          : leadTarget.position;

        const sv = intercept.clone().project(sm.camera);
        if (sv.z < 1) {
          const lx = (sv.x *  0.5 + 0.5) * window.innerWidth;
          const ly = (sv.y * -0.5 + 0.5) * window.innerHeight;
          leadIndicatorEl.style.left    = lx + 'px';
          leadIndicatorEl.style.top     = ly + 'px';
          leadIndicatorEl.style.display = 'block';
        } else {
          leadIndicatorEl.style.display = 'none';
        }
      } else {
        leadIndicatorEl.style.display = 'none';
      }
    }

    // Ship-asteroid collision
    const collision = spaceDebris.checkShipCollision(controls.getPosition(), controls.getSpeed());
    if (collision) {
      if (collision.bounced) controls.applyBounce(collision.normal);
      if (!collision.unbreakable) soundManager.playAsteroidBreak();
    }

    // Ship-funny debris collision
    const funnyHit = funnyDebris.checkShipCollision(controls.getPosition(), controls.getSpeed());
    if (funnyHit) {
      controls.applyBounce(funnyHit.normal);
      soundManager.playAsteroidBreak();
    }

    // Mothership collision (top/sides only — hangar bay stays open below)
    if (mothership) {
      const mn = mothership.checkPlayerCollision(controls.getPosition());
      if (mn) {
        controls.applyBounce(mn);
      }
    }

    // Cargo ship collision
    if (cargoShip) {
      const cn = cargoShip.checkPlayerCollision(controls.getPosition());
      if (cn) {
        controls.applyBounce(cn);
      }
    }

    // ── Ship health (always active once controls are locked, not just multiplayer) ──
    if (!_deathInProgress) {
      shipHealth.update(delta);
      // updateShield is called via shipHealth.onChange callback
    }

    // Camera shake during Dyson sphere lockDown shockwave
    const shake = dysonSphere?.getShake?.(delta) ?? 0;
    if (shake > 0) {
      _shakeOffset.set(
        (Math.random() - 0.5) * 2 * shake,
        (Math.random() - 0.5) * 2 * shake,
        (Math.random() - 0.5) * 2 * shake
      );
      sm.camera.position.add(_shakeOffset);
    }

    // ── Multiplayer-specific updates ──────────────────────────────────────────
    if (networkManager.connected && !_deathInProgress) {
      // Gathering: update enemy progress scaling
      if (gameState.phase === 0) {
        enemyManager.setProgress(gameState.progress);
        enemyManager.update(delta, controls.getPosition());
      }
      // Escort: enemies target cargo ship
      else if (gameState.phase === 1) {
        enemyManager.update(delta, controls.getPosition(), cargoShip?.group.position ?? null);

        // Cargo hit detection
        if (cargoShip) {
          const cargoHit = enemyManager.checkCargoCollision(cargoShip.group.position);
          if (cargoHit) {
            // Visual flash only (server is authoritative for actual HP)
            cargoShip._hitFlashTimer = 0.25;
            networkManager.sendMessage({ type: 'cargo_hit', damage: cargoHit.damage });
            soundManager.playCargoHit?.();
          }
          // Use server-authoritative cargo HP for bar display
          gameHUD.updateCargoHp(gameState.cargoHp, gameState.cargoMaxHp);

          // Dyson sphere panels appear as cargo ship travels
          const t = cargoShip.transitProgress;
          const targetPanels = Math.floor(t * gameState.panelsTarget);
          if (targetPanels > _dysonPanelsShown) {
            for (let i = _dysonPanelsShown; i < targetPanels; i++) {
              dysonSphere?.showPanel(i);
            }
            // Play construction tick sound (throttled to ~1 per 600ms)
            const _now = performance.now();
            if (_now - _lastPanelSnapTime > 600) {
              soundManager.playPanelSnap();
              _lastPanelSnapTime = _now;
            }
            _dysonPanelsShown = targetPanels;
          }
        }
      }
      // Boss phase — 60s countdown, sphere builds, fight Goliath
      else if (gameState.phase === 2) {
        if (goliath.isAlive) {
          goliath.update(delta, controls.getPosition());
          gameHUD.updateBoss(goliath.hp, goliath.maxHp);
        }

        // Advance the 60s construction timer
        _bossPhaseTime += delta;
        const bossProgress  = Math.min(_bossPhaseTime / 60, 1);
        const secondsLeft   = Math.max(0, 60 - Math.floor(_bossPhaseTime));
        gameHUD.updateCountdown(secondsLeft);

        // Fill sphere panels progressively during the 60s window
        if (dysonSphere) {
          const targetPanels = Math.floor(bossProgress * dysonSphere.totalPanels);
          if (targetPanels > _dysonPanelsShown) {
            for (let i = _dysonPanelsShown; i < targetPanels; i++) {
              dysonSphere.showPanel(i);
            }
            // Play construction tick sound (throttled to ~1 per 600ms)
            const _now = performance.now();
            if (_now - _lastPanelSnapTime > 600) {
              soundManager.playPanelSnap();
              _lastPanelSnapTime = _now;
            }
            _dysonPanelsShown = targetPanels;
          }

          // At t=60 the sphere completes (lockDown fires beams + shockwaves)
          if (_bossPhaseTime >= 60 && !dysonSphere._lockedDown) {
            dysonSphere.lockDown();
            soundManager.playDysonActivate();
          }
        }

      }

      // Player collision with enemies (phases 0 and 1)
      if (gameState.phase <= 1) {
        const enemyCollision = enemyManager.checkPlayerCollision(controls.getPosition());
        if (enemyCollision) {
          controls.applyBounce(enemyCollision.normal);
          shipHealth.takeDamage(enemyCollision.damage);
          soundManager.playAsteroidBreak();
        }
      }
    }
  }

  // Debris always drifts
  if (!warpAnimation.isActive) {
    spaceDebris.update(delta, controls.getPosition());
    shootingStars.update(delta, controls.getPosition());
    funnyDebris.update(delta, controls.getPosition());
  }

  // World objects always animate
  sun?.update(delta, controls.getPosition());
  mothership?.update(delta);
  cargoShip?.update(delta);
  dysonSphere?.update(delta);

  // Auto-exposure near the sun (skip during intro/warp/entry to avoid fighting animations)
  if (!introAnimation.isActive && !warpAnimation.isActive && !entryAnimation.isActive) {
    updateAutoExposure(controls.getPosition());
  }

  // Spaceship animates
  if (!warpAnimation.isActive) {
    spaceship.update(delta, controls.getSpeed(), controls.boosting, controls.getInput());
  }
  soundManager.updateThruster(controls.getSpeed());

  if (nearestPortal) {
    projectCard.show(nearestPortal.project, entered);
  } else {
    projectCard.hide();
  }

  // Multiplayer — send position + update remote ship positions
  networkManager.update(delta);
  for (const rp of remotePlayers.values()) rp.update(delta);

  // Materials deposit + HUD cargo update
  if (networkManager.connected) {
    materialsSystem.update(delta, controls.getPosition());
    gameHUD.updateCargo(materialsSystem.heldOre, materialsSystem.heldParts, materialsSystem.status);

    // Prompt player to deposit when carrying materials during gathering phase
    if (gameState.phase === 0) {
      const hasCargo = materialsSystem.status === 'hasCargo' || materialsSystem.status === 'full';
      mothership?.setDepositPrompt(hasCargo);
    }
  }

  // Beacon proximity
  if (!introAnimation.isActive) {
    joinBeacon.update(delta, controls.getPosition());
  }

  // ── Distance-based label fade — hide labels that are too far to read cleanly ──
  {
    const pos  = controls.getPosition();
    // Returns 1 when d <= near, 0 when d >= far, smooth lerp in between
    const fade = (d, near, far) => d <= near ? 1 : d >= far ? 0 : 1 - (d - near) / (far - near);

    // Portal (planet) labels — visible from far away
    for (const portal of portalManager.portals) {
      if (portal._labelDiv) {
        const d = pos.distanceTo(portal.group.position);
        portal._labelDiv.style.opacity = fade(d, 600, 1000);
        const scale = d < 80 ? 1.8 : d < 600 ? 1.8 - (d - 80) / 520 * 0.8 : 1.0;
        portal._labelDiv.style.transform = `scale(${scale.toFixed(2)})`;
      }
    }

    // Mothership + cargo ship labels — mid-range
    if (mothership?._labelDiv) {
      const d = pos.distanceTo(mothership.group.position);
      mothership._labelDiv.style.opacity = fade(d, 120, 420);
    }
    if (cargoShip?._labelDiv) {
      const d = pos.distanceTo(cargoShip.group.position);
      cargoShip._labelDiv.style.opacity = fade(d, 100, 350);
    }

    // Dyson sphere label — always visible, fades only at extreme distance
    if (dysonSphere?._labelDiv) {
      const d = pos.distanceTo(dysonSphere.group.position);
      dysonSphere._labelDiv.style.opacity = fade(d, 4000, 7000);
    }
  }

  postProcessing.render();
  labelRenderer.render(sm.scene, sm.camera);
}

animate();

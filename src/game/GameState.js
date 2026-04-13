/**
 * GameState — client-side authoritative game state.
 * Receives state updates from the server and notifies registered listeners.
 *
 * Phases: 0=GATHERING, 1=ESCORT, 2=BOSS FIGHT, 3=VICTORY
 */

export const PHASE_INFO = [
  { id: 0, name: 'GATHERING',  objective: 'Collect ore & parts. Deposit at the MOTHERSHIP' },
  { id: 1, name: 'ESCORT',     objective: 'Defend the CARGO SHIP as it travels to the sun!' },
  { id: 2, name: 'BOSS FIGHT', objective: 'Destroy the GOLIATH! Hold [F] for special laser' },
  { id: 3, name: 'VICTORY',    objective: 'Mission complete. The Dyson sphere is online!' },
];

export class GameState {
  constructor() {
    this.phase        = 0;
    this.panelsBuilt  = 0;
    this.panelsTarget = 15;  // dynamically set by server based on player count
    this.playerCount  = 0;
    this.cargoHp      = 200;
    this.cargoMaxHp   = 200;

    /** Called whenever any field changes: (state) => void */
    this.onChange = null;
    /** Called only when phase changes: (newPhase, oldPhase) => void */
    this.onPhaseChange = null;
  }

  /** Apply a raw game_state object received from the server. */
  apply(data) {
    const prevPhase = this.phase;

    if (data.phase        !== undefined) this.phase        = data.phase;
    if (data.panelsBuilt  !== undefined) this.panelsBuilt  = data.panelsBuilt;
    if (data.panelsTarget !== undefined) this.panelsTarget = data.panelsTarget;
    if (data.playerCount  !== undefined) this.playerCount  = data.playerCount;
    if (data.cargoHp      !== undefined) this.cargoHp      = data.cargoHp;
    if (data.cargoMaxHp   !== undefined) this.cargoMaxHp   = data.cargoMaxHp;

    if (this.onPhaseChange && this.phase !== prevPhase) {
      this.onPhaseChange(this.phase, prevPhase);
    }
    if (this.onChange) this.onChange(this);
  }

  get phaseInfo() { return PHASE_INFO[this.phase] ?? PHASE_INFO[0]; }
  get progress()  { return Math.min(1, this.panelsBuilt / Math.max(1, this.panelsTarget)); }
}

/**
 * Shared world constants.
 * Plain objects (no THREE imports) so anything can import this safely.
 */
export const WORLD = {
  sun: {
    x: 0, y: 0, z: -3000,
    radius: 500,
  },
  dysonSphere: {
    x: 0, y: 0, z: -3000,
    radius: 580,      // clearly larger than sun (r=500) so structure is visible
    panelDetail: 2,   // IcosahedronGeometry detail level → 320 faces (20 × 4^2)
  },
  mothership: {
    x: 220, y: -70, z: 320,
  },
  cargoShip: {
    x: 220, y: -107, z: 320, // docked in the mothership's ventral hangar bay
  },
};

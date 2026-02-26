import { Portal } from './Portal.js';

export class PortalManager {
  constructor(scene, projects) {
    this.portals = [];
    this.infoRange = 70;
    this.enterRange = 22;
    this.openedPortalId = null;
    for (const project of projects) {
      const portal = new Portal(project);
      scene.add(portal.group);
      this.portals.push(portal);
    }
  }

  update(delta, shipPosition) {
    let nearestInRange = null;
    let nearestDist = Infinity;
    let entered = false;
    let minDistToAny = Infinity;

    let entryPortal = null;

    for (const portal of this.portals) {
      const dist = shipPosition.distanceTo(portal.group.position);
      portal.update(delta, dist);

      if (dist < minDistToAny) minDistToAny = dist;

      const portalScale = portal.scale || 1.0;
      if (dist < this.infoRange * portalScale && dist < nearestDist) {
        nearestDist = dist;
        nearestInRange = portal;
      }

      if (dist < this.enterRange * portalScale && nearestInRange === portal) {
        entered = true;
        // Signal entry once per portal (dedup)
        if (this.openedPortalId !== portal.project.id) {
          this.openedPortalId = portal.project.id;
          entryPortal = portal;
        }
      }
    }

    // Reset once the ship has left the enter range of the opened portal
    if (!entered && this.openedPortalId) {
      this.openedPortalId = null;
    }

    return { portal: nearestInRange, entered, nearestDist, entryPortal, minDistToAny };
  }
}

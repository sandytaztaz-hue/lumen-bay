// LUMEN BAY — the 15 story jobs: start, target marker, completion.
// Reaching a mission target completes the job the honest way; the probe
// calls the same completeMission() the game calls when the conditions
// are met. Rewards, kills, rep and turf follow config.js exactly:
// all 15 done = $39,700, 19 kills, 8/12 turf, Bay Garage owned.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

export function createMissions(G) {
  // floating gold diamond + beam at the active target
  const marker = new THREE.Group();
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  diamond.position.y = 3.2;
  marker.add(diamond);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.9, 30, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 15;
  marker.add(beam);
  marker.visible = false;
  G.scene.add(marker);

  return {
    marker,
    activeId: 0,
    guardKills: 0, // mission 15 needs 4 vault guards down first
    byId(id) { return MISSIONS.find((m) => m.id === id); },
    start(id) {
      const m = this.byId(id);
      if (!m) return false;
      this.activeId = id;
      this.guardKills = 0;
      marker.position.set(m.target.x, 0, m.target.z);
      marker.visible = true;
      G.state.mission = id;
      G.state.missionStage = 1;
      G.log(`JOB ${id}: ${m.title} \u2014 ${m.sub}`);
      G.setDialogue('MARA', '#ff7a1a', `${m.title} \u2014 ${m.sub}`);
      if (id === 12) G.race.start();
      return true;
    },
    // The one completion path: rewards, rep, kills, turf, garage, save.
    complete(id) {
      const m = this.byId(id);
      if (!m || G.state.done[id]) return false;
      G.state.done[id] = true;
      G.state.cash += m.reward;
      G.state.rep += m.rep;
      G.state.kills += m.kills;
      if (m.turf) G.turf.takeNext();
      if (m.garage) {
        G.garage.owned = true;
        G.log('Bay Garage claimed \u2014 yours now');
      }
      if (id === 15) {
        // finale: the story is complete. Turf stays at the 8 districts the
        // jobs actually took (8/12); the 12/12 in the finale shot is a HUD
        // pin, not a turf state change.
        G.state.storyComplete = true;
      }
      marker.visible = false;
      this.activeId = 0;
      G.audio.stinger();
      G.toast('good', 'MISSION PASSED', `${m.title} +$${m.reward.toLocaleString('en-US')}`);
      G.log(`MISSION PASSED: ${m.title} \u2014 +$${m.reward.toLocaleString('en-US')} \u00b7 +${m.rep} REP`);
      // advance to the next job, or free roam after the finale
      const next = this.byId(id + 1);
      if (next) this.start(id + 1);
      else G.state.mission = 0;
      G.save();
      return true;
    },
    completeAll() {
      for (const m of MISSIONS) this.complete(m.id);
    },
    // per-frame: spin the marker, check arrival at the target
    update(dt) {
      diamond.rotation.y += dt * 2;
      if (!this.activeId || G.shotMode) return;
      const m = this.byId(this.activeId);
      if (!m) return;
      // mission 15 waits for the 4 vault guards
      if (m.id === 15 && this.guardKills < 4) return;
      const dx = G.player.pos.x - m.target.x;
      const dz = G.player.pos.z - m.target.z;
      if (dx * dx + dz * dz < 100) this.complete(m.id);
    },
  };
}

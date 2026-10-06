'use strict';
// Read-only interpretation of existing native events. Final controller branch
// labels cannot undo an earlier physical contact or describe the entire route.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function summarize(result, trace, map) {
  const flaps = new Set(trace.flapTicks);
  const events = result.events || result.finalState?.events || [];
  const contacts = events.filter(e => e.type === 'bounce' && e.side === 'top' && e.id.endsWith('-S-reset')).map(event => {
    const moduleId = event.id.slice(0, -'-S-reset'.length);
    const spring = map.obstacles.find(o => o.id === event.id);
    const gate = map.obstacles.find(o => o.id === `${moduleId}-G-receiver`);
    const firstAfter = trace.rows.find(row => row[0] === event.tick + 1);
    const holdTicks = Array.from({ length: 12 }, (_, i) => event.tick + i + 1);
    const releaseHoldObserved = holdTicks.every(tick => tick < result.actualTicks && !flaps.has(tick));
    const clearanceX = gate ? gate.x + gate.collider.w + 10 : null;
    const clearance = gate ? trace.rows.find(row => row[0] > event.tick && row[1] > clearanceX && row[5] === 1) : null;
    return {
      moduleId, sourceId: event.id, contactTick: event.tick, nativeContact: true,
      firstRecordedStateAfterContact: firstAfter ? { tick: firstAfter[0], x: firstAfter[1], y: firstAfter[2], vx: firstAfter[3], vy: firstAfter[4] } : null,
      configuredTopBounceVy: spring ? -spring.interaction.bounce_speed_px_s : null,
      releaseHoldTicks: holdTicks, twelveTickReleaseVerifiedFromInputTape: releaseHoldObserved,
      receiverSourceId: gate?.id || null, receiverClearanceX: clearanceX,
      receiverClearedAlive: !!clearance,
      receiverClearanceState: clearance ? { tick: clearance[0], x: clearance[1], y: clearance[2], vx: clearance[3], vy: clearance[4] } : null,
      finalControllerBranchLabel: result.controllerStats?.branches?.[moduleId] || null,
      interpretation: 'Native top contact is authoritative. A later bypass label can record post-bounce feedback and does not erase this contact.'
    };
  });
  return {
    schema: 'combo-map-actual-contact-summary/1', id: result.id,
    outcome: result.outcome, nativeWon: result.nativeWon,
    actualTopContacts: contacts,
    actualContactThenReceiverClearCount: contacts.filter(c => c.receiverClearedAlive).length,
    noRecordedTopSpringContact: contacts.length === 0,
    controllerDecisions: result.controllerStats?.observations || [],
    qualification: 'Read-only summary of existing native events, input tape, and trajectory; no new run or general qualification'
  };
}

function readSummary(resultFile) {
  const dir = path.dirname(path.resolve(resultFile));
  const result = JSON.parse(fs.readFileSync(resultFile));
  const tracePath = path.join(dir, result.traceFile || 'trace.json.gz');
  const bytes = fs.readFileSync(tracePath);
  const trace = JSON.parse(tracePath.endsWith('.gz') ? zlib.gunzipSync(bytes) : bytes);
  const map = JSON.parse(fs.readFileSync(path.join(dir, 'map.json')));
  return summarize(result, trace, map);
}

module.exports = { summarize, readSummary };
if (require.main === module) {
  if (process.argv.length < 3) throw Error('Usage: node actual_contact_summary.cjs RESULT.json [RESULT.json ...]');
  process.stdout.write(JSON.stringify(process.argv.slice(2).map(readSummary), null, 2) + '\n');
}

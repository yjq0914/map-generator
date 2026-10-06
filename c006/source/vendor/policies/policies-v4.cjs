'use strict';
/**
 * Fixed execution-policy API (all prediction below is analytical, never F.step).
 * create(kind, {seed, task: 'safe'|'reward'}, saved?) -> callable boolean controller
 * callable: snapshot(), stats(), events(), finish(). Snapshots can be restored.
 * augmentObservation(map, state, F.observation(map,state), coinState?) adds only a
 * clock and collectible circles in the SAME [-R,+520px] visible horizontal range.
 * Map obstacle descriptors, timelines, seeds, routes and mechanism state are NEVER
 * handed to H1. Force/contact prediction is deliberately approximate and uses
 * visible kind/shape/status and measured motion, not hidden interaction settings.
 * P0/noise/legacy-noise delegate directly to the original event-proxies module.
 */
const Legacy = require('./framework/v4/event-proxies');
const Geometry = require('./geometry.cjs');
const HZ = 120, R = 10, GRAVITY = 820, FLAP = -290;
const CONFIG = Object.freeze({
  version: 'visible-shape-analytical-h1/1', epochTicks: 12, horizonEpochs: 10,
  analyticalSampleTicks: 4, beamWidth: 6, maxVisibleAhead: 520,
  slow: Object.freeze({observationDelayTicks: 6, actionDelayTicks: 6,
    actionJitterTicks: 3, omissionProbability: 0.03}),
  nominalSuctionAcceleration: 220, nominalBounceSpeed: 360,
  seedConvention: 'H1-slow counter-based seed + controller tick + channel; common random numbers across paired maps',
  scope: 'current visible geometry/rewards, visible cues and past delivered observations only',
  qualification: 'approximate policy prediction; no engine simulation and no feasibility guarantee'
});
const IDS = Object.freeze({P0: Legacy.IDS.P0, noise: Legacy.IDS.noise,
  'legacy-noise': Legacy.IDS.noise, heterogeneous: Legacy.IDS.heterogeneous,
  H1: CONFIG.version, 'H1-slow': CONFIG.version + '-obs6-delay6-jitter3-miss003'});
const copy = value => structuredClone(value);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = value => Number.isFinite(value);
function augmentObservation(map, state, originalObs, coinState) {
  if (!originalObs?.player || !Array.isArray(originalObs.obstacles)) throw Error('Expected original visible observation');
  const x = originalObs.player.x, collected = new Set(coinState?.collectedIds || []);
  const rewards = (map.coins || []).filter(c => !collected.has(c.id) &&
    c.x + c.radius >= x - R && c.x - c.radius <= x + CONFIG.maxVisibleAhead)
    .map(c => ({id:c.id, x:c.x, y:c.y, radius:c.radius, value:c.value, role:c.role}))
    .sort((a,b) => a.x-b.x || a.id.localeCompare(b.id));
  return {...originalObs, tick:state.tick, rewards};
}
// Strip unknown fields at the policy boundary, including caller-added oracle data.
function visibleFrame(input, fallbackTick) {
  const p = input?.player;
  if (!p || ![p.x,p.y,p.vy].every(finite) || !Array.isArray(input.obstacles)) throw Error('Invalid H1 observation');
  const obstacleKeys = ['id','sourceId','kind','x','y','w','h','x2','y2','width','shape','points',
    'status','lethal','vx','vy','projectile','forceRegion','phase','contactSurface','motionCue','aim'];
  const obstacles = input.obstacles.map(o => Object.fromEntries(obstacleKeys.filter(k => o[k] !== undefined).map(k => [k,copy(o[k])])));
  const rewards = (input.rewards || []).filter(c => [c.x,c.y,c.radius,c.value].every(finite) &&
    c.x+c.radius >= p.x-R && c.x-c.radius <= p.x+CONFIG.maxVisibleAhead)
    .map(c => ({id:c.id,x:c.x,y:c.y,radius:c.radius,value:c.value,role:c.role}));
  return {tick:Number.isInteger(input.tick)?input.tick:fallbackTick,
    player:{x:p.x,y:p.y,vx:finite(p.vx)?p.vx:150,vy:p.vy},height:input.height||540,obstacles,rewards};
}
function counterRandom(seed, tick, channel) {
  let x = (seed ^ Math.imul((tick + 1) >>> 0, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function motionModels(frame, previous) {
  const dt = previous ? (frame.tick-previous.tick)/HZ : 0;
  const old = new Map((previous?.obstacles||[]).map(o=>[o.id,o]));
  return frame.obstacles.map(o => {
    const p = old.get(o.id), derivative = key => dt>0 && p && finite(o[key]) && finite(p[key]) ? clamp((o[key]-p[key])/dt,-800,800) : 0;
    return {...o, dx:finite(o.vx)?o.vx:derivative('x'), dy:finite(o.vy)?o.vy:derivative('y'),
      dx2:derivative('x2'), dy2:derivative('y2'), dw:derivative('w'), dh:derivative('h')};
  });
}
function atTime(o, t) {
  return {...o,x:o.x+o.dx*t,y:o.y+o.dy*t,
    w:Math.max(1,o.w+o.dw*t),h:Math.max(1,o.h+o.dh*t),
    ...(o.shape==='segment'?{x2:o.x2+o.dx2*t,y2:o.y2+o.dy2*t}:{})};
}
function active(o) { return !['idle','warning','cleared','expired'].includes(o.status); }
function dangerCost(margin) {
  if (margin <= 0) return 200000 + Math.min(10000,-margin*500);
  if (margin < 16) return (16-margin)**2 * 1.5;
  if (margin < 44) return (44-margin)**2 * 0.007;
  return 0;
}
function analyticalDecision(frame, previous, task) {
  const duration = CONFIG.epochTicks/HZ, sampleDt = CONFIG.analyticalSampleTicks/HZ;
  const maxTravel = Math.max(150,Math.abs(frame.player.vx))*duration*CONFIG.horizonEpochs + 70;
  const models = motionModels(frame, previous).filter(o => {
    const left = o.shape==='segment'?Math.min(o.x,o.x2):o.x;
    const right = o.shape==='segment'?Math.max(o.x,o.x2):o.x+o.w;
    return right + Math.abs(o.dx)*1.1 >= frame.player.x-R-40 && left-Math.abs(o.dx)*1.1 <= frame.player.x+maxTravel;
  });
  const rewards = frame.rewards.filter(c=>c.x>=frame.player.x-R&&c.x<=frame.player.x+maxTravel);
  let beam = [{...frame.player,cost:0,unsafeSamples:0,first:false,bounced:[],rewardIds:[]}];
  let evaluations=0;
  for (let depth=0; depth<CONFIG.horizonEpochs; depth++) {
    const candidates=[];
    for (const node of beam) for (const flap of [false,true]) {
      const q={...node,vy:flap?FLAP:node.vy,first:depth?node.first:flap,
        bounced:node.bounced.slice(),rewardIds:node.rewardIds.slice()};
      q.cost += flap ? 0.45 : 0;
      for(let sub=1;sub<=CONFIG.epochTicks/CONFIG.analyticalSampleTicks;sub++) {
        const t=depth*duration+sub*sampleDt;
        const oldY=q.y;
        let ax=0, ay=GRAVITY;
        for(const m of models) if(m.forceRegion && active(m)) {
          const o=atTime(m,t),dx=o.x+o.w/2-q.x,dy=o.y+o.h/2-q.y,d=Math.hypot(dx,dy);
          if(d>0&&d<=o.w/2) {
            if(o.kind==='suction_core'){ax+=dx/d*CONFIG.nominalSuctionAcceleration;ay+=dy/d*CONFIG.nominalSuctionAcceleration;}
            else if(o.kind==='push_pulse_core')q.cost+=5; // unseen impulse magnitude/timing is uncertainty, not secretly read
          }
        }
        // Coarse analytical kinematics, not the frozen collision/physics integrator.
        q.x += q.vx*sampleDt + 0.5*ax*sampleDt**2;
        q.y += q.vy*sampleDt + 0.5*ay*sampleDt**2;
        q.vx += ax*sampleDt; q.vy += ay*sampleDt;
        const discount=1/(1+depth*.08);
        const boundaryMargin=Math.min(q.y-R,frame.height-R-q.y);
        if(boundaryMargin<=0)q.unsafeSamples++;
        q.cost += dangerCost(boundaryMargin)*discount;
        for(const m of models) {
          const o=atTime(m,t);
          if(!active(o)) {
            // Telegraphs are visible signals, but expose no future activation time.
            if(o.status==='warning'&&Geometry.signedBodyDistance(q.x,q.y,o)<R+18)q.cost+=2*discount;
            continue;
          }
          const margin=Geometry.signedBodyDistance(q.x,q.y,o)-R;
          if(o.lethal){if(margin<=0)q.unsafeSamples++;q.cost+=dangerCost(margin)*discount;}
          if(['spring_wall','crack_bumper_panel'].includes(o.kind)&&margin<=0&&!q.bounced.includes(o.id)) {
            const top=oldY<o.y+o.h/2;
            const allowed=o.contactSurface!=='descending-top-only'||(q.vy>0&&oldY<=o.y-R&&q.x>=o.x&&q.x<=o.x+o.w);
            if(allowed){q.vy=top?-CONFIG.nominalBounceSpeed:CONFIG.nominalBounceSpeed;q.y=top?o.y-R-0.01:o.y+o.h+R+0.01;q.bounced.push(o.id);q.cost+=3;}
          }
          if(o.kind==='paired_portal'&&margin<20)q.cost+=4; // destination is not visible knowledge
        }
        q.cost += ((q.y-frame.height/2)**2*.00008 + q.vy**2*.000012)*discount;
        if(task==='reward') for(const c of rewards) {
          const d=Math.hypot(c.x-q.x,c.y-q.y),reach=R+c.radius;
          if(d<=reach&&!q.rewardIds.includes(c.id)){q.rewardIds.push(c.id);q.cost-=90*Math.max(1,c.value);}
          else if(c.x>=q.x-R&&c.x-q.x<70&&!q.rewardIds.includes(c.id))q.cost-=2.4*Math.max(1,c.value)*Math.exp(-d*d/(2*55**2));
        }
        evaluations++;
      }
      candidates.push(q);
    }
    // Predicted survival is lexicographic; reward value can never buy a lethal sample.
    candidates.sort((a,b)=>a.unsafeSamples-b.unsafeSamples || a.cost-b.cost || Number(a.first)-Number(b.first) || a.y-b.y);
    const unique=new Set(); beam=[];
    for(const q of candidates){const key=[Math.round(q.x/4),Math.round(q.y/7),Math.round(q.vy/35),q.first,q.bounced.join(','),q.rewardIds.join(',')].join('|');if(!unique.has(key)){unique.add(key);beam.push(q);}if(beam.length>=CONFIG.beamWidth)break;}
  }
  const best=beam[0];
  return {action:!!best.first, predictedUnsafeSamples:best.unsafeSamples, predictedCost:best.cost, analyticalSamples:evaluations,
    horizonTicks:CONFIG.horizonEpochs*CONFIG.epochTicks, visibleBodies:models.length,
    task, targetedRewardIds:best.rewardIds, approximation:'visible linear-motion/nominal-force-contact only'};
}
function create(kind='P0',options={},saved) {
  if(['P0','legacy-noise','noise','heterogeneous'].includes(kind)) {
    const legacyKind=kind==='legacy-noise'?'noise':kind;
    return Legacy.create(legacyKind,{seed:options.seed??0x51a72},saved);
  }
  if(!['H1','H1-slow'].includes(kind))throw Error('Unknown policy: '+kind);
  const config={seed:options.seed??0x51a72,task:options.task??'safe'};
  if(!Number.isInteger(config.seed)||config.seed<0||config.seed>0xffffffff||!['safe','reward'].includes(config.task))throw Error('Invalid H1 seed/task');
  if(saved&&(saved.schema!=='h1-policy/1'||saved.kind!==kind||JSON.stringify(saved.options)!==JSON.stringify(config)))throw Error('H1 checkpoint mismatch');
  let tick=saved?.tick??0,pending=saved?.adapter?.pending?copy(saved.adapter.pending):null;
  let pendingObservation=saved?.pendingObservation?copy(saved.pendingObservation):null;
  let previous=saved?.previousObservation?copy(saved.previousObservation):null;
  let lastDecision=saved?.lastDecision?copy(saved.lastDecision):null,finished=saved?.finished??false;
  let stats=saved?.stats?copy(saved.stats):{requests:0,intents:0,delivered:0,missed:0,cancelled:0,delayed:0,jittered:0,totalDelayTicks:0,decisions:0,observationWarmupEpochs:0,analyticalSamples:0};
  const events=[];const slow=kind==='H1-slow';
  const act=input=>{
    if(finished)throw Error('Cannot advance a finished H1 controller');
    let delivered=false;
    if(pending&&pending.due<=tick){delivered=pending.deliver;stats[delivered?'delivered':'missed']++;events.push({tick,type:delivered?'deliver':'miss',requestedAt:pending.at});pending=null;}
    if(slow&&(tick+CONFIG.slow.observationDelayTicks)%CONFIG.epochTicks===0)pendingObservation=visibleFrame(input,tick);
    if(tick%CONFIG.epochTicks===0){
      const frame=slow?pendingObservation:visibleFrame(input,tick);
      if(frame){
        lastDecision=analyticalDecision(frame,previous,config.task);previous=frame;pendingObservation=null;
        stats.decisions++;stats.analyticalSamples+=lastDecision.analyticalSamples;
        if(lastDecision.action){
          stats.requests++;stats.intents++;
          const jitter=slow?Math.floor(counterRandom(config.seed,tick,0)*(CONFIG.slow.actionJitterTicks+1)):0;
          const delay=slow?CONFIG.slow.actionDelayTicks+jitter:0;
          const omitted=slow&&counterRandom(config.seed,tick,1)<CONFIG.slow.omissionProbability;
          const e={at:tick,due:tick+delay,deliver:!omitted};
          events.push({tick,type:'intent',due:e.due,deliver:e.deliver,observationTick:frame.tick});
          stats.totalDelayTicks+=delay;if(delay)stats.delayed++;if(jitter)stats.jittered++;
          if(delay)pending=e;else{delivered=e.deliver;stats[delivered?'delivered':'missed']++;events.push({tick,type:delivered?'deliver':'miss',requestedAt:tick});}
        }
      }else stats.observationWarmupEpochs++;
    }
    tick++;return delivered;
  };
  act.snapshot=()=>({schema:'h1-policy/1',kind,options:{...config},version:CONFIG.version,tick,
    adapter:{pending:pending?copy(pending):null},pendingObservation:pendingObservation?copy(pendingObservation):null,
    previousObservation:previous?copy(previous):null,lastDecision:lastDecision?copy(lastDecision):null,stats:{...stats},finished});
  act.stats=()=>({...stats});act.events=()=>copy(events);
  act.finish=()=>{if(pending){stats.cancelled++;events.push({tick,type:'cancel',requestedAt:pending.at});pending=null;}finished=true;};
  return act;
}
module.exports={create,augmentObservation,IDS,CONFIG,analyticalDecision,counterRandom};

/** Reusable synthetic unit checks. No engine is imported or physically advanced. */
function selfTest() {
  const assert=require('assert');let checks=0;
  const frame={tick:0,player:{x:60,y:270,vx:150,vy:0},height:540,obstacles:[],rewards:[]};
  for(const kind of ['P0','legacy-noise']) {
    const ours=create(kind,{seed:17,task:'reward'}),legacy=Legacy.create(kind==='legacy-noise'?'noise':kind,{seed:17});
    for(let tick=0;tick<150;tick++){const obs={...frame,tick,player:{...frame.player,y:270+Math.sin(tick/20)*30,vy:Math.cos(tick/20)*100}};assert.strictEqual(ours(obs),legacy(obs));}
    assert.deepStrictEqual(ours.snapshot(),legacy.snapshot());checks++;
  }
  for(const kind of ['H1','H1-slow']) {
    const a=create(kind,{seed:18});for(let tick=0;tick<43;tick++)a({...frame,tick});
    const b=create(kind,{seed:18},a.snapshot());
    for(let tick=43;tick<101;tick++)assert.strictEqual(a({...frame,tick}),b({...frame,tick}));
    assert.deepStrictEqual(a.snapshot(),b.snapshot());checks++;
  }
  const rewardFrame={...frame,rewards:[{id:'optional',x:120,y:160,radius:16,value:1,role:'risk'}]};
  assert.notStrictEqual(analyticalDecision(rewardFrame,null,'safe').action,analyticalDecision(rewardFrame,null,'reward').action);checks++;
  // A 10^15-value collectible beyond the lethal top edge cannot buy a collision.
  const unsafeJackpot={...frame,player:{...frame.player,y:30},rewards:[{id:'unsafe-jackpot',x:90,y:-10,radius:1,value:1e15,role:'risk'}]};
  const safe=analyticalDecision(unsafeJackpot,null,'safe'),reward=analyticalDecision(unsafeJackpot,null,'reward');
  assert.strictEqual(safe.predictedUnsafeSamples,0);assert.strictEqual(reward.predictedUnsafeSamples,0);assert.strictEqual(reward.action,false);checks++;
  const observed=augmentObservation({coins:[{id:'near',x:100,y:100,radius:5,value:1,role:'risk'},{id:'hidden',x:1000,y:100,radius:5,value:1,role:'risk'}]}, {tick:0,mechanicState:{hidden:true}},frame);
  assert.deepStrictEqual(observed.rewards.map(c=>c.id),['near']);assert.strictEqual(observed.mechanicState,undefined);checks++;
  assert.strictEqual(counterRandom(9,24,1),counterRandom(9,24,1));assert.notStrictEqual(counterRandom(9,24,1),counterRandom(9,36,1));checks++;
  return {status:'pass',suite:'nonphysical-policy-unit/1',checks,physicalStepCalls:0,
    checksInclude:['frozen P0/noise equivalence','snapshot restoration','explicit reward objective','lexicographic collision safety versus arbitrarily high reward','visible-only augmentation','counter-based common random stream']};
}
module.exports.selfTest=selfTest;
if(require.main===module&&process.argv.includes('--selftest'))console.log(JSON.stringify(selfTest()));

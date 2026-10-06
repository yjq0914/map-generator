'use strict';
function validate(map,route){const p=map.routes?.[route];if(!p||!p.segments?.length||!p.exit||!Number.isInteger(p.recoveryTicks)||p.recoveryTicks<120)throw Error('Missing hard route/exit/recovery contract');
 for(const e of p.events||[])if(!['bounce','no-bounce'].includes(e))throw Error('Unsupported required event '+e);
 for(const q of p.checkpoints||[]){if(!Number.isFinite(q.x)||!q.y||q.y.length!==2||q.vy&&q.vy.length!==2)throw Error('Invalid checkpoint');if(q.phase!==undefined||q.mechanism!==undefined)throw Error('Unsupported checkpoint phase/mechanism requirement');}
 if(p.contact){for(const key of ['startX','landingTargetX','surfaceY','minContactX','maxContactX','receiverEntryX','receiverExitX'])if(!Number.isFinite(p.contact[key]))throw Error('Invalid contact envelope');if(!(p.contact.minContactX<=p.contact.maxContactX&&p.contact.maxContactX<p.contact.receiverEntryX&&p.contact.receiverEntryX<p.contact.receiverExitX))throw Error('Contact order');}
 return true;
}
module.exports={validate};

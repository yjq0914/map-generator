'use strict'; const HZ=120,R=10,SAMPLE=12,EPS=1e-7; const round2=n=>Number(n.toFixed(6));
function merge(a){a=a.filter(v=>v[1]>=v[0]).sort((a,b)=>a[0]-b[0]);const out=[];for(const q of a){const p=out.at(-1);if(p&&q[0]<=p[1]+EPS)p[1]=Math.max(p[1],q[1]);else out.push(q.slice());}return out;}
function circleSection(x,cx,cy,r){const d=x-cx;if(Math.abs(d)>r+EPS)return[];const v=Math.sqrt(Math.max(0,r*r-d*d));return[[cy-v,cy+v]];}
function polygonSection(x,p){const ys=[],out=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))ys.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));if(x===a[0])out.push([a[1],a[1]]);if(a[0]===b[0]&&x===a[0])out.push([Math.min(a[1],b[1]),Math.max(a[1],b[1])]);}ys.sort((a,b)=>a-b);for(let i=0;i+1<ys.length;i+=2)out.push([ys[i],ys[i+1]]);return merge(out);}
function capsuleSection(x,ax,ay,bx,by,r){const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);let out=[...circleSection(x,ax,ay,r),...circleSection(x,bx,by,r)];if(len){const nx=-dy/len*r,ny=dx/len*r;out.push(...polygonSection(x,[[ax+nx,ay+ny],[bx+nx,by+ny],[bx-nx,by-ny],[ax-nx,ay-ny]]));}return merge(out);}
function vertices(o){return o.shape==='polygon'?o.points.map(p=>[o.x+p[0],o.y+p[1]]):[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]];}
function shapeSection(x,o){
 if(o.shape==='circle')return circleSection(x,o.x+o.w/2,o.y+o.h/2,o.w/2+R);
 if(o.shape==='segment')return capsuleSection(x,o.x,o.y,o.x2,o.y2,o.width/2+R);
 const p=vertices(o),out=polygonSection(x,p);for(let i=0;i<p.length;i++)out.push(...capsuleSection(x,...p[i],...p[(i+1)%p.length],R));return merge(out);
}
function pointSegment(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,u=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-u*dx,y-ay-u*dy);}
// Signed distance to physical body, before bird-radius subtraction.
function signedBodyDistance(x,y,o){
 if(o.shape==='circle')return Math.hypot(x-o.x-o.w/2,y-o.y-o.h/2)-o.w/2;
 if(o.shape==='segment')return pointSegment(x,y,o.x,o.y,o.x2,o.y2)-o.width/2;
 const p=vertices(o);let inside=false,dist=Infinity;for(let i=0,j=p.length-1;i<p.length;j=i++){
  const a=p[i],b=p[j];dist=Math.min(dist,pointSegment(x,y,...a,...b));if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?-dist:dist;
}
function lethal(b){return b.lethal&&!['cleared','idle','warning'].includes(b.status);}
function freeInterval(F,x,y,bodies,cert){
 const all=[];let nearest=Infinity,near=null;const hits=[];
 for(const o of bodies){const margin=signedBodyDistance(x,y,o)-R;if(margin<nearest){nearest=margin;near=o;}const b=F.bounds(o);if(x<b.minX-R-EPS||x>b.maxX+R+EPS)continue;
  const sections=shapeSection(x,o);for(const q of sections){if(q[1]<R||q[0]>540-R)continue;
   // Analytic cross-sections are independently checked against the runtime's collision predicate.
   const mid=(q[0]+q[1])/2;if(!F.hit(x,mid,o)&&q[1]-q[0]>1e-5)throw Error('Section midpoint disagrees with F.hit: '+o.id);
   for(const yy of[q[0]-1e-5,q[1]+1e-5])if(F.hit(x,yy,o))throw Error('Section exterior disagrees with F.hit: '+JSON.stringify({id:o.id,x,q,yy,o}));
   cert.checks+=3;all.push([Math.max(R,q[0]),Math.min(540-R,q[1])]);
  }
  if(F.hit(x,y,o))hits.push(o.id);
 }
 const merged=merge(all);let lo=R,hi=540-R,colliding=y<R||y>540-R||hits.length>0;
 for(const [a,b]of merged){if(b<y)lo=Math.max(lo,b);else if(a>y){hi=Math.min(hi,a);break;}else{colliding=true;break;}}
 return{interval:colliding?null:[round2(lo),round2(hi)],netVerticalClearance:colliding?0:round2(hi-lo),lowerVerticalMargin:colliding?null:round2(y-lo),upperVerticalMargin:colliding?null:round2(hi-y),nearestBodyMargin:Number.isFinite(nearest)?round2(nearest):null,nearestBodyId:near?.id??null,nearestBodyKind:near?.kind??null,worldMargin:round2(Math.min(y-R,540-R-y)),colliding,hits,forbiddenIntervals:merged.map(a=>a.map(round2))};
}
function describe(values){if(!values.length)return{n:0};const v=values.slice().sort((a,b)=>a-b);const q=p=>v[Math.floor((v.length-1)*p)];return{n:v.length,min:q(0),p05:q(.05),p25:q(.25),median:q(.5),p75:q(.75),p95:q(.95),max:q(1),mean:round2(v.reduce((a,b)=>a+b,0)/v.length)};}
function runs(samples,test,minSeconds=0){const out=[];let start=null,last=null;for(const s of samples){if(test(s)&&s.alive){if(start===null)start=s.tick;last=s.tick;}else if(start!==null){if((last-start)/HZ>=minSeconds)out.push({startTick:start,endTick:last,sampledSpanSeconds:round2((last-start)/HZ),samples:(last-start)/SAMPLE+1});start=last=null;}}if(start!==null&&(last-start)/HZ>=minSeconds)out.push({startTick:start,endTick:last,sampledSpanSeconds:round2((last-start)/HZ),samples:Math.floor((last-start)/SAMPLE)+1});return out;}

module.exports={freeInterval,shapeSection,signedBodyDistance,describe};

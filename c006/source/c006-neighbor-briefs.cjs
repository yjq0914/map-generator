'use strict';
const Prefix=require('./c002-subset-briefs.cjs'),Old=require('./c003-macro-briefs.cjs'),Laser=require('./c005-laser-briefs.cjs');
const macro=Old.macro,request=(parentRequest,m)=>({schema:'neighbor-late-macro-request/1',parentRequest,macro:m});
const ordinary=i=>Old.request(Prefix.control[i].request,null),laser=i=>Laser.request(i,null);
const control=[
 {briefId:'upper-moving-first-HLT',seed:1,adjacency:'upper-after',request:request(laser(3),macro(2,0,-1))},
 {briefId:'upper-fixed-first-HLT',seed:1,adjacency:'upper-after',request:request(laser(3),macro(2,0,1))},
 {briefId:'upper-moving-short-HLT',seed:1,adjacency:'upper-after',request:request(laser(3),macro(1.2,0,-1))},
 {briefId:'upper-moving-middle-HLT',seed:1,adjacency:'upper-after',request:request(laser(3),macro(1.6,0,-1))},
 {briefId:'lower-stagger-up-HJT',seed:0,adjacency:'lower-before',request:request(ordinary(7),macro(1.6,1,0))},
 {briefId:'lower-stagger-down-HJT',seed:0,adjacency:'lower-before',request:request(ordinary(7),macro(1.6,-1,0))},
 {briefId:'upper-LT-neighbor-order',seed:0,adjacency:'upper-after',request:request(laser(2),macro(1.9,-1,0))},
 {briefId:'lower-L-moving-first',seed:1,adjacency:'lower-before',request:request(laser(0),macro(1.3,0,-1))}
];
// Fixed old forms B/H/T/J/HT/HJ/JT plus HL, resolved by inherited selector.
const oldIndexes=[2,3,4,5,6,1,0];
const explore=Array.from({length:8},(_,i)=>({briefId:'neighbor-prefix-'+i,request:request(i<7?ordinary(oldIndexes[i]):laser(1),macro(i%2?1.3:1.9,(i%3-1)/2,(i%2?1:-1)*3/7))}));
function fresh(i,seconds,stagger,symmetry){const p=i<4?laser(i):ordinary([2,1,0,7][i-4]);return request(p,macro(seconds,stagger,symmetry));}
const holdoutDomain={actualValuesPresent:false,requestedCount:8,adjacency:['upper-after','lower-before'],construction:'After semantic Git and Library save, draw eight fresh ordinary physical conditions once with alternating carried neighbor class, continuous theme weights and integral120Hz recovery requests; explicit macro-null cumulative parent, no resampling. Exclude every c005 revealed six-field physical combination.',scope:'Complete late packages9/10 with every actual neighbor, same cumulative prefix; not arbitrary relocation or new internal patterns',unknown:['human fun','whole-image symmetry','arbitrary dependencies']};
module.exports={control,explore,macro,request,ordinary,laser,fresh,holdoutDomain};

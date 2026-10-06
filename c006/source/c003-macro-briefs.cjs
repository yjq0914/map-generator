'use strict';
const Prefix=require('./c002-subset-briefs.cjs');
const macro=(seconds=1.6,stagger=0,symmetry=0)=>({schema:'late-macro-request/1',firstDemand:'any',firstRecoverySeconds:seconds,theme:{staggerGradient:stagger,pairSymmetryGradient:symmetry}});
const request=(prefix,m)=>({schema:'flappy-prefix-and-late-macro-request/1',prefix,macro:m});
const h=Prefix.control[7].request;
const control=[
 {briefId:'moving-first-maximal',request:request(h,macro(2,0,-1)),seed:1},
 {briefId:'fixed-first-maximal',request:request(h,macro(2,0,1)),seed:1},
 {briefId:'moving-first-short-recovery',request:request(h,macro(1.2,0,-1)),seed:1},
 {briefId:'moving-first-middle-recovery',request:request(h,macro(1.6,0,-1)),seed:1},
 {briefId:'fixed-stagger-up',request:request(h,macro(1.6,1,0)),seed:0},
 {briefId:'fixed-stagger-down',request:request(h,macro(1.6,-1,0)),seed:0},
 {briefId:'preserve-new-hj',request:request(Prefix.control[1].request,{...macro(2,0,-1),firstDemand:'moving-hold'}),seed:1},
 {briefId:'preserve-new-jt',request:request(Prefix.control[0].request,{...macro(1.2,0,1),firstDemand:'hold-then-turn'}),seed:1}
];
const explore=Prefix.control.map((p,i)=>({briefId:'macro-'+p.briefId,request:request(p.request,macro(i%2?1.3:1.9,(i%3-1)/2,(i%2?1:-1)*3/7))}));
const holdoutDomain={actualValuesPresent:false,requestedCount:8,adjacency:'none',construction:'After semantic durable save, draw eight fresh physical conditions and continuous prefix/macro preference mixtures once; fixed three-operator subset requests each covered once; preserve generation errors without resampling.',scope:'Two late complete packages only; request-selected order and integral bridge duration; non-none adjacency remains inherited macro-null only',unknown:['arbitrary macro grammar','new internal symmetry or stagger construction','human fun']};
module.exports={control,explore,macro,request,Prefix,holdoutDomain};

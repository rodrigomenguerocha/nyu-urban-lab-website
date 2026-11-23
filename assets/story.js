/* Local, dependency-free point-cloud city. Scroll changes geometry, never scroll position. */
(() => {
 'use strict';
 const canvas=document.getElementById('story-canvas');if(!canvas)return;
 const root=document.getElementById('urbanlab-home'),steps=[...root.querySelectorAll('[data-story]')],stops=[...root.querySelectorAll('.story-stops a')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
 const label=root.querySelector('.story-city-label');
 const names=['00 / FOUR AREAS','01 / CULTURE-LED DEVELOPMENT','02 / HOUSING AFFORDABILITY','03 / NET ZERO CITIES','04 / PUBLIC PRIVATE DEVELOPMENT'];
 let seed=1789;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
 // Each scene is a distinct set of architectural surfaces in a common city coordinate system.
 function box(a,x,z,w,d,h,y=0,tone=0){
  const gap=5;
  for(let u=0;u<=w;u+=gap)for(let v=0;v<=d;v+=gap)a.push([x+u,y+h,z+v,1+tone]);
  for(let v=0;v<=h;v+=gap){for(let u=0;u<=w;u+=gap)a.push([x+u,y+v,z+d,.65+tone]);for(let u=0;u<=d;u+=gap)a.push([x,y+v,z+u,.35+tone]);}
 }
 function tree(a,x,z,h=27){
  for(let y=0;y<h;y+=3)a.push([x,y,z,.8]);
  for(let u=0;u<70;u++){const ang=u*2.39996,v=1-2*u/70,r=Math.sqrt(1-v*v)*14;a.push([x+Math.cos(ang)*r,h+v*18,z+Math.sin(ang)*r,1.3]);}
 }
 function ground(a){for(let x=-145;x<=145;x+=9)for(let z=-125;z<=125;z+=9){if(Math.abs(x%48)<9||Math.abs(z%48)<9)a.push([x,-3,z,.16]);}}
 const scenes=[];
 // 00: Manhattan, drawn from its real coastline (simplified longitude/latitude), turned so the island runs along x.
 // Hudson / New Jersey side is -z, East River / Brooklyn-Queens side is +z. The four research focuses are alive around it.
 const MH_PPP={x1:0,y1:18,z1:0,x2:0,y2:40,z2:0}, MH_CUL={x:0,z:0}, MH_LAB=[];
 let a=[];
 const MH_LL=[
  [-74.0155,40.7030],[-74.0180,40.7090],[-74.0195,40.7150],[-74.0170,40.7210],[-74.0130,40.7280],[-74.0110,40.7340],[-74.0090,40.7420],[-74.0070,40.7500],
  [-74.0030,40.7580],[-73.9980,40.7650],[-73.9930,40.7710],[-73.9890,40.7790],[-73.9840,40.7870],[-73.9790,40.7950],[-73.9750,40.8040],[-73.9700,40.8120],
  [-73.9640,40.8200],[-73.9580,40.8290],[-73.9520,40.8380],[-73.9480,40.8470],[-73.9430,40.8550],[-73.9370,40.8620],[-73.9310,40.8690],[-73.9250,40.8750],[-73.9215,40.8790],
  [-73.9190,40.8740],[-73.9210,40.8660],[-73.9250,40.8570],[-73.9295,40.8480],[-73.9320,40.8390],[-73.9340,40.8300],[-73.9350,40.8210],[-73.9320,40.8120],[-73.9300,40.8040],
  [-73.9340,40.7960],[-73.9410,40.7880],[-73.9450,40.7790],[-73.9500,40.7700],[-73.9550,40.7620],[-73.9610,40.7550],[-73.9670,40.7490],[-73.9710,40.7420],[-73.9750,40.7340],
  [-73.9740,40.7260],[-73.9740,40.7190],[-73.9770,40.7120],[-73.9830,40.7080],[-73.9920,40.7065],[-74.0010,40.7050],[-74.0070,40.7030],[-74.0120,40.7010]];
 // frame: u runs along the island (29° east of north), v across it (towards the East River)
 const mhKm=(lon,lat)=>{const X=(lon+73.97)*84.3,Z=-(lat-40.79)*111.1;return [.485*X-.875*Z,.875*X+.485*Z];};
 const _uv=MH_LL.map(p=>mhKm(p[0],p[1])),_u=_uv.map(p=>p[0]),_v=_uv.map(p=>p[1]);
 const MK=400/(Math.max(..._u)-Math.min(..._u)),uC=(Math.max(..._u)+Math.min(..._u))/2,vC=(Math.max(..._v)+Math.min(..._v))/2;
 const mh=(lon,lat)=>{const q=mhKm(lon,lat);return [(q[0]-uC)*MK,(q[1]-vC)*MK];};
 const poly=MH_LL.map(p=>mh(p[0],p[1]));
 const xMin=Math.min(...poly.map(p=>p[0])),xMax=Math.max(...poly.map(p=>p[0]));
 // shoreline table: for each x, the west (min z) and east (max z) edge of the island
 const shoreTab=[];
 for(let x=Math.floor(xMin);x<=Math.ceil(xMax);x++){let lo=1e9,hi=-1e9;
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];
   if((x>=Math.min(p[0],q[0]))&&(x<=Math.max(p[0],q[0]))&&p[0]!==q[0]){const z=p[1]+(q[1]-p[1])*(x-p[0])/(q[0]-p[0]);lo=Math.min(lo,z);hi=Math.max(hi,z);}}
  shoreTab[x-Math.floor(xMin)]=lo<1e8?[lo,hi]:null;}
 const shore=x=>{const i=Math.round(Math.max(Math.floor(xMin),Math.min(Math.ceil(xMax),x))-Math.floor(xMin));let t=shoreTab[i],k=0;while(!t&&k<20){k++;t=shoreTab[Math.max(0,i-k)]||shoreTab[Math.min(shoreTab.length-1,i+k)];}return t||[-20,20];};
 const inIsl=(x,z,m=0)=>{if(x<xMin||x>xMax)return false;const s=shore(x);return z>s[0]+m&&z<s[1]-m;};
 const uKm14=mhKm(-73.9911,40.7359)[0];
 const zeS=x=>shore(x)[1],zwS=x=>shore(x)[0];
 {
  let s0=4242;const r0=()=>{s0=(s0*1664525+1013904223)>>>0;return s0/4294967296;};
  // coastline
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],n=Math.max(1,Math.round(Math.hypot(q[0]-p[0],q[1]-p[1])/2.5));for(let k=0;k<n;k++)a.push([p[0]+(q[0]-p[0])*k/n,0,p[1]+(q[1]-p[1])*k/n,1.0]);}
  // avenues: lines along the island, clipped by the coast
  const ctr=x=>{const s=shore(x);return (s[0]+s[1])/2;};
  for(let i=-4;i<=4;i++)for(let x=xMin+2;x<=xMax-2;x+=3.8){const z=ctr(x)*.15+i*9;if(inIsl(x,z,2))a.push([x,0,z,(i===-2||i===2)?1.25:.8]);}
  // cross streets: numbered streets follow the real spacing (about 80 m a block); below 14th St the grid is looser
  const bigSt=[14,23,34,42,57,72,86,96,110,125,145,155,168,181,191,207];
  const street=(uKm,big,ang)=>{const x=(uKm-uC)*MK;if(x<xMin+3||x>xMax-3)return;const s=shore(x);const gap=big?2.6:3.8;
   for(let z=s[0]+2;z<=s[1]-2;z+=gap){const xx=x+(z-(s[0]+s[1])/2)*(ang||0);if(inIsl(xx,z,1.5))a.push([xx,0,z,big?1.25:.8]);}};
  for(let n=14;n<=222;n+=(n<96?6:8))street(uKm14+(n-14)*.0806,bigSt.includes(n),0);
  for(const n of bigSt)street(uKm14+(n-14)*.0806,true,0);
  for(let k=1;k<=9;k++)street(uKm14-k*.55,k===2,(r0()-.5)*.35);   // below 14th St: Greenwich Village, SoHo, Financial District
  // Broadway: the one diagonal across the grid
  {const B=[[-74.0135,40.7050],[-74.0090,40.7075],[-74.0070,40.7140],[-74.0010,40.7197],[-73.9965,40.7245],[-73.9908,40.7355],[-73.9885,40.7415],[-73.9877,40.7488],[-73.9855,40.7580],[-73.9819,40.7681],[-73.9815,40.7790],[-73.9740,40.7937],[-73.9680,40.8040],[-73.9590,40.8150],[-73.9420,40.8405]].map(p=>mh(p[0],p[1]));
   for(let i=0;i<B.length-1;i++){const p=B[i],q=B[i+1],n=Math.max(1,Math.round(Math.hypot(q[0]-p[0],q[1]-p[1])/2.4));for(let k=0;k<n;k++){const x=p[0]+(q[0]-p[0])*k/n,z=p[1]+(q[1]-p[1])*k/n;if(inIsl(x,z,1))a.push([x,0,z,1.35]);}}}
  // bridges
  for(const [l1,t1,l2,t2] of [[-74.0003,40.7123,-73.9937,40.7036],[-73.9905,40.7140,-73.9880,40.7030],[-73.9790,40.7140,-73.9650,40.7100],[-73.9615,40.7590,-73.9420,40.7525],[-73.9300,40.7840,-73.9200,40.7800],[-73.9440,40.8508,-73.9610,40.8512]]){
   const p=mh(l1,t1),q=mh(l2,t2);for(let k=0;k<=1;k+=.05)a.push([p[0]+(q[0]-p[0])*k,6*Math.sin(Math.PI*k),p[1]+(q[1]-p[1])*k,1.3]);}
  // Central Park (real corners), with the Reservoir
  {const Q=[[-73.9818,40.7678],[-73.9730,40.7644],[-73.9490,40.7968],[-73.9582,40.8005]].map(p=>mh(p[0],p[1]));
   const inQ=(x,z)=>{let s=0;for(let i=0;i<4;i++){const p=Q[i],q=Q[(i+1)%4],c=(q[0]-p[0])*(z-p[1])-(q[1]-p[1])*(x-p[0]);if(i===0)s=Math.sign(c);else if(Math.sign(c)!==s)return false;}return true;};
   const xs=Q.map(p=>p[0]),zs=Q.map(p=>p[1]);
   for(let x=Math.min(...xs);x<=Math.max(...xs);x+=3.2)for(let z=Math.min(...zs);z<=Math.max(...zs);z+=3.2)if(inQ(x,z))a.push([x,0,z,.55]);
   const R=mh(-73.9627,40.7850);for(let i=0;i<36;i++){const t=i/36*Math.PI*2;a.push([R[0]+Math.cos(t)*6,0,R[1]+Math.sin(t)*3.6,1.1]);}}
  // skyline hints: Lower Manhattan and Midtown
  for(const [lon,lat,w,d,hh] of [[-74.0130,40.7065,8,8,44],[-74.0105,40.7090,9,9,58],[-74.0125,40.7110,8,8,36],[-74.0085,40.7115,8,10,42],[-73.9857,40.7484,9,9,56],[-73.9755,40.7516,8,8,50],[-73.9847,40.7557,9,9,68],[-73.9786,40.7527,9,9,60],[-73.9815,40.7600,10,9,52]]){
   const c=mh(lon,lat),t=[];box(t,c[0]-w/2,c[1]-d/2,w,d,hh,0,.3);t.forEach(p=>a.push(p));}
  // the other boroughs and New Jersey: their own street grids, turned a little, so they read as different places
  const xBQ=mh(-73.9600,40.7320)[0],xQB=mh(-73.9300,40.8000)[0],EG=14,WG=24;
  const landAt=(x,zone)=>{if(Math.abs(x)>235)return null;
   if(zone==='n')return null;
   const lo=zeS(x)+EG,hi=zeS(x)+EG+132;return [lo,hi];};
  const isLand=(x,z)=>{if(Math.abs(x)>235)return 'none';
   const e=zeS(x),w=zwS(x);
   if(z>e+EG&&z<e+EG+132)return x<xBQ?'b':(x<xQB?'q':'x');
   if(z<w-WG&&z>w-WG-92)return 'n';
   return 'none';};
  for(let x=-235;x<=235;x+=2.8){const e=zeS(x),w=zwS(x);a.push([x,0,e+EG,.85]);a.push([x,0,w-WG,.85]);}
  for(const [ang,sp,zone] of [[.55,17,'b'],[.2,19,'q'],[.75,17,'x'],[.9,15,'n']]){
   const ca=Math.cos(ang),sa=Math.sin(ang);
   for(let u=-330;u<=330;u+=sp)for(let v=-330;v<=330;v+=4.2){
    for(const [px,pz] of [[u*ca-v*sa,u*sa+v*ca],[v*ca-u*sa,v*sa+u*ca]]){if(isLand(px,pz)===zone)a.push([px,0,pz,.42]);}
   }
  }
  // soft green fields in the neighbouring boroughs
  for(const [lon,lat,w,d] of [[-73.9230,40.7790,22,16],[-73.9520,40.7200,20,16],[-73.9740,40.6930,22,16]]){const c=mh(lon,lat);for(let u=0;u<=w;u+=4.4)for(let v=0;v<=d;v+=4.4)if(isLand(c[0]+u,c[1]+v)!=='none')a.push([c[0]+u,0,c[1]+v,.5]);}
 }
 const tag=(list,kind,fn)=>list.forEach(p=>{p[4]=kind;p[5]=0;p[6]=0;p[7]=0;fn&&fn(p);a.push(p);});
 {
  let s1=777;const r1=()=>{s1=(s1*1664525+1013904223)>>>0;return s1/4294967296;};
  // 1 / Housing: Astoria, Queens
  {const c=mh(-73.9200,40.7700);
   for(let gx=0;gx<3;gx++)for(let gz=0;gz<2;gz++){
    const hx=c[0]-34+gx*34,hz=c[1]+10+gz*28,ph=r1()*6.28,tmp=[];
    box(tmp,hx,hz,22,18,13,0,.4);box(tmp,hx+4,hz+3,14,12,7,13,.6);
    tag(tmp,1,p=>{p[5]=ph;p[6]=r1()*6.28;});
   }
   MH_LAB.push([c[0]+30,c[1]+30,'02  HOUSING AFFORDABILITY','l',44]);}
  // 2 / Net zero: Williamsburg, Brooklyn — a grove that sways, with wind passing over it
  {const c=mh(-73.9450,40.7140);
   for(let gx=0;gx<3;gx++)for(let gz=0;gz<2;gz++){
    const tmp=[];tree(tmp,c[0]-22+gx*22,c[1]+28+gz*18,24);
    const ph=r1()*6.28;tag(tmp,2,p=>{p[5]=ph+p[1]*.01;});
   }
   for(let l=0;l<6;l++)for(let i=0;i<18;i++){
    const p=[0,56+l*6,0,1.1];tag([p],5,q=>{q[5]=i/18;q[6]=c[0]-44+(l%2)*12;q[7]=c[1]+24+l*6;});
   }
   MH_LAB.push([c[0]-6,c[1]+78,'03  NET ZERO CITIES','l',8]);}
  // 3 / Public-private: Hudson Yards, a public hall, a private tower, and flows of exchange between them
  {const c=mh(-74.0020,40.7540),zw=zwS(c[0]);
   const hx=c[0]-40,hz=zwS(hx)+10,tx=c[0]+2,tz=zwS(tx)+8;
   {const tmp=[];box(tmp,hx,hz,36,20,16,0,.9);for(let k=0;k<=36;k+=7)for(let y=0;y<=16;y+=4)tmp.push([hx+k,y,hz+20,1.2]);tag(tmp,0);}
   {const tmp=[];box(tmp,tx,tz,18,18,62,0,1.1);tag(tmp,0);}
   MH_PPP.x1=hx+18;MH_PPP.z1=hz+10;MH_PPP.y1=18;MH_PPP.x2=tx+9;MH_PPP.z2=tz+9;MH_PPP.y2=40;
   for(let i=0;i<260;i++){const p=[MH_PPP.x1,MH_PPP.y1,MH_PPP.z1,1.3];tag([p],3,q=>{q[5]=r1();q[6]=i%2?1:-1;q[7]=(r1()-.5)*8;});}
   MH_LAB.push([tx+8,tz-6,'04  PUBLIC PRIVATE DEVELOPMENT','l',100]);}
  // 4 / Culture: Harlem, a pavilion whose waves spread over the neighbourhood
  {const c=mh(-73.9450,40.8100);MH_CUL.x=c[0];MH_CUL.z=c[1];
   {const tmp=[];for(let u=0;u<=18;u++)for(let v=0;v<=6;v++){const th=u/18*Math.PI*2,ph2=v/6*Math.PI/2;tmp.push([c[0]+Math.cos(th)*Math.cos(ph2)*12,Math.sin(ph2)*12,c[1]+Math.sin(th)*Math.cos(ph2)*12,1.5]);}tag(tmp,0);}
   for(let k=0;k<5;k++)for(let i=0;i<110;i++){const p=[c[0],0,c[1],1.2];tag([p],4,q=>{q[5]=k/5;q[6]=i/110*Math.PI*2+r1()*.05;});}
   MH_LAB.push([c[0]+4,c[1]-4,'01  CULTURE-LED DEVELOPMENT','r',70]);}
 }
 scenes.push(a);
 // 01: a neighborhood of homes, with legible streets and courtyards.
 a=[];ground(a);for(let z=-90;z<=80;z+=62)for(let x=-110;x<=90;x+=65){const h=45+Math.round(random()*6)*12;box(a,x,z,40,38,h);box(a,x+6,z+6,28,26,7,h);}
 scenes.push(a);
 // 02: terraced buildings and a green corridor; trees are drawn as point canopies.
 a=[];ground(a);for(const [x,z,h] of [[-110,-70,55],[-40,-80,105],[45,-72,145],[-110,45,85],[45,45,100]]){
  box(a,x,z,48,43,h);box(a,x+8,z+5,32,30,22,h);tree(a,x+19,z+17,h+34);
 }
 for(let z=-75;z<=100;z+=40)tree(a,10,z,27);for(let x=-105;x<130;x+=45)tree(a,x,108,23);scenes.push(a);
 // 03: two complementary blocks connect through a shared civic platform and bridge.
 a=[];ground(a);box(a,-125,-62,70,100,105);box(a,55,-62,70,100,145);box(a,-125,-62,250,104,8,4);box(a,-55,-28,110,27,12,62);
 for(let z=-26;z<4;z+=5)for(let x=-55;x<56;x+=5)a.push([x,83,z,1.15]);
 for(let x=-100;x<=105;x+=40)tree(a,x,90,27);box(a,-33,50,66,50,6);scenes.push(a);
 // 04: a cultural hall, a circular gathering place, and an open public square.
 a=[];ground(a);box(a,-115,-90,150,78,60);box(a,-120,-95,160,88,10,60);
 for(let x=-100;x<=12;x+=22)box(a,x,-10,7,9,60);
 for(let y=0;y<60;y+=5)for(let th=0;th<Math.PI*2;th+=.09)a.push([70+Math.cos(th)*44,y,42+Math.sin(th)*44,.6+Math.sin(th)*.2]);
 for(let r=0;r<48;r+=5)for(let th=0;th<Math.PI*2;th+=.14)a.push([70+Math.cos(th)*r,61+(48-r)*.25,42+Math.sin(th)*r,1.2]);
 for(let x=-112;x<25;x+=30)tree(a,x,94,24);scenes.push(a);
 const count=6200;
 // scenes are drawn in the order housing, net zero, public-private, culture; the chapters run alphabetically (culture first)
 const targets=[0,4,1,2,3].map(i=>scenes[i]).map(points=>{points.sort((p,q)=>p[2]-q[2]||p[0]-q[0]||p[1]-q[1]);return Array.from({length:count},(_,i)=>points[Math.floor(i*points.length/count)]);});
 const phases=Array.from({length:count},()=>random()*Math.PI*2);
 let paused=reduced.matches||document.documentElement.classList.contains('dbg-no-fx'),desired=0,position=0,raf=0,last=0,time=0,active=-1,visible=true,pointer=0,ptx=0,pty=0,ptrX=0,ptrY=0,tiltOn=false,mxT=-9999,myT=-9999,mx=-9999,my=-9999,inf=0,hovering=false;
 const contexts=new Map();
 function init(c){const ctx=c.getContext('2d');if(!ctx)return null;const state={c,ctx,w:0,h:0,visible:false,arrival:0};contexts.set(c,state);return state;}
 const main=init(canvas);if(!main)return;canvas.dataset.ready='true';
 const small=steps.slice(1).map((step,i)=>{const c=document.createElement('canvas');c.className='mobile-scene';c.setAttribute('aria-hidden','true');c.dataset.scene=String(i+1);step.append(c);const state=init(c);state.scene=i+1;return state;});
 function size(s){const r=s.c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;s.w=r.width;s.h=r.height;s.c.width=Math.round(s.w*dpr);s.c.height=Math.round(s.h*dpr);s.ctx.setTransform(dpr,0,0,dpr,0,0);}
 function draw(s,p,t=0){
  if(!s.w||!s.h)return;
  const ctx=s.ctx,w=s.w,h=s.h;ctx.clearRect(0,0,w,h);
  const from=Math.min(4,Math.floor(p)),to=Math.min(4,from+1),blend=smooth(p-from),arc=Math.sin(blend*Math.PI),live=from===0?1-blend:0;
  const isMain=s===main,hov=isMain&&inf>.01,f0=isMain?1-smooth(clamp(p)):0;
  // f0=1: the Manhattan map, turned so the island leans up and to the right like on a map; f0=0: the usual 3D city view
  const rotate=lerp(-.56+Math.sin(t*.00013)*.025+(isMain||tiltOn?ptrX*.24:0),-.8+Math.sin(t*.00013)*.02+(isMain||tiltOn?ptrX*.16:0),f0),cs=Math.cos(rotate),sn=Math.sin(rotate);
  const scale=lerp(Math.min(w/445,h/345),Math.min(w/480,h/370),f0),tilt=lerp(.43+(isMain||tiltOn?ptrY*.09:0),.58+(isMain||tiltOn?ptrY*.05:0),f0),yk=lerp(.88,.85,f0),cy=lerp(.69,.53,f0),zc=lerp(0,38,f0),cxs=lerp(0,-24,f0);
  const R=Math.max(55,Math.min(w,h)*.17),R2=R*R;
  function project(x,y,z){z-=zc;return [w*.5+cxs+(x*cs-z*sn)*scale,h*cy+((x*sn+z*cs)*tilt-y*yk)*scale];}
  // A restrained ground plane helps reveal the architectural transformation.
  ctx.strokeStyle='#9774c3';ctx.globalAlpha=.18*(1-f0);ctx.lineWidth=.6;ctx.beginPath();
  for(let g=-145;g<=145;g+=48){let p1=project(g,-5,-130),p2=project(g,-5,130);ctx.moveTo(...p1);ctx.lineTo(...p2);p1=project(-145,-5,g*.85);p2=project(145,-5,g*.85);ctx.moveTo(...p1);ctx.lineTo(...p2);}ctx.stroke();
  for(let i=0;i<count;i++){
   const A=targets[from][i],B=targets[to][i],ph=phases[i];
   let x=lerp(A[0],B[0],blend)+Math.sin(ph+blend*4)*arc*23;
   let y=lerp(A[1],B[1],blend)+arc*(18+Math.sin(ph)*12)+Math.sin(t*.0007+ph)*.55;
   let z=lerp(A[2],B[2],blend)+Math.cos(ph+blend*3)*arc*20,alm=1;
   if(live>0&&A[4]){
    const k=A[4],fp=A[5];
    if(k===1){y+=2.4*Math.sin(t*.0012+fp)*live;alm=1-live*(.32-.32*Math.sin(t*.0016+A[6]));}
    else if(k===2){x+=Math.sin(t*.0011+fp)*A[1]*.045*live;z+=Math.cos(t*.0008+fp)*A[1]*.035*live;}
    else if(k===3){const u0=(t*.00022+fp)%1,u=A[6]<0?1-u0:u0;
     x=lerp(x,MH_PPP.x1+(MH_PPP.x2-MH_PPP.x1)*u,live);z=lerp(z,MH_PPP.z1+(MH_PPP.z2-MH_PPP.z1)*u+A[7],live);y=lerp(y,MH_PPP.y1+(MH_PPP.y2-MH_PPP.y1)*u+30*Math.sin(Math.PI*u),live);alm=1-live*(.9-.9*Math.pow(Math.sin(Math.PI*u0),.7));}
    else if(k===4){const f=(t*.00018+fp)%1,r=14+f*62;
     x=lerp(x,MH_CUL.x+Math.cos(A[6])*r,live);z=lerp(z,MH_CUL.z+Math.sin(A[6])*r*.9,live);y=lerp(y,0,live);alm=1-live*(1-Math.pow(1-f,1.4)*Math.min(1,f*6)*.95);}
    else if(k===5){const f=(t*.00013+fp)%1;
     x=lerp(x,A[6]+f*90,live);z=lerp(z,A[7],live);y+=Math.sin(f*12.6)*4*live;alm=1-live*(1-Math.pow(Math.sin(Math.PI*f),.8)*.9);}
   }
   const shade=lerp(A[3],B[3],blend),pp=project(x,y,z);let px=pp[0],py=pp[1],r=Math.max(.65,scale*(shade>1?1.32:1.03)),boost=0;
   if(hov){const dx=px-mx,dy=py-my,d2=dx*dx+dy*dy;if(d2<R2){const d=Math.sqrt(d2)||1,f=1-d/R;px+=dx/d*f*f*6*inf;py+=dy/d*f*f*6*inf;boost=f*inf;}}
   if(boost>.02)r*=1+boost*.45;
   ctx.globalAlpha=clamp((.22+shade*.62)*alm,.04,.97);ctx.fillStyle=shade>1?'#ffffff':shade>.65?'#e4d6f4':'#9774c3';ctx.fillRect(px,py,r,r);
  }
  if(live>.05&&s===main&&w>=480){   // labels need room: skipped on narrow (phone) canvases
   ctx.font='600 10px "DM Sans",Arial,sans-serif';ctx.textBaseline='middle';
   for(const [lx,lz,txt,al,lh] of MH_LAB){
    const base=project(lx,0,lz),top=project(lx,lh,lz);
    ctx.globalAlpha=.4*live;ctx.strokeStyle='#e4d6f4';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(base[0],base[1]);ctx.lineTo(top[0],top[1]);ctx.stroke();
    ctx.globalAlpha=.95*live;ctx.fillStyle='#f1e8fb';ctx.textAlign=al==='r'?'right':'left';ctx.fillText(txt,top[0]+(al==='r'?-5:5),top[1]-8);
   }
   ctx.textAlign='left';ctx.globalAlpha=.55*live;ctx.fillStyle='#d9c8ee';ctx.font='600 9px "DM Sans",Arial,sans-serif';
  }
  ctx.globalAlpha=1;
  s.c.dataset.ready='true';s.c.dataset.progress=p.toFixed(3);
 }
 function setActive(n){if(active===n)return;active=n;label.textContent=names[n];stops.forEach((link,i)=>{if(i===n)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});canvas.dataset.scene=String(n);}
 function scrollPosition(){
  const h=root.querySelector('.ul-header').getBoundingClientRect().height,anchor=h+(innerHeight-h)*.43;
  const centers=steps.map(s=>{const r=s.getBoundingClientRect();return r.top+r.height*.43;});
  let p=0;for(let i=0;i<centers.length-1;i++){if(anchor>=centers[i])p=i+clamp((anchor-centers[i])/(centers[i+1]-centers[i]));}
  // Stacked cards (desktop): progress follows when each sticky card reaches its pinned position.
  if(steps.length>2){
   const cards=steps.slice(1),cs=getComputedStyle(cards[0]),top1=parseFloat(cs.top)||0,top2=parseFloat(getComputedStyle(cards[1]).top)||top1;
   const gap=root.querySelector('.story-gap'),pitch=cards[0].offsetHeight+(parseFloat(cs.marginBottom)||0)+(gap?gap.offsetHeight:0)-(top2-top1);
   const introH=steps[0].offsetHeight,s1=steps[0].getBoundingClientRect().bottom+scrollY-top1;
   p=scrollY>=s1?1+(scrollY-s1)/pitch:clamp((scrollY-(s1-introH*.7))/(introH*.7));
   p=clamp(p,0,cards.length);
   cards.forEach((c,i)=>c.style.setProperty('--d',clamp(p-(i+1),0,3).toFixed(3)));
  }
  // Hold each completed scene while its chapter is being read; morph between chapters.
  const whole=Math.floor(p),fraction=p-whole;
  desired=clamp(whole+clamp((fraction-.25)/.5),0,4);setActive(Math.round(desired));
  if(paused){position=Math.round(desired);draw(main,position);small.forEach(s=>{if(mobile.matches)draw(s,s.scene);});}else start();
 }
 function tick(now){raf=0;if(paused||document.hidden)return;if(now-last>=10){const delta=Math.min(64,now-last||16);last=now;time+=delta;const ke=ms=>1-Math.exp(-delta/ms);tiltOn=!hovering&&!!window.ULTilt&&ULTilt.active;if(tiltOn){ptx=ULTilt.x*2.2;pty=-ULTilt.y*1.7;}/* phone tilt stands in for the mouse (motion.js): it drives every scene and swings wider than the mouse, the screen being small */position+=(desired-position)*ke(120);ptrX+=(ptx-ptrX)*ke(220);ptrY+=(pty-ptrY)*ke(220);inf+=((hovering?1:0)-inf)*ke(160);mx+=(mxT-mx)*ke(70);my+=(myT-my)*ke(70);
   if(visible)draw(main,position,time);
   if(mobile.matches)small.forEach(s=>{if(s.visible){s.arrival=Math.min(1,s.arrival+.025);draw(s,s.scene-1+smooth(s.arrival),time);}});
  }if(visible||small.some(s=>mobile.matches&&s.visible))raf=requestAnimationFrame(tick);
 }
 function start(){if(!paused&&!document.hidden&&!raf&&(visible||small.some(s=>mobile.matches&&s.visible)))raf=requestAnimationFrame(tick);}
 function syncMotion(){canvas.dataset.motion=paused?'paused':'playing';if(paused){cancelAnimationFrame(raf);raf=0;position=Math.round(desired);draw(main,position);small.forEach(s=>draw(s,s.scene));}else start();}
 reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();});
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{const s=contexts.get(e.target);if(s===main)visible=e.isIntersecting;else if(s){s.visible=e.isIntersecting;if(!e.isIntersecting)s.arrival=0;}start();}),{threshold:.02});
 contexts.forEach(s=>observer.observe(s.c));
 new ResizeObserver(()=>{contexts.forEach(s=>{size(s);draw(s,s===main?position:s.scene);});scrollPosition();}).observe(root.querySelector('.story-layout'));
 canvas.addEventListener('pointerenter',e=>{if(paused||e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();mx=mxT=e.clientX-r.left;my=myT=e.clientY-r.top;hovering=true;});
 canvas.addEventListener('pointermove',e=>{if(paused||e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();mxT=e.clientX-r.left;myT=e.clientY-r.top;ptx=clamp(mxT/r.width,0,1)*2-1;pty=clamp(myT/r.height,0,1)*2-1;hovering=true;});
 canvas.addEventListener('pointerleave',()=>{ptx=0;pty=0;hovering=false;});
 addEventListener('scroll',scrollPosition,{passive:true});addEventListener('resize',scrollPosition,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else start();});
 contexts.forEach(s=>{size(s);draw(s,s===main?0:s.scene);});scrollPosition();syncMotion();
})();

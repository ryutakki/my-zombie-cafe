const fs=require('fs');
exports.loadObj=function(file){
  const V=[],G=[];let cur=null;
  for(const l of fs.readFileSync(file,'utf8').split('\n')){
    if(l.startsWith('v ')){V.push(l.trim().split(/\s+/).slice(1,4).map(Number));}
    else if(l.startsWith('g ')||l.startsWith('o ')){cur={name:l.slice(2).trim(),mtl:'',faces:[]};G.push(cur);}
    else if(l.startsWith('usemtl')){if(!cur){cur={name:'x',mtl:'',faces:[]};G.push(cur);}cur.mtl=l.slice(7).trim();}
    else if(l.startsWith('f ')){if(!cur){cur={name:'x',mtl:'',faces:[]};G.push(cur);}
      const idx=l.trim().split(/\s+/).slice(1).map(t=>{let i=parseInt(t);return i<0?V.length+i:i-1;});
      for(let i=1;i+1<idx.length;i++)cur.faces.push([idx[0],idx[i],idx[i+1]]);}
  }
  return {V,G};
};
// tris: [{p:[[x,y,z]x3], col:[r,g,b]}] ; y-up. returns {data,w,h} RGBA (supersampled)
exports.render=function(tris,o){
  const az=(o.az||0)*Math.PI/180, el=(o.el||30)*Math.PI/180, W=o.W, H=o.H;
  const ca=Math.cos(az),sa=Math.sin(az),ce=Math.cos(el),se=Math.sin(el);
  const L=o.light||[-0.5,0.8,0.6]; const ln=Math.hypot(...L); const Ld=L.map(x=>x/ln);
  // view transform: rotate around Y then tilt about X
  const tf=p=>{const x=p[0]*ca-p[2]*sa, z=p[0]*sa+p[2]*ca, y=p[1];
    return [x, y*ce - z*se, y*se + z*ce]; }; // sx, sy(up), depth(+ away?) 
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  const T=tris.map(t=>{const q=t.p.map(tf);for(const v of q){mnx=Math.min(mnx,v[0]);mxx=Math.max(mxx,v[0]);mny=Math.min(mny,v[1]);mxy=Math.max(mxy,v[1]);}return {q,t};});
  const pad=o.pad||4; const sc=o.sc||Math.min((W-2*pad)/(mxx-mnx),(H-2*pad)/(mxy-mny));
  const ox=(W-(mxx-mnx)*sc)/2-mnx*sc, oy=H-pad+mny*sc; // bottom aligned
  const img=new Uint8ClampedArray(W*H*4), zb=new Float32Array(W*H).fill(-1e9);
  for(const {q,t} of T){
    const P=q.map(v=>[v[0]*sc+ox, oy-v[1]*sc, v[2]]);
    // normal in world space
    const a=t.p[0],b=t.p[1],c=t.p[2];
    let nx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    let nl=Math.hypot(nx,ny,nz)||1; nx/=nl;ny/=nl;nz/=nl;
    // two-sided: face toward camera
    const vn=tf([nx,ny,nz]); const vo=tf([0,0,0]);
    let n=[nx,ny,nz]; if(vn[2]<0) n=[-nx,-ny,-nz]; // depth axis: larger z = closer to camera (since tilt)
    const lam=Math.max(0,n[0]*Ld[0]+n[1]*Ld[1]+n[2]*Ld[2]);
    const lq=o.toon?Math.round(lam*o.toon)/o.toon:lam; const sh=(o.ambient??0.55)+(1-(o.ambient??0.55))*lq;
    const col=t.col.map(x=>Math.min(255,x*sh));
    const minx=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))), maxx=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0])));
    const miny=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))), maxy=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
    const d=(P[1][1]-P[2][1])*(P[0][0]-P[2][0])+(P[2][0]-P[1][0])*(P[0][1]-P[2][1]); if(Math.abs(d)<1e-9)continue;
    for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
      const px=x+.5,py=y+.5;
      const w0=((P[1][1]-P[2][1])*(px-P[2][0])+(P[2][0]-P[1][0])*(py-P[2][1]))/d;
      const w1=((P[2][1]-P[0][1])*(px-P[2][0])+(P[0][0]-P[2][0])*(py-P[2][1]))/d;
      const w2=1-w0-w1; if(w0<-1e-4||w1<-1e-4||w2<-1e-4)continue;
      const z=w0*P[0][2]+w1*P[1][2]+w2*P[2][2]; const i=y*W+x;
      if(z>zb[i]){zb[i]=z;img[i*4]=col[0];img[i*4+1]=col[1];img[i*4+2]=col[2];img[i*4+3]=255;}
    }
  }
  img.proj=p=>{const q=tf(p);return [q[0]*sc+ox, oy-q[1]*sc];};
  return img;
};

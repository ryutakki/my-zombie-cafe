const {loadObj}=require('./r3d');
// split faces of a group list into connected components by welded vertex position
exports.components=function(obj,groups){
  const key=v=>Math.round(v[0]*100)+','+Math.round(v[1]*100)+','+Math.round(v[2]*100);
  const map=new Map();const wid=obj.V.map(v=>{const k=key(v);if(!map.has(k))map.set(k,map.size);return map.get(k);});
  const par=Array.from({length:map.size},(_,i)=>i);const find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
  const F=[];for(const g of groups)for(const f of g.faces){F.push({f,g});const a=find(wid[f[0]]);for(let i=1;i<3;i++){const b=find(wid[f[i]]);if(a!==b)par[b]=a;}}
  const comp=new Map();for(const x of F){const r=find(wid[x.f[0]]);if(!comp.has(r))comp.set(r,{faces:[],g:x.g});comp.get(r).faces.push(x.f);}
  const out=[...comp.values()].map(c=>{let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const f of c.faces)for(const i of f)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],obj.V[i][k]);mx[k]=Math.max(mx[k],obj.V[i][k]);}c.mn=mn;c.mx=mx;return c;});
  return out;
};

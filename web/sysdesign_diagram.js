// Draws a walkthrough's architecture graph ({nodes:[{id,label,tech,kind}], edges:[{from,to,label,flow}]}) as an SVG.
// API: sdDiagram(graph) -> HTMLElement | null. Layered top-down layout: longest-path layers, dummy nodes for long edges,
// barycenter ordering, then x placement. Colors are theme tokens (--sdg-*) defined below.
window.sdDiagram=(()=>{
const NS="http://www.w3.org/2000/svg",FAMILY="Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const f1=n=>Math.round(n*10)/10;
// kind -> [legend name, color token, shape]
const KINDS={
  client:["Client","gray","pill"],edge:["Edge / gateway","purple","rect"],service:["Service","blue","rect"],worker:["Worker","teal","chamfer"],
  cache:["Cache","amber","rect"],database:["Database","green","db"],queue:["Queue / stream","orange","queue"],storage:["Object store","green","stack"],external:["External","gray","dashed"]
};
const FLOWS={write:["Write path"],read:["Read path"],async:["Async / events"],control:["Control"]};
const PAD=24,GAPY=84,MINW=108,MAXW=176,LH=16;
const mctx=document.createElement("canvas").getContext("2d");
const measure=(s,fs,w=500)=>{mctx.font=`${w} ${fs}px ${FAMILY}`;return mctx.measureText(s).width};
let uidN=0;

const STYLE=`
:root{--sdg-gray-f:#eef0f4;--sdg-gray-s:#8f96a3;--sdg-purple-f:#ede7fe;--sdg-purple-s:#7655d6;--sdg-blue-f:#e3edff;--sdg-blue-s:#3b6fd8;--sdg-teal-f:#d9f3f1;--sdg-teal-s:#1f8f88;
--sdg-amber-f:#fdf2cf;--sdg-amber-s:#b88400;--sdg-green-f:#dcf5e4;--sdg-green-s:#2a9455;--sdg-orange-f:#ffe8d4;--sdg-orange-s:#d2691e;
--sdg-write:#3b6fd8;--sdg-read:#2a9455;--sdg-async:#d2691e;--sdg-control:#8f96a3;--sdg-shadow:rgba(16,24,40,.10)}
:root[data-theme="dark"]{--sdg-gray-f:#1e232d;--sdg-gray-s:#7c8496;--sdg-purple-f:#221c3b;--sdg-purple-s:#a28ef6;--sdg-blue-f:#15233e;--sdg-blue-s:#6b9bf2;--sdg-teal-f:#10292a;--sdg-teal-s:#4cc4bb;
--sdg-amber-f:#2c2512;--sdg-amber-s:#deb043;--sdg-green-f:#122a1d;--sdg-green-s:#4cc47c;--sdg-orange-f:#33200f;--sdg-orange-s:#f0954f;
--sdg-write:#6b9bf2;--sdg-read:#4cc47c;--sdg-async:#f0954f;--sdg-control:#7c8496;--sdg-shadow:rgba(0,0,0,.55)}
.sdg{margin:10px 0 14px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);padding:14px 12px 10px}
.sdg .sdg-scroll{overflow-x:auto}
.sdg svg{display:block;margin:0 auto;height:auto;font-family:${FAMILY}}
.sdg .sdg-n,.sdg .sdg-e{transition:opacity .15s}.sdg .sdg-n{cursor:default}
.sdg.hl .sdg-n:not(.on),.sdg.hl .sdg-e:not(.on){opacity:.16}
.sdg .sdg-key{display:flex;flex-wrap:wrap;gap:6px 16px;margin:10px 4px 0;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
.sdg .sdg-key span{display:inline-flex;align-items:center;gap:6px}.sdg .sdg-key svg{display:inline-block;margin:0}
.sdg .sdg-hint{margin:6px 4px 0;font-size:11.5px;color:var(--muted)}
@media (prefers-reduced-motion:reduce){.sdg .sdg-n,.sdg .sdg-e{transition:none}}`;
let styled=false;

function wrap(text,fs,max){
  const out=[];let cur="";
  String(text).split(/\s+/).filter(Boolean).forEach(w=>{
    const t=cur?cur+" "+w:w;
    if(cur&&measure(t,fs,600)>max){out.push(cur);cur=w}else cur=t;
  });
  if(cur)out.push(cur);
  return out.slice(0,3);
}

// ---------- layout ----------
function layout(g){
  const nodes=g.nodes.map((n,i)=>{
    const k=KINDS[n.kind]?n.kind:"service",lines=wrap(n.label,13,MAXW-28),tech=(n.tech||"").trim();
    const tw=Math.max(...lines.map(l=>measure(l,13,600)),tech?measure(tech,11):0);
    const w=Math.min(MAXW,Math.max(MINW,Math.ceil(tw+30))),h=Math.max(46,22+lines.length*LH+(tech?15:0))+(k==="database"?10:0);
    return {id:n.id,i,kind:k,lines,tech,w,h,layer:0,x:0,y:0,ord:0,real:true,up:[],down:[]};
  });
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const edges=g.edges.filter(e=>byId.has(e.from)&&byId.has(e.to)&&e.from!==e.to).map((e,i)=>({i,a:byId.get(e.from),b:byId.get(e.to),label:(e.label||"").trim(),flow:FLOWS[e.flow]?e.flow:"write"}));

  // Layers: drop back edges found by DFS, then longest path from the sources.
  const out=new Map(nodes.map(n=>[n,[]])),inc=new Map(nodes.map(n=>[n,0]));
  edges.forEach(e=>{out.get(e.a).push(e);inc.set(e.b,inc.get(e.b)+1)});
  const state=new Map(),back=new Set();
  const dfs=n=>{state.set(n,1);out.get(n).forEach(e=>{const s=state.get(e.b);if(s===1)back.add(e);else if(!s)dfs(e.b)});state.set(n,2)};
  [...nodes.filter(n=>!inc.get(n)),...nodes].forEach(n=>{if(!state.get(n))dfs(n)});
  const fwd=edges.filter(e=>!back.has(e)),lin=new Map(nodes.map(n=>[n,[]])),lout=new Map(nodes.map(n=>[n,[]]));
  fwd.forEach(e=>{lin.get(e.b).push(e.a);lout.get(e.a).push(e.b)});
  const seen=new Set(),depth=n=>{
    if(seen.has(n))return n.layer;seen.add(n);
    n.layer=lin.get(n).reduce((m,p)=>Math.max(m,depth(p)+1),0);return n.layer;
  };
  nodes.forEach(depth);
  // A source with no incoming edge (e.g. an ID allocator) sits just above its first consumer, not at the very top.
  nodes.filter(n=>!lin.get(n).length&&lout.get(n).length&&n.kind!=="client").forEach(n=>{n.layer=Math.min(...lout.get(n).map(s=>s.layer))-1});
  const minL=Math.min(...nodes.map(n=>n.layer));nodes.forEach(n=>n.layer-=minL);

  // Chains (with dummy nodes on layers an edge skips), oriented top to bottom.
  const items=[...nodes];
  edges.forEach(e=>{
    const rev=back.has(e)||e.a.layer>e.b.layer,top=rev?e.b:e.a,bot=rev?e.a:e.b,chain=[top];
    for(let l=top.layer+1;l<bot.layer;l++){const d={dummy:true,real:false,w:0,h:0,layer:l,x:0,y:0,ord:0,up:[],down:[]};items.push(d);chain.push(d)}
    chain.push(bot);e.chain=chain;e.rev=rev;
    for(let k=1;k<chain.length;k++){chain[k-1].down.push(chain[k]);chain[k].up.push(chain[k-1])}
  });
  const nl=Math.max(...items.map(n=>n.layer))+1,rows=Array.from({length:nl},(_,l)=>items.filter(n=>n.layer===l));
  const place=()=>rows.forEach(r=>r.forEach((n,i)=>n.ord=i));
  place();
  for(let it=0;it<6;it++){
    const down=it%2===0;
    (down?rows.slice(1):rows.slice(0,-1).reverse()).forEach(r=>{
      const bary=n=>{const nb=down?n.up:n.down;return nb.length?nb.reduce((s,m)=>s+m.ord,0)/nb.length:n.ord};
      const key=new Map(r.map(n=>[n,bary(n)]));
      r.sort((p,q)=>key.get(p)-key.get(q)||p.ord-q.ord);
      r.forEach((n,i)=>n.ord=i);
    });
  }
  // x placement: pull each item toward the mean of its neighbours, keeping the row spaced (average of a push-right and a push-left pass).
  const sep=(p,q)=>(p.w+q.w)/2+(p.real&&q.real?30:14);
  const settle=(r,des)=>{
    const f=[],b=[];
    r.forEach((n,i)=>{f[i]=Math.max(des[i],i?f[i-1]+sep(r[i-1],n):-Infinity)});
    for(let i=r.length-1;i>=0;i--)b[i]=Math.min(des[i],i<r.length-1?b[i+1]-sep(r[i],r[i+1]):Infinity);
    r.forEach((n,i)=>n.x=(f[i]+b[i])/2);
  };
  rows.forEach(r=>{let x=0;r.forEach((n,i)=>{if(i)x+=sep(r[i-1],n);n.x=x});const m=(r[0].x+r[r.length-1].x)/2;r.forEach(n=>n.x-=m)});
  for(let it=0;it<10;it++){
    const down=it%2===0;
    (down?rows.slice(1):rows.slice(0,-1).reverse()).forEach(r=>{
      settle(r,r.map(n=>{const nb=down?n.up:n.down;return nb.length?nb.reduce((s,m)=>s+m.x,0)/nb.length:n.x}));
    });
  }
  let x0=Infinity,x1=-Infinity;
  items.forEach(n=>{x0=Math.min(x0,n.x-n.w/2);x1=Math.max(x1,n.x+n.w/2)});
  items.forEach(n=>n.x+=PAD-x0);
  let y=PAD;
  rows.forEach(r=>{const h=Math.max(...r.map(n=>n.h),24);r.forEach(n=>n.y=y+h/2);r.rowH=h;y+=h+GAPY});
  return {nodes,edges,W:x1-x0+2*PAD,H:y-GAPY+PAD,rows};
}

// ---------- drawing ----------
const tok=(c,k)=>`var(--sdg-${c}-${k})`;
function nodeSvg(n,fill){
  const [,c,shape]=KINDS[n.kind],{x,y,w,h}=n,l=x-w/2,t=y-h/2;
  const st=`style="fill:${tok(c,"f")};stroke:${tok(c,"s")};stroke-width:1.5${shape==="dashed"?";stroke-dasharray:5 4":""}"`;
  let g="";
  if(shape==="db"){const ry=Math.min(11,h/4);g=`<path d="M${l},${t+ry}v${h-2*ry}a${w/2},${ry} 0 0 0 ${w},0v${-(h-2*ry)}" ${st}/><ellipse cx="${x}" cy="${t+ry}" rx="${w/2}" ry="${ry}" ${st}/>`}
  else if(shape==="pill")g=`<rect x="${l}" y="${t}" width="${w}" height="${h}" rx="${h/2}" ${st}/>`;
  else if(shape==="chamfer"){const c2=11;g=`<polygon points="${l+c2},${t} ${l+w-c2},${t} ${l+w},${t+c2} ${l+w},${t+h-c2} ${l+w-c2},${t+h} ${l+c2},${t+h} ${l},${t+h-c2} ${l},${t+c2}" stroke-linejoin="round" ${st}/>`}
  else if(shape==="queue"){
    g=`<rect x="${l}" y="${t}" width="${w}" height="${h}" rx="9" ${st}/>`+[l+14,l+w-14].map(vx=>`<path d="M${vx},${t+6}V${t+h-6}" style="stroke:${tok(c,"s")};stroke-width:1.5;opacity:.55"/>`).join("");
  }else if(shape==="stack")g=`<rect x="${l+5}" y="${t-5}" width="${w}" height="${h}" rx="9" ${st} opacity=".6"/><rect x="${l}" y="${t}" width="${w}" height="${h}" rx="9" ${st}/>`;
  else g=`<rect x="${l}" y="${t}" width="${w}" height="${h}" rx="10" ${st}/>`;
  // Text block, centred; a database's cylinder lid pushes it down a little.
  const nl=n.lines.length,blockH=nl*LH+(n.tech?15:0),lid=shape==="db"?5:0,top=y-blockH/2+lid;
  let tx=n.lines.map((s,i)=>`<text x="${x}" y="${f1(top+i*LH+LH/2)}" text-anchor="middle" dominant-baseline="central" style="font:600 13px ${FAMILY};fill:var(--fg)">${esc(s)}</text>`).join("");
  if(n.tech)tx+=`<text x="${x}" y="${f1(top+nl*LH+8)}" text-anchor="middle" dominant-baseline="central" style="font:400 11px ${FAMILY};fill:var(--muted)">${esc(n.tech)}</text>`;
  return `<g filter="url(#${fill})">${g}</g>${tx}`;
}
// Spread the edges that meet one side of a node along that side.
function attach(L){
  const side=(n,list,key)=>{
    list.sort((p,q)=>p.o.x-q.o.x||p.e.i-q.e.i);
    const span=Math.max(0,n.w-36);
    list.forEach((s,k)=>{s.e.pts[s.at]=[list.length===1?n.x:n.x-span/2+span*k/(list.length-1),key>0?n.y+n.h/2:n.y-n.h/2]});
  };
  L.edges.forEach(e=>{e.pts=e.chain.map(n=>[n.x,n.y])});
  const bottom=new Map(),topS=new Map();
  L.edges.forEach(e=>{
    const c=e.chain,last=c.length-1;
    (bottom.get(c[0])||bottom.set(c[0],[]).get(c[0])).push({e,at:0,o:c[1]});
    (topS.get(c[last])||topS.set(c[last],[]).get(c[last])).push({e,at:last,o:c[last-1]});
  });
  bottom.forEach((l,n)=>side(n,l,1));topS.forEach((l,n)=>side(n,l,-1));
}
const seg=(p,q)=>{const m=(q[1]-p[1])/2;return `C${f1(p[0])},${f1(p[1]+m)} ${f1(q[0])},${f1(q[1]-m)} ${f1(q[0])},${f1(q[1])}`};
const bez=(p,q,t)=>{const m=(q[1]-p[1])/2,y0=p[1],y1=p[1]+m,y2=q[1]-m,y3=q[1],u=1-t;
  return [u*u*u*p[0]+3*u*u*t*p[0]+3*u*t*t*q[0]+t*t*t*q[0],u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3]};
function edgeSvg(e,mk,pills,boxes){
  // Drawn in the arrow's own direction: a back edge's chain runs bottom-up.
  const P=e.rev?[...e.pts].reverse():e.pts,n=P.length;
  let d=`M${f1(P[0][0])},${f1(P[0][1])}`;
  for(let k=1;k<n;k++)d+=seg(P[k-1],P[k]);
  const col=`var(--sdg-${e.flow})`,dash=e.flow==="async"?"7 5":e.flow==="control"?"2 5":"none";
  let s=`<path d="${d}" style="fill:none;stroke:${col};stroke-width:1.9;stroke-linecap:round;stroke-dasharray:${dash}" marker-end="url(#${mk}-${e.flow})"/>`;
  if(e.label){
    // Label sits mid-curve on the middle segment; slide it along the curve until it clears other labels and nodes.
    const k=Math.floor((n-1)/2),p=P[k],q=P[k+1],w=measure(e.label,11.5)+16,h=20;
    let best=null,fewest=Infinity;
    for(const t of [.5,.42,.58,.34,.66,.26,.74,.18,.82]){
      const [cx,cy]=bez(p,q,t),r=[cx-w/2,cy-h/2,cx+w/2,cy+h/2];
      const hits=[...boxes,...pills].filter(b=>r[0]<b[2]+3&&r[2]>b[0]-3&&r[1]<b[3]+2&&r[3]>b[1]-2).length;
      if(hits<fewest){fewest=hits;best={cx,cy,r}}
      if(!hits)break;
    }
    pills.push(best.r);
    s+=`<rect x="${f1(best.cx-w/2)}" y="${f1(best.cy-h/2)}" width="${f1(w)}" height="${h}" rx="10" style="fill:var(--surface);stroke:${col};stroke-width:1"/>`+
      `<text x="${f1(best.cx)}" y="${f1(best.cy)}" text-anchor="middle" dominant-baseline="central" style="font:500 11.5px ${FAMILY};fill:var(--fg)">${esc(e.label)}</text>`;
  }
  return s;
}

function build(graph){
  const L=layout(graph);attach(L);
  const id="sdg"+(++uidN),sh=id+"s",mk=id+"m",pills=[],boxes=L.nodes.map(n=>[n.x-n.w/2,n.y-n.h/2,n.x+n.w/2,n.y+n.h/2]);
  const flows=[...new Set(L.edges.map(e=>e.flow))],kinds=[...new Set(L.nodes.map(n=>n.kind))];
  const defs=`<defs><filter id="${sh}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" style="flood-color:var(--sdg-shadow)"/></filter>`+
    Object.keys(FLOWS).map(f=>`<marker id="${mk}-${f}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M0.5,1L9,5L0.5,9z" style="fill:var(--sdg-${f});stroke:var(--sdg-${f});stroke-width:1;stroke-linejoin:round"/></marker>`).join("")+`</defs>`;
  // Node drawn first so edges and their labels stay legible on top of any overlap.
  const nodeG=L.nodes.map(n=>`<g class="sdg-n" data-id="${esc(n.id)}"><title>${esc(n.lines.join(" ")+" · "+KINDS[n.kind][0])}</title>${nodeSvg(n,sh)}</g>`).join("");
  const edgeG=L.edges.map(e=>`<g class="sdg-e" data-a="${esc(e.a.id)}" data-b="${esc(e.b.id)}">${edgeSvg(e,mk,pills,boxes)}</g>`).join("");
  const W=Math.ceil(L.W),H=Math.ceil(L.H);
  const svg=`<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Architecture diagram: ${esc(L.nodes.map(n=>n.lines.join(" ")).join(", "))}" style="width:100%;min-width:${Math.round(W*.7)}px;max-width:${W}px">${defs}${edgeG}${nodeG}</svg>`;
  const sw=(c,shape)=>`<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><rect x="1" y="1" width="14" height="10" rx="${shape==="pill"?5:3}" style="fill:${tok(c,"f")};stroke:${tok(c,"s")};stroke-width:1.4${shape==="dashed"?";stroke-dasharray:3 2":""}"/></svg>`;
  const ln=f=>`<svg width="26" height="10" viewBox="0 0 26 10" aria-hidden="true"><path d="M1,5H25" style="stroke:var(--sdg-${f});stroke-width:2;stroke-linecap:round;stroke-dasharray:${f==="async"?"6 4":f==="control"?"2 4":"none"}"/></svg>`;
  const key=`<div class="sdg-key">${flows.map(f=>`<span>${ln(f)}${FLOWS[f][0]}</span>`).join("")}${kinds.map(k=>`<span>${sw(KINDS[k][1],KINDS[k][2])}${KINDS[k][0]}</span>`).join("")}</div>`;
  const root=document.createElement("div");root.className="sdg";
  root.innerHTML=`<div class="sdg-scroll">${svg}</div>${key}<div class="sdg-hint">Arrows point the way requests and data move. Hover a component to trace its connections.</div>`;
  // Hover or focus a node to fade everything it isn't connected to.
  const nodeEls=[...root.querySelectorAll(".sdg-n")],edgeEls=[...root.querySelectorAll(".sdg-e")];
  const clear=()=>{root.classList.remove("hl");root.querySelectorAll(".on").forEach(e=>e.classList.remove("on"))};
  nodeEls.forEach(g=>{
    g.onmouseenter=()=>{
      const me=g.dataset.id,near=new Set([me]);
      edgeEls.forEach(e=>{if(e.dataset.a===me||e.dataset.b===me){e.classList.add("on");near.add(e.dataset.a);near.add(e.dataset.b)}});
      nodeEls.forEach(x=>x.classList.toggle("on",near.has(x.dataset.id)));root.classList.add("hl");
    };
    g.onmouseleave=clear;
  });
  return root;
}

return graph=>{
  if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length<2)return null;
  if(!styled){const s=document.createElement("style");s.textContent=STYLE;document.head.appendChild(s);styled=true}
  try{return build({nodes:graph.nodes,edges:graph.edges||[]})}catch(e){console.error("sdDiagram",e);return null}
};
})();

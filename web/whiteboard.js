// SVG whiteboard for System Design Prep. Boards are stored per problem id in localStorage.
// API: wb.open(id,title,{timer,notes,onClose}), wb.has(id), wb.preview(id), wb.board(id), wb.exportAll()
window.wb=(()=>{
const KEY="sysdesign-boards-v1",ROUTE_KEY="sysdesign-wb-route";
const rd=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){return {}}};
const wr=()=>{try{localStorage.setItem(KEY,JSON.stringify(boards))}catch(e){}};
let boards=rd();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const f1=n=>Math.round(n*10)/10;
// Colors are theme tokens (--wb-<name>-f fill, --wb-<name>-s stroke) defined in ensureDom.
const FILLS=["none","blue","green","yellow","red","purple"];
const SHAPES={rect:["Box","r"],db:["Database","d"],ell:["Ellipse","e"],text:["Text","t"]};
const ARROWS={arrow:["Arrow","a","one"],bi:["Two-way arrow","b","two"],line:["Line","l","none"]};
const DEF={rect:[140,70],db:[100,90],ell:[130,70],text:[120,30]};
const snap=v=>Math.round(v/10)*10;
const byId=(m,id)=>m.els.find(e=>e.id===id);
const isArrow=e=>e.t==="arrow";
const tinted=e=>e.c&&e.c!=="none"&&FILLS.includes(e.c);

// ---------- icons ----------
const I={
  select:'<path d="M5 3.5l6.5 16 2.3-6.7 6.7-2.3z"/>',
  rect:'<rect x="3.5" y="6" width="17" height="12" rx="3"/>',
  db:'<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>',
  ell:'<ellipse cx="12" cy="12" rx="8.5" ry="6"/>',
  text:'<path d="M5.5 7V5h13v2M12 5v14M9 19h6"/>',
  arrow:'<path d="M4 12h15M14 7l5 5-5 5"/>',
  bi:'<path d="M4 12h16M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5"/>',
  line:'<path d="M4.5 12h15"/>',
  straight:'<path d="M5 19L19 5"/>',
  elbow:'<path d="M5 19v-7h14V5"/>',
  trash:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  minus:'<path d="M6 12h12"/>',plus:'<path d="M12 6v12M6 12h12"/>',
  fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  more:'<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  close:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 014.8.9c0 1.7-2.4 2-2.4 3.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'
};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

// ---------- geometry ----------
const center=s=>[s.x+s.w/2,s.y+s.h/2];
function edge(s,tx,ty){
  const [cx,cy]=center(s),dx=tx-cx,dy=ty-cy;
  if(!dx&&!dy)return [cx,cy];
  const hw=s.w/2,hh=s.h/2;
  const t=s.t==="ell"?1/Math.hypot(dx/hw,dy/hh):Math.min(dx?hw/Math.abs(dx):Infinity,dy?hh/Math.abs(dy):Infinity);
  return t>=1?[cx,cy]:[cx+dx*t,cy+dy*t];
}
// The arrow's polyline: two points when straight, up to four when elbow-routed between box sides.
function route(m,a){
  const sa=a.a.s&&byId(m,a.a.s),sb=a.b.s&&byId(m,a.b.s);
  if(a.r!=="elbow"){
    const pa=sa?center(sa):[a.a.x,a.a.y],pb=sb?center(sb):[a.b.x,a.b.y];
    return [sa?edge(sa,pb[0],pb[1]):pa,sb?edge(sb,pa[0],pa[1]):pb];
  }
  const A=sa||{x:a.a.x,y:a.a.y,w:0,h:0},B=sb||{x:a.b.x,y:a.b.y,w:0,h:0};
  const [ax,ay]=center(A),[bx,by]=center(B);
  const gx=Math.max(B.x-(A.x+A.w),A.x-(B.x+B.w)),gy=Math.max(B.y-(A.y+A.h),A.y-(B.y+B.h));
  if(gx>=gy){
    const r=bx>=ax,p=[r?A.x+A.w:A.x,ay],q=[r?B.x:B.x+B.w,by];
    if(Math.abs(p[1]-q[1])<1)return [p,[q[0],p[1]]];
    const mx=(p[0]+q[0])/2;return [p,[mx,p[1]],[mx,q[1]],q];
  }
  const d=by>=ay,p=[ax,d?A.y+A.h:A.y],q=[bx,d?B.y:B.y+B.h];
  if(Math.abs(p[0]-q[0])<1)return [p,[p[0],q[1]]];
  const my=(p[1]+q[1])/2;return [p,[p[0],my],[q[0],my],q];
}
function ends(m,a){const r=route(m,a);return [r[0],r[r.length-1]]}
// Point halfway along a polyline, where the label sits.
function midpoint(pts){
  const seg=[];let tot=0;
  for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);tot+=l}
  let h=tot/2;
  for(let i=0;i<seg.length;i++){
    if(h<=seg[i]||i===seg.length-1){const t=seg[i]?Math.min(1,h/seg[i]):0,a=pts[i],b=pts[i+1];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
    h-=seg[i];
  }
  return pts[0];
}
const inside=(s,x,y)=>x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h;
const hitShape=(m,x,y,skip)=>{for(let i=m.els.length-1;i>=0;i--){const e=m.els[i];if(!isArrow(e)&&e.t!=="text"&&e.id!==skip&&inside(e,x,y))return e}return null};
function bbox(m){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const pt=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
  m.els.forEach(e=>{if(isArrow(e))route(m,e).forEach(p=>pt(p[0],p[1]));else{pt(e.x,e.y);pt(e.x+e.w,e.y+e.h)}});
  return x0>x1?null:[x0,y0,x1,y1];
}

// ---------- rendering ----------
const FAMILY="Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const LH=fs=>fs+3;
const mctx=document.createElement("canvas").getContext("2d");
const measure=(s,fs)=>{mctx.font=`${fs}px ${FAMILY}`;return mctx.measureText(s).width};
function txt(cx,cy,text,R,fs=14,weight=500){
  if(!text)return "";
  const lines=String(text).split("\n");
  return lines.map((l,i)=>`<text x="${f1(cx)}" y="${f1(cy+(i-(lines.length-1)/2)*LH(fs))}" text-anchor="middle" dominant-baseline="central" style="font:${weight} ${fs}px ${FAMILY};fill:${R("fg")};pointer-events:none">${esc(l)}</text>`).join("");
}
const dbLid=s=>Math.min(14,s.h/4);
const textY=s=>s.t==="db"?s.y+s.h/2+dbLid(s)/2:s.y+s.h/2;
function shapeSvg(s,R,sh){
  const {x,y,w,h}=s;
  if(s.t==="text")return `<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:transparent;stroke:none"/>`+txt(x+w/2,y+h/2,s.text,R);
  const t=tinted(s),st=`style="fill:${t?R(`wb-${s.c}-f`):R("wb-shape")};stroke:${t?R(`wb-${s.c}-s`):R("wb-stroke")};stroke-width:1.5"`;
  let geo="";
  if(s.t==="rect")geo=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(10,w/4,h/4)}" ${st}/>`;
  else if(s.t==="ell")geo=`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" ${st}/>`;
  else if(s.t==="db"){const ry=dbLid(s);geo=`<path d="M${x},${y+ry}v${h-2*ry}a${w/2},${ry} 0 0 0 ${w},0v${-(h-2*ry)}" ${st}/><ellipse cx="${x+w/2}" cy="${y+ry}" rx="${w/2}" ry="${ry}" ${st}/>`}
  return `<g filter="url(#${sh})">${geo}</g>`+txt(x+w/2,textY(s),s.text,R);
}
// Polyline with rounded corners.
function pathD(pts,rad){
  let d=`M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for(let i=1;i<pts.length-1;i++){
    const [px,py]=pts[i-1],[x,y]=pts[i],[nx,ny]=pts[i+1];
    const l1=Math.hypot(x-px,y-py),l2=Math.hypot(nx-x,ny-y),r=Math.min(rad,l1/2,l2/2);
    if(!r){d+=`L${f1(x)},${f1(y)}`;continue}
    d+=`L${f1(x-(x-px)/l1*r)},${f1(y-(y-py)/l1*r)}Q${f1(x)},${f1(y)} ${f1(x+(nx-x)/l2*r)},${f1(y+(ny-y)/l2*r)}`;
  }
  const z=pts[pts.length-1];return d+`L${f1(z[0])},${f1(z[1])}`;
}
// Pull one end of a polyline back by d along its last segment (so the line stops under the arrowhead).
function trim(pts,atEnd,d){
  const r=pts.map(p=>[...p]),i=atEnd?r.length-1:0,j=atEnd?i-1:1,[x,y]=r[i],[px,py]=r[j],l=Math.hypot(x-px,y-py);
  if(l>0){const t=Math.min(d,l)/l;r[i]=[x-(x-px)*t,y-(y-py)*t]}
  return r;
}
function head(x,y,ang,c){
  const p=(d,o)=>[x-Math.cos(ang)*d+Math.sin(ang)*o,y-Math.sin(ang)*d-Math.cos(ang)*o].map(f1).join(",");
  return `<polygon points="${f1(x)},${f1(y)} ${p(11,5)} ${p(11,-5)}" style="fill:${c};stroke:${c};stroke-width:1.5;stroke-linejoin:round"/>`;
}
function arrowSvg(m,a,R,o={}){
  const pts=route(m,a),n=pts.length,p=pts[0],q=pts[n-1],len=Math.hypot(q[0]-p[0],q[1]-p[1])+(n>2?1:0);
  const col=o.sel||o.hot?R("accent"):tinted(a)?R(`wb-${a.c}-s`):R("wb-arrow");
  const angEnd=Math.atan2(q[1]-pts[n-2][1],q[0]-pts[n-2][0]),angStart=Math.atan2(p[1]-pts[1][1],p[0]-pts[1][0]);
  let line=pts;
  if(a.dir!=="none")line=trim(line,true,9);
  if(a.dir==="two")line=trim(line,false,9);
  let s=`<path d="${pathD(pts,10)}" style="fill:none;stroke:transparent;stroke-width:16;stroke-linejoin:round"/>`;
  s+=`<path d="${pathD(line,10)}" style="fill:none;stroke:${col};stroke-width:${o.sel?2:1.75};stroke-linecap:round;stroke-linejoin:round;pointer-events:none"/>`;
  if(len>1){if(a.dir!=="none")s+=head(q[0],q[1],angEnd,col);if(a.dir==="two")s+=head(p[0],p[1],angStart,col)}
  if(a.text){
    const [cx,cy]=midpoint(pts),lines=String(a.text).split("\n"),fs=12.5;
    const w=Math.max(...lines.map(l=>measure(l,fs)))+18,h=lines.length*LH(fs)+8;
    s+=`<rect x="${f1(cx-w/2)}" y="${f1(cy-h/2)}" width="${f1(w)}" height="${f1(h)}" rx="${Math.min(h/2,11)}" style="fill:${R("wb-label")};stroke:${R("wb-label-line")};stroke-width:1"/>`+txt(cx,cy,a.text,R,fs,500);
  }
  return s;
}
function elements(m,R,o={}){
  const shapes=m.els.filter(e=>!isArrow(e)),arrows=m.els.filter(isArrow),sh=o.sh||"wbsh";
  const draw=e=>{
    const c=o.hide===e.id?{...e,text:""}:e;
    return `<g data-id="${e.id}"${o.move?' style="cursor:move"':""}>${isArrow(e)?arrowSvg(m,c,R,{sel:o.sel===e.id,hot:o.hot===e.id}):shapeSvg(c,R,sh)}</g>`;
  };
  return shapes.map(draw).join("")+arrows.map(draw).join("");
}
const shadowDef=(id,R)=>`<filter id="${id}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" style="flood-color:${R("wb-shadow")}"/></filter>`;
// Shape-hugging outline, used for hover and connection-target highlights.
function outline(e,p,st){
  if(e.t==="ell")return `<ellipse cx="${e.x+e.w/2}" cy="${e.y+e.h/2}" rx="${e.w/2+p}" ry="${e.h/2+p}" style="${st}"/>`;
  const r=(e.t==="rect"?Math.min(10,e.w/4,e.h/4):e.t==="db"?Math.min(e.w/2,12):4)+p;
  return `<rect x="${e.x-p}" y="${e.y-p}" width="${e.w+2*p}" height="${e.h+2*p}" rx="${r}" style="${st}"/>`;
}
const cssR=n=>`var(--${n})`;
function exportSvg(m){
  const cs=getComputedStyle(document.documentElement),R=n=>cs.getPropertyValue("--"+n).trim()||(n==="bg"||n==="wb-shape"||n==="wb-label"?"#fff":"#000");
  const b=bbox(m)||[0,0,200,100],pad=30,x=b[0]-pad,y=b[1]-pad,w=b[2]-b[0]+2*pad,h=b[3]-b[1]+2*pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><defs>${shadowDef("wbsh-e",R)}</defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${R("bg")}"/>${elements(m,R,{sh:"wbsh-e"})}</svg>`;
}

// ---------- editor state ----------
let dlg=null,svg=null,world=null,grid=null,edit=null,wrap=null,timerEl=null,timerIv=null,evalBox=null,emptyEl=null;
let cur=null; // {id,m,view,sel,tool,route,undo,redo,color,drag,editing,hover,target,space}
const ui={},touches=new Map();
const STYLE=`
:root{--wb-dot:#d3d7de;--wb-shape:#fff;--wb-stroke:#8f96a3;--wb-arrow:#6b7280;--wb-label:#fff;--wb-label-line:#e2e5ea;--wb-shadow:rgba(16,24,40,.10);
--wb-blue-f:#e3edff;--wb-blue-s:#3b6fd8;--wb-green-f:#dcf5e4;--wb-green-s:#2a9455;--wb-yellow-f:#fdf2cf;--wb-yellow-s:#b88400;--wb-red-f:#fde4e4;--wb-red-s:#d14343;--wb-purple-f:#ede7fe;--wb-purple-s:#7655d6}
:root[data-theme="dark"]{--wb-dot:#262b36;--wb-shape:#171b24;--wb-stroke:#4d5566;--wb-arrow:#8b93a3;--wb-label:#171b24;--wb-label-line:#2a303c;--wb-shadow:rgba(0,0,0,.55);
--wb-blue-f:#15233e;--wb-blue-s:#6b9bf2;--wb-green-f:#122a1d;--wb-green-s:#4cc47c;--wb-yellow-f:#2c2512;--wb-yellow-s:#deb043;--wb-red-f:#331819;--wb-red-s:#ef7b7b;--wb-purple-f:#221c3b;--wb-purple-s:#a28ef6}
#wbdlg{width:96vw;height:92vh;max-width:none;max-height:none;overflow:hidden}#wbdlg[open]{display:flex;flex-direction:column}
#wbdlg .hd{position:relative;z-index:6}
#wbdlg .wbl{display:flex;align-items:center;gap:10px;min-width:0}#wbdlg .wbl b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#wbdlg .wbtimer{flex:none;font:600 12px/1 ui-monospace,Menlo,monospace;padding:5px 10px;border-radius:999px;background:var(--head);border:1px solid var(--line);color:var(--muted);font-variant-numeric:tabular-nums}#wbdlg .wbtimer:empty{display:none}
#wbdlg .wbr{display:flex;align-items:center;gap:6px;flex:none}
#wbdlg .wbprimary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}#wbdlg .wbprimary:hover{background:var(--accent);border-color:var(--accent);filter:brightness(1.1)}#wbdlg .wbprimary:disabled{opacity:.75;cursor:default;filter:none}
#wbdlg .ib{display:inline-flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;min-height:0;padding:0;border-color:transparent;background:transparent;color:var(--fg);border-radius:8px}
#wbdlg .ib:hover{background:var(--head);border-color:transparent}#wbdlg .ib:active{transform:none}
#wbdlg .ib svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
#wbdlg .ib.on{background:var(--accent-soft);color:var(--accent)}#wbdlg .ib:disabled{opacity:.35;cursor:default;background:transparent}
#wbdlg .wrap{position:relative;flex:1;min-height:0;background:var(--bg);overflow:hidden}
#wbsvg{outline:none;position:absolute;inset:0;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;display:block}
#wbdlg .wbbar{position:absolute;z-index:4;display:flex;align-items:center;gap:2px;padding:4px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-md)}
#wbdlg .wbtools{top:12px;left:50%;transform:translateX(-50%);flex-wrap:wrap;justify-content:center;max-width:calc(100% - 24px)}
#wbdlg .wbzoom{bottom:12px;left:12px}#wbdlg .wbhelpb{bottom:12px;right:12px}
#wbdlg .wbsep{width:1px;height:22px;background:var(--line);margin:0 4px;flex:none}
#wbdlg .zp{min-width:54px;height:34px;min-height:0;padding:0 6px;border-color:transparent;background:transparent;font:600 12px ui-monospace,Menlo,monospace;color:var(--muted);font-variant-numeric:tabular-nums}#wbdlg .zp:hover{background:var(--head);border-color:transparent;color:var(--fg)}#wbdlg .zp:active{transform:none}
#wbdlg .sw{flex:none;box-sizing:border-box;width:20px;height:20px;min-height:0;padding:0;margin:0 3px;border-radius:50%;border:1.5px solid;transition:box-shadow .15s,transform .15s}
#wbdlg .sw:hover{transform:scale(1.12)}#wbdlg .sw:active{transform:scale(.95)}
#wbdlg .sw.on{box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--accent)}
#wbdlg .sw.none{background:linear-gradient(135deg,transparent 44%,var(--hard) 44%,var(--hard) 56%,transparent 56%),var(--wb-shape);border-color:var(--wb-stroke)}
#wbdlg [data-wt]{position:relative}
#wbdlg [data-wt]::after{content:attr(data-wt);position:absolute;left:50%;top:calc(100% + 8px);transform:translate(-50%,-3px);padding:4px 8px;border-radius:6px;background:#1f2330;color:#fff;font:500 12px/1.3 ${FAMILY};white-space:nowrap;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .12s,transform .12s,visibility .12s;z-index:10}
#wbdlg [data-wk]::after{content:attr(data-wt) "  ·  " attr(data-wk)}
#wbdlg [data-wt]:hover::after{opacity:1;visibility:visible;transform:translate(-50%,0);transition-delay:.35s}
#wbdlg .wbzoom [data-wt]::after{top:auto;bottom:calc(100% + 8px)}
#wbdlg .pop{position:absolute;z-index:7;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow-lg);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .15s,transform .15s,visibility .15s}
#wbdlg .pop.open{opacity:1;visibility:visible;transform:none}
#wbdlg .wbmenu{top:calc(100% - 6px);right:18px;min-width:200px;padding:5px}
#wbdlg .wbmenu button{display:block;width:100%;text-align:left;border:0;background:none;min-height:0;padding:8px 10px;border-radius:7px}#wbdlg .wbmenu button:hover{background:var(--head)}#wbdlg .wbmenu button:active{transform:none}
#wbdlg .wbmenu .danger{color:var(--hard)}#wbdlg .wbmenu hr{border:0;border-top:1px solid var(--line);margin:5px 2px}
#wbdlg .wbhelp{bottom:60px;right:12px;width:340px;padding:12px 14px;transform:translateY(4px)}#wbdlg .wbhelp.open{transform:none}
#wbdlg .wbhelp h4{margin:0 0 8px;font-size:13px}#wbdlg .wbhelp dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0;font-size:12.5px;align-items:center}#wbdlg .wbhelp dt{text-align:right;white-space:nowrap}#wbdlg .wbhelp dd{margin:0;color:var(--muted)}
#wbdlg kbd{display:inline-block;min-width:20px;padding:0 5px;border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;background:var(--surface);font:600 11px/17px ui-monospace,Menlo,monospace;text-align:center;color:var(--fg)}
#wbdlg .wbempty{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:0 24px;text-align:center;pointer-events:none;color:var(--muted);font-size:13px;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
#wbdlg .wbempty.show{opacity:1;transform:none}#wbdlg .wbempty h3{margin:0;font-size:17px;font-weight:600;color:var(--fg)}
#wbdlg .wbempty .keys{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}#wbdlg .wbempty .keys span{display:inline-flex;gap:6px;align-items:center}
#wbedit{position:absolute;transform:translate(-50%,-50%);z-index:2;margin:0;padding:0;min-height:0;border:0;border-radius:6px;background:transparent;color:var(--fg);caret-color:var(--accent);font-family:${FAMILY};font-weight:500;text-align:center;resize:none;overflow:hidden;outline:none;box-shadow:none;transition:none}
#wbedit:focus-visible{border-color:transparent;box-shadow:none}
#wbedit.pill,#wbedit.pill:focus-visible{padding:3px 8px;background:var(--wb-label);border:1.5px solid var(--accent);box-shadow:0 0 0 3px var(--ring)}
#wbdlg .eval{position:absolute;top:64px;right:12px;bottom:12px;width:min(380px,calc(100% - 24px));overflow:auto;z-index:5;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 18px 18px;box-shadow:var(--shadow-lg);opacity:0;visibility:hidden;transform:translateX(16px);transition:opacity .2s,transform .2s,visibility .2s}
#wbdlg .eval.open{opacity:1;visibility:visible;transform:none}
#wbdlg .eval h4{margin:16px 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}#wbdlg .eval ul{margin:2px 0;padding:0 0 0 18px;columns:1}#wbdlg .eval li{margin:3px 0;cursor:auto}#wbdlg .eval li:hover{background:none}#wbdlg .eval p{margin:8px 0;padding:0;color:inherit}
#wbdlg .eval .top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:-4px -8px 6px 0}
#wbdlg .eval .score{display:inline-block;margin-top:2px;padding:4px 12px;border-radius:999px;font:700 15px ui-monospace,Menlo,monospace;background:var(--accent-soft);color:var(--accent)}
#wbdlg .eval .score.hi{background:var(--easy-bg);color:var(--easy)}#wbdlg .eval .score.mid{background:var(--med-bg);color:var(--med)}#wbdlg .eval .score.lo{background:var(--hard-bg);color:var(--hard)}
#wbdlg .eval .warn{color:var(--med)}#wbdlg .eval .meta{color:var(--muted);font-size:12px}
@media (prefers-reduced-motion:reduce){#wbdlg .pop,#wbdlg .eval,#wbdlg .wbempty,#wbdlg .sw,#wbdlg [data-wt]::after{transition:none}}
@media (max-width:640px){#wbdlg{width:100vw;height:100vh;border-radius:0}#wbdlg .eval{top:auto;height:60%}#wbdlg .wbhelpb{display:none}}`;

function ensureDom(){
  if(dlg)return;
  const st=document.createElement("style");st.textContent=STYLE;document.head.appendChild(st);
  dlg=document.createElement("dialog");dlg.id="wbdlg";
  const k=s=>`<kbd>${s}</kbd>`,mod=/Mac|iPhone|iPad/.test(navigator.platform)?"⌘":"Ctrl";
  dlg.innerHTML=`<div class="hd"><div class="wbl"><b id="wbt"></b><span id="wbtimer" class="wbtimer"></span></div>
<div class="wbr"><select class="mdl"></select><button id="wbev" class="wbprimary">✦ AI evaluate</button><button class="ib" id="wbmore" data-pop title="More">${icon("more")}</button><button class="ib" id="wbx" title="Close (Esc)">${icon("close")}</button></div>
<div class="pop wbmenu" id="wbmenu"><button id="wblast">Show last evaluation</button><button id="wbsvgx">Export as SVG</button><button id="wbpngx">Export as PNG</button><hr><button id="wbclear" class="danger">Clear board…</button></div></div>
<div class="wrap"><svg id="wbsvg" tabindex="-1" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wbgrid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.1" style="fill:var(--wb-dot)"/></pattern>${shadowDef("wbsh",cssR)}</defs><rect width="100%" height="100%" fill="url(#wbgrid)"/><g id="wbworld"></g></svg>
<div class="wbempty" id="wbempty"><h3>Sketch your design</h3><div>Pick a shape from the toolbar, or press a key and click the canvas.</div>
<div class="keys"><span>${k("R")} Box</span><span>${k("D")} Database</span><span>${k("A")} Arrow</span><span>${k("T")} Text</span></div><div>Scroll to pan · Pinch or ${mod}-scroll to zoom · ${k("?")} for all shortcuts</div></div>
<div class="wbbar wbtools" id="wbtools"></div><div class="wbbar wbzoom" id="wbzoom"></div><div class="wbbar wbhelpb"><button class="ib" id="wbhelpbtn" data-pop title="Keyboard shortcuts (?)">${icon("help")}</button></div>
<div class="pop wbhelp" id="wbhelp"><h4>Shortcuts</h4><dl>
<dt>${k("V")}</dt><dd>Select and move</dd><dt>${k("R")} ${k("D")} ${k("E")} ${k("T")}</dt><dd>Box, database, ellipse, text</dd><dt>${k("A")} ${k("B")} ${k("L")}</dt><dd>Arrow, two-way, line</dd>
<dt>Drag shape → shape</dt><dd>Connect with the arrow tool</dd><dt>${k("Enter")} / double-click</dt><dd>Edit text</dd><dt>${k(mod)} ${k("D")}</dt><dd>Duplicate</dd><dt>${k("Del")}</dt><dd>Delete selection</dd>
<dt>${k(mod)} ${k("Z")}</dt><dd>Undo (add ${k("⇧")} to redo)</dd><dt>Scroll / ${k("Space")}+drag</dt><dd>Pan</dd><dt>${k(mod)}+scroll / pinch</dt><dd>Zoom</dd><dt>${k("+")} ${k("−")} ${k("0")}</dt><dd>Zoom in, out, reset</dd><dt>${k("⇧")} ${k("1")}</dt><dd>Fit board to screen</dd></dl></div>
<textarea id="wbedit" hidden rows="1" spellcheck="false"></textarea><div class="eval" id="wbeval"></div></div>`;
  document.body.appendChild(dlg);
  const q=s=>dlg.querySelector(s);
  svg=q("#wbsvg");world=q("#wbworld");grid=q("#wbgrid");edit=q("#wbedit");wrap=q(".wrap");timerEl=q("#wbtimer");evalBox=q("#wbeval");emptyEl=q("#wbempty");
  ui.menu=q("#wbmenu");ui.help=q("#wbhelp");ui.evalBtn=q("#wbev");ui.lastBtn=q("#wblast");
  q("#wbx").onclick=()=>dlg.close();
  ui.evalBtn.onclick=evaluate;
  q("#wbmore").onclick=()=>togglePop(ui.menu);
  q("#wbhelpbtn").onclick=()=>togglePop(ui.help);
  ui.lastBtn.onclick=()=>{closePops();showEval()};
  q("#wbsvgx").onclick=()=>{closePops();download(new Blob([exportSvg(cur.m)],{type:"image/svg+xml"}),cur.id+".svg")};
  q("#wbpngx").onclick=()=>{closePops();exportPng()};
  q("#wbclear").onclick=()=>{closePops();if(cur.m.els.length&&confirm("Clear the whole board?")){snapshot();cur.m.els=[];cur.sel=null;save()}};
  dlg.addEventListener("pointerdown",e=>{if(!e.target.closest(".pop,[data-pop]"))closePops()});
  dlg.addEventListener("close",()=>{commitEdit();persist();clearInterval(timerIv);closePops();cur=null;touches.clear();if(ui.onClose)ui.onClose()});
  dlg.addEventListener("cancel",e=>{
    if(!cur)return;
    if(ui.menu.classList.contains("open")||ui.help.classList.contains("open")){e.preventDefault();closePops()}
    else if(cur.editing){e.preventDefault();cancelEdit()}
    else if(evalBox.classList.contains("open")){e.preventDefault();hideEval()}
    else if(cur.sel||cur.tool!=="select"){e.preventDefault();cur.sel=null;cur.tool="select";paint()}
  });
  if(window.syncModels)syncModels();
  buildTools();bind();
}
function togglePop(p){const o=!p.classList.contains("open");closePops();p.classList.toggle("open",o)}
function closePops(){if(ui.menu){ui.menu.classList.remove("open");ui.help.classList.remove("open")}}

function buildTools(){
  const mk=(parent,html,fn,tip,key,cls="ib")=>{
    const b=document.createElement("button");b.className=cls;b.innerHTML=html;b.onclick=fn;
    if(tip){b.dataset.wt=tip;b.setAttribute("aria-label",tip)}if(key)b.dataset.wk=key.toUpperCase();
    parent.appendChild(b);return b;
  };
  const sep=p=>{const s=document.createElement("span");s.className="wbsep";p.appendChild(s)};
  const t=dlg.querySelector("#wbtools");t.textContent="";
  ui.tools={};
  ui.tools.select=mk(t,icon("select"),()=>setTool("select"),"Select","v");
  sep(t);
  Object.entries(SHAPES).forEach(([k,[l,key]])=>ui.tools[k]=mk(t,icon(k),()=>setTool(k),l,key));
  sep(t);
  Object.entries(ARROWS).forEach(([k,[l,key]])=>ui.tools[k]=mk(t,icon(k),()=>setTool(k),l,key));
  ui.route={};
  [["straight","Straight connectors"],["elbow","Elbow connectors"]].forEach(([r,l])=>ui.route[r]=mk(t,icon(r),()=>{
    cur.route=r;try{localStorage.setItem(ROUTE_KEY,r)}catch(e){}
    const e=cur.sel&&byId(cur.m,cur.sel);if(e&&isArrow(e)&&(e.r||"straight")!==r){snapshot();e.r=r;save()}else paint();
  },l));
  sep(t);
  ui.sw={};
  FILLS.forEach(k=>{
    const b=mk(t,"",()=>{
      cur.color=k;const e=cur.sel&&byId(cur.m,cur.sel);
      if(e&&e.t!=="text"&&(e.c||"none")!==k){snapshot();e.c=k;save()}else paint();
    },k==="none"?"No color":k[0].toUpperCase()+k.slice(1),null,"sw "+k);
    if(k!=="none"){b.style.background=`var(--wb-${k}-f)`;b.style.borderColor=`var(--wb-${k}-s)`}
    ui.sw[k]=b;
  });
  sep(t);
  ui.del=mk(t,icon("trash"),del,"Delete","Del");
  const z=dlg.querySelector("#wbzoom");z.textContent="";
  ui.undo=mk(z,icon("undo"),undo,"Undo");ui.redo=mk(z,icon("redo"),redo,"Redo");
  sep(z);
  mk(z,icon("minus"),()=>zoomBy(1/1.2),"Zoom out","−");
  ui.zoom=mk(z,"100%",()=>zoomTo(1),"Reset zoom","0","zp");
  mk(z,icon("plus"),()=>zoomBy(1.2),"Zoom in","+");
  mk(z,icon("fit"),fit,"Fit to screen","⇧1");
}

// ---------- state helpers ----------
function persist(){if(!cur)return;if(cur.m.els.length)boards[cur.id]={els:cur.m.els,view:cur.view,eval:cur.eval||undefined};else delete boards[cur.id];wr()}
function save(){persist();paint()}
function snapshot(){cur.undo.push(JSON.stringify(cur.m.els));if(cur.undo.length>100)cur.undo.shift();cur.redo=[]}
function undo(){if(!cur||!cur.undo.length)return;commitEdit();cur.redo.push(JSON.stringify(cur.m.els));cur.m.els=JSON.parse(cur.undo.pop());cur.sel=null;save()}
function redo(){if(!cur||!cur.redo.length)return;commitEdit();cur.undo.push(JSON.stringify(cur.m.els));cur.m.els=JSON.parse(cur.redo.pop());cur.sel=null;save()}
function setTool(t){commitEdit();cur.tool=t;if(t!=="select")cur.sel=null;cur.hover=cur.target=null;paint()}
function detach(m,id){
  m.els.filter(isArrow).forEach(a=>{
    const [p,q]=ends(m,a);
    if(a.a.s===id)a.a={s:null,x:p[0],y:p[1]};
    if(a.b.s===id)a.b={s:null,x:q[0],y:q[1]};
  });
}
function del(){
  if(!cur||!cur.sel)return;snapshot();
  detach(cur.m,cur.sel);cur.m.els=cur.m.els.filter(e=>e.id!==cur.sel);cur.sel=null;cur.hover=null;save();
}
function zoomAt(sx,sy,k){
  const v=cur.view;k=Math.min(3,Math.max(.25,k));
  v.x=sx-(sx-v.x)*k/v.k;v.y=sy-(sy-v.y)*k/v.k;v.k=k;paint();
}
const zoomBy=f=>{const r=svg.getBoundingClientRect();zoomAt(r.width/2,r.height/2,cur.view.k*f)};
const zoomTo=k=>{const r=svg.getBoundingClientRect();zoomAt(r.width/2,r.height/2,k)};
function fit(){
  const b=bbox(cur.m),r=svg.getBoundingClientRect();
  if(!b){cur.view={x:0,y:0,k:1};return paint()}
  const w=b[2]-b[0]+120,h=b[3]-b[1]+160,k=Math.min(1.5,Math.max(.25,Math.min(r.width/w,r.height/h)));
  cur.view={k,x:(r.width-(b[2]+b[0])*k)/2,y:(r.height-(b[3]+b[1])*k)/2};paint();
}
// Selection, hover and connection-target overlays. Sizes are divided by zoom so they stay constant on screen.
function overlay(){
  const m=cur.m,k=cur.view.k,A=cssR("accent");let s="";
  const hv=cur.hover&&cur.hover!==cur.sel&&!cur.drag&&byId(m,cur.hover);
  if(hv&&!isArrow(hv))s+=outline(hv,4/k,`fill:none;stroke:${A};stroke-width:${1.5/k};opacity:.5;pointer-events:none`);
  const tg=cur.target&&byId(m,cur.target);
  if(tg)s+=outline(tg,6/k,`fill:${cssR("accent-soft")};stroke:${A};stroke-width:${2.5/k};pointer-events:none`);
  const e=cur.sel&&byId(m,cur.sel);if(!e)return s;
  if(isArrow(e)){
    const [p,q]=ends(m,e),dot=(x,y,h)=>`<circle data-h="${h}" cx="${x}" cy="${y}" r="${5.5/k}" style="fill:${cssR("surface")};stroke:${A};stroke-width:${2/k};cursor:crosshair"/>`;
    return s+dot(p[0],p[1],"a")+dot(q[0],q[1],"b");
  }
  const p=5/k,x0=e.x-p,y0=e.y-p,x1=e.x+e.w+p,y1=e.y+e.h+p,hs=9/k;
  s+=`<rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" rx="${4/k}" style="fill:none;stroke:${A};stroke-width:${1.5/k};pointer-events:none"/>`;
  if(cur.editing===e.id)return s;
  [["nw",x0,y0],["ne",x1,y0],["sw",x0,y1],["se",x1,y1]].forEach(([h,x,y])=>{
    s+=`<rect data-h="${h}" x="${x-hs/2}" y="${y-hs/2}" width="${hs}" height="${hs}" rx="${2/k}" style="fill:${cssR("surface")};stroke:${A};stroke-width:${1.5/k};cursor:${h==="nw"||h==="se"?"nwse":"nesw"}-resize"/>`;
  });
  return s;
}
function paint(){
  if(!cur)return;
  const v=cur.view;
  world.setAttribute("transform",`translate(${v.x} ${v.y}) scale(${v.k})`);
  grid.setAttribute("patternTransform",`translate(${v.x} ${v.y}) scale(${v.k})`);
  world.innerHTML=elements(cur.m,cssR,{hide:cur.editing,move:cur.tool==="select"&&!cur.space,sel:cur.sel,hot:cur.hover})+overlay();
  Object.entries(ui.tools).forEach(([k,b])=>b.classList.toggle("on",k===cur.tool));
  const se=cur.sel&&byId(cur.m,cur.sel),route=se&&isArrow(se)?se.r||"straight":cur.route,color=se&&se.t!=="text"?se.c||"none":cur.color;
  Object.entries(ui.route).forEach(([k,b])=>b.classList.toggle("on",k===route));
  Object.entries(ui.sw).forEach(([k,b])=>b.classList.toggle("on",k===color));
  ui.del.disabled=!se;ui.undo.disabled=!cur.undo.length;ui.redo.disabled=!cur.redo.length;
  ui.zoom.textContent=Math.round(v.k*100)+"%";
  emptyEl.classList.toggle("show",!cur.m.els.length&&!cur.drag);
  svg.style.cursor=cur.drag&&cur.drag.k==="pan"?"grabbing":cur.space?"grab":cur.tool!=="select"?"crosshair":"default";
  ui.lastBtn.hidden=!cur.eval;ui.evalBtn.disabled=!!cur.evalBusy;ui.evalBtn.textContent=cur.evalBusy?"Evaluating…":"✦ AI evaluate";ui.evalBtn.classList.toggle("busy",!!cur.evalBusy);
  if(cur.editing)placeEdit();
}
const toWorld=e=>{const r=svg.getBoundingClientRect(),v=cur.view;return [(e.clientX-r.left-v.x)/v.k,(e.clientY-r.top-v.y)/v.k]};
const toScreen=(x,y)=>[x*cur.view.k+cur.view.x,y*cur.view.k+cur.view.y];

// ---------- text editing ----------
// The textarea sits over the element at the same font size and zoom, so editing looks like typing in place.
function placeEdit(){
  const e=byId(cur.m,cur.editing);if(!e)return;
  const k=cur.view.k,arrow=isArrow(e),fs=arrow?12.5:14,lh=LH(fs),n=Math.max(1,edit.value.split("\n").length);
  let cx,cy,w;
  if(arrow){[cx,cy]=midpoint(route(cur.m,e));w=Math.max(120,...edit.value.split("\n").map(l=>measure(l,fs)+24))}
  else{cx=e.x+e.w/2;cy=e.t==="text"?e.y+e.h/2:textY(e);w=e.t==="text"?Math.max(e.w,160):Math.max(60,e.w-12)}
  const [sx,sy]=toScreen(cx,cy);
  edit.className=arrow?"pill":"";
  Object.assign(edit.style,{left:sx+"px",top:sy+"px",width:w*k+(arrow?20:0)+"px",height:n*lh*k+(arrow?9:0)+"px",fontSize:fs*k+"px",lineHeight:lh*k+"px"});
}
function startEdit(id){
  const e=byId(cur.m,id);if(!e)return;
  commitEdit();cur.editing=id;cur.sel=id;
  edit.hidden=false;edit.value=e.text||"";
  // Bring an off-screen element into view first; focusing an off-screen textarea would scroll the canvas container.
  const r=svg.getBoundingClientRect(),[cx,cy]=isArrow(e)?midpoint(route(cur.m,e)):[e.x+e.w/2,textY(e)],[sx,sy]=toScreen(cx,cy);
  if(sx<60||sy<80||sx>r.width-60||sy>r.height-60){cur.view.x+=r.width/2-sx;cur.view.y+=r.height/2-sy}
  paint();setTimeout(()=>{if(cur&&cur.editing===id){edit.focus({preventScroll:true});edit.select()}},0);
}
function commitEdit(){
  if(!cur||!cur.editing)return;
  const id=cur.editing,e=byId(cur.m,id);cur.editing=null;edit.hidden=true;
  if(e&&(e.text||"")!==edit.value){
    snapshot();e.text=edit.value;
    if(e.t==="text"&&!e.text.trim()){detach(cur.m,e.id);cur.m.els=cur.m.els.filter(x=>x!==e);cur.sel=null}
  }else if(e&&e.t==="text"&&!(e.text||"").trim()){cur.m.els=cur.m.els.filter(x=>x!==e);cur.sel=null}
  save();
}
function cancelEdit(){
  const id=cur.editing,e=byId(cur.m,id);cur.editing=null;edit.hidden=true;
  if(e&&e.t==="text"&&!(e.text||"").trim()){cur.m.els=cur.m.els.filter(x=>x!==e);cur.sel=null}
  paint();
}

// ---------- pointer / keyboard ----------
function startPinch(){
  // A second finger cancels whatever the first one started; its pointerdown snapshot restores the board.
  const d=cur.drag;
  if(d&&d.k!=="pan"&&d.k!=="pinch"&&cur.undo.length){cur.m.els=JSON.parse(cur.undo.pop());cur.sel=null}
  const [a,b]=[...touches.values()];
  cur.drag={k:"pinch",d0:Math.hypot(a[0]-b[0],a[1]-b[1])||1,m0:[(a[0]+b[0])/2,(a[1]+b[1])/2],v:{...cur.view}};
  cur.target=null;paint();
}
function bind(){
  edit.onkeydown=e=>{
    e.stopPropagation();
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitEdit()}
    else if(e.key==="Escape"){e.preventDefault();cancelEdit()}
  };
  edit.oninput=placeEdit;
  wrap.onscroll=()=>{wrap.scrollTop=0;wrap.scrollLeft=0};
  edit.onblur=()=>commitEdit();
  svg.onpointerdown=e=>{
    if(!cur)return;
    if(e.pointerType==="touch"){touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===2)return startPinch();if(touches.size>2)return}
    if(e.button!==0&&e.button!==1)return;
    if(cur.editing)commitEdit();
    svg.setPointerCapture(e.pointerId);
    if(e.button===1||cur.space){e.preventDefault();cur.drag={k:"pan",sx:e.clientX,sy:e.clientY,v:{...cur.view}};return paint()}
    const w=toWorld(e),hd=e.target.closest("[data-h]"),tg=e.target.closest("[data-id]"),m=cur.m,tool=cur.tool;
    if(tool==="select"){
      if(hd){snapshot();cur.drag={k:"handle",h:hd.dataset.h,orig:{...byId(m,cur.sel)}}}
      else if(tg){
        // Double-click is detected here: paint() replaces the pressed node, so the browser never fires dblclick.
        const el=byId(m,tg.dataset.id),now=performance.now(),last=cur.lastDown;cur.lastDown={id:el.id,t:now};
        if(last&&last.id===el.id&&now-last.t<400){cur.lastDown=null;return startEdit(el.id)}
        cur.sel=el.id;snapshot();
        cur.drag={k:"move",start:w,orig:JSON.parse(JSON.stringify(el))};
      }else{cur.sel=null;cur.drag={k:"pan",sx:e.clientX,sy:e.clientY,v:{...cur.view}}}
    }else if(SHAPES[tool]){
      snapshot();
      const s={id:uid(),t:tool,x:snap(w[0]),y:snap(w[1]),w:0,h:0,text:"",c:tool==="text"?"none":cur.color};
      m.els.push(s);cur.sel=s.id;cur.drag={k:"create",s,start:w};
    }else if(ARROWS[tool]){
      snapshot();
      const hs=hitShape(m,w[0],w[1]);
      const a={id:uid(),t:"arrow",a:{s:hs?hs.id:null,x:w[0],y:w[1]},b:{s:null,x:w[0],y:w[1]},dir:ARROWS[tool][2],text:"",r:cur.route};
      m.els.push(a);cur.sel=a.id;cur.target=null;cur.drag={k:"draw",a};
    }
    cur.hover=null;paint();
  };
  svg.onpointermove=e=>{
    if(!cur)return;
    if(e.pointerType==="touch"&&touches.has(e.pointerId))touches.set(e.pointerId,[e.clientX,e.clientY]);
    const d=cur.drag;
    if(!d){
      if(e.pointerType==="touch")return;
      let h=null,t=null;
      if(cur.tool==="select"&&!cur.space){const g=e.target.closest&&e.target.closest("[data-id]");h=g?g.dataset.id:null}
      else if(ARROWS[cur.tool]){const w=toWorld(e),s=hitShape(cur.m,w[0],w[1]);t=s?s.id:null}
      if(h!==cur.hover||t!==cur.target){cur.hover=h;cur.target=t;paint()}
      return;
    }
    const w=toWorld(e),m=cur.m,sel=cur.sel&&byId(m,cur.sel);
    if(d.k==="pinch"){
      if(touches.size<2)return;
      const [a,b]=[...touches.values()],r=svg.getBoundingClientRect(),v0=d.v;
      const k=Math.min(3,Math.max(.25,v0.k*Math.hypot(a[0]-b[0],a[1]-b[1])/d.d0));
      const wx=(d.m0[0]-r.left-v0.x)/v0.k,wy=(d.m0[1]-r.top-v0.y)/v0.k,mx=(a[0]+b[0])/2-r.left,my=(a[1]+b[1])/2-r.top;
      cur.view={k,x:mx-wx*k,y:my-wy*k};
    }
    else if(d.k==="pan"){cur.view.x=d.v.x+e.clientX-d.sx;cur.view.y=d.v.y+e.clientY-d.sy}
    else if(d.k==="create"){
      const s=d.s;s.x=snap(Math.min(w[0],d.start[0]));s.y=snap(Math.min(w[1],d.start[1]));
      s.w=snap(Math.abs(w[0]-d.start[0]));s.h=snap(Math.abs(w[1]-d.start[1]));
    }else if(d.k==="draw"){
      const hs=hitShape(m,w[0],w[1],d.a.a.s);d.a.b={s:hs?hs.id:null,x:w[0],y:w[1]};cur.target=hs?hs.id:null;
    }else if(d.k==="move"&&sel){
      const dx=w[0]-d.start[0],dy=w[1]-d.start[1],o=d.orig;
      if(isArrow(sel)){
        if(!o.a.s){sel.a.x=o.a.x+dx;sel.a.y=o.a.y+dy}
        if(!o.b.s){sel.b.x=o.b.x+dx;sel.b.y=o.b.y+dy}
      }else{sel.x=snap(o.x+dx);sel.y=snap(o.y+dy)}
    }else if(d.k==="handle"&&sel){
      if(isArrow(sel)){
        const end=d.h,other=end==="a"?"b":"a",hs=hitShape(m,w[0],w[1],sel[other].s);
        sel[end]={s:hs?hs.id:null,x:w[0],y:w[1]};cur.target=hs?hs.id:null;
      }else{
        const o=d.orig,h=d.h,px=snap(w[0]),py=snap(w[1]);
        let x0=o.x,y0=o.y,x1=o.x+o.w,y1=o.y+o.h;
        if(h.includes("w"))x0=Math.min(px,x1-30);else x1=Math.max(px,x0+30);
        if(h.includes("n"))y0=Math.min(py,y1-20);else y1=Math.max(py,y0+20);
        Object.assign(sel,{x:x0,y:y0,w:x1-x0,h:y1-y0});
      }
    }
    paint();
  };
  svg.onpointerup=svg.onpointercancel=e=>{
    if(!cur)return;
    if(e.pointerType==="touch")touches.delete(e.pointerId);
    const d=cur.drag;if(!d)return;
    if(d.k==="pinch"){if(touches.size<2){cur.drag=null;paint()}return}
    cur.drag=null;cur.target=null;
    const m=cur.m,el=cur.sel&&byId(m,cur.sel);
    if(d.k==="create"){
      const s=d.s;
      if(s.w<20&&s.h<20){[s.w,s.h]=DEF[s.t];s.x=snap(d.start[0]-s.w/2);s.y=snap(d.start[1]-s.h/2)}
      else{s.w=Math.max(s.w,30);s.h=Math.max(s.h,s.t==="text"?20:30)}
      cur.tool="select";
    }else if(d.k==="draw"){
      const [p,q]=ends(m,d.a);
      if(Math.hypot(q[0]-p[0],q[1]-p[1])<12){m.els=m.els.filter(x=>x!==d.a);cur.sel=null}
      cur.tool="select";
    }
    if(cur.undo.length&&cur.undo[cur.undo.length-1]===JSON.stringify(m.els))cur.undo.pop();
    save();
    if(d.k==="create"&&el)startEdit(el.id);
  };
  svg.onpointerleave=()=>{if(cur&&!cur.drag&&(cur.hover||cur.target)){cur.hover=cur.target=null;paint()}};
  // Trackpad two-finger scroll pans; pinch (reported as ctrl+wheel) or Cmd/Ctrl+wheel zooms.
  svg.onwheel=e=>{
    e.preventDefault();if(!cur)return;
    const r=svg.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?r.height:1;
    if(e.ctrlKey||e.metaKey){
      const f=Math.min(1.25,Math.max(.8,Math.exp(-e.deltaY*unit*.01)));
      zoomAt(e.clientX-r.left,e.clientY-r.top,cur.view.k*f);
    }else{
      let dx=e.deltaX*unit,dy=e.deltaY*unit;if(e.shiftKey&&!dx){dx=dy;dy=0}
      cur.view.x-=dx;cur.view.y-=dy;paint();
    }
  };
  const typing=t=>t.matches&&t.matches("input,textarea,select");
  document.addEventListener("keydown",e=>{
    if(!dlg.open||!cur||cur.editing||e.target===edit)return;
    const mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();
    if(e.key===" "&&!typing(e.target)){e.preventDefault();if(!cur.space){cur.space=true;cur.hover=null;paint()}return}
    if(mod&&k==="z"){e.preventDefault();e.shiftKey?redo():undo()}
    else if(mod&&k==="y"){e.preventDefault();redo()}
    else if(mod&&k==="d"&&cur.sel){
      e.preventDefault();const s=byId(cur.m,cur.sel);if(!s)return;snapshot();
      const c=JSON.parse(JSON.stringify(s));c.id=uid();
      if(isArrow(c)){[c.a,c.b].forEach(p=>{p.s=null});const [p,q]=ends(cur.m,s);c.a.x=p[0]+20;c.a.y=p[1]+20;c.b.x=q[0]+20;c.b.y=q[1]+20}else{c.x+=20;c.y+=20}
      cur.m.els.push(c);cur.sel=c.id;save();
    }
    else if(typing(e.target))return;
    else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();del()}
    else if(e.key==="Enter"&&cur.sel){e.preventDefault();startEdit(cur.sel)}
    else if(mod)return;
    else if(e.key==="?"){togglePop(ui.help)}
    else if(e.key==="!"||(e.shiftKey&&e.code==="Digit1")){fit()}
    else if(e.key==="+"||e.key==="="){zoomBy(1.2)}
    else if(e.key==="-"||e.key==="_"){zoomBy(1/1.2)}
    else if(e.key==="0"){zoomTo(1)}
    else{
      const map={v:"select",r:"rect",d:"db",e:"ell",t:"text",a:"arrow",b:"bi",l:"line"};
      if(map[k])setTool(map[k]);
    }
  });
  document.addEventListener("keyup",e=>{if(cur&&e.key===" "&&cur.space){e.preventDefault();cur.space=false;paint()}});
}

// ---------- AI evaluation ----------
function serialize(m){
  const shapes=m.els.filter(e=>!isArrow(e)),ids={};
  shapes.forEach((s,i)=>ids[s.id]="n"+(i+1));
  return {
    nodes:shapes.map(s=>({id:ids[s.id],type:s.t,text:(s.text||"").slice(0,300),x:Math.round(s.x),y:Math.round(s.y)})),
    edges:m.els.filter(isArrow).map(a=>({from:a.a.s&&ids[a.a.s]||null,to:a.b.s&&ids[a.b.s]||null,dir:a.dir,text:(a.text||"").slice(0,300)}))
  };
}
const hideEval=()=>evalBox.classList.remove("open");
function showEval(msg){
  const box=evalBox;box.textContent="";box.classList.add("open");
  const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
  const top=el("div","top"),close=el("button","ib");close.innerHTML=icon("close");close.title="Close";close.onclick=hideEval;
  top.appendChild(el("b",null,"AI evaluation"));top.appendChild(close);box.appendChild(top);
  if(msg){box.appendChild(el("p",msg.busy?"meta busy":msg.warn?"warn":"meta",msg.text));return}
  const d=cur.eval;if(!d)return;
  const ev=d.evaluation,list=(title,items)=>{if(!items.length)return;box.appendChild(el("h4",null,title));const u=el("ul");items.forEach(i=>u.appendChild(el("li",null,i)));box.appendChild(u)};
  box.appendChild(el("span","score "+(ev.score>=4?"hi":ev.score>=3?"mid":"lo"),ev.score+" / 5"));
  box.appendChild(el("p",null,ev.summary));
  const stale=d.sig!==JSON.stringify(cur.m.els);
  box.appendChild(el("div",stale?"warn":"meta",(stale?"The board has changed since this evaluation. ":"")+"Generated by "+d.model+" on "+d.at.slice(0,10)+". AI feedback; use your own judgement."));
  list("Strengths",ev.strengths);list("Gaps",ev.gaps);
  if(ev.missing_components.length){box.appendChild(el("h4",null,"Missing components"));const u=el("ul");ev.missing_components.forEach(c=>u.appendChild(el("li",null,c.name+": "+c.why)));box.appendChild(u)}
  list("Suggestions",ev.suggestions);list("Likely follow-up questions",ev.followups);
}
async function evaluate(){
  if(cur.evalBusy)return;commitEdit();
  if(!cur.m.els.some(e=>!isArrow(e)))return showEval({text:"Draw some components first, then ask for an evaluation."});
  const id=cur.id,sig=JSON.stringify(cur.m.els),c=cur;
  c.evalBusy=true;paint();showEval({busy:true,text:"Evaluating your design… this can take up to a minute."});
  try{
    const res=await apiFetch("/api/sd/evaluate",{method:"POST",body:JSON.stringify({id,board:serialize(c.m),notes:c.notes?c.notes():null})});
    const d=await res.json();
    if(!res.ok)throw new Error(d.error||"Request failed");
    c.eval={...d,sig};if(cur===c)persist();
    if(cur===c){c.evalBusy=false;paint();showEval()}
  }catch(err){
    c.evalBusy=false;
    if(cur===c){paint();showEval({warn:true,text:err instanceof TypeError?NO_SERVER:err.message})}
  }
}

// ---------- export ----------
function download(blob,name){
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function exportPng(){
  const src=exportSvg(cur.m),img=new Image(),name=cur.id+".png";
  img.onload=()=>{
    const c=document.createElement("canvas"),k=2;c.width=img.width*k;c.height=img.height*k;
    const g=c.getContext("2d");g.scale(k,k);g.drawImage(img,0,0);
    c.toBlob(b=>b&&download(b,name),"image/png");
  };
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(src);
}

// ---------- public API ----------
function open(id,title,opts={}){
  ensureDom();
  const b=boards[id];
  let route="straight";try{route=localStorage.getItem(ROUTE_KEY)||route}catch(e){}
  cur={id,m:{els:b?JSON.parse(JSON.stringify(b.els)):[]},view:b&&b.view?{...b.view}:{x:40,y:40,k:1},sel:null,tool:"select",route,undo:[],redo:[],color:"none",drag:null,editing:null,hover:null,target:null,space:false};
  cur.eval=b&&b.eval;cur.notes=opts.notes||null;cur.evalBusy=false;
  ui.onClose=opts.onClose||null;
  hideEval();closePops();edit.hidden=true;
  dlg.querySelector("#wbt").textContent=title||"Whiteboard";
  clearInterval(timerIv);timerEl.textContent="";
  if(opts.timer){const t=()=>{timerEl.textContent=opts.timer()};t();timerIv=setInterval(t,1000)}
  dlg.showModal();svg.focus({preventScroll:true});paint();
  if(!b)return;
  requestAnimationFrame(()=>{if(cur&&cur.id===id&&!b.view)fit()});
}
function preview(id){
  const b=boards[id];if(!b||!b.els.length)return "";
  return exportSvg({els:b.els}).replace(/width="[\d.]+" height="[\d.]+"/,'style="width:100%;max-height:260px;border:1px solid var(--line);border-radius:8px"');
}
return {
  open,preview,
  has:id=>!!(boards[id]&&boards[id].els.length),
  board:id=>boards[id]&&boards[id].els.length?serialize(boards[id]):null,  // the shape /api/sd/evaluate and /api/sd/grade take
  exportAll:()=>boards
};
})();

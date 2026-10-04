// SVG whiteboard for System Design Prep. Boards are stored per problem id in localStorage.
// API: wb.open(id,title,{timer,notes,onClose}), wb.has(id), wb.preview(id), wb.board(id), wb.exportAll()
window.wb=(()=>{
const KEY="sysdesign-boards-v1";
const rd=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){return {}}};
const wr=()=>{try{localStorage.setItem(KEY,JSON.stringify(boards))}catch(e){}};
let boards=rd();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const FILLS={none:null,blue:"#0969da",green:"#1a7f37",yellow:"#bf8700",red:"#cf222e",purple:"#8250df"};
const SHAPES={rect:"▭ Box",db:"⛁ Database",ell:"◯ Ellipse",text:"T Text"};
const ARROWS={arrow:["→ Arrow","one"],bi:["↔ Two-way","two"],line:["— Line","none"]};
const DEF={rect:[140,70],db:[100,90],ell:[130,70],text:[120,30]};
const snap=v=>Math.round(v/10)*10;
const byId=(m,id)=>m.els.find(e=>e.id===id);
const isArrow=e=>e.t==="arrow";

// ---------- geometry ----------
const center=s=>[s.x+s.w/2,s.y+s.h/2];
function edge(s,tx,ty){
  const [cx,cy]=center(s),dx=tx-cx,dy=ty-cy;
  if(!dx&&!dy)return [cx,cy];
  const hw=s.w/2,hh=s.h/2;
  const t=s.t==="ell"?1/Math.hypot(dx/hw,dy/hh):Math.min(dx?hw/Math.abs(dx):Infinity,dy?hh/Math.abs(dy):Infinity);
  return t>=1?[cx,cy]:[cx+dx*t,cy+dy*t];
}
function ends(m,a){
  const sa=a.a.s&&byId(m,a.a.s),sb=a.b.s&&byId(m,a.b.s);
  const pa=sa?center(sa):[a.a.x,a.a.y],pb=sb?center(sb):[a.b.x,a.b.y];
  return [sa?edge(sa,pb[0],pb[1]):pa,sb?edge(sb,pa[0],pa[1]):pb];
}
const inside=(s,x,y)=>x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h;
const hitShape=(m,x,y,skip)=>{for(let i=m.els.length-1;i>=0;i--){const e=m.els[i];if(!isArrow(e)&&e.t!=="text"&&e.id!==skip&&inside(e,x,y))return e}return null};
function bbox(m){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const pt=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
  m.els.forEach(e=>{if(isArrow(e))ends(m,e).forEach(p=>pt(p[0],p[1]));else{pt(e.x,e.y);pt(e.x+e.w,e.y+e.h)}});
  return x0>x1?null:[x0,y0,x1,y1];
}

// ---------- rendering ----------
const FONT="font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
function txt(cx,cy,text,R,halo){
  const lines=String(text||"").split("\n");if(!text)return "";
  return lines.map((l,i)=>`<text x="${cx}" y="${cy+(i-(lines.length-1)/2)*17}" text-anchor="middle" dominant-baseline="central" style="${FONT};fill:${R("fg")};pointer-events:none;${halo?`paint-order:stroke;stroke:${R("bg")};stroke-width:5px;stroke-linejoin:round`:""}">${esc(l)}</text>`).join("");
}
function shapeSvg(s,R){
  const {x,y,w,h}=s,stroke=`stroke:${R("fg")};stroke-width:1.6`;
  const geo=fill=>{
    const st=`style="${stroke};fill:${fill}"`;
    if(s.t==="rect")return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${st}/>`;
    if(s.t==="ell")return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" ${st}/>`;
    if(s.t==="db"){const ry=Math.min(16,h/4);return `<path d="M${x},${y+ry}a${w/2},${ry} 0 0 1 ${w},0v${h-2*ry}a${w/2},${ry} 0 0 1 ${-w},0z" ${st}/>`+`<path d="M${x},${y+ry}a${w/2},${ry} 0 0 0 ${w},0" style="${stroke};fill:none"/>`}
    return "";
  };
  if(s.t==="text")return `<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:transparent;stroke:none"/>`+txt(x+w/2,y+h/2,s.text,R);
  const tint=FILLS[s.c];
  const ty=s.t==="db"?y+h/2+Math.min(16,h/4)/2:y+h/2;
  return geo(R("bg"))+(tint?geo(tint).replace(/fill:[^"]+/,`fill:${tint};fill-opacity:.2`):"")+txt(x+w/2,ty,s.text,R);
}
function head(x,y,ang,R){
  const p=(d,o)=>[x-Math.cos(ang)*d+Math.sin(ang)*o,y-Math.sin(ang)*d-Math.cos(ang)*o].map(n=>n.toFixed(1)).join(",");
  return `<polygon points="${x.toFixed(1)},${y.toFixed(1)} ${p(13,5.5)} ${p(13,-5.5)}" style="fill:${R("fg")};stroke:none"/>`;
}
function arrowSvg(m,a,R){
  const [p,q]=ends(m,a),ang=Math.atan2(q[1]-p[1],q[0]-p[0]),len=Math.hypot(q[0]-p[0],q[1]-p[1]);
  const off=d=>[Math.cos(ang)*d,Math.sin(ang)*d];
  const sa=a.dir==="two"?off(10):[0,0],sb=a.dir!=="none"?off(-10):[0,0];
  let s=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" style="stroke:transparent;stroke-width:16"/>`;
  s+=`<line x1="${p[0]+sa[0]}" y1="${p[1]+sa[1]}" x2="${q[0]+sb[0]}" y2="${q[1]+sb[1]}" style="stroke:${R("fg")};stroke-width:1.8;pointer-events:none"/>`;
  if(len>1){if(a.dir!=="none")s+=head(q[0],q[1],ang,R);if(a.dir==="two")s+=head(p[0],p[1],ang+Math.PI,R)}
  return s+txt((p[0]+q[0])/2,(p[1]+q[1])/2-(a.text?0:0),a.text,R,true);
}
function elements(m,R,hide){
  const shapes=m.els.filter(e=>!isArrow(e)),arrows=m.els.filter(isArrow);
  const draw=e=>{
    const c=hide===e.id?{...e,text:""}:e;
    return `<g data-id="${e.id}" style="cursor:move">${isArrow(e)?arrowSvg(m,c,R):shapeSvg(c,R)}</g>`;
  };
  return shapes.map(draw).join("")+arrows.map(draw).join("");
}
function handles(m,sel,R){
  const e=sel&&byId(m,sel);if(!e)return "";
  const dot=(x,y,h,cur)=>`<rect data-h="${h}" x="${x-5}" y="${y-5}" width="10" height="10" rx="2" style="fill:${R("bg")};stroke:${R("accent")};stroke-width:1.6;cursor:${cur}"/>`;
  if(isArrow(e)){const [p,q]=ends(m,e);return dot(p[0],p[1],"a","crosshair")+dot(q[0],q[1],"b","crosshair")}
  return `<rect x="${e.x-4}" y="${e.y-4}" width="${e.w+8}" height="${e.h+8}" style="fill:none;stroke:${R("accent")};stroke-width:1.2;stroke-dasharray:4 3;pointer-events:none"/>`+dot(e.x+e.w+4,e.y+e.h+4,"br","nwse-resize");
}
const cssR=n=>`var(--${n})`;
function exportSvg(m){
  const cs=getComputedStyle(document.documentElement),R=n=>cs.getPropertyValue("--"+n).trim()||(n==="bg"?"#fff":"#000");
  const b=bbox(m)||[0,0,200,100],pad=30,x=b[0]-pad,y=b[1]-pad,w=b[2]-b[0]+2*pad,h=b[3]-b[1]+2*pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${R("bg")}"/>${elements(m,R)}</svg>`;
}

// ---------- editor state ----------
let dlg=null,svg=null,world=null,grid=null,edit=null,wrap=null,timerEl=null,timerIv=null;
let cur=null; // {id,m,view,sel,tool,undo,redo,color,drag,editing}
const ui={};

function ensureDom(){
  if(dlg)return;
  const st=document.createElement("style");
  st.textContent=`#wbdlg{width:96vw;height:92vh;max-width:none;max-height:none}#wbdlg[open]{display:flex;flex-direction:column}
#wbdlg .tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line)}
#wbdlg .tools .sep{width:1px;align-self:stretch;background:var(--line);margin:0 4px}
#wbdlg .tools button.on{border-color:var(--accent);color:var(--accent);font-weight:600}
#wbdlg .sw{box-sizing:border-box;flex:none;width:22px;height:22px;min-width:22px;min-height:22px;max-width:22px;max-height:22px;aspect-ratio:1;padding:0;line-height:0;border-radius:50%;border:2px solid var(--line)}#wbdlg .sw.on{border-color:var(--fg)}
#wbdlg .wrap{position:relative;flex:1;min-height:0;background:var(--bg)}
#wbdlg svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;user-select:none;display:block}
#wbdlg textarea{position:absolute;transform:translate(-50%,-50%);text-align:center;resize:none;z-index:2;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#wbdlg .eval{position:absolute;top:8px;right:8px;bottom:8px;width:min(380px,90%);overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 14px;z-index:3;box-shadow:0 4px 16px rgba(0,0,0,.25)}
#wbdlg .eval h4{margin:12px 0 4px;font-size:13px}#wbdlg .eval ul{margin:2px 0;padding-left:18px}#wbdlg .eval p{margin:4px 0}
#wbdlg .eval .top{display:flex;justify-content:space-between;align-items:center;gap:8px}
#wbdlg .eval .score{font:700 22px ui-monospace,Menlo,monospace}
#wbdlg .eval .warn{color:var(--med)}#wbdlg .eval .meta{color:var(--muted);font-size:12px}
#wbdlg .hint{padding:6px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}`;
  document.head.appendChild(st);
  dlg=document.createElement("dialog");dlg.id="wbdlg";
  dlg.innerHTML=`<div class="hd"><b id="wbt"></b><span><span id="wbtimer" class="meta"></span> <select class="mdl"></select> <button id="wbx">Close</button></span></div>
<div class="tools" id="wbtools"></div>
<div class="wrap"><svg id="wbsvg" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wbgrid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" style="fill:var(--line)"/></pattern></defs><rect id="wbgridr" width="100%" height="100%" fill="url(#wbgrid)"/><g id="wbworld"></g></svg><textarea id="wbedit" hidden rows="2"></textarea><div class="eval" id="wbeval" hidden></div></div>
<div class="hint">Pick a tool, then click or drag on the canvas. Drag from one shape to another with an arrow tool to connect them (arrows follow when you move shapes). Double-click or press Enter to edit text. Scroll to zoom, drag the background to pan. Delete removes, Cmd/Ctrl+Z undoes, Cmd/Ctrl+D duplicates.</div>`;
  document.body.appendChild(dlg);
  svg=dlg.querySelector("#wbsvg");world=dlg.querySelector("#wbworld");grid=dlg.querySelector("#wbgrid");
  edit=dlg.querySelector("#wbedit");wrap=dlg.querySelector(".wrap");timerEl=dlg.querySelector("#wbtimer");
  dlg.querySelector("#wbx").onclick=()=>dlg.close();
  dlg.addEventListener("close",()=>{commitEdit();persist();clearInterval(timerIv);cur=null;if(ui.onClose)ui.onClose()});
  dlg.addEventListener("cancel",e=>{if(cur&&(cur.editing||cur.sel||cur.tool!=="select")){e.preventDefault();if(cur.editing){cancelEdit()}else{cur.sel=null;cur.tool="select";paint()}}});
  if(window.syncModels)syncModels();
  buildTools();bind();
}

function buildTools(){
  const t=dlg.querySelector("#wbtools");t.textContent="";
  const btn=(label,fn,attrs={})=>{const b=document.createElement("button");b.textContent=label;b.onclick=fn;Object.assign(b,attrs);t.appendChild(b);return b};
  const sep=()=>{const s=document.createElement("span");s.className="sep";t.appendChild(s)};
  ui.tools={};
  ui.tools.select=btn("↖ Select",()=>setTool("select"));
  Object.entries(SHAPES).forEach(([k,l])=>ui.tools[k]=btn(l,()=>setTool(k)));
  sep();
  Object.entries(ARROWS).forEach(([k,[l]])=>ui.tools[k]=btn(l,()=>setTool(k)));
  sep();
  ui.sw={};
  Object.entries(FILLS).forEach(([k,c])=>{
    const b=btn("",()=>{cur.color=k;const e=cur.sel&&byId(cur.m,cur.sel);if(e&&!isArrow(e)){snapshot();e.c=k;save()}paint()});
    b.className="sw";b.style.background=c?c+"55":"var(--bg)";b.title=k==="none"?"No fill":"Fill: "+k;ui.sw[k]=b;
  });
  sep();
  btn("Undo",undo);btn("Redo",redo);btn("Delete",del);btn("Fit",fit);
  btn("Clear",()=>{if(cur.m.els.length&&confirm("Clear the whole board?")){snapshot();cur.m.els=[];cur.sel=null;save()}});
  sep();
  ui.evalBtn=btn("✦ AI evaluate",evaluate);
  ui.lastBtn=btn("Last evaluation",()=>showEval());
  sep();
  btn("Export SVG",()=>download(new Blob([exportSvg(cur.m)],{type:"image/svg+xml"}),cur.id+".svg"));
  btn("Export PNG",exportPng);
}

// ---------- state helpers ----------
function persist(){if(!cur)return;if(cur.m.els.length)boards[cur.id]={els:cur.m.els,view:cur.view,eval:cur.eval||undefined};else delete boards[cur.id];wr()}
function save(){persist();paint()}
function snapshot(){cur.undo.push(JSON.stringify(cur.m.els));if(cur.undo.length>100)cur.undo.shift();cur.redo=[]}
function undo(){if(!cur||!cur.undo.length)return;cur.redo.push(JSON.stringify(cur.m.els));cur.m.els=JSON.parse(cur.undo.pop());cur.sel=null;save()}
function redo(){if(!cur||!cur.redo.length)return;cur.undo.push(JSON.stringify(cur.m.els));cur.m.els=JSON.parse(cur.redo.pop());cur.sel=null;save()}
function setTool(t){commitEdit();cur.tool=t;if(t!=="select")cur.sel=null;paint()}
function detach(m,id){
  m.els.filter(isArrow).forEach(a=>{
    const [p,q]=ends(m,a);
    if(a.a.s===id)a.a={s:null,x:p[0],y:p[1]};
    if(a.b.s===id)a.b={s:null,x:q[0],y:q[1]};
  });
}
function del(){
  if(!cur||!cur.sel)return;snapshot();
  detach(cur.m,cur.sel);cur.m.els=cur.m.els.filter(e=>e.id!==cur.sel);cur.sel=null;save();
}
function fit(){
  const b=bbox(cur.m),r=svg.getBoundingClientRect();
  if(!b){cur.view={x:0,y:0,k:1};return paint()}
  const w=b[2]-b[0]+80,h=b[3]-b[1]+80,k=Math.min(1.5,Math.max(.25,Math.min(r.width/w,r.height/h)));
  cur.view={k,x:(r.width-(b[2]+b[0])*k)/2,y:(r.height-(b[3]+b[1])*k)/2};paint();
}
function paint(){
  if(!cur)return;
  const v=cur.view;
  world.setAttribute("transform",`translate(${v.x} ${v.y}) scale(${v.k})`);
  grid.setAttribute("patternTransform",`translate(${v.x} ${v.y}) scale(${v.k})`);
  world.innerHTML=elements(cur.m,cssR,cur.editing)+handles(cur.m,cur.sel,cssR);
  Object.entries(ui.tools).forEach(([k,b])=>b.classList.toggle("on",k===cur.tool));
  ui.lastBtn.hidden=!cur.eval;ui.evalBtn.disabled=cur.evalBusy;ui.evalBtn.textContent=cur.evalBusy?"Evaluating…":"✦ AI evaluate";ui.evalBtn.classList.toggle("busy",!!cur.evalBusy);
  Object.entries(ui.sw).forEach(([k,b])=>b.classList.toggle("on",k===cur.color));
}
const toWorld=e=>{const r=svg.getBoundingClientRect(),v=cur.view;return [(e.clientX-r.left-v.x)/v.k,(e.clientY-r.top-v.y)/v.k]};
const toScreen=(x,y)=>[x*cur.view.k+cur.view.x,y*cur.view.k+cur.view.y];

// ---------- text editing ----------
function startEdit(id){
  const e=byId(cur.m,id);if(!e)return;
  commitEdit();cur.editing=id;cur.sel=id;
  let cx,cy,w=140;
  if(isArrow(e)){const [p,q]=ends(cur.m,e);cx=(p[0]+q[0])/2;cy=(p[1]+q[1])/2}else{[cx,cy]=center(e);w=Math.max(100,e.w)}
  const [sx,sy]=toScreen(cx,cy);
  edit.hidden=false;edit.value=e.text||"";edit.style.left=sx+"px";edit.style.top=sy+"px";edit.style.width=Math.max(100,w*cur.view.k)+"px";
  paint();setTimeout(()=>{if(cur&&cur.editing===id){edit.focus();edit.select()}},0);
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
function bind(){
  edit.onkeydown=e=>{
    e.stopPropagation();
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitEdit()}
    else if(e.key==="Escape"){e.preventDefault();cancelEdit()}
  };
  edit.onblur=()=>commitEdit();
  svg.onpointerdown=e=>{
    if(e.button!==0)return;
    if(cur.editing)commitEdit();
    svg.setPointerCapture(e.pointerId);
    const w=toWorld(e),hd=e.target.closest("[data-h]"),tg=e.target.closest("[data-id]"),m=cur.m,tool=cur.tool;
    if(tool==="select"){
      if(hd){snapshot();cur.drag={k:"handle",h:hd.dataset.h}}
      else if(tg){
        const el=byId(m,tg.dataset.id);cur.sel=el.id;snapshot();
        cur.drag={k:"move",start:w,orig:JSON.parse(JSON.stringify(el))};
      }else{cur.sel=null;cur.drag={k:"pan",sx:e.clientX,sy:e.clientY,v:{...cur.view}}}
    }else if(SHAPES[tool]){
      snapshot();
      const s={id:uid(),t:tool,x:snap(w[0]),y:snap(w[1]),w:0,h:0,text:"",c:tool==="text"?"none":cur.color};
      m.els.push(s);cur.sel=s.id;cur.drag={k:"create",s,start:w};
    }else if(ARROWS[tool]){
      snapshot();
      const hs=hitShape(m,w[0],w[1]);
      const a={id:uid(),t:"arrow",a:{s:hs?hs.id:null,x:w[0],y:w[1]},b:{s:null,x:w[0],y:w[1]},dir:ARROWS[tool][1],text:""};
      m.els.push(a);cur.sel=a.id;cur.drag={k:"draw",a};
    }
    paint();
  };
  svg.onpointermove=e=>{
    const d=cur&&cur.drag;if(!d)return;
    const w=toWorld(e),m=cur.m,sel=cur.sel&&byId(m,cur.sel);
    if(d.k==="pan"){cur.view.x=d.v.x+e.clientX-d.sx;cur.view.y=d.v.y+e.clientY-d.sy}
    else if(d.k==="create"){
      const s=d.s;s.x=snap(Math.min(w[0],d.start[0]));s.y=snap(Math.min(w[1],d.start[1]));
      s.w=snap(Math.abs(w[0]-d.start[0]));s.h=snap(Math.abs(w[1]-d.start[1]));
    }else if(d.k==="draw"){
      const hs=hitShape(m,w[0],w[1],d.a.a.s);d.a.b={s:hs?hs.id:null,x:w[0],y:w[1]};
    }else if(d.k==="move"&&sel){
      const dx=w[0]-d.start[0],dy=w[1]-d.start[1],o=d.orig;
      if(isArrow(sel)){
        if(!o.a.s){sel.a.x=o.a.x+dx;sel.a.y=o.a.y+dy}
        if(!o.b.s){sel.b.x=o.b.x+dx;sel.b.y=o.b.y+dy}
      }else{sel.x=snap(o.x+dx);sel.y=snap(o.y+dy)}
    }else if(d.k==="handle"&&sel){
      if(d.h==="br"){sel.w=Math.max(30,snap(w[0]-sel.x));sel.h=Math.max(20,snap(w[1]-sel.y))}
      else{const end=d.h==="a"?"a":"b",other=end==="a"?"b":"a",hs=hitShape(m,w[0],w[1],sel[other].s);sel[end]={s:hs?hs.id:null,x:w[0],y:w[1]}}
    }
    paint();
  };
  svg.onpointerup=svg.onpointercancel=e=>{
    const d=cur&&cur.drag;if(!d)return;cur.drag=null;
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
  svg.ondblclick=e=>{
    const t=document.elementFromPoint(e.clientX,e.clientY),g=t&&t.closest&&t.closest("#wbsvg [data-id]");
    if(g)startEdit(g.dataset.id);
  };
  svg.onwheel=e=>{
    e.preventDefault();
    const r=svg.getBoundingClientRect(),v=cur.view,k=Math.min(3,Math.max(.25,v.k*(e.deltaY<0?1.1:1/1.1)));
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    v.x=mx-(mx-v.x)*k/v.k;v.y=my-(my-v.y)*k/v.k;v.k=k;paint();
  };
  document.addEventListener("keydown",e=>{
    if(!dlg.open||!cur||cur.editing||e.target===edit)return;
    const mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();
    if(mod&&k==="z"){e.preventDefault();e.shiftKey?redo():undo()}
    else if(mod&&k==="y"){e.preventDefault();redo()}
    else if(mod&&k==="d"&&cur.sel){
      e.preventDefault();const s=byId(cur.m,cur.sel);if(!s)return;snapshot();
      const c=JSON.parse(JSON.stringify(s));c.id=uid();
      if(isArrow(c)){[c.a,c.b].forEach(p=>{p.s=null});const [p,q]=ends(cur.m,s);c.a.x=p[0]+20;c.a.y=p[1]+20;c.b.x=q[0]+20;c.b.y=q[1]+20}else{c.x+=20;c.y+=20}
      cur.m.els.push(c);cur.sel=c.id;save();
    }
    else if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();del()}
    else if(e.key==="Enter"&&cur.sel){e.preventDefault();startEdit(cur.sel)}
    else if(!mod){
      const map={v:"select",r:"rect",d:"db",e:"ell",t:"text",a:"arrow",b:"bi",l:"line"};
      if(map[k]&&!e.target.matches("input,textarea,select"))setTool(map[k]);
    }
  });
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
function showEval(msg){
  const box=dlg.querySelector("#wbeval");box.textContent="";box.hidden=false;
  const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n};
  const top=el("div","top"),close=el("button",null,"Close");close.onclick=()=>{box.hidden=true};
  top.appendChild(el("b",null,"AI evaluation"));top.appendChild(close);box.appendChild(top);
  if(msg){box.appendChild(el("p",msg.busy?"meta busy":msg.warn?"warn":"meta",msg.text));return}
  const d=cur.eval;if(!d)return;
  const ev=d.evaluation,list=(title,items)=>{if(!items.length)return;box.appendChild(el("h4",null,title));const u=el("ul");items.forEach(i=>u.appendChild(el("li",null,i)));box.appendChild(u)};
  box.appendChild(el("span","score",ev.score+" / 5"));
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
  cur={id,m:{els:b?JSON.parse(JSON.stringify(b.els)):[]},view:b&&b.view?{...b.view}:{x:40,y:40,k:1},sel:null,tool:"select",undo:[],redo:[],color:"none",drag:null,editing:null};
  cur.eval=b&&b.eval;cur.notes=opts.notes||null;cur.evalBusy=false;
  ui.onClose=opts.onClose||null;
  dlg.querySelector("#wbeval").hidden=true;
  dlg.querySelector("#wbt").textContent=title||"Whiteboard";
  clearInterval(timerIv);timerEl.textContent="";
  if(opts.timer){const t=()=>{timerEl.textContent=opts.timer()};t();timerIv=setInterval(t,1000)}
  dlg.showModal();paint();
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

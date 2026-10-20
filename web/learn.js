// Learning tab: self-paced tracks (Graphs first). Each lesson teaches (text, templates, step-through visualizers, drills)
// and then practices (code exercises run in the browser worker, quick checks, written answers reviewed by AI).
// Progress, notes, drafts and review dates stay in localStorage.
// Depends on globals from index.html: $, el, today, isDue, INTERVALS, apiFetch, errMsg, readStream, loadCM, makeEditor,
// formatCode, runTests, summarize, DATA, DN, progress (LeetCode), openPractice, openLearn; and LEARN_TRACKS from learn_data.js.
(function(){
  const PKEY="learn-progress-v1"; // also read by the Export progress button in index.html
  const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  let prog=readJSON(PKEY,{});
  if(!prog||typeof prog!=="object"||Array.isArray(prog))prog={};
  if(!prog.lessons||typeof prog.lessons!=="object")prog.lessons={};
  if(!prog.drill||typeof prog.drill!=="object")prog.drill={right:0,total:0,streak:0,best:0};
  const save=()=>writeJSON(PKEY,prog);
  const lkey=(t,l)=>t.id+"/"+l.id;
  const lp=(t,l)=>prog.lessons[lkey(t,l)]||(prog.lessons[lkey(t,l)]={done:false,times:0,parts:{}});
  const peekLp=(t,l)=>prog.lessons[lkey(t,l)]||{done:false,times:0,parts:{}};
  const pp=(t,l,p)=>{const x=lp(t,l);if(!x.parts)x.parts={};return x.parts[p.id]||(x.parts[p.id]={})};
  const partsDone=(t,l)=>{const x=peekLp(t,l).parts||{};return l.parts.filter(p=>x[p.id]&&x[p.id].ok).length};
  const fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
  const btn=(text,fn,cls)=>{const b=el("button",cls||null,text);b.type="button";if(fn)b.onclick=fn;return b};
  const root=()=>$("tab-learn");
  const trackById=id=>LEARN_TRACKS.find(t=>t.id===id);
  const daysUntilDue=x=>{if(!x.done||!x.last)return null;const gap=INTERVALS[Math.min(Math.max(x.times,1),3)-1];return Math.ceil(gap-(Date.parse(today())-Date.parse(x.last))/864e5)};

  const css=`
.lr{--lr-read:720px;max-width:1180px;margin:0 auto;padding:28px 20px 80px;color:var(--fg)}
.lr h1,.lr h2,.lr h3,.lr h4{letter-spacing:-.01em}
.lr .crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin-bottom:18px}
.lr .crumbs a{color:var(--muted);text-decoration:none;cursor:pointer}.lr .crumbs a:hover{color:var(--accent)}
.lr .crumbs .sp{flex:1}
.lr button{cursor:pointer}
.lr .sub{color:var(--muted);line-height:1.5;margin:0 0 16px}
.lr .ghost{background:none;border:1px solid var(--line);color:var(--fg);border-radius:999px;padding:6px 14px;font-weight:600}
.lr .ghost:hover{border-color:var(--accent);color:var(--accent)}
.lr .cta{background:var(--accent);color:#fff;border:0;border-radius:999px;padding:10px 20px;font-weight:700;font-size:15px;box-shadow:0 6px 20px -8px var(--accent)}
.lr .cta:hover{filter:brightness(1.08)}
.lr .pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--head);color:var(--muted);white-space:nowrap}
.lr .pill.ok{background:var(--easy-bg);color:var(--easy)}.lr .pill.due{background:var(--med-bg);color:var(--med)}.lr .pill.flag{background:var(--hard-bg);color:var(--hard)}.lr .pill.acc{background:var(--accent-soft);color:var(--accent)}
/* home */
.lr-home h1{font-size:34px;margin:0 0 6px}.lr-home .lede{color:var(--muted);font-size:17px;max-width:620px;margin:0 0 28px;line-height:1.5}
.lr-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.lr-card{position:relative;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px;transition:transform .15s,box-shadow .15s,border-color .15s;color:var(--fg);font:inherit}
.lr-card:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 12px 30px -16px var(--accent)}
.lr-card .ic{font-size:30px}.lr-card h3{margin:0;font-size:20px}.lr-card p{margin:0;color:var(--muted);line-height:1.45}
.lr-card .bot{display:flex;align-items:center;gap:10px;margin-top:6px}
.lr-card.soon{border-style:dashed;background:none;cursor:default}.lr-card.soon:hover{transform:none;box-shadow:none;border-color:var(--line)}
.lr-bar{height:6px;border-radius:99px;background:var(--head);overflow:hidden;flex:1}.lr-bar i{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .4s}
.lr-cont{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:linear-gradient(120deg,var(--accent-soft),transparent);border:1px solid var(--line);border-radius:16px;padding:16px 20px;margin-bottom:24px}
.lr-cont .t{flex:1;min-width:200px}.lr-cont .t small{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}.lr-cont .t b{font-size:17px}
/* track */
.lr-hero{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:28px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:28px 32px;margin-bottom:30px;position:relative;overflow:hidden}
.lr-hero::after{content:"";position:absolute;right:-80px;top:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(var(--accent-soft),transparent 70%);pointer-events:none}
.lr-hero h1{margin:0 0 8px;font-size:32px}.lr-hero .tag{color:var(--muted);font-size:16px;line-height:1.5;margin:0 0 16px}
.lr-hero ul{list-style:none;margin:0 0 20px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px 18px}
.lr-hero li{padding-left:24px;position:relative;line-height:1.4;font-size:14px}.lr-hero li::before{content:"✓";position:absolute;left:0;color:var(--easy);font-weight:700}
.lr-ring{display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;z-index:1}
.lr-ring svg{width:150px;height:150px}.lr-ring .num{font-size:30px;font-weight:800}.lr-ring .lab{fill:var(--muted);font-size:11px}
.lr-ring .stats{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted);text-align:center}
@media(max-width:760px){.lr-hero{grid-template-columns:1fr;padding:22px}}
.lr-sec{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;margin:34px 0 14px}
.lr-path{position:relative;display:flex;flex-direction:column;gap:14px;padding-left:0}
.lr-step{display:grid;grid-template-columns:56px minmax(0,1fr);gap:14px;align-items:stretch;position:relative}
.lr-step .rail{position:relative;display:flex;justify-content:center}
.lr-step .rail::before{content:"";position:absolute;top:0;bottom:-14px;left:50%;width:2px;transform:translateX(-50%);background:var(--line)}
.lr-step:last-child .rail::before{bottom:50%}.lr-step:first-child .rail::before{top:28px}
.lr-step.done .rail::before{background:var(--easy)}
.lr-node{position:relative;z-index:1;width:44px;height:44px;margin-top:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;background:var(--surface);border:2px solid var(--line);color:var(--muted);font-size:15px}
.lr-step.done .lr-node{background:var(--easy);border-color:var(--easy);color:#fff}
.lr-step.cur .lr-node{border-color:var(--accent);color:var(--accent);box-shadow:0 0 0 6px var(--accent-soft)}
.lr-step.check .lr-node{border-radius:12px;transform:rotate(45deg)}.lr-step.check .lr-node span{transform:rotate(-45deg)}
.lr-lc{display:block;width:100%;text-align:left;font:inherit;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 20px;transition:border-color .15s,transform .15s}
.lr-lc:hover{border-color:var(--accent);transform:translateX(3px);background:var(--surface)}
.lr-lc .eb{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lr-lc h3{margin:4px 0 4px;font-size:18px}.lr-lc p{margin:0 0 10px;color:var(--muted);line-height:1.45;font-size:14px}
.lr-lc .meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.lr-lc .meta .lr-bar{max-width:140px;min-width:80px}
.lr-step.check .lr-lc{background:linear-gradient(120deg,var(--accent-soft),var(--surface) 60%)}
.lr-ready{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.lr-prob{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.lr-prob.done{border-color:color-mix(in srgb,var(--easy) 50%,var(--line))}
.lr-prob .h{display:flex;gap:8px;align-items:baseline}.lr-prob .h b{flex:1;line-height:1.3}
.lr-prob .via{font-size:12px;color:var(--muted)}.lr-prob .via a{color:var(--accent);cursor:pointer}
.lr-prob .acts{display:flex;gap:6px}
.lr-prob .acts button{flex:1;border:1px solid var(--line);background:var(--head);border-radius:9px;padding:6px 8px;font-weight:600;color:var(--fg);font-size:13px}
.lr-prob .acts button:hover{border-color:var(--accent);color:var(--accent)}
.d-E{color:var(--easy)}.d-M{color:var(--med)}.d-H{color:var(--hard)}
/* lesson */
.lr-lhead{max-width:var(--lr-read);margin-bottom:26px}
.lr-lhead .no{font-size:13px;font-weight:800;color:var(--accent);letter-spacing:.08em;text-transform:uppercase}
.lr-lhead h1{font-size:36px;line-height:1.15;margin:6px 0 10px}.lr-lhead .goal{font-size:18px;color:var(--muted);line-height:1.5;margin:0 0 16px}
.lr-lhead .acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.lr-lhead .acts .info{color:var(--muted);font-size:13px}
.lr-flag.on{border-color:var(--hard);color:var(--hard);background:var(--hard-bg)}
.lr-done-b.on{border-color:var(--easy);color:var(--easy);background:var(--easy-bg)}
.lr-done-b.nudge{animation:lrpulse 1.6s ease-in-out infinite}
@keyframes lrpulse{0%,100%{box-shadow:0 0 0 0 var(--accent-soft)}50%{box-shadow:0 0 0 8px var(--accent-soft)}}
.lr-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:40px;align-items:start}
@media(max-width:1000px){.lr-grid{grid-template-columns:minmax(0,1fr)}.lr-aside{position:static!important;order:-1}}
.lr-main{min-width:0}
.lr-read{max-width:var(--lr-read);font-size:16px;line-height:1.7}
.lr-read>p,.lr-read .md p{margin:0 0 14px}
.lr-read h3{font-size:21px;margin:30px 0 10px}.lr-read h4{font-size:17px;margin:22px 0 8px}
.lr-read ul,.lr-read ol{margin:0 0 16px;padding-left:22px}.lr-read li{margin:4px 0}
.lr-read code,.lr-md code{font:.88em ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--head);border:1px solid var(--line);border-radius:5px;padding:1px 5px}
.lr-pre{background:var(--head);border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow-x:auto;margin:0 0 16px;line-height:1.5}
.lr-pre code{background:none!important;border:0!important;padding:0!important;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}
.lr-tbl{overflow-x:auto;margin:0 0 18px;border:1px solid var(--line);border-radius:12px}
.lr-tbl table{border-collapse:collapse;width:100%;min-width:0;font-size:14px;line-height:1.45}
.lr-tbl th{background:var(--head);text-align:left;font-weight:700;padding:9px 12px;border-bottom:1px solid var(--line);position:static}
.lr-tbl td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}.lr-tbl tr:last-child td{border-bottom:0}
.lr-call{display:flex;gap:12px;border-radius:12px;padding:14px 16px;margin:0 0 18px;line-height:1.55;font-size:15px}
.lr-call .i{font-size:18px;line-height:1.3}
.lr-call.tip{background:var(--accent-soft);border-left:3px solid var(--accent)}
.lr-call.warn{background:var(--med-bg);border-left:3px solid var(--med)}
.lr-tpl{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:0 0 20px;background:var(--surface)}
.lr-tpl .th{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--head);border-bottom:1px solid var(--line);font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.lr-tpl .th b{flex:1;color:var(--fg);text-transform:none;letter-spacing:0;font-size:13px}
.lr-tpl .th button{border:1px solid var(--line);background:var(--surface);border-radius:7px;padding:2px 9px;font-size:12px;color:var(--fg)}
.lr-tpl pre{margin:0;padding:14px 16px;overflow-x:auto;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;transition:filter .3s}
.lr .cm{color:var(--muted);font-style:italic}.lr .kw{color:var(--accent);font-weight:600}
.lr-sol pre{font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
.lr.drilling .lr-tpl pre,.lr.drilling .lr-sol pre{filter:blur(6px);user-select:none;pointer-events:none}
.lr.drilling .lr-tpl .th::after{content:"hidden while you drill";font-weight:600;text-transform:none;letter-spacing:0;color:var(--med)}
.lr-aside{position:sticky;top:calc(var(--nav-h) + 20px);display:flex;flex-direction:column;gap:16px}
.lr-box{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.lr-box h5{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.lr-toc{display:flex;flex-direction:column;gap:2px}
.lr-toc a{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:7px;color:var(--fg);text-decoration:none;font-size:13px;cursor:pointer;line-height:1.3}
.lr-toc a:hover{background:var(--head)}
.lr-toc .dot{width:16px;height:16px;flex:none;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff}
.lr-toc .dot.ok{background:var(--easy);border-color:var(--easy)}
.lr-toc .sub{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin:8px 6px 2px}
.lr-note textarea{width:100%;box-sizing:border-box;min-height:140px;resize:vertical;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);padding:10px;font:14px/1.5 inherit}
.lr-note .s{font-size:12px;color:var(--muted);margin-top:4px;min-height:16px}
.lr-tutor-b{width:100%;padding:10px;border-radius:12px;border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:700}
.lr-h2{display:flex;align-items:center;gap:12px;font-size:24px;margin:44px 0 6px}
.lr-h2::after{content:"";flex:1;height:1px;background:var(--line)}
.lr-h2+.sub{color:var(--muted);margin:0 0 18px}
/* visualizer */
.lr-viz{border:1px solid var(--line);border-radius:16px;background:var(--surface);margin:6px 0 22px;overflow:hidden}
.lr-viz .vt{padding:10px 14px;font-size:13px;font-weight:700;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:center}
.lr-viz .vt span{color:var(--muted);font-weight:600;margin-left:auto;font-variant-numeric:tabular-nums}
.lr-viz .vb{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:0}
@media(max-width:700px){.lr-viz .vb{grid-template-columns:1fr}}
.lr-viz svg{display:block;width:100%;height:auto;max-height:290px;background:radial-gradient(circle at 50% 40%,var(--accent-soft),transparent 75%)}
.lr-viz .side{border-left:1px solid var(--line);padding:12px;display:flex;flex-direction:column;gap:12px;font-size:13px;min-width:0}
@media(max-width:700px){.lr-viz .side{border-left:0;border-top:1px solid var(--line)}}
.lr-viz .side h6{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.lr-viz .chips{display:flex;flex-wrap:wrap;gap:4px;min-height:26px}
.lr-viz .chips span{font:600 12px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:7px;background:var(--head);border:1px solid var(--line);animation:lrin .25s ease}
.lr-viz .chips span.hot{background:var(--accent);color:#fff;border-color:var(--accent)}
.lr-viz .chips em{color:var(--muted);font-style:normal;font-size:12px}
@keyframes lrin{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
.lr-viz .cap{padding:12px 14px;border-top:1px solid var(--line);min-height:44px;font-size:14px;line-height:1.5;background:var(--head)}
.lr-viz .ctl{display:flex;gap:6px;padding:10px 14px;border-top:1px solid var(--line);align-items:center;flex-wrap:wrap}
.lr-viz .ctl button{border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:9px;padding:5px 12px;font-weight:600}
.lr-viz .ctl button.play{background:var(--accent);border-color:var(--accent);color:#fff;min-width:84px}
.lr-viz .ctl input{flex:1;min-width:120px;accent-color:var(--accent)}
.lr-viz .adjtab{font:12.5px/1.6 ui-monospace,Menlo,monospace}
.lr-viz .adjtab div{padding:0 6px;border-radius:6px}.lr-viz .adjtab div.on{background:var(--accent-soft);color:var(--accent);font-weight:700}
.lr-viz table.mx{border-collapse:collapse;min-width:0;font:12px ui-monospace,Menlo,monospace}
.lr-viz table.mx td,.lr-viz table.mx th{width:20px;height:20px;text-align:center;padding:0;border:1px solid var(--line);position:static;background:none}
.lr-viz table.mx th{color:var(--muted);font-weight:600}
.lr-viz table.mx tr.on td{background:var(--accent-soft);color:var(--accent);font-weight:700}
.lr-viz table.mx td.one{font-weight:700}
.vz-e{stroke:var(--muted);stroke-width:.55;opacity:.55;transition:all .25s}
.vz-e.tree{stroke:var(--accent);opacity:.95;stroke-width:.9}
.vz-e.act{stroke:var(--med);opacity:1;stroke-width:1.2}
.vz-e.gone{opacity:.13;stroke-dasharray:1.2 1}
.vz-w{font:600 2.6px ui-sans-serif,system-ui;fill:var(--fg);paint-order:stroke;stroke:var(--surface);stroke-width:1.2;text-anchor:middle;dominant-baseline:central}
.vz-n circle{fill:var(--surface);stroke:var(--muted);stroke-width:.5;transition:fill .25s,stroke .25s}
.vz-n text{font:700 3px ui-sans-serif,system-ui;fill:var(--fg);text-anchor:middle;dominant-baseline:central;pointer-events:none}
.vz-n .lb{font:700 2.5px ui-monospace,Menlo,monospace;fill:var(--accent)}
.vz-n.fr circle{fill:var(--accent-soft);stroke:var(--accent);stroke-width:.7}
.vz-n.cur circle{fill:var(--accent);stroke:var(--accent)}.vz-n.cur text.v{fill:#fff}
.vz-n.done circle{fill:var(--easy-bg);stroke:var(--easy);stroke-width:.7}
.vz-n.c0 circle{fill:var(--accent);stroke:var(--accent)}.vz-n.c1 circle{fill:var(--easy);stroke:var(--easy)}.vz-n.c2 circle{fill:var(--med);stroke:var(--med)}.vz-n.c3 circle{fill:var(--hard);stroke:var(--hard)}
.vz-n.c0 text.v,.vz-n.c1 text.v,.vz-n.c2 text.v,.vz-n.c3 text.v{fill:#fff}
.vz-n.pick{cursor:pointer}.vz-n.pick:hover circle{stroke:var(--accent);stroke-width:.9}
.vz-n.sel circle{fill:var(--accent);stroke:var(--accent)}.vz-n.sel text.v{fill:#fff}
.vz-n.nb circle{fill:var(--accent-soft);stroke:var(--accent)}
.vz-arrow{fill:var(--muted)}
/* drill */
.lr-drill{border:1px solid var(--line);border-radius:16px;background:var(--surface);margin:6px 0 22px;overflow:hidden}
.lr-drill .dh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line)}
.lr-drill .seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden}
.lr-drill .seg button{border:0;border-radius:0;background:none;padding:5px 11px;font-weight:600;color:var(--muted)}
.lr-drill .seg button.on{background:var(--accent-soft);color:var(--accent)}
.lr-drill .dh .sp{flex:1}.lr-drill .dh .st{font-size:13px;color:var(--muted)}
.lr-drill .db{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0}
@media(max-width:700px){.lr-drill .db{grid-template-columns:1fr}}
.lr-drill .pic{border-right:1px solid var(--line);display:flex;align-items:center;justify-content:center;min-height:220px}
.lr-drill .pic svg{width:100%;height:auto;max-height:300px;display:block}
.lr-drill .vz-n text.v{font-size:4.2px}.lr-drill .vz-e{stroke-width:.7}
.lr-drill .pic pre{font:14px/1.7 ui-monospace,Menlo,monospace;margin:16px}
.lr-drill .rows{padding:14px;display:flex;flex-direction:column;gap:6px}
.lr-drill .row{display:flex;align-items:center;gap:8px;font:14px ui-monospace,Menlo,monospace}
.lr-drill .row label{width:56px;text-align:right;color:var(--muted)}
.lr-drill .row input{flex:1;min-width:0;font:14px ui-monospace,Menlo,monospace;padding:6px 9px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
.lr-drill .row.ok input{border-color:var(--easy);background:var(--easy-bg)}.lr-drill .row.no input{border-color:var(--hard);background:var(--hard-bg)}
.lr-drill .row .fix{font-size:12px;color:var(--hard);min-width:70px}
.lr-drill .acts{display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap}
.lr-drill .msg{font-weight:600}.lr-drill .msg.ok{color:var(--easy)}.lr-drill .msg.no{color:var(--hard)}
/* practice */
.lr-parts{display:flex;flex-direction:column;gap:18px}
.lr-part{border:1px solid var(--line);border-radius:18px;background:var(--surface);overflow:hidden;transition:border-color .3s,box-shadow .3s;scroll-margin-top:calc(var(--nav-h) + 16px)}
.lr-part.ok{border-color:color-mix(in srgb,var(--easy) 55%,var(--line))}
.lr-part.flash{box-shadow:0 0 0 4px var(--easy-bg)}
.lr-ph{display:flex;align-items:center;gap:14px;padding:14px 18px}
.lr-ph .n{width:34px;height:34px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;background:var(--head);color:var(--muted);transition:all .3s}
.lr-part.ok .lr-ph .n{background:var(--easy);color:#fff}
.lr-ph .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--accent)}
.lr-ph h4{margin:2px 0 0;font-size:17px}
.lr-ph .tt{flex:1;min-width:0}.lr-ph .st{font-size:12.5px;color:var(--muted);text-align:right}
.lr-pb{padding:0 18px 18px}
.lr-md{line-height:1.6;font-size:15px}.lr-md p{margin:0 0 10px}.lr-md ul,.lr-md ol{margin:0 0 10px;padding-left:22px}
.lr-md h3,.lr-md h4{font-size:15px;margin:12px 0 6px}
.lr-ed{margin:12px 0 0}
.lr-ed .CodeMirror{height:300px;border:1px solid var(--line);border-radius:12px;font-size:13px}
.lr-ed .ph{height:300px;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;margin:0;padding:10px 14px;font:13px/1.5 ui-monospace,Menlo,monospace;color:var(--muted);overflow:hidden}
.lr-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
.lr-tools button{border:1px solid var(--line);background:var(--head);color:var(--fg);border-radius:9px;padding:6px 12px;font-weight:600;font-size:13px}
.lr-tools button:hover{border-color:var(--accent)}
.lr-tools button.run{background:var(--accent);border-color:var(--accent);color:#fff}
.lr-tools button.arm{border-color:var(--med);color:var(--med)}
.lr-tools button.on{background:var(--hard);border-color:var(--hard);color:#fff}
.lr-exp .meta{display:block;margin-top:6px;font-size:12px;color:var(--muted)}
.lr-tools .sp{flex:1}.lr-tools .tm{font:700 14px ui-monospace,Menlo,monospace;color:var(--med)}
.lr-hintbox{margin-top:12px}
.lr-sol{margin-top:12px}.lr-sol .lr-pre{margin:0}
.lr-res{margin-top:12px;display:flex;flex-direction:column;gap:6px}
.lr-res .sum{font-weight:700;display:flex;align-items:center;gap:10px}
.lr-res .sum.ok{color:var(--easy)}.lr-res .sum.no{color:var(--hard)}
.lr-res .dots{display:flex;gap:4px;flex-wrap:wrap}.lr-res .dots i{width:10px;height:10px;border-radius:50%;background:var(--hard)}.lr-res .dots i.ok{background:var(--easy)}
.lr-res details{border:1px solid var(--line);border-radius:10px;padding:6px 10px;font-size:13px}
.lr-res details summary{cursor:pointer;font-weight:600}
.lr-res pre{margin:6px 0 0;white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,Menlo,monospace;background:var(--head);border-radius:8px;padding:8px 10px}
.lr-res .con{font:12px/1.5 ui-monospace,Menlo,monospace;background:var(--head);border-radius:8px;padding:8px 10px;white-space:pre-wrap;max-height:160px;overflow:auto}
.lr-ai{margin-top:14px;border:1px solid var(--accent);border-radius:14px;padding:14px 16px;background:linear-gradient(160deg,var(--accent-soft),transparent 60%)}
.lr-ai .hd{font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:var(--accent);margin-bottom:6px}
.lr-ai.busy .hd::after{content:" · thinking…";color:var(--muted)}
.lr-ai .warn{color:var(--hard)}
.lr-quiz .q{font-size:16px;font-weight:600;line-height:1.5;margin:0 0 12px}
.lr-opts{display:flex;flex-direction:column;gap:8px}
.lr-opt{text-align:left;font:inherit;font-size:15px;color:var(--fg);background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:11px 14px;display:flex;gap:12px;align-items:flex-start;transition:border-color .15s,background .15s}
.lr-opt:hover:not(:disabled){border-color:var(--accent)}
.lr-opt .l{width:24px;height:24px;flex:none;border-radius:50%;border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--muted)}
.lr-opt.right{border-color:var(--easy);background:var(--easy-bg)}.lr-opt.right .l{background:var(--easy);border-color:var(--easy);color:#fff}
.lr-opt.wrong{border-color:var(--hard);background:var(--hard-bg)}.lr-opt.wrong .l{background:var(--hard);border-color:var(--hard);color:#fff}
.lr-opt:disabled{cursor:default}
.lr-why{margin-top:12px;border-radius:12px;padding:12px 14px;line-height:1.55;font-size:14.5px}
.lr-why.ok{background:var(--easy-bg)}.lr-why.no{background:var(--hard-bg)}
.lr-why b{display:block;margin-bottom:2px}
.lr-exp textarea{width:100%;box-sizing:border-box;min-height:150px;resize:vertical;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);padding:12px 14px;font:15px/1.6 inherit;margin-top:10px}
.lr-exp .cnt{font-size:12px;color:var(--muted)}
.lr-next{display:flex;flex-direction:column;gap:14px;margin-top:10px}
.lr-chips{display:flex;flex-wrap:wrap;gap:8px}
.lr-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:6px 6px 6px 14px;font-size:14px}
.lr-chip.done{border-color:var(--easy)}
.lr-chip button{border:0;background:var(--head);border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700;color:var(--fg)}
.lr-chip button:hover{background:var(--accent-soft);color:var(--accent)}
.lr-nextl{display:flex;align-items:center;gap:16px;text-align:left;font:inherit;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 22px;width:100%}
.lr-nextl:hover{border-color:var(--accent)}
.lr-nextl small{display:block;color:var(--muted);font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
.lr-nextl b{font-size:18px}.lr-nextl .ar{margin-left:auto;font-size:22px;color:var(--accent)}
/* tutor drawer */
.lr-drawer{position:fixed;top:var(--nav-h);right:0;bottom:0;width:min(420px,100vw);z-index:5;background:var(--surface);border-left:1px solid var(--line);box-shadow:-20px 0 40px -20px rgba(0,0,0,.35);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .25s cubic-bezier(.4,0,.2,1)}
.lr-drawer.open{transform:none}
.lr-drawer .dh{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--line)}
.lr-drawer .dh b{flex:1}.lr-drawer .dh small{display:block;color:var(--muted);font-weight:500;font-size:12px}
.lr-drawer .dh button{border:1px solid var(--line);background:none;color:var(--fg);border-radius:8px;padding:4px 10px}
.lr-drawer .msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.lr-drawer .m{max-width:92%;border-radius:14px;padding:10px 13px;font-size:14px;line-height:1.55}
.lr-drawer .m.u{align-self:flex-end;background:var(--accent);color:#fff;white-space:pre-wrap}
.lr-drawer .m.a{align-self:flex-start;background:var(--head)}
.lr-drawer .m.a .lr-pre{margin:6px 0}.lr-drawer .m.a p:last-child{margin-bottom:0}
.lr-drawer .m.busy::after{content:"…";animation:lrblink 1s infinite}
@keyframes lrblink{50%{opacity:.2}}
.lr-drawer .empty{color:var(--muted);font-size:14px;line-height:1.5}
.lr-drawer .sugg{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.lr-drawer .sugg button{text-align:left;border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:8px 10px;font-size:13px}
.lr-drawer .sugg button:hover{border-color:var(--accent)}
.lr-drawer form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}
.lr-drawer textarea{flex:1;resize:none;height:60px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);padding:8px 10px;font:14px/1.4 inherit}
.lr-drawer form button{border:0;background:var(--accent);color:#fff;border-radius:10px;padding:0 16px;font-weight:700}
.lr-drawer .ctx{font-size:12px;color:var(--muted);padding:0 16px 8px}
.lr-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;background:var(--fg);color:var(--bg);padding:10px 18px;border-radius:999px;font-weight:700;z-index:6;transition:all .3s;pointer-events:none}
.lr-toast.on{opacity:1;transform:translate(-50%,0)}
`;

  // ---------- small helpers ----------
  function toast(msg){
    let t=document.querySelector(".lr-toast");
    if(!t){t=el("div","lr-toast");document.body.appendChild(t)}
    t.textContent=msg;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),2400);
  }
  const inline=(parent,t)=>{
    t.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/).forEach(seg=>{
      if(!seg)return;
      if(seg.length>2&&seg[0]==="`")parent.appendChild(el("code",null,seg.slice(1,-1)));
      else if(seg.length>4&&seg.startsWith("**"))parent.appendChild(el("strong",null,seg.slice(2,-2)));
      else parent.appendChild(document.createTextNode(seg));
    });
  };
  // Markdown subset for lessons and AI replies: headings, paragraphs, lists, tables, fenced code, `code`, **bold**.
  const LIST=/^\s*([-*]|\d+[.)])\s+(.*)/,TABLE=/^\s*\|/,FENCE=/^\s*```/,HEAD=/^(#{1,4})\s+(.*)/;
  function md(text){
    const frag=document.createDocumentFragment(),lines=String(text).split("\n");let i=0;
    while(i<lines.length){
      const line=lines[i];let m;
      if(FENCE.test(line)){
        const buf=[];i++;
        while(i<lines.length&&!FENCE.test(lines[i]))buf.push(lines[i++]);
        i++;const pre=el("pre","lr-pre");pre.appendChild(el("code",null,buf.join("\n")));frag.appendChild(pre);continue;
      }
      if(!line.trim()){i++;continue}
      if((m=line.match(HEAD))){const h=el(m[1].length<=2?"h3":"h4");inline(h,m[2]);frag.appendChild(h);i++;continue}
      if(TABLE.test(line)){
        const rows=[];
        while(i<lines.length&&TABLE.test(lines[i]))rows.push(lines[i++].trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim()));
        const wrap=el("div","lr-tbl"),tb=el("table");wrap.appendChild(tb);
        rows.forEach((cells,k)=>{
          if(cells.every(c=>/^:?-{2,}:?$/.test(c)))return;
          const tr=el("tr");cells.forEach(c=>{const td=el(k===0?"th":"td");inline(td,c);tr.appendChild(td)});tb.appendChild(tr);
        });
        frag.appendChild(wrap);continue;
      }
      if((m=line.match(LIST))){
        const ord=/^\s*\d/.test(line),list=el(ord?"ol":"ul");
        while(i<lines.length&&(m=lines[i].match(LIST))&&/^\s*\d/.test(lines[i])===ord){const li=el("li");inline(li,m[2]);list.appendChild(li);i++}
        frag.appendChild(list);continue;
      }
      const buf=[];
      while(i<lines.length&&lines[i].trim()&&!(FENCE.test(lines[i])||HEAD.test(lines[i])||TABLE.test(lines[i])||LIST.test(lines[i])))buf.push(lines[i++]);
      const p=el("p");inline(p,buf.join(" "));frag.appendChild(p);
    }
    return frag;
  }
  const mdEl=(text,cls)=>{const d=el("div",cls||"lr-md");d.appendChild(md(text));return d};
  // Light syntax coloring for read-only templates: comments and a few keywords.
  function codeEl(src){
    const pre=el("pre");
    src.split("\n").forEach((line,k)=>{
      if(k)pre.appendChild(document.createTextNode("\n"));
      const c=line.search(/\/\/|--\s/),code=c<0?line:line.slice(0,c);
      code.split(/\b(const|let|function|for|while|if|else|return|class|new|of|continue|break|this|MATCH|WHERE|RETURN|SELECT|FROM|JOIN|ON|AND|NOT|IN|GROUP BY|ORDER BY|AS|COUNT)\b/).forEach((s,j)=>{
        if(!s)return;
        pre.appendChild(j%2?el("span","kw",s):document.createTextNode(s));
      });
      if(c>=0)pre.appendChild(el("span","cm",line.slice(c)));
    });
    return pre;
  }

  // ---------- graph drawing ----------
  let svgSeq=0;
  const NS="http://www.w3.org/2000/svg";
  const sv=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(parent)parent.appendChild(n);return n};
  // Draws graph g; returns {svg, nodes[], edges[] (each {u,v,w,line}), setNode(i, cls, label), setEdge(i, cls)}.
  function drawGraph(g){
    const id="lrm"+(++svgSeq),R=g.r||(g.labels?4.6:3.6);
    const svg=sv("svg",{viewBox:g.vb||"-6 -6 112 72",role:"img"});
    if(g.directed){
      const defs=sv("defs",{},svg),mk=sv("marker",{id,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"3.2",markerHeight:"3.2",markerUnits:"userSpaceOnUse",orient:"auto"},defs);
      sv("path",{d:"M0,0 L10,5 L0,10 z",class:"vz-arrow"},mk);
    }
    const P=g.pos,edges=[],nodes=[];
    const eg=sv("g",{},svg),wg=sv("g",{},svg),ng=sv("g",{},svg);
    g.edges.forEach(([u,v,w])=>{
      const [x1,y1]=P[u],[x2,y2]=P[v],dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
      const end=g.directed?R+.8:R;
      const line=sv("line",{x1:x1+ux*R,y1:y1+uy*R,x2:x2-ux*end,y2:y2-uy*end,class:"vz-e"},eg);
      if(g.directed)line.setAttribute("marker-end",`url(#${id})`);
      if(w!=null){const t=sv("text",{x:(x1+x2)/2-uy*2.4,y:(y1+y2)/2+ux*2.4,class:"vz-w"},wg);t.textContent=w}
      edges.push({u,v,w,line});
    });
    for(let i=0;i<g.n;i++){
      const gr=sv("g",{class:"vz-n"},ng),[x,y]=P[i];
      sv("circle",{cx:x,cy:y,r:R},gr);
      const t=sv("text",{x,y,class:"v"},gr);t.textContent=g.labels?g.labels[i]:i;
      const lb=sv("text",{x,y:y+R+2.8,class:"lb"},gr);
      nodes.push({g:gr,lb});
    }
    return {svg,nodes,edges,
      setNode:(i,cls,label)=>{nodes[i].g.setAttribute("class","vz-n"+(cls?" "+cls:""));nodes[i].lb.textContent=label==null?"":label},
      setEdge:(i,cls)=>edges[i].line.setAttribute("class","vz-e"+(cls?" "+cls:""))};
  }
  const edgeIndex=(g,u,v)=>g.edges.findIndex(e=>(e[0]===u&&e[1]===v)||(!g.directed&&e[0]===v&&e[1]===u));
  const adjOf=g=>{
    const adj=Array.from({length:g.n},()=>[]);
    g.edges.forEach(([u,v,w])=>{adj[u].push(w==null?v:[v,w]);if(!g.directed)adj[v].push(w==null?u:[u,w])});
    adj.forEach(a=>a.sort((x,y)=>(Array.isArray(x)?x[0]:x)-(Array.isArray(y)?y[0]:y)));
    return adj;
  };

  // Step generators: each returns a list of frames {cls[], lab[], tree:Set, gone:Set, act, ds:{t, items, hot}, out:{t, items}, say}.
  function stepper(g){
    const frames=[],cls=new Array(g.n).fill(""),lab=new Array(g.n).fill(""),tree=new Set(),gone=new Set();
    const snap=(say,act,ds,out)=>frames.push({cls:[...cls],lab:[...lab],tree:new Set(tree),gone:new Set(gone),act:act==null?-1:act,ds,out,say});
    return {frames,cls,lab,tree,gone,snap};
  }
  const GEN={
    dfs(g,s){
      const S=stepper(g),adj=adjOf(g),seen=new Array(g.n).fill(false),stack=[],order=[];
      const ds=()=>({t:"Call stack (top on the right)",items:[...stack],hot:stack.length-1}),out=()=>({t:"Visit order",items:[...order]});
      const go=(u,from)=>{
        seen[u]=true;stack.push(u);order.push(u);
        stack.forEach(x=>S.cls[x]="fr");S.cls[u]="cur";
        if(from!=null)S.tree.add(edgeIndex(g,from,u));
        S.snap(from==null?`Start: call dfs(${u}). Mark ${u} visited and push it on the call stack.`:`Call dfs(${u}): mark ${u} visited and push it on the call stack.`,from==null?null:edgeIndex(g,from,u),ds(),out());
        for(const v of adj[u]){
          if(seen[v]){S.snap(`Look at ${u} → ${v}: ${v} is already visited, so skip it.${S.cls[v]==="fr"?" (Without a visited check, this would loop forever.)":""}`,edgeIndex(g,u,v),ds(),out());continue}
          S.snap(`Look at ${u} → ${v}: ${v} isn't visited yet, so go deeper.`,edgeIndex(g,u,v),ds(),out());
          S.cls[u]="fr";go(v,u);S.cls[u]="cur";
        }
        stack.pop();S.cls[u]="done";if(stack.length)S.cls[stack[stack.length-1]]="cur";
        S.snap(stack.length?`${u} has no unvisited neighbors left: return, popping ${u}. Back in dfs(${stack[stack.length-1]}).`:`${u} is finished and the stack is empty. Everything reachable from ${s} has been visited.`,null,ds(),out());
      };
      S.snap(`DFS from ${s}. Neighbors are tried in ascending order.`,null,ds(),out());
      go(s,null);
      return S.frames;
    },
    bfs(g,s){
      const S=stepper(g),adj=adjOf(g),dist=new Array(g.n).fill(-1),q=[s];let head=0;const order=[];
      const ds=()=>({t:"Queue (front on the left)",items:q.slice(head),hot:0}),out=()=>({t:"Dequeued order",items:[...order]});
      dist[s]=0;S.cls[s]="fr";S.lab[s]="d=0";
      S.snap(`Start: dist[${s}] = 0 and enqueue ${s}. Every other vertex is unseen.`,null,ds(),out());
      while(head<q.length){
        const u=q[head++];order.push(u);S.cls[u]="cur";
        S.snap(`Dequeue ${u} (distance ${dist[u]}) and look at its neighbors.`,null,ds(),out());
        for(const v of adj[u]){
          if(dist[v]!==-1){S.snap(`${u} → ${v}: ${v} was already seen, so skip it.`,edgeIndex(g,u,v),ds(),out());continue}
          dist[v]=dist[u]+1;q.push(v);S.cls[v]="fr";S.lab[v]="d="+dist[v];S.tree.add(edgeIndex(g,u,v));
          S.snap(`${u} → ${v}: first time we've seen ${v}. Set dist[${v}] = ${dist[u]} + 1 = ${dist[v]} and enqueue it (mark it now, not when it's dequeued).`,edgeIndex(g,u,v),ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap(`The queue is empty. The highlighted edges form the BFS tree, and each d is a shortest distance from ${s}.`,null,ds(),out());
      return S.frames;
    },
    components(g){
      const S=stepper(g),adj=adjOf(g),comp=new Array(g.n).fill(-1),groups=[];
      const out=()=>({t:"Components found",items:groups.map((m,k)=>`#${k+1}: ${m.join(",")}`)});
      S.snap("The outer loop walks the vertices 0, 1, 2, … and starts a DFS at each one that isn't visited yet.",null,null,out());
      for(let s=0;s<g.n;s++){
        if(comp[s]!==-1){S.snap(`Outer loop at ${s}: already in component #${comp[s]+1}, so skip it.`,null,null,out());continue}
        const k=groups.length;groups.push([]);
        const stack=[s];comp[s]=k;groups[k].push(s);S.cls[s]="c"+(k%4);
        S.snap(`Outer loop at ${s}: not visited, so start component #${k+1} here.`,null,null,out());
        while(stack.length){
          const u=stack.pop();
          for(const v of adj[u])if(comp[v]===-1){
            comp[v]=k;groups[k].push(v);stack.push(v);S.cls[v]="c"+(k%4);S.tree.add(edgeIndex(g,u,v));
            S.snap(`DFS reaches ${v} through ${u}, so it joins component #${k+1}.`,edgeIndex(g,u,v),null,out());
          }
        }
        groups[k].sort((a,b)=>a-b);
      }
      S.snap(`Done: ${groups.length} components, one for each time the outer loop had to start a new DFS.`,null,null,out());
      return S.frames;
    },
    topo(g){
      const S=stepper(g),adj=Array.from({length:g.n},()=>[]),indeg=new Array(g.n).fill(0);
      g.edges.forEach(([u,v])=>{adj[u].push(v);indeg[v]++});
      const q=[],order=[];let head=0;
      const ds=()=>({t:"Ready queue (in-degree 0)",items:q.slice(head),hot:0}),out=()=>({t:"Topological order",items:[...order]});
      for(let v=0;v<g.n;v++){S.lab[v]="in="+indeg[v];if(!indeg[v]){q.push(v);S.cls[v]="fr"}}
      S.snap(`Count each vertex's in-degree (shown as in=). Those at 0 (${q.join(", ")}) depend on nothing, so they go in the queue.`,null,ds(),out());
      while(head<q.length){
        const u=q[head++];order.push(u);S.cls[u]="cur";
        S.snap(`Take ${u} from the queue and append it to the order.`,null,ds(),out());
        for(const v of adj[u]){
          indeg[v]--;S.lab[v]="in="+indeg[v];const e=edgeIndex(g,u,v);S.gone.add(e);
          if(!indeg[v]){q.push(v);S.cls[v]="fr";S.snap(`Remove edge ${u} → ${v}. The in-degree of ${v} drops to 0, so it's ready: enqueue it.`,e,ds(),out())}
          else S.snap(`Remove edge ${u} → ${v}. The in-degree of ${v} drops to ${indeg[v]}, so it's still waiting on something.`,e,ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap(order.length===g.n?`All ${g.n} vertices are placed, so this is a valid topological order. Every edge points forward.`:`Only ${order.length} of ${g.n} placed: the rest are stuck behind a cycle.`,null,ds(),out());
      return S.frames;
    },
    dijkstra(g,s){
      const S=stepper(g),adj=Array.from({length:g.n},()=>[]);
      g.edges.forEach(([u,v,w])=>adj[u].push([v,w]));
      const dist=new Array(g.n).fill(Infinity),prevE=new Array(g.n).fill(-1),heap=[],done=[];
      const show=d=>d===Infinity?"∞":d;
      const ds=()=>({t:"Min-heap: (distance, vertex)",items:[...heap].sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(([d,v])=>`(${d},${v})`),hot:0});
      const out=()=>({t:"Settled (final)",items:done.map(v=>`${v}:${dist[v]}`)});
      for(let v=0;v<g.n;v++)S.lab[v]="∞";
      dist[s]=0;heap.push([0,s]);S.lab[s]="0";S.cls[s]="fr";
      S.snap(`dist[${s}] = 0, every other distance is ∞. Push (0, ${s}) onto the heap.`,null,ds(),out());
      while(heap.length){
        heap.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
        const [d,u]=heap.shift();
        if(d>dist[u]){S.snap(`Pop (${d}, ${u}): stale. ${u} was already settled at ${dist[u]}, so skip it (lazy deletion).`,null,ds(),out());continue}
        done.push(u);S.cls[u]="cur";
        S.snap(`Pop (${d}, ${u}): it's the closest unsettled vertex, so ${d} is final for ${u}.`,null,ds(),out());
        for(const [v,w] of adj[u]){
          const e=edgeIndex(g,u,v);
          if(d+w<dist[v]){
            const old=dist[v];dist[v]=d+w;heap.push([dist[v],v]);S.lab[v]=String(dist[v]);if(S.cls[v]!=="done")S.cls[v]="fr";
            if(prevE[v]>=0)S.tree.delete(prevE[v]);prevE[v]=e;S.tree.add(e);
            S.snap(`Relax ${u} → ${v} (weight ${w}): ${d} + ${w} = ${d+w} < ${show(old)}. Update dist[${v}] and push (${d+w}, ${v}).`,e,ds(),out());
          }else S.snap(`${u} → ${v} (weight ${w}): ${d} + ${w} = ${d+w}, which is no better than ${dist[v]}. Leave it.`,e,ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap("The heap is empty. Every label is a shortest distance, and the highlighted edges form the shortest-path tree.",null,ds(),out());
      return S.frames;
    },
  };

  function vizBlock(b){
    const g=b.graph,box=el("div","lr-viz"),head=el("div","vt",b.title||"");box.appendChild(head);
    const body=el("div","vb");box.appendChild(body);
    const G=drawGraph(g);body.appendChild(G.svg);
    if(b.viz==="graph"){body.style.gridTemplateColumns="1fr";return box}
    const side=el("div","side");body.appendChild(side);
    if(b.viz==="adj"){
      const adj=adjOf(g),listBox=el("div"),mxBox=el("div"),edBox=el("div");
      listBox.appendChild(el("h6",null,"Adjacency list"));const lt=el("div","adjtab");listBox.appendChild(lt);
      const rows=adj.map((a,i)=>{const r=el("div",null,`${i}: [${a.join(", ")}]`);lt.appendChild(r);return r});
      mxBox.appendChild(el("h6",null,"Adjacency matrix"));
      const mx=el("table","mx"),hr=el("tr");hr.appendChild(el("th"));for(let j=0;j<g.n;j++)hr.appendChild(el("th",null,String(j)));mx.appendChild(hr);
      const mrows=adj.map((a,i)=>{const tr=el("tr");tr.appendChild(el("th",null,String(i)));for(let j=0;j<g.n;j++){const on=a.includes(j);tr.appendChild(el("td",on?"one":null,on?"1":"0"))}mx.appendChild(tr);return tr});
      mxBox.appendChild(mx);
      edBox.appendChild(el("h6",null,"Edge list"));edBox.appendChild(el("div","adjtab",JSON.stringify(g.edges).replace(/\],\[/g,"], [")));
      side.append(listBox,mxBox,edBox);
      const cap=el("div","cap","Click a vertex to highlight its neighbors, its adjacency-list entry and its matrix row.");box.appendChild(cap);
      const pick=i=>{
        G.nodes.forEach((n,k)=>G.setNode(k,"pick"+(k===i?" sel":adj[i].includes(k)?" nb":"")));
        G.edges.forEach((e,k)=>G.setEdge(k,e.u===i||e.v===i?"tree":""));
        rows.forEach((r,k)=>r.classList.toggle("on",k===i));mrows.forEach((r,k)=>r.classList.toggle("on",k===i));
        cap.textContent=`Vertex ${i} has ${adj[i].length} neighbor${adj[i].length===1?"":"s"}: adj[${i}] = [${adj[i].join(", ")}], and row ${i} of the matrix has a 1 in column${adj[i].length===1?"":"s"} ${adj[i].join(", ")||"(none)"}.`;
      };
      G.svg.removeAttribute("role");
      G.nodes.forEach((n,i)=>{
        G.setNode(i,"pick");n.g.setAttribute("tabindex","0");n.g.setAttribute("role","button");n.g.setAttribute("aria-label","Vertex "+i);
        n.g.addEventListener("click",()=>pick(i));n.g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(i)}});
      });
      return box;
    }
    const frames=GEN[b.viz](g,b.start||0),dsBox=el("div"),outBox=el("div");
    side.append(dsBox,outBox);
    const cap=el("div","cap");box.appendChild(cap);
    const ctl=el("div","ctl");box.appendChild(ctl);
    let k=0,timer=0;
    const chips=(host,d)=>{
      host.replaceChildren();if(!d)return;
      host.appendChild(el("h6",null,d.t));const c=el("div","chips");host.appendChild(c);
      if(!d.items.length)c.appendChild(el("em",null,"empty"));
      d.items.forEach((x,j)=>c.appendChild(el("span",j===d.hot?"hot":null,String(x))));
    };
    const draw=()=>{
      const f=frames[k];
      f.cls.forEach((c,i)=>G.setNode(i,c,f.lab[i]));
      G.edges.forEach((e,i)=>G.setEdge(i,i===f.act?"act":f.gone.has(i)?"gone":f.tree.has(i)?"tree":""));
      chips(dsBox,f.ds);chips(outBox,f.out);
      cap.textContent=f.say;head.lastChild.textContent=`Step ${k+1} / ${frames.length}`;
      range.value=k;play.textContent=timer?"❚❚ Pause":k===frames.length-1?"↺ Replay":"▶ Play";
    };
    head.appendChild(el("span"));
    const stop=()=>{clearInterval(timer);timer=0};
    const prev=btn("◀",()=>{stop();if(k>0){k--;draw()}}),next=btn("▶",()=>{stop();if(k<frames.length-1){k++;draw()}});
    prev.title="Previous step";next.title="Next step";
    const play=btn("▶ Play",()=>{
      if(timer){stop();draw();return}
      if(k===frames.length-1)k=0;
      timer=setInterval(()=>{if(!box.isConnected){stop();return}if(k<frames.length-1){k++;draw()}else{stop();draw()}},1100);draw();
    },"play");
    const range=el("input");range.type="range";range.min=0;range.max=frames.length-1;range.oninput=()=>{stop();k=+range.value;draw()};
    const reset=btn("⟲",()=>{stop();k=0;draw()});reset.title="Back to the start";
    ctl.append(play,prev,next,range,reset);
    box.tabIndex=0;box.onkeydown=e=>{if(e.target!==box)return;if(e.key==="ArrowRight"){next.click();e.preventDefault()}else if(e.key==="ArrowLeft"){prev.click();e.preventDefault()}};
    draw();
    return box;
  }

  // ---------- adjacency-list drill ----------
  function drillBlock(){
    const box=el("div","lr-drill"),dh=el("div","dh"),db=el("div","db");box.append(dh,db);
    let directed=false,mode="pic",g=null,answer=[];
    const D=prog.drill;
    const seg=(opts,get,set)=>{const s=el("div","seg");opts.forEach(([v,l])=>{const b=btn(l,()=>{set(v);[...s.children].forEach(x=>x.classList.toggle("on",x===b));fresh()});if(get()===v)b.classList.add("on");s.appendChild(b)});return s};
    const st=el("span","st");
    const stat=()=>{st.textContent=D.total?`Streak ${D.streak||0} · best ${D.best||0} · ${D.right}/${D.total} correct`:"Your first one"};
    dh.append(seg([[false,"Undirected"],[true,"Directed"]],()=>directed,v=>directed=v),seg([["pic","Picture"],["list","Edge list"]],()=>mode,v=>mode=v),el("span","sp"),st,btn("New graph",()=>fresh(),"ghost"));
    const randGraph=()=>{
      const n=5+Math.floor(Math.random()*2),pairs=[];
      for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)pairs.push([a,b]);
      for(let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
      const m=n-1+Math.floor(Math.random()*3);
      const edges=pairs.slice(0,m).map(([a,b])=>directed&&Math.random()<.5?[b,a]:[a,b]);
      const pos=Array.from({length:n},(_,i)=>{const t=-Math.PI/2+i*2*Math.PI/n;return [50+38*Math.cos(t),30+25*Math.sin(t)]});
      return {n,edges,directed,pos,r:5,vb:"4 -2 92 64"};
    };
    function fresh(){
      g=randGraph();answer=adjOf(g);stat();
      db.replaceChildren();
      const pic=el("div","pic");db.appendChild(pic);
      if(mode==="pic")pic.appendChild(drawGraph(g).svg);
      else pic.appendChild(el("pre",null,`n = ${g.n}\nedges = ${JSON.stringify(g.edges).replace(/\],\[/g,"], [")}\n${directed?"directed: [from, to]":"undirected"}`));
      const rows=el("div","rows");db.appendChild(rows);
      rows.appendChild(el("div","st",directed?"Write each vertex's outgoing neighbors, e.g. 1, 3":"Write each vertex's neighbors, e.g. 1, 3"));
      const inputs=answer.map((_,i)=>{
        const r=el("div","row"),lab=el("label",null,`adj[${i}]`),inp=el("input"),fix=el("span","fix");
        inp.placeholder="(none)";inp.autocomplete="off";inp.spellcheck=false;inp.setAttribute("aria-label",`Neighbors of ${i}`);
        inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check.click()}};
        r.append(lab,inp,fix);rows.appendChild(r);return {r,inp,fix};
      });
      const acts=el("div","acts"),msg=el("span","msg");
      let checked=false;
      const check=btn("Check",()=>{
        let ok=0;
        inputs.forEach(({r,inp,fix},i)=>{
          const got=(inp.value.match(/\d+/g)||[]).map(Number).sort((a,b)=>a-b),want=[...answer[i]].sort((a,b)=>a-b);
          const good=got.length===want.length&&got.every((x,j)=>x===want[j]);
          r.classList.toggle("ok",good);r.classList.toggle("no",!good);fix.textContent="";if(good)ok++;
        });
        const all=ok===inputs.length;
        msg.className="msg "+(all?"ok":"no");msg.textContent=all?"All correct 🎉":`${ok} of ${inputs.length} rows right. Fix the red ones, or reveal.`;
        if(!checked){checked=true;D.total++;if(all){D.right++;D.streak=(D.streak||0)+1;D.best=Math.max(D.best||0,D.streak)}else D.streak=0;save();stat()}
        if(all)setTimeout(()=>{if(box.isConnected&&g===cur)fresh()},1400);
      },"cta");
      const cur=g;
      const reveal=btn("Reveal",()=>{inputs.forEach(({fix},i)=>fix.textContent=`[${answer[i].join(",")}]`);if(!checked){checked=true;D.total++;D.streak=0;save();stat()}},"ghost");
      acts.append(check,reveal,msg);rows.appendChild(acts);
    }
    fresh();
    return box;
  }

  // ---------- views ----------
  let route="",cleanup=[],drawer=null;
  const runCleanup=()=>{cleanup.forEach(f=>{try{f()}catch(e){}});cleanup=[]};
  const go=h=>{if(location.hash!==h)location.hash=h;else render(true)};
  const crumbs=(parts)=>{
    const c=el("nav","crumbs");
    parts.forEach(([t,h],i)=>{if(i)c.appendChild(document.createTextNode("›"));if(h){const a=el("a",null,t);a.onclick=()=>go(h);c.appendChild(a)}else c.appendChild(el("span",null,t))});
    return c;
  };
  const ring=(done,total,size)=>{
    const s=sv("svg",{viewBox:"0 0 120 120"}),r=50,C=2*Math.PI*r,f=total?done/total:0;
    sv("circle",{cx:60,cy:60,r,fill:"none",stroke:"var(--head)","stroke-width":12},s);
    const arc=sv("circle",{cx:60,cy:60,r,fill:"none",stroke:"var(--accent)","stroke-width":12,"stroke-linecap":f?"round":"butt","stroke-dasharray":`${C*f} ${C}`,transform:"rotate(-90 60 60)"},s);
    arc.style.transition="stroke-dasharray .6s";
    const t=sv("text",{x:60,y:58,"text-anchor":"middle",class:"num",fill:"var(--fg)"},s);t.textContent=`${done}/${total}`;
    const l=sv("text",{x:60,y:78,"text-anchor":"middle",class:"lab"},s);l.textContent="lessons done";
    if(size)s.style.width=s.style.height=size+"px";
    return s;
  };
  const trackStats=t=>{
    const ls=t.lessons.map(l=>peekLp(t,l));
    return {done:ls.filter(x=>x.done).length,due:t.lessons.filter(l=>isDue(peekLp(t,l))),flag:t.lessons.filter(l=>peekLp(t,l).revisit),
      parts:t.lessons.reduce((a,l)=>a+l.parts.length,0),partsDone:t.lessons.reduce((a,l)=>a+partsDone(t,l),0)};
  };
  const nextLesson=t=>{
    const last=t.lessons.find(l=>prog.last===lkey(t,l));
    if(last&&!peekLp(t,last).done)return last;
    return t.lessons.find(l=>!peekLp(t,l).done)||null;
  };

  function viewHome(){
    const w=el("div","lr lr-home");
    w.appendChild(el("h1",null,"Learning"));
    w.appendChild(el("p","lede","The fundamentals behind interview problems, taught step by step and practiced until they're automatic. Each track ends with the LeetCode problems and system design questions it prepares you for."));
    const recent=LEARN_TRACKS.map(t=>[t,t.lessons.find(l=>prog.last===lkey(t,l))]).find(x=>x[1]);
    if(recent){
      const [t,l]=recent,c=el("div","lr-cont"),tx=el("div","t");
      tx.append(el("small",null,"Pick up where you left off"),el("b",null,`${t.title} · ${l.title}`));
      c.append(tx,btn("Continue →",()=>go(`#learn/${t.id}/${l.id}`),"cta"));w.appendChild(c);
    }
    const cards=el("div","lr-cards");w.appendChild(cards);
    LEARN_TRACKS.forEach(t=>{
      const s=trackStats(t),c=el("button","lr-card");c.type="button";c.onclick=()=>go("#learn/"+t.id);
      c.append(el("div","ic",t.icon),el("h3",null,t.title),el("p",null,t.tagline));
      const bot=el("div","bot"),bar=el("div","lr-bar"),fill=el("i");fill.style.width=(100*s.done/t.lessons.length)+"%";bar.appendChild(fill);
      bot.append(bar,el("span","pill",`${s.done}/${t.lessons.length} lessons`));
      if(s.due.length)bot.appendChild(el("span","pill due",`${s.due.length} due`));
      c.appendChild(bot);cards.appendChild(c);
    });
    const soon=el("div","lr-card soon");
    soon.append(el("div","ic","🌱"),el("h3",null,"More tracks coming"),el("p",null,"Trees, heaps and priority queues, dynamic programming: the same learn → practice → LeetCode path."));
    cards.appendChild(soon);
    return w;
  }

  function viewTrack(t){
    const w=el("div","lr"),s=trackStats(t);
    w.appendChild(crumbs([["Learning","#learn"],[t.title]]));
    const hero=el("div","lr-hero"),L=el("div");hero.appendChild(L);
    L.append(el("h1",null,`${t.icon} ${t.title}`),el("p","tag",t.tagline));
    const ul=el("ul");t.outcomes.forEach(o=>ul.appendChild(el("li",null,o)));L.appendChild(ul);
    const nl=nextLesson(t),acts=el("div");acts.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center";
    if(nl){const i=t.lessons.indexOf(nl);acts.appendChild(btn(s.done||prog.last?`Continue: ${i+1}. ${nl.title} →`:`Start lesson 1: ${nl.title} →`,()=>go(`#learn/${t.id}/${nl.id}`),"cta"))}
    else acts.appendChild(el("span","pill ok","✓ Every lesson complete"));
    acts.appendChild(btn("Ready for LeetCode ↓",()=>readyBox.scrollIntoView({behavior:"smooth",block:"start"}),"ghost"));
    L.appendChild(acts);
    const R=el("div","lr-ring");R.appendChild(ring(s.done,t.lessons.length));
    const st=el("div","stats");
    st.appendChild(el("span",null,`${s.partsDone} of ${s.parts} practice steps done`));
    if(s.due.length)st.appendChild(el("span",null,`↻ ${s.due.length} lesson${s.due.length>1?"s":""} due for review`));
    if(s.flag.length)st.appendChild(el("span",null,`⚑ ${s.flag.length} flagged to revisit`));
    R.appendChild(st);hero.appendChild(R);w.appendChild(hero);

    if(s.due.length){
      const c=el("div","lr-cont"),tx=el("div","t");
      tx.append(el("small",null,"Due for review"),el("b",null,s.due.map(l=>l.title).join(" · ")));
      c.append(tx,btn("Review now →",()=>go(`#learn/${t.id}/${s.due[0].id}`),"cta"));w.appendChild(c);
    }

    w.appendChild(el("div","lr-sec","The path"));
    const path=el("div","lr-path");w.appendChild(path);
    const step=(node,card,cls)=>{const r=el("div","lr-step"+(cls?" "+cls:"")),rail=el("div","rail");rail.appendChild(node);r.append(rail,card);path.appendChild(r)};
    t.lessons.forEach((l,i)=>{
      const x=peekLp(t,l),pd=partsDone(t,l),due=isDue(x);
      if(l.system){
        const n=el("div","lr-node");n.appendChild(el("span",null,"🏁"));
        const c=el("button","lr-lc");c.type="button";c.onclick=()=>readyBox.scrollIntoView({behavior:"smooth",block:"start"});
        const solved=t.ready.filter(([sl])=>progress[sl]&&progress[sl].done).length;
        c.append(el("div","eb","Checkpoint"),el("h3",null,"Ready for LeetCode"),el("p",null,`${t.ready.length} real interview problems, ordered from easy to hard. You've solved ${solved} so far.`));
        step(n,c,"check"+(solved===t.ready.length?" done":""));
      }
      const n=el("div","lr-node",x.done?"✓":String(i+1));
      const c=el("button","lr-lc");c.type="button";c.onclick=()=>go(`#learn/${t.id}/${l.id}`);
      const eb=el("div","eb",`Lesson ${i+1}${l.system?" · System design":""}`);
      if(x.done)eb.appendChild(el("span","pill ok","Complete"));
      if(due)eb.appendChild(el("span","pill due","↻ Review due"));
      if(x.revisit)eb.appendChild(el("span","pill flag","⚑ Revisit"));
      if(x.note)eb.appendChild(el("span","pill","📝 Notes"));
      const gp=el("p");inline(gp,l.goal);c.append(eb,el("h3",null,l.title),gp);
      const meta=el("div","meta"),bar=el("div","lr-bar"),fill=el("i");fill.style.width=(100*pd/l.parts.length)+"%";bar.appendChild(fill);
      meta.append(el("span",null,`⏱ ${l.mins} min`),bar,el("span",null,`${pd}/${l.parts.length} practice`));
      c.appendChild(meta);
      step(n,c,x.done?"done":l===nl?"cur":"");
    });

    const readyBox=el("div");w.appendChild(readyBox);
    readyBox.appendChild(el("div","lr-sec","Ready for LeetCode"));
    readyBox.appendChild(el("p","sub",`Work through these in order once lessons 1–${t.lessons.filter(l=>!l.system).length} feel solid. Each one opens the same editor and walkthrough as the LeetCode tab, and solving it there marks it here.`));
    const grid=el("div","lr-ready");readyBox.appendChild(grid);
    t.ready.forEach(([slug,lid],i)=>{
      const r=DATA.find(x=>x[6]===slug);if(!r)return;
      const done=progress[slug]&&progress[slug].done,l=t.lessons.find(x=>x.id===lid);
      const c=el("div","lr-prob"+(done?" done":"")),h=el("div","h");
      h.append(el("span","pill"+(done?" ok":""),done?"✓":String(i+1)),el("b",null,r[2]),el("span","d-"+r[1],DN[r[1]]));
      const via=el("div","via","Builds on ");const a=el("a",null,l.title);a.onclick=()=>go(`#learn/${t.id}/${l.id}`);via.appendChild(a);
      const acts=el("div","acts");
      acts.append(btn("✏️ Solve",()=>openPractice(slug)),btn("🎓 Walkthrough",()=>openLearn(slug)));
      c.append(h,via,acts);grid.appendChild(c);
    });
    return w;
  }

  // ---------- lesson ----------
  function viewLesson(t,l){
    const w=el("div","lr"),i=t.lessons.indexOf(l),x=lp(t,l);
    prog.last=lkey(t,l);x.seen=today();save();
    const prevL=t.lessons[i-1],nextL=t.lessons[i+1];
    const cr=crumbs([["Learning","#learn"],[t.title,"#learn/"+t.id],[`Lesson ${i+1} of ${t.lessons.length}`]]);
    cr.appendChild(el("span","sp"));
    if(prevL)cr.appendChild(btn("← Prev",()=>go(`#learn/${t.id}/${prevL.id}`),"ghost"));
    if(nextL)cr.appendChild(btn("Next →",()=>go(`#learn/${t.id}/${nextL.id}`),"ghost"));
    w.appendChild(cr);

    const head=el("div","lr-lhead");w.appendChild(head);
    const goal=el("p","goal");inline(goal,l.goal);
    head.append(el("div","no",`Lesson ${i+1}${l.system?" · System design":""}`),el("h1",null,l.title),goal);
    const acts=el("div","acts");head.appendChild(acts);
    const doneB=btn("",null,"ghost lr-done-b"),flagB=btn("",null,"ghost lr-flag"),info=el("span","info");
    acts.append(doneB,flagB,info);
    const syncHead=()=>{
      const due=isDue(x),dd=daysUntilDue(x),all=partsDone(t,l)===l.parts.length;
      doneB.textContent=due?"↻ Mark reviewed":x.done?"✓ Complete":"Mark lesson complete";
      doneB.classList.toggle("on",x.done&&!due);doneB.classList.toggle("nudge",(!x.done&&all)||due);
      flagB.textContent=x.revisit?"⚑ Flagged to revisit":"⚑ Revisit later";flagB.classList.toggle("on",!!x.revisit);
      info.textContent=`⏱ ${l.mins} min · ${partsDone(t,l)}/${l.parts.length} practice steps`+(x.done?(due?" · review due today":dd!=null?` · next review in ${dd} day${dd===1?"":"s"}`:""):"")+(x.times>1?` · reviewed ${x.times-1}×`:"");
    };
    doneB.onclick=()=>{
      if(isDue(x)){x.times++;x.last=today();toast("Reviewed. See you in "+INTERVALS[Math.min(x.times,3)-1]+" days.")}
      else if(x.done){x.done=false;x.times=0;delete x.last}
      else{x.done=true;x.times=Math.max(1,x.times||0);x.last=today();toast("Lesson complete 🎉 It'll come back for review in 3 days.")}
      save();syncHead();
    };
    flagB.onclick=()=>{x.revisit=!x.revisit;if(!x.revisit)delete x.revisit;save();syncHead()};
    syncHead();

    const grid=el("div","lr-grid"),main=el("div","lr-main"),aside=el("aside","lr-aside");grid.append(main,aside);w.appendChild(grid);

    // Learn
    const learnH=el("h2","lr-h2","Learn");learnH.id="lr-learn";learnH.style.marginTop="0";main.appendChild(learnH);
    const read=el("div","lr-read");main.appendChild(read);
    l.blocks.forEach(b=>{
      if(b.md)read.appendChild(md(b.md));
      else if(b.tpl){
        const box=el("div","lr-tpl"),th=el("div","th");th.append(el("span",null,"Template"),el("b",null,b.title||""));
        const cp=btn("Copy",()=>{navigator.clipboard&&navigator.clipboard.writeText(b.tpl).then(()=>{cp.textContent="Copied";setTimeout(()=>cp.textContent="Copy",1200)},()=>{})});th.appendChild(cp);
        box.append(th,codeEl(b.tpl));read.appendChild(box);
      }
      else if(b.tip||b.warn){const c=el("div","lr-call "+(b.tip?"tip":"warn"));c.append(el("span","i",b.tip?"💡":"⚠️"),el("div",null,b.tip||b.warn));read.appendChild(c)}
      else if(b.viz)read.appendChild(vizBlock(b));
      else if(b.drill)read.appendChild(drillBlock());
    });

    // Practice
    const prH=el("h2","lr-h2","Practice");prH.id="lr-practice";main.appendChild(prH);
    main.appendChild(el("p","sub","Code runs in your browser against real tests. Checks are instant. Written answers get feedback from the AI tutor."));
    const parts=el("div","lr-parts");main.appendChild(parts);
    const tocDots={};
    const onPartChange=()=>{l.parts.forEach(p=>{const d=tocDots[p.id];if(d){const ok=!!(x.parts&&x.parts[p.id]&&x.parts[p.id].ok);d.classList.toggle("ok",ok);d.textContent=ok?"✓":""}});syncHead();tocCount.textContent=`${partsDone(t,l)}/${l.parts.length} done`};
    const ctx={t,l,x,root:w,onChange:onPartChange};
    let codeNo=0;
    l.parts.forEach((p,k)=>{
      const card=p.type==="code"?codePart(ctx,p,k):p.type==="quiz"?quizPart(ctx,p,k):explainPart(ctx,p,k);
      if(p.type==="code")codeNo++;
      parts.appendChild(card);
    });

    // Next up
    const nxH=el("h2","lr-h2","Next up");nxH.id="lr-next";main.appendChild(nxH);
    const nx=el("div","lr-next");main.appendChild(nx);
    if(l.leetcode.length){
      nx.appendChild(el("p","sub","LeetCode problems this lesson unlocks. Solving one in the LeetCode tab counts there too."));
      const chips=el("div","lr-chips");nx.appendChild(chips);
      l.leetcode.forEach(slug=>{
        const r=DATA.find(y=>y[6]===slug);if(!r)return;
        const done=progress[slug]&&progress[slug].done,c=el("span","lr-chip"+(done?" done":""));
        c.append(el("span",null,(done?"✓ ":"")+r[2]),el("span","d-"+r[1],DN[r[1]]),btn("Solve",()=>openPractice(slug)),btn("Walkthrough",()=>openLearn(slug)));
        chips.appendChild(c);
      });
    }
    if(nextL){
      const b=el("button","lr-nextl");b.type="button";b.onclick=()=>go(`#learn/${t.id}/${nextL.id}`);
      const tx=el("div");tx.append(el("small",null,`Lesson ${i+2}`),el("b",null,nextL.title));
      b.append(tx,el("span","ar","→"));nx.appendChild(b);
    }else{
      const b=el("button","lr-nextl");b.type="button";b.onclick=()=>{go("#learn/"+t.id)};
      const tx=el("div");tx.append(el("small",null,"Track complete"),el("b",null,"Back to the path, and the LeetCode checklist"));
      b.append(tx,el("span","ar","🏁"));nx.appendChild(b);
    }

    // Aside: on this page, notes, tutor
    const tocB=el("div","lr-box"),tocCount=el("span");tocCount.style.cssText="float:right;text-transform:none;letter-spacing:0;font-weight:600";
    const h5=el("h5",null,"On this page");h5.appendChild(tocCount);tocB.appendChild(h5);
    const toc=el("div","lr-toc");tocB.appendChild(toc);
    const link=(text,target,dot)=>{const a=el("a");if(dot)a.appendChild(dot);a.appendChild(el("span",null,text));a.onclick=()=>target.scrollIntoView({behavior:"smooth",block:"start"});toc.appendChild(a)};
    link("Learn",learnH);
    toc.appendChild(el("div","sub","Practice"));
    l.parts.forEach(p=>{const d=el("span","dot");tocDots[p.id]=d;link(p.type==="quiz"?(p.q.length>40?p.q.slice(0,38).trim()+"…":p.q):p.title,parts.querySelector("#lr-p-"+p.id),d)});
    link("Next up",nxH);
    aside.appendChild(tocB);
    const noteB=el("div","lr-box lr-note");noteB.appendChild(el("h5",null,"Your notes"));
    const ta=el("textarea"),ns=el("div","s");ta.placeholder="Patterns, gotchas, the template in your own words…";ta.value=x.note||"";
    let nt=0;ta.oninput=()=>{ns.textContent="…";clearTimeout(nt);nt=setTimeout(()=>{if(ta.value.trim())x.note=ta.value;else delete x.note;save();ns.textContent="Saved"},400)};
    noteB.append(ta,ns);aside.appendChild(noteB);
    aside.appendChild(btn("💬 Ask the tutor",()=>openTutor(t,l),"lr-tutor-b"));
    onPartChange();
    return w;
  }

  function partShell(p,k,kind){
    const card=el("section","lr-part");card.id="lr-p-"+p.id;
    const ph=el("div","lr-ph"),n=el("span","n",String(k+1)),tt=el("div","tt"),st=el("div","st");
    tt.append(el("div","k",kind),el("h4",null,p.type==="quiz"?"Quick check":p.title));
    ph.append(n,tt,st);const pb=el("div","lr-pb");card.append(ph,pb);
    return {card,pb,st,n};
  }
  const markOk=(ctx,p,card,n)=>{card.classList.add("ok");n.textContent="✓";card.classList.add("flash");setTimeout(()=>card.classList.remove("flash"),900);ctx.onChange()};

  function quizPart(ctx,p,k){
    const {card,pb,st,n}=partShell(p,k,"Check your understanding"),s=pp(ctx.t,ctx.l,p);
    card.classList.add("lr-quiz");
    pb.appendChild(el("p","q",p.q));
    const opts=el("div","lr-opts"),why=el("div");pb.append(opts,why);
    // A wrong pick is crossed out and you keep going; the explanation shows once you find the right one.
    const show=chosen=>{
      const b=opts.children[chosen];
      if(chosen!==p.answer){
        b.disabled=true;b.classList.add("wrong");why.className="lr-why no";
        why.replaceChildren(el("b",null,"Not quite."),document.createTextNode("Try another option."));return;
      }
      [...opts.children].forEach((x,j)=>{x.disabled=true;x.classList.toggle("right",j===p.answer)});
      why.className="lr-why ok";why.replaceChildren(el("b",null,s.tries>1?`Right, on try ${s.tries}.`:"Right."),document.createTextNode(p.why));
      const again=btn("Reset this check",()=>{delete s.ans;s.tries=0;save();why.replaceChildren();why.className="";[...opts.children].forEach(x=>{x.disabled=false;x.classList.remove("right","wrong")})},"ghost");
      again.style.marginTop="10px";why.appendChild(el("div")).appendChild(again);
      st.textContent="✓ Answered";
    };
    p.options.forEach((o,j)=>{
      const b=el("button","lr-opt");b.type="button";b.append(el("span","l","ABCD"[j]),el("span",null,o));
      b.onclick=()=>{s.tries=(s.tries||0)+1;const first=!s.ok;if(j===p.answer){s.ans=j;s.ok=true}save();show(j);if(j===p.answer&&first)markOk(ctx,p,card,n)};
      opts.appendChild(b);
    });
    if(s.ok){card.classList.add("ok");n.textContent="✓"}
    if(s.ans!=null)show(s.ans);
    return card;
  }

  function explainPart(ctx,p,k){
    const {card,pb,st,n}=partShell(p,k,"Explain it · AI feedback"),s=pp(ctx.t,ctx.l,p);
    card.classList.add("lr-exp");
    pb.appendChild(mdEl(p.prompt));
    const ta=el("textarea");ta.placeholder="Write it the way you'd say it in the interview…";ta.value=s.text||"";pb.appendChild(ta);
    const tools=el("div","lr-tools"),cnt=el("span","cnt"),fbB=btn("🤖 Get feedback",null,"run");
    // Dictation (voiceInput, from sysdesign.js) only fills the box; nothing is sent until Get feedback.
    const vi=typeof voiceInput==="function"?voiceInput(ta):null;
    tools.append(fbB);if(vi)tools.appendChild(vi.mic);tools.append(el("span","sp"),cnt);pb.appendChild(tools);
    if(vi){vi.note.textContent=vi.mic.disabled?vi.note.textContent:"Dictate it, edit if needed, then Get feedback.";pb.appendChild(vi.note)}
    const ai=el("div","lr-ai");ai.hidden=true;pb.appendChild(ai);
    const words=()=>{const c=(ta.value.trim().match(/\S+/g)||[]).length;cnt.textContent=c?`${c} words`:""};
    let tm=0;ta.oninput=()=>{words();clearTimeout(tm);tm=setTimeout(()=>{s.text=ta.value;save()},400)};words();
    const showFb=text=>{ai.hidden=false;ai.replaceChildren(el("div","hd","Tutor feedback"),mdEl(text))};
    if(s.fb)showFb(s.fb);
    if(s.ok){card.classList.add("ok");n.textContent="✓";st.textContent="✓ Reviewed"}
    fbB.onclick=async()=>{
      if(vi)vi.stop();const answer=ta.value.trim();
      if(answer.length<20){ta.focus();toast("Write a few sentences first.");return}
      s.text=ta.value;save();
      fbB.disabled=true;ai.hidden=false;ai.classList.add("busy");ai.replaceChildren(el("div","hd","Tutor feedback"));
      const out=el("div","lr-md");ai.appendChild(out);
      try{
        const res=await apiFetch("/api/learn/review",{method:"POST",body:JSON.stringify({kind:"explain",track:ctx.t.title,lesson:ctx.l.title,goal:ctx.l.goal,prompt:p.prompt,rubric:p.rubric,answer})});
        if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        const text=await readStream(res,txt=>{if(out.isConnected){out.replaceChildren(md(txt))}});
        s.fb=text;const first=!s.ok;s.ok=true;save();st.textContent="✓ Reviewed";if(first)markOk(ctx,p,card,n);
      }catch(err){out.replaceChildren(el("div","warn",errMsg(err)))}
      ai.classList.remove("busy");fbB.disabled=false;
    };
    return card;
  }

  function codePart(ctx,p,k){
    const {t,l}=ctx,{card,pb,st,n}=partShell(p,k,p.kind==="class"?"Code · build a class":"Code · exercise"),s=pp(t,l,p);
    const dkey=`learn-draft-${t.id}-${l.id}-${p.id}`;
    const ex={function_name:p.fn,kind:p.kind||"function",compare:p.compare||"exact",arg_types:[],return_type:"plain",
      tests:p.tests.map(([name,inp,exp])=>({name,input_json:JSON.stringify(inp),expected_json:JSON.stringify(exp)}))};
    const status=()=>{
      const bits=[];
      if(s.ok)bits.push(`✓ Solved${s.reps>1?` ×${s.reps}`:""}`);
      if(s.best)bits.push(`best drill ${fmt(s.best)}`);
      st.textContent=bits.join(" · ");
      if(s.ok){card.classList.add("ok");n.textContent="✓"}
    };
    pb.appendChild(mdEl(p.prompt));
    const edBox=el("div","lr-ed");pb.appendChild(edBox);
    const readDraft=()=>{try{return localStorage.getItem(dkey)}catch(e){return null}};
    const writeDraft=v=>{try{localStorage.setItem(dkey,v)}catch(e){}};
    const ph=el("pre","ph",readDraft()||p.starter);edBox.appendChild(ph);
    const tools=el("div","lr-tools");pb.appendChild(tools);
    const runB=btn("▶ Run tests",()=>run(),"run"),resetB=btn("Reset"),fmtB=btn("Format",()=>ed&&formatCode(ed)),drillB=btn("🧠 Drill from memory"),
      hintB=btn("💡 Hint"),solB=btn("👀 Solution"),aiB=btn("🤖 AI review"),askB=btn("💬 Ask tutor",()=>openTutor(t,l,p,()=>ed?ed.getValue():"")),tm=el("span","tm");
    runB.title="Cmd/Ctrl+Enter";drillB.title="Wipe the editor, hide the templates, and time yourself writing it from scratch";
    tools.append(runB,resetB,fmtB,drillB,hintB,solB,aiB,askB,el("span","sp"),tm);
    const hintBox=el("div","lr-hintbox"),solBox=el("div","lr-sol"),res=el("div","lr-res"),ai=el("div","lr-ai");
    hintBox.hidden=solBox.hidden=ai.hidden=true;pb.append(hintBox,solBox,res,ai);
    let ed=null,running=false,lastSum="",lastKey="",drill=null;
    const ensureEd=async()=>{
      if(ed)return ed;
      await loadCM();
      if(ed)return ed;
      ph.remove();ed=makeEditor(edBox,{value:readDraft()||p.starter,run:()=>run()});
      ed.on("change",()=>writeDraft(ed.getValue()));
      return ed;
    };
    // Editors are created when the card scrolls into view (or on first click), so a lesson with several exercises loads fast.
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();ensureEd().catch(()=>{ph.textContent="The editor loads from a CDN, so it needs internet."})}},{rootMargin:"300px"});
    io.observe(edBox);cleanup.push(()=>io.disconnect());
    ph.onclick=()=>ensureEd();

    let armReset=0;
    resetB.onclick=async()=>{
      if(!armReset){resetB.textContent="Click again to reset";resetB.classList.add("arm");armReset=setTimeout(()=>{armReset=0;resetB.textContent="Reset";resetB.classList.remove("arm")},3000);return}
      clearTimeout(armReset);armReset=0;resetB.textContent="Reset";resetB.classList.remove("arm");
      (await ensureEd()).setValue(p.starter);res.replaceChildren();
    };
    hintB.onclick=()=>{
      hintBox.hidden=!hintBox.hidden;
      if(!hintBox.hidden&&!hintBox.firstChild){const c=el("div","lr-call tip");c.append(el("span","i","💡"),el("div",null,p.hint));hintBox.appendChild(c)}
    };
    solB.onclick=()=>{
      if(drill){toast("Finish or stop the drill first.");return}
      solBox.hidden=!solBox.hidden;solB.textContent=solBox.hidden?"👀 Solution":"Hide solution";
      if(!solBox.hidden&&!solBox.firstChild){
        const c=el("div","lr-call tip");c.append(el("span","i","🧠"),el("div",null,"Read it, close it, then use Drill from memory to write it yourself. Typing it out once is worth more than reading it five times."));
        solBox.append(c,codeEl(p.solution));solBox.lastChild.className="lr-pre";
      }
    };
    // Drill: start from the starter with templates and solutions blurred, timed; finishing (all tests pass) records the time.
    let armDrill=0;
    const stopDrill=()=>{if(!drill)return;clearInterval(drill.tick);drill=null;tm.textContent="";drillB.textContent="🧠 Drill from memory";ctx.root.classList.remove("drilling")};
    cleanup.push(stopDrill);
    drillB.onclick=async()=>{
      if(drill){stopDrill();toast("Drill stopped.");return}
      if(!armDrill){drillB.textContent="Wipe the editor and start?";drillB.classList.add("arm");armDrill=setTimeout(()=>{armDrill=0;drillB.textContent="🧠 Drill from memory";drillB.classList.remove("arm")},3500);return}
      clearTimeout(armDrill);armDrill=0;drillB.classList.remove("arm");
      const e=await ensureEd();e.setValue(p.starter);e.focus();res.replaceChildren();solBox.hidden=true;hintBox.hidden=true;solB.textContent="👀 Solution";
      ctx.root.classList.add("drilling");
      drill={start:Date.now(),tick:setInterval(()=>{if(!card.isConnected){stopDrill();return}tm.textContent="⏱ "+fmt((Date.now()-drill.start)/1000)},500)};
      tm.textContent="⏱ 0:00";drillB.textContent="■ Stop drill";
    };

    const short=v=>{v=String(v==null?"":v);return v.length>220?v.slice(0,220)+"…":v};
    async function run(){
      if(running)return;
      const e=await ensureEd().catch(()=>null);if(!e)return;
      const code=e.getValue();writeDraft(code);
      running=true;runB.disabled=true;runB.textContent="Running…";
      const con=[];
      const r=await runTests(code,ex,{onOut:s=>con.push(s)});
      running=false;runB.disabled=false;runB.textContent="▶ Run tests";
      if(!card.isConnected)return;
      lastSum=summarize(ex.tests,r);lastKey=code;
      res.replaceChildren();
      if(r.fatal){res.appendChild(el("div","sum no","✗ "+r.fatal));return}
      const passed=ex.tests.filter((_,i)=>r.cases[i]&&r.cases[i].pass===true).length,all=passed===ex.tests.length;
      const sum=el("div","sum "+(all?"ok":"no"),all?`✓ All ${passed} tests pass`:`${passed} / ${ex.tests.length} tests pass`);
      const dots=el("span","dots");ex.tests.forEach((_,i)=>dots.appendChild(el("i",r.cases[i]&&r.cases[i].pass?"ok":null)));sum.appendChild(dots);res.appendChild(sum);
      if(r.err)res.appendChild(el("pre",null,r.err.trim()));
      if(r.timedOut)res.appendChild(el("pre",null,"Stopped: took longer than 10s. Infinite loop, or an O(n²) step on a big input?"));
      ex.tests.forEach((tc,i)=>{
        const c=r.cases[i];if(c&&c.pass)return;
        const d=el("details");if(!res.querySelector("details"))d.open=true;
        d.appendChild(el("summary",null,`✗ ${tc.name}`));
        d.appendChild(el("pre",null,c?[`input:    ${short(tc.input_json)}`,c.err?`error:    ${c.err}`:`got:      ${short(c.got)}`,`expected: ${short(c.expected)}`].join("\n"):"not run"));
        res.appendChild(d);
      });
      if(con.length){res.appendChild(el("div","con",con.join("").slice(-4000)))}
      if(all){
        const first=!s.ok;s.ok=true;s.reps=(s.reps||0)+1;
        if(drill){
          const secs=Math.round((Date.now()-drill.start)/1000),pb2=!s.best||secs<s.best;
          if(pb2)s.best=secs;stopDrill();
          toast(pb2?`Drilled from memory in ${fmt(secs)}. Personal best! 🧠`:`Drilled in ${fmt(secs)} (best ${fmt(s.best)})`);
        }else if(first)toast("Solved! 🎉 Try Drill from memory to lock it in.");
        save();status();if(first)markOk(ctx,p,card,n);else ctx.onChange();
      }
    }
    aiB.onclick=async()=>{
      const e=await ensureEd().catch(()=>null);if(!e)return;
      const code=e.getValue();if(!code.trim()||code.trim()===p.starter.trim()){toast("Write some code first.");return}
      aiB.disabled=true;
      if(lastKey!==code)await run();
      ai.hidden=false;ai.classList.add("busy");ai.replaceChildren(el("div","hd","AI review"));
      const out=el("div","lr-md");ai.appendChild(out);
      try{
        const r=await apiFetch("/api/learn/review",{method:"POST",body:JSON.stringify({kind:"code",track:t.title,lesson:l.title,goal:l.goal,title:p.title,prompt:p.prompt,code,results:lastSum.slice(0,3000)})});
        if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        await readStream(r,txt=>{if(out.isConnected)out.replaceChildren(md(txt))});
      }catch(err){out.replaceChildren(el("div","warn",errMsg(err)))}
      ai.classList.remove("busy");aiB.disabled=false;
    };
    status();
    return card;
  }

  // ---------- tutor drawer ----------
  const chatKey=(t,l)=>`learn-chat-${t.id}-${l.id}`;
  function lessonText(l){
    return l.blocks.map(b=>b.md||(b.tpl?"Template: "+(b.title||"")+"\n"+b.tpl:"")||b.tip||b.warn||(b.viz?`[Visualizer: ${b.title}]`:"")||(b.drill?"[Adjacency-list drill]":"")).filter(Boolean).join("\n\n").slice(0,29000);
  }
  function openTutor(t,l,p,getCode){
    if(!drawer){
      drawer=el("div","lr-drawer");drawer.setAttribute("role","dialog");drawer.setAttribute("aria-label","Tutor");
      document.body.appendChild(drawer);
      addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))drawer.classList.remove("open")});
    }
    const key=chatKey(t,l);let msgs=readJSON(key,[]);if(!Array.isArray(msgs))msgs=[];
    let busy=false;
    drawer.replaceChildren();
    const dh=el("div","dh"),title=el("b",null,"Tutor");title.appendChild(el("small",null,l.title));
    const clear=btn("Clear",()=>{if(busy)return;msgs=[];writeJSON(key,msgs);draw()}),close=btn("✕",()=>drawer.classList.remove("open"));close.setAttribute("aria-label","Close");
    dh.append(title,clear,close);
    const list=el("div","msgs"),ctxLine=el("div","ctx",p?`Asking about: ${p.title} (the tutor sees your current code)`:"");
    const form=el("form"),ta=el("textarea"),send=el("button",null,"Send");send.type="submit";
    ta.placeholder="Ask anything about this lesson…";form.append(ta,send);
    drawer.append(dh,list,ctxLine,form);
    const draw=()=>{
      list.replaceChildren();
      if(!msgs.length){
        list.appendChild(el("div","empty","Stuck, curious, or want to check your understanding? The tutor has read this lesson."));
        const sg=el("div","sugg");
        [`Explain ${l.title.toLowerCase()} like I'm new to it`,"Quiz me with one question on this lesson","What mistakes do people make with this in interviews?"].forEach(q=>sg.appendChild(btn(q,()=>ask(q))));
        list.appendChild(sg);
      }
      msgs.forEach(m=>{const d=el("div","m "+(m.role==="user"?"u":"a"));if(m.role==="user")d.textContent=m.content;else d.appendChild(md(m.content));list.appendChild(d)});
      list.scrollTop=1e9;
    };
    const ask=async q=>{
      if(busy||!q.trim())return;
      busy=true;send.disabled=true;
      msgs.push({role:"user",content:q.trim().slice(0,4000)});draw();
      const a=el("div","m a busy");list.appendChild(a);list.scrollTop=1e9;
      const part=p?`${p.title}\n${p.prompt}\n\nTheir current code:\n${(getCode&&getCode()||"").slice(0,4000)}`:"";
      try{
        const res=await apiFetch("/api/learn/chat",{method:"POST",body:JSON.stringify({track:t.title,lesson:l.title,goal:l.goal,content:lessonText(l),part:part.slice(0,6000),messages:msgs.slice(-20)})});
        if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        const text=await readStream(res,txt=>{a.classList.remove("busy");a.replaceChildren(md(txt));list.scrollTop=1e9});
        msgs.push({role:"assistant",content:text.slice(0,4000)||"(no reply)"});writeJSON(key,msgs.slice(-30));
      }catch(err){msgs.pop();a.classList.remove("busy");a.textContent=errMsg(err);ta.value=q}
      busy=false;send.disabled=false;
      if(msgs.length&&msgs[msgs.length-1].role==="assistant")draw();
    };
    form.onsubmit=e=>{e.preventDefault();const q=ta.value;ta.value="";ask(q)};
    ta.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}};
    draw();
    requestAnimationFrame(()=>{drawer.classList.add("open");ta.focus()});
  }

  // ---------- routing ----------
  function render(force){
    const h=location.hash.slice(1).split("/");
    if(h[0]!=="learn")return;
    const key=h.slice(1).join("/");
    if(key===route&&!force&&root().firstChild)return;
    route=key;runCleanup();
    if(drawer)drawer.classList.remove("open");
    const t=trackById(h[1]),l=t&&t.lessons.find(x=>x.id===h[2]);
    const v=l?viewLesson(t,l):t?viewTrack(t):viewHome();
    root().replaceChildren(v);
    scrollTo(0,0);
  }
  let ready=false;
  window.learnInit=function(){
    if(!ready){
      ready=true;
      const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    }
    render(false);
  };
})();

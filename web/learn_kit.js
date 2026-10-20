// Shared lesson building blocks for the Learning and System Design tabs: the .lr-* styles, a small markdown renderer,
// and the quiz / explain practice cards. Progress lives with the caller; each card gets a ctx:
//   ctx.state(p)   -> the mutable record for part p      ctx.save()  -> persist it
//   ctx.onChange() -> called when a part becomes done    ctx.reviewBody(p,answer) / ctx.reviewUrl -> AI review request
// Depends on globals from index.html: el, apiFetch, errMsg, readStream, and voiceInput (sysdesign.js, optional).
(function(){
  const btn=(text,fn,cls)=>{const b=el("button",cls||null,text);b.type="button";if(fn)b.onclick=fn;return b};
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
.vz-e.off{opacity:0}
.vz-n.off{opacity:0}
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


  function partShell(p,k,kind){
    const card=el("section","lr-part");card.id="lr-p-"+p.id;
    const ph=el("div","lr-ph"),n=el("span","n",String(k+1)),tt=el("div","tt"),st=el("div","st");
    tt.append(el("div","k",kind),el("h4",null,p.type==="quiz"?"Quick check":p.title));
    ph.append(n,tt,st);const pb=el("div","lr-pb");card.append(ph,pb);
    return {card,pb,st,n};
  }
  const markOk=(ctx,p,card,n)=>{card.classList.add("ok");n.textContent="✓";card.classList.add("flash");setTimeout(()=>card.classList.remove("flash"),900);ctx.onChange()};

  function quizPart(ctx,p,k){
    const {card,pb,st,n}=partShell(p,k,"Check your understanding"),s=ctx.state(p);
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
      const again=btn("Reset this check",()=>{delete s.ans;s.tries=0;ctx.save();why.replaceChildren();why.className="";[...opts.children].forEach(x=>{x.disabled=false;x.classList.remove("right","wrong")})},"ghost");
      again.style.marginTop="10px";why.appendChild(el("div")).appendChild(again);
      st.textContent="✓ Answered";
    };
    p.options.forEach((o,j)=>{
      const b=el("button","lr-opt");b.type="button";b.append(el("span","l","ABCD"[j]),el("span",null,o));
      b.onclick=()=>{s.tries=(s.tries||0)+1;const first=!s.ok;if(j===p.answer){s.ans=j;s.ok=true}ctx.save();show(j);if(j===p.answer&&first)markOk(ctx,p,card,n)};
      opts.appendChild(b);
    });
    if(s.ok){card.classList.add("ok");n.textContent="✓"}
    if(s.ans!=null)show(s.ans);
    return card;
  }

  function explainPart(ctx,p,k){
    const {card,pb,st,n}=partShell(p,k,"Explain it · AI feedback"),s=ctx.state(p);
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
      s.text=ta.value;ctx.save();
      fbB.disabled=true;ai.hidden=false;ai.classList.add("busy");ai.replaceChildren(el("div","hd","Tutor feedback"));
      const out=el("div","lr-md");ai.appendChild(out);
      try{
        const res=await apiFetch(ctx.reviewUrl||"/api/learn/review",{method:"POST",body:JSON.stringify(ctx.reviewBody(p,answer))});
        if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        const text=await readStream(res,txt=>{if(out.isConnected){out.replaceChildren(md(txt))}});
        s.fb=text;const first=!s.ok;s.ok=true;ctx.save();st.textContent="✓ Reviewed";if(first)markOk(ctx,p,card,n);
      }catch(err){out.replaceChildren(el("div","warn",errMsg(err)))}
      ai.classList.remove("busy");fbB.disabled=false;
    };
    return card;
  }

  const NS="http://www.w3.org/2000/svg";
  const sv=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);if(parent)parent.appendChild(n);return n};
  // Progress ring; the caption under the count is `label` ("lessons done" by default).
  const ring=(done,total,size,label)=>{
    const s=sv("svg",{viewBox:"0 0 120 120"}),r=50,C=2*Math.PI*r,f=total?done/total:0;
    sv("circle",{cx:60,cy:60,r,fill:"none",stroke:"var(--head)","stroke-width":12},s);
    const arc=sv("circle",{cx:60,cy:60,r,fill:"none",stroke:"var(--accent)","stroke-width":12,"stroke-linecap":f?"round":"butt","stroke-dasharray":`${C*f} ${C}`,transform:"rotate(-90 60 60)"},s);
    arc.style.transition="stroke-dasharray .6s";
    const t=sv("text",{x:60,y:58,"text-anchor":"middle",class:"num",fill:"var(--fg)"},s);t.textContent=`${done}/${total}`;
    const l=sv("text",{x:60,y:78,"text-anchor":"middle",class:"lab"},s);l.textContent=label||"lessons done";
    if(size)s.style.width=s.style.height=size+"px";
    return s;
  };

  // List-page hero (title, blurb, outcome bullets, progress ring) and "pick up where you left off" banner, shared by the practice tabs.
  const listHero=o=>{
    const hero=el("div","lr-hero"),L=el("div");hero.appendChild(L);
    L.append(el("h1",null,o.title),el("p","tag",o.tag));
    if(o.outcomes){const ul=el("ul");o.outcomes.forEach(x=>ul.appendChild(el("li",null,x)));L.appendChild(ul)}
    const R=el("div","lr-ring");R.appendChild(ring(o.done,o.total,0,o.label));
    const st=el("div","stats");(o.stats||[]).forEach(x=>st.appendChild(el("span",null,x)));
    R.appendChild(st);hero.appendChild(R);
    return hero;
  };
  const contBanner=(small,title,label,onClick)=>{
    const c=el("div","lr-cont"),t=el("div","t");
    t.append(el("small",null,small),el("b",null,title));
    c.append(t,btn(label,onClick,"cta"));
    return c;
  };

  let cssOn=false;
  const injectCss=()=>{if(cssOn)return;cssOn=true;const st=document.createElement("style");st.textContent=css;document.head.appendChild(st)};
  window.LK={btn,sv,ring,listHero,contBanner,css,injectCss,toast,inline,md,mdEl,codeEl,partShell,markOk,quizPart,explainPart};
})();

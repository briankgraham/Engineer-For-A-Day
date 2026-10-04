// Engineer for a Day tab: a simulated workday on a fake team (Slack-style channels, a ticket, a PR, docs, prod logs and a repo),
// with AI coworkers who react to what you do, a scripted timeline of events, and a manager's review at the end.
// Depends on globals from index.html: $, el, loadCM, makeEditor, formatCode, RUN_TIMEOUT, darkMode, renderMd, apiFetch, and WS from workspace.js.
(function(){
  const KEY="day-sessions-v1";
  const {apCombine,apSuites,runAp,stopRun,readSSE,renderResults,lineDiff,mergeSnippet,mergeMembers}=WS;
  // Testing aid: ?dayspeed=20 runs the day's clock 20x faster.
  const SPEED=Math.max(1,Math.min(120,Number(new URLSearchParams(location.search).get("dayspeed"))||1));

  const readSessions=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}};
  const writeSession=(id,s)=>{try{const all=readSessions();all[id]=s;localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  const dropSession=id=>{try{const all=readSessions();delete all[id];localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  // Finished days, newest first, kept after the session itself is discarded so past reviews stay readable.
  const HKEY="day-history-v1",HMAX=50;
  const readHistory=()=>{try{const h=JSON.parse(localStorage.getItem(HKEY));return Array.isArray(h)?h:[]}catch(e){return []}};
  const writeHistory=h=>{try{localStorage.setItem(HKEY,JSON.stringify(h.slice(0,HMAX)))}catch(e){}};
  const addHistory=entry=>{const h=readHistory().filter(x=>x.sid!==entry.sid);h.unshift(entry);writeHistory(h)};
  const pad=n=>String(n).padStart(2,"0");
  const toMin=s=>{const [h,m]=s.split(":").map(Number);return h*60+m};
  const hhmm=m=>pad(Math.floor(m/60))+":"+pad(Math.floor(m%60));
  const ampm=m=>{const h=Math.floor(m/60);return ((h+11)%12+1)+":"+pad(Math.floor(m%60))+(h<12?" AM":" PM")};
  const ampmS=s=>s?ampm(toMin(s)):"";

  const css=`
.dy{max-width:1500px;margin:0 auto;padding:16px}
.dy h2{margin:0 0 4px;font-size:20px}.dy .sub{color:var(--muted);margin:0 0 14px;max-width:820px;line-height:1.5}
.dy-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.dy-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:8px}
.dy-card h3{margin:0;font-size:16px}.dy-card p{margin:0;color:var(--muted);line-height:1.5}.dy-card .meta{font-size:12px;color:var(--muted)}
.dy-card .act{margin-top:auto;padding-top:6px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.dy-people{display:flex;gap:6px;flex-wrap:wrap}
.dy-av{flex:none;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px}
.dy-av.you{background:var(--head);color:var(--fg);border:1px solid var(--line)}
.dy-av.ai{background:var(--accent);font-size:14px}
.dy-aitag{font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--accent-soft);color:var(--accent)}
.dy-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 -16px 12px;padding:8px 16px;position:sticky;top:var(--nav-h);z-index:3;background:var(--bg);border-bottom:1px solid var(--line)}
.dy-top h2{margin:0;flex:1;min-width:160px;font-size:17px}
.dy-clock{font-variant-numeric:tabular-nums;font-weight:700;font-size:16px}
.dy-prog{width:120px;height:6px;border-radius:99px;background:var(--head);overflow:hidden}.dy-prog i{display:block;height:100%;background:var(--accent)}
.dy-oncall{font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--hard-bg);color:var(--hard)}
.dy-oncall.ok{background:var(--easy-bg);color:var(--easy)}
.dy-grid{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;align-items:start}
.dy-rail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:10px 8px;position:sticky;top:calc(var(--nav-h) + 62px);max-height:calc(100vh - var(--nav-h) - 80px);overflow:auto}
.dy-rail h4{margin:10px 8px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.dy-rail h4:first-child{margin-top:2px}
.dy-rail button.it{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:none;padding:5px 8px;border-radius:var(--radius-sm);color:var(--fg);font:inherit;font-size:14px;cursor:pointer;box-shadow:none}
.dy-rail button.it:hover{background:var(--head)}.dy-rail button.it.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.dy-rail button.it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dy-rail button.it.unread .nm{font-weight:700}
.dy-badge{font-size:11px;font-weight:700;min-width:18px;padding:0 6px;border-radius:99px;background:var(--hard);color:#fff;text-align:center}
.dy-task{display:flex;gap:8px;align-items:flex-start;padding:5px 8px;font-size:13px;line-height:1.35;cursor:pointer;border-radius:var(--radius-sm)}
.dy-task:hover{background:var(--head)}.dy-task .ck{flex:none;width:16px;height:16px;border:1.5px solid var(--line);border-radius:4px;margin-top:1px;display:flex;align-items:center;justify-content:center;font-size:11px}
.dy-task.done .ck{background:var(--easy);border-color:var(--easy);color:#fff}.dy-task.done .tt{color:var(--muted);text-decoration:line-through}
.dy-railsel{display:none}
@media(max-width:860px){.dy-grid{grid-template-columns:minmax(0,1fr)}.dy-rail{display:none}.dy-railsel{display:block;width:100%;margin-bottom:10px}}
.dy-main{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);min-height:520px;display:flex;flex-direction:column;overflow:hidden}
.dy-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line)}
.dy-hd b{font-size:15px}.dy-hd .hint{color:var(--muted);font-size:12px;flex:1;min-width:160px}
.dy-msgs{flex:1;overflow:auto;padding:10px 14px;max-height:calc(100vh - var(--nav-h) - 260px);min-height:300px}
.dy-msg{display:flex;gap:10px;padding:6px 0}.dy-msg .bd{min-width:0;flex:1}
.dy-msg .who{font-size:13px}.dy-msg .who b{margin-right:6px}.dy-msg .who span{color:var(--muted);font-size:12px}
.dy-msg .tx{line-height:1.5;overflow-wrap:anywhere}.dy-msg .tx p{margin:2px 0 6px}.dy-msg .tx.plain{white-space:pre-wrap}
.dy-msg .tx pre{overflow-x:auto;background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre}
.dy-msg .tx code{font:12px ui-monospace,Menlo,monospace;background:var(--head);border-radius:4px;padding:0 3px}
.dy-msg.page .bd{border-left:3px solid var(--hard);padding-left:10px}
.dy-msg .typing{color:var(--muted);font-style:italic}.dy-msg .warn{color:var(--hard)}
.dy-sys{text-align:center;color:var(--muted);font-size:12px;margin:8px 0}
.dy-comp{border-top:1px solid var(--line);padding:10px 14px;display:flex;flex-direction:column;gap:6px}
.dy-comp textarea{width:100%;resize:vertical;min-height:56px;font:inherit;box-sizing:border-box}
.dy-comp .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dy-comp .row .hint{flex:1;color:var(--muted);font-size:12px}
.dy-pane{padding:14px 18px;overflow:auto;line-height:1.55}
.dy-pane h1{font-size:20px;margin:4px 0 10px}.dy-pane h2{font-size:16px;margin:16px 0 6px}
.dy-doc pre{margin:8px 0;padding:0;border:1px solid var(--line);border-radius:6px;overflow-x:auto;font:12px/1.5 ui-monospace,Menlo,monospace;background:var(--head)}
.dy-doc pre .l{display:block;padding:0 10px;white-space:pre}.dy-doc pre .l.hunk{color:var(--muted);background:var(--accent-soft)}
.dy-doc pre .l.add{background:color-mix(in srgb,var(--done) 22%,transparent)}.dy-doc pre .l.del{background:color-mix(in srgb,var(--hard) 22%,transparent)}
.dy-doc pre code{display:block;padding:8px 10px;white-space:pre}
.dy-doc .quote{margin:6px 0;padding:6px 12px;border-left:3px solid var(--line);color:var(--muted)}
.dy-ticket ol{margin:6px 0;padding-left:22px}.dy-ticket li{margin:4px 0}
.dy-ticket li code,.dy-pane p code{font:12px ui-monospace,Menlo,monospace;background:var(--head);border-radius:4px;padding:0 4px}
.dy-meta{color:var(--muted);font-size:13px;margin-bottom:10px}
.dy-section{border-top:1px solid var(--line)}
.dy-section>h3{margin:0;padding:10px 14px 0;font-size:14px}
.dy-revform{padding:10px 14px;display:flex;flex-direction:column;gap:8px}
.dy-revform textarea{min-height:120px;font:13px/1.45 ui-monospace,Menlo,monospace;width:100%;box-sizing:border-box}
.dy-revform .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.dy-revform label{display:flex;gap:4px;align-items:center;font-size:14px}
.dy-logs .dy-bar{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.dy-logs .dy-bar input{flex:1;min-width:200px}.dy-logs .dy-bar span{color:var(--muted);font-size:12px}
.dy-logs pre{margin:0;padding:8px 0;overflow:auto;max-height:calc(100vh - var(--nav-h) - 220px);font:12px/1.55 ui-monospace,Menlo,monospace}
.dy-logs pre .l{display:block;padding:0 14px;white-space:pre}.dy-logs pre .l.warn{color:var(--med)}.dy-logs pre mark{background:color-mix(in srgb,var(--accent) 30%,transparent);color:inherit}
.dy-code{padding:10px 14px}
.dy-files{display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap}
.dy-files button.on{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
.dy-code .CodeMirror{height:430px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:13px}
.dy-code .dy-bar{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}
.dy-codewrap{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:4px;align-items:start}
.dy-codewrap>.dy-code{min-width:0}
.dy-aipanel{margin:10px 14px 10px 0;border:1px solid var(--line);border-radius:var(--radius-sm);display:flex;flex-direction:column;height:560px;overflow:hidden}
.dy-aipanel .ttl{padding:8px 12px;border-bottom:1px solid var(--line);font-size:13px;display:flex;flex-direction:column;gap:2px}
.dy-aipanel .ttl span{color:var(--muted);font-size:12px;line-height:1.35}
.dy-aipanel .dy-msgs{max-height:none;min-height:0;flex:1;padding:8px 12px}
.dy-aipanel .dy-msg .tx pre{font-size:11.5px}
.dy-aipanel .dy-comp{padding:8px 12px}.dy-aipanel .dy-comp textarea{min-height:48px}
@media(max-width:1180px){.dy-codewrap{grid-template-columns:minmax(0,1fr)}.dy-aipanel{margin:0 14px 14px;height:480px}}
.dy-res{margin-top:6px}.dy-res .sum{font-weight:600;margin-bottom:6px}
.dy-res .row{padding:4px 0;border-bottom:1px solid var(--line)}.dy-res .row.ok::before{content:"✓ ";color:var(--easy);font-weight:700}.dy-res .row.no::before{content:"✗ ";color:var(--hard)}
.dy-res pre,.dy-con{background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:4px 0 0;overflow-x:auto;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap}
.dy-con:empty{display:none}
.dy-apply{display:flex;gap:6px;align-items:center;margin:-2px 0 8px}.dy-apply .to{color:var(--muted);font-size:12px}
.dy-diff{margin:0 0 8px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.dy-diff .dh{display:flex;gap:6px;align-items:center;padding:6px 8px;background:var(--head);font-size:12px;flex-wrap:wrap}.dy-diff .dh span{flex:1}
.dy-diff pre{margin:0;border:0;border-radius:0;max-height:240px;overflow:auto;padding:0}
.dy-diff .l{display:block;padding:0 8px;white-space:pre}.dy-diff .l.add{background:color-mix(in srgb,var(--done) 22%,transparent)}
.dy-diff .l.del{background:color-mix(in srgb,var(--hard) 22%,transparent)}.dy-diff .l.gap{color:var(--muted)}
.dy-hand textarea{width:100%;min-height:260px;box-sizing:border-box;font:13px/1.5 ui-monospace,Menlo,monospace}
.dy-toasts{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;gap:8px;max-width:min(380px,calc(100vw - 32px))}
.dy-toast{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);padding:10px 12px;font-size:13px;cursor:pointer;line-height:1.4}
.dy-toast.urgent{border-left-color:var(--hard)}.dy-toast b{display:block;margin-bottom:2px}
.dy-banner{padding:10px 14px;background:var(--accent-soft);border-bottom:1px solid var(--line);font-size:14px}
.dy-rev h3{margin:18px 0 8px;font-size:15px}.dy-rev h3:first-child{margin-top:0}
.dy .lvl{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px;margin-left:8px;vertical-align:middle}
.dy .lvl.at,.dy .lvl.above{background:var(--easy-bg);color:var(--easy)}.dy .lvl.below{background:var(--hard-bg);color:var(--hard)}
.dy .lvl.abandoned{background:var(--head);color:var(--muted)}
.dy-hist{margin-top:24px}.dy-hist>.sub{margin:0}
.dy-hist>.hd{display:flex;align-items:center;gap:10px;margin:0 0 8px}.dy-hist>.hd h3{margin:0;font-size:16px;flex:1}
.dy-hist details,.dy-hist>.row{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);margin:0 0 8px;box-shadow:var(--shadow-sm)}
.dy-hist summary,.dy-hist>.row{padding:8px 14px;display:flex;gap:6px 10px;align-items:center;flex-wrap:wrap}
.dy-hist summary{cursor:pointer}
.dy-hist .lvl{margin-left:0}.dy-hist .meta{color:var(--muted);font-size:13px}
.dy-hist .del{margin-left:auto}
.dy-hist details[open] summary{border-bottom:1px solid var(--line)}
.dy-score{display:grid;grid-template-columns:150px 110px minmax(0,1fr);gap:10px;align-items:start;padding:6px 0;border-bottom:1px solid var(--line)}
@media(max-width:640px){.dy-score{grid-template-columns:1fr}}
.dy-score .pips{display:flex;gap:3px;margin-top:5px}.dy-score .pips i{width:16px;height:8px;border-radius:2px;background:var(--head)}.dy-score .pips i.on{background:var(--accent)}
.dy-score .ev{color:var(--muted);font-size:13px}
.dy-rc{border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 12px;margin:6px 0}
.dy-rc .t{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dy-rc .hint{color:var(--muted);font-size:13px}.dy-rc ul{margin:4px 0;padding-left:18px;font-size:13px}
.dy-pill{font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line)}
.dy-pill.done,.dy-pill.caught,.dy-pill.found{color:var(--easy)}.dy-pill.partial,.dy-pill.fixed_late,.dy-pill.unchallenged{color:var(--med)}
.dy-pill.missed,.dy-pill.shipped{color:var(--hard)}.dy-pill.not_reached,.dy-pill.unclear{color:var(--muted)}
.dy-busy{padding:30px;color:var(--muted);text-align:center}
`;

  let ready=false,days=null,work=null,openGen=0;
  const root=()=>$("tab-day");

  function leave(){
    if(!work)return;
    work.save();clearInterval(work.tick);stopRun();
    work.aborts.forEach(a=>a.abort());
    work.toasts.remove();
    work=null;
  }

  async function showList(){
    leave();openGen++;
    const r=root();r.textContent="";
    const wrap=el("div","dy");r.appendChild(wrap);
    wrap.appendChild(el("h2","","Engineer for a Day"));
    wrap.appendChild(el("p","sub","Spend a compressed workday on a fake team: a repo, Slack channels, a ticket, a PR to review, docs and production logs. Coworkers are played by AI and react to what you do (and are not always right). Things will happen while you work. At the end of the day your manager reviews how it went."));
    if(!days){
      try{
        const res=await fetch("/api/day/scenarios",{headers:{"X-Requested-With":"walkthrough"}});
        if(!res.ok)throw new Error(res.status);
        days=(await res.json()).days;
      }catch(e){wrap.appendChild(el("p","","Could not load the days. Run: python3 server.py — then open http://localhost:8000"));return}
    }
    const sessions=readSessions();
    // Reviews finished before history existed: archive them once (the flag stops a deleted entry coming back).
    days.forEach(day=>{const s=sessions[day.id];if(s&&s.result&&!s.archived){addHistory(historyEntry(day,s));s.archived=true;writeSession(day.id,s)}});
    const grid=el("div","dy-cards");wrap.appendChild(grid);
    days.forEach(day=>{
      const s=sessions[day.id];
      const card=el("div","dy-card");
      card.append(el("h3","",day.title),el("p","",day.blurb));
      const ppl=el("div","dy-people");
      day.personas.forEach(p=>{const a=avatar(p);a.title=p.name+" · "+p.role;ppl.appendChild(a)});
      card.appendChild(ppl);
      const bits=[day.difficulty,"~"+day.minutes+" min",ampmS(day.clock.start)+" to "+ampmS(day.clock.end)];
      if(s&&s.result)bits.push("reviewed: "+s.result.level.verdict+" the senior bar");
      else if(s)bits.push("in progress · "+ampm(simAt(day,s.t||0)));
      if(s&&s.ai)bits.push("with AI");
      card.appendChild(el("div","meta",bits.join(" · ")));
      const act=el("div","act");card.appendChild(act);
      if(s){const b=el("button","",s.result?"Open":"Resume");b.onclick=()=>openDay(day);act.appendChild(b)}
      else{
        // The mode is chosen once, here, and kept for the whole attempt.
        const b=el("button","","Start");b.title="Work the day on your own";b.onclick=()=>openDay(day,{ai:false});
        const a=el("button","","✦ Start with AI");a.title="Work the day with an AI coding assistant that sees the repo, tests, tickets and PR, and can suggest code to apply";a.onclick=()=>openDay(day,{ai:true});
        act.append(b,a);
      }
      // Either way the attempt lands in Past days: a reviewed one is already there, an abandoned one is noted there now.
      if(s&&s.result)act.appendChild(confirmBtn("Start over","Click again to reset",()=>{dropSession(day.id);showList()}));
      else if(s)act.appendChild(confirmBtn("Abandon","Click again to abandon",()=>{
        addHistory({sid:s.id||crypto.randomUUID(),day:day.id,title:day.title,ts:Date.now(),abandoned:true,ai:!!s.ai,reached:ampm(simAt(day,s.t||0))});
        dropSession(day.id);showList();
      }));
      grid.appendChild(card);
    });
    wrap.appendChild(historySection());
  }

  // A destructive button that asks for a second click within 3 seconds.
  function confirmBtn(label,armedLabel,action){
    const b=el("button","",label);let armed=0;
    b.onclick=ev=>{
      ev&&ev.preventDefault(); // inside a <summary>, a click would also toggle the row
      if(!armed){b.textContent=armedLabel;armed=setTimeout(()=>{armed=0;b.textContent=label},3000);return}
      clearTimeout(armed);action();
    };
    return b;
  }
  const simAt=(day,t)=>toMin(day.clock.start)+t/(day.minutes*60)*(toMin(day.clock.end)-toMin(day.clock.start));
  function avatar(p){
    if(!p){const a=el("span","dy-av you","You");a.style.fontSize="10px";return a}
    const a=el("span","dy-av",p.name[0]);a.style.background=p.color;return a;
  }

  // ---- the manager review (shared by the live day and the history list) ----
  const AREA={debugging:"Debugging",code_quality:"Code quality",testing:"Testing",review:"Code review",communication:"Communication",prioritization:"Prioritization",judgment:"Judgment"};
  const OUT={done:"Done",partial:"Partial",missed:"Missed",not_reached:"Not reached",caught:"Caught",fixed_late:"Fixed late",shipped:"Believed it",unchallenged:"Not challenged",found:"Found",unclear:"Unclear"};
  // Day-specific words the review uses, stored with each history entry so it renders even if the day changes.
  const labelsOf=day=>({
    incident:(day.incident||{}).name||"the incident",
    feature:((day.tasks.find(t=>t.id==="feature")||{}).item||"").replace(/^ticket:/,"")||"the feature",
    pr:day.prs[0].id,
  });
  function timelineOf(day,sess){
    const page=(day.incident||{}).page,first=((sess.threads["channel:incident"]||[]).find(m=>m.from==="you")||{}).at;
    return "Your timeline: paged at "+(page&&sess.firedAt[page]!=null?ampm(simAt(day,sess.firedAt[page])):"(never)")
      +" · first post in the incident channel "+(first?ampmS(first):"(none)")
      +" · resolved "+(sess.triggers.includes("incident_resolved")?"yes":"no");
  }
  const historyEntry=(day,sess)=>({sid:sess.id,day:day.id,title:day.title,ts:Date.parse(sess.result.at)||Date.now(),ai:!!sess.ai,labels:labelsOf(day),timeline:timelineOf(day,sess),result:sess.result});
  const avgScore=r=>r.scores.length?(r.scores.reduce((a,x)=>a+x.score,0)/r.scores.length).toFixed(1):"–";

  function reviewPane(r,lab,timeline){
    const pane=el("div","dy-pane dy-rev");
    const h=el("h3","","How the day went");h.appendChild(el("span","lvl "+r.level.verdict,r.level.verdict+" the senior bar"));
    if(r.ai){const t=el("span","dy-aitag","with AI");t.style.marginLeft="8px";h.appendChild(t)}
    pane.appendChild(h);
    pane.append(el("p","",r.summary),el("p","dy-meta",r.level.explanation));
    pane.appendChild(el("h3","","Scores"));
    r.scores.forEach(x=>{
      const row=el("div","dy-score"),pips=el("div","pips");
      for(let i=1;i<=5;i++)pips.appendChild(el("i",i<=x.score?"on":""));
      const name=el("div");name.append(el("b","",AREA[x.area]||x.area));
      const sc=el("div");sc.append(el("span","",x.score+"/5"),pips);
      row.append(name,sc,el("div","ev",x.evidence));pane.appendChild(row);
    });
    pane.appendChild(el("h3","","Tasks"));
    r.tasks.forEach(t=>{
      const c=el("div","dy-rc"),hd=el("div","t");hd.append(el("b","",t.title),el("span","dy-pill "+t.outcome,OUT[t.outcome]||t.outcome));c.appendChild(hd);
      if(t.evidence)c.appendChild(el("div","hint",t.evidence));
      if(t.missed.length){const ul=el("ul");t.missed.forEach(m=>ul.appendChild(el("li","",m)));c.appendChild(ul)}
      pane.appendChild(c);
    });
    pane.appendChild(el("h3","","What was really going on in "+lab.incident));
    pane.appendChild(el("p","",r.rootCause));
    if(timeline)pane.appendChild(el("div","dy-meta",timeline));
    const tt=r.tests,line=(n,t)=>n+": "+t.passed+"/"+t.total;
    pane.appendChild(el("div","dy-meta","Tests at the end of the day: "+[line("existing suite",tt.visible),line(lab.feature+" checks",tt.feature),line("incident checks",tt.incident)].join(" · ")
      +(r.mine.final.total?" · your tests: "+r.mine.starter.passed+"/"+r.mine.starter.total+" on the original code, "+r.mine.final.passed+"/"+r.mine.final.total+" on yours":" · you wrote no tests of your own")));
    pane.appendChild(el("h3","","Bugs in PR #"+lab.pr));
    r.issues.forEach(x=>{
      const c=el("div","dy-rc"),hd=el("div","t");hd.append(el("b","",x.title),el("span","dy-pill "+x.outcome,OUT[x.outcome]||x.outcome),el("span","hint",x.severity+" · "+x.where));
      c.append(hd,el("div","",x.detail));if(x.evidence)c.appendChild(el("div","hint",x.evidence));pane.appendChild(c);
    });
    pane.appendChild(el("h3","","What coworkers got wrong"));
    if(!r.flaws.length)pane.appendChild(el("p","dy-meta","None of your conversations led a coworker to say one of the planted wrong things."));
    r.flaws.forEach(f=>{
      const c=el("div","dy-rc"),hd=el("div","t");hd.append(el("b","",f.persona+": "+f.title),el("span","dy-pill "+f.outcome,OUT[f.outcome]||f.outcome));
      c.append(hd,el("div","","Correct: "+f.correct));if(f.evidence)c.appendChild(el("div","hint",f.evidence));pane.appendChild(c);
    });
    if(r.not_served.length){pane.appendChild(el("div","dy-meta","Other traps that never came up: "+r.not_served.map(f=>f.persona+": "+f.title).join("; ")))}
    [["Strengths",r.strengths],["To improve",r.improvements]].forEach(([t,items])=>{pane.appendChild(el("h3","",t));const ul=el("ul");items.forEach(i=>ul.appendChild(el("li","",i)));pane.appendChild(ul)});
    return pane;
  }

  function historySection(){
    const hist=readHistory(),sec=el("section","dy-hist"),hd=el("div","hd");
    hd.appendChild(el("h3","","Past days"));sec.appendChild(hd);
    if(!hist.length){sec.appendChild(el("p","sub","No past days yet. End a day to get a manager review; it is kept here."));return sec}
    hd.appendChild(confirmBtn("Clear history","Click again to clear all",()=>{writeHistory([]);showList()}));
    hist.forEach(e=>{
      const date=new Date(e.ts).toLocaleDateString();
      const del=confirmBtn("Delete","Click again to delete",()=>{writeHistory(readHistory().filter(x=>x.sid!==e.sid));showList()});
      del.className="del";
      // An abandoned day has no review, so its row does not expand.
      if(e.abandoned){
        const row=el("div","row");
        row.append(el("b","",e.title),el("span","lvl abandoned","Abandoned"));if(e.ai)row.appendChild(el("span","dy-aitag","with AI"));
        row.append(el("span","meta",date+" · stopped at "+e.reached),del);
        sec.appendChild(row);return;
      }
      const r=e.result,d=el("details"),sm=el("summary");
      sm.append(el("b","",e.title),el("span","lvl "+r.level.verdict,r.level.verdict+" the senior bar"));if(e.ai)sm.appendChild(el("span","dy-aitag","with AI"));
      sm.append(el("span","meta",date+" · avg "+avgScore(r)+"/5"),del);
      d.appendChild(sm);
      // Render the full review only when opened.
      d.addEventListener("toggle",()=>{
        if(!d.open||d.dataset.done)return;d.dataset.done="1";
        d.appendChild(reviewPane(r,e.labels,e.timeline));
      });
      sec.appendChild(d);
    });
    return sec;
  }

  // mode: {ai} when starting a new attempt; a resumed one keeps the mode it started with.
  async function openDay(day,mode){
    leave();
    const gen=++openGen;
    const r=root();r.textContent="";
    const wrap=el("div","dy");r.appendChild(wrap);
    wrap.appendChild(el("div","dy-busy","Loading the workspace…"));
    try{await loadCM()}catch(e){wrap.textContent="Could not load the code editor from the CDN.";return}
    if(gen!==openGen)return;
    wrap.textContent="";

    const sess=readSessions()[day.id]||{};
    if(!sess.id){sess.id=crypto.randomUUID();sess.ai=!!(mode&&mode.ai)} // the id names this attempt for the server-side flaw log
    if(sess.ai&&!sess.aiMsgs)sess.aiMsgs=[];
    for(const [k,v] of Object.entries({files:{},threads:{},unread:{},fired:{},firedAt:{},triggers:[],trigAt:{},revs:{},unlocked:[],events:[],nudges:{},lastPost:{},seen:{},review:{decision:"",text:"",submitted:false},handoff:"",t:0,elapsed:0,runs:0}))if(sess[k]==null)sess[k]=v;
    // Every review you submitted, per PR revision ({rev,decision,text,at}); sessions from before revisions had one review.
    if(!sess.reviews)sess.reviews=sess.review.submitted?[{rev:1,decision:sess.review.decision,text:sess.review.text,at:sess.review.at}]:[];
    const persona=id=>day.personas.find(p=>p.id===id);
    const pname=id=>id==="you"?"You":(persona(id)||{name:id}).name;
    const chan=id=>day.channels.find(c=>c.id===id);
    const dayLen=day.minutes*60,end=toMin(day.clock.end);
    const simNow=()=>simAt(day,sess.t);
    const now=()=>hhmm(simNow());
    const has=t=>sess.triggers.includes(t);
    const trig=t=>{if(!has(t)){sess.triggers.push(t);sess.trigAt[t]=sess.t;runTimeline()}};
    const note=text=>{sess.events.push(now()+" "+text);if(sess.events.length>300)sess.events.splice(0,sess.events.length-300)};
    // Whether an item is visible yet: locked ones appear when a timeline event unlocks them.
    const isOpen=item=>{
      const avail=x=>!!x&&(!x.locked||sess.unlocked.includes(item));
      if(item==="code")return true;
      if(item==="logs")return avail(day.logs);
      if(item.startsWith("channel:"))return avail(chan(item.slice(8)));
      if(item.startsWith("ticket:"))return day.tickets.some(t=>"ticket:"+t.id===item);
      if(item.startsWith("pr:"))return avail(day.prs.find(p=>"pr:"+p.id===item));
      if(item.startsWith("doc:"))return avail(day.docs.find(x=>"doc:"+x.id===item));
      return sess.unlocked.includes(item);
    };
    const TEST_NAME=day.testFile||"service.test.js";
    const MINE_STARTER="// Your own tests. Same helpers as "+TEST_NAME+": test, eq, assert, throws, require, mkClock, mkDeferred, flush.\n// They run with the existing suite when you press Run. When the day ends they also run against the ORIGINAL code:\n// a good regression test fails there and passes on your fix.\n";
    if(typeof sess.custom!=="string")sess.custom=MINE_STARTER;
    const FEATURE=((day.tasks.find(t=>t.id==="feature")||{}).item||"").replace(/^ticket:/,"")||"the feature";
    const SERVICE=day.service||"service";
    const INC=day.incident||{name:"the incident",page:""};
    const starter=Object.fromEntries(day.files.map(f=>[f.name,f.code]));
    // The revision of the day's PR on screen: 1 until its author pushes an update (a timeline "revise").
    const prRev=()=>day.prs.length?sess.revs[day.prs[0].id]||1:1;
    const prBody=pr=>((pr.revisions||[]).filter(r=>r.rev<=(sess.revs[pr.id]||1)).pop()||pr).body;

    // ---- layout ----
    const top=el("div","dy-top");
    const back=el("button","","← All days"),clock=el("span","dy-clock"),prog=el("span","dy-prog"),progI=el("i"),oncall=el("span","dy-oncall");
    prog.appendChild(progI);oncall.hidden=true;
    const endBtn=el("button","","End day & get review");
    top.append(back,el("h2","",day.company+" · "+day.title.split(":").pop().trim()));
    if(sess.ai){const t=el("span","dy-aitag","✦ AI on");t.title="You started this day with an AI coding assistant";t.style.cursor="pointer";t.onclick=()=>open("code");top.appendChild(t)}
    top.append(oncall,clock,prog,endBtn);
    wrap.appendChild(top);
    const railSel=el("select","dy-railsel");wrap.appendChild(railSel);
    const grid=el("div","dy-grid"),rail=el("nav","dy-rail"),main=el("div","dy-main");
    grid.append(rail,main);wrap.appendChild(grid);
    const toasts=el("div","dy-toasts");document.body.appendChild(toasts);

    // ---- editor docs (the repo, the existing test file, and your own tests) ----
    const docs={};
    day.files.forEach(f=>{docs[f.name]=CodeMirror.Doc(sess.files[f.name]!=null?sess.files[f.name]:f.code,"javascript")});
    const testDoc=CodeMirror.Doc(day.tests.visible,"javascript"),mineDoc=CodeMirror.Doc(sess.custom,"javascript");
    const files=()=>Object.fromEntries(day.files.map(f=>[f.name,docs[f.name].getValue()]));
    let ed=null,openFile=day.files[0].name;

    let dead=false;
    const save=()=>dead||writeSession(day.id,{...sess,files:files(),custom:mineDoc.getValue()});
    let saveT=0;const saveSoon=()=>{clearTimeout(saveT);saveT=setTimeout(save,500)};
    Object.values(docs).concat(mineDoc).forEach(d=>d.on("change",saveSoon));
    const aborts=new Set();
    let view="channel:team";

    // ---- toasts ----
    function toast(title,text,item,urgent){
      const t=el("div","dy-toast"+(urgent?" urgent":""));t.append(el("b","",title),el("span","",text.length>140?text.slice(0,140)+"…":text));
      t.onclick=()=>{t.remove();open(item)};
      toasts.appendChild(t);setTimeout(()=>t.remove(),urgent?15000:7000);
      while(toasts.children.length>4)toasts.firstChild.remove();
    }

    // ---- messages ----
    function addMsg(key,m,opts={}){
      (sess.threads[key]||(sess.threads[key]=[])).push(m);
      if(m.from!=="you"){
        if(view!==key){
          sess.unread[key]=(sess.unread[key]||0)+1;
          toast(pname(m.from)+" · "+threadTitle(key),m.text.replace(/[*`#]/g,""),key,opts.urgent);
        }
      }
      if(view===key&&cur&&cur.renderList)cur.renderList();
      renderRail();save();
    }
    function threadTitle(key){
      const [k,id]=[key.slice(0,key.indexOf(":")),key.slice(key.indexOf(":")+1)];
      if(k==="channel"){const c=chan(id);return c.dm?"DM":c.name}
      if(k==="ticket")return id;
      if(k==="pr")return "PR #"+id;
      if(k==="doc")return (day.docs.find(x=>x.id===id)||{}).title||id;
      return key;
    }

    // ---- timeline ----
    function unlock(items){(items||[]).forEach(u=>{if(!sess.unlocked.includes(u))sess.unlocked.push(u)})}
    const evKey=x=>x.thread||"channel:"+x.channel;
    function fire(e){
      const x=e.do,key=evKey(x);
      sess.fired[e.id]="fired";sess.firedAt[e.id]=sess.t;
      unlock(x.unlock);
      if(x.revise){
        sess.revs[x.revise.pr]=x.revise.rev;sess.review={decision:"",text:"",submitted:false};
        note(pname(x.from)+" pushed revision "+x.revise.rev+" of PR #"+x.revise.pr);
        if(view==="pr:"+x.revise.pr)open(view);
      }
      // A follow-up is written live by the coworker (the scripted text is the fallback); other events post their text.
      if(x.type==="followup")respond(key,x.from,e);
      else{
        note(pname(x.from)+" in "+threadTitle(key)+(x.type==="page"?" (PAGE)":"")+": "+x.text.replace(/[*`]/g,"").slice(0,160));
        addMsg(key,{from:x.from,text:x.text,at:now(),page:x.type==="page"||undefined},{urgent:x.type==="page"});
      }
      renderTop();renderRail();save();
    }
    function runTimeline(){
      for(const e of day.timeline){
        if(sess.fired[e.id])continue;
        const x=e.do;
        if(x.type==="nudge"){nudge(e);continue}
        if(e.after&&sess.fired[e.after]!=="fired"){if(sess.fired[e.after]==="skipped")sess.fired[e.id]="skipped";continue}
        // An event with both "at" and "when" waits for both. "delay" is sim minutes after the "when" trigger happened.
        const due=(!e.at||simNow()>=toMin(e.at))&&(!e.when||has(e.when)&&simNow()>=simAt(day,sess.trigAt[e.when]||0)+(e.delay||0));
        if(!due)continue;
        if(x.type==="followup"&&live[evKey(x)])continue; // wait until the coworker has finished replying there
        if(e.unless&&has(e.unless)){sess.fired[e.id]="skipped";continue}
        fire(e);
      }
    }
    // The incident commander asks for an update when the incident channel has been quiet for a while.
    function nudge(e){
      const x=e.do,key="channel:"+x.channel;
      if(sess.fired[x.after]!=="fired"||has(x.until))return;
      const st=sess.nudges[e.id]||(sess.nudges[e.id]={n:0,last:0});
      if(st.n>=x.texts.length)return;
      const quiet=sess.t-Math.max(sess.firedAt[x.after]||0,sess.lastPost[key]||0,st.last);
      if(quiet<x.quietMinutes*60)return;
      st.n++;st.last=sess.t;
      note(pname(x.from)+" asked for a status update (you had been quiet in "+threadTitle(key)+")");
      addMsg(key,{from:x.from,text:x.texts[st.n-1],at:now()},{urgent:true});
    }

    // ---- top bar ----
    function renderTop(){
      const m=Math.min(simNow(),end);
      clock.textContent=ampm(m);clock.title="Simulated time. The day runs "+day.minutes+" real minutes"+(SPEED>1?" ("+SPEED+"x speed)":"");
      progI.style.width=Math.min(100,sess.t/dayLen*100)+"%";
      oncall.hidden=!sess.fired["t-page"];
      const resolved=has("incident_resolved");
      oncall.className="dy-oncall"+(resolved?" ok":"");oncall.textContent=resolved?INC.name+" resolved":"🚨 "+INC.name+" open";
      oncall.onclick=()=>open("channel:incident");oncall.style.cursor="pointer";
    }

    // ---- rail ----
    function taskDone(t){
      if(t.id==="review")return sess.reviews.length>0;
      if(t.id==="rereview")return sess.reviews.some(r=>r.rev>1);
      if(t.id==="incident")return has("incident_resolved");
      if(t.id==="scope")return sess.fired[t.unlock]==="fired"&&(sess.threads[t.item]||[]).some(m=>m.from==="you"&&m.at>=hhmm(simAt(day,sess.firedAt[t.unlock])));
      if(t.id==="rfc")return (sess.threads[t.item]||[]).some(m=>m.from==="you");
      if(t.id==="handoff")return sess.handoff.trim().length>40;
      return !!sess.featureDone;
    }
    const taskOn=t=>t.unlock==="start"||sess.fired[t.unlock]==="fired";
    function renderRail(){
      rail.textContent="";railSel.textContent="";
      const add=(item,label,icon)=>{
        if(!isOpen(item))return;
        const n=sess.unread[item]||0,b=el("button","it"+(view===item?" on":"")+(n?" unread":""));
        b.append(el("span","",icon),el("span","nm",label));if(n)b.appendChild(el("span","dy-badge",String(n)));
        b.onclick=()=>open(item);rail.appendChild(b);
        const o=new Option((n?"● ":"")+icon+" "+label,item);railSel.appendChild(o);
      };
      rail.appendChild(el("h4","","Today"));
      day.tasks.filter(taskOn).forEach(t=>{
        const d=el("div","dy-task"+(taskDone(t)?" done":""));
        d.append(el("span","ck",taskDone(t)?"✓":""),el("span","tt",t.title));
        if(t.id==="feature"){d.querySelector(".ck").title="Tick this yourself when you think "+FEATURE+" is done";d.querySelector(".ck").onclick=ev=>{ev.stopPropagation();sess.featureDone=!sess.featureDone;if(sess.featureDone)note("marked "+FEATURE+" as done");renderRail();save()}}
        d.onclick=()=>open(t.item);rail.appendChild(d);
      });
      rail.appendChild(el("h4","","Channels"));
      day.channels.filter(c=>!c.dm).forEach(c=>add("channel:"+c.id,c.name.replace(/^#/,""),"#"));
      rail.appendChild(el("h4","","Direct messages"));
      day.channels.filter(c=>c.dm).forEach(c=>add("channel:"+c.id,c.name,"●"));
      rail.appendChild(el("h4","","Work"));
      day.tickets.forEach(t=>add("ticket:"+t.id,t.id+" "+t.title,"🎫"));
      day.prs.forEach(p=>add("pr:"+p.id,"PR #"+p.id+" "+p.title,"🔀"));
      day.docs.forEach(x=>add("doc:"+x.id,x.title,"📄"));
      add("logs","Production logs","📜");
      add("code","Code ("+SERVICE+")","</>");
      add("handoff","End-of-day handoff","✍");
      if(sess.result){const b=el("button","it"+(view==="review"?" on":""));b.append(el("span","","★"),el("span","nm","Manager review"));b.onclick=()=>open("review");rail.appendChild(b);railSel.appendChild(new Option("★ Manager review","review"))}
      railSel.value=view;
    }
    railSel.onchange=()=>open(railSel.value);

    // ---- views ----
    let cur=null;
    function open(item){
      if(item!=="review"&&!isOpen(item))return;
      if(cur&&cur.leave)cur.leave();
      view=sess.view=item;sess.unread[item]=0;
      if(!sess.seen[item]){sess.seen[item]=now();if(item!=="channel:team")note("opened "+(item==="logs"?"the production logs":item==="code"?"the code":threadTitle(item)))}
      main.textContent="";cur=null;
      if(item.startsWith("channel:"))cur=threadView(item);
      else if(item.startsWith("ticket:"))cur=ticketView(item);
      else if(item.startsWith("pr:"))cur=prView(item);
      else if(item.startsWith("doc:"))cur=docView(item);
      else if(item==="logs")cur=logsView();
      else if(item==="code")cur=codeView();
      else if(item==="handoff")cur=handoffView();
      else if(item==="review")cur=reviewView();
      renderRail();save();
    }

    // Who answers a message in a thread: an @mention of a member, else whoever spoke last, else the default responder.
    function responderFor(key,text){
      const [k,id]=[key.slice(0,key.indexOf(":")),key.slice(key.indexOf(":")+1)];
      let members,def;
      if(k==="channel"){const c=chan(id);members=c.members;def=c.responder}
      else if(k==="ticket"){def=day.tickets.find(t=>t.id===id).reporter;members=[def]}
      else if(k==="pr"){def=day.prs.find(p=>p.id===id).author;members=[def]}
      else{def=day.docs.find(x=>x.id===id).author;members=[def]}
      const at=(text.match(/@(\w+)/g)||[]).map(s=>s.slice(1).toLowerCase());
      const hit=members.find(m=>at.includes(m)||at.includes(persona(m).name.split(" ")[0].toLowerCase()));
      if(hit)return hit;
      const last=[...(sess.threads[key]||[])].reverse().find(m=>m.from!=="you");
      return last&&members.includes(last.from)?last.from:def;
    }
    const live={}; // key -> {persona, text} while a coworker's reply streams in
    function say(key,text){
      text=text.trim();if(!text)return;
      addMsg(key,{from:"you",text,at:now()});
      sess.lastPost[key]=sess.t;
      if(key.startsWith("channel:"))trig("posted:"+key.slice(8));
      if(key.startsWith("ticket:"))trig("ticket_replied:"+key.slice(7));
      note("You in "+threadTitle(key)+": "+text.replace(/\s+/g," ").slice(0,160));
      respond(key,responderFor(key,text));
    }
    // ev: a timeline follow-up, when the coworker speaks first instead of answering you.
    async function respond(key,who,ev){
      if(live[key])return;
      live[key]={persona:who,text:""};
      if(view===key&&cur&&cur.renderList)cur.renderList();
      const ac=new AbortController();aborts.add(ac);
      try{
        const msgs=(sess.threads[key]||[]).slice(-40).map(m=>({from:m.from,text:m.text.slice(0,6000),at:m.at}));
        const res=await apiFetch("/api/day/chat",{method:"POST",signal:ac.signal,body:JSON.stringify({day:day.id,session:sess.id,thread:key,persona:who,messages:msgs,clock:now(),events:sess.events.slice(-40),files:files(),prRev:prRev(),followup:ev?ev.id:undefined})});
        if(!res.ok){const d=await res.json();throw new Error(d.error||"Request failed")}
        const answer=(await readSSE(res,a=>{live[key].text=a;if(view===key&&cur&&cur.updateLive)cur.updateLive()})).trim();
        delete live[key];
        addMsg(key,{from:who,text:answer||(ev?ev.do.text:"👍"),at:now()});
        if(ev)note(pname(who)+" in "+threadTitle(key)+": "+(answer||ev.do.text).replace(/[*`]/g,"").slice(0,160));
      }catch(err){
        delete live[key];
        // A follow-up must still arrive (it has already fired), so fall back to its scripted text.
        if(ev){addMsg(key,{from:who,text:ev.do.text,at:now()});note(pname(who)+" in "+threadTitle(key)+": "+ev.do.text.replace(/[*`]/g,"").slice(0,160));return}
        if(err&&err.name==="AbortError")return;
        if(view===key&&cur&&cur.renderList)cur.renderList(err.message||"Request failed");
      }finally{aborts.delete(ac)}
    }

    // A message list + composer, used by channels and by the comment threads under the ticket, PR and doc.
    function threadPanel(key,placeholder){
      const box=el("div");box.style.cssText="display:flex;flex-direction:column;flex:1;min-height:0";
      const list=el("div","dy-msgs"),comp=el("form","dy-comp"),ta=el("textarea"),row=el("div","row"),hint=el("span","hint"),send=el("button","","Send");
      ta.placeholder=placeholder;ta.maxLength=4000;send.type="submit";
      ta.value=(sess.drafts||{})[key]||"";
      ta.oninput=()=>{(sess.drafts||(sess.drafts={}))[key]=ta.value;saveSoon()};
      row.append(hint,send);comp.append(ta,row);box.append(list,comp);
      if(sess.result){comp.hidden=true}
      let liveEl=null;
      function bubble(m){
        const d=el("div","dy-msg"+(m.page?" page":"")),bd=el("div","bd"),who=el("div","who"),tx=el("div","tx");
        who.append(el("b","",pname(m.from)),el("span","",ampmS(m.at)));
        if(m.from==="you"){tx.classList.add("plain");tx.textContent=m.text}else{renderMd(tx,m.text);addApply(tx)}
        bd.append(who,tx);d.append(avatar(m.from==="you"?null:persona(m.from)),bd);
        return d;
      }
      function renderList(err){
        const near=list.scrollHeight-list.scrollTop-list.clientHeight<160;
        list.textContent="";
        const ms=sess.threads[key]||[];
        if(!ms.length&&!live[key])list.appendChild(el("div","dy-sys","No messages yet."));
        ms.forEach(m=>list.appendChild(bubble(m)));
        liveEl=null;
        if(live[key]){
          const p=persona(live[key].persona),d=el("div","dy-msg"),bd=el("div","bd"),who=el("div","who"),tx=el("div","tx");
          who.append(el("b","",p.name),el("span","",ampm(simNow())));
          bd.append(who,tx);d.append(avatar(p),bd);list.appendChild(d);liveEl=tx;updateLive();
        }
        if(err){
          const d=el("div","dy-sys"),w=el("span","warn",err+" "),again=el("button","","Retry");
          again.onclick=()=>respond(key,responderFor(key,""));
          d.append(w,again);list.appendChild(d);
        }
        if(near||err)list.scrollTop=list.scrollHeight;
        hint.textContent=live[key]?pname(live[key].persona)+" is typing…":"";
        send.disabled=!!live[key];
      }
      function updateLive(){
        if(!liveEl||!live[key])return;
        if(live[key].text){liveEl.classList.remove("typing");renderMd(liveEl,live[key].text)}
        else{liveEl.classList.add("typing");liveEl.textContent="typing…"}
        if(list.scrollHeight-list.scrollTop-list.clientHeight<200)list.scrollTop=list.scrollHeight;
      }
      comp.onsubmit=ev=>{ev.preventDefault();if(live[key])return;const t=ta.value;ta.value="";if(sess.drafts)delete sess.drafts[key];say(key,t)};
      ta.onkeydown=ev=>{if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();comp.requestSubmit()}};
      renderList();list.scrollTop=list.scrollHeight;
      return {box,renderList,updateLive,focus:()=>ta.focus()};
    }

    function header(title,hintText,extra){
      const h=el("div","dy-hd");h.append(el("b","",title),el("span","hint",hintText||""));
      (extra||[]).forEach(x=>h.appendChild(x));main.appendChild(h);return h;
    }

    function threadView(key){
      const c=chan(key.slice(8));
      const others=c.members.filter(m=>m!==c.responder).map(m=>"@"+persona(m).name.split(" ")[0].toLowerCase());
      const extra=[];
      if(c.id==="incident"){
        const resolve=el("button","",has("incident_resolved")?"Resolved ✓":"Mark incident resolved");
        resolve.disabled=has("incident_resolved")||!!sess.result;
        resolve.title="Do this once there is a mitigation or fix in place and a plan for affected customers.";
        resolve.onclick=()=>{
          if(!(sess.threads[key]||[]).some(m=>m.from==="you")){toast("Not yet","Post an update in the incident channel first.","channel:incident");return}
          note("marked "+INC.name+" resolved");trig("incident_resolved");resolve.disabled=true;resolve.textContent="Resolved ✓";renderTop();renderRail();save();
        };
        extra.push(resolve);
      }
      header(c.dm?c.name:c.name,c.dm?persona(c.members[0]).role:"Members: "+c.members.map(m=>persona(m).name.split(" ")[0]).join(", ")+" and you",extra);
      const p=threadPanel(key,c.dm?"Message "+c.name:"Message "+c.name+(others.length?" (mention "+others.join(" or ")+" to ask them)":""));
      main.appendChild(p.box);p.focus();
      return p;
    }

    const CODE=/(\b[A-Za-z_]\w*(?:\.\w+)*\([^()]*\)|"[^"]*"|\b\w+\.\w+\b)/g;
    const codeText=(into,t)=>t.split(CODE).forEach((part,i)=>into.appendChild(i%2?el("code","",part):document.createTextNode(part)));
    function ticketView(key){
      const t=day.tickets.find(x=>"ticket:"+x.id===key);
      header(t.id+" · "+t.title,"Comments here go to "+persona(t.reporter).name+" (the reporter).");
      const pane=el("div","dy-pane dy-ticket");
      pane.append(el("div","dy-meta","Reporter: "+persona(t.reporter).name+" · "+t.status),el("p","",t.body),el("b","","Acceptance criteria"));
      const ol=el("ol");t.requirements.forEach(rq=>{const li=el("li");codeText(li,rq);ol.appendChild(li)});pane.appendChild(ol);
      main.appendChild(pane);
      const sec=el("div","dy-section");sec.appendChild(el("h3","","Comments"));main.appendChild(sec);
      const p=threadPanel(key,"Comment on "+t.id+"…");sec.appendChild(p.box);
      return p;
    }

    function renderDoc(into,md){
      renderMd(into,md);
      into.querySelectorAll("p").forEach(p=>{const t=p.firstChild;if(t&&t.nodeType===3&&t.data.startsWith("> ")){t.data=t.data.slice(2);p.classList.add("quote")}});
      into.querySelectorAll("pre").forEach(pre=>{
        const lines=pre.textContent.split("\n");if(!lines.some(l=>l.startsWith("@@")))return;
        pre.replaceChildren(...lines.map(l=>el("span","l"+(l.startsWith("@@")?" hunk":/^\+(?!\+\+ )/.test(l)?" add":/^-(?!-- )/.test(l)?" del":""),l||" ")));
      });
    }
    function prView(key){
      const pr=day.prs.find(p=>"pr:"+p.id===key);
      const rev=sess.revs[pr.id]||1,pushed=(day.timeline.find(e=>e.do.revise&&e.do.revise.pr===pr.id&&e.do.revise.rev===rev)||{}).id;
      header("PR #"+pr.id+" · "+pr.title,"Author: "+persona(pr.author).name+". Submit a review below; replies come from the author.");
      if(rev>1){
        const last=[...sess.reviews].reverse().find(r=>r.rev<rev);
        main.appendChild(el("div","dy-banner",pname(pr.author)+" pushed revision "+rev+(pushed&&sess.firedAt[pushed]!=null?" at "+ampm(simAt(day,sess.firedAt[pushed])):"")+". The diff below is the whole PR as it is now."
          +(last?" Your last review was on revision "+last.rev+" ("+ampmS(last.at)+"); it is in the conversation below.":"")));
      }
      const pane=el("div","dy-pane dy-doc");renderDoc(pane,prBody(pr));main.appendChild(pane);
      const sec=el("div","dy-section");sec.appendChild(el("h3","",rev>1?"Your review of revision "+rev:"Your review"));
      const form=el("div","dy-revform"),ta=el("textarea"),row=el("div","row"),btn=el("button","","Submit review");
      ta.placeholder="Your review: what's wrong, where, why it matters, and what you'd change. Be specific and kind.";ta.value=sess.review.text;ta.maxLength=8000;
      ta.oninput=()=>{sess.review.text=ta.value;saveSoon()};
      const opts=[["approve","Approve"],["request_changes","Request changes"],["comment","Comment"]];
      opts.forEach(([v,l])=>{const lb=el("label"),rb=el("input");rb.type="radio";rb.name="dy-dec";rb.value=v;rb.checked=sess.review.decision===v;rb.onchange=()=>{sess.review.decision=v;saveSoon()};lb.append(rb,document.createTextNode(l));row.appendChild(lb)});
      row.appendChild(btn);form.append(ta,row);sec.appendChild(form);
      if(sess.review.submitted)form.appendChild(el("div","dy-meta","Submitted at "+ampmS(sess.review.at)+". You can update it; the latest version is what counts."));
      btn.disabled=!!sess.result;
      btn.onclick=()=>{
        if(!sess.review.decision||!ta.value.trim()){toast("Review","Pick a decision and write your review first.",key);return}
        const label=opts.find(o=>o[0]===sess.review.decision)[1];
        sess.review={decision:sess.review.decision,text:ta.value,submitted:true,at:now()};
        sess.reviews.push({rev,decision:sess.review.decision,text:ta.value.trim(),at:sess.review.at});
        if(sess.reviews.length>20)sess.reviews.splice(0,sess.reviews.length-20);
        trig("pr_reviewed:"+pr.id);trig((sess.review.decision==="approve"?"pr_approved:":"pr_feedback:")+pr.id);
        say(key,"Review submitted"+(rev>1?" (revision "+rev+")":"")+": "+label+"\n\n"+ta.value.trim());
        open(key);
      };
      main.appendChild(sec);
      const sec2=el("div","dy-section");sec2.appendChild(el("h3","","Conversation"));main.appendChild(sec2);
      const p=threadPanel(key,"Reply to "+persona(pr.author).name.split(" ")[0]+"…");sec2.appendChild(p.box);
      return p;
    }

    function docView(key){
      const x=day.docs.find(d=>"doc:"+d.id===key);
      header(x.title,"By "+persona(x.author).name+(x.comments?". Comments go to the author.":""));
      const pane=el("div","dy-pane dy-doc");renderDoc(pane,x.body);main.appendChild(pane);
      if(!x.comments)return {};
      const sec=el("div","dy-section");sec.appendChild(el("h3","","Comments"));main.appendChild(sec);
      const p=threadPanel(key,"Comment on the RFC…");sec.appendChild(p.box);
      return p;
    }

    function logsView(){
      header("Production logs · "+SERVICE,"Read-only. Filter with plain text or /regex/.");
      const box=el("div","dy-logs"),bar=el("div","dy-bar"),q=el("input"),cnt=el("span"),pre=el("pre");
      q.type="search";q.placeholder="Filter, e.g. "+(day.logs.example||"error or /warn|error/");q.value=sess.logQ||"";
      bar.append(q,cnt);box.append(bar,pre);main.appendChild(box);
      const lines=day.logs.body.replace(/\n$/,"").split("\n");
      const draw=()=>{
        const s=q.value.trim();let re=null;
        if(/^\/.+\/$/.test(s))try{re=new RegExp(s.slice(1,-1),"gi")}catch(e){re=null}
        if(!re&&s)re=new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");
        pre.textContent="";let n=0;
        lines.forEach(l=>{
          if(re){re.lastIndex=0;if(!re.test(l))return}
          n++;const sp=el("span","l"+(/ WARN /.test(l)?" warn":""));
          if(re){let last=0;re.lastIndex=0;for(const m of l.matchAll(re)){if(!m[0])break;sp.appendChild(document.createTextNode(l.slice(last,m.index)));sp.appendChild(el("mark","",m[0]));last=m.index+m[0].length}sp.appendChild(document.createTextNode(l.slice(last)))}
          else sp.textContent=l;
          pre.appendChild(sp);
        });
        cnt.textContent=n+" of "+lines.length+" lines";
      };
      let qt=0;q.oninput=()=>{clearTimeout(qt);qt=setTimeout(()=>{sess.logQ=q.value;draw();if(q.value.trim())note("searched the logs for "+JSON.stringify(q.value.trim().slice(0,60)))},350)};
      draw();
      return {};
    }

    let running=false;
    function codeView(){
      header(SERVICE,"Your working copy. Run executes the existing suite plus my-tests.js. Hidden checks run when you end the day."+(sess.ai?" The AI assistant is on the right.":""));
      const box=el("div","dy-code"),tabs=el("div","dy-files"),host=el("div"),bar=el("div","dy-bar"),run=el("button","","▶ Run tests (⌘/Ctrl+Enter)"),stop=el("button","","Stop"),fmtBtn=el("button","","Format"),res=el("div","dy-res"),con=el("pre","dy-con");
      stop.hidden=true;fmtBtn.title="Format your code with Prettier (Shift-Alt-F)";bar.append(run,stop,fmtBtn);box.append(tabs,host,bar,res,con);
      // With AI, the assistant sits beside the editor so you can talk to it without leaving the code.
      let ai=null;
      if(sess.ai){const wrap=el("div","dy-codewrap");wrap.appendChild(box);main.appendChild(wrap);ai=aiPanel(wrap)}
      else main.appendChild(box);
      ed=makeEditor(host,{doc:docs[openFile]||mineDoc,run:()=>doRun()});
      const btns={};
      const show=name=>{
        openFile=name;
        ed.swapDoc(name===TEST_NAME?testDoc:name==="my-tests.js"?mineDoc:docs[name]);ed.setOption("readOnly",name===TEST_NAME||!!sess.result);
        Object.entries(btns).forEach(([n,b])=>b.classList.toggle("on",n===name));
        if(name===TEST_NAME&&!sess.viewedTests){sess.viewedTests=true;note("opened the existing test file")}
      };
      [...day.files.map(f=>f.name),TEST_NAME,"my-tests.js"].forEach(n=>{
        const b=el("button","",n+(n===TEST_NAME?" 🔒":n==="my-tests.js"?" ✎":""));btns[n]=b;b.onclick=()=>{show(n);ed.focus()};tabs.appendChild(b);
      });
      show(openFile);setTimeout(()=>ed.refresh(),0);
      async function doRun(){
        if(running)return;
        running=true;run.disabled=true;stop.hidden=false;res.textContent="Running…";con.textContent="";
        sess.runs++;
        const r=await runAp(files(),apCombine(day.tests.visible,"",mineDoc.getValue()),s=>{con.textContent+=s});
        running=false;run.disabled=false;stop.hidden=true;
        if(!res.isConnected)return;
        renderResults(res,r);
        const total=r.names.length,passed=r.cases.filter(c=>c&&c.pass).length;
        note("ran the tests: "+passed+"/"+total+" passing"+(r.fatal?" (setup failed)":""));save();
      }
      run.onclick=()=>doRun();stop.onclick=stopRun;fmtBtn.onclick=()=>formatCode(ed);
      // A CodeMirror Doc can only belong to one editor, so detach ours before this editor is thrown away.
      return {leave:()=>{ed.swapDoc(CodeMirror.Doc(""));ed=null},showFile:n=>{if(btns[n])show(n)},aiRender:ai&&ai.renderList,aiUpdate:ai&&ai.updateLive};
    }

    function handoffView(){
      header("End-of-day handoff","For whoever picks things up tomorrow (and your manager): done, open, risks, next steps.");
      const pane=el("div","dy-pane dy-hand"),ta=el("textarea");
      ta.placeholder="## Done\n- \n\n## Open\n- \n\n## Follow-ups / risks\n- ";ta.value=sess.handoff;ta.maxLength=6000;ta.disabled=!!sess.result;
      let first=!sess.handoff.trim();
      ta.oninput=()=>{sess.handoff=ta.value;if(first&&ta.value.trim()){first=false;note("started the handoff note")}renderRail();saveSoon()};
      pane.appendChild(ta);main.appendChild(pane);ta.focus();
      return {};
    }

    // ---- the AI assistant (days started "with AI"): a private chat that sees the repo, tests, tickets and PR, not Slack or the logs ----
    // The reply streams into aiLive, so it keeps arriving (and is saved) if you switch views meanwhile.
    let aiBusy=false,aiLive="";
    // The newest messages, starting on a question (the server wants alternating turns from the candidate first).
    const aiTail=n=>{const t=sess.aiMsgs.slice(-n);return t.length&&t[0].role!=="user"?t.slice(1):t};
    async function askAI(text){
      aiBusy=true;aiLive="";
      sess.aiMsgs.push({role:"user",content:text});
      note("asked the AI assistant: "+text.replace(/\s+/g," ").slice(0,160));
      const paint=()=>{if(cur&&cur.aiRender)cur.aiRender()};
      paint();save();
      const ac=new AbortController();aborts.add(ac);
      try{
        const res=await apiFetch("/api/day/assist",{method:"POST",signal:ac.signal,body:JSON.stringify({day:day.id,files:files(),mine:mineDoc.getValue().slice(0,8000),prRev:prRev(),messages:aiTail(29),open:openFile})});
        if(!res.ok){const d=await res.json();throw new Error(d.error||"Request failed")}
        const answer=(await readSSE(res,a=>{aiLive=a;if(cur&&cur.aiUpdate)cur.aiUpdate()})).trim();
        sess.aiMsgs.push({role:"assistant",content:(answer||"(no answer)").slice(0,12000)});
        aiBusy=false;paint();
      }catch(err){
        sess.aiMsgs.pop(); // drop the unanswered question so the history keeps alternating
        aiBusy=false;
        if(err&&err.name==="AbortError")return;
        if(cur&&cur.aiRender)cur.aiRender(err.message||"Request failed",text);
      }finally{aborts.delete(ac);save()}
    }
    function aiPanel(into){
      const box=el("aside","dy-aipanel"),ttl=el("div","ttl");
      ttl.append(el("b","","✦ AI assistant"),el("span","","Sees the repo, the tests, the tickets, the PR and which file you have open. Not Slack or the logs: paste what it needs. Verify before you trust it."));
      const list=el("div","dy-msgs"),comp=el("form","dy-comp"),ta=el("textarea"),row=el("div","row"),hint=el("span","hint"),send=el("button","","Send");
      ta.placeholder="Ask about the code, or for a fix or a test… (Enter to send)";ta.maxLength=8000;send.type="submit";
      ta.value=sess.aiDraft||"";ta.oninput=()=>{sess.aiDraft=ta.value;saveSoon()};
      row.append(hint,send);comp.append(ta,row);box.append(ttl,list,comp);into.appendChild(box);
      if(sess.result)comp.hidden=true;
      const AI={name:"AI assistant"};
      const bubble=(who,body)=>{const d=el("div","dy-msg"),bd=el("div","bd"),w=el("div","who");w.appendChild(el("b","",who===AI?AI.name:"You"));bd.append(w,body);d.append(who===AI?el("span","dy-av ai","✦"):avatar(null),bd);return d};
      let liveEl=null;
      function renderList(err,retry){
        const near=list.scrollHeight-list.scrollTop-list.clientHeight<160;
        list.textContent="";
        if(!sess.aiMsgs.length&&!aiBusy)list.appendChild(el("div","dy-sys","Ask anything about the code: \"why does this test fail?\", \"write a regression test for…\", \"fix this function\"."));
        sess.aiMsgs.forEach(m=>{
          const tx=el("div","tx");
          if(m.role==="user"){tx.classList.add("plain");tx.textContent=m.content}else{renderMd(tx,m.content);addApply(tx,"an AI")}
          list.appendChild(bubble(m.role==="user"?null:AI,tx));
        });
        liveEl=null;
        if(aiBusy){liveEl=el("div","tx");list.appendChild(bubble(AI,liveEl));updateLive()}
        if(err){
          const d=el("div","dy-sys"),again=el("button","","Retry");d.append(el("span","warn",err+" "),again);list.appendChild(d);
          again.onclick=()=>{if(!aiBusy)askAI(retry)};
        }
        if(near||err)list.scrollTop=list.scrollHeight;
        hint.textContent=aiBusy?"The assistant is writing…":"";send.disabled=aiBusy;
      }
      function updateLive(){
        if(!liveEl)return;
        if(aiLive){liveEl.classList.remove("typing");renderMd(liveEl,aiLive)}else{liveEl.classList.add("typing");liveEl.textContent="thinking…"}
        if(list.scrollHeight-list.scrollTop-list.clientHeight<200)list.scrollTop=list.scrollHeight;
      }
      comp.onsubmit=ev=>{ev.preventDefault();const t=ta.value.trim();if(!t||aiBusy||sess.result)return;ta.value="";sess.aiDraft="";askAI(t)};
      ta.onkeydown=ev=>{if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();comp.requestSubmit()}};
      renderList();list.scrollTop=list.scrollHeight;
      return {renderList,updateLive};
    }

    // ---- apply: a coworker's code block can be merged into the matching file, with a diff to accept or reject ----
    const names=day.files.map(f=>f.name);
    // from: who suggested the code, for the timeline the manager reads.
    function addApply(tx,from="a coworker's"){
      if(sess.result)return;
      tx.querySelectorAll("pre").forEach(pre=>{
        const raw=pre.textContent.replace(/\n$/,"");if(!raw.trim()||!/[;{}()=]/.test(raw))return;
        const m=raw.match(/^\s*\/\/\s*([\w./-]+\.js)\s*(?:\n|$)/);
        let target=m&&names.find(x=>x===m[1].replace(/^\.?\//,"")),code=target?raw.replace(/^\s*\/\/[^\n]*\n?/,""):raw;
        if(!target){let text="";for(let n=pre.previousSibling;n&&n.tagName!=="PRE";n=n.previousSibling)text=(n.textContent||"")+" "+text;let at=-1;names.forEach(x=>{const k=text.lastIndexOf(x);if(k>at){at=k;target=x}})}
        if(!target)target=names.includes(openFile)?openFile:null;
        if(!target)return;
        const bar=el("div","dy-apply"),btn=el("button","","Apply"),to=el("span","to","to "+target);bar.append(btn,to);pre.after(bar);
        let panel=null;
        btn.onclick=()=>{
          if(panel){panel.remove();panel=null;return}
          const doc=docs[target],curT=doc.getValue(),snip=code.replace(/\r/g,"");
          const mg=mergeSnippet(curT,snip)||mergeMembers(curT,snip,doc.getCursor().line);
          if(!mg){to.textContent="can't place this automatically; copy it into "+target+" yourself";return}
          if(mg.text===curT){to.textContent="no changes for "+target;return}
          const diff=lineDiff(curT.split("\n"),mg.text.split("\n"));
          panel=el("div","dy-diff");
          const dh=el("div","dh"),ok=el("button","","Accept"),no=el("button","","Reject");
          dh.append(el("span","","Merges into "+target+(mg.replaced.length?", replaces "+mg.replaced.join(", "):"")+(mg.added.length?", adds "+mg.added.join(", "):"")+": +"+diff.filter(x=>x[0]==="+").length+" −"+diff.filter(x=>x[0]==="-").length),ok,no);
          const body=el("pre"),keep=new Array(diff.length).fill(false);
          diff.forEach((x,i)=>{if(x[0]!==" ")for(let k=Math.max(0,i-2);k<=Math.min(diff.length-1,i+2);k++)keep[k]=true});
          let gap=false;
          diff.forEach((x,i)=>{if(!keep[i]){if(!gap){body.appendChild(el("span","l gap","…"));gap=true}return}gap=false;body.appendChild(el("span","l "+(x[0]==="+"?"add":x[0]==="-"?"del":""),x[0]+" "+x[1]))});
          panel.append(dh,body);bar.after(panel);
          no.onclick=()=>{panel.remove();panel=null};
          ok.onclick=()=>{
            doc.replaceRange(mg.text,{line:0,ch:0},{line:doc.lastLine(),ch:doc.getLine(doc.lastLine()).length});
            note("applied "+from+" code suggestion to "+target);save();
            if(cur&&cur.showFile)cur.showFile(target);
            panel.remove();panel=null;btn.textContent="Applied ✓";to.textContent="to "+target+" (undo in the editor with ⌘/Ctrl+Z)";
          };
        };
      });
    }

    // ---- end of day: run every suite, then the manager's review ----
    function suiteOf(r,prefix){
      const idx=r.names.map((n,i)=>i).filter(i=>prefix?r.names[i].startsWith(prefix):!/^\[(feature|incident|mine)\] /.test(r.names[i]));
      const failed=idx.filter(i=>!(r.cases[i]&&r.cases[i].pass)).map(i=>r.names[i].slice(0,200));
      if(!r.names.length&&(r.fatal||r.err))failed.push("(tests could not run: "+(r.fatal||r.err.trim().split("\n")[0]).slice(0,150)+")");
      return {passed:idx.length-idx.filter(i=>!(r.cases[i]&&r.cases[i].pass)).length,total:idx.length,failed:failed.slice(0,100)};
    }
    const mineCount=()=>(mineDoc.getValue().replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"").match(/\btest\s*\(/g)||[]).length;
    let armedEnd=0,ending=false;
    endBtn.onclick=()=>{
      if(sess.result){open("review");return}
      if(ending)return;
      if(Object.keys(live).length){toast("Wait","A coworker is still replying.",view);return}
      if(aiBusy){toast("Wait","The AI assistant is still replying.","code");return}
      if(!armedEnd){endBtn.textContent="Click again to end the day";armedEnd=setTimeout(()=>{armedEnd=0;endBtn.textContent="End day & get review"},3000);return}
      clearTimeout(armedEnd);armedEnd=0;endDay();
    };
    async function endDay(){
      ending=true;endBtn.disabled=true;endBtn.textContent="Ending the day…";
      if(cur&&cur.leave)cur.leave();cur=null;view="review";main.textContent="";
      const busy=el("div","dy-busy","Running every test suite, then your manager is writing your review…");main.appendChild(busy);
      note("ended the day");
      try{
        const T=day.tests;
        const r=await runAp(files(),apSuites([["",T.visible],["[feature] ",T.feature],["[incident] ",T.incident]]),()=>{});
        const tests={visible:suiteOf(r,""),feature:suiteOf(r,"[feature] "),incident:suiteOf(r,"[incident] ")};
        const n=mineCount(),mineSrc=apCombine("","",mineDoc.getValue());
        const zero={passed:0,total:0,failed:[]};
        const ms=n?suiteOf(await runAp(starter,mineSrc,()=>{}),"[mine] "):zero,mf=n?suiteOf(await runAp(files(),mineSrc,()=>{}),"[mine] "):zero;
        const unlocked=day.tasks.filter(taskOn).map(t=>t.id);
        const threads={};Object.entries(sess.threads).forEach(([k,v])=>{if(v.length)threads[k]=v.slice(-200).map(m=>({from:m.from,text:m.text.slice(0,6000),at:m.at}))});
        const resp=await apiFetch("/api/day/evaluate",{method:"POST",body:JSON.stringify({day:day.id,session:sess.id,elapsed:sess.elapsed,clock:now(),files:files(),tests,
          mine:{source:n?mineDoc.getValue().slice(0,8000):"",starter:ms,final:mf},reviews:sess.reviews.map(r=>({rev:r.rev,decision:r.decision,text:r.text.slice(0,8000),at:r.at})),prRev:prRev(),
          handoff:sess.handoff.slice(0,6000),threads,events:sess.events.slice(-300),unlocked,runs:sess.runs,
          ai:!!sess.ai,assistant:sess.ai?aiTail(200):[]})});
        const data=await resp.json();
        if(!resp.ok)throw new Error(data.error||"Request failed");
        sess.result=data;addHistory(historyEntry(day,sess));sess.archived=true;save();open("review");
      }catch(err){
        busy.textContent=(err.message||"Request failed")+" ";const again=el("button","","Try again");again.onclick=endDay;busy.appendChild(again);
      }finally{ending=false;endBtn.disabled=false;endBtn.textContent=sess.result?"View review":"End day & get review"}
    }

    function reviewView(){
      const r=sess.result;
      if(!r){main.appendChild(el("div","dy-busy","No review yet."));return {}}
      header("Manager review","Your end-of-day review. Reviewed by "+r.model+". It is also kept under Past days on the list of days.");
      main.appendChild(reviewPane(r,labelsOf(day),timelineOf(day,sess)));
      return {};
    }

    // ---- clock ----
    const tick=setInterval(()=>{
      if(root().hidden||document.hidden||sess.result)return;
      sess.elapsed++;
      if(sess.t<dayLen){sess.t=Math.min(dayLen,sess.t+SPEED);runTimeline();renderTop()}
      if(sess.t>=dayLen&&!sess.overNoted){sess.overNoted=true;note("the workday ended ("+ampmS(day.clock.end)+")");toast("It's "+ampmS(day.clock.end),"The workday is over. End the day to get your review.","handoff",true)}
      if(sess.elapsed%5===0)save();
    },1000);
    work={save,tick,toasts,aborts};

    back.onclick=showList;
    if(!sess.fired["t-welcome"])runTimeline();
    renderTop();
    open(sess.result?"review":sess.view&&sess.view!=="review"&&isOpen(sess.view)?sess.view:"channel:team");
    if(sess.result)endBtn.textContent="View review";
  }

  window.dayInit=function(){
    if(ready)return;
    ready=true;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    showList();
  };
})();

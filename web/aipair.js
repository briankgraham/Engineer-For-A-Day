// AI Pairing tab: build a small JS project with an AI assistant that is sometimes subtly wrong.
// Depends on globals from index.html: $, el, loadCM, makeEditor, formatCode, RUN_TIMEOUT, darkMode, and WS from workspace.js (loaded first).
(function(){
  const KEY="aipair-sessions-v1";
  const {apCombine,apJoin,runAp,stopRun,readSSE,lineDiff,mergeSnippet,mergeMembers}=WS;

  const readSessions=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}};
  const writeSession=(id,s)=>{try{const all=readSessions();all[id]=s;localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  const dropSession=id=>{try{const all=readSessions();delete all[id];localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  const DKEY="aipair-done-v1",SKEY="aipair-sort-v1",LKEY="aipair-last-v1";
  const KIND_IC={debug:"🐞",lld:"🧩",review:"🔍",levels:"🪜"};
  const DIFF_PILL={Easy:"ok",Medium:"due",Hard:"flag"};
  const readDone=()=>{try{return JSON.parse(localStorage.getItem(DKEY))||{}}catch(e){return {}}};
  const setDone=(id,v)=>{try{const all=readDone();if(v)all[id]=true;else delete all[id];localStorage.setItem(DKEY,JSON.stringify(all))}catch(e){}};
  const SORTS={"":"Default order",todo:"Not completed first",done:"Completed first",easy:"Easiest first",hard:"Hardest first"};
  const readSort=()=>{try{const v=localStorage.getItem(SKEY);return v in SORTS?v:""}catch(e){return ""}};
  const DIFF={Easy:0,Medium:1,Hard:2};
  const fmt=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

  const css=`
.ap{max-width:1500px;margin:0 auto;padding:16px}
.ap h2{margin:0 0 4px;font-size:20px}.ap .sub{color:var(--muted);margin:0 0 14px}
.lr.ap{max-width:1180px;padding:28px 20px 80px}
.ap-card .dn{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer;width:max-content}
.ap-sort{display:flex;align-items:center;gap:8px;margin:0 0 14px;color:var(--muted);font-size:13px}
.lr-card.done{border-color:var(--easy)}
.lr-card .pills{display:flex;gap:6px;flex-wrap:wrap}
.lr-card .act{margin-top:auto;padding-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.lr-card .act .cta{padding:7px 16px;font-size:14px}
.lr-card .act button:not(.cta){background:none;border:1px solid var(--line);color:var(--fg);border-radius:999px;padding:6px 14px;font-weight:600}
.ap-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 -16px 12px;padding:8px 16px;position:sticky;top:var(--nav-h);z-index:2;background:var(--bg);border-bottom:1px solid var(--line)}
.ap-top h2{margin:0;flex:1;min-width:160px}.ap-timer{font-variant-numeric:tabular-nums;color:var(--muted)}
.ap-grid{display:grid;grid-template-columns:200px minmax(0,1fr) 340px;gap:14px;align-items:start}
.ap-rail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:10px 8px;position:sticky;top:calc(var(--nav-h) + var(--ap-top-h,62px));max-height:calc(100vh - var(--nav-h) - var(--ap-top-h,62px) - 18px);overflow:auto}
.ap-rail h4{margin:10px 8px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ap-rail h4:first-child{margin-top:2px}
.ap-rail button.it{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:none;padding:5px 8px;border-radius:var(--radius-sm);color:var(--fg);font:inherit;font-size:14px;cursor:pointer;box-shadow:none}
.ap-rail button.it:hover{background:var(--head)}.ap-rail button.it.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.ap-rail button.it .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ap-rail button.it>span:first-child{flex:none;width:18px;text-align:center;font:12px ui-monospace,Menlo,monospace;color:var(--muted)}
.ap-badge{font-size:11px;font-weight:700;min-width:18px;padding:0 6px;border-radius:99px;background:var(--hard);color:#fff;text-align:center}
.ap-pass{font-size:11px;font-weight:700;padding:0 6px;border-radius:99px;background:var(--head);color:var(--muted)}.ap-pass.ok{background:var(--easy-bg);color:var(--easy)}.ap-pass.no{background:var(--hard-bg);color:var(--hard)}
@media(max-width:1180px){.ap-grid{grid-template-columns:180px minmax(0,1fr)}.ap-side{grid-column:1/-1;position:static}}
@media(max-width:760px){.ap-grid{grid-template-columns:minmax(0,1fr)}.ap-rail{display:flex;flex-wrap:wrap;gap:2px;padding:6px;max-height:none;z-index:1}.ap-rail h4{display:none}.ap-rail button.it{width:auto}}
.ap-brief{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow-sm);margin-bottom:12px;overflow:hidden}
.ap-brief>.hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;font-weight:600}
.ap-brief .chip{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--head);color:var(--muted)}
.ap-brief .chip.hi{background:var(--accent-soft);color:var(--accent)}
.ap-brief .bd{border-top:1px solid var(--line)}
.ap-brief .goal{padding:12px 14px;background:var(--accent-soft);border-bottom:1px solid var(--line)}
.ap-brief h4{margin:0 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.ap-brief .goal p{margin:0;line-height:1.55}
.ap-brief .reqs{padding:12px 14px 6px}.ap-brief .reqs h4{color:var(--muted);margin-bottom:8px}
.ap-brief ol{list-style:none;margin:0;padding:0;counter-reset:req}
.ap-brief li{counter-increment:req;display:flex;gap:10px;align-items:flex-start;padding:8px 10px;margin:0 0 6px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--bg);line-height:1.5}
.ap-brief li::before{content:counter(req);flex:none;width:22px;height:22px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px}
.ap-brief li>span:first-of-type{flex:1;min-width:0}.req-mark{flex:none;width:22px;height:22px;border-radius:50%;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px}.req-mark:empty{display:none}.req-mark.ok{background:var(--easy-bg);color:var(--easy)}.req-mark.no{background:var(--hard-bg);color:var(--hard)}
.ap-brief li code{font:12px ui-monospace,Menlo,monospace;background:var(--head);border:1px solid var(--line);border-radius:4px;padding:0 4px;white-space:nowrap}
.ap-ed{scroll-margin-top:calc(var(--nav-h) + var(--ap-top-h,62px) + 10px)}
.ap-ed .CodeMirror{height:calc(100vh - var(--nav-h) - 150px);min-height:320px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:13px}
.ap-res{margin-top:12px;scroll-margin-top:calc(var(--nav-h) + var(--ap-top-h,62px) + 10px)}.ap-res .sum{font-weight:600;margin-bottom:6px}
.ap-res .row{padding:4px 0;border-bottom:1px solid var(--line)}.ap-res .row.ok::before{content:"✓ ";color:var(--easy);font-weight:700}.ap-res .row.no::before{content:"✗ ";color:var(--hard)}
.ap-res pre,.ap-con{background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:4px 0 0;overflow-x:auto;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap}
.ap-con:empty{display:none}
.ap-res details.src{margin:4px 0 2px}.ap-res details.src summary{cursor:pointer;color:var(--accent);font-size:13px}
.ap-res pre.code{white-space:pre;max-height:360px;overflow:auto}
.ap-eval{background:var(--surface);border:1px solid var(--accent);border-radius:var(--radius);padding:12px 16px;margin-bottom:12px}
.ap-eval h4{margin:14px 0 6px}.ap-eval .ehd{display:flex;justify-content:space-between;align-items:center}.ap-eval h3{margin:0}
.ap-eval .erow{display:flex;flex-direction:column;margin:6px 0}.ap-eval .erow span,.ap-eval .hint{color:var(--muted);font-size:13px}
.ap-eval .eflaw{border-top:1px solid var(--line);padding:8px 0;display:flex;flex-direction:column;gap:2px}
.ap-eval .badge{font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line)}
.ap-eval .badge.caught{color:var(--easy)}.ap-eval .badge.shipped{color:var(--hard)}.ap-eval .badge.fixed_late,.ap-eval .badge.unchallenged{color:var(--med)}
.ap-eval.busy{color:var(--muted)}
.ap-side{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;position:sticky;top:calc(var(--nav-h) + var(--ap-top-h,62px) + 10px)}
.ap-side .hint{color:var(--muted);font-size:12px;margin:2px 0 8px}.ap-side .chat{margin-top:0;padding-top:0;border-top:0}
.ap-side .chat>div:not([class]){max-height:calc(100vh - 440px);min-height:120px}
.ap-side .chat .m.warn{color:var(--hard)}
.ap-side .chat pre{overflow-x:auto;background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre}
.ap-side .chat form{flex-direction:column;align-items:stretch}
.ap-side .vrow{display:flex;gap:6px}.ap-side .vrow button:last-child{margin-left:auto}.ap-side .chat .meta{font-size:12px;color:var(--muted)}
.ap-apply{display:flex;gap:6px;align-items:center;margin:-2px 0 8px}.ap-apply .to{color:var(--muted);font-size:12px}
.ap-diff{margin:0 0 8px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.ap-diff .dh{display:flex;gap:6px;align-items:center;padding:6px 8px;background:var(--head);font-size:12px}.ap-diff .dh span{flex:1}
.ap-diff pre{margin:0;border:0;border-radius:0;max-height:240px;overflow:auto;padding:0}
.ap-diff .l{display:block;padding:0 8px;white-space:pre}.ap-diff .l.add{background:color-mix(in srgb,var(--done) 22%,transparent)}
.ap-diff .l.del{background:color-mix(in srgb,var(--hard) 22%,transparent)}.ap-diff .l.gap{color:var(--muted)}
.ap-pr{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:4px 16px 12px;line-height:1.55}
.ap-pr blockquote,.ap-pr .quote{margin:6px 0;padding:6px 12px;border-left:3px solid var(--line);color:var(--muted)}
.ap-pr pre{margin:8px 0;padding:0;border:1px solid var(--line);border-radius:6px;overflow-x:auto;font:12px/1.5 ui-monospace,Menlo,monospace;background:var(--head)}
.ap-pr pre .l{display:block;padding:0 10px;white-space:pre}.ap-pr pre .l.hunk{color:var(--muted);background:var(--accent-soft)}
.ap-pr pre .l.add{background:color-mix(in srgb,var(--done) 22%,transparent)}.ap-pr pre .l.del{background:color-mix(in srgb,var(--hard) 22%,transparent)}
.ap-gate{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;margin-bottom:12px;border:1px dashed var(--accent);border-radius:var(--radius-sm);background:var(--accent-soft)}
.ap-gate span{flex:1 1 280px}
.ap-fu{border-color:var(--accent)}
.ap-eval .badge.found_fixed{color:var(--easy)}.ap-eval .badge.missed{color:var(--hard)}.ap-eval .badge.found,.ap-eval .badge.fixed_silently{color:var(--med)}
`;

  let ready=false,scenarios=null,work=null;
  const root=()=>$("tab-aipair");

  function leaveWork(){
    if(!work)return;
    work.save();clearInterval(work.tick);
    stopRun();
    if(work.abort)work.abort.abort();
    work.stopVoice();
    work=null;
  }

  async function showList(){
    leaveWork();openGen++;
    LK.injectCss();
    const r=root();r.textContent="";
    const wrap=el("div","lr lr-home ap");r.appendChild(wrap);
    const intro="Build a small project with an AI coding assistant. It is sometimes subtly wrong, so verify what it gives you. Some tests are visible and some are hidden, and you can write your own.";
    if(!scenarios){
      try{
        // Plain fetch: apiFetch would light the global "AI busy" spinner for a non-AI call.
        const res=await fetch("/api/ap/scenarios",{headers:{"X-Requested-With":"walkthrough"}});
        if(!res.ok)throw new Error(res.status);
        scenarios=(await res.json()).scenarios;
      }catch(e){
        wrap.append(el("h1",null,"AI Pairing"),el("p","lede",intro));
        const cards=el("div","lr-cards"),c=el("div","lr-card soon");
        c.append(el("div","ic","🔌"),el("h3",null,"Could not load scenarios"),el("p",null,"AI Pairing needs the local server. In a terminal run: python3 server.py, then open the address it prints."),LK.btn("Try again",showList,"ghost"));
        cards.appendChild(c);wrap.appendChild(cards);return;
      }
    }
    const sessions=readSessions();
    let sort=readSort();
    const top=el("div");wrap.appendChild(top);
    const bar=el("label","ap-sort","Sort by ");const sel=el("select");
    Object.entries(SORTS).forEach(([v,t])=>{const o=el("option","",t);o.value=v;sel.appendChild(o)});
    sel.value=sort;bar.appendChild(sel);wrap.appendChild(bar);
    const grid=el("div","lr-cards");wrap.appendChild(grid);
    const render=()=>{
      const done=readDone();
      const nDone=scenarios.filter(sc=>done[sc.id]).length,nProg=scenarios.filter(sc=>sessions[sc.id]&&!done[sc.id]).length;
      top.textContent="";
      top.appendChild(LK.listHero({title:"AI Pairing",tag:intro,
        outcomes:["Spot the subtle mistakes in AI-written code","Write your own tests, not just the visible ones","Debug, review and design with an assistant beside you"],
        done:nDone,total:scenarios.length,label:"completed",
        stats:[nProg+" in progress",scenarios.length-nDone+" to go"]}));
      let lastId="";try{lastId=localStorage.getItem(LKEY)||""}catch(e){}
      const rs=scenarios.find(sc=>sc.id===lastId&&sessions[sc.id]&&!sessions[sc.id].result);
      if(rs)top.appendChild(LK.contBanner("Pick up where you left off",rs.title,"Continue →",()=>openWork(rs)));
      grid.textContent="";
      // Array.sort is stable, so ties keep the default (server) order.
      const rank=sc=>sort==="todo"?+!!done[sc.id]:sort==="done"?+!done[sc.id]:sort==="easy"?(DIFF[sc.difficulty]??1):sort==="hard"?-(DIFF[sc.difficulty]??1):0;
      [...scenarios].sort((a,b)=>rank(a)-rank(b)).forEach(sc=>{
      const s=sessions[sc.id];
      const card=el("div","lr-card ap-card"+(done[sc.id]?" done":""));
      card.append(el("div","ic",KIND_IC[sc.kind]||"🛠"),el("h3","",sc.title),el("p","",sc.blurb));
      const pills=el("div","pills");card.appendChild(pills);
      const kind=sc.kind==="review"?"Code review":sc.kind==="debug"?"Debugging":sc.kind==="lld"?"Object design":sc.kind==="levels"?sc.levels.length+1+" levels":"";
      if(kind)pills.appendChild(el("span","pill",kind));
      pills.append(el("span","pill "+(DIFF_PILL[sc.difficulty]||""),sc.difficulty),el("span","pill","~"+sc.minutes+" min"));
      if(done[sc.id])pills.appendChild(el("span","pill ok","✓ Completed"));
      if(s){
        pills.appendChild(el("span","pill acc","In progress · "+fmt(s.elapsed||0)));
        if(s.followup)pills.appendChild(el("span","pill","follow-up revealed"));
        if(sc.kind==="levels")pills.appendChild(el("span","pill","on level "+(1+(s.levels||[]).length)));
      }
      // Bar: the last test run's pass rate, full once marked completed.
      const frac=done[sc.id]?1:s&&s.last&&s.last.total?s.last.passed/s.last.total:0;
      const bot=el("div","bot"),bb=el("div","lr-bar"),fill=el("i");fill.style.width=100*frac+"%";bb.appendChild(fill);bot.appendChild(bb);
      if(s&&s.last)bot.appendChild(el("span","pill",s.last.passed+"/"+s.last.total+" tests"));
      card.appendChild(bot);
      const dn=el("label","dn");const cb=el("input");cb.type="checkbox";cb.checked=!!done[sc.id];
      cb.onchange=()=>{setDone(sc.id,cb.checked);render()};
      dn.append(cb,"Completed");card.appendChild(dn);
      const b=LK.btn(s?"Resume":"Start",()=>openWork(sc),"cta");
      const act=el("div","act");card.appendChild(act);act.appendChild(b);
      if(s){
        const d=el("button","",s.result?"Discard attempt":"Abandon");let armed=0;
        d.onclick=()=>{
          if(!armed){d.textContent="Click again to delete";armed=setTimeout(()=>{armed=0;d.textContent=s.result?"Discard attempt":"Abandon"},3000);return}
          clearTimeout(armed);dropSession(sc.id);showList();
        };
        act.appendChild(d);
      }
      grid.appendChild(card);
      });
    };
    sel.onchange=()=>{sort=sel.value;try{localStorage.setItem(SKEY,sort)}catch(e){}render()};
    render();
  }

  let openGen=0;
  async function openWork(sc){
    leaveWork();
    const gen=++openGen;
    try{localStorage.setItem(LKEY,sc.id)}catch(e){}
    const r=root();r.textContent="";
    const wrap=el("div","ap");r.appendChild(wrap);
    const sess=readSessions()[sc.id]||{files:{},elapsed:0};
    if(!sess.id)sess.id=crypto.randomUUID(); // names this attempt for the server-side flaw log
    if(!Array.isArray(sess.msgs))sess.msgs=[];
    const modName=sc.files[0].name.replace(/\.js$/,"");
    const MINE_STARTER="// Your own tests. Same helpers as the visible tests: test, eq, assert, throws, require, mkClock, mkDeferred, flush.\n// They run with the visible tests each time you press Run.\n//\n// test(\"describe what should happen\", () => {\n//   const m = require(\"./"+modName+"\");\n//   eq(1 + 1, 2);\n// });\n";
    if(typeof sess.custom!=="string")sess.custom=MINE_STARTER;
    const REVIEW_STARTER="# Review of PR\n\nOne finding per item: what is wrong, where (file and function), why it matters, severity (high / medium / low).\n\n1. \n";
    if(typeof sess.review!=="string")sess.review=REVIEW_STARTER;
    // Object design scenarios: design.md comes first (code files are read-only until "Start coding"), and a follow-up
    // requirement is revealed partway through. sess.followup = {at: elapsed seconds, files: snapshot at the reveal}.
    const lld=sc.kind==="lld";
    const DESIGN_STARTER="# Design\n\n## Classes and what each one owns\n- \n\n## Interfaces (the methods each class exposes, and who calls them)\n- \n\n## States and transitions\n- \n\n## Where would a new requirement go?\n- \n";
    if(typeof sess.design!=="string")sess.design=DESIGN_STARTER;
    // Multi-level scenarios: level 1 is the brief; each later level unlocks when every visible test so far passes.
    // sess.levels = elapsed seconds at which level 2, 3, ... were unlocked.
    const multi=sc.kind==="levels",LV=multi?sc.levels:[];
    if(!Array.isArray(sess.levels))sess.levels=[];
    const lvName=k=>"level"+k,lvTabs=LV.map((_,i)=>lvName(i+2));
    const unlockedLv=()=>LV.slice(0,sess.levels.length);
    if(!Number.isInteger(sess.runs))sess.runs=0;
    const code=name=>sess.files[name]!=null?sess.files[name]:sc.files.find(f=>f.name===name).code;

    const top=el("div","ap-top");
    const back=el("button","","← All scenarios");
    const timer=el("span","ap-timer","00:00");
    const run=el("button","","▶ Run tests (⌘/Ctrl+Enter)");
    const stop=el("button","","Stop");stop.hidden=true;
    const fmtBtn=el("button","","Format");fmtBtn.title="Format your code with Prettier (Shift-Alt-F)";
    const reset=el("button","","Reset");
    const abandon=el("button","","Abandon");
    const finish=el("button","","Finish & get feedback");
    top.append(back,el("h2","",sc.title),timer,run,stop,fmtBtn,finish,reset,abandon);
    wrap.appendChild(top);
    // The bar wraps on narrow screens; the sticky rail and chat sit just below whatever height it has.
    const topH=()=>wrap.style.setProperty("--ap-top-h",top.offsetHeight+12+"px");
    topH();new ResizeObserver(topH).observe(top);

    const grid=el("div","ap-grid");wrap.appendChild(grid);
    // Left rail: the brief, the files and the test results, always in reach while the page scrolls.
    const rail=el("nav","ap-rail"),main=el("div","ap-main"),side=el("div","ap-side");
    grid.append(rail,main,side);
    side.appendChild(el("b","","AI assistant"));
    side.appendChild(el("p","hint",(lld?"It sees the brief, your design.md, your current files and the test file. Ask it to review your design too. Treat its answers like a teammate's: verify them.":sc.incident?"It sees your brief, your current files and the test file, but not the incident page: paste in the logs or trace you want it to look at. Treat its answers like a teammate's: verify them.":sc.pr?"It sees the PR, your current files, the PR's tests and your review.md. Treat its answers like a teammate's: verify them.":sc.visibleTests?"It sees your brief, your current files and the test file. Treat its answers like a teammate's: verify them.":"It sees your brief and current files, not the tests. Treat its answers like a teammate's: verify them.")));
    const chatRoot=el("div","chat"),chatLog=el("div"),chatForm=el("form"),chatIn=el("textarea"),chatBtn=el("button","","Send");
    chatIn.rows=3;chatIn.placeholder="Ask the assistant… (Enter to send, Shift+Enter for a new line)";chatBtn.type="submit";
    // Dictation reuses voiceInput from sysdesign.js: it only fills the box; nothing is sent until Send.
    const vi=typeof voiceInput==="function"?voiceInput(chatIn):null,row=el("div","vrow");
    if(vi){vi.note.textContent=vi.mic.disabled?vi.note.textContent:"Dictate, edit if needed, then Send.";row.append(vi.mic,chatBtn);chatForm.append(chatIn,row,vi.note)}
    else chatForm.append(chatIn,chatBtn);chatRoot.append(chatLog,chatForm);side.appendChild(chatRoot);

    const evalBox=el("div","ap-eval");evalBox.hidden=true;
    main.appendChild(evalBox);
    const brief=el("div","ap-brief");
    const bsum=el("div","hd","Brief and requirements");
    bsum.append(el("span","chip hi",sc.requirements.length+" requirements"),el("span","chip",sc.difficulty+" · ~"+sc.minutes+" min"));
    brief.appendChild(bsum);
    const bd=el("div","bd"),goal=el("div","goal");
    goal.append(el("h4","",multi?"Level 1 of "+(LV.length+1)+": "+(sc.levelTitle||"Getting started"):"Goal"),el("p","",sc.brief));
    const reqs=el("div","reqs"),ol=el("ol");
    reqs.appendChild(el("h4","","Requirements"));
    // Identifiers, calls like on(event, fn) and quoted names like 'error' render as inline code.
    const CODE=/(\b[A-Za-z_][\w-]*(?:\.\w+)*\([^()]*\)|'[^']*'|"[^"]*"|\b\w+\.\w+\b)/g;
    // Each requirement gets a status mark from the last test run: sec ("L1", "followup", "level2"...) picks the
    // test-name -> requirement-number map in sc.reqTests. No mapped test has run yet (or none exists) leaves it neutral.
    const reqMarks={};
    const reqList=(sec,items,into)=>{
      reqMarks[sec]=items.map(t=>{
        const li=el("li"),span=el("span"),mark=el("span","req-mark");
        t.split(CODE).forEach((part,i)=>span.appendChild(i%2?el("code","",part):document.createTextNode(part)));
        li.append(span,mark);into.appendChild(li);return mark;
      });
    };
    function paintReqs(){
      const seen=(sess.last&&sess.last.tests)||{};
      Object.entries(reqMarks).forEach(([sec,marks])=>{
        const map=(sc.reqTests&&sc.reqTests[sec])||{};
        marks.forEach((mark,i)=>{
          const t=Object.keys(map).filter(n=>map[n].includes(i+1)&&n in seen);
          const st=!t.length?"":t.every(n=>seen[n])?"ok":"no";
          mark.className="req-mark"+(st?" "+st:"");
          mark.textContent=st==="ok"?"✓":st==="no"?"✗":"";
          mark.title=st==="ok"?"Every visible test for this requirement passed on the last run":st==="no"?"A visible test for this requirement failed on the last run: "+t.filter(n=>!seen[n]).join("; "):"No visible test for this requirement has run yet";
        });
      });
    }
    reqList("L1",sc.requirements,ol);
    reqs.appendChild(ol);bd.append(goal,reqs);brief.appendChild(bd);
    main.appendChild(brief);
    // The follow-up requirement, shown once revealed (same look as the brief).
    const fuBox=el("div","ap-brief ap-fu");fuBox.hidden=true;
    if(lld&&sc.followup){
      const fs=el("div","hd","New requirement: "+sc.followup.title);fs.appendChild(el("span","chip hi",sc.followup.requirements.length+" requirements"));
      const fb=el("div","bd"),fg=el("div","goal"),fr=el("div","reqs"),fol=el("ol");
      fg.append(el("h4","","Follow-up"),el("p","",sc.followup.brief));
      fr.appendChild(el("h4","","Requirements"));reqList("followup",sc.followup.requirements,fol);fr.appendChild(fol);
      fb.append(fg,fr);fuBox.append(fs,fb);main.appendChild(fuBox);
    }
    // One card per later level, shown from its rail tab once unlocked.
    const lvBoxes=LV.map((lv,i)=>{
      const box=el("div","ap-brief ap-fu");box.hidden=true;
      const hd=el("div","hd","Level "+(i+2)+": "+lv.title);hd.appendChild(el("span","chip hi",lv.requirements.length+" requirements"));
      const b=el("div","bd"),g=el("div","goal"),rq=el("div","reqs"),o=el("ol");
      g.append(el("h4","","Level "+(i+2)+" of "+(LV.length+1)),el("p","",lv.brief));
      rq.appendChild(el("h4","","Requirements"));reqList("level"+(i+2),lv.requirements,o);rq.appendChild(o);
      b.append(g,rq);box.append(hd,b);main.appendChild(box);return box;
    });
    // What a still-locked level's tab shows: its title and how it unlocks, but not its brief.
    const lvLockBox=el("div","ap-brief ap-fu");lvLockBox.hidden=true;main.appendChild(lvLockBox);
    function renderLvLock(k){
      lvLockBox.textContent="";
      const hd=el("div","hd","Level "+k+": "+LV[k-2].title);hd.appendChild(el("span","chip","🔒 locked"));
      const g=el("div","goal"),cur=sess.levels.length+1,L=sess.last;
      g.append(el("h4","","Level "+k+" of "+(LV.length+1)),
        // The count only while tests fail: right after an unlock the last run predates the new level's tests.
        el("p","",k===cur+1?"Unlocks when every visible test passes"+(L&&L.passed<L.total?" (last run: "+L.passed+"/"+L.total+" passing).":"."):"Unlocks after level "+(k-1)+"."));
      const b=el("div","bd");b.appendChild(g);lvLockBox.append(hd,b);
    }
    // Design gate: code files stay read-only until design.md has some substance and the candidate starts coding.
    const gate=el("div","ap-gate");gate.hidden=true;
    const gateMsg=el("span"),gateBtn=el("button","","Start coding");
    gate.append(gateMsg,gateBtn);main.appendChild(gate);

    const host=el("div","ap-ed"),results=el("div","ap-res"),con=el("pre","ap-con");
    // Review scenarios: the PR page (description, diff, bot comment) is a rendered view shown in place of the editor.
    const prView=el("div","ap-pr");prView.hidden=true;
    main.append(prView,host,results,con);
    if(sc.pr||sc.incident){
      renderMd(prView,sc.pr||sc.incident);
      prView.querySelectorAll("p").forEach(p=>{const t=p.firstChild;if(t&&t.nodeType===3&&t.data.startsWith("> ")){t.data=t.data.slice(2);p.classList.add("quote")}});
      prView.querySelectorAll("pre").forEach(pre=>{
        const lines=pre.textContent.split("\n");if(!lines.some(l=>l.startsWith("@@")))return;
        pre.replaceChildren(...lines.map(l=>el("span","l"+(l.startsWith("@@")?" hunk":/^\+(?!\+\+ )/.test(l)?" add":/^-(?!-- )/.test(l)?" del":""),l||" ")));
      });
    }

    try{await loadCM()}catch(e){host.textContent="Could not load the code editor from the CDN.";return}
    if(gen!==openGen)return; // user went back to the list while the editor was loading
    const docs={};
    sc.files.forEach(f=>{docs[f.name]=CodeMirror.Doc(code(f.name),"javascript")});
    const ed=makeEditor(host,{doc:docs[sc.files[0].name],run:()=>doRun()});

    const prName=sc.pr?"pull request":sc.incident?"incident":null,reviewName=sc.pr?"review.md":null,designName=lld?"design.md":null;
    // Some scenarios show their test file: a read-only tab that is never saved, applied to or reset.
    const testName=sc.visibleTests?sc.id+".test.js":null;
    const FU_HEAD="\n\n// ---- Follow-up: "+(sc.followup?sc.followup.title:"")+" ----\n\n";
    const visibleText=()=>sc.visibleTests+(sess.followup&&sc.followupVisibleTests?FU_HEAD+sc.followupVisibleTests:"")+unlockedLv().map((lv,i)=>"\n\n// ---- Level "+(i+2)+": "+lv.title+" ----\n\n"+lv.visibleTests).join("");
    const testDoc=testName?CodeMirror.Doc(visibleText(),"javascript"):null;
    // Your own tests: editable, saved with the attempt, and run together with the visible ones.
    const mineName="my-tests.js";
    const mineDoc=CodeMirror.Doc(sess.custom,"javascript");
    const reviewDoc=reviewName?CodeMirror.Doc(sess.review,"text/plain"):null;
    const designDoc=designName?CodeMirror.Doc(sess.design,"text/plain"):null;
    const locked=name=>lld&&!sess.coding&&!!docs[name];
    let running=false;
    const BRIEF="brief",FU="followup";
    const tabs=[BRIEF,FU,...lvTabs,prName,designName,...sc.files.map(f=>f.name),testName,mineName,reviewName].filter(Boolean);
    const lvOpen=name=>!lvTabs.includes(name)||lvTabs.indexOf(name)<sess.levels.length;
    // Reopens the last tab; a fresh attempt starts on the brief.
    let open=tabs.includes(sess.open)&&(sess.open!==FU||sess.followup)&&lvOpen(sess.open)?sess.open:!sess.elapsed?BRIEF:prName||(lld&&!sess.coding?designName:sc.files[0].name);
    const isView=name=>name===BRIEF||name===FU||name===prName||lvTabs.includes(name);
    const showTab=name=>{
      open=sess.open=name;const isTest=name===testName,isPr=name===prName;
      if(isTest)sess.viewedTests=true;
      if(name===FU)sess.fuSeen=true;
      if(name===lvName(sess.levels.length+1))sess.lvSeen=true;
      const lvLocked=lvTabs.includes(name)&&!lvOpen(name);
      if(lvLocked)renderLvLock(lvTabs.indexOf(name)+2);
      brief.hidden=name!==BRIEF;fuBox.hidden=name!==FU;lvBoxes.forEach((b,i)=>{b.hidden=lvLocked||name!==lvName(i+2)});lvLockBox.hidden=!lvLocked;prView.hidden=!isPr;host.hidden=isView(name);
      if(!isView(name)){ed.swapDoc(isTest?testDoc:name===mineName?mineDoc:name===reviewName?reviewDoc:name===designName?designDoc:docs[name]);ed.setOption("readOnly",isTest||locked(name));ed.refresh()}
      renderRail();
    };
    const TITLES={[designName]:"Your design: classes, what each owns, interfaces, states. Write it before coding; it is sent to the assistant and graded.",
      [prName]:sc.incident?"The incident ticket: what is known, what was tried, the job log and the support ticket. The assistant cannot see it.":"The PR you are reviewing: description, diff and the review bot's comment.",
      [testName]:"Read-only: the tests you can see. Hidden edge cases run when you finish. Add your own in my-tests.js.",
      [mineName]:"Your own tests. They run with the visible tests each time you press Run.",
      [reviewName]:"Your review: one finding per item, with where, why it matters and severity. Graded when you finish."};
    function renderRail(){
      rail.textContent="";
      const item=(icon,label,on,onclick,extra)=>{
        const b=el("button","it"+(on?" on":""));b.append(el("span","",icon),el("span","nm",label));if(extra)b.appendChild(extra);
        b.onclick=onclick;rail.appendChild(b);return b;
      };
      const tab=(name,icon,label,extra)=>{
        const b=item(icon,label||name,open===name,()=>{showTab(name);save();if(isView(name))main.scrollIntoView({block:"nearest"});else{host.scrollIntoView({behavior:"smooth",block:"nearest"});ed.focus()}},extra);
        if(TITLES[name])b.title=TITLES[name];else if(label)b.title=label; // level titles are often cut off by the rail width
      };
      rail.appendChild(el("h4","","Scenario"));
      tab(BRIEF,"📋",multi?"Level 1 · "+sc.levelTitle:"Brief");
      // Every level is listed; locked ones show their title only, and open a "how it unlocks" card.
      LV.forEach((lv,i)=>{
        const name=lvName(i+2),label="Level "+(i+2)+" · "+lv.title;
        if(lvOpen(name))tab(name,"✦",label,i===sess.levels.length-1&&!sess.lvSeen?el("span","ap-badge","new"):null);
        else tab(name,"🔒",label);
      });
      if(sess.followup)tab(FU,"✦","New requirement",sess.fuSeen?null:el("span","ap-badge","new"));
      if(prName)tab(prName,sc.incident?"🚨":"🔀",sc.incident?"Incident":"Pull request");
      if(designName)tab(designName,"✎");
      rail.appendChild(el("h4","","Files"));
      sc.files.forEach(f=>tab(f.name,locked(f.name)?"🔒":"{}"));
      if(testName)tab(testName,"🔒");
      tab(mineName,"✎");
      if(reviewName)tab(reviewName,"✎");
      rail.appendChild(el("h4","","Tests"));
      const L=sess.last,chip=running?el("span","ap-pass","…"):L?el("span","ap-pass "+(L.passed===L.total?"ok":"no"),L.passed+"/"+L.total):null;
      item("✓","Test results",false,()=>results.scrollIntoView({behavior:"smooth",block:"start"}),chip).title="Jump to the latest test run";
      const H=sess.result&&sess.hidden&&sess.hidden.length?sess.hidden:null,hp=H&&H.filter(c=>c.pass).length;
      if(H)item("◌","Hidden tests",false,()=>{evalBox.hidden=false;(hidHead||evalBox).scrollIntoView({behavior:"smooth",block:"start"})},el("span","ap-pass "+(hp===H.length?"ok":"no"),hp+"/"+H.length)).title="The hidden tests from your last finish, with the code of each";
      if(sess.result)item("★","Feedback",false,()=>{evalBox.hidden=false;evalBox.scrollIntoView({behavior:"smooth",block:"start"})});
    }
    showTab(open);paintReqs();

    const state={files:()=>Object.fromEntries(sc.files.map(f=>[f.name,docs[f.name].getValue()]))};
    let dead=false; // set by Abandon so the leave-time save cannot recreate the session
    const reviewText=()=>reviewDoc?reviewDoc.getValue():"";
    const designText=()=>designDoc?designDoc.getValue():"";
    // Words written beyond the starter outline; the gate opens at 30.
    const designWords=()=>designText().split("\n").filter(l=>!DESIGN_STARTER.split("\n").includes(l)).join(" ").split(/\s+/).filter(w=>/\w/.test(w)).length;
    function renderGate(){
      if(!lld)return;
      gate.hidden=!!sess.coding;
      if(sess.coding){showTab(open);return}
      const n=designWords(),need=30;
      gateMsg.textContent=n<need?"Design first: write your classes, what each owns and their interfaces in design.md. The code files unlock after about "+need+" words ("+n+" so far).":"Design written. Start coding when you are ready; you can keep editing design.md.";
      gateBtn.disabled=n<need;
    }
    gateBtn.onclick=()=>{if(designWords()<30)return;sess.coding=true;renderGate();save();showTab(sc.files[0].name);ed.focus()};
    if(designDoc)designDoc.on("change",()=>renderGate());
    renderGate();
    // The follow-up appears when the visible tests first all pass, or at 60% of the suggested time, whichever comes first.
    function revealFollowup(){
      if(!lld||!sc.followup||sess.followup)return;
      sess.followup={at:sess.elapsed,files:state.files()};
      if(testDoc&&sc.followupVisibleTests)testDoc.setValue(sc.visibleTests+FU_HEAD+sc.followupVisibleTests);
      sess.fuSeen=false;save();renderRail(); // the rail item carries a "new" badge until it is opened
    }
    // The next level appears when every visible test passes (the candidate's own tests aside), as in a multi-level assessment.
    function unlockLevel(){
      if(!multi||sess.levels.length>=LV.length)return;
      sess.levels.push(sess.elapsed);
      if(testDoc)testDoc.setValue(visibleText());
      sess.lvSeen=false;save();
      if(lvTabs.includes(open))showTab(open);else renderRail(); // the rail item carries a "new" badge until it is opened
      const k=sess.levels.length+1,note=el("div","sum","All visible tests pass. Level "+k+" unlocked: "+LV[k-2].title+". Open it in the left rail.");
      results.prepend(note);
    }
    const save=()=>dead||writeSession(sc.id,{id:sess.id,msgs:sess.msgs,files:state.files(),custom:mineDoc.getValue(),review:reviewDoc?reviewText():undefined,design:designDoc?designText():undefined,coding:sess.coding||undefined,followup:sess.followup||undefined,fuSeen:sess.fuSeen||undefined,levels:multi?sess.levels:undefined,lvSeen:sess.lvSeen||undefined,open:sess.open,hidden:sess.hidden||undefined,runs:sess.runs,viewedTests:sess.viewedTests,elapsed:sess.elapsed,last:sess.last,result:sess.result});
    let saveT=0;
    ed.on("change",()=>{clearTimeout(saveT);saveT=setTimeout(save,500)});
    // A test() call outside a comment counts as a written test; the untouched starter has none.
    const mineCount=()=>(mineDoc.getValue().replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"").match(/\btest\s*\(/g)||[]).length;

    // Counts up while the workspace is visible and the browser tab is in the foreground, and stops from the moment Finish is pressed (Reset starts it again).
    let finishing=false;
    const tick=setInterval(()=>{
      if(root().hidden||document.hidden||finishing||sess.result)return;
      sess.elapsed++;timer.textContent=fmt(sess.elapsed);
      if(lld&&!sess.followup&&sess.elapsed>=Math.round(sc.minutes*60*0.6))revealFollowup();
      if(sess.elapsed%5===0)save();
    },1000);
    timer.textContent=fmt(sess.elapsed);
    work={save,tick,stopVoice:()=>{if(vi)vi.stop()}};

    // ---- chat: same SSE protocol as the other tabs; the server strips any hidden flaw tag before it reaches us ----
    const bubble=(m,into)=>{const d=el("div","m"+(m.role==="user"?" u":""),m.content);if(m.role!=="user"){renderMd(d,m.content);addApply(d)}into.appendChild(d);return d};

    // ---- apply: each fenced block in an assistant reply gets an Apply button that previews a diff, then writes into the editor doc (so undo works) ----
    const names=sc.files.map(f=>f.name);
    function targetOf(pre,codeText){
      const m=codeText.match(/^\s*\/\/\s*([\w./-]+\.js)\s*(?:\n|$)/);
      if(m){const nm=m[1].replace(/^\.?\//,"");const hit=names.find(x=>x===nm||x.endsWith("/"+nm)||nm.endsWith("/"+x));if(hit)return {name:hit,code:codeText.replace(/^\s*\/\/[^\n]*\n?/,"")}}
      // otherwise the last file name mentioned in the prose since the previous code block
      let text="";for(let n=pre.previousSibling;n&&n.tagName!=="PRE";n=n.previousSibling)text=(n.textContent||"")+" "+text;
      let best=null,at=-1;names.forEach(x=>{const k=text.lastIndexOf(x);if(k>at){at=k;best=x}});
      return {name:best||(names.includes(open)?open:names[0]),code:codeText};
    }
    function addApply(d){
      d.querySelectorAll("pre").forEach(pre=>{
        const raw=pre.textContent.replace(/\n$/,"");if(!raw.trim())return;
        const t=targetOf(pre,raw),bar=el("div","ap-apply"),btn=el("button","","Apply"),to=el("span","to","to "+t.name);
        bar.append(btn,to);pre.after(bar);
        let panel=null;
        btn.onclick=()=>{
          if(locked(t.name)){to.textContent="finish design.md and press Start coding first";return}
          if(panel){panel.remove();panel=null;return}
          const doc=docs[t.name],cur=doc.getValue(),snip=t.code.replace(/\r/g,"");
          const mg=mergeSnippet(cur,snip)||mergeMembers(cur,snip,doc.getCursor().line);
          // no top-level names (e.g. one class method): insert at the cursor instead of replacing the file
          const cp=doc.getCursor(),cl=doc.indexFromPos(cp),next=mg?mg.text:cur.slice(0,cl)+snip+(snip.endsWith("\n")?"":"\n")+cur.slice(cl);
          if(cur===next){to.textContent="no changes for "+t.name;return}
          const diff=lineDiff(cur.split("\n"),next.split("\n"));
          const add=diff.filter(x=>x[0]==="+").length,del=diff.filter(x=>x[0]==="-").length;
          panel=el("div","ap-diff");
          const dh=el("div","dh"),ok=el("button","","Accept"),no=el("button","","Reject");
          dh.append(el("span","",(mg?"Merges into "+t.name+(mg.replaced.length?", replaces "+mg.replaced.join(", "):"")+(mg.added.length?", adds "+mg.added.join(", "):"")+" (rest of file kept)":"Inserts at the cursor in "+t.name+" (rest of file kept)")+": +"+add+" −"+del+" lines"),ok,no);
          const body=el("pre");
          // show changed lines with 2 lines of context; collapse the rest
          const keep=new Array(diff.length).fill(false);
          diff.forEach((x,i)=>{if(x[0]!==" ")for(let k=Math.max(0,i-2);k<=Math.min(diff.length-1,i+2);k++)keep[k]=true});
          let gap=false;
          diff.forEach((x,i)=>{
            if(!keep[i]){if(!gap){body.appendChild(el("span","l gap","…"));gap=true}return}
            gap=false;body.appendChild(el("span","l "+(x[0]==="+"?"add":x[0]==="-"?"del":""),x[0]+" "+x[1]));
          });
          panel.append(dh,body);bar.after(panel);
          no.onclick=()=>{panel.remove();panel=null};
          ok.onclick=()=>{
            if(mg)doc.replaceRange(next,{line:0,ch:0},{line:doc.lastLine(),ch:doc.getLine(doc.lastLine()).length});
            else doc.replaceRange(snip+(snip.endsWith("\n")?"":"\n"),cp);
            showTab(t.name);save();panel.remove();panel=null;
            btn.textContent="Applied ✓";to.textContent="to "+t.name+" (⌘/Ctrl+Z in the editor to undo)";
          };
        };
      });
    }
    sess.msgs.forEach(m=>bubble(m,chatLog));
    chatLog.scrollTop=chatLog.scrollHeight;
    let chatBusy=false,ac=null;
    async function sendChat(){
      const text=chatIn.value.trim();
      if(!text||chatBusy)return;
      if(vi)vi.stop();
      chatBusy=true;chatBtn.disabled=true;chatIn.value="";
      sess.msgs.push({role:"user",content:text});
      bubble({role:"user",content:text},chatLog);
      const out=el("div","m busy","Thinking…");chatLog.appendChild(out);chatLog.scrollTop=chatLog.scrollHeight;chatRoot.scrollIntoView({block:"end",behavior:"smooth"}); // the rail drops below the editor on narrow screens: bring the new question and reply into view
      let answer="";
      ac=work.abort=new AbortController();
      try{
        // Only the latest 11 messages go up (an odd count keeps the first one a user turn).
        const messages=sess.msgs.slice(-11);
        const res=await apiFetch("/api/ap/chat",{method:"POST",signal:ac.signal,body:JSON.stringify({scenario:sc.id,session:sess.id,files:state.files(),messages,review:reviewText().slice(0,6000),...(lld?{design:designText().slice(0,8000),followup:!!sess.followup}:{}),...(multi?{level:1+sess.levels.length}:{})})});
        if(!res.ok){const d=await res.json();throw new Error(d.error||"Request failed")}
        answer=(await readSSE(res,a=>{out.classList.remove("busy");renderMd(out,a);if(chatLog.scrollHeight-chatLog.scrollTop-chatLog.clientHeight<160)chatLog.scrollTop=chatLog.scrollHeight})).trim();
        sess.msgs.push({role:"assistant",content:answer||"(no answer)"});
        if(!answer){out.classList.remove("busy");out.textContent="(no answer)"}
        else addApply(out);
        save();
      }catch(err){
        sess.msgs.pop();save(); // drop the unanswered question so the history keeps alternating
        if(err&&err.name==="AbortError"){out.remove();return}
        out.classList.remove("busy");out.textContent=err.message||"Request failed";out.classList.add("warn");
      }finally{chatBusy=false;chatBtn.disabled=false;ac=null}
    }
    chatForm.onsubmit=ev=>{ev.preventDefault();sendChat()};
    chatIn.onkeydown=ev=>{if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();chatForm.requestSubmit()}};

    // full = visible and hidden tests together (used by Finish); a normal run only uses what the learner can see.
    async function doRun(full){
      if(running)return null;
      running=true;run.disabled=true;stop.hidden=false;
      results.textContent="Running…";con.textContent="";renderRail();
      if(!full)sess.runs++;
      const mine=mineDoc.getValue();
      const fu=lld&&sess.followup;
      let vis=fu?apJoin(sc.visibleTests,sc.followupVisibleTests):sc.visibleTests,hid=fu?apJoin(sc.tests,sc.followupTests):sc.tests;
      unlockedLv().forEach(lv=>{vis=apJoin(vis,lv.visibleTests);hid=apJoin(hid,lv.tests)});
      const src=!sc.visibleTests?sc.tests:apCombine(vis,full?hid:"",mine);
      const res=await runAp(state.files(),src,s=>{con.textContent+=s});
      running=false;run.disabled=false;stop.hidden=true;
      WS.renderResults(results,res);
      const total=res.names.length,passed=res.cases.filter(c=>c&&c.pass).length;
      if(total){
        const tests={};
        res.names.forEach((n,i)=>{if(!n.startsWith("[mine] "))tests[n]=!!(res.cases[i]&&res.cases[i].pass)});
        sess.last={passed,total,tests};save();
      }
      paintReqs();
      if(lvTabs.includes(open))showTab(open);else renderRail(); // a locked level's card shows the latest count
      // Every visible test passing (the candidate's own tests aside) brings the follow-up in early.
      const allVisible=res.names.length&&res.names.every((n,i)=>n.startsWith("[mine] ")||(res.cases[i]&&res.cases[i].pass));
      if(lld&&!full&&!sess.followup&&sess.coding&&allVisible)revealFollowup();
      if(multi&&!full&&allVisible)unlockLevel();
      return res;
    }
    // ---- finish: fresh test run, then the server evaluates the transcript + files against its own flaw log ----
    const AREA={design:"Design",review:"Review findings",decomposition:"Task breakdown",prompting:"Prompting",verification:"Verification",flaw_detection:"Catching AI mistakes",correctness:"Correctness",communication:"Communication"};
    const OUTCOME={caught:"Caught",fixed_late:"Fixed late",shipped:"Shipped",unchallenged:"Not challenged",unclear:"Unclear"};
    const ISSUE={found_fixed:"Found and fixed",found:"Found, not fixed",fixed_silently:"Fixed, not written up",missed:"Missed",unclear:"Unclear"};
    let hidHead=null;
    function renderEval(r){
      evalBox.hidden=false;evalBox.textContent="";
      const hd=el("div","ehd"),close=el("button","","Hide");
      close.onclick=()=>{evalBox.hidden=true};
      hd.append(el("h3","","Feedback"),close);evalBox.appendChild(hd);
      evalBox.appendChild(el("p","",r.evaluation.summary));
      const sc_=el("div","escores");
      r.evaluation.scores.forEach(x=>{
        const row=el("div","erow");
        row.appendChild(el("b","",(AREA[x.area]||x.area)+": "+(x.score?x.score+"/5":"n/a (no flaws were served)")));
        row.appendChild(el("span","",x.evidence));sc_.appendChild(row);
      });
      evalBox.appendChild(sc_);
      // The hidden tests from this finish: what failed, why, and the test code, so the misses can be understood.
      if(sess.hidden&&sess.hidden.length){
        hidHead=el("h4","","Hidden tests");evalBox.appendChild(hidHead);
        evalBox.appendChild(el("div","hint","These ran with your visible tests when you finished. Open a failing one to see the test."));
        const box=el("div","ap-res");WS.renderHidden(box,sess.hidden,[sc.tests,sess.followup&&sc.followupTests,...unlockedLv().map(lv=>lv.tests)]);evalBox.appendChild(box);
      }
      else if(sc.visibleTests&&!sess.hidden){evalBox.appendChild(el("h4","","Hidden tests"));evalBox.appendChild(el("div","hint","This feedback is from before hidden test results were kept. Press Finish & get feedback again to see which hidden tests failed and their code."))}
      if(r.issues){
        evalBox.appendChild(el("h4","","Bugs in the PR"));
        r.issues.forEach(x=>{
          const row=el("div","eflaw");
          const t=el("div","",x.title+" ");t.appendChild(el("span","badge "+x.outcome,ISSUE[x.outcome]||x.outcome));
          row.append(t,el("div","hint",x.severity+" · "+x.where),el("div","",x.detail));
          if(x.evidence)row.appendChild(el("div","hint",x.evidence));
          evalBox.appendChild(row);
        });
      }
      if(r.levels){
        evalBox.appendChild(el("h4","","Levels"));
        evalBox.appendChild(el("div","hint","Reached level "+r.levels.reached+" of "+r.levels.total+(r.levels.at_min.length?". "+r.levels.at_min.map((m,i)=>"Level "+(i+2)+" unlocked at "+m+" min").join(", ")+".":". Level 2 unlocks when every visible test passes.")));
      }
      if(r.followup){
        evalBox.appendChild(el("h4","","How the design took the follow-up"));
        const f=r.followup;
        evalBox.appendChild(el("div","hint",f.revealed?"Revealed at "+f.at_min+" min. Changed after the reveal: "+f.files_changed+" file(s), +"+f.added+" −"+f.removed+" lines.":"The follow-up was never revealed (you finished before it appeared)."));
        if(f.assessment)evalBox.appendChild(el("p","",f.assessment));
      }
      evalBox.appendChild(el("h4","","What the assistant got wrong"));
      if(!r.flaws.length)evalBox.appendChild(el("p","hint","It gave no planted flaws this session: none of your questions triggered one."));
      r.flaws.forEach(f=>{
        const row=el("div","eflaw");
        const t=el("div","",f.title+" ");t.appendChild(el("span","badge "+f.outcome,OUTCOME[f.outcome]||f.outcome));
        row.appendChild(t);
        row.appendChild(el("div","hint","Served in assistant reply "+(f.reply+1)));
        row.appendChild(el("div","","Wrong: "+f.wrong));
        row.appendChild(el("div","","Correct: "+f.correct));
        if(f.evidence)row.appendChild(el("div","hint",f.evidence));
        evalBox.appendChild(row);
      });
      if(r.not_served.length){
        evalBox.appendChild(el("h4","","Flaws that never came up"));
        r.not_served.forEach(f=>evalBox.appendChild(el("div","hint",f.title+": "+f.correct)));
      }
      [["Strengths",r.evaluation.strengths],["To improve",r.evaluation.improvements]].forEach(([h,items])=>{
        evalBox.appendChild(el("h4","",h));
        const ul=el("ul");items.forEach(i=>ul.appendChild(el("li","",i)));evalBox.appendChild(ul);
      });
      evalBox.appendChild(el("div","hint","Reviewed by "+r.model+" · "+r.at.replace("T"," ").replace(/\+00:00$/," UTC")));
    }
    if(sess.result)renderEval(sess.result);
    finish.onclick=async()=>{
      if(finishing||running)return;
      if(chatBusy){evalBox.hidden=false;evalBox.textContent="Wait for the assistant's reply to finish first.";return}
      finishing=true;finish.disabled=true;
      evalBox.hidden=false;evalBox.textContent="Running your tests, then asking the reviewer…";evalBox.classList.add("busy");
      try{
        const res=await doRun(true);
        if(!res)throw new Error("Could not run the tests. Try again.");
        const failed=res.names.filter((n,i)=>!(res.cases[i]&&res.cases[i].pass)).map(n=>n.slice(0,200));
        sess.hidden=WS.hiddenCases(res,"[hidden] ");
        const total=res.names.length,passed=res.cases.filter(c=>c&&c.pass).length;
        if(!total)failed.push("(tests could not run: "+(res.fatal||res.err.trim().split("\n")[0]||"unknown error").slice(0,150)+")");
        const resp=await apiFetch("/api/ap/evaluate",{method:"POST",body:JSON.stringify({scenario:sc.id,session:sess.id,transcript:sess.msgs,files:state.files(),tests:{passed,total,failed:failed.slice(0,100)},activity:{runs:sess.runs,viewedTests:!!sess.viewedTests,customTests:mineCount(),customSource:mineCount()?mineDoc.getValue().slice(0,4000):""},review:reviewText().slice(0,6000),...(lld?{design:designText().slice(0,8000),followup:sess.followup||null}:{}),...(multi?{levels:sess.levels}:{}),elapsed:sess.elapsed})});
        const data=await resp.json();
        if(!resp.ok)throw new Error(data.error||"Request failed");
        sess.result=data;save();renderEval(data);renderRail();
      }catch(err){evalBox.textContent=err.message||"Request failed"}
      finally{evalBox.classList.remove("busy");finishing=false;finish.disabled=false}
    };
    run.onclick=()=>doRun();fmtBtn.onclick=()=>formatCode(ed);
    stop.onclick=stopRun;
    back.onclick=showList;
    let armedA=0;
    abandon.onclick=()=>{
      if(!armedA){abandon.textContent="Click again: deletes this attempt";armedA=setTimeout(()=>{armedA=0;abandon.textContent="Abandon"},3000);return}
      clearTimeout(armedA);dead=true;dropSession(sc.id);showList();
    };
    let armed=0;
    reset.onclick=()=>{
      if(!armed){reset.textContent="Click again to reset";armed=setTimeout(()=>{armed=0;reset.textContent="Reset"},3000);return}
      clearTimeout(armed);armed=0;reset.textContent="Reset";
      sc.files.forEach(f=>docs[f.name].setValue(f.code));
      mineDoc.setValue(MINE_STARTER);if(reviewDoc)reviewDoc.setValue(REVIEW_STARTER);sess.runs=0;sess.viewedTests=false;
      results.textContent="";con.textContent="";sess.last=null;sess.hidden=null;paintReqs();renderRail();
      if(ac)ac.abort();
      sess.id=crypto.randomUUID();sess.msgs=[];sess.elapsed=0;timer.textContent=fmt(0);sess.result=null;evalBox.hidden=true;evalBox.textContent="";chatLog.textContent="";save(); // a new attempt gets a clean flaw log too
      if(lld){designDoc.setValue(DESIGN_STARTER);sess.coding=false;sess.followup=null;save();openWork(sc)} // rebuilds the gate, tabs and follow-up card
      if(multi){sess.levels=[];sess.lvSeen=false;save();openWork(sc)} // back to level 1 only
    };
  }

  window.aipairInit=function(){
    if(ready)return;
    ready=true;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    showList();
  };
})();

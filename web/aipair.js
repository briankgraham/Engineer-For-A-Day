// AI Pairing tab: build a small JS project with an AI assistant that is sometimes subtly wrong.
// Depends on globals from index.html: $, el, loadCM, RUN_TIMEOUT, darkMode, and WS from workspace.js (loaded first).
(function(){
  const KEY="aipair-sessions-v1";
  const {apCombine,apJoin,runAp,stopRun,readSSE,lineDiff,mergeSnippet,mergeMembers}=WS;

  const readSessions=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}};
  const writeSession=(id,s)=>{try{const all=readSessions();all[id]=s;localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  const dropSession=id=>{try{const all=readSessions();delete all[id];localStorage.setItem(KEY,JSON.stringify(all))}catch(e){}};
  const fmt=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

  const css=`
.ap{max-width:1400px;margin:0 auto;padding:16px}
.ap h2{margin:0 0 4px;font-size:20px}.ap .sub{color:var(--muted);margin:0 0 14px}
.ap-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.ap-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:8px}
.ap-card h3{margin:0;font-size:16px}.ap-card p{margin:0;color:var(--muted)}.ap-card .meta{font-size:12px;color:var(--muted)}
.ap-card .act{margin-top:auto;padding-top:6px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.ap-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 -16px 12px;padding:8px 16px;position:sticky;top:var(--nav-h);z-index:2;background:var(--bg);border-bottom:1px solid var(--line)}
.ap-top h2{margin:0;flex:1;min-width:160px}.ap-timer{font-variant-numeric:tabular-nums;color:var(--muted)}
.ap-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}
@media(max-width:900px){.ap-grid{grid-template-columns:minmax(0,1fr)}}
.ap-brief{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow-sm);margin-bottom:12px;overflow:hidden}
.ap-brief summary{cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 14px;font-weight:600;list-style:none;user-select:none}
.ap-brief summary::-webkit-details-marker{display:none}
.ap-brief summary::before{content:"▸";color:var(--muted);transition:transform .15s}.ap-brief[open] summary::before{transform:rotate(90deg)}
.ap-brief summary:hover{background:var(--head)}
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
.ap-brief li code{font:12px ui-monospace,Menlo,monospace;background:var(--head);border:1px solid var(--line);border-radius:4px;padding:0 4px;white-space:nowrap}
.ap-files{display:flex;gap:4px;margin-bottom:6px}
.ap-files button.on{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
.ap-ed .CodeMirror{height:400px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:13px}
.ap-res{margin-top:12px}.ap-res .sum{font-weight:600;margin-bottom:6px}
.ap-res .row{padding:4px 0;border-bottom:1px solid var(--line)}.ap-res .row.ok::before{content:"✓ ";color:var(--easy);font-weight:700}.ap-res .row.no::before{content:"✗ ";color:var(--hard)}
.ap-res pre,.ap-con{background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:4px 0 0;overflow-x:auto;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap}
.ap-con:empty{display:none}
.ap-eval{background:var(--surface);border:1px solid var(--accent);border-radius:var(--radius);padding:12px 16px;margin-bottom:12px}
.ap-eval h4{margin:14px 0 6px}.ap-eval .ehd{display:flex;justify-content:space-between;align-items:center}.ap-eval h3{margin:0}
.ap-eval .erow{display:flex;flex-direction:column;margin:6px 0}.ap-eval .erow span,.ap-eval .hint{color:var(--muted);font-size:13px}
.ap-eval .eflaw{border-top:1px solid var(--line);padding:8px 0;display:flex;flex-direction:column;gap:2px}
.ap-eval .badge{font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line)}
.ap-eval .badge.caught{color:var(--easy)}.ap-eval .badge.shipped{color:var(--hard)}.ap-eval .badge.fixed_late,.ap-eval .badge.unchallenged{color:var(--med)}
.ap-eval.busy{color:var(--muted)}
.ap-side{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;position:sticky;top:calc(var(--nav-h) + 72px)}
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
    work.obs.disconnect();work.stopVoice();
    work=null;
  }

  async function showList(){
    leaveWork();openGen++;
    const r=root();r.textContent="";
    const wrap=el("div","ap");r.appendChild(wrap);
    wrap.appendChild(el("h2","","AI Pairing"));
    wrap.appendChild(el("p","sub","Build a small project with an AI coding assistant. It is sometimes subtly wrong, so verify what it gives you. Some tests are visible and some are hidden, and you can write your own."));
    if(!scenarios){
      try{
        // Plain fetch: apiFetch would light the global "AI busy" spinner for a non-AI call.
        const res=await fetch("/api/ap/scenarios",{headers:{"X-Requested-With":"walkthrough"}});
        if(!res.ok)throw new Error(res.status);
        scenarios=(await res.json()).scenarios;
      }catch(e){wrap.appendChild(el("p","","Could not load scenarios. Run: python3 server.py — then open http://localhost:8000"));return}
    }
    const sessions=readSessions();
    const grid=el("div","ap-cards");wrap.appendChild(grid);
    scenarios.forEach(sc=>{
      const s=sessions[sc.id];
      const card=el("div","ap-card");
      card.appendChild(el("h3","",sc.title));
      card.appendChild(el("p","",sc.blurb));
      const bits=[...(sc.kind==="review"?["Code review"]:sc.kind==="lld"?["Object design"]:[]),sc.difficulty,"~"+sc.minutes+" min"];
      if(s){bits.push("in progress · "+fmt(s.elapsed||0));if(s.last)bits.push(s.last.passed+"/"+s.last.total+" tests passing");if(s.followup)bits.push("follow-up revealed")}
      card.appendChild(el("div","meta",bits.join(" · ")));
      const b=el("button","",s?"Resume":"Start");
      b.onclick=()=>openWork(sc);
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
  }

  let openGen=0;
  async function openWork(sc){
    leaveWork();
    const gen=++openGen;
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
    if(!Number.isInteger(sess.runs))sess.runs=0;
    const code=name=>sess.files[name]!=null?sess.files[name]:sc.files.find(f=>f.name===name).code;

    const top=el("div","ap-top");
    const back=el("button","","← All scenarios");
    const timer=el("span","ap-timer","00:00");
    const run=el("button","","▶ Run tests (⌘/Ctrl+Enter)");
    const stop=el("button","","Stop");stop.hidden=true;
    const reset=el("button","","Reset");
    const abandon=el("button","","Abandon");
    const finish=el("button","","Finish & get feedback");
    top.append(back,el("h2","",sc.title),timer,run,stop,finish,reset,abandon);
    wrap.appendChild(top);

    const grid=el("div","ap-grid");wrap.appendChild(grid);
    const main=el("div","ap-main"),side=el("div","ap-side");
    grid.append(main,side);
    side.appendChild(el("b","","AI assistant"));
    side.appendChild(el("p","hint",(lld?"It sees the brief, your design.md, your current files and the test file. Ask it to review your design too. Treat its answers like a teammate's: verify them.":sc.pr?"It sees the PR, your current files, the PR's tests and your review.md. Treat its answers like a teammate's: verify them.":sc.visibleTests?"It sees your brief, your current files and the test file. Treat its answers like a teammate's: verify them.":"It sees your brief and current files, not the tests. Treat its answers like a teammate's: verify them.")));
    const chatRoot=el("div","chat"),chatLog=el("div"),chatForm=el("form"),chatIn=el("textarea"),chatBtn=el("button","","Send");
    chatIn.rows=3;chatIn.placeholder="Ask the assistant… (Enter to send, Shift+Enter for a new line)";chatBtn.type="submit";
    // Dictation reuses voiceInput from sysdesign.js: it only fills the box; nothing is sent until Send.
    const vi=typeof voiceInput==="function"?voiceInput(chatIn):null,row=el("div","vrow");
    if(vi){vi.note.textContent=vi.mic.disabled?vi.note.textContent:"Dictate, edit if needed, then Send.";row.append(vi.mic,chatBtn);chatForm.append(chatIn,row,vi.note)}
    else chatForm.append(chatIn,chatBtn);chatRoot.append(chatLog,chatForm);side.appendChild(chatRoot);

    const evalBox=el("div","ap-eval");evalBox.hidden=true;
    main.appendChild(evalBox);
    const brief=el("details","ap-brief");brief.open=true;
    const bsum=el("summary","","Brief and requirements");
    bsum.append(el("span","chip hi",sc.requirements.length+" requirements"),el("span","chip",sc.difficulty+" · ~"+sc.minutes+" min"));
    brief.appendChild(bsum);
    const bd=el("div","bd"),goal=el("div","goal");
    goal.append(el("h4","","Goal"),el("p","",sc.brief));
    const reqs=el("div","reqs"),ol=el("ol");
    reqs.appendChild(el("h4","","Requirements"));
    // Identifiers, calls like on(event, fn) and quoted names like 'error' render as inline code.
    const CODE=/(\b[A-Za-z_]\w*(?:\.\w+)*\([^()]*\)|'[^']*'|"[^"]*"|\b\w+\.\w+\b)/g;
    sc.requirements.forEach(t=>{
      const li=el("li"),span=el("span");
      t.split(CODE).forEach((part,i)=>span.appendChild(i%2?el("code","",part):document.createTextNode(part)));
      li.appendChild(span);ol.appendChild(li);
    });
    reqs.appendChild(ol);bd.append(goal,reqs);brief.appendChild(bd);
    main.appendChild(brief);
    const reqList=(items,into)=>items.forEach(t=>{
      const li=el("li"),span=el("span");
      t.split(CODE).forEach((part,i)=>span.appendChild(i%2?el("code","",part):document.createTextNode(part)));
      li.appendChild(span);into.appendChild(li);
    });
    // The follow-up requirement, shown once revealed (same look as the brief).
    const fuBox=el("details","ap-brief ap-fu");fuBox.open=true;fuBox.hidden=true;
    if(lld&&sc.followup){
      const fs=el("summary","","New requirement: "+sc.followup.title);fs.appendChild(el("span","chip hi",sc.followup.requirements.length+" requirements"));
      const fb=el("div","bd"),fg=el("div","goal"),fr=el("div","reqs"),fol=el("ol");
      fg.append(el("h4","","Follow-up"),el("p","",sc.followup.brief));
      fr.appendChild(el("h4","","Requirements"));reqList(sc.followup.requirements,fol);fr.appendChild(fol);
      fb.append(fg,fr);fuBox.append(fs,fb);main.appendChild(fuBox);
    }
    // Design gate: code files stay read-only until design.md has some substance and the candidate starts coding.
    const gate=el("div","ap-gate");gate.hidden=true;
    const gateMsg=el("span"),gateBtn=el("button","","Start coding");
    gate.append(gateMsg,gateBtn);main.appendChild(gate);

    const tabs=el("div","ap-files"),host=el("div","ap-ed"),results=el("div","ap-res"),con=el("pre","ap-con");
    // Review scenarios: the PR page (description, diff, bot comment) is a rendered view shown in place of the editor.
    const prView=el("div","ap-pr");prView.hidden=true;
    main.append(tabs,prView,host,results,con);
    if(sc.pr){
      renderMd(prView,sc.pr);
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
    const theme=()=>darkMode()?"material-darker":"default";
    const ed=CodeMirror(host,{value:docs[sc.files[0].name],mode:"javascript",lineNumbers:true,theme:theme(),indentUnit:2,tabSize:2,
      indentWithTabs:false,autoCloseBrackets:true,matchBrackets:true,
      extraKeys:{"Cmd-Enter":()=>doRun(),"Ctrl-Enter":()=>doRun(),Tab:cm=>cm.somethingSelected()?cm.indentSelection("add"):cm.replaceSelection("  ","end")}});
    const obs=new MutationObserver(()=>ed.setOption("theme",theme()));
    obs.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

    const prName=sc.pr?"pull request":null,reviewName=sc.pr?"review.md":null,designName=lld?"design.md":null;
    let open=prName||(lld&&!sess.coding?designName:sc.files[0].name);
    const tabBtns={};
    // Some scenarios show their test file: a read-only tab that is never saved, applied to or reset.
    const testName=sc.visibleTests?sc.id+".test.js":null;
    const FU_HEAD="\n\n// ---- Follow-up: "+(sc.followup?sc.followup.title:"")+" ----\n\n";
    const testDoc=testName?CodeMirror.Doc(sc.visibleTests+(sess.followup&&sc.followupVisibleTests?FU_HEAD+sc.followupVisibleTests:""),"javascript"):null;
    // Your own tests: editable, saved with the attempt, and run together with the visible ones.
    const mineName="my-tests.js";
    const mineDoc=CodeMirror.Doc(sess.custom,"javascript");
    const reviewDoc=reviewName?CodeMirror.Doc(sess.review,"text/plain"):null;
    const designDoc=designName?CodeMirror.Doc(sess.design,"text/plain"):null;
    const locked=name=>lld&&!sess.coding&&!!docs[name];
    const showTab=name=>{
      open=name;const isTest=name===testName,isPr=name===prName;
      if(isTest)sess.viewedTests=true;
      prView.hidden=!isPr;host.hidden=isPr;
      if(!isPr){ed.swapDoc(isTest?testDoc:name===mineName?mineDoc:name===reviewName?reviewDoc:name===designName?designDoc:docs[name]);ed.setOption("readOnly",isTest||locked(name));ed.refresh()}
      Object.keys(tabBtns).forEach(n=>tabBtns[n].classList.toggle("on",n===open));
    };
    if(designName){
      const b=el("button","",designName+" ✎");b.title="Your design: classes, what each owns, interfaces, states. Write it before coding; it is sent to the assistant and graded.";tabBtns[designName]=b;
      b.onclick=()=>{showTab(designName);ed.focus()};
      tabs.appendChild(b);
    }
    if(prName){
      const b=el("button","",prName+" 🔒");b.title="The PR you are reviewing: description, diff and the review bot's comment.";tabBtns[prName]=b;
      b.onclick=()=>showTab(prName);
      tabs.appendChild(b);
    }
    sc.files.forEach(f=>{
      const b=el("button","",f.name+(locked(f.name)?" 🔒":""));tabBtns[f.name]=b;
      b.onclick=()=>{showTab(f.name);ed.focus()};
      tabs.appendChild(b);
    });
    if(testName){
      const b=el("button","",testName+" 🔒");b.title="Read-only: the tests you can see. Hidden edge cases run when you finish. Add your own in my-tests.js.";tabBtns[testName]=b;
      b.onclick=()=>{showTab(testName);ed.focus()};
      tabs.appendChild(b);
    }
    {
      const b=el("button","",mineName+" ✎");b.title="Your own tests. They run with the visible tests each time you press Run.";tabBtns[mineName]=b;
      b.onclick=()=>{showTab(mineName);ed.focus()};
      tabs.appendChild(b);
    }
    if(reviewName){
      const b=el("button","",reviewName+" ✎");b.title="Your review: one finding per item, with where, why it matters and severity. Graded when you finish.";tabBtns[reviewName]=b;
      b.onclick=()=>{showTab(reviewName);ed.focus()};
      tabs.appendChild(b);
    }
    showTab(open);

    const state={files:()=>Object.fromEntries(sc.files.map(f=>[f.name,docs[f.name].getValue()]))};
    let dead=false; // set by Abandon so the leave-time save cannot recreate the session
    const reviewText=()=>reviewDoc?reviewDoc.getValue():"";
    const designText=()=>designDoc?designDoc.getValue():"";
    // Words written beyond the starter outline; the gate opens at 30.
    const designWords=()=>designText().split("\n").filter(l=>!DESIGN_STARTER.split("\n").includes(l)).join(" ").split(/\s+/).filter(w=>/\w/.test(w)).length;
    function renderGate(){
      if(!lld)return;
      gate.hidden=!!sess.coding;
      if(sess.coding){sc.files.forEach(f=>{tabBtns[f.name].textContent=f.name});showTab(open);return}
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
      fuBox.hidden=false;fuBox.open=true;save();
      fuBox.scrollIntoView({behavior:"smooth",block:"start"});
    }
    if(sess.followup)fuBox.hidden=false;
    const save=()=>dead||writeSession(sc.id,{id:sess.id,msgs:sess.msgs,files:state.files(),custom:mineDoc.getValue(),review:reviewDoc?reviewText():undefined,design:designDoc?designText():undefined,coding:sess.coding||undefined,followup:sess.followup||undefined,runs:sess.runs,viewedTests:sess.viewedTests,elapsed:sess.elapsed,last:sess.last,result:sess.result});
    let saveT=0;
    ed.on("change",()=>{clearTimeout(saveT);saveT=setTimeout(save,500)});
    // A test() call outside a comment counts as a written test; the untouched starter has none.
    const mineCount=()=>(mineDoc.getValue().replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"").match(/\btest\s*\(/g)||[]).length;

    // Counts up while the workspace is visible and the browser tab is in the foreground.
    const tick=setInterval(()=>{
      if(root().hidden||document.hidden)return;
      sess.elapsed++;timer.textContent=fmt(sess.elapsed);
      if(lld&&!sess.followup&&sess.elapsed>=Math.round(sc.minutes*60*0.6))revealFollowup();
      if(sess.elapsed%5===0)save();
    },1000);
    timer.textContent=fmt(sess.elapsed);
    work={save,tick,obs,stopVoice:()=>{if(vi)vi.stop()}};

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
      const out=el("div","m busy","Thinking…");chatLog.appendChild(out);chatLog.scrollTop=chatLog.scrollHeight;
      let answer="";
      ac=work.abort=new AbortController();
      try{
        // Only the latest 11 messages go up (an odd count keeps the first one a user turn).
        const messages=sess.msgs.slice(-11);
        const res=await apiFetch("/api/ap/chat",{method:"POST",signal:ac.signal,body:JSON.stringify({scenario:sc.id,session:sess.id,files:state.files(),messages,review:reviewText().slice(0,6000),...(lld?{design:designText().slice(0,8000),followup:!!sess.followup}:{})})});
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

    let running=false;
    // full = visible and hidden tests together (used by Finish); a normal run only uses what the learner can see.
    async function doRun(full){
      if(running)return null;
      running=true;run.disabled=true;stop.hidden=false;
      results.textContent="Running…";con.textContent="";
      if(!full)sess.runs++;
      const mine=mineDoc.getValue();
      const fu=lld&&sess.followup;
      const vis=fu?apJoin(sc.visibleTests,sc.followupVisibleTests):sc.visibleTests,hid=fu?apJoin(sc.tests,sc.followupTests):sc.tests;
      const src=!sc.visibleTests?sc.tests:apCombine(vis,full?hid:"",mine);
      const res=await runAp(state.files(),src,s=>{con.textContent+=s});
      running=false;run.disabled=false;stop.hidden=true;
      WS.renderResults(results,res);
      const total=res.names.length,passed=res.cases.filter(c=>c&&c.pass).length;
      if(total){sess.last={passed,total};save()}
      // Every visible test passing (the candidate's own tests aside) brings the follow-up in early.
      if(lld&&!full&&!sess.followup&&sess.coding&&res.names.length&&res.names.every((n,i)=>n.startsWith("[mine] ")||(res.cases[i]&&res.cases[i].pass)))revealFollowup();
      return res;
    }
    // ---- finish: fresh test run, then the server evaluates the transcript + files against its own flaw log ----
    const AREA={design:"Design",review:"Review findings",decomposition:"Task breakdown",prompting:"Prompting",verification:"Verification",flaw_detection:"Catching AI mistakes",correctness:"Correctness",communication:"Communication"};
    const OUTCOME={caught:"Caught",fixed_late:"Fixed late",shipped:"Shipped",unchallenged:"Not challenged",unclear:"Unclear"};
    const ISSUE={found_fixed:"Found and fixed",found:"Found, not fixed",fixed_silently:"Fixed, not written up",missed:"Missed",unclear:"Unclear"};
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
    let finishing=false;
    finish.onclick=async()=>{
      if(finishing||running)return;
      if(chatBusy){evalBox.hidden=false;evalBox.textContent="Wait for the assistant's reply to finish first.";return}
      finishing=true;finish.disabled=true;
      evalBox.hidden=false;evalBox.textContent="Running your tests, then asking the reviewer…";evalBox.classList.add("busy");
      try{
        const res=await doRun(true);
        if(!res)throw new Error("Could not run the tests. Try again.");
        const failed=res.names.filter((n,i)=>!(res.cases[i]&&res.cases[i].pass)).map(n=>n.slice(0,200));
        const total=res.names.length,passed=res.cases.filter(c=>c&&c.pass).length;
        if(!total)failed.push("(tests could not run: "+(res.fatal||res.err.trim().split("\n")[0]||"unknown error").slice(0,150)+")");
        const resp=await apiFetch("/api/ap/evaluate",{method:"POST",body:JSON.stringify({scenario:sc.id,session:sess.id,transcript:sess.msgs,files:state.files(),tests:{passed,total,failed:failed.slice(0,100)},activity:{runs:sess.runs,viewedTests:!!sess.viewedTests,customTests:mineCount(),customSource:mineCount()?mineDoc.getValue().slice(0,4000):""},review:reviewText().slice(0,6000),...(lld?{design:designText().slice(0,8000),followup:sess.followup||null}:{}),elapsed:sess.elapsed})});
        const data=await resp.json();
        if(!resp.ok)throw new Error(data.error||"Request failed");
        sess.result=data;save();renderEval(data);
      }catch(err){evalBox.textContent=err.message||"Request failed"}
      finally{evalBox.classList.remove("busy");finishing=false;finish.disabled=false}
    };
    run.onclick=()=>doRun();
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
      results.textContent="";con.textContent="";sess.last=null;
      if(ac)ac.abort();
      sess.id=crypto.randomUUID();sess.msgs=[];sess.elapsed=0;timer.textContent=fmt(0);sess.result=null;evalBox.hidden=true;evalBox.textContent="";chatLog.textContent="";save(); // a new attempt gets a clean flaw log too
      if(lld){designDoc.setValue(DESIGN_STARTER);sess.coding=false;sess.followup=null;save();openWork(sc)} // rebuilds the gate, tabs and follow-up card
    };
  }

  window.aipairInit=function(){
    if(ready)return;
    ready=true;
    const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    showList();
  };
})();

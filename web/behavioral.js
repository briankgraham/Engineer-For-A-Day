// Behavioral tab: a bank of common behavioral questions, tagged by competency and company, with spaced review,
// and an AI interviewer that asks follow-ups about your answer and then grades it.
// Depends on globals from index.html: $, el, today, isDue, INTERVALS, apiFetch, errMsg; and voiceInput from sysdesign.js.
(function(){
  const PKEY="behavioral-progress-v1"; // also read by the Export progress button in index.html
  const HKEY="behavioral-history-v1",LKEY="behavioral-level-v1";
  const LEVELS={senior:"Senior",staff:"Staff"};
  const AREAS={structure:"Structure (STAR)",ownership:"Ownership",scope:"Scope for the level",results:"Results",reflection:"Reflection",communication:"Communication"};
  const COMPS={
    conflict:"Conflict",ambiguity:"Ambiguity",failure:"Failure",influence:"Influence without authority",
    mentoring:"Mentoring",ownership:"Owning a large project",manager:"Disagreeing with a manager",
    tradeoff:"Tough tradeoff",pressure:"Delivering under pressure",bar:"Raising the bar",
  };
  // {id, q, c: competencies, co: companies known to ask it, lp: the Amazon Leadership Principle it probes}
  const QS=[
    {id:"disagree-manager",q:"Tell me about a time you disagreed with your manager.",c:["manager","conflict"],co:["Amazon","Meta","Google"],lp:"Have Backbone; Disagree and Commit"},
    {id:"commit-disagreed",q:"Tell me about a time you committed to a decision you disagreed with.",c:["manager","conflict"],co:["Amazon"],lp:"Have Backbone; Disagree and Commit"},
    {id:"project-failed",q:"Tell me about a project that failed.",c:["failure"],co:["Meta","Google"]},
    {id:"mistake-learned",q:"Tell me about a mistake you made and what you learned from it.",c:["failure"],co:["Amazon","Meta"],lp:"Earn Trust"},
    {id:"wrong-technical",q:"Tell me about a time you were wrong about a technical decision.",c:["failure"],co:["Amazon"],lp:"Are Right, A Lot"},
    {id:"not-proud",q:"Tell me about something you delivered that you weren't proud of.",c:["failure","pressure"],co:["Amazon"],lp:"Insist on the Highest Standards"},
    {id:"missed-deadline",q:"Tell me about a time you missed a deadline.",c:["failure","pressure"],co:["Amazon"],lp:"Deliver Results"},
    {id:"critical-feedback",q:"Tell me about a time you received critical feedback. What did you do with it?",c:["failure"],co:["Meta","Google"]},
    {id:"no-data",q:"Tell me about a time you had to make a decision without enough data.",c:["ambiguity","tradeoff"],co:["Amazon","Google"],lp:"Bias for Action"},
    {id:"unclear-reqs",q:"Tell me about a time the requirements were unclear or kept changing.",c:["ambiguity"],co:["Meta","Google"]},
    {id:"no-owner",q:"Tell me about a time you worked on something with no clear owner or precedent.",c:["ambiguity","ownership"],co:["Google"]},
    {id:"manager-away",q:"Tell me about a time you had to make a call without your manager's input.",c:["ambiguity","ownership"],co:["Amazon"],lp:"Bias for Action"},
    {id:"learn-fast",q:"Tell me about a time you had to learn a new technology or domain quickly to unblock a project.",c:["ambiguity","pressure"],co:["Amazon"],lp:"Learn and Be Curious"},
    {id:"mentored",q:"Tell me about a time you mentored someone.",c:["mentoring"],co:["Amazon","Meta"],lp:"Hire and Develop the Best"},
    {id:"ramp-up",q:"Tell me about a time you helped a struggling teammate or a new hire get up to speed.",c:["mentoring"],co:["Google"]},
    {id:"grew-someone",q:"Tell me about a time you grew someone into a role with more responsibility.",c:["mentoring"],co:["Amazon"],lp:"Hire and Develop the Best"},
    {id:"hard-feedback",q:"Tell me about a time you gave difficult feedback to someone.",c:["conflict","mentoring"],co:["Meta"]},
    {id:"coworker-conflict",q:"Tell me about a conflict with a coworker and how you resolved it.",c:["conflict"],co:["Meta","Google"]},
    {id:"unpopular-decision",q:"Tell me about a time you made a decision that was unpopular with your team.",c:["conflict","tradeoff"],co:["Amazon"],lp:"Have Backbone; Disagree and Commit"},
    {id:"pm-scope",q:"Tell me about a time you disagreed with a product manager about scope.",c:["conflict","tradeoff"],co:["Meta"]},
    {id:"say-no",q:"Tell me about a time you had to say no to a stakeholder.",c:["conflict","tradeoff"],co:[]},
    {id:"bad-news",q:"Tell me about a time you had to deliver bad news to leadership.",c:["conflict","pressure"],co:[]},
    {id:"other-team",q:"Tell me about a time you convinced another team to change their plans or priorities.",c:["influence"],co:["Amazon","Meta"],lp:"Earn Trust"},
    {id:"no-final-say",q:"Tell me about a time you influenced a technical decision without having the final say.",c:["influence"],co:["Google"]},
    {id:"align-teams",q:"Tell me about a time you had to align several teams with competing goals.",c:["influence","conflict"],co:["Meta"]},
    {id:"skeptical-team",q:"Tell me about a time you built trust with a team that was skeptical of you.",c:["influence"],co:["Amazon"],lp:"Earn Trust"},
    {id:"bold-idea",q:"Tell me about a time you proposed a bold idea or a long-term technical vision.",c:["influence"],co:["Amazon"],lp:"Think Big"},
    {id:"changed-direction",q:"Tell me about a time you changed the direction of a project after it had started.",c:["influence","tradeoff"],co:[]},
    {id:"explain-nontech",q:"Tell me about a time you explained a technical tradeoff to non-technical stakeholders.",c:["influence","tradeoff"],co:["Google"]},
    {id:"set-direction",q:"Tell me about a time you set a technical direction that other teams adopted.",c:["influence","bar"],co:[]},
    {id:"complex-project",q:"Tell me about the most complex project you've led from start to finish.",c:["ownership"],co:["Amazon","Meta","Google"],lp:"Deliver Results"},
    {id:"outside-area",q:"Tell me about a time you took on something outside your area of responsibility.",c:["ownership"],co:["Amazon"],lp:"Ownership"},
    {id:"unasked-problem",q:"Tell me about a time you found and fixed a problem nobody had asked you to solve.",c:["ownership","bar"],co:["Amazon","Meta"],lp:"Ownership"},
    {id:"root-cause",q:"Tell me about a time you dug deep into data or a system to find the root cause of a problem.",c:["ownership"],co:["Amazon"],lp:"Dive Deep"},
    {id:"customer",q:"Tell me about a time you went above and beyond for a customer or user.",c:["ownership"],co:["Amazon"],lp:"Customer Obsession"},
    {id:"proudest",q:"What is your proudest technical achievement?",c:["ownership"],co:["Meta","Google"]},
    {id:"incident",q:"Tell me about a time you handled a production incident or outage.",c:["pressure","ownership"],co:[]},
    {id:"push-deadline",q:"Tell me about a time you pushed back on a deadline.",c:["pressure","manager"],co:[]},
    {id:"speed-quality",q:"Tell me about a time you had to choose between speed and quality.",c:["tradeoff","pressure"],co:["Amazon"],lp:"Bias for Action"},
    {id:"fewer-resources",q:"Tell me about a time you had to deliver with fewer people or less time than you wanted.",c:["pressure","tradeoff"],co:["Amazon"],lp:"Frugality"},
    {id:"competing-priorities",q:"Tell me about a time you had competing priorities and had to decide what to drop.",c:["tradeoff","pressure"],co:["Meta"]},
    {id:"customer-vs-debt",q:"Tell me about a time you had to balance customer needs against technical debt.",c:["tradeoff"],co:["Amazon"],lp:"Customer Obsession"},
    {id:"simplified",q:"Tell me about a time you simplified something complex.",c:["bar"],co:["Amazon"],lp:"Invent and Simplify"},
    {id:"raised-bar",q:"Tell me about a time you raised the quality bar for your team (code review, testing, on-call).",c:["bar"],co:["Amazon"],lp:"Insist on the Highest Standards"},
    {id:"team-process",q:"Tell me about a time you improved how your team works (process, tooling, rituals).",c:["bar"],co:["Meta"]},
  ];
  const COS=[...new Set(QS.flatMap(x=>x.co))].sort();

  const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  let prog=readJSON(PKEY,{});
  if(!prog||typeof prog!=="object"||Array.isArray(prog))prog={};
  const save=()=>{try{localStorage.setItem(PKEY,JSON.stringify(prog))}catch(e){}};
  const get=id=>prog[id]||{done:false,times:0};
  const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  const btn=(text,fn,cls)=>{const b=el("button",cls||null,text);b.onclick=fn;return b};
  const root=()=>$("tab-behavioral");
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  let level=readJSON(LKEY,"senior");if(!LEVELS[level])level="senior";

  const css=`
.bh{max-width:1100px;margin:0 auto;padding:16px}
.bh h2{margin:0 0 4px;font-size:20px}.bh .sub{color:var(--muted);margin:0 0 14px}
.bh-cov{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px}
.bh-cov .chip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.bh-cov .chip.gap{border-style:dashed}
.bh-f{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.bh-f input{flex:1 1 220px}
.bh-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--shadow-sm);margin-bottom:16px}
.bh-card .q{font-size:18px;font-weight:600;margin:6px 0 10px;line-height:1.4}
.bh-card .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bh-timer{font-variant-numeric:tabular-nums;font-size:18px;font-weight:600;min-width:52px}.bh-timer.long{color:var(--hard)}
.bh .muted{color:var(--muted);font-size:13px}
.bh-list{display:flex;flex-direction:column;gap:6px}
.bh-q{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px}
.bh-q .top{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}
.bh-q .txt{flex:1 1 300px;line-height:1.4}
.bh-q .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.bh-q .tags{margin-top:4px}
.bh-tag{display:inline-block;font-size:11px;line-height:18px;padding:0 7px;border-radius:999px;border:1px solid var(--line);margin:2px 4px 0 0;color:var(--muted)}
.bh-tag.co{color:var(--accent);background:var(--accent-soft);border-color:transparent}
.bh-due{color:var(--hard);font-weight:600}
.bh-q.done{border-left:3px solid var(--easy)}
.bh-q textarea{width:100%;box-sizing:border-box;margin-top:8px;min-height:64px;font:inherit}
.bh-iv .top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
.bh-iv .top .sp{flex:1}
.bh-iv .eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.bh-iv .q{font-size:20px;font-weight:600;line-height:1.4;margin:4px 0 4px}
.bh-iv .chat{border-top:0;margin-top:12px;padding-top:0}
.bh-iv .chat form{display:flex}
.bh-iv .chat textarea{flex:1;font:inherit}
.bh-iv .tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
.bh-iv .tools .sp{flex:1}
.bh-iv .ended{margin-top:10px;padding:10px 14px;border-radius:var(--radius-sm);background:var(--accent-soft)}
.bh-sc{margin-top:16px;display:flex;flex-direction:column;gap:10px}
.bh-sc .hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.bh-fit{display:inline-block;padding:2px 12px;border-radius:999px;font-weight:600;font-size:13px}
.bh-fit.below{background:var(--hard-bg)}.bh-fit.at{background:var(--easy-bg)}.bh-fit.above{background:var(--easy-bg)}
.bh-area{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:10px 12px}
.bh-area .hd b{flex:1}
.bh-dots{letter-spacing:2px;color:var(--accent);font-size:13px}
.bh-area .ev{margin-top:4px;line-height:1.5}
.bh-area blockquote{margin:6px 0 0;padding:4px 10px;border-left:3px solid var(--hard);color:var(--muted);font-style:italic}
.bh-sc h3{margin:8px 0 2px;font-size:15px}.bh-sc ul{margin:0;padding-left:1.3em;line-height:1.5}
.bh-hist{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;max-height:260px;overflow-y:auto}
.bh-hist .h{display:flex;gap:12px;flex-wrap:wrap;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 12px;cursor:pointer}
.bh-hist .h:hover{border-color:var(--accent)}
.bh-hist .h .t{flex:1 1 260px}
`;

  const cov=el("div","bh-cov"),q=el("input"),cs=el("select"),cos=el("select"),st=el("select"),list=el("div","bh-list"),stats=el("p","sub"),card=el("div","bh-card");
  const main=el("div"),iv=el("div","bh-iv");
  let ready=false,openNote=null,cur=null,t0=0,tick=0;

  function filtered(){
    const s=q.value.trim().toLowerCase(),c=cs.value,co=cos.value,v=st.value;
    return QS.filter(x=>{
      if(s&&!(x.q.toLowerCase().includes(s)||(x.lp||"").toLowerCase().includes(s)))return false;
      if(c&&!x.c.includes(c))return false;
      if(co&&!x.co.includes(co))return false;
      const p=get(x.id);
      if(v==="todo"&&p.done)return false;
      if(v==="done"&&!p.done)return false;
      if(v==="due"&&!isDue(p))return false;
      return true;
    });
  }
  function practiced(id){
    const p={...get(id)};p.done=true;p.times=(p.times||0)+1;p.last=today();prog[id]=p;save();
  }
  function undo(id){
    const p={...get(id)};if(!p.times)return;p.times--;
    if(!p.times){p.done=false;delete p.last}
    if(p.times||p.note)prog[id]=p;else delete prog[id];
    save();
  }
  const nextDue=p=>{if(!p.done||!p.last)return "";const d=new Date(Date.parse(p.last)+INTERVALS[Math.min(Math.max(p.times,1),3)-1]*864e5);return d.toISOString().slice(0,10)};
  const tags=x=>{
    const d=el("div","tags");
    x.c.forEach(c=>d.appendChild(el("span","bh-tag",COMPS[c])));
    x.co.forEach(co=>{const t=el("span","bh-tag co",co);if(co==="Amazon"&&x.lp)t.dataset.tip="Amazon Leadership Principle: "+x.lp;d.appendChild(t)});
    return d;
  };

  // ---------- practice card: one question at a time, due ones first, with a count-up timer ----------
  function pick(){
    const pool=filtered().filter(x=>x!==cur);
    const due=pool.filter(x=>isDue(get(x.id))),fresh=pool.filter(x=>!get(x.id).done);
    const from=due.length?due:fresh.length?fresh:pool;
    cur=from.length?from[Math.floor(Math.random()*from.length)]:null;
    stopTimer();renderCard();
  }
  function stopTimer(){clearInterval(tick);tick=0;t0=0}
  function renderCard(){
    card.textContent="";
    const hd=el("div","row");card.appendChild(hd);
    hd.appendChild(el("b",null,"Practice one"));
    hd.appendChild(el("span","muted","Answer out loud in 2 to 3 minutes, using a real story (Situation, Task, Action, Result)."));
    if(!cur){
      card.appendChild(el("p","muted","Picks a due question first, then one you haven't practiced, from the questions matching the filters below."));
      card.appendChild(btn("Give me a question",pick,"primary"));
      return;
    }
    card.appendChild(el("div","q",cur.q));
    card.appendChild(tags(cur));
    const bar=el("div","row");bar.style.marginTop="10px";card.appendChild(bar);
    const ivb=btn("Interview me with AI",()=>startInterview(cur),"primary");ivb.dataset.tip="An AI interviewer asks this question, then follow-ups about your answer, then grades it";bar.appendChild(ivb);
    bar.appendChild(el("span","muted","or answer on your own:"));
    const tm=el("span","bh-timer",fmt(0));
    const go=btn("Start timer",()=>{
      if(tick){stopTimer();go.textContent="Start timer";return}
      t0=Date.now();go.textContent="Stop timer";
      tick=setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000);tm.textContent=fmt(s);tm.classList.toggle("long",s>180)},250);
    });
    bar.appendChild(tm);bar.appendChild(go);
    bar.appendChild(btn("Mark practiced",()=>{practiced(cur.id);cur=null;stopTimer();render()},"primary"));
    bar.appendChild(btn("Another question",pick));
  }

  // ---------- coverage chips + list ----------
  function render(){
    const all=QS.length,done=QS.filter(x=>get(x.id).done).length,due=QS.filter(x=>isDue(get(x.id))).length;
    stats.textContent=`${done} / ${all} questions practiced`+(due?` · ${due} due for review`:"")+`. A question you mark practiced comes back after ${INTERVALS.join(", ")} days, like LeetCode reviews.`;
    cov.textContent="";
    Object.entries(COMPS).forEach(([k,label])=>{
      const qs=QS.filter(x=>x.c.includes(k)),n=qs.filter(x=>get(x.id).done).length;
      const c=el("span","chip"+(cs.value===k?" on":"")+(n?"":" gap"),`${label} ${n}/${qs.length}`);
      c.dataset.tip=n?`Practiced ${n} of ${qs.length} ${label.toLowerCase()} questions. Click to filter.`:`No ${label.toLowerCase()} question practiced yet. Click to filter.`;
      c.onclick=()=>{cs.value=cs.value===k?"":k;render()};
      cov.appendChild(c);
    });
    if(!tick)renderCard();
    list.textContent="";
    const rows=filtered();
    if(!rows.length)list.appendChild(el("p","muted","No questions match these filters."));
    renderHistory();
    rows.forEach(x=>{
      const p=get(x.id),d=el("div","bh-q"+(p.done?" done":""));list.appendChild(d);
      const top=el("div","top");d.appendChild(top);
      const txt=el("div","txt");top.appendChild(txt);
      txt.appendChild(el("div",null,x.q));txt.appendChild(tags(x));
      const meta=el("div","meta");top.appendChild(meta);
      if(isDue(p))meta.appendChild(el("span","bh-due","Due"));
      else if(p.done)meta.appendChild(el("span",null,"Next "+nextDue(p)));
      if(p.times)meta.appendChild(el("span",null,`×${p.times}`));
      if(p.times){const u=btn("−",()=>{undo(x.id);render()});u.dataset.tip="Undo one practice";meta.appendChild(u)}
      const ivb=btn("Interview",()=>startInterview(x));ivb.dataset.tip="Practice this question with the AI interviewer";meta.appendChild(ivb);
      meta.appendChild(btn(p.done?"Practiced again":"Practiced",()=>{practiced(x.id);render()}));
      meta.appendChild(btn(p.note?"Note ✎":"Note",()=>{openNote=openNote===x.id?null:x.id;render()}));
      if(openNote===x.id){
        const ta=el("textarea");ta.placeholder="Which story would you use? Key points, numbers, what you'd do differently…";ta.value=p.note||"";
        ta.oninput=()=>{const n={...get(x.id)},v=ta.value;if(v)n.note=v;else delete n.note;if(n.done||n.times||n.note)prog[x.id]=n;else delete prog[x.id];save()};
        d.appendChild(ta);setTimeout(()=>ta.focus(),0);
      }
    });
  }

  // ---------- AI interview: the question, follow-ups chosen from the gaps in your answer, then a graded scorecard ----------
  const hist=el("div");
  let I=null; // the interview on screen: {x, level, msgs, started, ended, abort, grade}
  const bhBody=(x,lv)=>({question:x.q,competencies:x.c.map(c=>COMPS[c]),lp:x.lp||null,level:lv});
  const clean=t=>t.replace(/\[END\]/g,"").replace(/\[[A-Z]{0,3}$/,"").trim();

  function backToList(){
    if(I&&I.abort)I.abort.abort();
    if(I&&I.vi)I.vi.stop();
    clearInterval(I&&I.tick);I=null;
    iv.hidden=true;iv.textContent="";main.hidden=false;render();
  }
  function startInterview(x){
    stopTimer();
    I={x,level,msgs:[],started:Date.now(),answerStart:Date.now(),ended:false,abort:null,tick:0};
    main.hidden=true;iv.hidden=false;iv.textContent="";scrollTo(0,0);
    const top=el("div","top");iv.appendChild(top);
    top.appendChild(btn("← Back to questions",()=>{if(I&&I.msgs.length&&!I.grade&&!confirm("Leave this interview? It won't be saved."))return;backToList()}));
    top.appendChild(el("span","sp"));
    const tm=el("span","bh-timer",fmt(0));tm.dataset.tip="Time on your current answer. Aim for 2 to 3 minutes on the first answer, under a minute or so on follow-ups.";top.appendChild(tm);
    I.tick=setInterval(()=>{const s=Math.floor((Date.now()-I.answerStart)/1000),lim=I.msgs.length?90:180;tm.textContent=fmt(s);tm.classList.toggle("long",s>lim)},250);
    iv.appendChild(el("div","eyebrow",`Behavioral interview · ${LEVELS[I.level]}`));
    iv.appendChild(el("div","q",x.q));
    iv.appendChild(tags(x));
    iv.appendChild(el("p","muted","Answer as you would out loud: type, or dictate with Speak. The interviewer stays in character and asks follow-ups about what you said; you get feedback only when you finish."));
    const chat=el("div","chat"),log=el("div"),form=el("form"),inp=el("textarea"),send=el("button",null,"Send");
    send.type="submit";inp.rows=4;inp.placeholder="Your answer… (Enter to send, Shift+Enter for a new line)";
    form.appendChild(inp);form.appendChild(send);chat.appendChild(log);chat.appendChild(form);iv.appendChild(chat);
    const msg=(cls,text)=>{const d=el("div","m"+(cls?" "+cls:""),text);log.appendChild(d);log.scrollTop=log.scrollHeight;return d};
    msg("",x.q);
    const tools=el("div","tools");iv.appendChild(tools);
    I.vi=typeof voiceInput==="function"?voiceInput(inp):null;
    if(I.vi){tools.appendChild(I.vi.mic);tools.appendChild(I.vi.note)}
    tools.appendChild(el("span","sp"));
    const fin=btn("Finish and grade",()=>finish(),"primary");fin.disabled=true;tools.appendChild(fin);
    const ended=el("div","ended","The interviewer has no more questions. Press Finish and grade for your scorecard.");ended.hidden=true;iv.appendChild(ended);
    const out=el("div");iv.appendChild(out);
    let busy=false;
    inp.onkeydown=ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();form.requestSubmit()}};
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const text=inp.value.trim(),me=I;if(!text||busy||me.ended)return;
      if(me.vi)me.vi.stop();
      busy=true;send.disabled=fin.disabled=true;inp.value="";
      me.msgs.push({role:"user",content:text});msg("u",text);
      const o=msg("busy","");let answer="";
      me.abort=new AbortController();
      try{
        const res=await apiFetch("/api/bh/chat",{method:"POST",signal:me.abort.signal,body:JSON.stringify({...bhBody(me.x,me.level),messages:me.msgs})});
        if(!res.ok){const d=await res.json();throw new Error(d.error||"Request failed")}
        const r=res.body.getReader(),dec=new TextDecoder();let buf="";
        for(;;){
          const {done,value}=await r.read();if(done)break;
          buf+=dec.decode(value,{stream:true});
          const parts=buf.split("\n\n");buf=parts.pop();
          for(const p of parts){
            if(!p.startsWith("data: "))continue;
            const e=JSON.parse(p.slice(6));
            if(e.error)throw new Error(e.error);
            if(e.t){answer+=e.t;o.classList.remove("busy");o.textContent=clean(answer);log.scrollTop=log.scrollHeight}
          }
        }
        if(I!==me)return;
        me.msgs.push({role:"assistant",content:clean(answer)||"(no reply)"});
        me.answerStart=Date.now();
        if(/\[END\]/.test(answer)){me.ended=true;inp.disabled=true;ended.hidden=false;if(me.vi)me.vi.mic.disabled=true}
      }catch(err){
        if(I!==me)return;
        me.msgs.pop();inp.value=text;
        o.classList.remove("busy");o.classList.add("warn");o.textContent=err.name==="AbortError"?"Stopped.":errMsg(err);
      }
      busy=false;send.disabled=me.ended;fin.disabled=!me.msgs.some(m=>m.role==="user");
      if(!me.ended)inp.focus();
    };
    async function finish(){
      const me=I;if(busy||!me.msgs.length)return;
      if(me.vi)me.vi.stop();
      clearInterval(me.tick);me.ended=true;inp.disabled=send.disabled=fin.disabled=true;ended.hidden=true;
      if(me.vi)me.vi.mic.disabled=true;
      out.textContent="";const wait=el("p","busy","Grading your answer…");out.appendChild(wait);
      const secs=Math.round((Date.now()-me.started)/1000);
      try{
        const res=await apiFetch("/api/bh/grade",{method:"POST",body:JSON.stringify({...bhBody(me.x,me.level),messages:me.msgs,secs})});
        const d=await res.json();
        if(!res.ok)throw new Error(d.error||"Request failed");
        if(I!==me)return;
        me.grade=d.grade;
        practiced(me.x.id);
        const h=readJSON(HKEY,[]);
        h.push({at:Date.now(),id:me.x.id,q:me.x.q,level:me.level,secs,msgs:me.msgs,grade:d.grade,model:d.model});
        writeJSON(HKEY,h.slice(-30));
        out.textContent="";out.appendChild(scorecard(d.grade,me.level));
        const again=el("div","tools");
        again.appendChild(btn("Try this question again",()=>startInterview(me.x),"primary"));
        again.appendChild(btn("Back to questions",backToList));
        out.appendChild(again);
      }catch(err){
        if(I!==me)return;
        out.textContent="";out.appendChild(el("p","warn",errMsg(err)));
        fin.disabled=false;fin.textContent="Try grading again";
      }
    }
    inp.focus();
  }

  function scorecard(g,lv){
    const sc=el("div","bh-sc");
    const hd=el("div","hd");sc.appendChild(hd);
    hd.appendChild(el("h3",null,"Scorecard"));
    const L=LEVELS[lv]||lv,fit=g.level_fit.verdict;
    hd.appendChild(el("span","bh-fit "+fit,fit==="at"?`Reads at ${L} level`:fit==="above"?`Reads above ${L} level`:`Reads below ${L} level`));
    sc.appendChild(el("p",null,g.summary));
    sc.appendChild(el("p","muted",g.level_fit.explanation));
    g.scores.forEach(s=>{
      const a=el("div","bh-area");sc.appendChild(a);
      const h=el("div","hd");a.appendChild(h);
      h.appendChild(el("b",null,AREAS[s.area]||s.area));
      const dots=el("span","bh-dots","●".repeat(s.score)+"○".repeat(5-s.score));dots.title=s.score+" / 5";h.appendChild(dots);
      h.appendChild(el("span","muted",s.score+"/5"));
      a.appendChild(el("div","ev",s.evidence));
      if(s.quote)a.appendChild(el("blockquote",null,"“"+s.quote+"”"));
    });
    const list=(title,items)=>{if(!items.length)return;sc.appendChild(el("h3",null,title));const u=el("ul");items.forEach(t=>u.appendChild(el("li",null,t)));sc.appendChild(u)};
    list("Strengths",g.strengths);
    list("Tell it better next time",g.improvements);
    list("Prepare for these follow-ups",g.prepare);
    return sc;
  }

  function showPast(h){
    main.hidden=true;iv.hidden=false;iv.textContent="";scrollTo(0,0);
    const top=el("div","top");iv.appendChild(top);
    top.appendChild(btn("← Back to questions",backToList));
    top.appendChild(el("span","sp"));
    top.appendChild(el("span","muted",`${new Date(h.at).toLocaleString()} · ${fmt(h.secs)} · ${h.model||""}`));
    iv.appendChild(el("div","eyebrow",`Past interview · ${LEVELS[h.level]||h.level}`));
    iv.appendChild(el("div","q",h.q));
    const chat=el("div","chat"),log=el("div");chat.appendChild(log);iv.appendChild(chat);
    log.appendChild(el("div","m",h.q));
    h.msgs.forEach(m=>log.appendChild(el("div","m"+(m.role==="user"?" u":""),m.content)));
    iv.appendChild(scorecard(h.grade,h.level));
    const x=QS.find(q=>q.id===h.id);
    if(x){const t=el("div","tools");t.appendChild(btn("Try this question again",()=>startInterview(x),"primary"));iv.appendChild(t)}
  }

  function renderHistory(){
    hist.textContent="";
    const h=readJSON(HKEY,[]);
    if(!Array.isArray(h)||!h.length)return;
    hist.appendChild(el("h3",null,"Past AI interviews"));
    const l=el("div","bh-hist");hist.appendChild(l);
    h.slice().reverse().forEach(a=>{
      if(!a||!a.grade||!a.grade.scores)return;
      const avg=a.grade.scores.reduce((t,s)=>t+s.score,0)/a.grade.scores.length;
      const d=el("div","h");d.onclick=()=>showPast(a);
      d.appendChild(el("span","t",a.q));
      const fit=a.grade.level_fit.verdict;
      d.appendChild(el("span","bh-fit "+fit,(fit==="at"?"At ":fit==="above"?"Above ":"Below ")+(LEVELS[a.level]||a.level)));
      d.appendChild(el("span","muted",avg.toFixed(1)+" / 5"));
      d.appendChild(el("span","muted",new Date(a.at).toLocaleDateString()));
      l.appendChild(d);
    });
  }

  window.behavioralInit=function(){
    if(ready)return render();
    ready=true;
    const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
    const outer=el("div","bh");root().appendChild(outer);
    outer.appendChild(main);outer.appendChild(iv);iv.hidden=true;
    const wrap=main;
    const hd=el("div","row");hd.style.cssText="display:flex;gap:10px;align-items:center;flex-wrap:wrap";
    hd.appendChild(el("h2",null,"Behavioral"));hd.lastChild.style.flex="1";
    const lv=el("select");Object.entries(LEVELS).forEach(([k,v])=>{const o=el("option",null,"Target level: "+v);o.value=k;lv.appendChild(o)});
    lv.value=level;lv.onchange=()=>{level=lv.value;writeJSON(LKEY,level)};
    lv.dataset.tip="The AI interviewer and grader judge whether your story's scope fits this level";
    hd.appendChild(lv);wrap.appendChild(hd);
    wrap.appendChild(stats);
    wrap.appendChild(card);
    wrap.appendChild(hist);
    wrap.appendChild(cov);
    const f=el("div","bh-f");wrap.appendChild(f);
    q.type="search";q.placeholder="Search questions or Amazon principles…";
    const opt=(sel,v,t)=>{const o=el("option",null,t);o.value=v;sel.appendChild(o)};
    opt(cs,"","All competencies");Object.entries(COMPS).forEach(([k,v])=>opt(cs,k,v));
    opt(cos,"","Any company");COS.forEach(c=>opt(cos,c,c));
    [["","All"],["todo","Not practiced"],["done","Practiced"],["due","Due for review"]].forEach(([v,t])=>opt(st,v,t));
    [q,cs,cos,st].forEach(n=>{n.oninput=render;f.appendChild(n)});
    wrap.appendChild(list);
    render();
  };
})();

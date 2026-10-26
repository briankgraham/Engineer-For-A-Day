// System Design Prep tab. Content lives in sysdesign_data.js (const SD); this file is the UI.
// Relies on globals from index.html: $, el, apiFetch, today, isDue, NO_SERVER, INTERVALS; LK (learn_kit.js) for the lesson pages;
// SD_LESSONS (sysdesign_lessons.js) for the practice steps.
(()=>{
const KEY="sysdesign-progress-v1",MKEY="sysdesign-mocks-v1",AKEY="sysdesign-active-mock-v1";
const rd=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const CKEY="sysdesign-cards-v1";
let cards=rd(CKEY,{});
let prog=rd(KEY,{}),mocks=rd(MKEY,[]),active=rd(AKEY,null);
const T=Object.fromEntries(SD.topics.map(t=>[t.id,t])),P=Object.fromEntries(SD.problems.map(p=>[p.id,p]));
const gp=k=>prog[k]||{done:false,times:0};
const hasParts=p=>!!(p.parts&&Object.keys(p.parts).length);
const setp=(k,p)=>{if(p.done||p.times||p.note||p.revisit||hasParts(p))prog[k]=p;else delete prog[k];wr(KEY,prog)};
const kt=id=>"t:"+id,kp=id=>"p:"+id;
const isDone=k=>!!gp(k).done;
const DIFF={E:"Easy",M:"Medium",H:"Hard"};
const go=path=>{const n="#sysdesign/"+path;if(location.hash===n)sdRoute();else location.hash=n};
let timer=null;

// ---- small DOM helpers ----
const h=(tag,cls,text)=>el(tag,cls,text);
const add=(p,...kids)=>{kids.forEach(k=>k&&p.appendChild(k));return p};
const ul=items=>{const u=h("ul");items.forEach(i=>u.appendChild(h("li",null,i)));return u};
const sect=(parent,title,items)=>{if(items&&items.length){parent.appendChild(h("h3",null,title));parent.appendChild(ul(items))}};
const chip=(text,path,done)=>{const c=h("button","chip"+(done?" done":""),(done?"✓ ":"")+text);c.onclick=()=>go(path);return c};
const backBtn=(label,path)=>{const b=h("button","back","← "+label);b.onclick=()=>go(path);return b};
const diffSpan=d=>h("span",d,DIFF[d]);
const fmt=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

// ---- progress controls (done checkbox, times, notes) ----
function controls(key){
  const box=h("div"),row=h("div","pb"),note=h("textarea");
  const paint=()=>{
    const p=gp(key);row.textContent="";
    const lab=h("label"),cb=h("input");cb.type="checkbox";cb.checked=!!p.done;
    cb.onchange=()=>{const q={...gp(key)};q.done=cb.checked;if(q.done){if(!q.times)q.times=1;q.last=today()}setp(key,q);paint();paintNav()};
    add(lab,cb,document.createTextNode(" Done"));
    const dec=h("button",null,"−"),inc=h("button",null,"+");
    dec.onclick=()=>{const q={...gp(key)};q.times=Math.max(0,q.times-1);if(!q.times)q.done=false;setp(key,q);paint();paintNav()};
    inc.onclick=()=>{const q={...gp(key)};q.times++;q.done=true;q.last=today();setp(key,q);paint();paintNav()};
    add(row,lab,h("span",null,"Practiced "+p.times+"×"),dec,inc);
    if(isDue(p))add(row,h("span","warn","Due for review"));
    if(p.last)add(row,h("span","meta","last: "+p.last));
  };
  note.rows=4;note.placeholder="Your notes: key insights, mistakes, things to revisit…";note.value=gp(key).note||"";
  note.oninput=()=>{setp(key,{...gp(key),note:note.value})};
  paint();add(box,row,note);return box;
}

// ---- voice dictation (browser speech-to-text): fills `inp`, never sends anything itself ----
function voiceInput(inp){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const mic=h("button",null,"🎤 Speak"),note=h("span","meta",SR?"Dictate your answer, edit the text if needed, then submit it.":"Voice input isn't supported in this browser (try Chrome or Safari).");
  mic.type="button";if(!SR)mic.disabled=true;
  let rec=null,listening=false;
  const stop=()=>{listening=false;mic.textContent="🎤 Speak";mic.classList.remove("on");if(rec){try{rec.stop()}catch(e){}}};
  mic.onclick=()=>{
    if(listening)return stop();
    rec=new SR();rec.continuous=true;rec.interimResults=true;rec.lang=navigator.language||"en-US";
    let base="";
    rec.onstart=()=>{base=inp.value.trim()};
    rec.onresult=ev=>{
      // A result can land after Stop or Send (or after the box left the page): drop it so sent text never reappears.
      if(!listening||!inp.isConnected)return stop();
      let fin="",tmp="";
      for(let i=0;i<ev.results.length;i++){(ev.results[i].isFinal?(fin+=ev.results[i][0].transcript):(tmp+=ev.results[i][0].transcript))}
      inp.value=(base?base+" ":"")+(fin+tmp).trim();
      inp.dispatchEvent(new Event("input",{bubbles:true}));  // so draft autosave and the like see dictated text
    };
    rec.onerror=ev=>{
      if(ev.error==="no-speech"||ev.error==="aborted")return;
      stop();note.textContent=ev.error==="not-allowed"||ev.error==="service-not-allowed"?"Microphone access was blocked. Allow it in the browser's site settings.":"Voice input error: "+ev.error;
    };
    // Browsers end the session after a pause; restart while the user still wants to talk.
    rec.onend=()=>{if(listening&&inp.isConnected){try{rec.start()}catch(e){stop()}}else stop()};
    listening=true;mic.textContent="⏹ Stop";mic.classList.add("on");
    try{rec.start()}catch(e){stop()}
  };
  return {mic,note,stop};
}
window.voiceInput=voiceInput; // shared with every AI text box in the app: aipair.js, behavioral.js, day.js, the LeetCode practice chat (this file is wrapped in an IIFE)

// ---- streaming chat (same SSE protocol as the LeetCode tutor) ----
function chatBox(id,mode,msgs,placeholder,onChange){
  const voice=mode==="interviewer",root=h("div","chat"),log=h("div"),form=h("form"),inp=h(voice?"textarea":"input");
  if(voice)inp.rows=3;else inp.type="text";
  inp.placeholder=placeholder;inp.maxLength=4000;inp.autocomplete="off";
  const btn=h("button",null,"Send");btn.type="submit";
  add(form,inp,btn);add(root,log,form);
  let evalBtn=null,vi=null;
  if(!voice){
    // Dictation fills the box; nothing is sent until Send.
    vi=voiceInput(inp);form.insertBefore(vi.mic,btn);
    if(!vi.mic.disabled)vi.note.textContent="";
    root.appendChild(vi.note);
  }
  if(voice){
    // Voice dictation (browser speech-to-text) fills the box; nothing is sent until Send / AI evaluate response.
    const tools=h("div","pb");tools.style.marginTop="6px";
    vi=voiceInput(inp);
    evalBtn=h("button",null,"AI evaluate response");evalBtn.type="button";
    add(tools,vi.mic,evalBtn,vi.note);root.appendChild(tools);
    inp.onkeydown=ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();form.requestSubmit()}};
    evalBtn.onclick=()=>send(true);
  }
  msgs.forEach(m=>{const d=h("div","m"+(m.role==="user"?" u":""),m.content);if(m.role!=="user"&&window.renderMd)renderMd(d,m.content);log.appendChild(d)});
  // Keep the newest message in view. force: jump regardless (after Send); otherwise only follow if the reader is already near the end.
  // The mock interview's log is its own scroll box; the walkthrough's log grows the page, so scroll the page there instead.
  const follow=force=>{
    if(log.scrollHeight>log.clientHeight){if(force||log.scrollHeight-log.scrollTop-log.clientHeight<160)log.scrollTop=log.scrollHeight}
    else if(log.lastChild&&(force||log.lastChild.getBoundingClientRect().bottom-innerHeight<160))log.lastChild.scrollIntoView({block:"nearest"});
  };
  requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight});  // resuming a mock opens at the latest message
  let busy=false;
  form.onsubmit=ev=>{ev.preventDefault();send(false)};
  async function send(evaluate){
    const text=inp.value.trim();if(!text||busy)return;
    if(vi)vi.stop();
    busy=true;inp.value="";if(evalBtn)evalBtn.disabled=btn.disabled=true;
    msgs.push({role:"user",content:text});
    log.appendChild(h("div","m u",text));
    const out=h("div","m busy","Thinking…");log.appendChild(out);follow(true);
    let answer="";
    try{
      const res=await apiFetch("/api/sd/chat",{method:"POST",body:JSON.stringify({id,mode,messages:msgs.length>40?msgs.slice(-39):msgs,evaluate})});
      if(!res.ok){const d=await res.json();throw new Error(d.error||"Request failed")}
      const r=res.body.getReader(),dec=new TextDecoder();let buf="";
      for(;;){
        const {done,value}=await r.read();if(done)break;
        buf+=dec.decode(value,{stream:true});
        const parts=buf.split("\n\n");buf=parts.pop();
        for(const p of parts){
          if(!p.startsWith("data: "))continue;
          const ev=JSON.parse(p.slice(6));
          if(ev.error)throw new Error(ev.error);
          if(ev.t){answer+=ev.t;out.classList.remove("busy");if(window.renderMd)renderMd(out,answer);else out.textContent=answer;follow(false)}
        }
      }
      msgs.push({role:"assistant",content:answer.slice(0,4000)||"(no answer)"});
      if(onChange)onChange();
    }catch(err){
      msgs.pop();
      out.classList.remove("busy");out.textContent=err instanceof TypeError?NO_SERVER:err.message;out.classList.add("warn");
    }
    busy=false;if(evalBtn)evalBtn.disabled=btn.disabled=false;
  }
  return root;
}

// ---- walkthrough dialog ----
let walkId="",walkMsgs=[];
function renderWalk(doc){
  const w=doc.walkthrough,b=$("sdb");b.textContent="";
  add(b,h("p",null,w.summary));
  add(b,h("div","meta","Generated by "+doc.model+" on "+doc.generated_at.slice(0,10)+". AI-written; verify numbers and details."));
  b.appendChild(h("h3",null,"Requirements"));
  const c=h("div","card");add(c,h("h4",null,"Functional"),ul(w.functional),h("h4",null,"Non-functional"),ul(w.non_functional));b.appendChild(c);
  sect(b,"Estimation",w.estimation);
  sect(b,"API",w.api);
  sect(b,"Data model",w.data_model);
  b.appendChild(h("h3",null,"High-level design"));
  add(b,h("p",null,w.architecture.overview));
  const dg=window.sdDiagram(w.architecture.graph);
  if(dg)b.appendChild(dg);
  else if(w.architecture.diagram){
    // Walkthroughs cached before the illustrated diagram only have the ASCII sketch.
    add(b,h("pre",null,w.architecture.diagram),h("p","meta","Press Regenerate for an illustrated diagram."));
  }
  w.architecture.components.forEach(k=>{const d=h("div","card");add(d,h("h4",null,k.name),h("p",null,k.role));b.appendChild(d)});
  b.appendChild(h("h3",null,"Deep dives"));
  w.deep_dives.forEach(d=>{const cd=h("div","card");add(cd,h("h4",null,d.title),h("p",null,d.challenge),ul(d.options),h("p",null,"Choice: "+d.choice));b.appendChild(cd)});
  sect(b,"Trade-offs",w.tradeoffs);
  sect(b,"Failure modes and bottlenecks",w.failure_modes);
  sect(b,"Likely follow-ups",w.followups);
  b.appendChild(h("h3",null,"Ask a follow-up"));
  b.appendChild(chatBox(walkId,"tutor",walkMsgs,"Ask about this design…"));
}
async function loadWalk(url,opts){
  const b=$("sdb"),id=walkId;
  b.textContent="";b.appendChild(h("p","busy","Generating walkthrough… this can take up to a minute the first time."));
  $("sdregen").hidden=true;
  try{
    const res=await apiFetch(url,opts);
    const d=await res.json();
    if(id!==walkId)return;
    if(!res.ok)throw new Error(d.error||"Request failed");
    renderWalk(d);$("sdregen").hidden=false;
  }catch(err){
    if(id!==walkId)return;
    b.textContent="";
    b.appendChild(h("p","warn",err instanceof TypeError?NO_SERVER:err.message));
  }
}
function openWalk(id){
  walkId=id;walkMsgs=[];$("sdt").textContent=P[id].name+" — walkthrough";
  $("sddlg").showModal();
  loadWalk("/api/sd/walkthrough?id="+encodeURIComponent(id));
}
$("sdx").onclick=()=>{walkId="";$("sddlg").close()};
$("sdregen").onclick=()=>{if(walkId){walkMsgs=[];loadWalk("/api/sd/walkthrough/regenerate",{method:"POST",body:JSON.stringify({id:walkId})})}};

// ---- views ----
const view=()=>$("sdview");
const TABS=[["start","Course"],["topics","Topics"],["quiz","Quiz"],["problems","Problems"],["mock","Mock interview"]];
let curTab="start";
function paintNav(){
  const n=$("sdnav");n.textContent="";
  TABS.forEach(([id,name])=>{const b=h("button",id===curTab?"on":"",name);b.onclick=()=>go(id);n.appendChild(b)});
  const ex=h("button",null,"Export progress");ex.style.marginLeft="auto";ex.onclick=()=>$("export").click();n.appendChild(ex);
}
const frac=(n,d)=>{const b=h("div","bar"),i=h("i");i.style.width=(d?100*n/d:0)+"%";b.appendChild(i);return b};

function dueList(){
  const out=[];
  SD.topics.forEach(t=>{if(isDue(gp(kt(t.id))))out.push(chip(t.name,"topic/"+t.id,false))});
  SD.problems.forEach(p=>{if(isDue(gp(kp(p.id))))out.push(chip(p.name,"problem/"+p.id,false))});
  return out;
}

// ---- course path (Start here) and topic lessons: built from the shared Learning kit (learn_kit.js, .lr-* styles) ----
const LESSONS=typeof SD_LESSONS==="undefined"?{}:SD_LESSONS;
const LASTKEY="sysdesign-last-v1";
const lastItem=()=>rd(LASTKEY,null);
const setLast=(kind,id)=>wr(LASTKEY,{kind,id});
const lrReady=(()=>{let on=false;return()=>{if(on||!window.LK)return;on=true;LK.injectCss();const st=document.createElement("style");st.textContent=SDCSS;document.head.appendChild(st)}})();
const SDCSS=`
.lr .sdp{display:flex;flex-direction:column;gap:2px;margin-top:12px}
.lr .sdp-i{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:var(--fg);background:none;border:0;border-radius:10px;padding:8px 10px;cursor:pointer}
.lr .sdp-i:hover{background:var(--head)}
.lr .sdp-i .st{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line);flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.lr .sdp-i.done .st{background:var(--easy);border-color:var(--easy)}
.lr .sdp-i.cur .st{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.lr .sdp-i .m{margin-left:auto;color:var(--muted);font-size:12px;white-space:nowrap}
.lr .sdp-i .m .E{color:var(--easy)}.lr .sdp-i .m .M{color:var(--med)}.lr .sdp-i .m .H{color:var(--hard)}
`;

// The path flattened to the steps that can be completed, in order.
const STEPS=[];
SD.path.forEach((st,si)=>st.items.forEach(([k,i])=>{if(k==="topic"||k==="problem")STEPS.push({kind:k,id:i,stage:si})}));
const stepKey=s=>s.kind==="topic"?kt(s.id):kp(s.id);
const stepName=s=>s.kind==="topic"?T[s.id].name:P[s.id].name;
const stepPath=s=>s.kind+"/"+s.id;
const partsOf=id=>(LESSONS[id]&&LESSONS[id].parts)||[];
const partsDone=id=>{const r=gp(kt(id)).parts||{};return partsOf(id).filter(p=>r[p.id]&&r[p.id].ok).length};
// Resume the topic or problem you last opened if it isn't finished, otherwise the first unfinished step.
const nextStep=()=>{
  const l=lastItem(),cur=l&&STEPS.find(s=>s.kind===l.kind&&s.id===l.id);
  if(cur&&!isDone(stepKey(cur)))return cur;
  return STEPS.find(s=>!isDone(stepKey(s)))||null;
};
const nodeBtn=(text,fn,cls)=>LK.btn(text,fn,cls);

function stepRow(s,cur){
  const done=isDone(stepKey(s)),b=h("button","sdp-i"+(done?" done":"")+(cur?" cur":""));
  b.type="button";b.onclick=()=>go(stepPath(s));
  const m=h("span","m");
  if(s.kind==="topic"){
    const n=partsOf(s.id).length;
    m.textContent=n?`${partsDone(s.id)}/${n} practice`:"Read";
  }else m.appendChild(diffSpan(P[s.id].diff));
  add(b,h("span","st",done?"✓":""),h("span",null,stepName(s)),m);
  return b;
}

function viewStart(v){
  lrReady();
  const w=h("div","lr");v.appendChild(w);
  const done=STEPS.filter(s=>isDone(stepKey(s))).length;
  const practice=SD.topics.reduce((a,t)=>a+partsOf(t.id).length,0),practiceDone=SD.topics.reduce((a,t)=>a+partsDone(t.id),0);
  const nx=nextStep(),started=done||lastItem();
  const hero=h("div","lr-hero"),L=h("div");hero.appendChild(L);
  L.append(h("h1",null,"🏗️ System Design"),h("p","tag","From the building blocks to full designs, then mock interviews under time pressure."));
  const outs=h("ul");["Reason from numbers: estimate load before choosing components.","Explain the trade-offs of caches, queues, shards and replicas.","Walk a 45-minute interview from requirements to deep dive."].forEach(o=>outs.appendChild(h("li",null,o)));L.appendChild(outs);
  const acts=h("div");acts.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center";
  if(nx)acts.appendChild(nodeBtn(started?`Continue: ${stepName(nx)} →`:`Start: ${stepName(nx)} →`,()=>go(stepPath(nx)),"cta"));
  else acts.appendChild(h("span","pill ok","✓ Every step complete"));
  acts.appendChild(nodeBtn("Interview framework ↓",()=>{fwDetails.open=true;fw.scrollIntoView({behavior:"smooth",block:"start"})},"ghost"));
  L.appendChild(acts);
  const R=h("div","lr-ring");R.appendChild(LK.ring(done,STEPS.length,0,"steps done"));
  const st=h("div","stats");
  if(practice)st.appendChild(h("span",null,`${practiceDone} of ${practice} practice steps done`));
  st.appendChild(h("span",null,`${mocks.length} mock interview${mocks.length===1?"":"s"}`));
  R.appendChild(st);hero.appendChild(R);w.appendChild(hero);

  const due=STEPS.filter(s=>isDue(gp(stepKey(s))));
  if(due.length){
    const c=h("div","lr-cont"),tx=h("div","t");
    tx.append(h("small",null,"Due for review"),h("b",null,due.map(stepName).join(" · ")));
    c.append(tx,nodeBtn("Review now →",()=>go(stepPath(due[0])),"cta"));w.appendChild(c);
  }

  w.appendChild(h("div","lr-sec","The path"));
  const path=h("div","lr-path");w.appendChild(path);
  SD.path.forEach((stage,si)=>{
    const items=STEPS.filter(s=>s.stage===si),n=items.filter(s=>isDone(stepKey(s))).length;
    const complete=items.length&&n===items.length;
    const isCur=nx&&nx.stage===si;
    const r=h("div","lr-step"+(complete?" done":isCur?" cur":"")),rail=h("div","rail");
    rail.appendChild(h("div","lr-node",complete?"✓":String(si+1)));
    const c=h("div","lr-lc");
    c.style.cursor="default";
    const eb=h("div","eb","Stage "+(si+1));
    if(complete)eb.appendChild(h("span","pill ok","Complete"));
    c.append(eb,h("h3",null,stage.name.replace(/^\d+\.\s*/,"")),h("p",null,stage.desc));
    if(items.length){
      const meta=h("div","meta"),bar=h("div","lr-bar"),fill=h("i");fill.style.width=(100*n/items.length)+"%";bar.appendChild(fill);
      meta.append(bar,h("span",null,`${n}/${items.length}`));c.appendChild(meta);
    }
    const list=h("div","sdp");
    stage.items.forEach(([k,i])=>{
      if(k==="topic"||k==="problem")list.appendChild(stepRow(STEPS.find(s=>s.kind===k&&s.id===i),!!nx&&nx.kind===k&&nx.id===i));
      else if(k==="framework"){const b=h("button","sdp-i");b.type="button";b.onclick=()=>{fwDetails.open=true;fw.scrollIntoView({behavior:"smooth",block:"start"})};add(b,h("span","st","📋"),h("span",null,"The interview framework"),h("span","m","Read"));list.appendChild(b)}
      else{const b=h("button","sdp-i");b.type="button";b.onclick=()=>go("mock");add(b,h("span","st","⏱"),h("span",null,"Start a mock interview"),h("span","m",mocks.length?mocks.length+" done":""));list.appendChild(b)}
    });
    c.appendChild(list);r.append(rail,c);path.appendChild(r);
  });

  const fw=h("div");fw.id="framework";w.appendChild(fw);
  fw.appendChild(h("div","lr-sec","The interview framework"));
  const fwDetails=h("details","card");fwDetails.open=location.hash.endsWith("/framework");
  fwDetails.appendChild(h("summary",null,"About 45 minutes, six steps"));
  SD.framework.forEach(s=>{fwDetails.appendChild(h("h3",null,s.name+" · ~"+s.mins+" min"));fwDetails.appendChild(h("div","meta",s.desc));fwDetails.appendChild(ul(s.tips))});
  fw.appendChild(fwDetails);
  if(fwDetails.open)requestAnimationFrame(()=>fw.scrollIntoView());
}

function viewTopics(v){
  add(v,h("h2",null,"Topics"),h("p","sub","Core building blocks and concepts. Click one to read the summary, trade-offs and pitfalls."));
  const q=h("input");q.type="search";q.placeholder="Search topics…";v.appendChild(q);
  const list=h("div");v.appendChild(list);
  const paint=()=>{
    list.textContent="";const s=q.value.trim().toLowerCase();
    [...new Set(SD.topics.map(t=>t.group))].forEach(g=>{
      const ts=SD.topics.filter(t=>t.group===g&&(!s||(t.name+" "+t.summary).toLowerCase().includes(s)));
      if(!ts.length)return;
      list.appendChild(h("h3",null,g));
      const grid=h("div","grid");
      ts.forEach(t=>{
        const b=h("button","tile"+(isDone(kt(t.id))?" done":""));
        if(isDone(kt(t.id)))b.appendChild(h("span","tick","✓"));
        add(b,h("b",null,t.name),h("span",null,t.summary.split(". ")[0].replace(/\.$/,"")+"."));
        b.onclick=()=>go("topic/"+t.id);grid.appendChild(b);
      });
      list.appendChild(grid);
    });
    if(!list.firstChild)list.appendChild(h("p","sub","No matching topics."));
  };
  q.oninput=paint;paint();
}

function viewTopic(v,id){
  const t=T[id];if(!t){go("topics");return}
  lrReady();setLast("topic",id);
  const key=kt(id),lesson=LESSONS[id]||{},parts=lesson.parts||[];
  const w=h("div","lr");v.appendChild(w);
  const si=STEPS.findIndex(s=>s.kind==="topic"&&s.id===id),step=STEPS[si],stage=step&&SD.path[step.stage];
  const rec=()=>prog[key]||(prog[key]={done:false,times:0});
  const save=()=>{const r=prog[key];if(r&&!(r.done||r.times||r.note||r.revisit||hasParts(r)))delete prog[key];wr(KEY,prog)};

  // Breadcrumbs with previous / next along the path
  const cr=h("nav","crumbs"),crA=(text,path)=>{const a=h("a",null,text);a.onclick=()=>go(path);return a};
  cr.append(crA("System Design","start"),document.createTextNode("›"));
  if(stage)cr.append(crA(stage.name.replace(/^\d+\.\s*/,""),"start"),document.createTextNode("›"));
  cr.appendChild(h("span",null,t.name));cr.appendChild(h("span","sp"));
  const prev=STEPS[si-1],next=STEPS[si+1];
  if(prev)cr.appendChild(nodeBtn("← Prev",()=>go(stepPath(prev)),"ghost"));
  if(next)cr.appendChild(nodeBtn("Next →",()=>go(stepPath(next)),"ghost"));
  w.appendChild(cr);

  // Header: goal and completion controls
  const head=h("div","lr-lhead");w.appendChild(head);
  const goal=h("p","goal");LK.inline(goal,lesson.goal||t.summary.split(/(?<=\.)\s/)[0]);
  head.append(h("div","no",`${t.group} · Step ${si+1} of ${STEPS.length}`),h("h1",null,t.name),goal);
  const acts=h("div","acts");head.appendChild(acts);
  const doneB=LK.btn("",null,"ghost lr-done-b"),flagB=LK.btn("",null,"ghost lr-flag"),info=h("span","info");
  acts.append(doneB,flagB,info);
  const syncHead=()=>{
    const x=gp(key),due=isDue(x),all=parts.length&&partsDone(id)===parts.length;
    doneB.textContent=due?"↻ Mark reviewed":x.done?"✓ Complete":"Mark complete";
    doneB.classList.toggle("on",!!x.done&&!due);doneB.classList.toggle("nudge",(!x.done&&!!all)||due);
    flagB.textContent=x.revisit?"⚑ Flagged to revisit":"⚑ Revisit later";flagB.classList.toggle("on",!!x.revisit);
    const left=x.done&&x.last?Math.ceil(INTERVALS[Math.min(Math.max(x.times,1),3)-1]-(Date.parse(today())-Date.parse(x.last))/864e5):null;
    info.textContent=(lesson.mins?`⏱ ${lesson.mins} min`:"Read it through")+(parts.length?` · ${partsDone(id)}/${parts.length} practice steps`:"")+
      (x.done?(due?" · review due today":left!=null?` · next review in ${left} day${left===1?"":"s"}`:""):"")+(x.times>1?` · reviewed ${x.times-1}×`:"");
  };
  doneB.onclick=()=>{
    const r=rec();
    if(isDue(r)){r.times++;r.last=today();LK.toast("Reviewed. See you in "+INTERVALS[Math.min(r.times,3)-1]+" days.")}
    else if(r.done){r.done=false;r.times=0;delete r.last}
    else{r.done=true;r.times=Math.max(1,r.times||0);r.last=today();LK.toast("Complete 🎉 It'll come back for review in 3 days.")}
    save();syncHead();paintNav();
  };
  flagB.onclick=()=>{const r=rec();r.revisit=!r.revisit;if(!r.revisit)delete r.revisit;save();syncHead()};

  const grid=h("div","lr-grid"),main=h("div","lr-main"),aside=h("aside","lr-aside");grid.append(main,aside);w.appendChild(grid);

  // Learn: the topic's own sections as markdown, then the lesson's extras
  const learnH=h("h2","lr-h2","Learn");learnH.id="lr-learn";learnH.style.marginTop="0";main.appendChild(learnH);
  const read=h("div","lr-read");main.appendChild(read);
  const bullets=a=>a.map(x=>"- "+x).join("\n");
  const sec=(title,items)=>items&&items.length?`### ${title}\n${bullets(items)}\n\n`:"";
  read.appendChild(LK.md(t.summary+"\n\n"+sec("When to use it",t.use)+sec("Trade-offs",t.tradeoffs)+sec("Common pitfalls",t.pitfalls)+(t.deep||[]).map(([title,items])=>sec(title,items)).join("")));
  (lesson.blocks||[]).forEach(b=>{
    if(b.md)read.appendChild(LK.md(b.md));
    else if(b.tip||b.warn){const c=h("div","lr-call "+(b.tip?"tip":"warn"));c.append(h("span","i",b.tip?"💡":"⚠️"),h("div",null,b.tip||b.warn));read.appendChild(c)}
  });

  // Practice
  let prH=null;const dots={};
  // fromUser: a practice step just passed. Only then may finishing the last one complete the topic (not on every render).
  const onPartChange=fromUser=>{
    const r=gp(key);
    if(fromUser===true&&parts.length&&partsDone(id)===parts.length&&!r.done){const q=rec();q.done=true;q.times=Math.max(1,q.times||0);q.last=today();save();LK.toast("Topic complete 🎉 All practice steps passed.");paintNav()}
    parts.forEach(p=>{const d=dots[p.id],ok=!!((gp(key).parts||{})[p.id]||{}).ok;if(d){d.classList.toggle("ok",ok);d.textContent=ok?"✓":""}});
    syncHead();tocCount.textContent=parts.length?`${partsDone(id)}/${parts.length} done`:"";
  };
  const tocCount=h("span");
  if(parts.length){
    prH=h("h2","lr-h2","Practice");prH.id="lr-practice";main.appendChild(prH);
    main.appendChild(h("p","sub","Quick checks are instant. Written answers get feedback from the AI tutor against a rubric, so say it the way you would in the interview."));
    const list=h("div","lr-parts");main.appendChild(list);
    const ctx={state:p=>{const r=rec();if(!r.parts)r.parts={};return r.parts[p.id]||(r.parts[p.id]={})},save,onChange:()=>onPartChange(true),
      reviewBody:(p,answer)=>({kind:"explain",track:"System design",lesson:t.name,goal:lesson.goal||t.summary,prompt:p.prompt,rubric:p.rubric,answer})};
    parts.forEach((p,k)=>list.appendChild(p.type==="quiz"?LK.quizPart(ctx,p,k):LK.explainPart(ctx,p,k)));
  }

  // Next up
  const nxH=h("h2","lr-h2","Next up");nxH.id="lr-next";main.appendChild(nxH);
  const nx=h("div","lr-next");main.appendChild(nx);
  const rel=SD.problems.filter(p=>p.topics.includes(id));
  if(rel.length){
    nx.appendChild(h("p","sub","Designs that use this building block. Try one once the practice steps feel easy."));
    const row=h("div");rel.forEach(p=>row.appendChild(chip(p.name,"problem/"+p.id,isDone(kp(p.id)))));nx.appendChild(row);
  }
  if(next){
    const b=h("button","lr-nextl");b.type="button";b.onclick=()=>go(stepPath(next));
    const tx=h("div");tx.append(h("small",null,next.kind==="topic"?"Next topic":"Next design"),h("b",null,stepName(next)));
    b.append(tx,h("span","ar","→"));nx.appendChild(b);
  }else{
    const b=h("button","lr-nextl");b.type="button";b.onclick=()=>go("mock");
    const tx=h("div");tx.append(h("small",null,"Path complete"),h("b",null,"Put it together in a mock interview"));
    b.append(tx,h("span","ar","⏱"));nx.appendChild(b);
  }

  // Aside: on this page, notes
  const tocB=h("div","lr-box");tocCount.style.cssText="float:right;text-transform:none;letter-spacing:0;font-weight:600";
  const h5=h("h5",null,"On this page");h5.appendChild(tocCount);tocB.appendChild(h5);
  const toc=h("div","lr-toc");tocB.appendChild(toc);
  const link=(text,target,dot)=>{const a=h("a");if(dot)a.appendChild(dot);a.appendChild(h("span",null,text));a.onclick=()=>target.scrollIntoView({behavior:"smooth",block:"start"});toc.appendChild(a)};
  link("Learn",learnH);
  if(prH){toc.appendChild(h("div","sub","Practice"));parts.forEach(p=>{const d=h("span","dot");dots[p.id]=d;link(p.type==="quiz"?(p.q.length>40?p.q.slice(0,38).trim()+"…":p.q):p.title,document.getElementById("lr-p-"+p.id),d)})}
  link("Next up",nxH);aside.appendChild(tocB);
  const noteB=h("div","lr-box lr-note");noteB.appendChild(h("h5",null,"Your notes"));
  const ta=h("textarea"),ns=h("div","s");ta.placeholder="Trade-offs in your own words, numbers to remember…";ta.value=gp(key).note||"";
  let nt=0;ta.oninput=()=>{ns.textContent="…";clearTimeout(nt);nt=setTimeout(()=>{const r=rec();if(ta.value.trim())r.note=ta.value;else delete r.note;save();ns.textContent="Saved"},400)};
  noteB.append(ta,ns);aside.appendChild(noteB);
  onPartChange();
  scrollTo(0,0);
}

function viewProblems(v){
  add(v,h("h2",null,"Problems"),h("p","sub","Classic system design questions. Click a row for requirements, related topics, an AI walkthrough and mock interviews."));
  const bar=h("div","controls"),q=h("input"),df=h("select"),st=h("select");
  q.type="search";q.placeholder="Search problems or topics…";q.style.flex="1 1 200px";
  [["","All difficulties"],["E","Easy"],["M","Medium"],["H","Hard"]].forEach(([a,b])=>df.appendChild(new Option(b,a)));
  [["","All"],["todo","Not done"],["done","Done"],["due","Due for review"]].forEach(([a,b])=>st.appendChild(new Option(b,a)));
  add(bar,q,df,st);v.appendChild(bar);
  const tbl=h("table"),body=h("tbody");
  const hd=h("thead");hd.innerHTML="<tr><th>Done</th><th>Problem</th><th>Diff</th><th>Concepts</th></tr>";
  add(tbl,hd,body);const wrap=h("div");wrap.style.overflowX="auto";wrap.style.marginTop="10px";add(wrap,tbl);v.appendChild(wrap);
  const paint=()=>{
    body.textContent="";const s=q.value.trim().toLowerCase();
    SD.problems.filter(p=>{
      const g=gp(kp(p.id));
      if(df.value&&p.diff!==df.value)return false;
      if(st.value==="todo"&&g.done)return false;
      if(st.value==="done"&&!g.done)return false;
      if(st.value==="due"&&!isDue(g))return false;
      return !s||(p.name+" "+p.blurb+" "+p.topics.map(t=>T[t].name).join(" ")).toLowerCase().includes(s);
    }).forEach(p=>{
      const tr=h("tr","clk"+(isDone(kp(p.id))?" done":"")),c1=h("td"),cb=h("input");
      cb.type="checkbox";cb.checked=isDone(kp(p.id));
      cb.onclick=e=>e.stopPropagation();
      cb.onchange=()=>{const q2={...gp(kp(p.id))};q2.done=cb.checked;if(q2.done){if(!q2.times)q2.times=1;q2.last=today()}setp(kp(p.id),q2);paint()};
      c1.appendChild(cb);
      const c2=h("td"),c3=h("td"),c4=h("td","topics");
      add(c2,h("b",null,p.name),h("div","meta",p.blurb));c3.appendChild(diffSpan(p.diff));c4.textContent=p.topics.map(t=>T[t].name).join(", ");
      add(tr,c1,c2,c3,c4);tr.onclick=()=>go("problem/"+p.id);body.appendChild(tr);
    });
    if(!body.firstChild){const tr=h("tr"),td=h("td","meta","No matching problems.");td.colSpan=4;tr.appendChild(td);body.appendChild(tr)}
  };
  [q,df,st].forEach(x=>x.oninput=paint);paint();
}

function viewProblem(v,id){
  const p=P[id];if(!p){go("problems");return}
  setLast("problem",id);
  add(v,backBtn("All problems","problems"),h("h2",null,p.name));
  const m=h("div","meta");m.appendChild(diffSpan(p.diff));v.appendChild(m);
  v.appendChild(h("p",null,p.blurb));
  const pb=h("div","pb"),w=h("button",null,"Open AI walkthrough"),mk=h("button",null,"Start a mock interview");
  const wbb=h("button",null,wb.has(id)?"Open whiteboard (saved)":"Open whiteboard");
  w.onclick=()=>openWalk(id);mk.onclick=()=>go("mock/"+id);wbb.onclick=()=>wb.open(id,p.name+" — whiteboard",{onClose:()=>sdRoute()});
  const ch=h("button",null,"Cheat sheet");ch.onclick=()=>go("cheat/"+id);
  add(pb,ch,wbb,w,mk);v.appendChild(pb);
  if(wb.has(id)){const pv=h("div");pv.innerHTML=wb.preview(id);pv.style.cursor="pointer";pv.title="Open whiteboard";pv.onclick=()=>wbb.click();v.appendChild(pv)}
  v.appendChild(controls(kp(id)));
  sect(v,"What to nail",p.reqs);
  v.appendChild(h("h3",null,"Building blocks involved"));
  p.topics.forEach(t=>v.appendChild(chip(T[t].name,"topic/"+t,isDone(kt(t)))));
}

// ---- cheat sheet: static, hand-written walkthrough per problem (data in sysdesign_cheats*.js) ----
const CHEATS=window.SD_CHEATS||{};
function viewCheat(v,id){
  const p=P[id],c=CHEATS[id];if(!p){go("problems");return}
  add(v,backBtn(p.name,"problem/"+id));
  const hero=h("div","hero");
  add(hero,h("div","eyebrow","Cheat sheet · "+DIFF[p.diff]),h("h2",null,p.name),h("p","sub","A full walkthrough to follow when you are stuck. Work through it top to bottom, or jump to the part you need. The numbers are examples: say your own assumptions out loud and adjust."));
  v.appendChild(hero);
  if(!c){v.appendChild(h("p","warn","No cheat sheet for this problem yet."));return}
  const lost=h("div","card raised");
  add(lost,h("h3",null,"If you are completely lost, say this"),h("p",null,c.say),
    h("p","meta","Then: ask 3-4 clarifying questions, state assumptions, estimate, sketch one write and one read, and go deep on the one or two hard parts. Any order works; the sections below follow it."));
  v.appendChild(lost);
  const secs=[];
  const sec=(key,title,build)=>{
    const d=h("details");d.open=true;d.id="cs-"+key;
    const sm=h("summary",null,title);sm.style.cssText="cursor:pointer;font-weight:600;font-size:16px;margin:18px 0 6px";
    d.appendChild(sm);build(d);secs.push([key,title,d]);
  };
  const list=(d,items)=>{if(items&&items.length)d.appendChild(ul(items))};
  const sub=(d,t)=>d.appendChild(h("h4",null,t));
  sec("clarify","1. Clarify requirements",d=>{
    sub(d,"Questions to ask");list(d,c.clarify);
    sub(d,"Functional requirements to propose");list(d,c.fr);
    sub(d,"Non-functional requirements (with numbers)");list(d,c.nfr);
  });
  sec("estimate","2. Back-of-envelope estimates",d=>{list(d,c.est);d.appendChild(h("p","meta","Rules of thumb: 1 day is about 100k seconds, peak is 2-3x average, round aggressively. Finish each estimate by saying what it implies for the design."))});
  sec("api","3. API",d=>list(d,c.api));
  sec("data","4. Data model and storage",d=>list(d,c.data));
  sec("hld","5. High-level design",d=>{
    const dg=window.SD_GRAPHS&&SD_GRAPHS[id]&&window.sdDiagram(SD_GRAPHS[id]);
    if(dg)d.appendChild(dg);else if(c.flow)d.appendChild(h("pre",null,c.flow));
    sub(d,"Walk one write through it");const ow=h("ol");c.write.forEach(x=>ow.appendChild(h("li",null,x)));d.appendChild(ow);
    sub(d,"Walk one read through it");const or=h("ol");c.read.forEach(x=>or.appendChild(h("li",null,x)));d.appendChild(or);
  });
  sec("deep","6. Deep dives",d=>{
    d.appendChild(h("p","meta","Pick the two or three that matter most for this problem. For each: name the problem, compare options, commit to one, say why."));
    c.deep.forEach(x=>{
      const k=h("div","card");
      add(k,h("h4",null,x.t),h("p",null,x.p),h("div","meta","Options"),ul(x.opts));
      const pk=h("p",null);pk.appendChild(h("b",null,"Pick: "));pk.appendChild(document.createTextNode(x.pick));k.appendChild(pk);
      d.appendChild(k);
    });
  });
  sec("trade","7. Trade-offs to say out loud",d=>list(d,c.trade));
  sec("fail","8. Failure modes and bottlenecks",d=>list(d,c.fail));
  sec("follow","9. Likely follow-up questions",d=>{
    c.follow.forEach(x=>{
      const i=x.indexOf(" -> "),k=h("details","card"),sm=h("summary",null,i<0?x:x.slice(0,i));
      add(k,sm,h("p",null,i<0?"":x.slice(i+4)));d.appendChild(k);
    });
  });
  sec("traps","10. Common mistakes",d=>list(d,c.traps));
  const nav=h("div","pb");nav.style.flexWrap="wrap";
  secs.forEach(([k,t,d])=>{const b=h("button","chip",t.replace(/^\d+\.\s*/,""));b.onclick=()=>{d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})};nav.appendChild(b)});
  v.appendChild(nav);
  secs.forEach(([,,d])=>v.appendChild(d));
  v.appendChild(h("h3",null,"Building blocks involved"));
  p.topics.forEach(t=>v.appendChild(chip(T[t].name,"topic/"+t,isDone(kt(t)))));
  const row=h("div","pb"),mk=h("button",null,"Start a mock interview"),wk=h("button",null,"Open AI walkthrough");
  mk.onclick=()=>go("mock/"+id);wk.onclick=()=>openWalk(id);add(row,mk,wk);v.appendChild(row);
}

// ---- mock interview ----
const saveActive=()=>wr(AKEY,active);
function startMock(id,mins){
  active={id,mins,start:Date.now(),end:null,scratch:"",msgs:[]};saveActive();go("mock");
}
function stepBounds(mins){
  const total=SD.framework.reduce((a,s)=>a+s.mins,0);let acc=0;
  return SD.framework.map(s=>{const from=acc;acc+=s.mins/total*mins*60;return {s,from,to:acc}});
}
function viewMock(v,pre){
  if(active&&active.end)return viewScore(v);
  if(active)return viewRunning(v);
  const hero=h("div","hero");
  add(hero,h("div","eyebrow","System design"),h("h2",null,"Mock interview"),h("p","sub","Pick a problem, start the clock, and think out loud in the scratchpad. An AI interviewer answers clarifying questions and probes your choices. The framework stages are a guide, not a checklist: skip or reorder them as you like. Score yourself against the framework at the end."));
  v.appendChild(hero);
  const c=h("div","card raised"),sel=h("select");
  SD.problems.forEach(p=>sel.appendChild(new Option(`${p.name} (${DIFF[p.diff]})`,p.id)));
  if(pre&&P[pre])sel.value=pre;
  const dur=h("select");[30,45,60].forEach(m=>dur.appendChild(new Option(m+" minutes",m)));dur.value=45;
  const rnd=h("button",null,"Random"),go1=h("button",null,"Start interview");
  go1.style.background="var(--accent)";go1.style.color="#fff";
  rnd.onclick=()=>{sel.value=SD.problems[Math.floor(Math.random()*SD.problems.length)].id};
  go1.onclick=()=>startMock(sel.value,+dur.value);
  const r=h("div","pb");add(r,sel,rnd,dur,go1);add(c,r);v.appendChild(c);
  // estimation drill
  v.appendChild(h("h3",null,"Estimation drill"));
  const dc=h("div","card"),q=h("div"),ans=h("div","ins"),nb=h("button",null,"Next question"),rb=h("button",null,"Show answer");
  const mine=h("textarea"),fb=h("div","dfb"),ev=h("button",null,"AI evaluate my answer");
  const modeSel=h("select");modeSel.appendChild(new Option("Selected problem","problem"));modeSel.appendChild(new Option("Random drills","random"));
  mine.rows=4;mine.placeholder="Type or dictate your estimate: assumptions, arithmetic, conclusion…";ev.type="button";
  const vi=voiceInput(mine);
  let di=Math.floor(Math.random()*SD.drills.length),gen=0;
  const refs={};
  // Problem mode: question is built from the selected problem; the reference is the cached walkthrough's estimation section.
  const cur=()=>{
    if(modeSel.value==="random")return {q:SD.drills[di].q,a:SD.drills[di].a};
    const p=P[sel.value];
    return {id:p.id,q:`Do a back-of-envelope estimate for "${p.name}": ${p.blurb} State your assumptions, then estimate average and peak QPS, storage per year, and bandwidth, and say what the numbers imply for the design.`};
  };
  const getRef=async c=>{
    if(c.a)return c.a;
    if(!refs[c.id]){
      const res=await apiFetch("/api/sd/walkthrough?id="+encodeURIComponent(c.id)),d=await res.json();
      if(!res.ok)throw new Error(d.error||"Request failed");
      refs[c.id]=d.walkthrough.estimation.join("\n");
    }
    return refs[c.id];
  };
  const showQ=()=>{gen++;vi.stop();q.textContent=cur().q;ans.textContent="";ans.hidden=true;mine.value="";fb.textContent="";fb.hidden=true;ev.disabled=false;nb.hidden=modeSel.value!=="random"};
  rb.onclick=async()=>{
    const c=cur(),my=gen;
    if(!c.a&&!refs[c.id]){ans.hidden=false;ans.textContent="Generating reference answer… this can take up to a minute the first time."}
    try{const a=await getRef(c);if(my===gen){ans.textContent=a;ans.hidden=false}}
    catch(err){if(my===gen){ans.hidden=false;ans.textContent=err instanceof TypeError?NO_SERVER:err.message}}
  };
  nb.onclick=()=>{di=(di+1)%SD.drills.length;showQ()};
  modeSel.onchange=showQ;sel.addEventListener("change",()=>{if(modeSel.value==="problem")showQ()});
  ev.onclick=async()=>{
    const text=mine.value.trim();if(!text||ev.disabled)return;
    vi.stop();const my=++gen;ev.disabled=true;
    fb.hidden=false;fb.className="dfb busy";fb.textContent="Evaluating…";
    let out="";
    try{
      const c=cur(),reference=await getRef(c);
      if(my!==gen)return;
      const res=await apiFetch("/api/sd/drill",{method:"POST",body:JSON.stringify({question:c.q,reference,answer:text})});
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
          if(e.t&&my===gen){out+=e.t;fb.className="dfb";fb.textContent=out}
        }
      }
      if(my===gen&&!out){fb.className="dfb";fb.textContent="(no feedback)"}
    }catch(err){
      if(my!==gen)return;
      fb.className="dfb warn";fb.textContent=err instanceof TypeError?NO_SERVER:err.message;
    }
    if(my===gen)ev.disabled=false;
  };
  const dt=h("div","pb");add(dt,vi.mic,ev,vi.note);
  const dr=h("div","pb");add(dr,modeSel,rb,nb);add(dc,q,mine,dt,fb,dr,ans);v.appendChild(dc);showQ();
  // history
  v.appendChild(h("h3",null,"Attempts"));
  if(!mocks.length)v.appendChild(h("p","sub","No mock interviews yet."));
  mocks.slice().reverse().forEach(m=>{
    const p=P[m.id],d=h("details","card"),scores=Object.values(m.scores||{}),avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):"–";
    const sm=h("summary",null,`${new Date(m.ts).toLocaleDateString()} · ${p?p.name:m.id} · ${fmt(m.secs)} · self avg ${avg}/5 `);
    if(m.grade)sm.appendChild(verdictPill(m.grade));
    d.appendChild(sm);
    if(m.grade)d.appendChild(gradeCard(m.grade));
    d.appendChild(h("h4",null,"Self-assessment"));
    SD.framework.forEach(s=>d.appendChild(h("div","meta",`${s.name}: ${(m.scores||{})[s.id]??"–"}/5`)));
    if(m.notes)d.appendChild(h("p",null,"Reflection: "+m.notes));
    if(m.scratch){d.appendChild(h("h4",null,"Scratchpad"));d.appendChild(h("pre",null,m.scratch))}
    const del=h("button",null,"Delete attempt");
    del.onclick=()=>{if(confirm("Delete this attempt?")){mocks=mocks.filter(x=>x!==m);wr(MKEY,mocks);sdRoute()}};
    d.appendChild(h("div","pb")).appendChild(del);
    v.appendChild(d);
  });
}

function viewRunning(v){
  const p=P[active.id];
  const hero=h("div","hero");
  add(hero,h("div","eyebrow","Mock interview"),h("h2",null,p.name),h("p","sub",p.blurb));
  v.appendChild(hero);
  const tm=h("div","timer"),bar=h("div","pb toolbar");
  const fin=h("button",null,"Finish and grade"),ab=h("button",null,"Abandon"),wbb=h("button",null,"Open whiteboard");
  wbb.onclick=()=>wb.open(active.id,p.name+" — whiteboard",{notes:()=>active.scratch||"",timer:()=>fmt((Date.now()-active.start)/1000)+" / "+active.mins+":00",onClose:()=>sdRoute()});
  fin.onclick=()=>{active.end=Date.now();saveActive();sdRoute()};
  ab.onclick=()=>{if(confirm("Abandon this interview?")){active=null;wr(AKEY,null);sdRoute()}};
  add(bar,tm,wbb,fin,ab);v.appendChild(bar);
  const cols=h("div","cols"),left=h("div","stack"),right=h("div","panel chatpanel");
  const bounds=stepBounds(active.mins),lis=[];
  const pace=h("div","panel");
  pace.appendChild(h("h3",null,"Framework pacing"));
  const gl=h("ol","steps");bounds.forEach(b=>{const r=h("li","step");add(r,h("span","sn",b.s.name),h("span","st",`${fmt(b.from)}–${fmt(b.to)}`));lis.push(r);gl.appendChild(r)});pace.appendChild(gl);left.appendChild(pace);
  const pad=h("div","panel");left.appendChild(pad);
  pad.appendChild(h("h3",null,"Scratchpad"));
  const ta=h("textarea");ta.rows=16;ta.placeholder="Requirements, estimates, API, data model, diagram, trade-offs…";ta.value=active.scratch||"";
  ta.oninput=()=>{active.scratch=ta.value;saveActive()};pad.appendChild(ta);
  right.appendChild(h("h3",null,"Interviewer"));
  if(!active.msgs.length)right.appendChild(h("div","meta","Ask clarifying questions, or just start designing. The stages are a guide, so skip or reorder anything. Say \"I'm done\" for feedback."));
  right.appendChild(chatBox(active.id,"interviewer",active.msgs,"Talk to the interviewer…",saveActive));
  add(cols,left,right);v.appendChild(cols);
  const tick=()=>{
    const el2=(Date.now()-active.start)/1000;
    tm.textContent=fmt(el2)+" / "+active.mins+":00";tm.classList.toggle("over",el2>active.mins*60);
    lis.forEach((r,i)=>{r.classList.toggle("cur",el2>=bounds[i].from&&(el2<bounds[i].to||i===lis.length-1));r.classList.toggle("past",el2>=bounds[i].to&&i<lis.length-1)});
  };
  tick();timer=setInterval(tick,1000);
}
// ---- AI pass/fail grade ----
const verdictPill=g=>{const s=h("span","pill",g.verdict==="pass"?"PASS":"FAIL");s.style.background=`var(--${g.verdict==="pass"?"easy":"hard"})`;s.style.color="#fff";return s};
function gradeCard(g){
  const c=h("div","card"),top=h("div","pb");
  add(top,verdictPill(g),h("b",null,"AI grade"));add(c,top,h("p",null,g.summary));
  const name=Object.fromEntries(SD.framework.map(s=>[s.id,s.name]));
  g.steps.forEach(s=>add(c,h("div","meta",`${name[s.step]||s.step}: ${s.score}/5 · ${s.evidence}`)));
  sect(c,"Strengths",g.strengths);sect(c,g.verdict==="pass"?"Risks":"Why it did not pass",g.blockers);sect(c,"Practise next",g.next_steps);
  return c;
}
function gradeBox(secs){
  const box=h("div");
  const paint=()=>{
    box.textContent="";
    if(active.grade){box.appendChild(gradeCard(active.grade));const again=h("button",null,"Grade again");again.onclick=run;box.appendChild(h("div","pb")).appendChild(again)}
  };
  async function run(){
    const a=active;box.textContent="";box.appendChild(h("p","busy","Grading your interview… this can take up to a minute."));
    try{
      const res=await apiFetch("/api/sd/grade",{method:"POST",body:JSON.stringify({id:a.id,messages:a.msgs,scratch:a.scratch||"",board:wb.board(a.id),secs:Math.round(secs),mins:a.mins})});
      const d=await res.json();if(!res.ok)throw new Error(d.error||"Grading failed");
      a.grade=d.grade;if(active!==a)return;  // saved or discarded while grading
      saveActive();paint();
    }catch(err){
      if(active!==a)return;
      box.textContent="";box.appendChild(h("p","warn",err instanceof TypeError?NO_SERVER:err.message));
      const retry=h("button",null,"Try again");retry.onclick=run;box.appendChild(h("div","pb")).appendChild(retry);
    }
  }
  if(active.grade)paint();else run();  // grade once on arrival; reloading the page reuses the saved grade
  return box;
}

function viewScore(v){
  const p=P[active.id],secs=(active.end-active.start)/1000;
  v.appendChild(gradeBox(secs));
  add(v,h("h2",null,"Self-assessment: "+p.name),h("p","sub",`Time used: ${fmt(secs)} of ${active.mins}:00. Rate how well you did each step (1 = missed it, 5 = nailed it).`));
  const scores={};
  SD.framework.forEach(s=>{
    scores[s.id]=3;
    const r=h("div","mrow"),lab=h("label",null,s.name),inp=h("input"),val=h("span",null,"3");
    inp.type="range";inp.min=1;inp.max=5;inp.value=3;inp.oninput=()=>{scores[s.id]=+inp.value;val.textContent=inp.value};
    add(r,lab,inp,val);v.appendChild(r);
  });
  v.appendChild(h("h3",null,"What you should have covered"));v.appendChild(ul(p.reqs));
  v.appendChild(h("h3",null,"Reflection"));
  const ta=h("textarea");ta.rows=4;ta.placeholder="What went well? What will you do differently?";v.appendChild(ta);
  const lab=h("label"),cb=h("input");cb.type="checkbox";cb.checked=true;add(lab,cb,document.createTextNode(" Mark this problem as practiced"));
  const row=h("div","pb"),save=h("button",null,"Save attempt"),wk=h("button",null,"Open walkthrough to compare");
  save.style.background="var(--accent)";save.style.color="#fff";
  save.onclick=()=>{
    mocks.push({id:active.id,ts:active.start,secs:Math.round(secs),scores,notes:ta.value.trim(),scratch:active.scratch||"",grade:active.grade||null});wr(MKEY,mocks);
    if(cb.checked){const q={...gp(kp(active.id))};q.times++;q.done=true;q.last=today();setp(kp(active.id),q)}
    active=null;wr(AKEY,null);go("mock");sdRoute();
  };
  wk.onclick=()=>openWalk(active.id);
  const dis=h("button",null,"Discard interview");
  dis.onclick=()=>{if(confirm("Discard this interview without saving?")){active=null;wr(AKEY,null);go("mock");sdRoute()}};
  add(row,lab,save,wk,dis);v.appendChild(row);
}


// ---- quiz: typed-recall flashcards (cards in sysdesign_cards.js, Leitner boxes in sysdesign-cards-v1) ----
const CARDS=typeof SD_CARDS==="undefined"?[]:SD_CARDS;
const BOX_DAYS=[0,1,3,7,21,60];  // days until a card is due again, by box (box 0 = new or just missed)
const addDays=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
const cardDue=c=>{const s=cards[c.id];return !s||s.due<=today()};
const normAns=s=>String(s).toLowerCase().replace(/[^a-z0-9+% ]+/g," ").split(/\s+/).filter(w=>w&&!["a","an","the"].includes(w)).join(" ");
function editDist(a,b){
  const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[a.length][b.length];
}
// "ok" exact match, "typo" within a character or two on a longer answer, "" no match
function matchAns(c,text){
  const t=normAns(text);if(!t)return "";
  let typo=false;
  for(const a of c.a.map(normAns)){
    if(t===a)return "ok";
    const lim=a.length>=10?2:a.length>=5?1:0;
    if(lim&&editDist(t,a)<=lim)typo=true;
  }
  return typo?"typo":"";
}
function grade(c,right){
  const s=cards[c.id]||{box:0,seen:0,right:0};
  s.seen++;if(right){s.right++;s.box=Math.min(s.box+1,BOX_DAYS.length-1)}else s.box=0;
  s.due=addDays(BOX_DAYS[s.box]);cards[c.id]=s;wr(CKEY,cards);
}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

function viewQuiz(v){
  const hero=h("div","hero");
  add(hero,h("div","eyebrow","System design"),h("h2",null,"Quiz"),h("p","sub","Flashcards you answer by typing. See a definition or scenario, recall the term, check it. Cards you miss come back sooner; cards you know space out over weeks."));
  v.appendChild(hero);
  if(!CARDS.length){v.appendChild(h("p","warn","No cards loaded."));return}
  const stats=h("div","meta"),bar=h("div","pb"),body=h("div");
  const topicSel=h("select");topicSel.appendChild(new Option("All topics","all"));
  [...new Set(CARDS.map(c=>c.topic))].forEach(id=>{if(T[id])topicSel.appendChild(new Option(T[id].name.split(":")[0],id))});
  const start=h("button",null,"Start");start.style.background="var(--accent)";start.style.color="#fff";
  add(bar,topicSel,start);add(v,bar,stats,body);
  const pool=()=>CARDS.filter(c=>topicSel.value==="all"||c.topic===topicSel.value);
  const paintStats=()=>{
    const p=pool(),due=p.filter(cardDue).length,fresh=p.filter(c=>!cards[c.id]).length,known=p.filter(c=>(cards[c.id]||{}).box>=3).length;
    stats.textContent=`${p.length} cards · ${due} due now (${fresh} new) · ${known} well known`;
    start.textContent=due?`Start (${due})`:"Nothing due";start.disabled=!due;
  };
  const home=()=>{body.textContent="";paintStats()};
  topicSel.onchange=home;
  start.onclick=()=>run(shuffle(pool().filter(cardDue)));

  function run(queue){
    const total=queue.length;let done=0,right=0;const retried=new Set(),missed=[];
    const next=()=>{
      body.textContent="";
      if(!queue.length){
        const c=h("div","card");
        add(c,h("h3",null,"Session complete"),h("p",null,`${right} of ${total} right first time.`));
        if(missed.length){c.appendChild(h("p","meta","To review:"));c.appendChild(ul(missed.map(m=>m.a[0]+" — "+m.q)))}
        const again=h("button",null,"Back to quiz");again.onclick=home;c.appendChild(again);
        body.appendChild(c);paintStats();return;
      }
      const c=queue.shift(),card=h("div","card");
      const t=T[c.topic];
      add(card,h("div","meta",`Card ${Math.min(done+1,total)} of ${total}${t?" · "+t.name.split(":")[0]:""}`),h("h3",null,c.q));
      const inp=h("input");inp.type="text";inp.placeholder="Type your answer…";inp.autocomplete="off";inp.spellcheck=false;
      const form=h("form","pb"),go1=h("button",null,"Check"),idk=h("button",null,"I don't know");
      go1.type="submit";idk.type="button";go1.style.background="var(--accent)";go1.style.color="#fff";
      add(form,inp,go1,idk);card.appendChild(form);
      const fb=h("div");card.appendChild(fb);body.appendChild(card);inp.focus();
      let graded=false;
      const reveal=(m,typed)=>{
        if(graded)return;graded=true;
        inp.disabled=go1.disabled=idk.disabled=true;
        const ok=m==="ok"||m==="typo";
        const first=!retried.has(c.id);
        if(first){grade(c,ok);if(ok)right++;else missed.push(c)}
        else if(ok){/* a re-ask after a miss doesn't change the box again */}
        done++;
        add(fb,h("p",ok?"pill ok":"warn",ok?(m==="typo"?"✓ Correct (small typo ignored)":"✓ Correct"):(typed?"✗ Not quite":"Answer")),
          h("p",null,"Answer: "+c.a[0]),h("p","meta",c.why||""));
        if(c.a.length>1&&!ok)fb.appendChild(h("p","meta","Also accepted: "+c.a.slice(1,4).join(", ")));
        const row=h("div","pb");
        if(!ok&&typed&&first){
          const mine=h("button",null,"I was right");
          mine.onclick=()=>{grade(c,true);const s=cards[c.id];s.seen--;s.right--;wr(CKEY,cards);right++;missed.splice(missed.indexOf(c),1);mine.disabled=true;mine.textContent="Counted as right ✓"};
          row.appendChild(mine);
        }
        if(t){const rd1=h("button",null,"Read the lesson");rd1.onclick=()=>go("topic/"+c.topic);row.appendChild(rd1)}
        const nx=h("button",null,queue.length?"Next →":"Finish");nx.style.background="var(--accent)";nx.style.color="#fff";nx.onclick=next;row.appendChild(nx);
        fb.appendChild(row);nx.focus();
        if(!ok&&first){retried.add(c.id);queue.push(c);total++}  // ask a missed card once more at the end of the session
      };
      form.onsubmit=ev=>{ev.preventDefault();const x=inp.value.trim();if(!x)return;reveal(matchAns(c,x),x)};
      idk.onclick=()=>reveal("",inp.value.trim());
    };
    next();
  }
  home();
}

// ---- router ----
window.sdRoute=()=>{
  const parts=location.hash.slice(1).split("/");
  if(parts[0]!=="sysdesign")return;
  if(timer){clearInterval(timer);timer=null}
  const [,tab="start",id]=parts;
  curTab=TABS.some(t=>t[0]===tab)?tab:(tab==="topic"?"topics":tab==="problem"||tab==="cheat"?"problems":"start");
  paintNav();
  const v=view();v.textContent="";
  if(tab==="topics")viewTopics(v);
  else if(tab==="topic")viewTopic(v,id);
  else if(tab==="quiz")viewQuiz(v);
  else if(tab==="problems")viewProblems(v);
  else if(tab==="problem")viewProblem(v,id);
  else if(tab==="cheat")viewCheat(v,id);
  else if(tab==="mock")viewMock(v,id);
  else viewStart(v);
};
window.sdExport=()=>({progress:prog,mocks,boards:wb.exportAll(),cards});
sdRoute();
})();

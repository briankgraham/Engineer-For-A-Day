// System Design Prep tab. Content lives in sysdesign_data.js (const SD); this file is the UI.
// Relies on globals from index.html: $, el, apiFetch, today, isDue, NO_SERVER, INTERVALS.
(()=>{
const KEY="sysdesign-progress-v1",MKEY="sysdesign-mocks-v1",AKEY="sysdesign-active-mock-v1";
const rd=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let prog=rd(KEY,{}),mocks=rd(MKEY,[]),active=rd(AKEY,null);
const T=Object.fromEntries(SD.topics.map(t=>[t.id,t])),P=Object.fromEntries(SD.problems.map(p=>[p.id,p]));
const gp=k=>prog[k]||{done:false,times:0};
const setp=(k,p)=>{if(p.done||p.times||p.note)prog[k]=p;else delete prog[k];wr(KEY,prog)};
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
      let fin="",tmp="";
      for(let i=0;i<ev.results.length;i++){(ev.results[i].isFinal?(fin+=ev.results[i][0].transcript):(tmp+=ev.results[i][0].transcript))}
      inp.value=(base?base+" ":"")+(fin+tmp).trim();
    };
    rec.onerror=ev=>{
      if(ev.error==="no-speech"||ev.error==="aborted")return;
      stop();note.textContent=ev.error==="not-allowed"||ev.error==="service-not-allowed"?"Microphone access was blocked. Allow it in the browser's site settings.":"Voice input error: "+ev.error;
    };
    // Browsers end the session after a pause; restart while the user still wants to talk.
    rec.onend=()=>{if(listening){try{rec.start()}catch(e){stop()}}};
    listening=true;mic.textContent="⏹ Stop";mic.classList.add("on");
    try{rec.start()}catch(e){stop()}
  };
  return {mic,note,stop};
}
window.voiceInput=voiceInput; // shared with aipair.js (this file is wrapped in an IIFE)

// ---- streaming chat (same SSE protocol as the LeetCode tutor) ----
function chatBox(id,mode,msgs,placeholder,onChange){
  const voice=mode==="interviewer",root=h("div","chat"),log=h("div"),form=h("form"),inp=h(voice?"textarea":"input");
  if(voice)inp.rows=3;else inp.type="text";
  inp.placeholder=placeholder;inp.autocomplete="off";
  const btn=h("button",null,"Send");btn.type="submit";
  add(form,inp,btn);add(root,log,form);
  let evalBtn=null,vi=null;
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
      const res=await apiFetch("/api/sd/chat",{method:"POST",body:JSON.stringify({id,mode,messages:msgs,evaluate})});
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
      msgs.push({role:"assistant",content:answer||"(no answer)"});
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
  if(w.architecture.diagram)add(b,h("pre",null,w.architecture.diagram));
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
const TABS=[["start","Start here"],["topics","Topics"],["problems","Problems"],["mock","Mock interview"]];
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

function viewStart(v){
  const td=SD.topics.filter(t=>isDone(kt(t.id))).length,pd=SD.problems.filter(p=>isDone(kp(p.id))).length;
  add(v,h("h2",null,"System Design Prep"),h("p","sub","A guided path from fundamentals to full designs. Everything is clickable: open a topic or problem to dive in, track it, and take notes."));
  add(v,h("div","stats",`${td}/${SD.topics.length} topics · ${pd}/${SD.problems.length} problems · ${mocks.length} mock${mocks.length===1?"":"s"}`),frac(td+pd,SD.topics.length+SD.problems.length));
  const due=dueList();
  if(due.length){const c=h("div","card");c.appendChild(h("b",null,"Due for review"));c.appendChild(h("div"));due.forEach(d=>c.lastChild.appendChild(d));v.appendChild(c)}
  const fw=h("div","card");fw.id="framework";
  const d=h("details");d.open=location.hash.endsWith("/framework");
  d.appendChild(h("summary",null,"The interview framework (about 45 minutes)"));
  SD.framework.forEach(s=>{d.appendChild(h("h3",null,s.name+" · ~"+s.mins+" min"));d.appendChild(h("div","meta",s.desc));d.appendChild(ul(s.tips))});
  fw.appendChild(d);v.appendChild(fw);
  SD.path.forEach(st=>{
    const items=st.items.filter(([k])=>k==="topic"||k==="problem");
    const n=items.filter(([k,i])=>isDone(k==="topic"?kt(i):kp(i))).length;
    v.appendChild(h("h3",null,st.name+(items.length?`  (${n}/${items.length})`:"")));
    v.appendChild(h("div","meta",st.desc));
    const row=h("div");
    st.items.forEach(([k,i])=>{
      if(k==="framework"){const c=h("button","chip","Interview framework");c.onclick=()=>{d.open=true;fw.scrollIntoView({behavior:"smooth"})};row.appendChild(c)}
      else if(k==="topic")row.appendChild(chip(T[i].name,"topic/"+i,isDone(kt(i))));
      else if(k==="problem")row.appendChild(chip(P[i].name,"problem/"+i,isDone(kp(i))));
      else row.appendChild(chip("Start a mock interview","mock",false));
    });
    v.appendChild(row);
  });
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
  add(v,backBtn("All topics","topics"),h("h2",null,t.name),h("div","meta",t.group),h("p",null,t.summary));
  v.appendChild(controls(kt(id)));
  sect(v,"When to use it",t.use);sect(v,"Trade-offs",t.tradeoffs);sect(v,"Common pitfalls",t.pitfalls);
  (t.deep||[]).forEach(([title,items])=>sect(v,title,items));
  const rel=SD.problems.filter(p=>p.topics.includes(id));
  if(rel.length){v.appendChild(h("h3",null,"Practice with these designs"));rel.forEach(p=>v.appendChild(chip(p.name,"problem/"+p.id,isDone(kp(p.id)))))}
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
  add(v,backBtn("All problems","problems"),h("h2",null,p.name));
  const m=h("div","meta");m.appendChild(diffSpan(p.diff));v.appendChild(m);
  v.appendChild(h("p",null,p.blurb));
  const pb=h("div","pb"),w=h("button",null,"Open AI walkthrough"),mk=h("button",null,"Start a mock interview");
  const wbb=h("button",null,wb.has(id)?"Open whiteboard (saved)":"Open whiteboard");
  w.onclick=()=>openWalk(id);mk.onclick=()=>go("mock/"+id);wbb.onclick=()=>wb.open(id,p.name+" — whiteboard",{onClose:()=>sdRoute()});
  add(pb,wbb,w,mk);v.appendChild(pb);
  if(wb.has(id)){const pv=h("div");pv.innerHTML=wb.preview(id);pv.style.cursor="pointer";pv.title="Open whiteboard";pv.onclick=()=>wbb.click();v.appendChild(pv)}
  v.appendChild(controls(kp(id)));
  sect(v,"What to nail",p.reqs);
  v.appendChild(h("h3",null,"Building blocks involved"));
  p.topics.forEach(t=>v.appendChild(chip(T[t].name,"topic/"+t,isDone(kt(t)))));
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
  add(hero,h("div","eyebrow","System design"),h("h2",null,"Mock interview"),h("p","sub","Pick a problem, start the clock, and think out loud in the scratchpad. An AI interviewer answers clarifying questions and probes your choices. Score yourself against the framework at the end."));
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
  if(!active.msgs.length)right.appendChild(h("div","meta","Ask clarifying questions about requirements and scale. Say \"I'm done\" for feedback."));
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

// ---- router ----
window.sdRoute=()=>{
  const parts=location.hash.slice(1).split("/");
  if(parts[0]!=="sysdesign")return;
  if(timer){clearInterval(timer);timer=null}
  const [,tab="start",id]=parts;
  curTab=TABS.some(t=>t[0]===tab)?tab:(tab==="topic"?"topics":tab==="problem"?"problems":"start");
  paintNav();
  const v=view();v.textContent="";
  if(tab==="topics")viewTopics(v);
  else if(tab==="topic")viewTopic(v,id);
  else if(tab==="problems")viewProblems(v);
  else if(tab==="problem")viewProblem(v,id);
  else if(tab==="mock")viewMock(v,id);
  else viewStart(v);
};
window.sdExport=()=>({progress:prog,mocks,boards:wb.exportAll()});
sdRoute();
})();

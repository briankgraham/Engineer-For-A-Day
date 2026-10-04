// Assessment tab: a timed, multi-problem test in the style of an online assessment (OA).
// Depends on globals from index.html: $, el, DATA, COMP, SENIOR, DN, apiFetch, errMsg, loadCM, makeEditor, formatCode, runTests, darkMode.
(function(){
  const SKEY="assess-session-v1",HKEY="assess-history-v1";
  const VISIBLE=2; // the first tests are shown in full (like sample cases); the rest are hidden and only reported as pass/fail
  const PRESETS=[
    {id:"quick",label:"Quick: 1 Medium",diffs:["M"],min:30},
    {id:"std",label:"Standard: Easy, Medium, Medium",diffs:["E","M","M"],min:60},
    {id:"tough",label:"Tough: Medium, Medium, Hard",diffs:["M","M","H"],min:90},
  ];

  const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const fmt=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600);return (h?h+":":"")+String(Math.floor(s%3600/60)).padStart(h?2:1,"0")+":"+String(s%60).padStart(2,"0")};
  const btn=(text,fn,cls)=>{const b=el("button",cls||null,text);b.onclick=fn;return b};
  const root=()=>$("tab-assess");

  const css=`
.as{max-width:1400px;margin:0 auto;padding:16px}
.as h2{margin:0 0 4px;font-size:20px}.as .sub{color:var(--muted);margin:0 0 14px}
.as-form{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;box-shadow:var(--shadow-sm);display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end;margin-bottom:12px}
.as-form input,.as-form select{flex:none;width:100%;box-sizing:border-box}
.as-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
.as-form label.chk{flex-direction:row;align-items:center;gap:6px;font-size:13px;color:var(--fg)}.as-form label.chk input{width:auto}
.as-form .go{grid-column:1/-1;display:flex;gap:10px;align-items:center}
.as .warn{color:var(--hard)}
.as h3{margin:18px 0 8px;font-size:15px}
.as-hist{display:flex;flex-direction:column;gap:6px}
.as-hist .h{display:flex;gap:12px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 12px}
.as-hist .h b{min-width:52px}.as-hist .h span{color:var(--muted)}
.as-prep{display:flex;flex-direction:column;gap:6px;margin:12px 0}
.as-prep .r{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 12px}
.as-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.as-top .tabsp{display:flex;gap:4px;flex:1;flex-wrap:wrap}
.as-top .tabsp button.on{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
.as-timer{font-variant-numeric:tabular-nums;font-size:18px;font-weight:600}.as-timer.low{color:var(--hard)}
.as-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:16px;align-items:start}
@media(max-width:900px){.as-grid{grid-template-columns:minmax(0,1fr)}}
.as-stmt{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px}
.as-stmt h3{margin:0 0 8px}.as-stmt .body{white-space:pre-wrap;line-height:1.5}.as-stmt .note{color:var(--muted);font-size:13px;margin-top:8px}
.as-ed .CodeMirror{height:380px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:13px}
.as-bar{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}.as-bar .st{color:var(--muted);font-size:13px}
.as-res .sum{font-weight:600;margin-bottom:6px}.as-res .sum.ok{color:var(--easy)}
.as-res .row{padding:4px 0;border-bottom:1px solid var(--line)}.as-res .row.ok::before{content:"✓ ";color:var(--easy)}.as-res .row.no::before{content:"✗ ";color:var(--hard)}
.as-res pre{background:var(--head);border:1px solid var(--line);border-radius:6px;padding:8px 10px;margin:4px 0 0;overflow-x:auto;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap}
.as-res .hid{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.as-res .hid span{font-size:12px;padding:1px 8px;border-radius:99px;border:1px solid var(--line)}
.as-res .hid .ok{color:var(--easy)}.as-res .hid .no{color:var(--hard)}
.as-score{font-size:34px;font-weight:700;margin:4px 0}
.as-final .p{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin-bottom:10px;display:flex;flex-direction:column;gap:6px}
.as-final .p .hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.as-final .p .hd b{flex:1;min-width:160px}
.as-final .p .fu{color:var(--muted);font-size:13px}.as-final .p .fu b{color:var(--fg);font-weight:600}
`;

  let ready=false,S=null,ed=null,tick=0,cur=0,running=false,finishing=false;
  const exs={},last={};

  const norm=s=>String(s).trim().toLowerCase();
  const companyNames=()=>{const s=new Set();Object.values(COMP).forEach(l=>l.forEach(c=>s.add(c[0])));return [...s].sort()};

  // Frequency-weighted random pick among problems of one difficulty (optionally asked by one company, optionally Senior Favs only).
  function pickOne(diff,company,used,senior){
    const w=r=>{const c=company&&(COMP[r[6]]||[]).find(x=>norm(x[0])===norm(company));return Math.max(1,company?c[1]:r[5])};
    const cands=DATA.filter(r=>r[1]===diff&&!used.has(r[6])&&(!senior||SENIOR[r[6]])&&(!company||(COMP[r[6]]||[]).some(x=>norm(x[0])===norm(company))));
    if(!cands.length)return null;
    let t=cands.reduce((a,r)=>a+w(r),0)*Math.random();
    for(const r of cands){t-=w(r);if(t<=0)return r}
    return cands[cands.length-1];
  }
  const asProblem=r=>({slug:r[6],title:r[2],diff:r[1]});

  // ---------- setup screen ----------
  function showSetup(){
    clearInterval(tick);S=null;finishing=false;
    const r=root();r.textContent="";
    const wrap=el("div","as");r.appendChild(wrap);
    wrap.appendChild(el("h2","","Assessment"));
    wrap.appendChild(el("p","sub","A timed online-assessment simulation. You get several problems and one countdown. Run checks the sample tests; only Submit or Finish reveal how many hidden tests pass. Nothing is graded until the end."));
    const form=el("div","as-form");wrap.appendChild(form);
    const lab=(t,c)=>{const l=el("label");l.appendChild(el("span",null,t));l.appendChild(c);form.appendChild(l);return c};
    const preset=lab("Format",document.createElement("select"));
    PRESETS.forEach(p=>{const o=el("option",null,p.label);o.value=p.id;preset.appendChild(o)});
    preset.value="std";
    const mins=lab("Time limit (minutes)",document.createElement("input"));mins.type="number";mins.min=5;mins.max=240;mins.value=60;
    const co=lab("Company (optional)",document.createElement("input"));co.type="search";co.setAttribute("list","as-colist");co.placeholder="Any company";co.autocomplete="off";
    const sl=el("label","chk");const sen=document.createElement("input");sen.type="checkbox";sl.appendChild(sen);sl.appendChild(document.createTextNode(" Senior favs only"));
    sl.title="Draw only from problems that come up a lot in senior loops. The results show the follow-up a senior interviewer usually asks next.";form.appendChild(sl);
    const dl=el("datalist");dl.id="as-colist";dl.hidden=true;companyNames().forEach(n=>{const o=document.createElement("option");o.value=n;dl.appendChild(o)});wrap.appendChild(dl);
    preset.onchange=()=>{mins.value=PRESETS.find(p=>p.id===preset.value).min};
    const go=el("div","go");form.appendChild(go);
    const msg=el("span","warn");
    go.appendChild(btn("Start assessment",()=>{
      const p=PRESETS.find(x=>x.id===preset.value),m=Math.round(+mins.value);
      if(!(m>=5&&m<=240)){msg.textContent="Time limit must be 5 to 240 minutes.";return}
      const company=co.value.trim();
      if(company&&!companyNames().some(n=>norm(n)===norm(company))){msg.textContent="Unknown company. Pick one from the list or leave it blank.";return}
      const senior=sen.checked,used=new Set(),rows=[];
      for(const d of p.diffs){const x=pickOne(d,company,used,senior);if(!x){msg.textContent=`Not enough ${DN[d]} ${senior?"Senior Favs ":""}problems${company?" for "+company:""}. Try another format${company?" or company":""}${senior?", or untick Senior favs":""}.`;return}used.add(x[6]);rows.push(x)}
      prepare({problems:rows.map(asProblem),minutes:m,company,senior,startedAt:null,code:{},sub:{}});
    },"primary"));
    go.appendChild(msg);
    const hist=readJSON(HKEY,[]);
    if(hist.length){
      wrap.appendChild(el("h3","","Past assessments"));
      const list=el("div","as-hist");wrap.appendChild(list);
      hist.slice().reverse().forEach(h=>{
        const d=el("div","h");
        d.appendChild(el("b",null,h.score+"%"));
        if(h.senior)d.appendChild(el("span",null,"Senior favs"));
        d.appendChild(el("span",null,new Date(h.at).toLocaleString()));
        d.appendChild(el("span",null,fmt(h.used)+" of "+h.minutes+" min"));
        d.appendChild(el("span",null,h.problems.map(p=>`${p.title} ${p.passed}/${p.total}`).join(" · ")));
        list.appendChild(d);
      });
    }
  }

  // ---------- preparing: fetch (and if needed generate) each exercise ----------
  async function loadEx(slug){
    if(exs[slug])return;
    const res=await apiFetch("/api/practice?slug="+encodeURIComponent(slug));
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Request failed");
    exs[slug]=data.exercise;
  }
  async function prepare(sess){
    S=sess;
    const r=root();r.textContent="";
    const wrap=el("div","as");r.appendChild(wrap);
    wrap.appendChild(el("h2","","Preparing your assessment"));
    wrap.appendChild(el("p","sub","Exercises and hidden tests are generated the first time a problem is used, which can take up to a minute each. The clock starts when they are all ready."));
    const list=el("div","as-prep");wrap.appendChild(list);
    const used=new Set(S.problems.map(p=>p.slug));
    let failed="";
    await Promise.all(S.problems.map(async(p,i)=>{
      const row=el("div","r");list.appendChild(row);
      for(let attempt=0;attempt<4;attempt++){
        p=S.problems[i];
        row.textContent=`${DN[p.diff]}: ${p.title}: preparing…`;
        try{await loadEx(p.slug);row.textContent=`${DN[p.diff]}: ${p.title}: ready`;return}
        catch(e){
          // A brand-new assessment can swap in another problem of the same difficulty; a resumed one cannot.
          const x=S.startedAt?null:pickOne(p.diff,S.company,used,S.senior);
          if(!x){row.className="r warn";row.textContent=`${p.title}: ${errMsg(e)}`;failed=errMsg(e);return}
          used.add(x[6]);S.problems[i]=asProblem(x);
        }
      }
      row.className="r warn";row.textContent=`${p.title}: could not be prepared`;failed=failed||"Could not prepare";
    }));
    if(failed){
      wrap.appendChild(el("p","warn",failed));
      wrap.appendChild(btn("Back",showSetup));
      return;
    }
    if(!S.startedAt){S.startedAt=Date.now();save()}
    await startSession();
  }

  const save=()=>{if(S&&!S.done)writeJSON(SKEY,S)};

  // ---------- the timed session ----------
  const left=()=>S.minutes*60-(Date.now()-S.startedAt)/1000;
  async function startSession(){
    cur=0;
    const r=root();r.textContent="";
    const wrap=el("div","as");r.appendChild(wrap);
    const top=el("div","as-top");wrap.appendChild(top);
    const tabsp=el("div","tabsp");top.appendChild(tabsp);
    const timer=el("span","as-timer");top.appendChild(timer);
    const fin=btn("Finish assessment",null);top.appendChild(fin);
    const grid=el("div","as-grid");wrap.appendChild(grid);
    const stmt=el("div","as-stmt");grid.appendChild(stmt);
    const right=el("div");grid.appendChild(right);
    const edBox=el("div","as-ed");right.appendChild(edBox);
    const bar=el("div","as-bar");right.appendChild(bar);
    const res=el("div","as-res");right.appendChild(res);
    const run=btn("▶ Run (sample tests)",()=>runCur(false));
    const sub=btn("Submit",()=>runCur(true),"primary");
    const fmtBtn=btn("Format",()=>formatCode(ed));fmtBtn.title="Format your code with Prettier (Shift-Alt-F)";
    const st=el("span","st");
    bar.append(run,fmtBtn,sub,st);

    try{await loadCM()}catch(e){wrap.textContent="The editor loads from a CDN, so it needs internet. "+(e.message||"");return}
    ed=makeEditor(edBox,{run:()=>runCur(false)});
    ed.on("change",()=>{if(S&&!finishing&&!loadingDoc){S.code[S.problems[cur].slug]=ed.getValue();save()}});
    let loadingDoc=false;

    const scoreText=slug=>{const s=S.sub[slug];return s?` ${s.passed}/${s.total}`:""};
    const drawTabs=()=>{
      tabsp.replaceChildren();
      S.problems.forEach((p,i)=>{
        const b=btn(`${i+1}. ${p.title} (${DN[p.diff]})${scoreText(p.slug)}`,()=>show(i));
        if(i===cur)b.classList.add("on");tabsp.appendChild(b);
      });
    };
    const drawRes=()=>{
      res.replaceChildren();
      const slug=S.problems[cur].slug,l=last[slug];
      if(!l)return;
      const {r,tests,full}=l;
      if(r.fatal){res.appendChild(el("pre","",r.fatal));return}
      const graded=tests.filter(t=>t.expected_json!=null),vis=tests.slice(0,VISIBLE);
      const pass=t=>{const c=r.cases[tests.indexOf(t)];return c&&c.pass===true};
      const passed=graded.filter(pass).length;
      res.appendChild(el("div",passed===graded.length?"sum ok":"sum",full?`Submitted: ${passed} / ${graded.length} tests passed`:`Sample tests: ${vis.filter(pass).length} / ${vis.length} passed`));
      if(r.err)res.appendChild(el("pre","",r.err.trim()));
      if(r.timedOut)res.appendChild(el("div","warn","Stopped: exceeded the time limit for a run (infinite loop or too slow?). Later tests did not run."));
      vis.forEach((t,i)=>{
        const c=r.cases[i],d=el("div",c&&c.pass?"row ok":"row no",`Sample ${i+1}: ${t.name}`);
        if(!c)d.textContent=`Sample ${i+1}: not run`;
        else if(!c.pass){
          const short=x=>{x=String(x==null?"":x);return x.length>300?x.slice(0,300)+"…":x};
          d.appendChild(el("pre","",`input:    ${short(t.input_json)}\n`+(c.err?`error:    ${short(c.err)}`:`got:      ${short(c.got)}\nexpected: ${short(c.expected)}`)));
        }
        res.appendChild(d);
      });
      if(full&&tests.length>VISIBLE){
        const h=el("div","hid");
        tests.slice(VISIBLE).forEach((t,i)=>{const ok=pass(t);h.appendChild(el("span",ok?"ok":"no",`Hidden ${i+1} ${r.cases[VISIBLE+i]?(ok?"✓":"✗"):"–"}`))});
        res.appendChild(h);
      }
    };
    const show=i=>{
      if(running)return;
      cur=i;const p=S.problems[i],ex=exs[p.slug];
      stmt.replaceChildren(el("h3","",`${p.title} · ${DN[p.diff]}`),el("div","body",ex.statement));
      if(ex.statement_note)stmt.appendChild(el("div","note",ex.statement_note));
      loadingDoc=true;
      ed.setValue(S.code[p.slug]!=null?S.code[p.slug]:ex.starter_code);
      ed.clearHistory();loadingDoc=false;
      drawTabs();drawRes();ed.refresh();
    };
    const runCur=async full=>{
      if(running||finishing)return;
      const p=S.problems[cur],ex=exs[p.slug],code=ed.getValue();
      const tests=full?ex.tests:ex.tests.slice(0,VISIBLE);
      running=true;run.disabled=sub.disabled=true;st.textContent=full?"Submitting…":"Running…";
      const r=await runTests(code,{...ex,tests});
      running=false;run.disabled=sub.disabled=false;st.textContent="";
      if(finishing)return;
      last[p.slug]={r,tests,full};
      if(full){
        const graded=tests.filter(t=>t.expected_json!=null);
        S.sub[p.slug]={passed:graded.filter(t=>r.cases[tests.indexOf(t)]&&r.cases[tests.indexOf(t)].pass===true).length,total:graded.length};
        save();drawTabs();
      }
      drawRes();
    };

    let armed=0;
    fin.onclick=()=>{
      if(!armed){fin.textContent="Really finish? Click again";armed=setTimeout(()=>{armed=0;fin.textContent="Finish assessment"},4000);return}
      clearTimeout(armed);finish();
    };
    const update=()=>{
      const t=left();
      timer.textContent=fmt(t);timer.classList.toggle("low",t<=300);
      if(t<=0){clearInterval(tick);finish()}
    };
    S.problems.forEach(p=>{if(S.code[p.slug]==null)S.code[p.slug]=exs[p.slug].starter_code});
    show(0);
    window.assessRefresh=()=>{if(ed){ed.setOption("theme",darkMode()?"material-darker":"default");ed.refresh()}};
    clearInterval(tick);tick=setInterval(update,1000);update();
  }

  // ---------- grading and results ----------
  // Grades every problem from the code as it stands now, against all tests (visible and hidden).
  async function finish(){
    if(finishing||!S)return;
    finishing=true;clearInterval(tick);
    if(ed)S.code[S.problems[cur].slug]=ed.getValue();
    const r=root();r.textContent="";
    const wrap=el("div","as");r.appendChild(wrap);
    wrap.appendChild(el("h2","","Grading…"));
    const note=el("p","sub","Running your final code against every hidden test.");wrap.appendChild(note);
    const used=Math.min(S.minutes*60,(Date.now()-S.startedAt)/1000);
    const grades=[];
    for(const p of S.problems){
      const ex=exs[p.slug],code=S.code[p.slug]!=null?S.code[p.slug]:ex.starter_code;
      // Unchanged starter code cannot pass, so skip the run.
      const untouched=code.trim()===ex.starter_code.trim();
      const graded=ex.tests.filter(t=>t.expected_json!=null);
      let passed=0,hidden=[];
      if(!untouched){
        const res=await runTests(code,ex);
        graded.forEach(t=>{const c=res.cases[ex.tests.indexOf(t)];const ok=!!(c&&c.pass===true);if(ok)passed++;if(ex.tests.indexOf(t)>=VISIBLE)hidden.push(ok)});
      }else graded.forEach(t=>{if(ex.tests.indexOf(t)>=VISIBLE)hidden.push(false)});
      grades.push({slug:p.slug,title:p.title,diff:p.diff,passed,total:graded.length,hidden,untouched});
    }
    const score=Math.round(100*grades.reduce((a,g)=>a+(g.total?g.passed/g.total:0),0)/grades.length);
    S.done=true;
    try{localStorage.removeItem(SKEY)}catch(e){}
    const hist=readJSON(HKEY,[]);
    hist.push({at:Date.now(),minutes:S.minutes,senior:!!S.senior,used:Math.round(used),score,problems:grades.map(g=>({title:g.title,passed:g.passed,total:g.total}))});
    writeJSON(HKEY,hist.slice(-20));
    showFinal(grades,score,used);
  }
  function showFinal(grades,score,used){
    if(ed){ed=null;window.assessRefresh=null}
    finishing=false;
    const r=root();r.textContent="";
    const wrap=el("div","as as-final");r.appendChild(wrap);
    wrap.appendChild(el("h2","","Assessment complete"));
    wrap.appendChild(el("div","as-score",score+"%"));
    wrap.appendChild(el("p","sub",`Time used: ${fmt(used)} of ${S.minutes} minutes. Score is the average of each problem's share of tests passed.`));
    grades.forEach(g=>{
      const d=el("div","p");wrap.appendChild(d);
      const hd=el("div","hd");d.appendChild(hd);
      hd.appendChild(el("b",null,`${g.title} (${DN[g.diff]})`));
      hd.appendChild(el("span",null,`${g.passed} / ${g.total} tests passed`+(g.untouched?" (no code written)":"")));
      hd.appendChild(btn("Open in Practice",()=>openPractice(g.slug)));
      if(g.hidden.length){
        const h=el("div","as-res");const row=el("div","hid");h.appendChild(row);
        g.hidden.forEach((ok,i)=>row.appendChild(el("span",ok?"ok":"no",`Hidden ${i+1} ${ok?"✓":"✗"}`)));
        d.appendChild(h);
      }
      const sf=SENIOR[g.slug];
      if(sf){const fu=el("div","fu");fu.appendChild(el("b",null,"Senior follow-up: "));fu.appendChild(document.createTextNode(sf[1]));d.appendChild(fu)}
    });
    wrap.appendChild(btn("New assessment",showSetup,"primary"));
  }

  window.assessInit=function(){
    if(!ready){
      ready=true;
      const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
      const saved=readJSON(SKEY,null);
      if(saved&&saved.problems&&saved.startedAt&&!saved.done){
        // Resume after a reload: the clock kept running, so an expired session goes straight to grading.
        prepare(saved).then(()=>{if(S&&left()<=0)finish()});
        return;
      }
      showSetup();
      return;
    }
    if(window.assessRefresh)window.assessRefresh();
  };
})();

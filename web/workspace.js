// Shared by the AI Pairing and Engineer for a Day tabs: the worker test harness and runner, streamed chat reading,
// test result rendering, and the diff/merge helpers behind the Apply button on code blocks. Exposed as window.WS.
// Depends on globals from index.html: el, RUN_TIMEOUT. scripts/verify_aipair.js slices apHarness, apCombine and apJoin
// out of this file by their "// END" markers, so keep those.
(function(){
  // Runs inside the worker (sent via toString), so it must be self-contained. Files are loaded through a tiny
  // CommonJS shim; the hidden test source gets test/assert/eq/throws/require/mkClock/mkDeferred/flush. Tests may be async.
  function apHarness(spec){
    let cache={};
    const require=name=>{
      const key=String(name).replace(/^\.\//,"").replace(/\.js$/,"")+".js";
      if(cache[key])return cache[key].exports;
      if(!Object.prototype.hasOwnProperty.call(spec.files,key))throw new Error("Cannot find module '"+name+"'");
      const m={exports:{}};cache[key]=m;
      try{new Function("module","exports","require",spec.files[key])(m,m.exports,require)}catch(e){delete cache[key];throw e}
      return m.exports;
    };
    const show=v=>{try{const j=JSON.stringify(v);return j===undefined?String(v):j}catch(e){return String(v)}};
    const list=[];
    const test=(name,fn)=>list.push({name,fn});
    const assert=(c,msg)=>{if(!c)throw new Error(msg||"assertion failed")};
    const eq=(a,b,msg)=>{if(show(a)!==show(b))throw new Error((msg?msg+": ":"")+"expected "+show(b)+", got "+show(a))};
    const throws=(fn,Type,msg)=>{
      try{fn()}catch(e){if(!Type||e instanceof Type)return;throw new Error((msg?msg+": ":"")+"expected "+Type.name+", got "+(e&&e.name||e))}
      throw new Error((msg?msg+": ":"")+"expected a throw"+(Type?" ("+Type.name+")":""));
    };
    const mkClock=()=>{let t=1000;return{now:()=>t,tick:ms=>{t+=ms}}};
    const mkDeferred=()=>{const d={};d.promise=new Promise((res,rej)=>{d.resolve=res;d.reject=rej});return d};
    const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
    try{new Function("test","assert","eq","throws","require","mkClock","mkDeferred","flush",spec.tests)(test,assert,eq,throws,require,mkClock,mkDeferred,flush)}
    catch(e){postMessage({t:"fatal",s:"Test setup failed: "+String(e&&e.message||e)});return}
    postMessage({t:"plan",names:list.map(x=>x.name)});
    return (async()=>{
      for(let i=0;i<list.length;i++){
        const x=list[i];
        cache={};
        let err=null,tid;
        try{
          const r=x.fn();
          if(r&&typeof r.then==="function"){
            const hung=typeof setTimeout==="function"?new Promise((_,rej)=>{tid=setTimeout(()=>rej(new Error("timed out (promise never settled)")),2000)}):null;
            await(hung?Promise.race([r,hung]):r);
          }
        }catch(e){err=String(e&&e.message||e).split("\n").slice(0,3).join("\n")}
        if(tid!==undefined&&typeof clearTimeout==="function")clearTimeout(tid);
        postMessage({t:"case",i,name:x.name,pass:err==null,err});
      }
    })();
  }
  // END apHarness

  // Visible + hidden test sources as one script. Each runs in its own function so top-level helpers cannot collide,
  // and hidden case names get a "[hidden] " prefix.
  // The optional candidate tests are compiled separately, so a typo in them shows up as one failing case instead of
  // taking every other test down with it.
  function apCombine(visible,hidden,mine){
    let out="(function(){\n"+visible+"\n})();\n";
    if(hidden)out+="(function(test){\n"+hidden+"\n})(function(n,f){test('[hidden] '+n,f)});\n";
    if(mine&&mine.trim())out+="(function(){var t=function(n,f){test('[mine] '+n,f)};try{new Function('test','assert','eq','throws','require','mkClock','mkDeferred','flush',"+JSON.stringify(mine)+")(t,assert,eq,throws,require,mkClock,mkDeferred,flush)}catch(e){test('[mine] your tests could not load',function(){throw e})}})();";
    return out;
  }
  // END apCombine

  // Object design scenarios: once the follow-up is revealed its tests run with the originals, each file in its own scope.
  function apJoin(a,b){return "(function(){\n"+a+"\n})();\n(function(){\n"+b+"\n})();\n"}
  // END apJoin

  // Several test files as one script, each in its own scope; a suite's case names get its prefix (e.g. "[incident] ").
  function apSuites(list){
    return list.map(([prefix,src])=>prefix?"(function(test){\n"+src+"\n})(function(n,f){test("+JSON.stringify(prefix)+"+n,f)});\n":"(function(){\n"+src+"\n})();\n").join("");
  }
  // END apSuites

  let killRun=null;
  // Runs the files against the tests in a fresh worker. Resolves {names, cases, fatal, err, timedOut}.
  function runAp(files,tests,onOut){
    return new Promise(resolve=>{
      const w=new Worker("/worker.js"),res={names:[],cases:[],fatal:"",err:"",timedOut:false};
      let timer=0,done=false;
      const end=()=>{if(done)return;done=true;clearTimeout(timer);w.terminate();if(killRun===stop)killRun=null;resolve(res)};
      const stop=()=>{res.err=res.err||"Stopped.";end()};
      killRun=stop;
      w.onmessage=e=>{
        const m=e.data;
        if(m.t==="start")timer=setTimeout(()=>{res.timedOut=true;end()},RUN_TIMEOUT);
        else if(m.t==="out")onOut(m.s);
        else if(m.t==="plan")res.names=m.names;
        else if(m.t==="case")res.cases[m.i]=m;
        else if(m.t==="fatal")res.fatal=m.s;
        else if(m.t==="err")res.err+=m.s+"\n";
        else if(m.t==="done")end();
      };
      w.onerror=e=>{res.err+=(e.message||"Worker error")+"\n";end()};
      w.postMessage(";("+apHarness.toString()+")("+JSON.stringify({files,tests})+");");
    });
  }
  const stopRun=()=>{if(killRun)killRun()};

  // Reads a streamed chat reply ("data: {t}" events); calls onText with the text so far. Throws on an {error} event.
  async function readSSE(res,onText){
    const rd=res.body.getReader(),dec=new TextDecoder();let buf="",answer="";
    for(;;){
      const {done,value}=await rd.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const parts=buf.split("\n\n");buf=parts.pop();
      for(const p of parts){
        if(!p.startsWith("data: "))continue;
        const ev=JSON.parse(p.slice(6));
        if(ev.error)throw new Error(ev.error);
        if(ev.t){answer+=ev.t;onText(answer)}
      }
    }
    return answer;
  }

  // One test run's results into a container: summary, a row per case, then a timeout or worker error.
  function renderResults(into,res){
    into.textContent="";
    const total=res.names.length,passed=res.cases.filter(c=>c&&c.pass).length;
    if(res.fatal)into.appendChild(el("pre","",res.fatal));
    if(total)into.appendChild(el("div","sum",passed+" / "+total+" tests passing"));
    res.names.forEach((name,i)=>{
      const c=res.cases[i];
      if(!c){into.appendChild(el("div","row no",name+" (did not run)"));return}
      const row=el("div","row "+(c.pass?"ok":"no"),c.name);
      if(c.err)row.appendChild(el("pre","",c.err));
      into.appendChild(row);
    });
    if(res.timedOut)into.appendChild(el("pre","","Stopped: exceeded "+RUN_TIMEOUT/1000+"s (infinite loop or too slow?). Tests after the stuck one did not run."));
    else if(res.err.trim())into.appendChild(el("pre","",res.err.trim()));
  }

  // ---- Apply helpers: a line diff, and merging a snippet into a file by top-level chunk or by class member ----
  function lineDiff(a,b){
    const n=a.length,m=b.length,L=Array.from({length:n+1},()=>new Uint16Array(m+1));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
    const out=[];let i=0,j=0;
    while(i<n&&j<m){if(a[i]===b[j]){out.push([" ",a[i]]);i++;j++}else if(L[i+1][j]>=L[i][j+1])out.push(["-",a[i++]]);else out.push(["+",b[j++]])}
    while(i<n)out.push(["-",a[i++]]);while(j<m)out.push(["+",b[j++]]);
    return out;
  }
  // Split a file into top-level chunks (function/class/const/... at column 0, with any comment lines just above). Used to merge a snippet without losing the rest of the file.
  function chunks(src){
    const lines=src.split("\n"),out=[];let cur=null,pend=[];
    const start=/^(?:async\s+function\s*\*?\s*(\w+)|function\s*\*?\s*(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+|\{[^}]*\}|\[[^\]]*\])|(module\.exports)\b|(exports\.\w+))/;
    lines.forEach(l=>{
      const m=l.match(start);
      if(m){cur={name:m[1]||m[2]||m[3]||m[4]||m[5]||m[6],lines:[...pend,l]};pend=[];out.push(cur)}
      else if(/^(\/\/|\/\*)/.test(l))pend.push(l);
      else if(/^\s*$/.test(l)&&pend.length){pend.push(l)}
      else{if(pend.length&&cur){cur.lines.push(...pend);pend=[]}if(cur)cur.lines.push(l);else out.push(cur={name:null,lines:[l]})}
    });
    if(pend.length){if(cur)cur.lines.push(...pend);else out.push({name:null,lines:pend})}
    return out.map(c=>{const t=c.lines.join("\n");const body=t.replace(/\s+$/,"");return {name:c.name,body,gap:t.slice(body.length)+"\n"}});
  }
  // Merge snippet into current file: same-named chunks are replaced in place, new ones go before module.exports (or at the end); everything else is untouched.
  function mergeSnippet(cur,snip){
    const cc=chunks(cur),sc2=chunks(snip).filter(c=>c.body.trim());
    if(!sc2.some(c=>c.name))return null;
    // A function the file only has nested (inside a factory like create()) is left to mergeMembers, which replaces it in place.
    const lines=cur.split("\n"),nested=n=>lines.some((l,i)=>{const m=methodAt(lines,i);return m&&m.fn&&m.indent&&m.name===n});
    if(sc2.some(c=>c.name&&!cc.some(x=>x.name===c.name)&&nested(c.name)))return null;
    const replaced=[],added=[];
    sc2.forEach(c=>{
      const i=c.name?cc.findIndex(x=>x.name===c.name):cc.findIndex(x=>x.body===c.body);
      if(i>=0){if(cc[i].body!==c.body){cc[i]={name:cc[i].name,body:c.body,gap:cc[i].gap};replaced.push(c.name)}}
      else{
        const at=c.name==="module.exports"?-1:cc.findIndex(x=>x.name==="module.exports");
        const item={name:c.name,body:c.body,gap:"\n\n"};
        if(at>=0)cc.splice(at,0,item);else{if(cc.length&&!/\n\s*\n$/.test(cc[cc.length-1].gap))cc[cc.length-1].gap="\n\n";cc.push(item)}
        added.push(c.name||"code");
      }
    });
    // keep the original ending: last chunk's gap = original trailing whitespace
    const tail=cur.match(/\s*$/)[0];cc[cc.length-1].gap=tail;
    return {text:cc.map(c=>c.body+c.gap).join(""),replaced,added};
  }
  // ---- member-level merge: methods (e.g. a class's `once`) are replaced or added inside their class, re-indented to fit ----
  const KW=/^(?:if|for|while|switch|catch|function|return|else|do|try|with)$/;
  const METHOD=/^(\s*)(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?\*?\s*(#?\w+)\s*\([^)]*\)\s*\{/;
  const strip=l=>l.replace(/(["'`])(?:\\.|(?!\1).)*\1/g,"").replace(/\/\/.*$/,"");
  function blockEnd(lines,i){let d=0,seen=false;for(let k=i;k<lines.length;k++){for(const ch of strip(lines[k])){if(ch==="{"){d++;seen=true}else if(ch==="}")d--}if(seen&&d<=0)return k}return lines.length-1}
  // A nested function declaration (fn: true) counts as a member too, so a factory's inner functions can be replaced.
  const NESTED=/^(\s*)(?:async\s+)?function\s*\*?\s*(\w+)\s*\(/;
  function methodAt(lines,i){
    const f=lines[i].match(NESTED);if(f)return {indent:f[1],name:f[2],fn:true};
    const m=lines[i].match(METHOD);return m&&!KW.test(m[2])?{indent:m[1],name:m[2]}:null;
  }
  // methods at the snippet's base indent, each with the comment lines directly above it
  function snippetMembers(snip){
    const lines=snip.replace(/\s+$/,"").split("\n"),ind=Math.min(...lines.filter(l=>l.trim()).map(l=>l.match(/^\s*/)[0].length));
    const dl=lines.map(l=>l.slice(ind)),out=[];let i=0,pend=[];
    while(i<dl.length){
      const l=dl[i];
      if(/^\s*$/.test(l)){pend=[];i++;continue}
      if(/^(\/\/|\/\*|\*)/.test(l)){pend.push(l);i++;continue}
      const m=methodAt(dl,i);
      if(!m||m.indent)return null;
      const e=blockEnd(dl,i);out.push({name:m.name,fn:!!m.fn,lines:[...pend,...dl.slice(i,e+1)]});pend=[];i=e+1;
    }
    return out.length?out:null;
  }
  function mergeMembers(cur,snip,cursorLine){
    const mem=snippetMembers(snip);if(!mem)return null;
    let lines=cur.split("\n");const replaced=[],added=[];
    for(const mm of mem){
      // Same kind only: a function declaration replaces a nested function, a method replaces a method.
      let hit=-1;for(let i=0;i<lines.length;i++){const m=methodAt(lines,i);if(m&&m.indent&&m.name===mm.name&&!!m.fn===mm.fn){hit=i;break}}
      if(hit>=0){
        const ind=methodAt(lines,hit).indent;let st=hit;while(st>0&&/^\s*(\/\/|\/\*|\*)/.test(lines[st-1]))st--;
        const e=blockEnd(lines,hit);
        lines.splice(st,e-st+1,...mm.lines.map(l=>l.trim()?ind+l:l));replaced.push(mm.name);
      }else{
        // add inside the class holding the cursor, else the last class (a function declaration has no place in a class)
        if(mm.fn)return null;
        const cls=[];lines.forEach((l,i)=>{if(/^\s*class\s+\w+/.test(l))cls.push([i,blockEnd(lines,i)])});
        if(!cls.length)return null;
        const c=cls.find(x=>cursorLine>x[0]&&cursorLine<x[1])||cls[cls.length-1];
        let ind=null;for(let i=c[0]+1;i<c[1];i++){const m=methodAt(lines,i);if(m&&m.indent){ind=m.indent;break}}
        if(ind===null)ind=lines[c[0]].match(/^\s*/)[0]+"  ";
        const prev=lines[c[1]-1];
        lines.splice(c[1],0,...(prev&&prev.trim()?[""]:[]),...mm.lines.map(l=>l.trim()?ind+l:l));added.push(mm.name);
      }
    }
    return {text:lines.join("\n"),replaced,added};
  }

  window.WS={apHarness,apCombine,apJoin,apSuites,runAp,stopRun,readSSE,renderResults,lineDiff,mergeSnippet,mergeMembers};
})();

const show=v=>{if(typeof v==="string")return v;try{const j=JSON.stringify(v);return j===undefined?String(v):j}catch(e){return String(v)}};
// A loop that logs forever would otherwise flood the page with messages; keep the first 100k characters.
let outLeft=1e5;
console.log=console.info=console.warn=console.error=(...a)=>{
  if(outLeft<=0)return;
  let s=a.map(show).join(" ")+"\n";
  if(s.length>outLeft)s=s.slice(0,outLeft)+"\n[output truncated]\n";
  outLeft-=s.length;if(outLeft<=0)outLeft=0;
  postMessage({t:"out",s});
};
onmessage=e=>{
  postMessage({t:"start"});
  const fail=err=>postMessage({t:"err",s:String(err&&err.stack||err)});
  let r;
  try{r=(0,eval)(e.data)}catch(err){fail(err)}
  if(r&&typeof r.then==="function")r.then(null,fail).then(()=>postMessage({t:"done"}));
  else postMessage({t:"done"});
};

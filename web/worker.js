const show=v=>{if(typeof v==="string")return v;try{const j=JSON.stringify(v);return j===undefined?String(v):j}catch(e){return String(v)}};
console.log=console.info=console.warn=console.error=(...a)=>postMessage({t:"out",s:a.map(show).join(" ")+"\n"});
onmessage=e=>{
  postMessage({t:"start"});
  const fail=err=>postMessage({t:"err",s:String(err&&err.stack||err)});
  let r;
  try{r=(0,eval)(e.data)}catch(err){fail(err)}
  if(r&&typeof r.then==="function")r.then(null,fail).then(()=>postMessage({t:"done"}));
  else postMessage({t:"done"});
};

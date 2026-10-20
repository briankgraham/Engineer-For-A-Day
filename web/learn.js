// Learning tab: self-paced tracks (Graphs first). Each lesson teaches (text, templates, step-through visualizers, drills)
// and then practices (code exercises run in the browser worker, quick checks, written answers reviewed by AI).
// Progress, notes, drafts and review dates stay in localStorage.
// Depends on globals from index.html: $, el, today, isDue, INTERVALS, apiFetch, errMsg, readStream, loadCM, makeEditor,
// formatCode, runTests, summarize, DATA, DN, progress (LeetCode), openPractice, openLearn; LK from learn_kit.js; and LEARN_TRACKS from learn_data.js.
(function(){
  const PKEY="learn-progress-v1"; // also read by the Export progress button in index.html
  const readJSON=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  let prog=readJSON(PKEY,{});
  if(!prog||typeof prog!=="object"||Array.isArray(prog))prog={};
  if(!prog.lessons||typeof prog.lessons!=="object")prog.lessons={};
  if(!prog.drill||typeof prog.drill!=="object")prog.drill={right:0,total:0,streak:0,best:0};
  const save=()=>writeJSON(PKEY,prog);
  const lkey=(t,l)=>t.id+"/"+l.id;
  const lp=(t,l)=>prog.lessons[lkey(t,l)]||(prog.lessons[lkey(t,l)]={done:false,times:0,parts:{}});
  const peekLp=(t,l)=>prog.lessons[lkey(t,l)]||{done:false,times:0,parts:{}};
  const pp=(t,l,p)=>{const x=lp(t,l);if(!x.parts)x.parts={};return x.parts[p.id]||(x.parts[p.id]={})};
  const partsDone=(t,l)=>{const x=peekLp(t,l).parts||{};return l.parts.filter(p=>x[p.id]&&x[p.id].ok).length};
  const fmt=s=>Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0");
  const btn=(text,fn,cls)=>{const b=el("button",cls||null,text);b.type="button";if(fn)b.onclick=fn;return b};
  const root=()=>$("tab-learn");
  const trackById=id=>LEARN_TRACKS.find(t=>t.id===id);
  const daysUntilDue=x=>{if(!x.done||!x.last)return null;const gap=INTERVALS[Math.min(Math.max(x.times,1),3)-1];return Math.ceil(gap-(Date.parse(today())-Date.parse(x.last))/864e5)};

  const {injectCss,sv,ring,toast,inline,md,mdEl,codeEl,partShell,markOk,quizPart,explainPart}=LK; // shared with the System Design tab (learn_kit.js)

  // ---------- graph drawing ----------
  let svgSeq=0;
  // Draws graph g; returns {svg, nodes[], edges[] (each {u,v,w,line}), setNode(i, cls, label), setEdge(i, cls)}.
  function drawGraph(g){
    const id="lrm"+(++svgSeq),R=g.r||(g.labels?4.6:3.6);
    const svg=sv("svg",{viewBox:g.vb||"-6 -6 112 72",role:"img"});
    if(g.directed){
      const defs=sv("defs",{},svg),mk=sv("marker",{id,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"3.2",markerHeight:"3.2",markerUnits:"userSpaceOnUse",orient:"auto"},defs);
      sv("path",{d:"M0,0 L10,5 L0,10 z",class:"vz-arrow"},mk);
    }
    const P=g.pos,edges=[],nodes=[];
    const eg=sv("g",{},svg),wg=sv("g",{},svg),ng=sv("g",{},svg);
    g.edges.forEach(([u,v,w])=>{
      const [x1,y1]=P[u],[x2,y2]=P[v],dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
      const end=g.directed?R+.8:R;
      const line=sv("line",{x1:x1+ux*R,y1:y1+uy*R,x2:x2-ux*end,y2:y2-uy*end,class:"vz-e"},eg);
      if(g.directed)line.setAttribute("marker-end",`url(#${id})`);
      if(w!=null){const t=sv("text",{x:(x1+x2)/2-uy*2.4,y:(y1+y2)/2+ux*2.4,class:"vz-w"},wg);t.textContent=w}
      edges.push({u,v,w,line});
    });
    for(let i=0;i<g.n;i++){
      const gr=sv("g",{class:"vz-n"},ng),[x,y]=P[i];
      sv("circle",{cx:x,cy:y,r:R},gr);
      const t=sv("text",{x,y,class:"v"},gr);t.textContent=g.labels?g.labels[i]:i;
      const lb=sv("text",{x,y:y+R+2.8,class:"lb"},gr);
      nodes.push({g:gr,lb});
    }
    return {svg,nodes,edges,
      setText:(i,t)=>{nodes[i].g.querySelector("text.v").textContent=t},
      setNode:(i,cls,label)=>{nodes[i].g.setAttribute("class","vz-n"+(cls?" "+cls:""));nodes[i].lb.textContent=label==null?"":label},
      setEdge:(i,cls)=>edges[i].line.setAttribute("class","vz-e"+(cls?" "+cls:""))};
  }
  const edgeIndex=(g,u,v)=>g.edges.findIndex(e=>(e[0]===u&&e[1]===v)||(!g.directed&&e[0]===v&&e[1]===u));
  const adjOf=g=>{
    const adj=Array.from({length:g.n},()=>[]);
    g.edges.forEach(([u,v,w])=>{adj[u].push(w==null?v:[v,w]);if(!g.directed)adj[v].push(w==null?u:[u,w])});
    adj.forEach(a=>a.sort((x,y)=>(Array.isArray(x)?x[0]:x)-(Array.isArray(y)?y[0]:y)));
    return adj;
  };

  // ---------- trees and heaps ----------
  // treeGraph: level-order array (LeetCode style, null = no node) -> graph {n, edges (parent, child), pos, labels, val, left[], right[]}.
  // Vertex ids follow level order, so id 0 is the root. Layout: x by in-order position, y by depth.
  function treeGraph(arr){
    const val=[],left=[],right=[],depth=[],edges=[];
    const mk=(v,d)=>{val.push(v);left.push(-1);right.push(-1);depth.push(d);return val.length-1};
    if(arr.length&&arr[0]!=null){
      const q=[mk(arr[0],0)];let i=1;
      while(q.length&&i<arr.length){
        const u=q.shift();
        for(const side of [left,right]){
          if(i<arr.length&&arr[i]!=null){const c=mk(arr[i],depth[u]+1);side[u]=c;edges.push([u,c]);q.push(c)}
          i++;
        }
      }
    }
    const n=val.length,ino=new Array(n).fill(0);let k=0;
    const walk=u=>{if(u<0)return;walk(left[u]);ino[u]=k++;walk(right[u])};
    if(n)walk(0);
    const maxD=Math.max(0,...depth),dy=Math.min(16,44/Math.max(maxD,1));
    const pos=val.map((_,u)=>[n>1?6+ino[u]*(88/(n-1)):50,8+depth[u]*dy]);
    return {n,edges,pos,labels:val.map(String),val,left,right};
  }
  // heapGraph: array-backed complete binary tree. `extra` reserves room for a value about to be pushed.
  function heapGraph(arr,extra){
    const n=arr.length+(extra||0),edges=[],pos=[];
    const maxD=n?Math.floor(Math.log2(n)):0,dy=Math.min(16,44/Math.max(maxD,1));
    for(let i=0;i<n;i++){
      const d=Math.floor(Math.log2(i+1)),w=Math.pow(2,d),kk=i+1-w;
      pos.push([100*(kk+.5)/w,8+d*dy]);
      if(i>0)edges.push([(i-1)>>1,i]);
    }
    return {n,edges,pos,labels:arr.map(String).concat(new Array(extra||0).fill("")),arr};
  }
  const graphFor=b=>b.tree?treeGraph(b.tree):b.heap?heapGraph(b.heap,b.viz==="heapPush"?1:0):b.graph;

  // Step generators: each returns a list of frames {cls[], lab[], tree:Set, gone:Set, act, ds:{t, items, hot}, out:{t, items}, say}.
  function stepper(g){
    const frames=[],cls=new Array(g.n).fill(""),lab=new Array(g.n).fill(""),tree=new Set(),gone=new Set();
    const S={frames,cls,lab,tree,gone,val:null}; // val: optional per-node text (heaps move values between nodes)
    S.snap=(say,act,ds,out)=>frames.push({cls:[...cls],lab:[...lab],tree:new Set(tree),gone:new Set(gone),val:S.val&&[...S.val],act:act==null?-1:act,ds,out,say});
    return S;
  }
  const GEN={
    dfs(g,s){
      const S=stepper(g),adj=adjOf(g),seen=new Array(g.n).fill(false),stack=[],order=[];
      const ds=()=>({t:"Call stack (top on the right)",items:[...stack],hot:stack.length-1}),out=()=>({t:"Visit order",items:[...order]});
      const go=(u,from)=>{
        seen[u]=true;stack.push(u);order.push(u);
        stack.forEach(x=>S.cls[x]="fr");S.cls[u]="cur";
        if(from!=null)S.tree.add(edgeIndex(g,from,u));
        S.snap(from==null?`Start: call dfs(${u}). Mark ${u} visited and push it on the call stack.`:`Call dfs(${u}): mark ${u} visited and push it on the call stack.`,from==null?null:edgeIndex(g,from,u),ds(),out());
        for(const v of adj[u]){
          if(seen[v]){S.snap(`Look at ${u} → ${v}: ${v} is already visited, so skip it.${S.cls[v]==="fr"?" (Without a visited check, this would loop forever.)":""}`,edgeIndex(g,u,v),ds(),out());continue}
          S.snap(`Look at ${u} → ${v}: ${v} isn't visited yet, so go deeper.`,edgeIndex(g,u,v),ds(),out());
          S.cls[u]="fr";go(v,u);S.cls[u]="cur";
        }
        stack.pop();S.cls[u]="done";if(stack.length)S.cls[stack[stack.length-1]]="cur";
        S.snap(stack.length?`${u} has no unvisited neighbors left: return, popping ${u}. Back in dfs(${stack[stack.length-1]}).`:`${u} is finished and the stack is empty. Everything reachable from ${s} has been visited.`,null,ds(),out());
      };
      S.snap(`DFS from ${s}. Neighbors are tried in ascending order.`,null,ds(),out());
      go(s,null);
      return S.frames;
    },
    bfs(g,s){
      const S=stepper(g),adj=adjOf(g),dist=new Array(g.n).fill(-1),q=[s];let head=0;const order=[];
      const ds=()=>({t:"Queue (front on the left)",items:q.slice(head),hot:0}),out=()=>({t:"Dequeued order",items:[...order]});
      dist[s]=0;S.cls[s]="fr";S.lab[s]="d=0";
      S.snap(`Start: dist[${s}] = 0 and enqueue ${s}. Every other vertex is unseen.`,null,ds(),out());
      while(head<q.length){
        const u=q[head++];order.push(u);S.cls[u]="cur";
        S.snap(`Dequeue ${u} (distance ${dist[u]}) and look at its neighbors.`,null,ds(),out());
        for(const v of adj[u]){
          if(dist[v]!==-1){S.snap(`${u} → ${v}: ${v} was already seen, so skip it.`,edgeIndex(g,u,v),ds(),out());continue}
          dist[v]=dist[u]+1;q.push(v);S.cls[v]="fr";S.lab[v]="d="+dist[v];S.tree.add(edgeIndex(g,u,v));
          S.snap(`${u} → ${v}: first time we've seen ${v}. Set dist[${v}] = ${dist[u]} + 1 = ${dist[v]} and enqueue it (mark it now, not when it's dequeued).`,edgeIndex(g,u,v),ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap(`The queue is empty. The highlighted edges form the BFS tree, and each d is a shortest distance from ${s}.`,null,ds(),out());
      return S.frames;
    },
    components(g){
      const S=stepper(g),adj=adjOf(g),comp=new Array(g.n).fill(-1),groups=[];
      const out=()=>({t:"Components found",items:groups.map((m,k)=>`#${k+1}: ${m.join(",")}`)});
      S.snap("The outer loop walks the vertices 0, 1, 2, … and starts a DFS at each one that isn't visited yet.",null,null,out());
      for(let s=0;s<g.n;s++){
        if(comp[s]!==-1){S.snap(`Outer loop at ${s}: already in component #${comp[s]+1}, so skip it.`,null,null,out());continue}
        const k=groups.length;groups.push([]);
        const stack=[s];comp[s]=k;groups[k].push(s);S.cls[s]="c"+(k%4);
        S.snap(`Outer loop at ${s}: not visited, so start component #${k+1} here.`,null,null,out());
        while(stack.length){
          const u=stack.pop();
          for(const v of adj[u])if(comp[v]===-1){
            comp[v]=k;groups[k].push(v);stack.push(v);S.cls[v]="c"+(k%4);S.tree.add(edgeIndex(g,u,v));
            S.snap(`DFS reaches ${v} through ${u}, so it joins component #${k+1}.`,edgeIndex(g,u,v),null,out());
          }
        }
        groups[k].sort((a,b)=>a-b);
      }
      S.snap(`Done: ${groups.length} components, one for each time the outer loop had to start a new DFS.`,null,null,out());
      return S.frames;
    },
    topo(g){
      const S=stepper(g),adj=Array.from({length:g.n},()=>[]),indeg=new Array(g.n).fill(0);
      g.edges.forEach(([u,v])=>{adj[u].push(v);indeg[v]++});
      const q=[],order=[];let head=0;
      const ds=()=>({t:"Ready queue (in-degree 0)",items:q.slice(head),hot:0}),out=()=>({t:"Topological order",items:[...order]});
      for(let v=0;v<g.n;v++){S.lab[v]="in="+indeg[v];if(!indeg[v]){q.push(v);S.cls[v]="fr"}}
      S.snap(`Count each vertex's in-degree (shown as in=). Those at 0 (${q.join(", ")}) depend on nothing, so they go in the queue.`,null,ds(),out());
      while(head<q.length){
        const u=q[head++];order.push(u);S.cls[u]="cur";
        S.snap(`Take ${u} from the queue and append it to the order.`,null,ds(),out());
        for(const v of adj[u]){
          indeg[v]--;S.lab[v]="in="+indeg[v];const e=edgeIndex(g,u,v);S.gone.add(e);
          if(!indeg[v]){q.push(v);S.cls[v]="fr";S.snap(`Remove edge ${u} → ${v}. The in-degree of ${v} drops to 0, so it's ready: enqueue it.`,e,ds(),out())}
          else S.snap(`Remove edge ${u} → ${v}. The in-degree of ${v} drops to ${indeg[v]}, so it's still waiting on something.`,e,ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap(order.length===g.n?`All ${g.n} vertices are placed, so this is a valid topological order. Every edge points forward.`:`Only ${order.length} of ${g.n} placed: the rest are stuck behind a cycle.`,null,ds(),out());
      return S.frames;
    },
    dijkstra(g,s){
      const S=stepper(g),adj=Array.from({length:g.n},()=>[]);
      g.edges.forEach(([u,v,w])=>adj[u].push([v,w]));
      const dist=new Array(g.n).fill(Infinity),prevE=new Array(g.n).fill(-1),heap=[],done=[];
      const show=d=>d===Infinity?"∞":d;
      const ds=()=>({t:"Min-heap: (distance, vertex)",items:[...heap].sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(([d,v])=>`(${d},${v})`),hot:0});
      const out=()=>({t:"Settled (final)",items:done.map(v=>`${v}:${dist[v]}`)});
      for(let v=0;v<g.n;v++)S.lab[v]="∞";
      dist[s]=0;heap.push([0,s]);S.lab[s]="0";S.cls[s]="fr";
      S.snap(`dist[${s}] = 0, every other distance is ∞. Push (0, ${s}) onto the heap.`,null,ds(),out());
      while(heap.length){
        heap.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
        const [d,u]=heap.shift();
        if(d>dist[u]){S.snap(`Pop (${d}, ${u}): stale. ${u} was already settled at ${dist[u]}, so skip it (lazy deletion).`,null,ds(),out());continue}
        done.push(u);S.cls[u]="cur";
        S.snap(`Pop (${d}, ${u}): it's the closest unsettled vertex, so ${d} is final for ${u}.`,null,ds(),out());
        for(const [v,w] of adj[u]){
          const e=edgeIndex(g,u,v);
          if(d+w<dist[v]){
            const old=dist[v];dist[v]=d+w;heap.push([dist[v],v]);S.lab[v]=String(dist[v]);if(S.cls[v]!=="done")S.cls[v]="fr";
            if(prevE[v]>=0)S.tree.delete(prevE[v]);prevE[v]=e;S.tree.add(e);
            S.snap(`Relax ${u} → ${v} (weight ${w}): ${d} + ${w} = ${d+w} < ${show(old)}. Update dist[${v}] and push (${d+w}, ${v}).`,e,ds(),out());
          }else S.snap(`${u} → ${v} (weight ${w}): ${d} + ${w} = ${d+w}, which is no better than ${dist[v]}. Leave it.`,e,ds(),out());
        }
        S.cls[u]="done";
      }
      S.snap("The heap is empty. Every label is a shortest distance, and the highlighted edges form the shortest-path tree.",null,ds(),out());
      return S.frames;
    },
    // ----- trees (g from treeGraph) -----
    preorder:g=>travGen(g,"pre"),
    inorder:g=>travGen(g,"in"),
    postorder:g=>travGen(g,"post"),
    levelorder(g){
      const S=stepper(g),q=[0],levels=[];let head=0;
      const ds=()=>({t:"Queue (front on the left)",items:q.slice(head).map(u=>g.val[u]),hot:0}),out=()=>({t:"Levels",items:levels.map(l=>"["+l.map(u=>g.val[u]).join(",")+"]")});
      S.cls[0]="fr";
      S.snap("Start: put the root in the queue. Each pass of the outer loop will empty exactly one level.",null,ds(),out());
      while(head<q.length){
        const size=q.length-head,level=[];
        S.snap(`New level: the queue holds ${size} node${size===1?"":"s"}, so take exactly ${size} off before touching anything that is enqueued meanwhile.`,null,ds(),out());
        for(let i=0;i<size;i++){
          const u=q[head++];level.push(u);S.cls[u]="cur";S.lab[u]="L"+levels.length;
          S.snap(`Dequeue ${g.val[u]} and add it to this level.`,null,ds(),out());
          for(const c of [g.left[u],g.right[u]])if(c>=0){
            q.push(c);S.cls[c]="fr";S.tree.add(edgeIndex(g,u,c));
            S.snap(`Enqueue child ${g.val[c]}. It belongs to the next level.`,edgeIndex(g,u,c),ds(),out());
          }
          S.cls[u]="done";
        }
        levels.push(level);
        S.snap(`Level ${levels.length} is done: [${level.map(u=>g.val[u]).join(", ")}].`,null,ds(),out());
      }
      S.snap(`The queue is empty. ${levels.length} levels, collected top to bottom.`,null,ds(),out());
      return S.frames;
    },
    bstSearch(g,t){
      const S=stepper(g),path=[];let u=0;
      const out=()=>({t:"Nodes compared",items:path.map(x=>g.val[x])});
      S.snap(`Search for ${t}. At each node one comparison throws away a whole subtree.`,null,null,out());
      for(;;){
        path.push(u);S.cls[u]="cur";
        if(t===g.val[u]){S.snap(`${t} equals ${g.val[u]}: found it after ${path.length} comparison${path.length===1?"":"s"}.`,null,null,out());break}
        const left=t<g.val[u],nx=left?g.left[u]:g.right[u];
        S.snap(`${t} ${left?"<":">"} ${g.val[u]}, so ${t} can only be in the ${left?"left":"right"} subtree.`,null,null,out());
        S.cls[u]="done";
        if(nx<0){S.snap(`There is no ${left?"left":"right"} child, so ${t} is not in the tree. This empty spot is exactly where it would be inserted.`,null,null,out());break}
        S.tree.add(edgeIndex(g,u,nx));u=nx;
      }
      return S.frames;
    },
    bstInsert(g,v){
      // g already contains v (so the picture has its final shape); the new node stays hidden until it is attached.
      const S=stepper(g),nw=g.val.indexOf(v),L=u=>g.left[u]===nw?-1:g.left[u],R=u=>g.right[u]===nw?-1:g.right[u];
      let u=0;S.cls[nw]="off";
      S.snap(`Insert ${v}. Walk down exactly as a search would, until you fall off the tree.`,null,null,null);
      for(;;){
        S.cls[u]="cur";
        const left=v<g.val[u],nx=left?L(u):R(u);
        S.snap(`${v} ${left?"<":">"} ${g.val[u]}, so go ${left?"left":"right"}.`,null,null,null);
        S.cls[u]="done";
        if(nx<0){
          S.cls[nw]="cur";S.tree.add(edgeIndex(g,u,nw));
          S.snap(`The ${left?"left":"right"} child of ${g.val[u]} is empty, so ${v} goes there. No existing node moves.`,edgeIndex(g,u,nw),null,null);
          break;
        }
        S.tree.add(edgeIndex(g,u,nx));u=nx;
      }
      S.cls[nw]="done";
      S.snap("Done. Insertion cost one comparison per level, so O(height). Insert sorted input and the height becomes n.",null,null,null);
      return S.frames;
    },
    // ----- heaps (g from heapGraph) -----
    heapPush:(g,v)=>heapGen(g,"push",v),
    heapPop:g=>heapGen(g,"pop"),
    heapify:g=>heapGen(g,"heapify"),
  };

  // Pre/in/post-order DFS over a treeGraph: the call stack, the output so far and a visit number on each node.
  function travGen(g,kind){
    const S=stepper(g),stack=[],order=[],name=kind+"order";
    const rule={pre:"visit the node, then the left subtree, then the right",in:"left subtree, then visit the node, then the right subtree",post:"left subtree, then right subtree, then visit the node"}[kind];
    const ds=()=>({t:"Call stack (top on the right)",items:stack.map(u=>g.val[u]),hot:stack.length-1}),out=()=>({t:"Output so far",items:order.map(u=>g.val[u])});
    const say=(m,act)=>{
      for(let u=0;u<g.n;u++)S.cls[u]=u===stack[stack.length-1]?"cur":order.includes(u)?"done":stack.includes(u)?"fr":"";
      S.snap(m,act==null?null:act,ds(),out());
    };
    const visit=u=>{order.push(u);S.lab[u]="#"+order.length;say(`Visit ${g.val[u]}: add it to the output.`)};
    const go=(u,from)=>{
      stack.push(u);
      say(`Call ${name}(${g.val[u]}).`,from==null?null:edgeIndex(g,from,u));
      if(kind==="pre")visit(u);
      if(g.left[u]>=0)go(g.left[u],u);else say(`${g.val[u]} has no left child, so there is nothing to do on that side.`);
      if(kind==="in")visit(u);
      if(g.right[u]>=0)go(g.right[u],u);else say(`${g.val[u]} has no right child.`);
      if(kind==="post")visit(u);
      stack.pop();
      say(stack.length?`Done with ${g.val[u]}: return to ${g.val[stack[stack.length-1]]}.`:`Done with ${g.val[u]}. The stack is empty, so the traversal is finished.`);
    };
    say(`${name}: ${rule}. The recursion order is the only thing that changes between the three.`);
    go(0,null);
    return S.frames;
  }

  // Min-heap push (sift up), pop (sift down) and build-heap, shown as a tree and as the array that really stores it.
  function heapGen(g,mode,v){
    const S=stepper(g),a=g.arr.slice(),popped=[];let size=a.length;
    S.val=new Array(g.n).fill(null);
    const ds=hot=>({t:"Array form (index = position in the tree)",items:a.slice(0,size),hot:hot==null?-1:hot});
    const out=()=>mode==="pop"?{t:"Popped (smallest first)",items:[...popped]}:null;
    const show=(say,hi,lo,act)=>{
      for(let k=0;k<g.n;k++){S.val[k]=k<size?a[k]:null;S.cls[k]=k>=size?"off":k===hi?"cur":k===lo?"fr":""}
      S.snap(say,act,ds(hi),out());
    };
    const up=i=>{
      while(i>0){
        const p=(i-1)>>1;
        if(a[p]<=a[i]){show(`${a[i]} is not smaller than its parent ${a[p]}, so the heap rule holds. Stop.`,i,p,edgeIndex(g,p,i));return}
        show(`${a[i]} is smaller than its parent ${a[p]}, which breaks the min-heap rule. Swap them.`,i,p,edgeIndex(g,p,i));
        [a[p],a[i]]=[a[i],a[p]];i=p;
        show(`Swapped. ${a[i]} is now at index ${i}.`,i);
      }
      show(`${a[0]} reached the root, so it's the new minimum. Stop.`,0);
    };
    const down=i=>{
      for(;;){
        const l=2*i+1,r=l+1;let m=i;
        if(l<size&&a[l]<a[m])m=l;
        if(r<size&&a[r]<a[m])m=r;
        if(m===i){show(l>=size?`${a[i]} has no children, so it stays here.`:`${a[i]} is no larger than its children, so the heap rule holds. Stop.`,i);return}
        const kids=[l,r].filter(k=>k<size).map(k=>a[k]).join(" and ");
        show(`Compare ${a[i]} with its children ${kids}. Swap with the smaller child, ${a[m]}.`,i,m,edgeIndex(g,i,m));
        [a[i],a[m]]=[a[m],a[i]];i=m;
        show(`Swapped. ${a[i]} is now at index ${i}.`,i);
      }
    };
    if(mode==="push"){
      show(`A min-heap: every parent is no larger than its children. Push ${v}.`,-1);
      a.push(v);size++;
      show(`Put ${v} in the next free slot, index ${size-1}. The tree stays complete, but the heap rule may now be broken. Sift it up.`,size-1);
      up(size-1);
    }else if(mode==="pop"){
      show("A min-heap: the smallest value is always at the root. Pop it.",-1);
      popped.push(a[0]);
      show(`Remove the root, ${a[0]}. That is the answer. Now fill the hole with the last element, ${a[size-1]}, which keeps the tree complete.`,0);
      a[0]=a[size-1];size--;
      if(size>0){show(`${a[0]} moved to the root. It's probably too big for that spot, so sift it down.`,0);down(0)}
    }else{
      show("Build a heap from an unordered array. Go backwards from the last parent and sift each node down. Leaves are already valid heaps.",-1);
      for(let i=(size>>1)-1;i>=0;i--){show(`Sift down index ${i} (${a[i]}).`,i);down(i)}
    }
    show(mode==="push"?"Done. A push swaps at most once per level, so it costs O(log n).":mode==="pop"?"Done. A pop also costs at most one swap per level, so O(log n).":"Done. Every parent is no larger than its children. Building this way costs O(n), not O(n log n).",-1);
    return S.frames;
  }

  function vizBlock(b){
    const g=graphFor(b),box=el("div","lr-viz"),head=el("div","vt",b.title||"");box.appendChild(head);
    const body=el("div","vb");box.appendChild(body);
    const G=drawGraph(g);body.appendChild(G.svg);
    if(b.viz==="graph"||b.viz==="tree"||b.viz==="heap"){body.style.gridTemplateColumns="1fr";return box}
    const side=el("div","side");body.appendChild(side);
    if(b.viz==="adj"){
      const adj=adjOf(g),listBox=el("div"),mxBox=el("div"),edBox=el("div");
      listBox.appendChild(el("h6",null,"Adjacency list"));const lt=el("div","adjtab");listBox.appendChild(lt);
      const rows=adj.map((a,i)=>{const r=el("div",null,`${i}: [${a.join(", ")}]`);lt.appendChild(r);return r});
      mxBox.appendChild(el("h6",null,"Adjacency matrix"));
      const mx=el("table","mx"),hr=el("tr");hr.appendChild(el("th"));for(let j=0;j<g.n;j++)hr.appendChild(el("th",null,String(j)));mx.appendChild(hr);
      const mrows=adj.map((a,i)=>{const tr=el("tr");tr.appendChild(el("th",null,String(i)));for(let j=0;j<g.n;j++){const on=a.includes(j);tr.appendChild(el("td",on?"one":null,on?"1":"0"))}mx.appendChild(tr);return tr});
      mxBox.appendChild(mx);
      edBox.appendChild(el("h6",null,"Edge list"));edBox.appendChild(el("div","adjtab",JSON.stringify(g.edges).replace(/\],\[/g,"], [")));
      side.append(listBox,mxBox,edBox);
      const cap=el("div","cap","Click a vertex to highlight its neighbors, its adjacency-list entry and its matrix row.");box.appendChild(cap);
      const pick=i=>{
        G.nodes.forEach((n,k)=>G.setNode(k,"pick"+(k===i?" sel":adj[i].includes(k)?" nb":"")));
        G.edges.forEach((e,k)=>G.setEdge(k,e.u===i||e.v===i?"tree":""));
        rows.forEach((r,k)=>r.classList.toggle("on",k===i));mrows.forEach((r,k)=>r.classList.toggle("on",k===i));
        cap.textContent=`Vertex ${i} has ${adj[i].length} neighbor${adj[i].length===1?"":"s"}: adj[${i}] = [${adj[i].join(", ")}], and row ${i} of the matrix has a 1 in column${adj[i].length===1?"":"s"} ${adj[i].join(", ")||"(none)"}.`;
      };
      G.svg.removeAttribute("role");
      G.nodes.forEach((n,i)=>{
        G.setNode(i,"pick");n.g.setAttribute("tabindex","0");n.g.setAttribute("role","button");n.g.setAttribute("aria-label","Vertex "+i);
        n.g.addEventListener("click",()=>pick(i));n.g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick(i)}});
      });
      return box;
    }
    const frames=GEN[b.viz](g,b.value!==undefined?b.value:b.start||0),dsBox=el("div"),outBox=el("div");
    side.append(dsBox,outBox);
    const cap=el("div","cap");box.appendChild(cap);
    const ctl=el("div","ctl");box.appendChild(ctl);
    let k=0,timer=0;
    const chips=(host,d)=>{
      host.replaceChildren();if(!d)return;
      host.appendChild(el("h6",null,d.t));const c=el("div","chips");host.appendChild(c);
      if(!d.items.length)c.appendChild(el("em",null,"empty"));
      d.items.forEach((x,j)=>c.appendChild(el("span",j===d.hot?"hot":null,String(x))));
    };
    const draw=()=>{
      const f=frames[k];
      f.cls.forEach((c,i)=>G.setNode(i,c,f.lab[i]));
      if(f.val)f.val.forEach((x,i)=>G.setText(i,x==null?"":x));
      G.edges.forEach((e,i)=>G.setEdge(i,f.cls[e.u]==="off"||f.cls[e.v]==="off"?"off":i===f.act?"act":f.gone.has(i)?"gone":f.tree.has(i)?"tree":""));
      chips(dsBox,f.ds);chips(outBox,f.out);
      cap.textContent=f.say;head.lastChild.textContent=`Step ${k+1} / ${frames.length}`;
      range.value=k;play.textContent=timer?"❚❚ Pause":k===frames.length-1?"↺ Replay":"▶ Play";
    };
    head.appendChild(el("span"));
    const stop=()=>{clearInterval(timer);timer=0};
    const prev=btn("◀",()=>{stop();if(k>0){k--;draw()}}),next=btn("▶",()=>{stop();if(k<frames.length-1){k++;draw()}});
    prev.title="Previous step";next.title="Next step";
    const play=btn("▶ Play",()=>{
      if(timer){stop();draw();return}
      if(k===frames.length-1)k=0;
      timer=setInterval(()=>{if(!box.isConnected){stop();return}if(k<frames.length-1){k++;draw()}else{stop();draw()}},1100);draw();
    },"play");
    const range=el("input");range.type="range";range.min=0;range.max=frames.length-1;range.oninput=()=>{stop();k=+range.value;draw()};
    const reset=btn("⟲",()=>{stop();k=0;draw()});reset.title="Back to the start";
    ctl.append(play,prev,next,range,reset);
    box.tabIndex=0;box.onkeydown=e=>{if(e.target!==box)return;if(e.key==="ArrowRight"){next.click();e.preventDefault()}else if(e.key==="ArrowLeft"){prev.click();e.preventDefault()}};
    draw();
    return box;
  }

  // ---------- adjacency-list drill ----------
  function drillBlock(){
    const box=el("div","lr-drill"),dh=el("div","dh"),db=el("div","db");box.append(dh,db);
    let directed=false,mode="pic",g=null,answer=[];
    const D=prog.drill;
    const seg=(opts,get,set)=>{const s=el("div","seg");opts.forEach(([v,l])=>{const b=btn(l,()=>{set(v);[...s.children].forEach(x=>x.classList.toggle("on",x===b));fresh()});if(get()===v)b.classList.add("on");s.appendChild(b)});return s};
    const st=el("span","st");
    const stat=()=>{st.textContent=D.total?`Streak ${D.streak||0} · best ${D.best||0} · ${D.right}/${D.total} correct`:"Your first one"};
    dh.append(seg([[false,"Undirected"],[true,"Directed"]],()=>directed,v=>directed=v),seg([["pic","Picture"],["list","Edge list"]],()=>mode,v=>mode=v),el("span","sp"),st,btn("New graph",()=>fresh(),"ghost"));
    const randGraph=()=>{
      const n=5+Math.floor(Math.random()*2),pairs=[];
      for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)pairs.push([a,b]);
      for(let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
      const m=n-1+Math.floor(Math.random()*3);
      const edges=pairs.slice(0,m).map(([a,b])=>directed&&Math.random()<.5?[b,a]:[a,b]);
      const pos=Array.from({length:n},(_,i)=>{const t=-Math.PI/2+i*2*Math.PI/n;return [50+38*Math.cos(t),30+25*Math.sin(t)]});
      return {n,edges,directed,pos,r:5,vb:"4 -2 92 64"};
    };
    function fresh(){
      g=randGraph();answer=adjOf(g);stat();
      db.replaceChildren();
      const pic=el("div","pic");db.appendChild(pic);
      if(mode==="pic")pic.appendChild(drawGraph(g).svg);
      else pic.appendChild(el("pre",null,`n = ${g.n}\nedges = ${JSON.stringify(g.edges).replace(/\],\[/g,"], [")}\n${directed?"directed: [from, to]":"undirected"}`));
      const rows=el("div","rows");db.appendChild(rows);
      rows.appendChild(el("div","st",directed?"Write each vertex's outgoing neighbors, e.g. 1, 3":"Write each vertex's neighbors, e.g. 1, 3"));
      const inputs=answer.map((_,i)=>{
        const r=el("div","row"),lab=el("label",null,`adj[${i}]`),inp=el("input"),fix=el("span","fix");
        inp.placeholder="(none)";inp.autocomplete="off";inp.spellcheck=false;inp.setAttribute("aria-label",`Neighbors of ${i}`);
        inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check.click()}};
        r.append(lab,inp,fix);rows.appendChild(r);return {r,inp,fix};
      });
      const acts=el("div","acts"),msg=el("span","msg");
      let checked=false;
      const check=btn("Check",()=>{
        let ok=0;
        inputs.forEach(({r,inp,fix},i)=>{
          const got=(inp.value.match(/\d+/g)||[]).map(Number).sort((a,b)=>a-b),want=[...answer[i]].sort((a,b)=>a-b);
          const good=got.length===want.length&&got.every((x,j)=>x===want[j]);
          r.classList.toggle("ok",good);r.classList.toggle("no",!good);fix.textContent="";if(good)ok++;
        });
        const all=ok===inputs.length;
        msg.className="msg "+(all?"ok":"no");msg.textContent=all?"All correct 🎉":`${ok} of ${inputs.length} rows right. Fix the red ones, or reveal.`;
        if(!checked){checked=true;D.total++;if(all){D.right++;D.streak=(D.streak||0)+1;D.best=Math.max(D.best||0,D.streak)}else D.streak=0;save();stat()}
        if(all)setTimeout(()=>{if(box.isConnected&&g===cur)fresh()},1400);
      },"cta");
      const cur=g;
      const reveal=btn("Reveal",()=>{inputs.forEach(({fix},i)=>fix.textContent=`[${answer[i].join(",")}]`);if(!checked){checked=true;D.total++;D.streak=0;save();stat()}},"ghost");
      acts.append(check,reveal,msg);rows.appendChild(acts);
    }
    fresh();
    return box;
  }

  // ---------- views ----------
  let route="",cleanup=[],drawer=null;
  const runCleanup=()=>{cleanup.forEach(f=>{try{f()}catch(e){}});cleanup=[]};
  const go=h=>{if(location.hash!==h)location.hash=h;else render(true)};
  const crumbs=(parts)=>{
    const c=el("nav","crumbs");
    parts.forEach(([t,h],i)=>{if(i)c.appendChild(document.createTextNode("›"));if(h){const a=el("a",null,t);a.onclick=()=>go(h);c.appendChild(a)}else c.appendChild(el("span",null,t))});
    return c;
  };
  const trackStats=t=>{
    const ls=t.lessons.map(l=>peekLp(t,l));
    return {done:ls.filter(x=>x.done).length,due:t.lessons.filter(l=>isDue(peekLp(t,l))),flag:t.lessons.filter(l=>peekLp(t,l).revisit),
      parts:t.lessons.reduce((a,l)=>a+l.parts.length,0),partsDone:t.lessons.reduce((a,l)=>a+partsDone(t,l),0)};
  };
  const nextLesson=t=>{
    const last=t.lessons.find(l=>prog.last===lkey(t,l));
    if(last&&!peekLp(t,last).done)return last;
    return t.lessons.find(l=>!peekLp(t,l).done)||null;
  };

  function viewHome(){
    const w=el("div","lr lr-home");
    w.appendChild(el("h1",null,"Learning"));
    w.appendChild(el("p","lede","The fundamentals behind interview problems, taught step by step and practiced until they're automatic. Each track ends with the LeetCode problems and system design questions it prepares you for."));
    const recent=LEARN_TRACKS.map(t=>[t,t.lessons.find(l=>prog.last===lkey(t,l))]).find(x=>x[1]);
    if(recent){
      const [t,l]=recent,c=el("div","lr-cont"),tx=el("div","t");
      tx.append(el("small",null,"Pick up where you left off"),el("b",null,`${t.title} · ${l.title}`));
      c.append(tx,btn("Continue →",()=>go(`#learn/${t.id}/${l.id}`),"cta"));w.appendChild(c);
    }
    const cards=el("div","lr-cards");w.appendChild(cards);
    LEARN_TRACKS.forEach(t=>{
      const s=trackStats(t),c=el("button","lr-card");c.type="button";c.onclick=()=>go("#learn/"+t.id);
      c.append(el("div","ic",t.icon),el("h3",null,t.title),el("p",null,t.tagline));
      const bot=el("div","bot"),bar=el("div","lr-bar"),fill=el("i");fill.style.width=(100*s.done/t.lessons.length)+"%";bar.appendChild(fill);
      bot.append(bar,el("span","pill",`${s.done}/${t.lessons.length} lessons`));
      if(s.due.length)bot.appendChild(el("span","pill due",`${s.due.length} due`));
      c.appendChild(bot);cards.appendChild(c);
    });
    const soon=el("div","lr-card soon");
    soon.append(el("div","ic","🌱"),el("h3",null,"More tracks coming"),el("p",null,"Dynamic programming is next: the same learn → practice → LeetCode path."));
    cards.appendChild(soon);
    return w;
  }

  function viewTrack(t){
    const w=el("div","lr"),s=trackStats(t);
    w.appendChild(crumbs([["Learning","#learn"],[t.title]]));
    const hero=el("div","lr-hero"),L=el("div");hero.appendChild(L);
    L.append(el("h1",null,`${t.icon} ${t.title}`),el("p","tag",t.tagline));
    const ul=el("ul");t.outcomes.forEach(o=>ul.appendChild(el("li",null,o)));L.appendChild(ul);
    const nl=nextLesson(t),acts=el("div");acts.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center";
    if(nl){const i=t.lessons.indexOf(nl);acts.appendChild(btn(s.done||prog.last?`Continue: ${i+1}. ${nl.title} →`:`Start lesson 1: ${nl.title} →`,()=>go(`#learn/${t.id}/${nl.id}`),"cta"))}
    else acts.appendChild(el("span","pill ok","✓ Every lesson complete"));
    acts.appendChild(btn("Ready for LeetCode ↓",()=>readyBox.scrollIntoView({behavior:"smooth",block:"start"}),"ghost"));
    L.appendChild(acts);
    const R=el("div","lr-ring");R.appendChild(ring(s.done,t.lessons.length));
    const st=el("div","stats");
    st.appendChild(el("span",null,`${s.partsDone} of ${s.parts} practice steps done`));
    if(s.due.length)st.appendChild(el("span",null,`↻ ${s.due.length} lesson${s.due.length>1?"s":""} due for review`));
    if(s.flag.length)st.appendChild(el("span",null,`⚑ ${s.flag.length} flagged to revisit`));
    R.appendChild(st);hero.appendChild(R);w.appendChild(hero);

    if(s.due.length){
      const c=el("div","lr-cont"),tx=el("div","t");
      tx.append(el("small",null,"Due for review"),el("b",null,s.due.map(l=>l.title).join(" · ")));
      c.append(tx,btn("Review now →",()=>go(`#learn/${t.id}/${s.due[0].id}`),"cta"));w.appendChild(c);
    }

    w.appendChild(el("div","lr-sec","The path"));
    const path=el("div","lr-path");w.appendChild(path);
    const step=(node,card,cls)=>{const r=el("div","lr-step"+(cls?" "+cls:"")),rail=el("div","rail");rail.appendChild(node);r.append(rail,card);path.appendChild(r)};
    t.lessons.forEach((l,i)=>{
      const x=peekLp(t,l),pd=partsDone(t,l),due=isDue(x);
      if(l.system){
        const n=el("div","lr-node");n.appendChild(el("span",null,"🏁"));
        const c=el("button","lr-lc");c.type="button";c.onclick=()=>readyBox.scrollIntoView({behavior:"smooth",block:"start"});
        const solved=t.ready.filter(([sl])=>progress[sl]&&progress[sl].done).length;
        c.append(el("div","eb","Checkpoint"),el("h3",null,"Ready for LeetCode"),el("p",null,`${t.ready.length} real interview problems, ordered from easy to hard. You've solved ${solved} so far.`));
        step(n,c,"check"+(solved===t.ready.length?" done":""));
      }
      const n=el("div","lr-node",x.done?"✓":String(i+1));
      const c=el("button","lr-lc");c.type="button";c.onclick=()=>go(`#learn/${t.id}/${l.id}`);
      const eb=el("div","eb",`Lesson ${i+1}${l.system?" · System design":""}`);
      if(x.done)eb.appendChild(el("span","pill ok","Complete"));
      if(due)eb.appendChild(el("span","pill due","↻ Review due"));
      if(x.revisit)eb.appendChild(el("span","pill flag","⚑ Revisit"));
      if(x.note)eb.appendChild(el("span","pill","📝 Notes"));
      const gp=el("p");inline(gp,l.goal);c.append(eb,el("h3",null,l.title),gp);
      const meta=el("div","meta"),bar=el("div","lr-bar"),fill=el("i");fill.style.width=(100*pd/l.parts.length)+"%";bar.appendChild(fill);
      meta.append(el("span",null,`⏱ ${l.mins} min`),bar,el("span",null,`${pd}/${l.parts.length} practice`));
      c.appendChild(meta);
      step(n,c,x.done?"done":l===nl?"cur":"");
    });

    const readyBox=el("div");w.appendChild(readyBox);
    readyBox.appendChild(el("div","lr-sec","Ready for LeetCode"));
    readyBox.appendChild(el("p","sub",`Work through these in order once lessons 1–${t.lessons.filter(l=>!l.system).length} feel solid. Each one opens the same editor and walkthrough as the LeetCode tab, and solving it there marks it here.`));
    const grid=el("div","lr-ready");readyBox.appendChild(grid);
    t.ready.forEach(([slug,lid],i)=>{
      const r=DATA.find(x=>x[6]===slug);if(!r)return;
      const done=progress[slug]&&progress[slug].done,l=t.lessons.find(x=>x.id===lid);
      const c=el("div","lr-prob"+(done?" done":"")),h=el("div","h");
      h.append(el("span","pill"+(done?" ok":""),done?"✓":String(i+1)),el("b",null,r[2]),el("span","d-"+r[1],DN[r[1]]));
      const via=el("div","via","Builds on ");const a=el("a",null,l.title);a.onclick=()=>go(`#learn/${t.id}/${l.id}`);via.appendChild(a);
      const acts=el("div","acts");
      acts.append(btn("✏️ Solve",()=>openPractice(slug)),btn("🎓 Walkthrough",()=>openLearn(slug)));
      c.append(h,via,acts);grid.appendChild(c);
    });
    return w;
  }

  // ---------- lesson ----------
  function viewLesson(t,l){
    const w=el("div","lr"),i=t.lessons.indexOf(l),x=lp(t,l);
    prog.last=lkey(t,l);x.seen=today();save();
    const prevL=t.lessons[i-1],nextL=t.lessons[i+1];
    const cr=crumbs([["Learning","#learn"],[t.title,"#learn/"+t.id],[`Lesson ${i+1} of ${t.lessons.length}`]]);
    cr.appendChild(el("span","sp"));
    if(prevL)cr.appendChild(btn("← Prev",()=>go(`#learn/${t.id}/${prevL.id}`),"ghost"));
    if(nextL)cr.appendChild(btn("Next →",()=>go(`#learn/${t.id}/${nextL.id}`),"ghost"));
    w.appendChild(cr);

    const head=el("div","lr-lhead");w.appendChild(head);
    const goal=el("p","goal");inline(goal,l.goal);
    head.append(el("div","no",`Lesson ${i+1}${l.system?" · System design":""}`),el("h1",null,l.title),goal);
    const acts=el("div","acts");head.appendChild(acts);
    const doneB=btn("",null,"ghost lr-done-b"),flagB=btn("",null,"ghost lr-flag"),info=el("span","info");
    acts.append(doneB,flagB,info);
    const syncHead=()=>{
      const due=isDue(x),dd=daysUntilDue(x),all=partsDone(t,l)===l.parts.length;
      doneB.textContent=due?"↻ Mark reviewed":x.done?"✓ Complete":"Mark lesson complete";
      doneB.classList.toggle("on",x.done&&!due);doneB.classList.toggle("nudge",(!x.done&&all)||due);
      flagB.textContent=x.revisit?"⚑ Flagged to revisit":"⚑ Revisit later";flagB.classList.toggle("on",!!x.revisit);
      info.textContent=`⏱ ${l.mins} min · ${partsDone(t,l)}/${l.parts.length} practice steps`+(x.done?(due?" · review due today":dd!=null?` · next review in ${dd} day${dd===1?"":"s"}`:""):"")+(x.times>1?` · reviewed ${x.times-1}×`:"");
    };
    doneB.onclick=()=>{
      if(isDue(x)){x.times++;x.last=today();toast("Reviewed. See you in "+INTERVALS[Math.min(x.times,3)-1]+" days.")}
      else if(x.done){x.done=false;x.times=0;delete x.last}
      else{x.done=true;x.times=Math.max(1,x.times||0);x.last=today();toast("Lesson complete 🎉 It'll come back for review in 3 days.")}
      save();syncHead();
    };
    flagB.onclick=()=>{x.revisit=!x.revisit;if(!x.revisit)delete x.revisit;save();syncHead()};
    syncHead();

    const grid=el("div","lr-grid"),main=el("div","lr-main"),aside=el("aside","lr-aside");grid.append(main,aside);w.appendChild(grid);

    // Learn
    const learnH=el("h2","lr-h2","Learn");learnH.id="lr-learn";learnH.style.marginTop="0";main.appendChild(learnH);
    const read=el("div","lr-read");main.appendChild(read);
    l.blocks.forEach(b=>{
      if(b.md)read.appendChild(md(b.md));
      else if(b.tpl){
        const box=el("div","lr-tpl"),th=el("div","th");th.append(el("span",null,"Template"),el("b",null,b.title||""));
        const cp=btn("Copy",()=>{navigator.clipboard&&navigator.clipboard.writeText(b.tpl).then(()=>{cp.textContent="Copied";setTimeout(()=>cp.textContent="Copy",1200)},()=>{})});th.appendChild(cp);
        box.append(th,codeEl(b.tpl));read.appendChild(box);
      }
      else if(b.tip||b.warn){const c=el("div","lr-call "+(b.tip?"tip":"warn"));c.append(el("span","i",b.tip?"💡":"⚠️"),el("div",null,b.tip||b.warn));read.appendChild(c)}
      else if(b.viz)read.appendChild(vizBlock(b));
      else if(b.drill)read.appendChild(drillBlock());
    });

    // Practice
    const prH=el("h2","lr-h2","Practice");prH.id="lr-practice";main.appendChild(prH);
    main.appendChild(el("p","sub","Code runs in your browser against real tests. Checks are instant. Written answers get feedback from the AI tutor."));
    const parts=el("div","lr-parts");main.appendChild(parts);
    const tocDots={};
    const onPartChange=()=>{l.parts.forEach(p=>{const d=tocDots[p.id];if(d){const ok=!!(x.parts&&x.parts[p.id]&&x.parts[p.id].ok);d.classList.toggle("ok",ok);d.textContent=ok?"✓":""}});syncHead();tocCount.textContent=`${partsDone(t,l)}/${l.parts.length} done`};
    const ctx={t,l,x,root:w,onChange:onPartChange,state:p=>pp(t,l,p),save,reviewBody:(p,answer)=>({kind:"explain",track:t.title,lesson:l.title,goal:l.goal,prompt:p.prompt,rubric:p.rubric,answer})};
    let codeNo=0;
    l.parts.forEach((p,k)=>{
      const card=p.type==="code"?codePart(ctx,p,k):p.type==="quiz"?quizPart(ctx,p,k):explainPart(ctx,p,k);
      if(p.type==="code")codeNo++;
      parts.appendChild(card);
    });

    // Next up
    const nxH=el("h2","lr-h2","Next up");nxH.id="lr-next";main.appendChild(nxH);
    const nx=el("div","lr-next");main.appendChild(nx);
    if(l.leetcode.length){
      nx.appendChild(el("p","sub","LeetCode problems this lesson unlocks. Solving one in the LeetCode tab counts there too."));
      const chips=el("div","lr-chips");nx.appendChild(chips);
      l.leetcode.forEach(slug=>{
        const r=DATA.find(y=>y[6]===slug);if(!r)return;
        const done=progress[slug]&&progress[slug].done,c=el("span","lr-chip"+(done?" done":""));
        c.append(el("span",null,(done?"✓ ":"")+r[2]),el("span","d-"+r[1],DN[r[1]]),btn("Solve",()=>openPractice(slug)),btn("Walkthrough",()=>openLearn(slug)));
        chips.appendChild(c);
      });
    }
    if(nextL){
      const b=el("button","lr-nextl");b.type="button";b.onclick=()=>go(`#learn/${t.id}/${nextL.id}`);
      const tx=el("div");tx.append(el("small",null,`Lesson ${i+2}`),el("b",null,nextL.title));
      b.append(tx,el("span","ar","→"));nx.appendChild(b);
    }else{
      const b=el("button","lr-nextl");b.type="button";b.onclick=()=>{go("#learn/"+t.id)};
      const tx=el("div");tx.append(el("small",null,"Track complete"),el("b",null,"Back to the path, and the LeetCode checklist"));
      b.append(tx,el("span","ar","🏁"));nx.appendChild(b);
    }

    // Aside: on this page, notes, tutor
    const tocB=el("div","lr-box"),tocCount=el("span");tocCount.style.cssText="float:right;text-transform:none;letter-spacing:0;font-weight:600";
    const h5=el("h5",null,"On this page");h5.appendChild(tocCount);tocB.appendChild(h5);
    const toc=el("div","lr-toc");tocB.appendChild(toc);
    const link=(text,target,dot)=>{const a=el("a");if(dot)a.appendChild(dot);a.appendChild(el("span",null,text));a.onclick=()=>target.scrollIntoView({behavior:"smooth",block:"start"});toc.appendChild(a)};
    link("Learn",learnH);
    toc.appendChild(el("div","sub","Practice"));
    l.parts.forEach(p=>{const d=el("span","dot");tocDots[p.id]=d;link(p.type==="quiz"?(p.q.length>40?p.q.slice(0,38).trim()+"…":p.q):p.title,parts.querySelector("#lr-p-"+p.id),d)});
    link("Next up",nxH);
    aside.appendChild(tocB);
    const noteB=el("div","lr-box lr-note");noteB.appendChild(el("h5",null,"Your notes"));
    const ta=el("textarea"),ns=el("div","s");ta.placeholder="Patterns, gotchas, the template in your own words…";ta.value=x.note||"";
    let nt=0;ta.oninput=()=>{ns.textContent="…";clearTimeout(nt);nt=setTimeout(()=>{if(ta.value.trim())x.note=ta.value;else delete x.note;save();ns.textContent="Saved"},400)};
    noteB.append(ta,ns);aside.appendChild(noteB);
    aside.appendChild(btn("💬 Ask the tutor",()=>openTutor(t,l),"lr-tutor-b"));
    onPartChange();
    return w;
  }


  function codePart(ctx,p,k){
    const {t,l}=ctx,{card,pb,st,n}=partShell(p,k,p.kind==="class"?"Code · build a class":"Code · exercise"),s=pp(t,l,p);
    const dkey=`learn-draft-${t.id}-${l.id}-${p.id}`;
    const ex={function_name:p.fn,kind:p.kind||"function",compare:p.compare||"exact",arg_types:p.argTypes||[],return_type:p.returnType||"plain",
      tests:p.tests.map(([name,inp,exp])=>({name,input_json:JSON.stringify(inp),expected_json:JSON.stringify(exp)}))};
    const status=()=>{
      const bits=[];
      if(s.ok)bits.push(`✓ Solved${s.reps>1?` ×${s.reps}`:""}`);
      if(s.best)bits.push(`best drill ${fmt(s.best)}`);
      st.textContent=bits.join(" · ");
      if(s.ok){card.classList.add("ok");n.textContent="✓"}
    };
    pb.appendChild(mdEl(p.prompt));
    const edBox=el("div","lr-ed");pb.appendChild(edBox);
    const readDraft=()=>{try{return localStorage.getItem(dkey)}catch(e){return null}};
    const writeDraft=v=>{try{localStorage.setItem(dkey,v)}catch(e){}};
    const ph=el("pre","ph",readDraft()||p.starter);edBox.appendChild(ph);
    const tools=el("div","lr-tools");pb.appendChild(tools);
    const runB=btn("▶ Run tests",()=>run(),"run"),resetB=btn("Reset"),fmtB=btn("Format",()=>ed&&formatCode(ed)),drillB=btn("🧠 Drill from memory"),
      hintB=btn("💡 Hint"),solB=btn("👀 Solution"),aiB=btn("🤖 AI review"),askB=btn("💬 Ask tutor",()=>openTutor(t,l,p,()=>ed?ed.getValue():"")),tm=el("span","tm");
    runB.title="Cmd/Ctrl+Enter";drillB.title="Wipe the editor, hide the templates, and time yourself writing it from scratch";
    tools.append(runB,resetB,fmtB,drillB,hintB,solB,aiB,askB,el("span","sp"),tm);
    const hintBox=el("div","lr-hintbox"),solBox=el("div","lr-sol"),res=el("div","lr-res"),ai=el("div","lr-ai");
    hintBox.hidden=solBox.hidden=ai.hidden=true;pb.append(hintBox,solBox,res,ai);
    let ed=null,running=false,lastSum="",lastKey="",drill=null;
    const ensureEd=async()=>{
      if(ed)return ed;
      await loadCM();
      if(ed)return ed;
      ph.remove();ed=makeEditor(edBox,{value:readDraft()||p.starter,run:()=>run()});
      ed.on("change",()=>writeDraft(ed.getValue()));
      return ed;
    };
    // Editors are created when the card scrolls into view (or on first click), so a lesson with several exercises loads fast.
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();ensureEd().catch(()=>{ph.textContent="The editor loads from a CDN, so it needs internet."})}},{rootMargin:"300px"});
    io.observe(edBox);cleanup.push(()=>io.disconnect());
    ph.onclick=()=>ensureEd();

    let armReset=0;
    resetB.onclick=async()=>{
      if(!armReset){resetB.textContent="Click again to reset";resetB.classList.add("arm");armReset=setTimeout(()=>{armReset=0;resetB.textContent="Reset";resetB.classList.remove("arm")},3000);return}
      clearTimeout(armReset);armReset=0;resetB.textContent="Reset";resetB.classList.remove("arm");
      (await ensureEd()).setValue(p.starter);res.replaceChildren();
    };
    hintB.onclick=()=>{
      hintBox.hidden=!hintBox.hidden;
      if(!hintBox.hidden&&!hintBox.firstChild){const c=el("div","lr-call tip");c.append(el("span","i","💡"),el("div",null,p.hint));hintBox.appendChild(c)}
    };
    solB.onclick=()=>{
      if(drill){toast("Finish or stop the drill first.");return}
      solBox.hidden=!solBox.hidden;solB.textContent=solBox.hidden?"👀 Solution":"Hide solution";
      if(!solBox.hidden&&!solBox.firstChild){
        const c=el("div","lr-call tip");c.append(el("span","i","🧠"),el("div",null,"Read it, close it, then use Drill from memory to write it yourself. Typing it out once is worth more than reading it five times."));
        solBox.append(c,codeEl(p.solution));solBox.lastChild.className="lr-pre";
      }
    };
    // Drill: start from the starter with templates and solutions blurred, timed; finishing (all tests pass) records the time.
    let armDrill=0;
    const stopDrill=()=>{if(!drill)return;clearInterval(drill.tick);drill=null;tm.textContent="";drillB.textContent="🧠 Drill from memory";ctx.root.classList.remove("drilling")};
    cleanup.push(stopDrill);
    drillB.onclick=async()=>{
      if(drill){stopDrill();toast("Drill stopped.");return}
      if(!armDrill){drillB.textContent="Wipe the editor and start?";drillB.classList.add("arm");armDrill=setTimeout(()=>{armDrill=0;drillB.textContent="🧠 Drill from memory";drillB.classList.remove("arm")},3500);return}
      clearTimeout(armDrill);armDrill=0;drillB.classList.remove("arm");
      const e=await ensureEd();e.setValue(p.starter);e.focus();res.replaceChildren();solBox.hidden=true;hintBox.hidden=true;solB.textContent="👀 Solution";
      ctx.root.classList.add("drilling");
      drill={start:Date.now(),tick:setInterval(()=>{if(!card.isConnected){stopDrill();return}tm.textContent="⏱ "+fmt((Date.now()-drill.start)/1000)},500)};
      tm.textContent="⏱ 0:00";drillB.textContent="■ Stop drill";
    };

    const short=v=>{v=String(v==null?"":v);return v.length>220?v.slice(0,220)+"…":v};
    async function run(){
      if(running)return;
      const e=await ensureEd().catch(()=>null);if(!e)return;
      const code=e.getValue();writeDraft(code);
      running=true;runB.disabled=true;runB.textContent="Running…";
      const con=[];
      const r=await runTests(code,ex,{onOut:s=>con.push(s)});
      running=false;runB.disabled=false;runB.textContent="▶ Run tests";
      if(!card.isConnected)return;
      lastSum=summarize(ex.tests,r);lastKey=code;
      res.replaceChildren();
      if(r.fatal){res.appendChild(el("div","sum no","✗ "+r.fatal));return}
      const passed=ex.tests.filter((_,i)=>r.cases[i]&&r.cases[i].pass===true).length,all=passed===ex.tests.length;
      const sum=el("div","sum "+(all?"ok":"no"),all?`✓ All ${passed} tests pass`:`${passed} / ${ex.tests.length} tests pass`);
      const dots=el("span","dots");ex.tests.forEach((_,i)=>dots.appendChild(el("i",r.cases[i]&&r.cases[i].pass?"ok":null)));sum.appendChild(dots);res.appendChild(sum);
      if(r.err)res.appendChild(el("pre",null,r.err.trim()));
      if(r.timedOut)res.appendChild(el("pre",null,"Stopped: took longer than 10s. Infinite loop, or an O(n²) step on a big input?"));
      ex.tests.forEach((tc,i)=>{
        const c=r.cases[i];if(c&&c.pass)return;
        const d=el("details");if(!res.querySelector("details"))d.open=true;
        d.appendChild(el("summary",null,`✗ ${tc.name}`));
        d.appendChild(el("pre",null,c?[`input:    ${short(tc.input_json)}`,c.err?`error:    ${c.err}`:`got:      ${short(c.got)}`,`expected: ${short(c.expected)}`].join("\n"):"not run"));
        res.appendChild(d);
      });
      if(con.length){res.appendChild(el("div","con",con.join("").slice(-4000)))}
      if(all){
        const first=!s.ok;s.ok=true;s.reps=(s.reps||0)+1;
        if(drill){
          const secs=Math.round((Date.now()-drill.start)/1000),pb2=!s.best||secs<s.best;
          if(pb2)s.best=secs;stopDrill();
          toast(pb2?`Drilled from memory in ${fmt(secs)}. Personal best! 🧠`:`Drilled in ${fmt(secs)} (best ${fmt(s.best)})`);
        }else if(first)toast("Solved! 🎉 Try Drill from memory to lock it in.");
        save();status();if(first)markOk(ctx,p,card,n);else ctx.onChange();
      }
    }
    aiB.onclick=async()=>{
      const e=await ensureEd().catch(()=>null);if(!e)return;
      const code=e.getValue();if(!code.trim()||code.trim()===p.starter.trim()){toast("Write some code first.");return}
      aiB.disabled=true;
      if(lastKey!==code)await run();
      ai.hidden=false;ai.classList.add("busy");ai.replaceChildren(el("div","hd","AI review"));
      const out=el("div","lr-md");ai.appendChild(out);
      try{
        const r=await apiFetch("/api/learn/review",{method:"POST",body:JSON.stringify({kind:"code",track:t.title,lesson:l.title,goal:l.goal,title:p.title,prompt:p.prompt,code,results:lastSum.slice(0,3000)})});
        if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        await readStream(r,txt=>{if(out.isConnected)out.replaceChildren(md(txt))});
      }catch(err){out.replaceChildren(el("div","warn",errMsg(err)))}
      ai.classList.remove("busy");aiB.disabled=false;
    };
    status();
    return card;
  }

  // ---------- tutor drawer ----------
  const chatKey=(t,l)=>`learn-chat-${t.id}-${l.id}`;
  function lessonText(l){
    return l.blocks.map(b=>b.md||(b.tpl?"Template: "+(b.title||"")+"\n"+b.tpl:"")||b.tip||b.warn||(b.viz?`[Visualizer: ${b.title}]`:"")||(b.drill?"[Adjacency-list drill]":"")).filter(Boolean).join("\n\n").slice(0,29000);
  }
  function openTutor(t,l,p,getCode){
    if(!drawer){
      drawer=el("div","lr-drawer");drawer.setAttribute("role","dialog");drawer.setAttribute("aria-label","Tutor");
      document.body.appendChild(drawer);
      addEventListener("keydown",e=>{if(e.key==="Escape"&&drawer.classList.contains("open"))drawer.classList.remove("open")});
    }
    const key=chatKey(t,l);let msgs=readJSON(key,[]);if(!Array.isArray(msgs))msgs=[];
    let busy=false;
    drawer.replaceChildren();
    const dh=el("div","dh"),title=el("b",null,"Tutor");title.appendChild(el("small",null,l.title));
    const clear=btn("Clear",()=>{if(busy)return;msgs=[];writeJSON(key,msgs);draw()}),close=btn("✕",()=>drawer.classList.remove("open"));close.setAttribute("aria-label","Close");
    dh.append(title,clear,close);
    const list=el("div","msgs"),ctxLine=el("div","ctx",p?`Asking about: ${p.title} (the tutor sees your current code)`:"");
    const form=el("form"),ta=el("textarea"),send=el("button",null,"Send");send.type="submit";
    ta.placeholder="Ask anything about this lesson…";form.append(ta,send);
    drawer.append(dh,list,ctxLine,form);
    const draw=()=>{
      list.replaceChildren();
      if(!msgs.length){
        list.appendChild(el("div","empty","Stuck, curious, or want to check your understanding? The tutor has read this lesson."));
        const sg=el("div","sugg");
        [`Explain ${l.title.toLowerCase()} like I'm new to it`,"Quiz me with one question on this lesson","What mistakes do people make with this in interviews?"].forEach(q=>sg.appendChild(btn(q,()=>ask(q))));
        list.appendChild(sg);
      }
      msgs.forEach(m=>{const d=el("div","m "+(m.role==="user"?"u":"a"));if(m.role==="user")d.textContent=m.content;else d.appendChild(md(m.content));list.appendChild(d)});
      list.scrollTop=1e9;
    };
    const ask=async q=>{
      if(busy||!q.trim())return;
      busy=true;send.disabled=true;
      msgs.push({role:"user",content:q.trim().slice(0,4000)});draw();
      const a=el("div","m a busy");list.appendChild(a);list.scrollTop=1e9;
      const part=p?`${p.title}\n${p.prompt}\n\nTheir current code:\n${(getCode&&getCode()||"").slice(0,4000)}`:"";
      try{
        const res=await apiFetch("/api/learn/chat",{method:"POST",body:JSON.stringify({track:t.title,lesson:l.title,goal:l.goal,content:lessonText(l),part:part.slice(0,6000),messages:msgs.slice(-20)})});
        if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||"Request failed")}
        const text=await readStream(res,txt=>{a.classList.remove("busy");a.replaceChildren(md(txt));list.scrollTop=1e9});
        msgs.push({role:"assistant",content:text.slice(0,4000)||"(no reply)"});writeJSON(key,msgs.slice(-30));
      }catch(err){msgs.pop();a.classList.remove("busy");a.textContent=errMsg(err);ta.value=q}
      busy=false;send.disabled=false;
      if(msgs.length&&msgs[msgs.length-1].role==="assistant")draw();
    };
    form.onsubmit=e=>{e.preventDefault();const q=ta.value;ta.value="";ask(q)};
    ta.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit()}};
    draw();
    requestAnimationFrame(()=>{drawer.classList.add("open");ta.focus()});
  }

  // ---------- routing ----------
  function render(force){
    const h=location.hash.slice(1).split("/");
    if(h[0]!=="learn")return;
    const key=h.slice(1).join("/");
    if(key===route&&!force&&root().firstChild)return;
    route=key;runCleanup();
    if(drawer)drawer.classList.remove("open");
    const t=trackById(h[1]),l=t&&t.lessons.find(x=>x.id===h[2]);
    const v=l?viewLesson(t,l):t?viewTrack(t):viewHome();
    root().replaceChildren(v);
    scrollTo(0,0);
  }
  let ready=false;
  window.learnInit=function(){
    if(!ready){
      ready=true;
      injectCss();
    }
    render(false);
  };
})();

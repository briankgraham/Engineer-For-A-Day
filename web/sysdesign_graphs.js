// Architecture graphs for the cheat sheets, drawn by sdDiagram (sysdesign_diagram.js). Same shape as the AI walkthrough graph.
// Compact form per problem: n = [id,label,tech,kind], e = [from,to,label,flow]; expanded to {nodes,edges} below.
// kind: client edge service cache database queue worker storage external. flow: write read async control (default write).
window.SD_GRAPHS=(()=>{
const D={
"url-shortener":{
n:[["c","Client","browser / app","client"],["cdn","CDN / DNS","","edge"],["lb","Load balancer","","edge"],["app","App servers","stateless","service"],["cache","Cache","Redis: code to URL","cache"],["db","URL store","sharded by code","database"],["gen","Code generator","counter ranges","service"],["q","Click events","queue","queue"],["an","Analytics workers","","worker"],["as","Analytics store","","database"]],
e:[["c","cdn","","read"],["cdn","lb","miss","read"],["lb","app","","read"],["app","cache","lookup","read"],["app","db","cache miss","read"],["app","gen","new code","write"],["app","db","save mapping","write"],["app","q","click","async"],["q","an","","async"],["an","as","","async"]]},
"pastebin":{
n:[["c","Client","","client"],["cdn","CDN","hot pastes","edge"],["lb","Load balancer","","edge"],["app","App servers","stateless","service"],["key","Key service","pre-generated IDs","service"],["meta","Metadata DB","with replicas","database"],["blob","Object store","paste content","storage"],["cache","Cache","Redis","cache"],["gc","Cleanup worker","deletes expired","worker"]],
e:[["c","cdn","","read"],["cdn","lb","miss","read"],["lb","app","","write"],["app","cache","hot paste","read"],["app","key","get ID","write"],["app","meta","save metadata","write"],["app","blob","save content","write"],["gc","meta","find expired","control"],["gc","blob","delete","control"]]},
"id-generator":{
n:[["app","App service","","service"],["gen","ID generator","library per node","service"],["zk","Coordination","ZooKeeper / etcd","external"],["ntp","Clock","NTP","external"]],
e:[["app","gen","next ID","write"],["zk","gen","machine ID lease (startup)","control"],["ntp","gen","time","control"]]},
"rate-limiter":{
n:[["c","Client","","client"],["gw","API gateway","limiter middleware","edge"],["rules","Rules config","local cache","service"],["redis","Counters","Redis, sharded by key","cache"],["app","App servers","","service"]],
e:[["c","gw","request","write"],["gw","rules","read limits","control"],["gw","redis","check + increment","write"],["gw","app","allowed","write"],["gw","c","429 if over limit","read"]]},
"kv-store":{
n:[["c","Client","","client"],["co","Coordinator node","any node","service"],["ring","Hash ring","consistent hashing","service"],["r1","Replica nodes","N copies","database"],["log","Commit log","","storage"],["lsm","Memtable + SSTables","LSM tree","database"],["g","Gossip","membership, failures","service"],["ae","Anti-entropy","Merkle trees","worker"]],
e:[["c","co","get / put","write"],["co","ring","locate key","write"],["co","r1","W acks / R replies","write"],["r1","log","append","write"],["r1","lsm","flush","write"],["g","r1","health","control"],["ae","r1","repair","async"]]},
"news-feed":{
n:[["c","Client","","client"],["post","Post service","","service"],["pdb","Posts DB","","database"],["media","Media store","object store + CDN","storage"],["q","Fan-out queue","","queue"],["fw","Fan-out workers","","worker"],["feed","Feed lists","Redis, post IDs","cache"],["fs","Feed service","","service"],["pc","Post cache","hydrate IDs","cache"]],
e:[["c","post","create post","write"],["post","pdb","","write"],["post","media","","write"],["post","q","","async"],["q","fw","","async"],["fw","feed","push to followers","async"],["c","fs","open feed","read"],["fs","feed","post IDs","read"],["fs","pc","hydrate","read"],["pc","pdb","miss","read"],["fs","pdb","celebrity posts","read"]]},
"chat":{
n:[["a","Client A","WebSocket","client"],["s1","Chat server 1","","service"],["store","Message store","Cassandra","database"],["reg","Session registry","user to server","cache"],["br","Broker","server to server","queue"],["s2","Chat server 2","","service"],["b","Client B","WebSocket","client"],["push","Push service","APNs / FCM","external"]],
e:[["a","s1","send","write"],["s1","store","persist first","write"],["s1","reg","find B","read"],["s1","br","route","write"],["br","s2","","write"],["s2","b","deliver","write"],["s1","push","B offline","async"],["b","store","pull on reconnect","read"]]},
"notifications":{
n:[["svc","Services","callers","client"],["api","Notification API","","edge"],["q","Priority queues","Kafka","queue"],["w","Workers","dedupe, prefs, limits, template","worker"],["cq","Channel queues","push / SMS / email","queue"],["ad","Provider adapters","","worker"],["prov","Providers","APNs/FCM, Twilio, SES","external"],["log","Delivery log","","database"],["dlq","Retry / dead-letter","","queue"]],
e:[["svc","api","","write"],["api","q","","write"],["q","w","","async"],["w","cq","","async"],["cq","ad","","async"],["ad","prov","send","async"],["prov","log","webhook status","control"],["ad","dlq","failure","async"],["dlq","ad","retry","async"]]},
"typeahead":{
n:[["c","Client","debounce","client"],["cdn","Edge cache","CDN","edge"],["lb","Load balancer","","edge"],["sug","Suggest service","","service"],["trie","Prefix index","trie, sharded by prefix","cache"],["logs","Search logs","Kafka","queue"],["agg","Aggregator","Spark, hourly","worker"],["snap","Trie snapshots","object store","storage"]],
e:[["c","cdn","prefix","read"],["cdn","lb","miss","read"],["lb","sug","","read"],["sug","trie","top-K","read"],["c","logs","queries","async"],["logs","agg","","async"],["agg","snap","build trie","async"],["snap","trie","load new version","control"]]},
"web-crawler":{
n:[["seed","Seed URLs","","client"],["fr","URL frontier","priority + politeness","queue"],["f","Fetchers","DNS cache, robots.txt","worker"],["store","Content store","object storage","storage"],["meta","Metadata DB","","database"],["p","Parser","extract + dedupe","worker"],["lx","Link filter","normalise, seen check","worker"],["web","Web","","external"]],
e:[["seed","fr","","write"],["fr","f","next URL","write"],["f","web","fetch","write"],["f","store","page","write"],["f","meta","","write"],["store","p","","async"],["p","lx","links","async"],["lx","fr","new URLs","async"]]},
"ticketing":{
n:[["u","Users","","client"],["cdn","CDN","","edge"],["wr","Waiting room","hot events","queue"],["lb","Load balancer","","edge"],["bk","Booking service","","service"],["seat","Seat DB","SQL, sharded by event","database"],["map","Seat-map cache","Redis, short TTL","cache"],["pay","Payment service","","service"],["psp","Payment provider","","external"],["hold","Hold-expiry worker","","worker"],["mail","Notifications","email tickets","worker"]],
e:[["u","cdn","","read"],["cdn","wr","","write"],["wr","lb","admit","write"],["lb","bk","","write"],["bk","seat","hold seat","write"],["bk","map","","read"],["seat","map","update","async"],["bk","pay","","write"],["pay","psp","charge","write"],["hold","seat","release expired","control"],["bk","mail","confirmed","async"]]},
"proximity":{
n:[["c","Client","","client"],["lb","Load balancer","","edge"],["ls","Location search","","service"],["geo","Geo index","geohash cells, in memory","cache"],["bs","Business service","with cache","service"],["db","Business DB","source of truth","database"],["cdc","Change stream","CDC","queue"],["up","Index updater","","worker"]],
e:[["c","lb","","read"],["lb","ls","","read"],["ls","geo","nearby cells","read"],["ls","bs","hydrate","read"],["bs","db","","read"],["db","cdc","","async"],["cdc","up","","async"],["up","geo","","async"]]},
"job-scheduler":{
n:[["c","Clients","","client"],["api","Job API","","service"],["db","Jobs DB","index on next_run_time","database"],["sch","Scheduler nodes","partitioned, lease claim","service"],["q","Run queue","by priority","queue"],["w","Worker pool","stateless","worker"],["dlq","Retry / DLQ","backoff","queue"],["mon","Lease monitor","reclaims dead jobs","worker"]],
e:[["c","api","create job","write"],["api","db","","write"],["sch","db","poll due jobs","read"],["sch","q","enqueue","write"],["q","w","","async"],["w","db","heartbeat, result","write"],["w","dlq","failure","async"],["dlq","q","retry","async"],["mon","db","expired leases","control"]]},
"feature-flags":{
n:[["ad","Admin UI","","client"],["fs","Flag service","","service"],["db","Flags DB","+ audit log","database"],["pub","Publisher","compile ruleset","worker"],["cdn","Ruleset store","object store + CDN","storage"],["ps","Pub/sub","env, version","queue"],["gw","Streaming gateway","SSE","edge"],["sdk","Server SDKs","local evaluation","client"],["ev","Event ingest","batched","queue"],["an","Analytics store","","database"]],
e:[["ad","fs","edit flag","write"],["fs","db","","write"],["fs","pub","","async"],["pub","cdn","versioned rules","async"],["pub","ps","","async"],["ps","gw","","control"],["gw","sdk","version N","control"],["sdk","cdn","fetch rules","read"],["sdk","ev","exposures","async"],["ev","an","","async"]]},
"dropbox":{
n:[["cl","Desktop client","watcher, chunker","client"],["api","Metadata service","","service"],["mdb","Metadata DB","sharded + change log","database"],["bs","Block service","","service"],["obj","Block store","content-addressed","storage"],["ns","Notification service","WebSocket / long-poll","service"],["dev","Other devices","","client"],["q","Background jobs","scan, thumbnails, GC","queue"]],
e:[["cl","api","block hashes","write"],["api","mdb","commit version","write"],["cl","bs","upload missing","write"],["bs","obj","","write"],["mdb","ns","change","async"],["ns","dev","notify","async"],["dev","bs","download blocks","read"],["bs","q","","async"]]},
"youtube":{
n:[["c","Client","upload + player","client"],["api","API","metadata, manifests","service"],["raw","Raw storage","pre-signed upload","storage"],["q","Transcode queue","","queue"],["tc","Transcoders","split, encode, package","worker"],["out","Renditions","segments + manifests","storage"],["meta","Metadata DB","status","database"],["cdn","CDN","edge cache","edge"]],
e:[["c","raw","upload","write"],["raw","q","","async"],["q","tc","","async"],["tc","out","","async"],["tc","meta","status READY","async"],["c","api","play","read"],["api","meta","","read"],["c","cdn","segments","read"],["cdn","out","miss","read"]]},
"uber":{
n:[["d","Driver app","location stream","client"],["rd","Rider app","","client"],["loc","Location service","","service"],["geo","Geo index","in memory, by cell","cache"],["k","Event stream","Kafka","queue"],["gw","API gateway","","edge"],["ride","Ride service","trip state machine","service"],["dis","Dispatch","matching","service"],["tdb","Trip DB","","database"],["eta","Maps / ETA","","external"],["push","Push / WebSocket","offers","edge"]],
e:[["d","loc","","write"],["loc","geo","","write"],["loc","k","","async"],["rd","gw","request ride","write"],["gw","ride","","write"],["ride","tdb","","write"],["ride","dis","","write"],["dis","geo","nearby drivers","read"],["dis","eta","rank","read"],["dis","push","offer","write"],["push","d","","write"]]},
"google-maps":{
n:[["c","Map app","tiles, nav, GPS","client"],["cdn","CDN","tile cache","edge"],["ts","Tile store","vector tiles, by z/x/y","storage"],["gw","API gateway","","edge"],["rt","Routing service","contraction hierarchies","service"],["gr","Graph shards","road graph in memory, by region","cache"],["tr","Traffic service","segment speeds","service"],["k","Probe stream","Kafka","queue"],["geo","Geocode / places","search index","service"],["bld","Map build pipeline","OSM, imagery, ingest","worker"]],
e:[["c","cdn","tile z/x/y","read"],["cdn","ts","miss","read"],["c","gw","route, search","read"],["gw","rt","","read"],["rt","gr","shortest path","read"],["rt","tr","live speeds","read"],["gw","geo","address, place","read"],["c","k","GPS probes","write"],["k","tr","map-match, aggregate","async"],["bld","ts","render tiles","async"],["bld","gr","new graph version","async"],["bld","geo","reindex","async"]]},
"google-docs":{
n:[["c","Clients","WebSocket","client"],["gw","Gateway","","edge"],["rt","Routing","doc to server, consistent hash","service"],["co","Collaboration server","one owner per doc","service"],["log","Op log","durable","database"],["sn","Snapshot service","periodic","worker"],["obj","Snapshots","object storage","storage"]],
e:[["c","gw","ops","write"],["gw","rt","","control"],["rt","co","","write"],["co","log","append","write"],["co","c","broadcast","read"],["co","sn","","async"],["sn","obj","","async"]]},
"message-queue":{
n:[["p","Producers","","client"],["l","Partition leaders","brokers","service"],["f","Followers","ISR replicas","database"],["seg","Log segments","append-only","storage"],["cg","Consumer group","one consumer per partition","client"],["off","Offset store","","database"],["ctl","Controller","election, metadata, rebalance","service"]],
e:[["p","l","publish (acks)","write"],["l","seg","append","write"],["l","f","replicate","async"],["cg","l","poll from offset","read"],["cg","off","commit offset","write"],["ctl","l","metadata","control"],["ctl","cg","rebalance","control"]]},
"payments":{
n:[["m","Client / merchant","","client"],["gw","API gateway","","edge"],["pay","Payment service","idempotency check","service"],["db","Payments DB","SQL","database"],["ex","Payment executor","retries, timeouts","worker"],["psp","PSP / bank","card network","external"],["led","Ledger service","double-entry","service"],["ldb","Ledger DB","","database"],["bus","Event bus","","queue"],["wh","Merchant webhooks","","worker"],["rec","Reconciliation","settlement files","worker"]],
e:[["m","gw","","write"],["gw","pay","","write"],["pay","db","one transaction","write"],["pay","ex","","write"],["ex","psp","charge","write"],["psp","pay","webhook","control"],["pay","led","","write"],["led","ldb","","write"],["pay","bus","","async"],["bus","wh","","async"],["rec","ldb","compare","control"],["rec","psp","","control"]]},
"metrics":{
n:[["ag","Agents","collectors","client"],["gw","Ingestion gateways","","edge"],["k","Kafka","by series","queue"],["w","TSDB writers","buffer + WAL","worker"],["hot","Hot storage","SSD blocks","database"],["cold","Cold storage","object store","storage"],["ru","Rollup jobs","downsample","worker"],["qs","Query service","index + cache","service"],["dash","Dashboards","","client"],["al","Alert evaluator","","worker"],["am","Alertmanager","dedupe, route","service"]],
e:[["ag","gw","","write"],["gw","k","","write"],["k","w","","async"],["w","hot","","write"],["hot","cold","age out","async"],["ru","hot","","async"],["dash","qs","query","read"],["qs","hot","","read"],["al","qs","rules","read"],["al","am","fire","async"]]}
};
const out={};
Object.keys(D).forEach(k=>{out[k]={nodes:D[k].n.map(([id,label,tech,kind])=>({id,label,tech,kind})),edges:D[k].e.map(([from,to,label,flow])=>({from,to,label,flow}))}});
return out;
})();

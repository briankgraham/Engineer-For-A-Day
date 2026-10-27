// Learning tab: the Tries track. Same schema as learn_data.js (see the header there). Loaded after learn_data.js, before learn.js.
//   viz blocks over tries: {viz: "trie", mode: "show" | "build" | "search", words: [...], query, prefix, title}
//                          "show" draws the finished trie; "build" steps through inserting the words in order; "search" walks `query`
//                          through the finished trie (prefix: true asks "does any word start with this?"). Keep it to 8 short lowercase words.
LEARN_TRACKS.push({
  id:"tries",
  title:"Tries",
  icon:"🔤",
  tagline:"Prefix trees: store words by their letters so \"starts with\" is a walk down a path, then autocomplete, wildcards, Word Search II and bitwise tries.",
  outcomes:[
    "Write a trie with insert, search and startsWith from memory",
    "Say why a node needs an end-of-word flag, and what a trie costs in time and memory",
    "Answer prefix questions: autocomplete, shortest root, sums and counts under a prefix",
    "Backtrack through a trie for wildcards and a grid of letters",
    "Use a binary trie for maximum-XOR problems, and pick a trie over a hash set or a sort",
  ],
  ready:[
    ["implement-trie-prefix-tree","basics"],["longest-common-prefix","basics"],["replace-words","prefix"],["map-sum-pairs","prefix"],
    ["search-suggestions-system","prefix"],["design-search-autocomplete-system","prefix"],["design-add-and-search-words-data-structure","wildcard"],
    ["word-search-ii","wildcard"],["maximum-xor-of-two-numbers-in-an-array","choose"],["stream-of-characters","choose"],["longest-word-in-dictionary","choose"],
  ],
  lessons:[

// ───────────────────────────────────────────── 1
{
  id:"basics",
  title:"What a trie is",
  goal:"Build a trie with insert, search and startsWith, and explain why one node per letter makes prefix questions cheap.",
  mins:20,
  blocks:[
    {md:`A **trie** (say "try", from re*trie*val; also called a prefix tree) stores a set of words **letter by letter**. Each edge is one letter, and a word is a path from the root down to a node.

Words that start the same way **share** the start of their path. \`car\`, \`card\` and \`cat\` all begin \`c → a\`, so those two nodes exist once.`},
    {viz:"trie",mode:"show",title:"Five words: car, card, care, cat, dog. Ringed nodes end a word",words:["car","card","care","cat","dog"]},
    {md:`Notice \`car\` is both a word *and* the start of \`card\` and \`care\`. So a node alone doesn't say "a word ends here". Each node carries an **end-of-word flag**, drawn here as a green ring.

## Insert

Walk down from the root. For each letter, step into the child if it exists, or **create** it if it doesn't. After the last letter, set the end flag. Watch the sharing happen:`},
    {viz:"trie",mode:"build",title:"Insert car, card, cat, dog",words:["car","card","cat","dog"]},
    {md:`## Search and startsWith

Both walk the same path. They differ only at the end:

- **search(word)**: every letter must exist **and** the final node must have the end flag
- **startsWith(prefix)**: every letter must exist. The flag doesn't matter

Search for \`car\`, then for \`ca\` as a prefix, and see where each one stops:`},
    {viz:"trie",mode:"search",query:"ca",title:"search(\"ca\"): every letter matches, but there is no ring",words:["car","card","cat","dog"]},
    {viz:"trie",mode:"search",query:"cow",prefix:true,title:"startsWith(\"cow\"): the walk falls off the trie",words:["car","card","cat","dog"]},
    {md:`## The code

A node is a map from letter to child node, plus the flag. JavaScript's \`Map\` or a plain object both work. An array of 26 slots is faster but only fits lowercase letters, and wastes memory on sparse nodes.`},
    {tpl:`class TrieNode {
  constructor() { this.kids = new Map(); this.end = false; }
}
class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.kids.has(ch)) node.kids.set(ch, new TrieNode());
      node = node.kids.get(ch);
    }
    node.end = true;
  }
  // The node at the end of the path, or null if the path breaks.
  find(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.kids.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) { const n = this.find(word); return n !== null && n.end; }
  startsWith(prefix) { return this.find(prefix) !== null; }
}`,title:"Trie: insert, search, startsWith"},
    {md:`## Cost

For a word of length **L**:

| Operation | Time | Notes |
| --- | --- | --- |
| insert | O(L) | at most L new nodes |
| search, startsWith | O(L) | **independent of how many words are stored** |
| memory | O(total letters) worst case | shared prefixes make it smaller; unrelated words make it larger |

A hash set also does an exact lookup in O(L) (hashing reads the whole word), but it can't answer "does anything start with this?" without scanning every word. That question is what a trie is for.`},
    {warn:"Forgetting the end flag is the classic bug. Without it, after inserting \"card\" the trie would say search(\"car\") is true. A node existing means \"a longer word passes through here\", not \"a word ends here\"."},
  ],
  parts:[
    {type:"quiz",id:"q-end-flag",q:"You insert only \"apple\". What should search(\"app\") and startsWith(\"app\") return?",
      options:["true and true","false and true","true and false","false and false"],answer:1,
      why:"\"app\" is a path in the trie, so it is a prefix of something stored. But no word ends at that node, so it is not a stored word. That difference is exactly what the end flag records."},
    {type:"quiz",id:"q-trie-cost",q:"A trie holds a million words. How long does search(\"card\") take?",
      options:["O(log 1,000,000), like a balanced tree","O(4): one step per letter, however many words are stored","O(1,000,000): it must check each word","O(26): one step per letter of the alphabet"],answer:1,
      why:"The walk takes one step per letter of the query. The number of stored words never appears in the cost."},
    {type:"quiz",id:"q-share",q:"You insert car, card, care and cat. How many nodes does the trie have, not counting the root?",
      options:["13, one per letter typed","6","8","4"],answer:1,
      why:"All four words share c → a, and car, card and care share r as well. The only other nodes are d and e (under r) and t (under a): c, a, r, d, e, t."},
    {type:"code",id:"trie",title:"Build a trie",fn:"Trie",kind:"class",
      prompt:"Implement `class Trie` for lowercase words:\n\n- `insert(word)`: store a word\n- `search(word)`: `true` only if exactly this word was inserted\n- `startsWith(prefix)`: `true` if any inserted word starts with `prefix`\n\n`insert` returns nothing (the tests show `null`).",
      starter:"class Trie {\n  constructor() {\n    this.root = { kids: {}, end: false };\n  }\n  insert(word) {\n    \n  }\n  search(word) {\n    \n  }\n  startsWith(prefix) {\n    \n  }\n}\n",
      solution:"class Trie {\n  constructor() {\n    this.root = { kids: {}, end: false };\n  }\n  insert(word) {\n    let node = this.root;\n    for (const ch of word) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, end: false };\n      node = node.kids[ch];\n    }\n    node.end = true;\n  }\n  find(s) {\n    let node = this.root;\n    for (const ch of s) {\n      node = node.kids[ch];\n      if (!node) return null;\n    }\n    return node;\n  }\n  search(word) {\n    const n = this.find(word);\n    return n !== null && n.end;\n  }\n  startsWith(prefix) {\n    return this.find(prefix) !== null;\n  }\n}\n",
      hint:"One helper that walks a string and returns the node it ends on (or null) serves both search and startsWith. They differ only in whether they check node.end.",
      tests:[
        ["example",{ops:["Trie","insert","search","search","startsWith","insert","search"],args:[[],["apple"],["apple"],["app"],["app"],["app"],["app"]]},[null,null,true,false,true,null,true]],
        ["empty trie",{ops:["Trie","search","startsWith"],args:[[],["a"],["a"]]},[null,false,false]],
        ["falls off the path",{ops:["Trie","insert","search","startsWith","search"],args:[[],["car"],["cat"],["cab"],["cars"]]},[null,null,false,false,false]],
        ["shared prefix",{ops:["Trie","insert","insert","search","search","search","startsWith"],args:[[],["car"],["card"],["car"],["card"],["ca"],["ca"]]},[null,null,null,true,true,false,true]],
        ["insert twice",{ops:["Trie","insert","insert","search"],args:[[],["go"],["go"],["go"]]},[null,null,null,true]],
      ]},
    {type:"code",id:"lcp",title:"Longest common prefix",fn:"longestCommonPrefix",
      prompt:"Given an array of lowercase strings, return the longest prefix they all share (`\"\"` if there is none or the array is empty).\n\nDo it with a trie: insert every word, then walk down from the root while the current node has **exactly one child** and is **not the end of a word**. The letters you walked are the answer.",
      starter:"function longestCommonPrefix(words) {\n  \n}\n",
      solution:"function longestCommonPrefix(words) {\n  if (!words.length) return \"\";\n  const root = { kids: {}, end: false };\n  for (const w of words) {\n    let node = root;\n    for (const ch of w) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, end: false };\n      node = node.kids[ch];\n    }\n    node.end = true;\n  }\n  let node = root, out = \"\";\n  while (!node.end) {\n    const keys = Object.keys(node.kids);\n    if (keys.length !== 1) break;\n    out += keys[0];\n    node = node.kids[keys[0]];\n  }\n  return out;\n}\n",
      hint:"Stop when a node branches (two or more children), has no children, or marks the end of a word: a word ending there is the shortest, so the prefix can't go further.",
      tests:[
        ["example",[["flower","flow","flight"]],"fl"],
        ["none shared",[["dog","racecar","car"]],""],
        ["one word",[["alone"]],"alone"],
        ["one is a prefix of the rest",[["car","card","care"]],"car"],
        ["identical",[["same","same"]],"same"],
        ["empty list",[[]],""],
        ["empty string inside",[["abc",""]],""],
      ]},
  ],
  leetcode:["implement-trie-prefix-tree","longest-common-prefix"],
},

// ───────────────────────────────────────────── 2
{
  id:"prefix",
  title:"Prefix questions and autocomplete",
  goal:"Go to the end of a prefix and then collect, count or sum what hangs below it.",
  mins:25,
  blocks:[
    {md:`Most trie problems are two moves chained together:

1. **Descend** along the prefix. If the path breaks, the answer is empty (or 0).
2. **Gather** whatever is below that node: all words, a count, a sum, the first match.

Autocomplete is the clearest example. Type \`ca\` and the suggestions are every word in the subtree under \`c → a\`.`},
    {viz:"trie",mode:"search",query:"ca",prefix:true,title:"Autocomplete \"ca\": descend, then the suggestions are everything below",words:["car","card","care","cat","dog"]},
    {md:`## Collecting the words below a node

A depth-first walk, carrying the letters so far. Visit children in **alphabetical order** and the words come out sorted for free.`},
    {tpl:`function wordsBelow(node, path, out, limit) {
  if (out.length >= limit) return;
  if (node.end) out.push(path);
  for (const ch of [...node.kids.keys()].sort()) {
    wordsBelow(node.kids.get(ch), path + ch, out, limit);
  }
}
// node = the node at the end of the typed prefix; path = the prefix`,title:"Collect words under a node, sorted"},
    {md:`## Storing a number on the node

If you only need a *count* or a *sum* per prefix, don't walk the subtree at query time. Keep it on the nodes while inserting:

- \`pass\` count: add 1 to every node on the path. \`countPrefix("ca")\` is then the \`pass\` of that node, in O(L)
- stored value: for "sum of values of keys starting with a prefix", add the value to every node on the path (and the *difference* if a key is overwritten, which is the trap in **Map Sum Pairs**)

This trades a little insert work and memory for O(L) queries.

## The shortest root

Replace Words turns each word of a sentence into the shortest dictionary word that is a prefix of it. Walk the word down the trie and **stop at the first node with the end flag**. That node's path is the shortest root. If the walk falls off the trie first, keep the word as it is.`},
    {warn:"Sorting the children at every node during every query can add up. In a real autocomplete you would cache the top few suggestions on each node while inserting, so the query is just the descent."},
  ],
  parts:[
    {type:"quiz",id:"q-descend-first",q:"What does autocomplete do first when the user has typed \"ca\"?",
      options:["Scans every stored word and keeps those starting with \"ca\"","Walks c → a from the root, then collects the words in that node's subtree","Sorts the dictionary and binary searches for \"ca\"","Hashes \"ca\" and looks it up"],answer:1,
      why:"The descent costs O(length of the prefix) and discards every word that doesn't start with it in one move. Everything below that node matches."},
    {type:"quiz",id:"q-counts",q:"You need countPrefix(p), the number of inserted words starting with p, to run in O(|p|). What do you store?",
      options:["A count on each node: how many inserted words pass through it","A list of all words on the root","The end flag only","Nothing: just walk the subtree each time"],answer:0,
      why:"Increment a counter on every node along each insert. The answer for p is the counter on the node where p ends. Walking the subtree instead would be O(size of the subtree)."},
    {type:"code",id:"autocomplete",title:"Autocomplete",fn:"autocomplete",
      prompt:"Given a list of lowercase `words` (may contain duplicates), a `prefix`, and `k`, return up to `k` **distinct** words that start with `prefix`, in alphabetical order. A word equal to the prefix counts. Return `[]` if nothing matches.\n\nBuild a trie, descend along `prefix`, then collect below it in alphabetical order.",
      starter:"function autocomplete(words, prefix, k) {\n  \n}\n",
      solution:"function autocomplete(words, prefix, k) {\n  const root = { kids: {}, end: false };\n  for (const w of words) {\n    let node = root;\n    for (const ch of w) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, end: false };\n      node = node.kids[ch];\n    }\n    node.end = true;\n  }\n  let node = root;\n  for (const ch of prefix) {\n    node = node.kids[ch];\n    if (!node) return [];\n  }\n  const out = [];\n  const collect = (n, path) => {\n    if (out.length >= k) return;\n    if (n.end) out.push(path);\n    for (const ch of Object.keys(n.kids).sort()) collect(n.kids[ch], path + ch);\n  };\n  collect(node, prefix);\n  return out;\n}\n",
      hint:"After walking the prefix, run a DFS from that node that visits children in sorted order and pushes the path whenever node.end is true. Stop once you have k.",
      tests:[
        ["basic",[["car","card","care","cat","dog"],"ca",3],["car","card","care"]],
        ["limit cuts it short",[["car","card","care","cat","dog"],"ca",2],["car","card"]],
        ["unsorted input",[["mouse","monitor","mobile","money","mousepad"],"mou",5],["mouse","mousepad"]],
        ["no match",[["car","cat"],"dog",3],[]],
        ["prefix is a word",[["do","dog","dot","done"],"do",10],["do","dog","done","dot"]],
        ["duplicates",[["go","go","gone"],"g",5],["go","gone"]],
        ["empty prefix",[["b","a","c"],"",2],["a","b"]],
      ]},
    {type:"code",id:"replace-words",title:"Replace words with their shortest root",fn:"replaceWords",
      prompt:"You have a `dictionary` of root words and a `sentence` of space-separated words. Replace each word that has a root as a prefix with the **shortest** such root. Words with no root stay as they are. Return the new sentence.\n\nExample: roots `[\"cat\", \"bat\", \"rat\"]` and `\"the cattle was rattled by the battery\"` becomes `\"the cat was rat by the bat\"`.",
      starter:"function replaceWords(dictionary, sentence) {\n  \n}\n",
      solution:"function replaceWords(dictionary, sentence) {\n  const root = { kids: {}, end: false };\n  for (const w of dictionary) {\n    let node = root;\n    for (const ch of w) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, end: false };\n      node = node.kids[ch];\n    }\n    node.end = true;\n  }\n  const shorten = word => {\n    let node = root;\n    for (let i = 0; i < word.length; i++) {\n      node = node.kids[word[i]];\n      if (!node) return word;\n      if (node.end) return word.slice(0, i + 1);\n    }\n    return word;\n  };\n  return sentence.split(\" \").map(shorten).join(\" \");\n}\n",
      hint:"Walk each word down the trie. The first time you land on a node with end = true, return the letters walked so far. If the path breaks first, return the word unchanged.",
      tests:[
        ["example",[["cat","bat","rat"],"the cattle was rattled by the battery"],"the cat was rat by the bat"],
        ["shortest wins",[["a","aa","aaa"],"aaa aa a aaaa"],"a a a a"],
        ["no roots match",[["x","y"],"hello world"],"hello world"],
        ["root longer than word",[["catalog"],"cat catalog"],"cat catalog"],
        ["empty dictionary",[[],"keep me"],"keep me"],
        ["longer root listed first",[["cattle","cat"],"cattle"],"cat"],
      ]},
    {type:"code",id:"map-sum",title:"Map Sum",fn:"MapSum",kind:"class",
      prompt:"Implement `class MapSum`:\n\n- `insert(key, val)`: store `val` for `key`. Inserting the same key again **replaces** its value.\n- `sum(prefix)`: return the sum of the values of all keys that start with `prefix`.\n\n`insert` returns nothing (the tests show `null`). Make `sum` O(length of the prefix) by keeping a running total on every node.",
      starter:"class MapSum {\n  constructor() {\n    this.root = { kids: {}, total: 0 };\n    this.vals = new Map();\n  }\n  insert(key, val) {\n    \n  }\n  sum(prefix) {\n    \n  }\n}\n",
      solution:"class MapSum {\n  constructor() {\n    this.root = { kids: {}, total: 0 };\n    this.vals = new Map();\n  }\n  insert(key, val) {\n    const delta = val - (this.vals.get(key) || 0);\n    this.vals.set(key, val);\n    let node = this.root;\n    for (const ch of key) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, total: 0 };\n      node = node.kids[ch];\n      node.total += delta;\n    }\n  }\n  sum(prefix) {\n    let node = this.root;\n    for (const ch of prefix) {\n      node = node.kids[ch];\n      if (!node) return 0;\n    }\n    return node.total;\n  }\n}\n",
      hint:"Remember each key's old value. When a key is inserted again, add only the difference (new - old) to every node on its path.",
      tests:[
        ["example",{ops:["MapSum","insert","sum","insert","sum"],args:[[],["apple",3],["ap"],["app",2],["ap"]]},[null,null,3,null,5]],
        ["overwrite",{ops:["MapSum","insert","insert","sum","insert","sum"],args:[[],["apple",3],["app",2],["app"],["apple",10],["app"]]},[null,null,null,5,null,12]],
        ["no match",{ops:["MapSum","insert","sum"],args:[[],["cat",4],["dog"]]},[null,null,0]],
        ["prefix longer than any key",{ops:["MapSum","insert","sum"],args:[[],["to",7],["tomorrow"]]},[null,null,0]],
        ["whole key as prefix",{ops:["MapSum","insert","insert","sum"],args:[[],["a",1],["ab",2],["a"]]},[null,null,null,3]],
      ]},
  ],
  leetcode:["replace-words","map-sum-pairs","search-suggestions-system","design-search-autocomplete-system"],
},

// ───────────────────────────────────────────── 3
{
  id:"wildcard",
  title:"Wildcards and Word Search II",
  goal:"Backtrack through a trie when the query can branch: a \".\" wildcard, or a grid where every path could start a word.",
  mins:25,
  blocks:[
    {md:`So far the query pointed to one path. Two common problems make the query **branch**, and then the trie is combined with a recursive search.

## 1. A "." that matches any letter

In **Add and Search Words**, \`search("c.t")\` must match \`cat\`, \`cot\`, \`cut\`. At a normal letter, step into that one child. At a \`.\`, **try every child** and succeed if any works.`},
    {tpl:`search(word) {
  const go = (node, i) => {
    if (i === word.length) return node.end;
    const ch = word[i];
    if (ch === ".") {
      for (const child of node.kids.values()) if (go(child, i + 1)) return true;
      return false;
    }
    const child = node.kids.get(ch);
    return child ? go(child, i + 1) : false;
  };
  return go(this.root, 0);
}`,title:"Search with a \".\" wildcard"},
    {md:`Worst case, a query of all dots visits every node, so it is no better than scanning. In practice the other letters prune hard.

## 2. A grid of letters (Word Search II)

Given a board and a list of words, find every word that can be traced through adjacent cells, using each cell once per word.

The tempting approach is to run Word Search I (DFS from each cell) once **per word**. That repeats the same walking for every word. Instead, put **all the words in a trie** and run one DFS per cell that follows the trie:

- step into a neighbor only if the trie node has a child for that letter. If it doesn't, **no word can continue**, so stop right there
- when you reach a node that ends a word, record it
- mark the cell as visited while you are inside it, and restore it on the way out (backtracking)

The trie is doing the pruning: a path that is a prefix of nothing is abandoned at the first wrong letter.`},
    {tpl:`function findWords(board, words) {
  const root = { kids: {}, word: null };
  for (const w of words) {
    let n = root;
    for (const ch of w) n = n.kids[ch] ||= { kids: {}, word: null };
    n.word = w;                       // store the whole word at its last node
  }
  const found = [], R = board.length, C = board[0].length;
  const dfs = (r, c, parent) => {
    const ch = board[r][c], node = parent.kids[ch];
    if (!node) return;
    if (node.word) { found.push(node.word); node.word = null; }   // null it so it is reported once
    board[r][c] = "#";                                          // visited
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < R && nc < C && board[nr][nc] !== "#") dfs(nr, nc, node);
    }
    board[r][c] = ch;                                           // un-visit
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) dfs(r, c, root);
  return found;
}`,title:"Word Search II: one DFS per cell, guided by the trie"},
    {tip:"Storing the whole word on its last node (instead of rebuilding it from the path) saves work, and setting it to null after a match stops the same word being reported again from another route. A further optimization is to delete trie branches that have become empty, so the search stops visiting them."},
  ],
  parts:[
    {type:"quiz",id:"q-why-trie-grid",q:"Why is Word Search II faster with a trie than running Word Search I once per word?",
      options:["A trie sorts the board","One walk of the board is shared by all words, and a path that is a prefix of no word is dropped at once","A trie makes each DFS step O(1) instead of O(4)","It isn't faster; it only uses less memory"],answer:1,
      why:"Per-word search repeats the same board walking for each word. With the trie, every path is checked against all words at once, and it dies on the first letter that no word continues with."},
    {type:"quiz",id:"q-dot",q:"In search(\"b.d\"), what does the trie do at the \".\"?",
      options:["Skips the letter and moves to the end of the word","Tries each child of the current node, and returns true if any continuation matches the rest","Looks up the most common child","Throws, because \".\" is not a letter"],answer:1,
      why:"A wildcard means \"any one letter\", so every child is a candidate. The recursion explores them and the search succeeds if one branch matches the remaining letters."},
    {type:"code",id:"word-dictionary",title:"Add and Search Words",fn:"WordDictionary",kind:"class",
      prompt:"Implement `class WordDictionary`:\n\n- `addWord(word)`: store a lowercase word\n- `search(word)`: `true` if a stored word matches `word`, where each `\".\"` matches exactly one letter of any kind\n\n`addWord` returns nothing (the tests show `null`).",
      starter:"class WordDictionary {\n  constructor() {\n    this.root = { kids: {}, end: false };\n  }\n  addWord(word) {\n    \n  }\n  search(word) {\n    \n  }\n}\n",
      solution:"class WordDictionary {\n  constructor() {\n    this.root = { kids: {}, end: false };\n  }\n  addWord(word) {\n    let node = this.root;\n    for (const ch of word) {\n      if (!node.kids[ch]) node.kids[ch] = { kids: {}, end: false };\n      node = node.kids[ch];\n    }\n    node.end = true;\n  }\n  search(word) {\n    const go = (node, i) => {\n      if (i === word.length) return node.end;\n      const ch = word[i];\n      if (ch === \".\") {\n        for (const k of Object.keys(node.kids)) if (go(node.kids[k], i + 1)) return true;\n        return false;\n      }\n      const child = node.kids[ch];\n      return child ? go(child, i + 1) : false;\n    };\n    return go(this.root, 0);\n  }\n}\n",
      hint:"Write search as a recursive helper go(node, i). On a normal letter follow one child. On \".\" loop over all children and return true if any recursive call is true. At i === word.length return node.end.",
      tests:[
        ["example",{ops:["WordDictionary","addWord","addWord","addWord","search","search","search","search"],args:[[],["bad"],["dad"],["mad"],["pad"],["bad"],[".ad"],["b.."]]},[null,null,null,null,false,true,true,true]],
        ["dots only",{ops:["WordDictionary","addWord","search","search","search"],args:[[],["cat"],["..."],[".."],["...."]]},[null,null,true,false,false]],
        ["prefix is not a word",{ops:["WordDictionary","addWord","search","search"],args:[[],["apple"],["app"],["app.."]]},[null,null,false,true]],
        ["dot in the middle",{ops:["WordDictionary","addWord","addWord","search","search"],args:[[],["cot"],["cut"],["c.t"],["c.p"]]},[null,null,null,true,false]],
        ["empty",{ops:["WordDictionary","search","addWord","search"],args:[[],["a"],["a"],["a"]]},[null,false,null,true]],
      ]},
    {type:"code",id:"word-search-2",title:"Word Search II",fn:"findWords",compare:"unordered",
      prompt:"Given a `board` (an array of rows of single lowercase letters) and a list of `words`, return every word that can be traced on the board. A word is built from letters of **adjacent** cells (up, down, left, right), and a cell may be used only **once within one word**. Return the words in any order, each at most once.\n\nBuild a trie of the words and run one DFS from each cell, following the trie.",
      starter:"function findWords(board, words) {\n  \n}\n",
      solution:"function findWords(board, words) {\n  const root = { kids: {}, word: null };\n  for (const w of words) {\n    let n = root;\n    for (const ch of w) {\n      if (!n.kids[ch]) n.kids[ch] = { kids: {}, word: null };\n      n = n.kids[ch];\n    }\n    n.word = w;\n  }\n  const found = [], R = board.length, C = R ? board[0].length : 0;\n  const grid = board.map(r => [...r]);\n  const dfs = (r, c, parent) => {\n    const ch = grid[r][c], node = parent.kids[ch];\n    if (!node) return;\n    if (node.word !== null) { found.push(node.word); node.word = null; }\n    grid[r][c] = \"#\";\n    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {\n      const nr = r + dr, nc = c + dc;\n      if (nr >= 0 && nc >= 0 && nr < R && nc < C && grid[nr][nc] !== \"#\") dfs(nr, nc, node);\n    }\n    grid[r][c] = ch;\n  };\n  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) dfs(r, c, root);\n  return found;\n}\n",
      hint:"Store the full word on its last trie node. From each cell, DFS only into neighbors whose letter is a child of the current trie node; mark the cell visited while inside and restore it afterwards. Clear node.word after reporting it so it is not reported twice.",
      tests:[
        ["example",[[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]],["oath","pea","eat","rain"]],["oath","eat"]],
        ["none",[[["a","b"],["c","d"]],["abcd"]],[]],
        ["single cell",[[["a"]],["a"]],["a"]],
        ["cell reused is not allowed",[[["a","a"]],["aaa"]],[]],
        ["same word reachable two ways",[[["a","b"],["b","a"]],["ab"]],["ab"]],
        ["word and its prefix",[[["a","b","c"]],["ab","abc","b"]],["ab","abc","b"]],
        ["snake path",[[["a","b","c"],["f","e","d"]],["abcdef","abe"]],["abcdef","abe"]],
      ]},
  ],
  leetcode:["design-add-and-search-words-data-structure","word-search-ii","word-search"],
},

// ───────────────────────────────────────────── 4
{
  id:"choose",
  title:"Bitwise tries, and choosing a trie",
  goal:"Use a trie over bits for maximum-XOR problems, and say when a hash set or a sorted array is the better tool.",
  mins:25,
  blocks:[
    {md:`A trie doesn't have to be made of letters. Anything that can be read **one symbol at a time from the most significant end** works: file path segments, IP address bits, digits, and the **bits of an integer**.

## Maximum XOR of two numbers

XOR gives 1 where the bits differ. To make \`a ^ b\` as large as possible you want, from the top bit down, **b's bit to be the opposite of a's bit**, because a higher bit is worth more than every lower bit together.

Insert all numbers into a trie of their 31 bits (high bit first, each node has a \`0\` and a \`1\` child). Then for each number \`a\`, walk down: at each bit prefer the child that is the **opposite** of a's bit. If it exists, take it and that bit of the answer is 1. If not, take the other child.`},
    {tpl:`function findMaximumXOR(nums) {
  const root = {};
  for (const x of nums) {
    let n = root;
    for (let b = 30; b >= 0; b--) {
      const bit = (x >> b) & 1;
      n = n[bit] ||= {};
    }
  }
  let best = 0;
  for (const x of nums) {
    let n = root, cur = 0;
    for (let b = 30; b >= 0; b--) {
      const want = ((x >> b) & 1) ^ 1;          // the opposite bit
      if (n[want]) { cur |= 1 << b; n = n[want]; }
      else n = n[want ^ 1];
    }
    best = Math.max(best, cur);
  }
  return best;
}`,title:"Max XOR with a binary trie"},
    {md:`That is O(31 · n), or O(n) with a constant. The same shape solves "max XOR with a limit", "max XOR in a range" and similar, with extra bookkeeping on the nodes.

## When is a trie the right tool?

| You need | Reach for | Why |
| --- | --- | --- |
| Exact membership of whole words | **Hash set** | Simpler, usually faster, less memory |
| Does any word start with p? Count or list those | **Trie**, or a **sorted array** + binary search | A trie answers in O(\|p\|); sorting wins when the data is static and memory is tight |
| Autocomplete as the user types | **Trie** | Each keystroke is one more step down |
| Match a stream of letters against many words (Stream of Characters) | **Trie** of the *reversed* words | Check the latest letters backward; one pass handles all words |
| Wildcards, or a grid of letters (Word Search II) | **Trie** + backtracking | The trie prunes dead paths |
| Longest common prefix of many strings | **Trie** or compare sorted first and last | Both fine; sorting is shorter to write |
| Max XOR | **Binary trie** | Greedy bit choice needs "is there a number with this bit pattern?" |

## Costs to mention in an interview

- **Memory** is the usual objection. Every node is an object with a map. For a dictionary of unrelated words it can be far larger than the words themselves. Mitigations: array children for a small alphabet, compressing single-child chains (a *radix* tree), or a sorted array
- **Time per query** doesn't depend on the number of words, only on the word length
- **Deletion** is rarely needed. When it is, remove nodes on the way back up only if they have no children and aren't the end of another word`},
    {tip:"If a prompt says \"prefix\", \"starts with\", \"autocomplete\", \"dictionary of words searched many times\" or \"XOR of two numbers\", think trie. If it only asks whether a whole word is in a collection, a Set is the answer."},
  ],
  parts:[
    {type:"quiz",id:"q-set-or-trie",q:"You only ever ask \"is this exact word in the dictionary?\" and never anything about prefixes. What should you use?",
      options:["A trie, because it is O(L)","A Set: it is also O(L) per lookup and much simpler and lighter","A sorted array and a linear scan","A graph"],answer:1,
      why:"A trie's advantage is prefix structure. Without prefix questions it only adds memory and code."},
    {type:"quiz",id:"q-xor-greedy",q:"Why is it correct to choose the opposite bit greedily when building the maximum XOR from the top bit down?",
      options:["Lower bits don't matter at all","A 1 in a higher bit position is worth more than all lower bits combined, so you should never trade it away","XOR is commutative","The trie only has one path anyway"],answer:1,
      why:"2^k is larger than 2^(k-1) + ... + 1. So getting the higher bit to 1 always beats any combination of lower bits, and you can decide bit by bit."},
    {type:"explain",id:"e-trie-vs-set",title:"Trie or hash set?",
      prompt:"A search box has a dictionary of 200,000 product names. It must show suggestions after every keystroke, and later the same dictionary is used to reject unknown names at checkout. Explain which data structure(s) you would use for each job and why. Give the time cost per query and one drawback of your choice.",
      rubric:"A strong answer: (1) uses a trie (or a sorted array with binary search) for the suggestions, because the query is a prefix and each keystroke costs one step or O(L), independent of the number of names; (2) says a hash set is enough for the exact-membership check at checkout, with O(L) time and less memory; (3) names a drawback, such as the trie's memory overhead (a map per node), mentioning mitigations like a radix tree/compressed chains, caching top suggestions on nodes, or a sorted array; (4) does not claim the trie makes exact lookups asymptotically faster than a hash set."},
    {type:"code",id:"max-xor",title:"Maximum XOR of two numbers",fn:"findMaximumXOR",
      prompt:"Given an array of non-negative integers `nums` (each below 2^31), return the maximum value of `nums[i] ^ nums[j]` over all pairs `i, j` (they may be the same element, which gives 0).\n\nAn O(n²) double loop works, but try the binary trie: insert each number's 31 bits from the high bit down, then for each number walk the trie preferring the opposite bit.",
      starter:"function findMaximumXOR(nums) {\n  \n}\n",
      solution:"function findMaximumXOR(nums) {\n  const root = {};\n  for (const x of nums) {\n    let n = root;\n    for (let b = 30; b >= 0; b--) {\n      const bit = (x >> b) & 1;\n      if (!n[bit]) n[bit] = {};\n      n = n[bit];\n    }\n  }\n  let best = 0;\n  for (const x of nums) {\n    let n = root, cur = 0;\n    for (let b = 30; b >= 0; b--) {\n      const want = ((x >> b) & 1) ^ 1;\n      if (n[want]) { cur |= 1 << b; n = n[want]; }\n      else n = n[want ^ 1];\n    }\n    best = Math.max(best, cur);\n  }\n  return best;\n}\n",
      hint:"For each number, at every bit from 30 down to 0 you want the child with the opposite bit. If it exists, set that bit in your running XOR and go there. Otherwise go to the other child.",
      tests:[
        ["example",[[3,10,5,25,2,8]],28],
        ["two numbers",[[14,70,53,83,49,91,36,80,92,51,66,70]],127],
        ["single number",[[7]],0],
        ["equal numbers",[[5,5,5]],0],
        ["zero and a power of two",[[0,8]],8],
        ["large values",[[2147483647,0,1073741824]],2147483647],
      ]},
  ],
  leetcode:["maximum-xor-of-two-numbers-in-an-array","stream-of-characters","longest-word-in-dictionary"],
},

  ],
});

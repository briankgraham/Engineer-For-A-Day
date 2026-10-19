# INC-1184: stale //app:cli release, and CI red on //app:server

**Severity:** SEV-3 · **Opened by:** rel-oncall · **Owner:** you (build tooling)

## Summary

Two problems with the build tool since Monday. (1) The padding fix in `//base:strings` (CL 48213) never reached the `//app:cli` release: the binary built on CI still pads the old way. (2) Since BUILD-80 landed, every CI build of `//app:server` fails with a dependency cycle, so the server cannot be released either.

## What we know

- Dependency chain for the CLI: `//app:cli` → `//lib:fmt` → `//base:strings`.
- `//app:server` depends on `//lib:log` and `//lib:net`. BUILD-80 added `//lib:net`, which depends on `//base:strings`. `//lib:log` has depended on `//base:strings` for months. Someone checked the BUILD files: nothing under `//base` or `//lib` depends on `//app:server`.
- Building `//app:cli` with `--no-cache` produces the correct binary.
- Editing a comment in `//lib:fmt` and rebuilding also produced the correct binary (we reverted that edit).
- Changes since last week: switched the cache checksum from CRC32 to FNV-1a (BUILD-77), added `//lib:net` to `//app:server` (BUILD-80), CL 48213 in `//base:strings`.
- Cache hit rate looks normal on the dashboard. Nobody has touched `cache.js` in months.

## CI log: //app:cli, before and after CL 48213

```
[ci #4410] build //app:cli
  //base:strings   built      key=a635c095
  //lib:fmt        built      key=ea1eccee
  //app:cli        built      key=03df9ab4
[ci #4410] ok

[ci #4417] build //app:cli          (after CL 48213: //base:strings changed)
  //base:strings   built      key=263d45da
  //lib:fmt        built      key=979ffa1d
  //app:cli        cache hit  key=03df9ab4
[ci #4417] ok
```

## CI log: //app:server, after BUILD-80

```
[ci #4421] build //app:server
BuildError: dependency cycle: //app:server -> //lib:net -> //base:strings
    at visit (/build/tool/graph.js:14:31)
    at visit (/build/tool/graph.js:18:43)
    at visit (/build/tool/graph.js:18:43)
    at buildOrder (/build/tool/graph.js:21:3)
    at build (/build/tool/build.js:14:22)
[ci #4421] FAILED
```

## Suggestions in the incident channel (unverified)

> **ana-sre:** the cache is probably corrupted, can we just wipe it before every CI build?
>
> **raj-infra:** 32-bit FNV is small, maybe two keys collided after BUILD-77?

## Your task

Find out why `//app:cli` shipped stale and why `//app:server` reports a cycle, and fix both. Verify what you find, don't assume it. The tool's own tests (the read-only test tab) are all green in CI.

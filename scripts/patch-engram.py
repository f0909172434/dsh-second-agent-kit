from pathlib import Path
import shutil,json
import argparse
parser=argparse.ArgumentParser(description='Patch a pristine dsh-engram 0.7.5 npm package into a separate directory')
parser.add_argument('source',type=Path);parser.add_argument('destination',type=Path)
a=parser.parse_args();src=a.source.resolve();dst=a.destination.resolve()
assert json.loads((src/'package.json').read_text())['version']=='0.7.5', 'requires pristine version 0.7.5'
assert not dst.exists(), 'destination must not exist; never overwrite an installed package'
assert src not in dst.parents, 'destination must not be inside source'
shutil.copytree(src,dst,ignore=shutil.ignore_patterns('node_modules','.git'))
p=dst/'lib/index.js';s=p.read_text()
s="import { AsyncLocalStorage } from 'node:async_hooks';\n"+s
old='dbName: legacyDbName,\n\t\tsource: "cwd",';new='dbName: `project-${createHash("sha256").update(cwd).digest("hex").slice(0,24)}.db`,\n\t\tsource: "cwd",';assert old in s;s=s.replace(old,new,1)
old='const identity = resolveProjectIdentity(process.cwd());';assert old in s;s=s.replace(old,old+'\n\tconst memoryWorkspace = new AsyncLocalStorage();\n\tconst states = new WeakMap();',1)
old='scope === "shared" ? "shared.db" : identity.dbName';assert old in s;s=s.replace(old,'scope === "shared" ? "shared.db" : resolveProjectIdentity(memoryWorkspace.getStore() ?? process.cwd()).dbName',1)
old='})) ctx.tools.register(tool);';assert old in s;s=s.replace(old,'''})) ctx.tools.register({...tool, execute(args, exec) {
    const cwd = exec?.agent?.session?.header?.cwd;
    if (!cwd) throw new Error('engram requires a session workspace');
    return memoryWorkspace.run(cwd, () => tool.execute(args, exec));
  }});''',1)
old='(payload, next) => preStep(ctx, openStore, resolved, embedder, preStepState, logIngestRequest, payload, next)';assert old in s;s=s.replace(old,'''(payload, next) => {
    const cwd = payload.agent.session.header.cwd;
    if (!cwd) return next();
    let state = states.get(payload.agent);
    if (!state) {state = {...preStepState}; states.set(payload.agent, state);}
    return memoryWorkspace.run(cwd, () => preStep(ctx, openStore, resolved, embedder, state, logIngestRequest, payload, next));
  }''',1)
a=s.index('async function preStep(');b=s.index('function makeEventResolver',a)
part=s[a:b];part=part.replace('openStore: () => openStore("user"),','openStore: () => openStore("project"),\n\t\t\twriteScope: "project",')
part=part.replace('const top = await (await openStore("user")).topActive("user", resolved.profileTopN);','const top = [...await (await openStore("user")).topActive("user", resolved.profileTopN), ...await (await openStore("project")).topActive("project", resolved.profileTopN)];')
s=s[:a]+part+s[b:]
a=s.index('if (resolved.ingest !== "off") ctx.on("session/disposed"');b=s.index('\n\tconst runDecay',a);part=s[a:b];part=part.replace('openStore: () => openStore("user"),','openStore: () => openStoreForProjectCwd(session.header.cwd),\n\t\t\twriteScope: "project",');part=part.replace('if (mode === "off") return;','if (mode === "off" || !session.header.cwd) return;');s=s[:a]+part+s[b:]
p.write_text(s)
p=dst/'package.json';d=json.loads(p.read_text());d['version']='0.7.5-local.20260916';p.write_text(json.dumps(d,indent=2)+'\n')
print('Patched per-session workspace storage, project auto-ingest, hashed non-git identity')

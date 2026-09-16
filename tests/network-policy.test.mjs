import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {restrictConfinement} from '../src/network-policy.mjs';
test('retains file policy and metadata without mutating upstream',()=>{
 const original={argv:['/usr/bin/sandbox-exec','-p','(version 1)(allow default)(deny file-write*)','--','/bin/echo','ok'],enforcement:'full',denialSignatures:['denied']};
 const result=restrictConfinement(original);
 assert(result.argv[2].includes('(deny file-write*)'));
 assert(result.argv[2].includes('(deny network*)'));
 assert.equal(original.argv[2],'(version 1)(allow default)(deny file-write*)');
 assert.deepEqual(result.denialSignatures,original.denialSignatures);
});
test('fails closed for unsupported or malformed runners',()=>{
 for(const argv of [['sh'],['/tmp/sandbox-exec','-p','x'],['/usr/bin/sandbox-exec','--','x']])
 assert.throws(()=>restrictConfinement({argv}),/UNSUPPORTED/);
});
test('macOS kernel permits local computation but denies network sockets and out-of-workspace writes',{skip:process.platform!=='darwin'},()=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'dsh-guard-')));
 try {
 const profile=`(version 1)(allow default)(deny file-write*)(allow file-write* (subpath ${JSON.stringify(dir)}))`;
 const r=restrictConfinement({argv:['/usr/bin/sandbox-exec','-p',profile]});
 const script=`const fs=require('fs'),net=require('net');fs.writeFileSync(${JSON.stringify(join(dir,'allowed'))},'ok');let denied=false;try{fs.writeFileSync(${JSON.stringify(join(tmpdir(),'dsh-must-not-write-'+process.pid))},'bad')}catch{denied=true}if(!denied)process.exit(4);const socket=net.createConnection({host:'127.0.0.1',port:9});socket.once('error',e=>{if(!['EPERM','EACCES'].includes(e.code))process.exit(5);console.log('kernel denied socket and outside write')});socket.once('connect',()=>{socket.destroy();process.exit(6)});socket.setTimeout(2000,()=>{socket.destroy();process.exit(7)});`;
 const stdout=execFileSync(r.argv[0],[...r.argv.slice(1),process.execPath,'-e',script],{encoding:'utf8',timeout:10000});
 assert.match(stdout,/kernel denied/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('integrates with the pinned upstream provider',{skip:process.platform!=='darwin'},async()=>{
 const {Context}=await import('@deepseek-ai/cordis');
 const {default:Guard}=await import('../src/sandbox.mjs');
 const guard=new Guard(new Context(),{runnerCommand:[],runnerFailureSignatures:[],probeTimeoutMs:5000});
 const r=guard.confine(['/bin/echo','ok'],{mode:'workspace-write',workspaceRoot:process.cwd()});
 assert.equal(r.argv[0],'/usr/bin/sandbox-exec');assert(r.argv[2].includes('(deny network*)'));assert(r.argv[2].includes('(deny file-write*)'));
});
test('allows local Unix IPC needed by offline applications',{skip:process.platform!=='darwin'},()=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'ipc-')));
 try {
 const r=restrictConfinement({argv:['/usr/bin/sandbox-exec','-p','(version 1)(allow default)']});
 const script=`const net=require('net');const server=net.createServer(s=>s.end('local-ok'));server.listen(${JSON.stringify(join(dir,'s'))},()=>{const c=net.createConnection(${JSON.stringify(join(dir,'s'))});c.on('data',d=>{console.log(d.toString());c.end();server.close()});});setTimeout(()=>process.exit(3),3000).unref();`;
 assert.match(execFileSync(r.argv[0],[...r.argv.slice(1),process.execPath,'-e',script],{encoding:'utf8',timeout:10000}),/local-ok/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

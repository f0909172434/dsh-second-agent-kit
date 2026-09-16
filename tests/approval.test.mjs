import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apply,approvalReason} from '../src/approval.mjs';
test('writes and publishing ask, observations do not',()=>{
 for(const e of [{name:'browser_interact',arguments:{action:'fill'}},{name:'browser_tabs',arguments:{action:'borrow'}},{name:'bash',arguments:{command:'git push origin main'}}])assert(approvalReason(e));
 for(const e of [{name:'browser_interact',arguments:{action:'hover'}},{name:'bash',arguments:{command:'python -m unittest'}}])assert.equal(approvalReason(e),undefined);
});
test('never overrides downstream refusal or approval requirement',async()=>{
 let hook;apply({on:(_,fn)=>{hook=fn}});
 for(const kind of ['deny','ask']){const result={kind,reason:'upstream'};assert.equal(await hook({name:'browser_interact'},async()=>result),result)}
 assert.equal((await hook({name:'browser_interact'},async()=>({kind:'allow'}))).kind,'ask');
});

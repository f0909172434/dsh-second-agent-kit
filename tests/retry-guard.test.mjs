import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRetryGuard, applyRetryGuard} from '../src/retry-guard.mjs';

test('fresh observations and alternate input names cannot bypass two stale failures',()=>{
 const g=createRetryGuard(),agent={},other={};g.startTurn(agent,1);
 const call={agent,name:'computer_press_key',arguments:{observationId:'old'}};
 const failure={isError:true,error:{message:'COMPUTER_STALE_OBSERVATION: changed'}};
 g.result(call,failure);assert.equal(g.before(call),undefined);
 g.result({...call,name:'computer_observe'},{isError:false});g.result(call,failure);
 assert.equal(g.before({...call,name:'computer_click',arguments:{observationId:'fresh'}}).kind,'deny');
 assert.equal(g.before({...call,name:'computer_observe'}),undefined);
 assert.equal(g.before({...call,agent:other}),undefined);
 g.startTurn(agent,1);assert.equal(g.before(call).kind,'deny');
 g.startTurn(agent,2);assert.equal(g.before(call),undefined);
});
test('successful input resets failure streak, but per-turn operation cap remains',()=>{
 const g=createRetryGuard(),agent={},call={agent,name:'computer_click'};g.startTurn(agent,1);
 g.result(call,{isError:true,error:{message:'COMPUTER_ACTION_BLOCKED'}});
 g.result(call,{isError:false});g.result(call,{isError:true,error:{message:'COMPUTER_ACTION_BLOCKED'}});
 assert.equal(g.before(call),undefined);
 for(let i=0;i<17;i++)g.result(call,{isError:false});
 assert.equal(g.before(call).kind,'deny');
});

test('host hook enforces limit across ask decisions and preserves deny',async()=>{
 const hooks={};applyRetryGuard({on:(name,fn)=>{hooks[name]=fn;}});
 const agent={},exec={agent,name:'computer_click'};
 await hooks['agent/pre-step']({agent,turn:1},async()=>{});
 for(let i=0;i<2;i++)hooks['tools/result'](exec,{isError:true,error:{message:'COMPUTER_STALE_OBSERVATION'}});
 assert.equal((await hooks['tools/pre-execute'](exec,async()=>({kind:'ask'}))).kind,'deny');
 const deny={kind:'deny',reason:'existing policy'};
 assert.equal(await hooks['tools/pre-execute'](exec,async()=>deny),deny);
});

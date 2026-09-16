import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import yaml from 'js-yaml';
import {composeEntries} from '@deepseek-ai/dsh-app-boot';
test('host actually activates the restricted provider instead of skipping a name change',()=>{
 const warnings=[];
 const patch=yaml.load(readFileSync(new URL('../cordis.patch.yml',import.meta.url),'utf8'));
 const result=composeEntries([[{insert:[{id:'sandbox',name:'@deepseek-ai/dsh-sandbox-local'}]}],patch],x=>warnings.push(x));
 assert.deepEqual(warnings,[]);
 assert.equal(result.find(x=>x.id==='sandbox').disabled,true);
 assert.equal(result.find(x=>x.id==='second-agent-sandbox').name,'dsh-second-agent-kit/sandbox');
 assert.equal(result.filter(x=>!x.disabled&&/sandbox/.test(x.id)).length,1);
});

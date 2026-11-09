import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from './server.mjs';
const token='synthetic-test-token-1234567890';
async function withServer(fn){const s=makeServer({token});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+s.address().port)}finally{await new Promise(r=>s.close(r))}}
test('health does not expose records',()=>withServer(async base=>{const r=await fetch(base+'/health');assert.equal(r.status,200);assert.equal((await r.json()).dataConnected,false)}));
test('anonymous dashboard denied',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard')).status,401)));
test('wrong token denied',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard',{headers:{Authorization:'Bearer wrong'}})).status,401)));
test('synthetic authenticated dashboard',()=>withServer(async base=>{const r=await fetch(base+'/v1/dashboard?view=10min',{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,200);const j=await r.json();assert.equal(j.actions.length,1);assert.equal(j.source,'synthetic-fixture')}));
test('writes denied even with token',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard',{method:'POST',headers:{Authorization:'Bearer '+token}})).status,405)));
test('CORS is allowlisted',()=>withServer(async base=>{const r=await fetch(base+'/health',{headers:{Origin:'https://evil.example'}});assert.equal(r.headers.get('access-control-allow-origin'),null)}));
test('unknown view denied',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard?view=bad',{headers:{Authorization:'Bearer '+token}})).status,400)));
test('duplicate query denied',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard?view=overall&view=lenovo',{headers:{Authorization:'Bearer '+token}})).status,400)));
test('preflight denied',()=>withServer(async base=>assert.equal((await fetch(base+'/v1/dashboard',{method:'OPTIONS'})).status,403)));

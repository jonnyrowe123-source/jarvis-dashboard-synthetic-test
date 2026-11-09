import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../FR-GL03-12/source/server.mjs';
import {createSyntheticReadOnlyAdapter} from './fr-gl03-10-original-adapter.mjs';
import {createSyntheticContractBridge,projectSyntheticSnapshot} from './synthetic-contract-bridge.mjs';
import {createDashboardGateway} from './dashboard-gateway.mjs';

const token='synthetic-test-token-1234567890';
const origin='http://localhost:4173';
async function withServer(fn){
 const adapter=createSyntheticContractBridge(createSyntheticReadOnlyAdapter());
 const server=makeServer({token,origin,adapter});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const local='http://127.0.0.1:'+server.address().port;
 try{await fn(local)}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
function makeGateway(local,variant='valid'){
 return createDashboardGateway({baseUrl:'https://synthetic-api.invalid',fetchImpl:async(uri,options)=>{
   if(variant==='offline')throw new Error('Synthetic connection disconnected');
   const target=new URL(uri);
   return fetch(local+target.pathname+target.search,{...options,headers:{...options.headers,Origin:variant==='wrong-origin'?'https://evil.invalid':origin}});
 }});
}
test('17: original synthetic adapter maps to Codex strict response',async()=>{
 const adapter=createSyntheticContractBridge(createSyntheticReadOnlyAdapter());
 const s=await adapter.getDashboard('overall');
 assert.deepEqual(Object.keys(s.actions[0]),['id','title','context']);
 assert.deepEqual(Object.keys(s.decisions[0]),['id','title']);
 assert.equal(s.source,'synthetic-fixture');
 assert.equal(s.actions[0].revision,undefined);
});
test('17: original adapter rejects replacement non-synthetic source',async()=>{
 const fixture=await createSyntheticReadOnlyAdapter().getDashboard();
 assert.throws(()=>projectSyntheticSnapshot({...fixture,source:'canonical-brain'}),/Non-synthetic/);
});
test('17: original adapter fails closed on unknown context',async()=>{
 const fixture=await createSyntheticReadOnlyAdapter().getDashboard();
 fixture.actions[0].context='remote';
 assert.throws(()=>projectSyntheticSnapshot(fixture),/Unsupported action context/);
});
test('17: gateway + Codex server + original adapter complete synthetic read',()=>withServer(async local=>{
 const s=await makeGateway(local).readDashboard({view:'overall',getAccessToken:async()=>token});
 assert.equal(s.actions.length,2);assert.equal(s.decisions.length,1);assert.equal(s.source,'synthetic-fixture');
}));
test('17: gateway Lenovo view matches original filter',()=>withServer(async local=>{
 const s=await makeGateway(local).readDashboard({view:'lenovo',getAccessToken:async()=>token});
 assert.deepEqual(s.actions.map(x=>x.id),['SYN-A02']);
}));
test('17: anonymous API access denied',()=>withServer(async local=>{
 const r=await fetch(local+'/v1/dashboard',{headers:{Origin:origin}});
 assert.equal(r.status,401);
}));
test('17: denied Origin remains denied with valid token',()=>withServer(async local=>{
 await assert.rejects(()=>makeGateway(local,'wrong-origin').readDashboard({getAccessToken:async()=>token}),{code:'FORBIDDEN'});
}));
test('17: bad token rejected at server and interpreted by gateway',()=>withServer(async local=>{
 await assert.rejects(()=>makeGateway(local).readDashboard({getAccessToken:async()=> 'invalid-test-token-1234567'}),{code:'NOT_AUTHENTICATED'});
}));
test('17: OPTIONS preflight is constrained',()=>withServer(async local=>{
 const r=await fetch(local+'/v1/dashboard',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);
}));
test('17: writes denied with valid token',()=>withServer(async local=>{
 const r=await fetch(local+'/v1/dashboard',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}});
 assert.equal(r.status,405);
}));
test('17: offline reported without fabricated change',()=>withServer(async local=>{
 await assert.rejects(()=>makeGateway(local,'offline').readDashboard({getAccessToken:async()=>token}),{code:'NETWORK'});
}));

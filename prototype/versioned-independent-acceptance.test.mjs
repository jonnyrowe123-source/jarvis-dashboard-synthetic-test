import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOidcServer} from '../FR-GL03-23/source/server.mjs';
import {usingIssuer} from '../FR-GL03-23/source/test-issuer.mjs';
import {createSyntheticReadOnlyAdapter} from '../FR-GL03-23/source/read-only-adapter.mjs';
import {createVersionedReadOnlyAdapter} from '../FR-GL03-23/source/versioned-adapter.mjs';
import {createVersionedDashboardGateway} from '../FR-GL03-23/source/versioned-gateway.mjs';
import {validateDashboard} from '../FR-GL03-23/source/dashboard-contract.mjs';
import {createReadOnlyPresenter} from '../FR-GL03-23/source/readonly-presenter.mjs';
const withServer=async(run,adapter)=>usingIssuer(async issuer=>{
 const server=makeOidcServer({oidc:issuer.config,adapter});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await run({issuer,url:'http://127.0.0.1:'+server.address().port});}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
const adapter=()=>createVersionedReadOnlyAdapter(createSyntheticReadOnlyAdapter());
const gateway=url=>createVersionedDashboardGateway({baseUrl:url,localTest:true});
test('Vision independent: versioned HTTP to gateway to presenter retains all record metadata',()=>withServer(async({issuer,url})=>{
 const token=await issuer.sign(),presenter=createReadOnlyPresenter({gateway:gateway(url),adaptPayload:validateDashboard});
 assert.equal(await presenter.load({view:'overall',getAccessToken:async()=>token}),true);
 const state=presenter.getState();
 assert.equal(state.status,'ready');assert.equal(state.revision,'synthetic-1');assert.equal(state.actions.length,2);
 assert.deepEqual(state.actions[0],{id:'SYN-A01',title:'Review fictional project plan',revision:1,state:'open',context:'10min'});
 assert.deepEqual(state.decisions[0],{id:'SYN-D01',title:'Choose demo layout',revision:1,state:'open'});
 assert.equal(state.readOnly,true);
},adapter()));
test('Vision independent: strict authorization denies another subject without invoking adapter',()=>{let called=0;return withServer(async({issuer,url})=>{
 const denied=await gateway(url).readDashboard({getAccessToken:async()=>await issuer.sign({sub:'fictional-stranger'})}).then(()=>null,e=>e);
 assert.equal(denied.code,'FORBIDDEN');assert.equal(called,0);
},createVersionedReadOnlyAdapter({getDashboard:async view=>{called++;return createSyntheticReadOnlyAdapter().getDashboard(view)}}))});
test('Vision independent: unsupported v2 response fails closed without dropping fields',()=>withServer(async({issuer,url})=>{
 const response=await fetch(url+'/v1/dashboard?view=overall',{headers:{Authorization:'Bearer '+await issuer.sign()}});
 assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'upstream_failure'});
},{getDashboard:async()=>({...await adapter().getDashboard('overall'),schemaVersion:2})}));
test('Vision independent: cross-kind duplicate IDs fail closed at API boundary',()=>withServer(async({issuer,url})=>{
 const response=await fetch(url+'/v1/dashboard?view=overall',{headers:{Authorization:'Bearer '+await issuer.sign()}});
 assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'upstream_failure'});
},{getDashboard:async()=>{const x=structuredClone(await adapter().getDashboard('overall'));x.decisions[0].id=x.actions[0].id;return x}}));
test('Vision independent: each context view preserves revision and state',()=>withServer(async({issuer,url})=>{
 const token=await issuer.sign();
 for(const [view,id] of [['10min','SYN-A01'],['lenovo','SYN-A02']]){
  const x=await gateway(url).readDashboard({view,getAccessToken:async()=>token});
  assert.equal(x.schemaVersion,1);assert.equal(x.actions.length,1);assert.equal(x.actions[0].id,id);assert.equal(x.actions[0].revision,1);assert.equal(x.actions[0].state,'open');
 }
},adapter()));
test('Vision independent: access loss after success clears presenter snapshot',()=>withServer(async({issuer,url})=>{
 const presenter=createReadOnlyPresenter({gateway:gateway(url),adaptPayload:validateDashboard});
 assert.equal(await presenter.load({getAccessToken:async()=>await issuer.sign()}),true);
 assert.equal(await presenter.load({getAccessToken:async()=>await issuer.sign({scope:'other:read'})}),false);
 assert.equal(presenter.getState().status,'error');assert.deepEqual(presenter.getState().actions,[]);assert.equal(presenter.getState().revision,null);
},adapter()));

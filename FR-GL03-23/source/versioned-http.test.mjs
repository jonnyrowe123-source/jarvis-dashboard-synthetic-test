import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOidcServer} from './server.mjs';
import {usingIssuer} from './test-issuer.mjs';
import {createSyntheticReadOnlyAdapter} from './read-only-adapter.mjs';
import {createVersionedReadOnlyAdapter} from './versioned-adapter.mjs';
import {versionRichSnapshot,validateDashboard} from './dashboard-contract.mjs';
import {createVersionedDashboardGateway} from './versioned-gateway.mjs';
import {createReadOnlyPresenter,renderReadOnlyDashboard} from './readonly-presenter.mjs';
async function serve(fn,options={}){return usingIssuer(async issuer=>{const s=makeOidcServer({oidc:issuer.config,...options});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{const token=await issuer.sign();return await fn({base:'http://127.0.0.1:'+s.address().port,issuer,token});}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}});}
const auth=token=>({Authorization:'Bearer '+token});
test('real HTTP retains FR-10 fields all the way to FR-16 presenter with no bridge',()=>serve(async({base,token})=>{
 const wire=await (await fetch(base+'/v1/dashboard',{headers:auth(token)})).json();
 const raw=await createSyntheticReadOnlyAdapter().getDashboard();assert.deepEqual(wire,{schemaVersion:1,...raw});
 const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true});
 const presenter=createReadOnlyPresenter({gateway,adaptPayload:validateDashboard});
 assert.equal(await presenter.load({getAccessToken:async()=>token}),true);const state=presenter.getState();
 assert.deepEqual(state.actions,raw.actions);assert.deepEqual(state.decisions,raw.decisions);assert.equal(state.revision,raw.revision);assert.equal(state.readOnly,true);assert.equal(presenter.transitionAction,undefined);
}));
test('real HTTP filters views without dropping revisions, states or contexts',()=>serve(async({base,token})=>{const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true});for(const view of ['overall','10min','lenovo']){const dto=await gateway.readDashboard({view,getAccessToken:async()=>token});const raw=await createSyntheticReadOnlyAdapter().getDashboard(view);assert.deepEqual(dto,{schemaVersion:1,...raw});}}));
test('real HTTP preserves provided nonlexical order, repeats, first-five display and warning order',async()=>{
 const raw=await createSyntheticReadOnlyAdapter().getDashboard();raw.actions=Array.from({length:7},(_,i)=>({...raw.actions[0],id:'SYN-'+(7-i),revision:i,title:'Fictional source position '+i}));raw.warnings=['second warning by source','first warning by source'];
 const adapter=createVersionedReadOnlyAdapter({getDashboard:async()=>structuredClone(raw)});
 return serve(async({base,token})=>{const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true});const getAccessToken=async()=>token;
  for(let i=0;i<2;i++){const dto=await gateway.readDashboard({getAccessToken});assert.deepEqual(dto.actions,raw.actions);assert.deepEqual(dto.warnings,raw.warnings);}
  const presenter=createReadOnlyPresenter({gateway,adaptPayload:validateDashboard});await presenter.load({getAccessToken});
  const root={children:[],replaceChildren(){this.children=[];},append(x){this.children.push(x);}},documentRef={createElement(tag){return {tag,children:[],textContent:'',append(x){this.children.push(x);}};}};
  renderReadOnlyDashboard({root,state:presenter.getState(),documentRef});
  const list=root.children.find(x=>x.tag==='ul');assert.deepEqual(list.children.map(n=>n.textContent),raw.actions.slice(0,5).map(a=>a.title));assert.deepEqual(presenter.getState().actions,raw.actions);
 },{adapter});
});
for(const [label,change] of [
 ['unknown envelope key',d=>d.privateField='fictional'],['unknown action key',d=>d.actions[0].privateField='fictional'],['unknown decision key',d=>d.decisions[0].privateField='fictional'],['duplicate cross-kind ID',d=>d.decisions[0].id=d.actions[0].id],['duplicate action ID',d=>d.actions[1].id=d.actions[0].id],
 ['missing record revision',d=>delete d.actions[0].revision],['missing record state',d=>delete d.decisions[0].state],['negative record revision',d=>d.decisions[0].revision=-1],['unknown state',d=>d.actions[0].state='done'],['unsupported version',d=>d.schemaVersion=2],['missing version',d=>delete d.schemaVersion],['wrong context',d=>d.actions[0].context='other'],['invalid Unicode',d=>d.actions[0].title='\udfff'],['invalid warning',d=>d.warnings=[{secret:'fictional'}]],['oversized collections',d=>d.actions=Array(101).fill(d.actions[0])],
 ['valid structure oversized UTF8',d=>{d.actions=Array.from({length:100},(_,i)=>({...d.actions[0],id:'SYN-'+i,title:'界'.repeat(200)}));d.warnings=Array(100).fill('界'.repeat(512));}]
])test('HTTP redacts invalid versioned source: '+label,async()=>{const d=structuredClone(versionRichSnapshot(await createSyntheticReadOnlyAdapter().getDashboard()));change(d);return serve(async({base,token})=>{const r=await fetch(base+'/v1/dashboard',{headers:auth(token)});assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'upstream_failure'});assert.equal(r.headers.get('cache-control'),'no-store');},{adapter:{getDashboard:async()=>d}});});
test('no silent filter repairs a source returning another view',()=>serve(async({base,token})=>{const r=await fetch(base+'/v1/dashboard?view=10min',{headers:auth(token)});assert.equal(r.status,502);},{adapter:{getDashboard:async()=>versionRichSnapshot(await createSyntheticReadOnlyAdapter().getDashboard())}}));
test('unsupported version negotiation/query cannot downgrade to legacy transport',()=>serve(async({base,token})=>{assert.equal((await fetch(base+'/v1/dashboard?schemaVersion=2',{headers:auth(token)})).status,400);assert.equal((await fetch(base+'/v2/dashboard',{headers:auth(token)})).status,404);}));
test('gateway sends bearer only in header over actual loopback HTTP',()=>serve(async({base,token})=>{let seen=false;const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true,fetchImpl:async(url,init)=>{seen=true;assert.equal(url.includes(token),false);assert.equal(new URL(url).pathname,'/v1/dashboard');assert.equal(init.headers.Authorization,'Bearer '+token);assert.equal(init.cache,'no-store');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');return fetch(url,init);}});assert.equal((await gateway.readDashboard({getAccessToken:async()=>token})).schemaVersion,1);assert.equal(seen,true);}));
test('presenter clears all records after identity rejection over actual HTTP',()=>serve(async({base,token,issuer})=>{const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true}),presenter=createReadOnlyPresenter({gateway,adaptPayload:validateDashboard});await presenter.load({getAccessToken:async()=>token});assert.equal(presenter.getState().status,'ready');await presenter.load({getAccessToken:async()=>issuer.sign({sub:'fictional-denied'})});assert.equal(presenter.getState().status,'error');assert.deepEqual(presenter.getState().actions,[]);assert.equal(presenter.getState().revision,null);}));
test('concurrent versioned HTTP view reads retain identity and correct snapshots',()=>serve(async({base,token})=>{const gateway=createVersionedDashboardGateway({baseUrl:base,localTest:true});const values=await Promise.all(Array.from({length:20},(_,i)=>gateway.readDashboard({view:i%2?'10min':'lenovo',getAccessToken:async()=>token})));for(let i=0;i<values.length;i++){const d=values[i];assert.equal(d.actions[0].id,i%2?'SYN-A01':'SYN-A02');assert.equal(d.actions[0].revision,1);assert.equal(d.actions[0].state,'open');assert.equal(d.schemaVersion,1);}}));

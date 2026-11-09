import test from "node:test";import assert from "node:assert/strict";
import {makeOidcServer} from "../FR-GL03-19/source/server.mjs";
import {usingIssuer} from "../FR-GL03-19/source/test-issuer.mjs";
import {createDashboardGateway} from "./dashboard-gateway.mjs";
import {createSyntheticReadOnlyAdapter} from "./read-only-adapter.mjs";
import {createOidcSyntheticBridge} from "./oidc-synthetic-bridge.mjs";
const allowedOrigin="http://localhost:4173";
const serve=async(fn,source=createSyntheticReadOnlyAdapter())=>usingIssuer(async issuer=>{
 const server=makeOidcServer({oidc:issuer.config,adapter:createOidcSyntheticBridge(source),origin:allowedOrigin});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 try{return await fn({base:"http://127.0.0.1:"+server.address().port,issuer});}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
const auth=token=>({Authorization:"Bearer "+token});
test("22.1 authorized fictional subject reads richer source through strict OIDC HTTP bridge",()=>serve(async({base,issuer})=>{
 const response=await fetch(base+"/v1/dashboard?view=overall",{headers:auth(await issuer.sign())});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.source,"synthetic-fixture");assert.equal(body.revision,"synthetic-1");
 assert.deepEqual(body.actions.map(a=>a.id),["SYN-A01","SYN-A02"]);
 assert.deepEqual(body.decisions.map(d=>d.id),["SYN-D01"]);
 assert.equal(Object.hasOwn(body.actions[0],"revision"),false);
}));
test("22.2 OIDC requests honor 10min and Lenovo filters",()=>serve(async({base,issuer})=>{
 const token=await issuer.sign();
 for(const [view,id] of [["10min","SYN-A01"],["lenovo","SYN-A02"]]){
  const r=await fetch(base+"/v1/dashboard?view="+view,{headers:auth(token)});
  assert.equal(r.status,200);assert.deepEqual((await r.json()).actions.map(x=>x.id),[id]);
 }
}));
test("22.3 unknown subject rejected before source adapter",()=>serve(async({base,issuer})=>{
 const r=await fetch(base+"/v1/dashboard",{headers:auth(await issuer.sign({sub:"fictional-stranger"}))});
 assert.equal(r.status,403);assert.deepEqual(await r.json(),{error:"forbidden"});
 assert.equal(r.headers.get("cache-control"),"no-store");
}));
test("22.4 missing dashboard scope rejected",()=>serve(async({base,issuer})=>{
 const r=await fetch(base+"/v1/dashboard",{headers:auth(await issuer.sign({scope:"unrelated:read"}))});
 assert.equal(r.status,403);
}));
test("22.5 invalid or absent token refused without synthetic fallback",()=>serve(async({base})=>{
 const a=await fetch(base+"/v1/dashboard");const b=await fetch(base+"/v1/dashboard",{headers:auth("fake-token")});
 assert.equal(a.status,401);assert.equal(b.status,401);
}));
test("22.6 malformed rich record blocked as redacted upstream failure",()=>serve(async({base,issuer})=>{
 const r=await fetch(base+"/v1/dashboard",{headers:auth(await issuer.sign())});
 assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:"upstream_failure"});
},{getDashboard:async()=>{const x=await createSyntheticReadOnlyAdapter().getDashboard();x.actions[0].secret="leak";return x}}));
test("22.7 duplicate cross-kind ID blocked as 502",()=>serve(async({base,issuer})=>{
 const r=await fetch(base+"/v1/dashboard",{headers:auth(await issuer.sign())});
 assert.equal(r.status,502);
},{getDashboard:async()=>{const x=await createSyntheticReadOnlyAdapter().getDashboard();x.decisions[0].id=x.actions[0].id;return x}}));
test("22.8 valid JWT cannot enable HTTP writes",()=>serve(async({base,issuer})=>{
 const r=await fetch(base+"/v1/dashboard",{method:"POST",headers:auth(await issuer.sign())});
 assert.equal(r.status,405);
}));
test("22.9 browser-side gateway rejects non-HTTPS remote origin",()=>{assert.throws(()=>createDashboardGateway({baseUrl:"http://example.com"}),TypeError)});
test("22.10 no token is retained by gateway or passed through URL",()=>serve(async({base,issuer})=>{
 const token=await issuer.sign();
 const gateway=createDashboardGateway({baseUrl:"https://dashboard.synthetic.invalid",fetchImpl:async(url,init)=>{
  assert.match(url,/view=overall$/);assert.equal(url.includes(token),false);assert.equal(init.headers.Authorization,"Bearer "+token);
  return fetch(base+"/v1/dashboard?view=overall",{headers:auth(token)});
 }});
 const payload=await gateway.readDashboard({getAccessToken:async()=>token});
 assert.equal(payload.actions.length,2);assert.equal(JSON.stringify(payload).includes(token),false);
}));

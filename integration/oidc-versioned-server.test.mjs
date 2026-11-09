import test from "node:test";
import assert from "node:assert/strict";
import {usingIssuer} from "../FR-GL03-19/source/test-issuer.mjs";
import {makeVersionedSyntheticOidcServer} from "./oidc-versioned-server.mjs";
import {createSyntheticReadOnlyAdapter} from "../prototype/read-only-adapter.mjs";
const tokenHeader=token=>({Authorization:"Bearer "+token});
async function withApi(issuer,fn,adapter){
 const api=makeVersionedSyntheticOidcServer({oidc:issuer.config,adapter:adapter??createSyntheticReadOnlyAdapter()});
 await new Promise(resolve=>api.listen(0,"127.0.0.1",resolve));
 try{return await fn("http://127.0.0.1:"+api.address().port)}
 finally{api.closeAllConnections();await new Promise(resolve=>api.close(resolve))}
}
test("23.1 authenticated HTTP preserves action revisions/state and DTO schema",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:tokenHeader(await issuer.sign())});
 assert.equal(response.status,200);
 const dto=await response.json();assert.equal(dto.schemaVersion,1);assert.equal(dto.source,"synthetic-fixture");
 assert.equal(dto.actions[0].revision,1);assert.equal(dto.actions[0].state,"open");
 assert.equal(dto.decisions[0].revision,1);assert.equal(dto.decisions[0].state,"open");
})));
test("23.2 OIDC rejects missing and wrong permissions",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 assert.equal((await fetch(base+"/v1/dashboard")).status,401);
 assert.equal((await fetch(base+"/v1/dashboard",{headers:tokenHeader(await issuer.sign({scope:"wrong:scope"}))})).status,403);
})));
test("23.3 provider refusal does not access adapter",()=>usingIssuer(async issuer=>{
 issuer.state.status=503;let calls=0;
 await withApi(issuer,async base=>{
  const response=await fetch(base+"/v1/dashboard",{headers:tokenHeader(await issuer.sign())});
  assert.equal(response.status,503);assert.equal(calls,0);assert.deepEqual(await response.json(),{error:"authentication_unavailable"});
 },{getDashboard:async()=>{calls++;return createSyntheticReadOnlyAdapter().getDashboard()}});
}));
test("23.4 reject duplicate IDs, do not expose records",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:tokenHeader(await issuer.sign())});
 assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:"upstream_failure"});
},{getDashboard:async()=>{const dto=await createSyntheticReadOnlyAdapter().getDashboard();dto.decisions[0].id=dto.actions[0].id;return dto;}})));
test("23.5 reject unknown canonical-shaped extra fields, no silent dropping",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:tokenHeader(await issuer.sign())});
 assert.equal(response.status,502);
},{getDashboard:async()=>({...await createSyntheticReadOnlyAdapter().getDashboard(),privateValue:"hidden"})})));
test("23.6 writes refused regardless of authentication",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 for(const method of ["POST","PUT","PATCH","DELETE"]){const response=await fetch(base+"/v1/dashboard",{method,headers:tokenHeader(await issuer.sign())});assert.equal(response.status,405)}
})));
test("23.7 view filtering keeps versioned identity and state",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 const response=await fetch(base+"/v1/dashboard?view=lenovo",{headers:tokenHeader(await issuer.sign())});
 assert.equal(response.status,200);const dto=await response.json();assert.equal(dto.schemaVersion,1);
 assert.equal(dto.actions.length,1);assert.equal(dto.actions[0].context,"lenovo");assert.equal(dto.actions[0].state,"open");
})));
test("23.8 synthetic server forbidden when NODE_ENV=production",()=>usingIssuer(async issuer=>{
 const prev=process.env.NODE_ENV;process.env.NODE_ENV="production";
 try{assert.throws(()=>makeVersionedSyntheticOidcServer({oidc:issuer.config}),/forbidden/);}
 finally{if(prev===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prev}
}));
test("23.9 only read-only preflight allowed",()=>usingIssuer(async issuer=>withApi(issuer,async base=>{
 const allowed=await fetch(base+"/v1/dashboard",{method:"OPTIONS",headers:{Origin:"http://localhost:4173","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization"}});assert.equal(allowed.status,204);
 const refused=await fetch(base+"/v1/dashboard",{method:"OPTIONS",headers:{Origin:"http://localhost:4173","Access-Control-Request-Method":"POST"}});assert.equal(refused.status,403);
})));

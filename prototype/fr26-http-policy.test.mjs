// FR-GL03-26 — independent loopback HTTP proof of request-bound OIDC identity.
// Fictional tenant records only. Read-only; no persistent keys or real Brain connector.
import test from "node:test";
import assert from "node:assert/strict";
import {usingIssuer} from "../FR-GL03-23/source/test-issuer.mjs";
import {makeFictionalAuthorizedServer} from "../FR-GL03-26/authorized-server.mjs";
import {createFictionalReadPolicy,fictionalRows,fictionalTenants} from "../FR-GL03-26/fictional-read-policy.mjs";
const policy=()=>createFictionalReadPolicy({snapshotSource:fictionalRows,subjectTenants:fictionalTenants});
async function withApi(fn,readPolicy=policy()){
 return usingIssuer(async issuer=>{
  const oidc={...issuer.config,allowedSubjects:["fictional-alice","fictional-bob"]};
  const server=makeFictionalAuthorizedServer({oidc,readPolicy,origin:"http://localhost:4173"});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{return await fn({base:"http://127.0.0.1:"+server.address().port,issuer})}
  finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
 });
}
const get=(base,token,view="overall")=>fetch(base+"/v1/dashboard?view="+view,{headers:token?{Authorization:"Bearer "+token}:{}});
test("26.12 Alice OIDC subject sees only tenant-red records and no private fields",()=>withApi(async({base,issuer})=>{
 const response=await get(base,await issuer.sign());
 assert.equal(response.status,200);
 const dto=await response.json();
 assert.equal(dto.schemaVersion,1);
 assert.deepEqual(dto.actions.map(r=>r.id),["PUBLIC_A2","PUBLIC_A1"]);
 assert.deepEqual(dto.decisions.map(r=>r.id),["PUBLIC_D1"]);
 assert.equal(JSON.stringify(dto).includes("privateNotes"),false);
 assert.equal(JSON.stringify(dto).includes("tenant-blue"),false);
 assert.equal(JSON.stringify(dto).includes("BLUE_A1"),false);
 assert.equal(dto.revision,"fictional-revision-7");
}));
test("26.13 Bob OIDC subject sees only tenant-blue record",()=>withApi(async({base,issuer})=>{
 const response=await get(base,await issuer.sign({sub:"fictional-bob"}));
 assert.equal(response.status,200);
 const dto=await response.json();
 assert.deepEqual(dto.actions.map(r=>r.id),["BLUE_A1"]);
 assert.deepEqual(dto.decisions,[]);
}));
test("26.14 repeated interleaved requests cannot reuse previous principal",()=>withApi(async({base,issuer})=>{
 const alice=await issuer.sign(),bob=await issuer.sign({sub:"fictional-bob"});
 const subjects=[alice,bob,bob,alice,bob,alice,alice,bob];
 const responses=await Promise.all(subjects.map(token=>get(base,token)));
 for(let i=0;i<responses.length;i++){
  assert.equal(responses[i].status,200);
  const ids=(await responses[i].json()).actions.map(r=>r.id);
  assert.deepEqual(ids,subjects[i]===bob?["BLUE_A1"]:["PUBLIC_A2","PUBLIC_A1"]);
 }
}));
test("26.15 unauthenticated and invalid token never invoke read policy",()=>withApi(async({base})=>{
 const response=await get(base);
 assert.equal(response.status,401);
},{read:async()=>{throw Error("source should not be reached")}}));
test("26.16 unlisted subject and missing scope fail before policy",()=>withApi(async({base,issuer})=>{
 const unknown=await get(base,await issuer.sign({sub:"fictional-charlie"}));
 assert.equal(unknown.status,403);
 const scope=await get(base,await issuer.sign({scope:"different:read"}));
 assert.equal(scope.status,403);
},{read:async()=>{throw Error("source must not run")}}));
test("26.17 source error is generic, never exposes fictional private notes",()=>withApi(async({base,issuer})=>{
 const response=await get(base,await issuer.sign());
 assert.equal(response.status,502);
 assert.deepEqual(await response.json(),{error:"upstream_failure"});
},{read:async()=>{throw Error("secret fictional source record")}}));
test("26.18 server startup fails without OIDC configuration or explicit read policy",()=>{
 assert.throws(()=>makeFictionalAuthorizedServer({readPolicy:policy()}));
 assert.throws(()=>makeFictionalAuthorizedServer({oidc:{},readPolicy:policy()}));
 assert.throws(()=>makeFictionalAuthorizedServer({readPolicy:{}}));
});
test("26.19 writes remain denied even with valid identity",()=>withApi(async({base,issuer})=>{
 const token=await issuer.sign();
 for(const method of ["POST","PUT","PATCH","DELETE"]){
  const response=await fetch(base+"/v1/dashboard",{method,headers:{Authorization:"Bearer "+token}});
  assert.equal(response.status,405);
 }
}));
test("26.20 filtered views stay per-principal and preserve source order",()=>withApi(async({base,issuer})=>{
 const alice=await issuer.sign(),bob=await issuer.sign({sub:"fictional-bob"});
 const [a,b]=await Promise.all([get(base,alice,"10min"),get(base,bob,"lenovo")]);
 assert.equal(a.status,200);assert.equal(b.status,200);
 assert.deepEqual((await a.json()).actions.map(x=>x.id),["PUBLIC_A2"]);
 assert.deepEqual((await b.json()).actions.map(x=>x.id),["BLUE_A1"]);
}));
test("26.21 valid browser CORS preflight does not expose any data",()=>withApi(async({base})=>{
 const response=await fetch(base+"/v1/dashboard?view=10min",{method:"OPTIONS",headers:{Origin:"http://localhost:4173","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization"}});
 assert.equal(response.status,204);
 assert.equal(await response.text(),"");
}));

test("26.22 successful, denied and malformed requests are not cacheable",()=>withApi(async({base,issuer})=>{
 for(const token of [await issuer.sign(),await issuer.sign({scope:"other:read"}),null]){
  const response=await get(base,token);
  assert.equal(response.headers.get("cache-control"),"no-store");
 }
}));

test("26A.5 HTTP policy retains tenant isolation after caller mutates mapping",async()=>{
 const subjectTenants={...fictionalTenants};
 const readPolicy=createFictionalReadPolicy({subjectTenants,snapshotSource:{async getDashboard(){
  const snapshot=await fictionalRows.getDashboard();
  snapshot.actions[1].acl.subjects.push("fictional-alice");
  return snapshot;
 }}});
 subjectTenants["fictional-alice"]="tenant-blue";
 subjectTenants["fictional-bob"]="tenant-red";
 await withApi(async({base,issuer})=>{
  for(const [subject,expected] of [["fictional-alice",["PUBLIC_A2","PUBLIC_A1"]],["fictional-bob",["BLUE_A1"]]]){
   const response=await get(base,await issuer.sign({sub:subject}));
   assert.equal(response.status,200);
   assert.deepEqual((await response.json()).actions.map(x=>x.id),expected);
  }
 },readPolicy);
});
test("26A.6 inherited strict CORS preflight and authenticated GET remain intact",()=>withApi(async({base,issuer})=>{
 const origin="http://localhost:4173";
 const preflight=(query,changes={})=>fetch(base+"/v1/dashboard"+query,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization",...changes}});
 for(const query of ["","?view=overall","?view=10min","?view=lenovo"]){
  const response=await preflight(query);
  assert.equal(response.status,204);assert.equal(await response.text(),"");
  assert.equal(response.headers.get("access-control-allow-origin"),origin);
  assert.equal(response.headers.get("access-control-allow-methods"),"GET");
  assert.equal(response.headers.get("access-control-allow-headers"),"Authorization");
 }
 for(const query of ["?view=%6fverall","?view=overall&view=lenovo","?view=bad","?view="])
  assert.equal((await preflight(query)).status,403);
 for(const changes of [{Origin:"https://untrusted.invalid"},{"Access-Control-Request-Method":"POST"},{"Access-Control-Request-Headers":"Authorization,X-Debug"}])
  assert.equal((await preflight("?view=overall",changes)).status,403);
 const unauthenticated=await fetch(base+"/v1/dashboard",{headers:{Origin:origin}});
 assert.equal(unauthenticated.status,401);
 const response=await fetch(base+"/v1/dashboard",{headers:{Origin:origin,Authorization:"Bearer "+await issuer.sign()}});
 assert.equal(response.status,200);assert.equal(response.headers.get("access-control-allow-origin"),origin);
 assert.deepEqual((await response.json()).actions.map(x=>x.id),["PUBLIC_A2","PUBLIC_A1"]);
}));

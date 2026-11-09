// FR-GL03-17: actual hardened Codex HTTP server <-> Vision gateway, synthetic-only.
import test from "node:test";
import assert from "node:assert/strict";
import { makeServer } from "../FR-GL03-12/source/server.mjs";
import { createDashboardGateway } from "./dashboard-gateway.mjs";
import { createSyntheticReadOnlyAdapter as createRicherAdapter } from "./read-only-adapter.mjs";

const token="synthetic-integration-token-1234567890";
const allowedOrigin="http://localhost:4173";
async function withServer(fn,adapter) {
 const server=makeServer({token,origin:allowedOrigin,...(adapter?{adapter}:{})});
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 try {return await fn("http://127.0.0.1:"+server.address().port)}
 finally {await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
function gatewayFor(base) {
 let requests=0;
 const gateway=createDashboardGateway({
  baseUrl:"https://synthetic-api.invalid/",
  fetchImpl:async (url,options)=>{
   requests++;
   const parsed=new URL(url);
   const httpUrl=base+parsed.pathname+parsed.search;
   return fetch(httpUrl,{...options,headers:{...options.headers,Origin:allowedOrigin}});
  }
 });
 return {gateway,reads:()=>requests};
}
test("17.1 real HTTP gateway fetches hardened synthetic fixture",()=>withServer(async base=>{
 const {gateway,reads}=gatewayFor(base);
 const snapshot=await gateway.readDashboard({view:"overall",getAccessToken:async()=>token});
 assert.equal(snapshot.source,"synthetic-fixture");
 assert.equal(snapshot.revision,"synthetic-1");
 assert.equal(snapshot.actions.length,2);
 assert.equal(snapshot.decisions.length,1);
 assert.equal(reads(),1);
}));
test("17.2 Lenovo filter honored by actual hardened server",()=>withServer(async base=>{
 const {gateway}=gatewayFor(base);
 const snapshot=await gateway.readDashboard({view:"lenovo",getAccessToken:async()=>token});
 assert.deepEqual(snapshot.actions.map(a=>a.id),["SYN-A02"]);
}));
test("17.3 wrong authentication fails closed as session error",()=>withServer(async base=>{
 const {gateway}=gatewayFor(base);
 await assert.rejects(()=>gateway.readDashboard({getAccessToken:async()=>"incorrect-synthetic-token"}),{code:"NOT_AUTHENTICATED"});
}));
test("17.4 no token means no request is made",()=>withServer(async base=>{
 const {gateway,reads}=gatewayFor(base);
 await assert.rejects(()=>gateway.readDashboard(),{code:"NOT_AUTHENTICATED"});
 assert.equal(reads(),0);
}));
test("17.5 network outage fails closed",async()=>{
 const gateway=createDashboardGateway({baseUrl:"https://synthetic-api.invalid/",fetchImpl:async()=>{throw Error("offline")}});
 await assert.rejects(()=>gateway.readDashboard({getAccessToken:async()=>token}),{code:"NETWORK"});
});
test("17.6 browser preflight allows only approved read-only header",()=>withServer(async base=>{
 const ok=await fetch(base+"/v1/dashboard",{method:"OPTIONS",headers:{Origin:allowedOrigin,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization"}});
 assert.equal(ok.status,204);
 assert.equal(ok.headers.get("access-control-allow-origin"),allowedOrigin);
 assert.equal(ok.headers.get("access-control-allow-headers"),"Authorization");
 const denied=await fetch(base+"/v1/dashboard",{method:"OPTIONS",headers:{Origin:"https://evil.invalid","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"Authorization"}});
 assert.equal(denied.status,403);
}));
test("17.7 authenticated HTTP write is denied",()=>withServer(async base=>{
 const response=await fetch(base+"/v1/dashboard",{method:"POST",headers:{Authorization:"Bearer "+token,Origin:allowedOrigin}});
 assert.equal(response.status,405);
}));
test("17.8 current FR-GL03-10 richer adapter is incompatible and rejected with 502",()=>withServer(async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:{Authorization:"Bearer "+token,Origin:allowedOrigin}});
 assert.equal(response.status,502);
 assert.equal((await response.json()).error,"upstream_failure");
},createRicherAdapter()));
test("17.9 gateway maps incompatible adapter response to server error",()=>withServer(async base=>{
 const {gateway}=gatewayFor(base);
 await assert.rejects(()=>gateway.readDashboard({getAccessToken:async()=>token}),{code:"SERVER"});
},createRicherAdapter()));

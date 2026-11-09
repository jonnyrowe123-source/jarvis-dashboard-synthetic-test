import test from "node:test";
import assert from "node:assert/strict";
import {createSyntheticReadOnlyAdapter,validateSnapshot} from "./read-only-adapter.mjs";
import {createDashboardGateway} from "./dashboard-gateway.mjs";
const baseUrl="https://synthetic-api.example.test/";
const adapter=createSyntheticReadOnlyAdapter();
function fakeServer({mode="ok"}={}) {
 const requests=[];
 async function fetchImpl(url,opts){
  requests.push({url,method:opts.method,credentials:opts.credentials,cache:opts.cache});
  if(mode==="offline") throw new Error("offline");
  if(!opts.headers.Authorization) return new Response("",{status:401});
  if(mode==="expired") return new Response("",{status:401});
  if(mode==="forbidden") return new Response("",{status:403});
  if(mode==="html") return new Response("<html>",{status:200,headers:{"content-type":"text/html"}});
  const view=new URL(url).searchParams.get("view")||"overall";
  const snapshot=await adapter.getDashboard(view);
  return new Response(JSON.stringify(snapshot),{status:200,headers:{"content-type":"application/json"}});
 }
 return {requests,fetchImpl};
}
test("FR-GL03-14: overall read-only integration",async()=>{
 const api=fakeServer();const gateway=createDashboardGateway({baseUrl,fetchImpl:api.fetchImpl});
 const snapshot=validateSnapshot(await gateway.readDashboard({getAccessToken:async()=>"synthetic-only"}));
 assert.equal(snapshot.source,"synthetic-fixture");assert.equal(snapshot.actions.length,2);
 assert.equal(api.requests.length,1);assert.equal(api.requests[0].method,"GET");
});
test("FR-GL03-14: context filtering survives gateway",async()=>{
 const api=fakeServer();const gateway=createDashboardGateway({baseUrl,fetchImpl:api.fetchImpl});
 const snapshot=await gateway.readDashboard({view:"lenovo",getAccessToken:async()=>"synthetic-only"});
 assert.deepEqual(snapshot.actions.map(x=>x.id),["SYN-A02"]);
});
for(const [mode,code] of [["offline","NETWORK"],["expired","NOT_AUTHENTICATED"],["forbidden","FORBIDDEN"],["html","INVALID_RESPONSE"]]){
 test("FR-GL03-14: "+mode+" fails closed",async()=>{
  const api=fakeServer({mode});const gateway=createDashboardGateway({baseUrl,fetchImpl:api.fetchImpl});
  await assert.rejects(()=>gateway.readDashboard({getAccessToken:async()=>"synthetic-only"}),{code});
 });
}
test("FR-GL03-14: no write path on gateway",()=>{
 const api=fakeServer();const gateway=createDashboardGateway({baseUrl,fetchImpl:api.fetchImpl});
 assert.equal("transitionAction" in gateway,false);
 assert.equal("resolveDecision" in gateway,false);
});

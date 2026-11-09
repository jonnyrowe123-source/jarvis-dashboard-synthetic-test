import test from "node:test";import assert from "node:assert/strict";
import {makeServer} from "../FR-GL03-12/source/server.mjs";
import {createSyntheticReadOnlyAdapter} from "./read-only-adapter.mjs";
import {createLegacyFixtureBridge} from "./versioned-http-adapter.mjs";
const token="synthetic-bridge-token-1234567890123456";
async function run(fn,adapter=createSyntheticReadOnlyAdapter()){
 const server=makeServer({token,adapter:createLegacyFixtureBridge(adapter)});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 try{return await fn("http://127.0.0.1:"+server.address().port)}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
test("versioned bridge reads richer FR-GL03-10 fixture over hardened HTTP",()=>run(async base=>{
 const response=await fetch(base+"/v1/dashboard?view=lenovo",{headers:{Authorization:"Bearer "+token}});
 assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.source,"synthetic-fixture");assert.deepEqual(data.actions.map(a=>a.id),["SYN-A02"]);
}));
test("versioned bridge rejects unknown fields before transport",()=>run(async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:{Authorization:"Bearer "+token}});
 assert.equal(response.status,502);assert.equal((await response.json()).error,"upstream_failure");
},{getDashboard:async()=>({...await createSyntheticReadOnlyAdapter().getDashboard(),privateRecord:"do-not-leak"})}));
test("versioned bridge rejects duplicate IDs",()=>run(async base=>{
 const response=await fetch(base+"/v1/dashboard",{headers:{Authorization:"Bearer "+token}});
 assert.equal(response.status,502);
},{getDashboard:async()=>{const x=await createSyntheticReadOnlyAdapter().getDashboard();x.decisions[0].id=x.actions[0].id;return x}}));
test("bridge has no write methods",()=>{const bridge=createLegacyFixtureBridge(createSyntheticReadOnlyAdapter());assert.equal(bridge.transition,undefined);assert.equal(bridge.resolve,undefined)});

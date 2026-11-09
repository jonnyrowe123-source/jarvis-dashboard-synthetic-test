// FR-GL03-25 independent exact-query browser preflight regression tests.
// Fictional loopback issuer only; original Codex FR-GL03-23 server remains unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import {makeOidcServer} from "../FR-GL03-25/server.mjs";
import {usingIssuer} from "../FR-GL03-23/source/test-issuer.mjs";
const origin="http://localhost:4173";
async function withApi(fn){return usingIssuer(async issuer=>{const server=makeOidcServer({oidc:issuer.config,origin});await new Promise(r=>server.listen(0,"127.0.0.1",r));try{return await fn("http://127.0.0.1:"+server.address().port,issuer)}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}})}
const preflight=(base,path,changes={})=>fetch(base+path,{method:"OPTIONS",headers:{Origin:origin,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"authorization",...changes}});
test("25.1 browser preflight accepts all three exact canonical view parameters",()=>withApi(async base=>{for(const view of ["overall","10min","lenovo"]){const r=await preflight(base,"/v1/dashboard?view="+view);assert.equal(r.status,204);assert.equal(r.headers.get("access-control-allow-origin"),origin);assert.equal(r.headers.get("access-control-allow-methods"),"GET");assert.equal(r.headers.get("access-control-allow-headers"),"Authorization");}}));
test("25.2 no-query browser preflight remains permitted",()=>withApi(async base=>{assert.equal((await preflight(base,"/v1/dashboard")).status,204)}));
test("25.3 unknown or encoded query is denied at preflight",()=>withApi(async base=>{for(const q of ["view=bad","view=overall&view=lenovo","view=%6fverall","schemaVersion=2","view=overall&token=fictional","view="])assert.equal((await preflight(base,"/v1/dashboard?"+q)).status,403)}));
test("25.4 wrong origin, unexpected header and write preflight remain denied",()=>withApi(async base=>{for(const h of [{Origin:"https://untrusted.invalid"},{"Access-Control-Request-Headers":"authorization, x-debug"},{"Access-Control-Request-Method":"POST"}])assert.equal((await preflight(base,"/v1/dashboard?view=overall",h)).status,403)}));
test("25.5 legitimate OPTIONS never bypasses OIDC GET authentication",()=>withApi(async base=>{const r=await fetch(base+"/v1/dashboard?view=overall");assert.equal(r.status,401);assert.equal(r.headers.get("access-control-allow-origin"),null)}));
test("25.6 actual authorised GET still validates bearer and preserves metadata",()=>withApi(async(base,issuer)=>{const r=await fetch(base+"/v1/dashboard?view=overall",{headers:{Authorization:"Bearer "+await issuer.sign(),Origin:origin}});assert.equal(r.status,200);assert.equal(r.headers.get("access-control-allow-origin"),origin);const dto=await r.json();assert.equal(dto.schemaVersion,1);assert.equal(dto.actions[0].revision,1);assert.equal(dto.actions[0].state,"open")}));

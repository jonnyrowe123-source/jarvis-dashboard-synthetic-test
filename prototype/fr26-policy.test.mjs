import test from "node:test";
import assert from "node:assert/strict";
import {createFictionalReadPolicy,fictionalRows,fictionalTenants} from "../FR-GL03-26/fictional-read-policy.mjs";
const principal=(subject)=>({issuer:"http://127.0.0.1:45123",subject,clientId:"fictional-client",permissions:["dashboard:read"]});
const policy=()=>createFictionalReadPolicy({snapshotSource:fictionalRows,subjectTenants:fictionalTenants});
test("26.1 exact permitted records appear in original order with metadata",async()=>{
 const r=await policy().read({principal:principal("fictional-alice")});
 assert.equal(r.schemaVersion,1);assert.equal(r.revision,"fictional-revision-7");
 assert.deepEqual(r.actions.map(a=>a.id),["PUBLIC_A2","PUBLIC_A1"]);
 assert.deepEqual(r.actions.map(a=>a.revision),[4,3]);
 assert.deepEqual(r.decisions.map(d=>d.id),["PUBLIC_D1"]);
 assert.deepEqual(r.warnings,[]);
 assert.equal(JSON.stringify(r).includes("privateNotes"),false);
});
test("26.2 tenant isolation prevents blue records leaking to Alice",async()=>{
 const r=await policy().read({principal:principal("fictional-alice")});
 assert.equal(JSON.stringify(r).includes("BLUE_A1"),false);
 assert.equal(JSON.stringify(r).includes("do not disclose"),false);
});
test("26.3 blue tenant sees blue record only",async()=>{
 const r=await policy().read({principal:principal("fictional-bob")});
 assert.deepEqual(r.actions.map(a=>a.id),["BLUE_A1"]);
 assert.equal(r.decisions.length,0);
});
test("26.4 scoped filters are applied after authorization",async()=>{
 const ten=await policy().read({principal:principal("fictional-alice"),view:"10min"});
 const len=await policy().read({principal:principal("fictional-alice"),view:"lenovo"});
 assert.deepEqual(ten.actions.map(a=>a.id),["PUBLIC_A2"]);
 assert.deepEqual(len.actions.map(a=>a.id),["PUBLIC_A1"]);
 assert.equal(ten.decisions.length,1);
});
test("26.5 missing or mismatched subject fails closed",async()=>{
 for(const p of [null,{},principal("fictional-mallory"),{...principal("fictional-alice"),permissions:[]}, {...principal("fictional-alice"),permissions:["dashboard:write"]}])
  await assert.rejects(()=>policy().read({principal:p}),TypeError);
});
test("26.6 cross-tenant ACL inconsistency is rejected",async()=>{
 const source={getDashboard:async()=>{
 const s=await fictionalRows.getDashboard();s.actions[0].acl.tenant="tenant-blue";return s;}};
 await assert.rejects(()=>createFictionalReadPolicy({snapshotSource:source,subjectTenants:fictionalTenants}).read({principal:principal("fictional-alice")}),TypeError);
});
test("26.7 duplicate IDs are rejected even when the duplicate would be hidden",async()=>{
 const source={getDashboard:async()=>{
 const s=await fictionalRows.getDashboard();s.actions[1].record.id=s.actions[0].record.id;return s;}};
 await assert.rejects(()=>createFictionalReadPolicy({snapshotSource:source,subjectTenants:fictionalTenants}).read({principal:principal("fictional-alice")}),TypeError);
});
test("26.8 unexpected canonical data fields are refused, not silently projected",async()=>{
 const source={getDashboard:async()=>{const s=await fictionalRows.getDashboard();s.actions[0].record.secretField="never";return s;}};
 await assert.rejects(()=>createFictionalReadPolicy({snapshotSource:source,subjectTenants:fictionalTenants}).read({principal:principal("fictional-alice")}),TypeError);
});
test("26.9 output does not expose ACL information or source tenancy",async()=>{
 const r=await policy().read({principal:principal("fictional-alice")});
 for(const field of ["tenant","subjects","acl","privateNotes","tenant-red","tenant-blue"])assert.equal(JSON.stringify(r).includes(field),false);
});
test("26.10 policy exposes no mutation or write method",()=>{
 const p=policy();assert.deepEqual(Object.keys(p),["read"]);assert.equal(p.write,undefined);assert.equal(p.transitionAction,undefined);
});

test("26.11 authenticated but unrecognised principal is never an empty success",async()=>{
 await assert.rejects(()=>policy().read({principal:principal("fictional-outside")}),TypeError);
});

// Both ACL and tenant must authorize access. Naming Alice in a blue ACL must
// never let a caller's later configuration edits grant cross-tenant access.
const sharedAclSource={async getDashboard(){
 const snapshot=await fictionalRows.getDashboard();
 snapshot.actions[1].acl.subjects.push("fictional-alice");
 return snapshot;
}};
const assertAlice=async p=>{
 const result=await p.read({principal:principal("fictional-alice")});
 assert.deepEqual(result.actions.map(x=>x.id),["PUBLIC_A2","PUBLIC_A1"]);
 assert.deepEqual(result.decisions.map(x=>x.id),["PUBLIC_D1"]);
 assert.deepEqual(result.warnings,[]);
 assert.equal(JSON.stringify(result).includes("privateNotes"),false);
};
test("26A.1 post-construction edits, deletions and additions cannot change authorization",async()=>{
 const subjectTenants={...fictionalTenants};
 const p=createFictionalReadPolicy({snapshotSource:sharedAclSource,subjectTenants});
 subjectTenants["fictional-alice"]="tenant-blue";
 delete subjectTenants["fictional-bob"];
 subjectTenants["fictional-mallory"]="tenant-blue";
 await assertAlice(p);
 assert.deepEqual((await p.read({principal:principal("fictional-bob")})).actions.map(x=>x.id),["BLUE_A1"]);
 await assert.rejects(()=>p.read({principal:principal("fictional-mallory")}),TypeError);
 Object.defineProperty(subjectTenants,"fictional-alice",{get(){throw Error("caller getter must not run")}});
 await assertAlice(p);
});
test("26A.2 mutation while snapshot is pending cannot switch tenant",async()=>{
 const subjectTenants={...fictionalTenants};
 let release,entered;
 const pending=new Promise(resolve=>{release=resolve});
 const started=new Promise(resolve=>{entered=resolve});
 const p=createFictionalReadPolicy({subjectTenants,snapshotSource:{async getDashboard(){entered();await pending;return sharedAclSource.getDashboard()}}});
 const read=p.read({principal:principal("fictional-alice")});
 await started;
 subjectTenants["fictional-alice"]="tenant-blue";
 subjectTenants["fictional-bob"]="tenant-red";
 release();
 assert.deepEqual((await read).actions.map(x=>x.id),["PUBLIC_A2","PUBLIC_A1"]);
 await assertAlice(p);
 assert.deepEqual((await p.read({principal:principal("fictional-bob")})).actions.map(x=>x.id),["BLUE_A1"]);
});
test("26A.3 invalid initial mappings fail at construction without reading source or getters",()=>{
 let reads=0,getters=0;
 const snapshotSource={getDashboard(){reads++;throw Error("must not read")}};
 const accessor={...fictionalTenants};
 Object.defineProperty(accessor,"fictional-alice",{get(){getters++;return "tenant-red"}});
 const hiddenSymbol={...fictionalTenants,[Symbol("extra")]:"tenant-blue"};
 for(const subjectTenants of [undefined,null,[],new Map(),{},
  {"fictional-alice":"tenant-red"},{...fictionalTenants,extra:"tenant-red"},
  Object.create(fictionalTenants),Object.assign(Object.create(null),fictionalTenants),
  hiddenSymbol,accessor,...["", "tenant red", "x".repeat(65),null,42,{},["tenant-red"]].map(value=>({...fictionalTenants,"fictional-alice":value})),
  {...fictionalTenants,"fictional-bob":undefined}]){
  assert.throws(()=>createFictionalReadPolicy({snapshotSource,subjectTenants}),TypeError);
 }
 assert.equal(reads,0);assert.equal(getters,0);
});
test("26A.4 construction captures values without freezing the caller's object",async()=>{
 const subjectTenants={...fictionalTenants};
 const p=createFictionalReadPolicy({snapshotSource:fictionalRows,subjectTenants});
 assert.equal(Object.isFrozen(subjectTenants),false);
 await assertAlice(p);
 assert.deepEqual((await p.read({principal:principal("fictional-bob")})).actions.map(x=>x.id),["BLUE_A1"]);
 assert.deepEqual((await p.read({principal:principal("fictional-alice"),view:"lenovo"})).actions.map(x=>x.id),["PUBLIC_A1"]);
});

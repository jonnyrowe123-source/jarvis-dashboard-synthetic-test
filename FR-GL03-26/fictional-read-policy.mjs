// FR-GL03-26 — fictional canonical-read authorization proof, not a Brain connector.
// Explicit tenant/subject/record ACL, minimal projection and server-side authoritative
// ordered visible subset. No writes, personal data or dynamic untrusted code.
import {validateDashboard,SCHEMA_VERSION} from "../FR-GL03-23/source/dashboard-contract.mjs";
const OWN=Object.prototype.hasOwnProperty;
const keys=(x,expected)=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype&&Reflect.ownKeys(x).length===expected.length&&expected.every(k=>OWN.call(x,k));
const identity=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{1,64}$/.test(x);
const fail=()=>{throw new TypeError("Invalid fictional policy snapshot")};
function checkPrincipal(p){if(!keys(p,["issuer","subject","clientId","permissions"])||typeof p.issuer!=="string"||!p.issuer.startsWith("http://127.0.0.1:")||!identity(p.subject)||!identity(p.clientId)||!Array.isArray(p.permissions)||p.permissions.length!==1||p.permissions[0]!=="dashboard:read")fail()}
function checkAcl(a){if(!keys(a,["tenant","subjects"])||!identity(a.tenant)||!Array.isArray(a.subjects)||!a.subjects.length||a.subjects.length>8||new Set(a.subjects).size!==a.subjects.length||!a.subjects.every(identity))fail()}
function checkRow(row){if(!keys(row,["tenant","acl","kind","record"])||!identity(row.tenant)||!["action","decision"].includes(row.kind))fail();checkAcl(row.acl);if(row.acl.tenant!==row.tenant)fail();}
export function createFictionalReadPolicy({snapshotSource,subjectTenants}={}){
 if(!snapshotSource||typeof snapshotSource.getDashboard!=="function"||!keys(subjectTenants,["fictional-alice","fictional-bob"])||!identity(subjectTenants["fictional-alice"])||!identity(subjectTenants["fictional-bob"]))throw new TypeError("Explicit fictional policy required");
 return Object.freeze({async read({principal,view="overall"}={}){
  checkPrincipal(principal);
  if(!["overall","10min","lenovo"].includes(view))fail();
  const source=await snapshotSource.getDashboard();
  if(!keys(source,["revision","actions","decisions","warnings"])||typeof source.revision!=="string"||!Array.isArray(source.actions)||!Array.isArray(source.decisions)||!Array.isArray(source.warnings))fail();
  if(source.actions.length>100||source.decisions.length>100||source.warnings.length>100)fail();
  const all=[...source.actions,...source.decisions];
  const ids=new Set(),selectedActions=[],selectedDecisions=[];
  for(const row of all){
   checkRow(row);
   if(!row.record||typeof row.record.id!=="string"||ids.has(row.record.id))fail();
   ids.add(row.record.id);
   if(!identity(row.record.id))fail();
   const tenant=subjectTenants[principal.subject];
   const permitted=tenant===row.tenant&&row.acl.subjects.includes(principal.subject);
   if(!permitted)continue;
   if(row.kind==="action"){
    if(!keys(row.record,["id","title","revision","state","context","privateNotes"])||!["10min","lenovo"].includes(row.record.context))fail();
    if(view==="overall"||row.record.context===view)selectedActions.push({id:row.record.id,title:row.record.title,revision:row.record.revision,state:row.record.state,context:row.record.context});
   }else{
    if(!keys(row.record,["id","title","revision","state","privateNotes"]))fail();
    selectedDecisions.push({id:row.record.id,title:row.record.title,revision:row.record.revision,state:row.record.state});
   }
  }
  // Warnings deliberately withheld until each warning has its own ACL.
  return validateDashboard({schemaVersion:SCHEMA_VERSION,revision:source.revision,source:"synthetic-fixture",actions:selectedActions,decisions:selectedDecisions,warnings:[]},{view});
 }});
}
export const fictionalRows=Object.freeze({
 async getDashboard(){return {
  revision:"fictional-revision-7",
  actions:[
   {tenant:"tenant-red",acl:{tenant:"tenant-red",subjects:["fictional-alice"]},kind:"action",record:{id:"PUBLIC_A2",title:"Second allowed task",revision:4,state:"open",context:"10min",privateNotes:"do not disclose alpha"}},
   {tenant:"tenant-blue",acl:{tenant:"tenant-blue",subjects:["fictional-bob"]},kind:"action",record:{id:"BLUE_A1",title:"Blue tenant action",revision:9,state:"open",context:"lenovo",privateNotes:"do not disclose beta"}},
   {tenant:"tenant-red",acl:{tenant:"tenant-red",subjects:["fictional-alice"]},kind:"action",record:{id:"PUBLIC_A1",title:"First allowed task",revision:3,state:"open",context:"lenovo",privateNotes:"do not disclose gamma"}}
  ],
  decisions:[{tenant:"tenant-red",acl:{tenant:"tenant-red",subjects:["fictional-alice"]},kind:"decision",record:{id:"PUBLIC_D1",title:"Fictional decision",revision:2,state:"open",privateNotes:"do not disclose delta"}}],
  warnings:["all tenant diagnostic — must never disclose"]
 }}});
export const fictionalTenants=Object.freeze({"fictional-alice":"tenant-red","fictional-bob":"tenant-blue"});

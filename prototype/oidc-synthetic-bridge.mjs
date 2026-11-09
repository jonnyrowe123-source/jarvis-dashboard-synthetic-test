// FR-GL03-22: synthetic-only OIDC adapter bridge.
// Preserves and validates the rich DTO before producing the strictly limited legacy fixture.
// This deliberately DOES NOT expose revision/state through the transport and MUST NOT
// be used for canonical records or for production authorization decisions.
const hasExact=(o,keys)=>o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const id=x=>typeof x==="string"&&/^[A-Za-z0-9_-]{1,64}$/.test(x);
const title=x=>typeof x==="string"&&x.length>0&&x.length<=200&&!/[\x00-\x1f\x7f]/.test(x);
const validRev=x=>Number.isSafeInteger(x)&&x>=0;
export function createOidcSyntheticBridge(source){
 if(!source||typeof source.getDashboard!=="function")throw new TypeError("Source adapter required");
 return Object.freeze({async getDashboard(view="overall"){
  const payload=await source.getDashboard(view);
  if(!hasExact(payload,["revision","source","actions","decisions","warnings"])||!title(payload.revision)||payload.source!=="synthetic-fixture"||!Array.isArray(payload.actions)||!Array.isArray(payload.decisions)||!Array.isArray(payload.warnings)||payload.actions.length>100||payload.decisions.length>100||payload.warnings.length>100)throw TypeError("Invalid synthetic source envelope");
  const seen=new Set();
  const actions=payload.actions.map(a=>{
   if(!hasExact(a,["id","title","revision","state","context"])||!id(a.id)||seen.has(a.id)||!title(a.title)||!validRev(a.revision)||a.state!=="open"||!["10min","lenovo"].includes(a.context))throw TypeError("Invalid synthetic action");
   seen.add(a.id);return {id:a.id,title:a.title,context:a.context};
  });
  const decisions=payload.decisions.map(d=>{
   if(!hasExact(d,["id","title","revision","state"])||!id(d.id)||seen.has(d.id)||!title(d.title)||!validRev(d.revision)||d.state!=="open")throw TypeError("Invalid synthetic decision");
   seen.add(d.id);return {id:d.id,title:d.title};
  });
  if(!payload.warnings.every(w=>typeof w==="string"&&w.length<=512&&!/[\x00-\x1f\x7f]/.test(w)))throw TypeError("Invalid synthetic warnings");
  return {revision:payload.revision,source:payload.source,actions,decisions,warnings:payload.warnings.slice()};
 }});
}

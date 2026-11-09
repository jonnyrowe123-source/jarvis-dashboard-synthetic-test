// FR-GL03-18: versioned synthetic DTO mapping; no real data and no writes.
// Reject unknown keys and unsafe shapes instead of silently discarding fields.
const keys=(o,expected)=>o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===expected.length&&expected.every(k=>Object.hasOwn(o,k));
const safeText=(s,max=200)=>typeof s==="string"&&s.length>0&&s.length<=max&&!/[\x00-\x1f\x7f]/.test(s);
const id=s=>safeText(s,64)&&/^[A-Za-z0-9_-]+$/.test(s);
const revision=n=>Number.isSafeInteger(n)&&n>=0;
const context=c=>["10min","lenovo"].includes(c);
export function toVersionedSyntheticDTO(input){
 if(!keys(input,["revision","source","actions","decisions","warnings"])||!safeText(input.revision,128)||input.source!=="synthetic-fixture"||!Array.isArray(input.actions)||!Array.isArray(input.decisions)||!Array.isArray(input.warnings)) throw new TypeError("Invalid source envelope");
 if(input.actions.length>100||input.decisions.length>100||input.warnings.length>100) throw new TypeError("Oversized collections");
 const seen=new Set();
 const actions=input.actions.map(a=>{
  if(!keys(a,["id","title","revision","state","context"])||!id(a.id)||!safeText(a.title)||!revision(a.revision)||a.state!=="open"||!context(a.context)||seen.has(a.id)) throw new TypeError("Invalid action");
  seen.add(a.id);
  return {id:a.id,title:a.title,revision:a.revision,state:a.state,context:a.context};
 });
 const decisions=input.decisions.map(d=>{
  if(!keys(d,["id","title","revision","state"])||!id(d.id)||!safeText(d.title)||!revision(d.revision)||d.state!=="open"||seen.has(d.id)) throw new TypeError("Invalid decision");
  seen.add(d.id);
  return {id:d.id,title:d.title,revision:d.revision,state:d.state};
 });
 if(!input.warnings.every(w=>safeText(w,512))) throw new TypeError("Invalid warnings");
 return {schemaVersion:1,revision:input.revision,source:"synthetic-fixture",actions,decisions,warnings:[...input.warnings]};
}
export function validateVersionedSyntheticDTO(dto){
 if(!keys(dto,["schemaVersion","revision","source","actions","decisions","warnings"])||dto.schemaVersion!==1) throw new TypeError("Unsupported schema");
 const {schemaVersion,...rest}=dto;
 const result=toVersionedSyntheticDTO(rest);
 return {...result,schemaVersion};
}

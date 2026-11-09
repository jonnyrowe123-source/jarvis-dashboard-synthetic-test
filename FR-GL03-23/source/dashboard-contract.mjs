// Shared browser/server v1 contract. No network, storage, sorting or write operations.
export const SCHEMA_VERSION=1;
export const MAX_RESPONSE_BYTES=65536;
export const VIEWS=Object.freeze(['overall','10min','lenovo']);
const envelopeKeys=['schemaVersion','revision','source','actions','decisions','warnings'];
const sourceKeys=envelopeKeys.filter(k=>k!=='schemaVersion');
const actionKeys=['id','title','revision','state','context'];
const decisionKeys=['id','title','revision','state'];
function invalid(){throw new TypeError('Invalid dashboard contract');}
function plain(value,keys){
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 const own=Reflect.ownKeys(value);
 if(own.length!==keys.length||!keys.every(k=>Object.hasOwn(value,k)))invalid();
 for(const k of own){const d=Object.getOwnPropertyDescriptor(value,k);if(!d.enumerable||!Object.hasOwn(d,'value'))invalid();}
 return value;
}
function dense(value){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>100||Reflect.ownKeys(value).length!==value.length+1)invalid();
 for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!d.enumerable||!Object.hasOwn(d,'value'))invalid();}
 return value;
}
function text(value,max){
 if(typeof value!=='string'||value.length===0||value.length>max*2||Array.from(value).length>max||/[\x00-\x1f\x7f\p{Surrogate}]/u.test(value))invalid();
 return value;
}
function id(value){if(typeof value!=='string'||!/^[-A-Za-z0-9_]{1,64}$/.test(value))invalid();return value;}
function revision(value){if(!Number.isSafeInteger(value)||value<0)invalid();return value;}
function snapshot(input,{versioned,view='overall'}){
 if(!VIEWS.includes(view))invalid();
 plain(input,versioned?envelopeKeys:sourceKeys);
 if(versioned&&input.schemaVersion!==SCHEMA_VERSION||input.source!=='synthetic-fixture')invalid();
 const snapshotRevision=text(input.revision,128),seen=new Set();
 const actions=dense(input.actions).map(a=>{
  plain(a,actionKeys);const recordId=id(a.id);
  if(seen.has(recordId)||a.state!=='open'||!['10min','lenovo'].includes(a.context)||view!=='overall'&&a.context!==view)invalid();
  seen.add(recordId);
  return Object.freeze({id:recordId,title:text(a.title,200),revision:revision(a.revision),state:a.state,context:a.context});
 });
 const decisions=dense(input.decisions).map(d=>{
  plain(d,decisionKeys);const recordId=id(d.id);
  if(seen.has(recordId)||d.state!=='open')invalid();seen.add(recordId);
  return Object.freeze({id:recordId,title:text(d.title,200),revision:revision(d.revision),state:d.state});
 });
 const warnings=dense(input.warnings).map(w=>text(w,512));
 const dto=Object.freeze({schemaVersion:SCHEMA_VERSION,revision:snapshotRevision,source:input.source,actions:Object.freeze(actions),decisions:Object.freeze(decisions),warnings:Object.freeze(warnings)});
 const encoded=JSON.stringify(dto);
 if(new TextEncoder().encode(encoded).byteLength>MAX_RESPONSE_BYTES)invalid();
 return {dto,encoded};
}
/** Validate and defensively copy, preserving every field and array position. */
export function validateDashboard(input,{view='overall'}={}){return snapshot(input,{view,versioned:true}).dto;}
/** Serialize the validated copy, never the adapter's mutable object or custom toJSON. */
export function encodeDashboard(input,{view='overall'}={}){return snapshot(input,{view,versioned:true}).encoded;}
/** Explicit one-time upgrade from the unchanged rich synthetic FR-GL03-10 shape. */
export function versionRichSnapshot(input,{view='overall'}={}){return snapshot(input,{view,versioned:false}).dto;}

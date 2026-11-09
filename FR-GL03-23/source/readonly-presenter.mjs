// FR-GL03-16: immutable read-only dashboard view model, no persistent cache or write actions.
import {validateVersionedSyntheticDTO} from "./versioned-dto.mjs";
const views=new Set(["overall","10min","lenovo"]);
const statuses=new Set(["idle","loading","ready","stale","error"]);
const safeMessage={NOT_AUTHENTICATED:"Sign in required",FORBIDDEN:"Access denied",NETWORK:"Dashboard unavailable",SERVER:"Service temporarily unavailable",INVALID_RESPONSE:"Invalid dashboard response"};
export function createReadOnlyPresenter({gateway,adaptPayload}={}) {
 if(!gateway||typeof gateway.readDashboard!=="function") throw new TypeError("Read-only gateway required");
 if(typeof adaptPayload!=="function") throw new TypeError("Explicit versioned DTO adapter required");
 let sequence=0;
 let current=Object.freeze({status:"idle",view:"overall",actions:[],decisions:[],warnings:[],revision:null,error:null,readOnly:true});
 const listeners=new Set();
 const emit=next=>{current=Object.freeze(next);for(const listener of listeners)listener(current)};
 const clear=(status,view,error=null)=>({status,view,actions:[],decisions:[],warnings:[],revision:null,error,readOnly:true});
 const api={
  getState:()=>current,
  subscribe(fn){if(typeof fn!=="function")throw new TypeError("Listener required");listeners.add(fn);return ()=>listeners.delete(fn)},
  invalidate(){sequence++;emit(clear("stale",current.view,"Refresh required"));},
  async load({view="overall",getAccessToken}={}){
   if(!views.has(view))throw new TypeError("Invalid view");
   const id=++sequence;
   emit(clear("loading",view));
   try{
    const raw=await gateway.readDashboard({view,getAccessToken});
    const dto=validateVersionedSyntheticDTO(adaptPayload(raw));
    if(id!==sequence)return false;
    emit({status:"ready",view,revision:dto.revision,actions:dto.actions.map(a=>Object.freeze({...a})),decisions:dto.decisions.map(d=>Object.freeze({...d})),warnings:[...dto.warnings],error:null,readOnly:true});
    return true;
   }catch(err){
    if(id!==sequence)return false;
    const message=safeMessage[err?.code]||"Dashboard unavailable";
    emit(clear("error",view,message));
    return false;
   }
  }
 };
 return Object.freeze(api);
}
export function renderReadOnlyDashboard({root,state,documentRef=globalThis.document}={}){
 if(!root||!documentRef||!statuses.has(state?.status))throw new TypeError("Invalid render target");
 root.replaceChildren();
 const node=(tag,text)=>{const el=documentRef.createElement(tag);el.textContent=text;return el};
 root.append(node("h2","Jarvis — read-only synthetic dashboard"));
 root.append(node("p",state.status==="ready"?"Read-only · Synthetic data":state.status==="loading"?"Loading…":state.status==="stale"?"Data needs refreshing":state.status==="error"?state.error:"Not loaded"));
 if(state.status!=="ready")return;
 const section=(heading,items)=>{
  root.append(node("h3",heading));
  const list=documentRef.createElement("ul");
  for(const item of items.slice(0,5))list.append(node("li",item.title));
  root.append(list);
 };
 section("Actions",state.actions);section("Decisions",state.decisions);
 for(const warning of state.warnings)root.append(node("p",warning));
}

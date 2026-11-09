import {validateDashboard,VIEWS,MAX_RESPONSE_BYTES} from './dashboard-contract.mjs';
export class DashboardGatewayError extends Error {
 constructor(code,message){super(message);this.name='DashboardGatewayError';this.code=code;}
}
const fail=(code='INVALID_RESPONSE')=>new DashboardGatewayError(code,code==='NOT_AUTHENTICATED'?'Sign in required':code==='FORBIDDEN'?'Access denied':'Dashboard unavailable');
async function readBounded(response){
 const size=response.headers.get('content-length');
 if(size!==null&&(!/^\d+$/.test(size)||Number(size)>MAX_RESPONSE_BYTES))throw fail();
 if(!response.body||typeof response.body.getReader!=='function')throw fail();
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_RESPONSE_BYTES){void reader.cancel().catch(()=>{});throw fail();}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail();}
}
export function createVersionedDashboardGateway({baseUrl,fetchImpl=globalThis.fetch,timeoutMs=8000,localTest=false}={}){
 const base=new URL(baseUrl);
 if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!(base.protocol==='https:'||localTest===true&&base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname)))throw new TypeError('Exact HTTPS API origin required');
 if(typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError('Invalid gateway configuration');
 return Object.freeze({async readDashboard({view='overall',getAccessToken}={}){
  if(!VIEWS.includes(view))throw new TypeError('Invalid view');
  if(typeof getAccessToken!=='function')throw fail('NOT_AUTHENTICATED');
  let token;try{token=await getAccessToken();}catch{throw fail('NOT_AUTHENTICATED');}
  if(typeof token!=='string'||!token.length||token.length>4089||/[\x00-\x20\x7f]/.test(token))throw fail('NOT_AUTHENTICATED');
  const endpoint=new URL('/v1/dashboard',base);endpoint.searchParams.set('view',view);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   let response;
   try{response=await fetchImpl(endpoint.href,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});}catch{throw fail('NETWORK');}
   if(response.status===401)throw fail('NOT_AUTHENTICATED');
   if(response.status===403)throw fail('FORBIDDEN');
   if(!response.ok)throw fail('SERVER');
   if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw fail();
   const raw=await readBounded(response);
   try{return validateDashboard(raw,{view});}catch{throw fail();}
  }catch(error){
   if(error instanceof DashboardGatewayError)throw error;
   throw fail(controller.signal.aborted?'NETWORK':'INVALID_RESPONSE');
  }finally{clearTimeout(timer);controller.abort();}
 }});
}

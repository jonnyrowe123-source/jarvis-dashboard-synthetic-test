import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {performance} from 'node:perf_hooks';
import {createLocalJWKSet, decodeProtectedHeader, jwtVerify} from 'jose';

const text=(v,max=256)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x20\x7f]/.test(v);
const failure=(status=401)=>({status,error:status===403?'forbidden':status===503?'authentication_unavailable':'unauthenticated'});
class ProviderUnavailable extends Error {}
function configuredUrl(value,localTest){
 if(!text(value,1024))throw Error('Invalid authentication URL configuration');
 const u=new URL(value);
 if(u.username||u.password||u.hash||u.search||!(u.protocol==='https:'||(localTest&&u.protocol==='http:'&&u.hostname==='127.0.0.1')))throw Error('HTTPS authentication URL required');
 return u;
}
function strings(values,max=1000){return Array.isArray(values)&&values.length>0&&values.length<=max&&Array.from(values).every(v=>text(v))&&new Set(values).size===values.length;}
function boundedInt(v,min,max){return Number.isSafeInteger(v)&&v>=min&&v<=max;}

// Fetch only the configured endpoint. No discovery, redirects, cookies or token-supplied URLs.
function readJwks(url,timeoutMs){
 return new Promise((resolve,reject)=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const req=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{method:'GET',signal:controller.signal,headers:{Accept:'application/json'}},res=>{
   if(res.statusCode!==200||!/^application\/(?:jwk-set\+)?json(?:\s*;|$)/i.test(res.headers['content-type']||'')||res.headers['content-encoding']){res.destroy();reject(new ProviderUnavailable());return;}
   const chunks=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>32768){res.destroy(new ProviderUnavailable());return;}chunks.push(chunk);});
   res.on('error',reject);
   res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new ProviderUnavailable());}});
  });
  req.on('error',reject);req.on('close',()=>clearTimeout(timer));req.end();
 });
}
function checkedJwks(value,algorithms){
 if(!value||!Array.isArray(value.keys)||value.keys.length<1||value.keys.length>8)throw new ProviderUnavailable();
 const ids=new Set();
 for(const key of value.keys){
  if(!key||!text(key.kid,128)||ids.has(key.kid)||!algorithms.includes(key.alg)||!['RSA','EC'].includes(key.kty)||('d' in key)||('k' in key)||('p' in key)||('q' in key)||('oth' in key)||key.use!==undefined&&key.use!=='sig'||key.key_ops!==undefined&&(!Array.isArray(key.key_ops)||key.key_ops.length!==1||key.key_ops[0]!=='verify'))throw new ProviderUnavailable();
  if(key.alg==='ES256'&&(key.kty!=='EC'||key.crv!=='P-256')||key.alg==='RS256'&&key.kty!=='RSA')throw new ProviderUnavailable();
  ids.add(key.kid);
 }
 return {resolve:createLocalJWKSet(value),ids};
}

/** Resource-server prototype. No login, token minting, discovery or shared-token fallback. */
export function createOidcAuthenticator(config){
 if(!config||typeof config!=='object')throw Error('OIDC configuration required');
 const {issuer,audience,jwksUri,algorithms,allowedSubjects,allowedClientIds,environment='production',maxTokenLifetimeSec=300,clockToleranceSec=5,jwksTtlMs=60000,refreshCooldownMs=1000,jwksTimeoutMs=1000,maxConcurrentVerifications=32,revokedTokenIds=[]}=config;
 if(!['production','local-test'].includes(environment))throw Error('Invalid authentication environment');
 const localTest=environment==='local-test';
 if(localTest&&process.env.NODE_ENV==='production')throw Error('Local test issuer forbidden in production');
 const issuerUrl=configuredUrl(issuer,localTest),endpoint=configuredUrl(jwksUri,localTest);
 if(localTest&&(issuerUrl.hostname!=='127.0.0.1'||endpoint.hostname!=='127.0.0.1'))throw Error('Local test requires loopback endpoints');
 if(!text(audience)||!strings(algorithms,2)||algorithms.some(a=>!['ES256','RS256'].includes(a))||!strings(allowedSubjects)||!strings(allowedClientIds,100)||allowedClientIds.includes(audience)||!Array.isArray(revokedTokenIds)||revokedTokenIds.length>1000||Array.from(revokedTokenIds).some(id=>!text(id,128)))throw Error('Explicit issuer/audience/algorithm/identity policy required');
 if(!boundedInt(maxTokenLifetimeSec,1,900)||!boundedInt(clockToleranceSec,0,60)||!boundedInt(jwksTtlMs,1,300000)||!boundedInt(refreshCooldownMs,1,60000)||!boundedInt(jwksTimeoutMs,1,5000)||!boundedInt(maxConcurrentVerifications,1,64))throw Error('Invalid authentication limits');
 const subjects=new Set(allowedSubjects),clients=new Set(allowedClientIds),revoked=new Set(revokedTokenIds),permittedAlgorithms=[...algorithms];
 let cache,expires=0,nextRefresh=0,pending,active=0;
 async function refresh(){
  if(pending)return pending;
  if(performance.now()<nextRefresh)throw new ProviderUnavailable();
  nextRefresh=performance.now()+refreshCooldownMs;
  pending=(async()=>{try{const value=checkedJwks(await readJwks(endpoint,jwksTimeoutMs),permittedAlgorithms);cache=value;expires=performance.now()+jwksTtlMs;}catch{throw new ProviderUnavailable();}})();
  try{await pending;}finally{pending=undefined;}
 }
 async function keyResolver(header,token){
  if(!cache||performance.now()>=expires)await refresh();
  else if(!cache.ids.has(header.kid)&&performance.now()>=nextRefresh)await refresh();
  // Never use an expired cache when refresh is unavailable.
  if(!cache||performance.now()>=expires)throw new ProviderUnavailable();
  return cache.resolve(header,token);
 }
 return Object.freeze({async authenticate(req){
  if(active>=maxConcurrentVerifications)return failure(503);
  const value=req.headers?.authorization;
  const duplicates=(req.rawHeaders||[]).filter((h,i)=>i%2===0&&h.toLowerCase()==='authorization').length;
  if(duplicates>1||typeof value!=='string'||value.length>4096||!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(value))return failure();
  const token=value.slice(7);active++;
  try{
   const header=decodeProtectedHeader(token);
   if(header.typ!=='at+jwt'||!permittedAlgorithms.includes(header.alg)||!text(header.kid,128)||Object.keys(header).some(k=>!['alg','typ','kid'].includes(k)))return failure();
   const {payload}=await jwtVerify(token,keyResolver,{issuer,audience,algorithms:permittedAlgorithms,typ:'at+jwt',requiredClaims:['iss','aud','sub','exp','iat','jti','client_id'],maxTokenAge:maxTokenLifetimeSec,clockTolerance:clockToleranceSec});
   const now=Math.floor(Date.now()/1000);
   if(payload.aud!==audience||!text(payload.sub)||!text(payload.jti,128)||!text(payload.client_id)||!clients.has(payload.client_id)||payload.azp!==undefined&&payload.azp!==payload.client_id||payload.token_use!==undefined&&payload.token_use!=='access'||!Number.isSafeInteger(payload.iat)||!Number.isSafeInteger(payload.exp)||payload.exp<=payload.iat||payload.exp-payload.iat>maxTokenLifetimeSec||payload.iat>now+clockToleranceSec||payload.nbf!==undefined&&(!Number.isSafeInteger(payload.nbf)||payload.nbf>=payload.exp)||revoked.has(payload.jti))return failure();
   if(!subjects.has(payload.sub)||typeof payload.scope!=='string'||payload.scope.length>1024||!/^[-A-Za-z0-9:._/]+(?: [-A-Za-z0-9:._/]+)*$/.test(payload.scope)||!payload.scope.split(' ').includes('dashboard:read'))return failure(403);
   return {status:200,principal:Object.freeze({issuer,subject:payload.sub,clientId:payload.client_id,permissions:Object.freeze(['dashboard:read'])})};
  }catch(e){return failure(e instanceof ProviderUnavailable?503:401);}finally{active--;}
 }});
}

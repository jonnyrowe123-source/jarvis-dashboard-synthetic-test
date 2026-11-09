// Test support only. Public JWKS on IPv4 loopback; private keys stay in memory.
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
export async function localIssuer(){
 const keys=[];
 for(const kid of ['fixture-old','fixture-new']){
  const pair=await generateKeyPair('ES256');const jwk={...await exportJWK(pair.publicKey),kid,alg:'ES256',use:'sig'};keys.push({kid,...pair,jwk});
 }
 const state={keys:[keys[0].jwk],status:200,delay:0,body:undefined,contentType:'application/jwk-set+json',requests:0,paths:[],slowBody:false};
 const server=createServer((req,res)=>{
  state.requests++;state.paths.push(req.url);
  const answer=()=>{if(res.destroyed)return;res.writeHead(state.status,{'Content-Type':state.contentType,Location:'/redirected'});if(state.slowBody){res.write('{');return;}res.end(state.body??JSON.stringify({keys:state.keys}));};
  if(state.delay){const t=setTimeout(answer,state.delay);t.unref();}else answer();
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const issuer=`http://127.0.0.1:${server.address().port}`;
 const config={environment:'local-test',issuer,audience:'urn:fictional:jarvis:dashboard-api',jwksUri:issuer+'/jwks',algorithms:['ES256'],allowedSubjects:['fictional-alice'],allowedClientIds:['fictional-dashboard-client'],clockToleranceSec:0,refreshCooldownMs:20,jwksTtlMs:1000,jwksTimeoutMs:100};
 async function sign(overrides={},header={},key=keys[0]){
  const now=Math.floor(Date.now()/1000);
  const claims={iss:issuer,aud:config.audience,sub:'fictional-alice',iat:now,exp:now+120,jti:randomUUID(),client_id:'fictional-dashboard-client',scope:'dashboard:read',...overrides};
  for(const k of Object.keys(claims))if(claims[k]===undefined)delete claims[k];
  return new SignJWT(claims).setProtectedHeader({alg:'ES256',typ:'at+jwt',kid:key.kid,...header}).sign(key.privateKey,header.crit?{crit:{untrusted:true}}:undefined);
 }
 return {config,state,keys,sign,async close(){server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
export const credential=token=>({headers:{authorization:`Bearer ${token}`},rawHeaders:['Authorization',`Bearer ${token}`]});
export async function usingIssuer(fn){const issuer=await localIssuer();try{return await fn(issuer);}finally{await issuer.close();}}
export const wait=ms=>new Promise(r=>setTimeout(r,ms));

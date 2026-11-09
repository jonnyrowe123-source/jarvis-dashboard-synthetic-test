import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createSyntheticReadOnlyAdapter} from './read-only-adapter.mjs';

// Isolated synthetic testing only. This interface does not implement OIDC.
function validDashboard(value) {
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 const text=v=>typeof v==='string'&&v.length<=512&&!/[\x00-\x1f\x7f]/.test(v);
 return exact(value,['revision','source','actions','decisions','warnings'])&&text(value.revision)&&value.source==='synthetic-fixture'
  &&Array.isArray(value.actions)&&value.actions.length<=100&&value.actions.every(a=>exact(a,['id','title','context'])&&text(a.id)&&text(a.title)&&['10min','lenovo'].includes(a.context))
  &&Array.isArray(value.decisions)&&value.decisions.length<=100&&value.decisions.every(d=>exact(d,['id','title'])&&text(d.id)&&text(d.title))
  &&Array.isArray(value.warnings)&&value.warnings.length<=100&&value.warnings.every(text);
}
export function makeServer({token, origin='http://localhost:4173', adapter=createSyntheticReadOnlyAdapter(), adapterTimeoutMs=500, maxInFlight=16}={}) {
 if(typeof token!=='string'||!/^[-A-Za-z0-9_]{24,256}$/.test(token)) throw Error('A synthetic test token is required');
 const allowed=new URL(origin);
 if(!['http:','https:'].includes(allowed.protocol)||allowed.origin!==origin||allowed.username||allowed.password) throw Error('Invalid origin');
 if(!adapter||typeof adapter.getDashboard!=='function'||!Number.isInteger(adapterTimeoutMs)||adapterTimeoutMs<1||adapterTimeoutMs>10000||!Number.isInteger(maxInFlight)||maxInFlight<1||maxInFlight>128) throw Error('Invalid configuration');
 let inFlight=0;
 const expected=Buffer.from(`Bearer ${token}`);
 const server=createServer({maxHeaderSize:8192,headersTimeout:5000,requestTimeout:10000,keepAliveTimeout:1000,connectionsCheckingInterval:1000},async(req,res)=>{
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin','Vary':'Origin'};
  const send=(status,data,extra={})=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{...headers,...extra});res.end(JSON.stringify(data));};
  try {
   const duplicates=['authorization','origin','content-length','transfer-encoding','host'];
   for(const name of duplicates) if(req.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length>1) return send(400,{error:'invalid_headers'},{Connection:'close'});
   if(req.headers.origin!==undefined) {
    if(req.headers.origin!==origin) return send(403,{error:'origin_denied'});
    headers['Access-Control-Allow-Origin']=origin;
   }
   if(!req.url||req.url.length>2048) return send(414,{error:'uri_too_long'},{Connection:'close'});
   // Accept only origin-form targets, exact paths, and strict percent encoding.
   if(!req.url.startsWith('/')||req.url.startsWith('//')||/[\\#\x00-\x20\x7f]/.test(req.url)||/%(?![\da-f]{2})/i.test(req.url)) return send(400,{error:'invalid_target'});
   const [path,query='']=req.url.split('?');
   if(req.url.split('?').length>2) return send(400,{error:'invalid_query'});
   if(req.headers['transfer-encoding']!==undefined|| (req.headers['content-length']!==undefined&&req.headers['content-length']!=='0')) return send(413,{error:'body_not_allowed'},{Connection:'close'});
   if(req.method==='OPTIONS') {
    if(req.headers.origin!==origin||path!=='/v1/dashboard'||query||req.headers['access-control-request-method']!=='GET') return send(403,{error:'preflight_denied'});
    const requested=(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(x=>x.trim());
    if(requested.some(x=>!['','authorization'].includes(x))) return send(403,{error:'preflight_denied'});
    res.writeHead(204,{...headers,'Vary':'Origin, Access-Control-Request-Method, Access-Control-Request-Headers','Access-Control-Allow-Methods':'GET','Access-Control-Allow-Headers':'Authorization'});return res.end();
   }
   if(req.method!=='GET') return send(405,{error:'read_only'},{Allow:'GET'});
   if(path==='/health'&&!query) return send(200,{status:'ok',dataConnected:false,mode:'synthetic'});
   const supplied=Buffer.from(req.headers.authorization||'');
   if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) return send(401,{error:'unauthenticated'},{'WWW-Authenticate':'Bearer'});
   if(path!=='/v1/dashboard') return send(404,{error:'not_found'});
   const params=new URLSearchParams(query);
   // Canonical ASCII query only: reject ambiguous encodings, blanks and separators.
   if(query&&!/^view=(overall|10min|lenovo)$/.test(query)) return send(400,{error:'invalid_query'});
   const view=params.get('view')||'overall';
   if(inFlight>=maxInFlight) return send(503,{error:'busy'},{'Retry-After':'1'});
   inFlight++;
   let timer;
   // Keep the slot until actual adapter settlement, even after HTTP timeout.
   const operation=Promise.resolve().then(()=>adapter.getDashboard(view)).finally(()=>{inFlight--;});
   try {
    const result=await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),adapterTimeoutMs);})]);
    // Bound the fixture structure before serialization. The adapter is trusted local code.
    // Production schema validation awaits the actual contract.
    if(!validDashboard(result)) return send(502,{error:'upstream_failure'});
    const encoded=JSON.stringify(result);
    if(!encoded||Buffer.byteLength(encoded)>65536) return send(502,{error:'upstream_failure'});
    res.writeHead(200,headers);res.end(encoded);
   } catch {send(502,{error:'upstream_failure'});} finally {clearTimeout(timer);}
  } catch {send(500,{error:'internal_error'});}
 });
 server.maxRequestsPerSocket=100;
 server.maxConnections=64;
 server.setTimeout(10000,socket=>socket.destroy());
 server.on('clientError',(err,socket)=>{if(socket.writable)socket.end(`HTTP/1.1 ${err.code==='HPE_HEADER_OVERFLOW'?'431 Request Header Fields Too Large':'400 Bad Request'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);});
 server.on('checkContinue',(_req,res)=>{res.writeHead(417,{Connection:'close'});res.end();});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=makeServer({token:process.env.SYNTHETIC_TEST_TOKEN});
 server.listen(0,'127.0.0.1',()=>console.log(`Synthetic-only server on 127.0.0.1:${server.address().port}`));
}

import {createServer} from 'node:http';
import {createSyntheticReadOnlyAdapter} from './read-only-adapter.mjs';
const adapter=createSyntheticReadOnlyAdapter();
export function makeServer({token,origin='http://localhost:4173'}={}) {
 if(!token || token.length<24) throw new Error('Test token required; never use for production');
 return createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
  if(req.headers.origin===origin) {headers['Access-Control-Allow-Origin']=origin;headers['Vary']='Origin'}
  const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data))};
  if(req.method==='OPTIONS') return send(403,{error:'preflight_denied'});
  if(req.method!=='GET') return send(405,{error:'read_only'});
  if(url.pathname==='/health' && !url.search) return send(200,{status:'ok',dataConnected:false,mode:'synthetic'});
  if(req.headers.authorization!==`Bearer ${token}`) return send(401,{error:'unauthenticated'});
  if(url.pathname==='/v1/dashboard') {
   if([...url.searchParams.keys()].some(k=>k!=='view') || url.searchParams.getAll('view').length>1) return send(400,{error:'invalid_query'});
   try {return send(200,await adapter.getDashboard(url.searchParams.get('view')||'overall'))}
   catch{return send(400,{error:'invalid_view'})}
  }
  return send(404,{error:'not_found'});
 });
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const token=process.env.SYNTHETIC_TEST_TOKEN;
 const server=makeServer({token});
 server.listen(0,'127.0.0.1',()=>console.log('Synthetic-only server on 127.0.0.1:'+server.address().port));
}

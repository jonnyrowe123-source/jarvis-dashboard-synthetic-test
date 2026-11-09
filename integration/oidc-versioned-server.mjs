// FR-GL03-23 — isolated synthetic-only, versioned DTO OIDC integration.
// Uses the published Codex authenticator without modifying its immutable delivery.
// DOES NOT expose a production server or production canonical records.
import {createServer} from "node:http";
import {createOidcAuthenticator} from "../FR-GL03-19/source/oidc-auth.mjs";
import {createSyntheticReadOnlyAdapter} from "../prototype/read-only-adapter.mjs";
import {toVersionedSyntheticDTO} from "../prototype/versioned-dto.mjs";

export function makeVersionedSyntheticOidcServer({oidc,adapter=createSyntheticReadOnlyAdapter(),origin="http://localhost:4173"}={}) {
 if(process.env.NODE_ENV==="production")throw Error("Isolated synthetic-only integration forbidden in production");
 if(!adapter||typeof adapter.getDashboard!=="function")throw new TypeError("Read-only adapter required");
 const auth=createOidcAuthenticator(oidc);
 const allowed=new URL(origin);
 if(allowed.origin!==origin||allowed.username||allowed.password||!["http:","https:"].includes(allowed.protocol))throw Error("Invalid CORS origin");
 const server=createServer({maxHeaderSize:8192,headersTimeout:5000,requestTimeout:10000,keepAliveTimeout:1000},async(req,res)=>{
  const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'","Vary":"Origin"};
  const send=(status,body,extra={})=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{...headers,...extra});res.end(JSON.stringify(body));};
  try {
   for(const name of ["authorization","origin","content-length","transfer-encoding","host"])if((req.rawHeaders||[]).filter((h,i)=>i%2===0&&h.toLowerCase()===name).length>1)return send(400,{error:"invalid_headers"});
   if(req.headers.origin!==undefined){if(req.headers.origin!==origin)return send(403,{error:"origin_denied"});headers["Access-Control-Allow-Origin"]=origin;}
   if(!req.url||req.url.length>2048)return send(414,{error:"uri_too_long"});
   if(!req.url.startsWith("/")||req.url.startsWith("//")||/[\\#\x00-\x20\x7f]/.test(req.url)||/%(?![0-9a-f]{2})/i.test(req.url))return send(400,{error:"invalid_target"});
   if(req.headers["content-length"]!==undefined&&req.headers["content-length"]!=="0"||req.headers["transfer-encoding"]!==undefined)return send(413,{error:"body_not_allowed"});
   if(req.url.split("?").length>2)return send(400,{error:"invalid_query"});
   const [path,query=""]=req.url.split("?");
   if(req.method==="OPTIONS"){
    const requestHeaders=(req.headers["access-control-request-headers"]||"").toLowerCase().split(",").map(s=>s.trim());
    if(path!=="/v1/dashboard"||query||req.headers.origin!==origin||req.headers["access-control-request-method"]!=="GET"||requestHeaders.some(v=>!["","authorization"].includes(v)))return send(403,{error:"preflight_denied"});
    res.writeHead(204,{...headers,"Vary":"Origin, Access-Control-Request-Method, Access-Control-Request-Headers","Access-Control-Allow-Methods":"GET","Access-Control-Allow-Headers":"Authorization"});return res.end();
   }
   if(req.method!=="GET")return send(405,{error:"read_only"},{Allow:"GET"});
   if(path!=="/v1/dashboard")return send(404,{error:"not_found"});
   if(query&&!/^view=(overall|10min|lenovo)$/.test(query))return send(400,{error:"invalid_query"});
   const result=await auth.authenticate(req);
   if(result.status!==200)return send(result.status,{error:result.error},result.status===401?{"WWW-Authenticate":"Bearer"}:result.status===503?{"Retry-After":"1"}:{});
   const view=query?query.slice(5):"overall";
   let dto;
   try {dto=toVersionedSyntheticDTO(await adapter.getDashboard(view));}catch{return send(502,{error:"upstream_failure"});}
   const encoded=JSON.stringify(dto);
   if(Buffer.byteLength(encoded)>65536)return send(502,{error:"upstream_failure"});
   res.writeHead(200,headers);res.end(encoded);
  }catch{send(500,{error:"internal_error"});}
 });
 server.maxConnections=64;server.maxRequestsPerSocket=100;
 server.setTimeout(10000,s=>s.destroy());
 return server;
}

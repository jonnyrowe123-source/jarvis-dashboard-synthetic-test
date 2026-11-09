// FR-GL03-13: Browser-side read-only gateway. No secrets, storage or automatic retries.
export class DashboardGatewayError extends Error {
 constructor(code, message){super(message);this.name="DashboardGatewayError";this.code=code}
}
const allowed=new Set(["overall","10min","lenovo"]);
export function createDashboardGateway({baseUrl,fetchImpl=fetch,timeoutMs=8000}={}) {
 const url=new URL(baseUrl);
 if(url.protocol!=="https:" && !(url.protocol==="http:"&&url.hostname==="localhost")) throw new TypeError("HTTPS required");
 if(url.username||url.password||url.search||url.hash) throw new TypeError("Credentials and query parameters forbidden");
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000) throw new TypeError("Invalid timeout");
 return Object.freeze({
  async readDashboard({view="overall",getAccessToken}={}) {
   if(!allowed.has(view)) throw new TypeError("Invalid view");
   if(typeof getAccessToken!=="function") throw new DashboardGatewayError("NOT_AUTHENTICATED","Sign-in required");
   const token=await getAccessToken();
   if(typeof token!=="string"||!token||/[\r\n]/.test(token)) throw new DashboardGatewayError("NOT_AUTHENTICATED","Sign-in required");
   const endpoint=new URL("v1/dashboard",url.href.endsWith("/")?url.href:url.href+"/");
   endpoint.searchParams.set("view",view);
   let response;
   try {
    response=await fetchImpl(endpoint.href,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(timeoutMs),redirect:"error"});
   } catch {throw new DashboardGatewayError("NETWORK","Dashboard unavailable; no data was changed")}
   if(response.status===401) throw new DashboardGatewayError("NOT_AUTHENTICATED","Session expired");
   if(response.status===403) throw new DashboardGatewayError("FORBIDDEN","Access denied");
   if(!response.ok) throw new DashboardGatewayError("SERVER","Dashboard temporarily unavailable");
   const ct=response.headers.get("content-type")||"";
   if(!ct.toLowerCase().includes("application/json")) throw new DashboardGatewayError("INVALID_RESPONSE","Unexpected response format");
   let payload;
   try {payload=await response.json()}catch{throw new DashboardGatewayError("INVALID_RESPONSE","Invalid JSON response")}
   if(!payload||typeof payload.revision!=="string"||!Array.isArray(payload.actions)||!Array.isArray(payload.decisions)||!Array.isArray(payload.warnings))
    throw new DashboardGatewayError("INVALID_RESPONSE","Invalid dashboard response");
   return payload;
  }
 });
}

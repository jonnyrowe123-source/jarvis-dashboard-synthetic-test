// FR-GL03-25 — real Chromium + loopback OIDC + versioned API + presenter acceptance.
// All issuer identities, keys and records are fictional. No persistent browser tokens.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {chromium} from "playwright";
import {makeOidcServer} from "../FR-GL03-25/server.mjs";
import {localIssuer} from "../FR-GL03-23/source/test-issuer.mjs";
const previewPath=new URL("../fr23-loopback-preview.html",import.meta.url);
const safeModules=new Set(["dashboard-contract.mjs","versioned-dto.mjs","versioned-gateway.mjs","readonly-presenter.mjs"]);
const listen=server=>new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",()=>{server.off("error",reject);resolve()})});
const close=async server=>{if(!server)return;server.closeAllConnections();await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
let api,site,issuer,browser,apiOrigin;
try{
 issuer=await localIssuer();
 site=createServer(async(req,res)=>{
  const pathname=new URL(req.url,"http://127.0.0.1").pathname;
  let file,type;
  if(pathname==="/fr23-loopback-preview.html"){file=previewPath;type="text/html; charset=utf-8";}
  else if(pathname.startsWith("/FR-GL03-23/source/")&&safeModules.has(pathname.split("/").at(-1))){file=new URL("../"+pathname.slice(1),import.meta.url);type="text/javascript; charset=utf-8";}
  else if(pathname==="/favicon.ico"){res.writeHead(204);res.end();return;}
  else if(pathname==="/_config"&&apiOrigin){res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({apiOrigin}));return;}
  else{res.writeHead(404);res.end();return;}
  try{res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(await readFile(file));}
  catch{res.writeHead(500);res.end();}
 });
 await listen(site);
 const webOrigin="http://127.0.0.1:"+site.address().port;
 api=makeOidcServer({oidc:issuer.config,origin:webOrigin});
 await listen(api);
 apiOrigin="http://127.0.0.1:"+api.address().port;
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage(),runtimeErrors=[],apiGetRequests=[];
 page.on("pageerror",e=>runtimeErrors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")console.log("BROWSER CONSOLE ERROR:",m.text())});
 page.on("requestfailed",r=>console.log("BROWSER REQUEST FAILED:",r.url(),r.failure()?.errorText));
 page.on("request",r=>{if(r.url().includes("/v1/dashboard")&&r.method()==="GET")apiGetRequests.push({url:r.url(),headers:r.headers()})});
 let token=await issuer.sign();
 await page.exposeFunction("getSyntheticTestToken",async()=>token);
 await page.goto(webOrigin+"/fr23-loopback-preview.html",{waitUntil:"networkidle"});
 await page.waitForTimeout(500);
 console.log("BROWSER INITIAL STATUS:",await page.locator("#status").innerText(),"RUNTIME:",JSON.stringify(runtimeErrors));
 await page.locator("#status[data-status=ready]").waitFor({timeout:10000});
 assert.equal(await page.locator("#actions li").count(),2);
 assert.equal(await page.locator("#decisions li").count(),1);
 assert.match(await page.locator("#actions li").first().innerText(),/SYN-A01[\s\S]*revision 1[\s\S]*state open[\s\S]*10min/);
 assert.match(await page.locator("#decisions li").first().innerText(),/SYN-D01[\s\S]*revision 1[\s\S]*state open/);
 assert.equal(await page.locator("#revision").innerText(),"Snapshot synthetic-1");
 console.log("PASS BROWSER: authenticated v1 HTTP data, exact record metadata, original source order and snapshot revision");
 await page.locator("#view").selectOption("lenovo");
 await page.locator("#status[data-status=ready]").waitFor();
 assert.deepEqual(await page.locator("#actions li small").allTextContents(),["ID SYN-A02 | revision 1 | state open | lenovo"]);
 await page.locator("#view").selectOption("10min");
 await page.locator("#status[data-status=ready]").waitFor();
 assert.deepEqual(await page.locator("#actions li small").allTextContents(),["ID SYN-A01 | revision 1 | state open | 10min"]);
 console.log("PASS BROWSER: Lenovo and 10-minute view authorization and source filtering");
 token=await issuer.sign({sub:"fictional-not-allowed"});
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=error]").waitFor();
 assert.match(await page.locator("#status").innerText(),/Access denied/);
 assert.equal(await page.locator("#revision").innerText(),"No current snapshot");
 assert.equal(await page.locator("#actions li").first().innerText(),"No records");
 console.log("PASS BROWSER: forbidden identity clears all prior records");
 token=await issuer.sign({scope:"unrelated:read"});
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=error]").waitFor();
 assert.match(await page.locator("#status").innerText(),/Access denied/);
 token=await issuer.sign();
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=ready]").waitFor();
 console.log("PASS BROWSER: missing permission fails closed; authorised session recovers");
 await page.route("**/v1/dashboard?**",route=>route.abort());
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=error]").waitFor();
 assert.equal(await page.locator("#actions li").first().innerText(),"No records");
 await page.unroute("**/v1/dashboard?**");
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=ready]").waitFor();
 await page.locator("#invalidate").click();
 await page.locator("#status[data-status=stale]").waitFor();
 assert.equal(await page.locator("#actions li").first().innerText(),"No records");
 console.log("PASS BROWSER: simulated network outage and stale snapshot clear records");
 await page.locator("#refresh").click();
 await page.locator("#status[data-status=ready]").waitFor();
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
 await page.locator("#view").focus();await page.keyboard.press("Tab");
 assert.equal(await page.evaluate(()=>document.activeElement.id),"refresh");
 await page.keyboard.press("Enter");await page.locator("#status[data-status=ready]").waitFor();
 console.log("PASS BROWSER: mobile viewport no overflow; keyboard refresh navigation works");
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 assert.ok(apiGetRequests.length>=6);
 for(const r of apiGetRequests){assert.ok(r.headers.authorization?.startsWith("Bearer "));assert.equal(r.url.includes(r.headers.authorization.slice(7)),false);}
 assert.equal((await page.locator("body").innerText()).includes(token),false);
 assert.deepEqual(runtimeErrors,[]);
 await page.screenshot({path:"fr-gl03-25-versioned-browser.png",fullPage:true});
 console.log("PASS BROWSER: no persistent tokens, no runtime JS errors, mobile screenshot captured");
}finally{await browser?.close();await close(api);await close(site);await issuer?.close()}

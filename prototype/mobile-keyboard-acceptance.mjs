import {chromium} from "playwright";
import {spawn} from "node:child_process";
import assert from "node:assert/strict";
const server=spawn("python3",["-m","http.server","8766","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const url="http://127.0.0.1:8766/synthetic-preview.html";
async function wait(){for(let i=0;i<50;i++){try{if((await fetch(url)).ok)return}catch{}await new Promise(r=>setTimeout(r,150))}throw Error("Preview unavailable")}
try{
 await wait();browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url,{waitUntil:"networkidle"});
 await page.locator("#status[data-status=ready]").waitFor();
 assert.equal(await page.locator("#actions li").count(),2);
 const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 assert.equal(horizontalOverflow,false,"Mobile horizontal overflow");
 console.log("PASS mobile 390px: no horizontal overflow, synthetic records visible");
 const controls=page.locator("select,button");
 assert.equal(await controls.count(),4);
 for(let i=0;i<4;i++){const control=controls.nth(i);const box=await control.boundingBox();assert.ok(box&&box.height>=40,"Control has adequate target height");}
 console.log("PASS mobile: controls have >=40px hit height");
 await page.keyboard.press("Tab");
 assert.equal(await page.evaluate(()=>document.activeElement.id),"view");
 await page.keyboard.press("Tab");
 assert.equal(await page.evaluate(()=>document.activeElement.id),"refresh");
 await page.keyboard.press("Enter");
 await page.locator("#status[data-status=ready]").waitFor();
 console.log("PASS keyboard: view then refresh focus order and activation");
 await page.locator("#view").focus();await page.keyboard.press("End");await page.keyboard.press("Tab");
 await page.locator("#status[data-status=ready]").waitFor();
 assert.equal(await page.locator("#view").inputValue(),"lenovo");
 assert.equal(await page.locator("#actions li").count(),1);
 console.log("PASS keyboard: Lenovo filter selection");
 await page.locator("#offline").focus();await page.keyboard.press("Enter");
 await page.locator("#status[data-status=error]").waitFor();
 assert.match(await page.locator("#actions").innerText(),/No actions/);
 console.log("PASS keyboard: error state and cleared records");
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"synthetic-mobile-accessibility.png",fullPage:true});
 console.log("PASS mobile screenshot captured");
}finally{await browser?.close();server.kill()}

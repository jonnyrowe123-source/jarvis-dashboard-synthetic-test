import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../synthetic-preview.html",import.meta.url),"utf8");
test("preview uses real read-only presenter and versioned DTO",()=>{assert.match(html,/createReadOnlyPresenter/);assert.match(html,/toVersionedSyntheticDTO/);assert.match(html,/createSyntheticReadOnlyAdapter/)});
test("preview has three views and safe failure controls",()=>{for(const value of ["overall","10min","lenovo"])assert.ok(html.includes('value="'+value+'"'));for(const id of ["refresh","offline","invalidate"])assert.ok(html.includes('id="'+id+'"'))});
test("preview has no embedded credentials or remote network requests",()=>{assert.doesNotMatch(html,/fetch\s*\(|localStorage|sessionStorage|api_key|client_secret|Bearer\s+[A-Za-z0-9]/i)});
test("preview renders titles with textContent only",()=>{assert.match(html,/li\.textContent=item\.title/);assert.doesNotMatch(html,/innerHTML|insertAdjacentHTML|document\.write/)});
test("preview exposes no write operations",()=>{assert.doesNotMatch(html,/\.transition\s*\(|\.resolve\s*\(|method:\s*["']POST/);assert.match(html,/READ ONLY/)});
test("preview does not override public index page",()=>{assert.match(html,/synthetic-preview\.html|FR-GL03-20/);assert.match(html,/not the live Home OS dashboard/)});

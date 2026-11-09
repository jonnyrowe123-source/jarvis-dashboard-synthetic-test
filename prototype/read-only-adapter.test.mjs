import test from "node:test";
import assert from "node:assert/strict";
import {createSyntheticReadOnlyAdapter, validateSnapshot} from "./read-only-adapter.mjs";
test("reads synthetic dashboard",async()=>{const s=await createSyntheticReadOnlyAdapter().getDashboard();assert.equal(s.source,"synthetic-fixture");assert.equal(s.actions.length,2)});
test("view filters",async()=>{const s=await createSyntheticReadOnlyAdapter().getDashboard("10min");assert.equal(s.actions.length,1);assert.equal(s.actions[0].id,"SYN-A01")});
test("rejects invalid view",async()=>{await assert.rejects(()=>createSyntheticReadOnlyAdapter().getDashboard("invalid"),TypeError)});
test("rejects writes",async()=>{const a=createSyntheticReadOnlyAdapter();await assert.rejects(()=>a.transitionAction(),/WRITE_DISABLED/);await assert.rejects(()=>a.resolveDecision(),/WRITE_DISABLED/)});
test("rejects duplicate IDs",()=>{const s={revision:"x",actions:[{id:"A",title:"a",revision:1,state:"open"}],decisions:[{id:"A",title:"b",revision:1,state:"open"}],warnings:[]};assert.throws(()=>validateSnapshot(s),/Invalid decision/)});
test("rejects malformed snapshot",()=>assert.throws(()=>validateSnapshot({}),TypeError));

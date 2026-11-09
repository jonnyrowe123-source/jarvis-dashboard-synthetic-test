import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {validateDashboard,versionRichSnapshot} from './dashboard-contract.mjs';
import {createSyntheticReadOnlyAdapter} from './read-only-adapter.mjs';
const schema=JSON.parse(readFileSync(new URL('./dashboard-v1.schema.json',import.meta.url)));
const validateSchema=new Ajv2020({strict:true,allErrors:true,unicodeRegExp:true}).compile(schema);
const dto=async()=>structuredClone(versionRichSnapshot(await createSyntheticReadOnlyAdapter().getDashboard()));
test('published draft 2020-12 schema compiles and accepts unchanged rich data with version',async()=>{const d=await dto();assert.equal(validateSchema(d),true,JSON.stringify(validateSchema.errors));assert.deepEqual(validateDashboard(d),d);});
test('schema and executable validator agree on record fields and numeric/string boundaries',async()=>{const d=await dto();const cases=[
 [x=>x.schemaVersion=2,false],[x=>delete x.schemaVersion,false],[x=>x.actions[0].secret='fictional',false],[x=>x.actions[0].revision=1.5,false],[x=>x.actions[0].revision=-1,false],[x=>x.actions[0].state='done',false],[x=>x.actions[0].context='other',false],
 [x=>x.actions[0].title='😀'.repeat(200),true],[x=>x.actions[0].title='😀'.repeat(201),false],[x=>x.actions[0].title='\ud800',false],[x=>x.actions[0].title='',false],[x=>x.warnings=['warning\n'],false],[x=>x.decisions[0].revision=Number.MAX_SAFE_INTEGER,true],[x=>x.decisions[0].revision=Number.MAX_SAFE_INTEGER+1,false],
 [x=>{x.actions=[];x.decisions=[];x.warnings=[];},true]
 ];for(const [mutate,valid] of cases){const x=structuredClone(d);mutate(x);assert.equal(validateSchema(x),valid,JSON.stringify(validateSchema.errors));if(valid)assert.deepEqual(validateDashboard(x),x);else assert.throws(()=>validateDashboard(x));}});
test('semantic checks exceed structural JSON Schema: global ID uniqueness and UTF-8 bytes',async()=>{const duplicate=await dto();duplicate.decisions[0].id=duplicate.actions[0].id;assert.equal(validateSchema(duplicate),true);assert.throws(()=>validateDashboard(duplicate));const large=await dto();large.actions=Array.from({length:100},(_,i)=>({...large.actions[0],id:'SYN-'+i,title:'界'.repeat(200)}));large.warnings=Array(100).fill('界'.repeat(512));assert.equal(validateSchema(large),true);assert.throws(()=>validateDashboard(large));});

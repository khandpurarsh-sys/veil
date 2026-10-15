import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import {transform} from 'esbuild';
async function harness({files=[],storageError=false,rowError=false}={}) {
 let fn;const ops=[];
 const client={
  from(table){return {
   select(){return {lte(){return {limit:async()=>({data:files,error:null})}}}},
   delete(){return {
    eq(k,v){ops.push(['row',v]);return {lte:async()=>({error:rowError?Error('row'):null})}},
    lte:async()=>{ops.push(['messages']);return {error:null}}
   }}
  }},
  storage:{from(){return {remove:async ids=>{ops.push(['storage',...ids]);return {error:storageError?Error('storage'):null}}}}}
 };
 let source=await fs.readFile('supabase/functions/veil-expiry-cleanup/index.ts','utf8');
 source=source.replace(/^import[^\n]+\n/,'');const js=(await transform(source,{loader:'ts'})).code;
 vm.runInNewContext(js,{Deno:{env:{get:k=>k==='VEIL_CLEANUP_TOKEN'?'test':'mock'},serve:f=>fn=f},createClient:()=>client,Response,Date});
 return {ops,run:headers=>fn(new Request('https://example.invalid',{method:'POST',headers}))};
}
test('Cleanup rejects missing or wrong job token without data access',async()=>{const h=await harness();assert.equal((await h.run({})).status,401);assert.equal((await h.run({'x-veil-cleanup-token':'wrong'})).status,401);assert.deepEqual(h.ops,[])});
test('Expired objects are removed through storage before metadata',async()=>{const h=await harness({files:[{id:'fixture'}]});const r=await h.run({'x-veil-cleanup-token':'test'});assert.equal(r.status,200);assert.deepEqual(h.ops,[['storage','fixture'],['row','fixture'],['messages']]);assert.equal((await r.json()).expired_files_removed,1)});
test('Storage failure keeps metadata and stops cleanup',async()=>{const h=await harness({files:[{id:'fixture'}],storageError:true});assert.equal((await h.run({'x-veil-cleanup-token':'test'})).status,500);assert.deepEqual(h.ops,[['storage','fixture']])});
test('Metadata failure returns retryable error and does not delete messages',async()=>{const h=await harness({files:[{id:'fixture'}],rowError:true});assert.equal((await h.run({'x-veil-cleanup-token':'test'})).status,500);assert.deepEqual(h.ops,[['storage','fixture'],['row','fixture']])});

import {connect} from './db-connection.mjs';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const endpoint='https://khmgxavcjqhklhokftzf.supabase.co/functions/v1/veil-expiry-cleanup';
const token=(await fs.readFile('/tmp/veil-cleanup.env','utf8')).trim().split('=')[1];
for(const headers of [{},{'x-veil-cleanup-token':'wrong'}])assert.equal((await fetch(endpoint,{method:'POST',headers})).status,401);
const invoke=async()=>{const r=await fetch(endpoint,{method:'POST',headers:{'x-veil-cleanup-token':token}});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data};
console.log('Live unauthorized denial and authorized empty cleanup:',await invoke());
const db=await connect(),expired=crypto.randomUUID(),fresh=crypto.randomUUID();
try {
 const owner=(await db.query('select owner_id from veil_private.config')).rows[0].owner_id;
 await db.query("insert into veil_files(id,sender,bytes,expires_at) values ($1,$3,1,now()-interval '1 day'),($2,$3,1,now()+interval '30 days')",[expired,fresh,owner]);
 console.log('Expired reservation cleanup:',await invoke());
 const rows=(await db.query('select id from veil_files where id=any($1::uuid[])',[[expired,fresh]])).rows.map(x=>x.id);assert.deepEqual(rows,[fresh]);
 console.log('Expired fixture removed; unexpired reservation preserved. Fixtures contained no real storage bytes.');
}finally{await db.query('delete from veil_files where id=any($1::uuid[])',[[expired,fresh]]);await db.end();}

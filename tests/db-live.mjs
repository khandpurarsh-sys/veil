import pg from 'pg';import fs from 'node:fs/promises';
const secret=JSON.parse(await fs.readFile('/tmp/veil-db-vault.json','utf8'));
const password=(await fs.readFile(secret.path,'utf8')).trim();
const client=new pg.Client({host:'aws-0-ap-south-1.pooler.supabase.com',port:5432,user:'postgres.khmgxavcjqhklhokftzf',database:'postgres',password,ssl:{rejectUnauthorized:true,ca:await fs.readFile('/tmp/veil-supabase-ca.crt','utf8')},connectionTimeoutMillis:10000});
try{await client.connect();console.log('Dedicated Veil database connected with TLS.');console.log((await client.query("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename")).rows);}catch(e){console.log('DB connection result:',e.code||e.name,e.message.replaceAll(password,'[redacted]'));process.exitCode=1;}finally{await client.end();}

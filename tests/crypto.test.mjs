import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/crypto.js';
await c.ready();
const alice={id:'alice',alias:'Owner',...c.identity()},bob={id:'bob',alias:'Moon',...c.identity()},eve={id:'eve',alias:'Eve',...c.identity()};
const ctx={id:'message-1',sender:'alice',room:'inner',epoch:1};
test('Both intended devices decrypt; excluded device cannot',()=>{const e=c.sealMessage({text:'test only'},ctx,[alice,bob],alice);assert.equal(c.openMessage(e,bob,alice,ctx).text,'test only');assert.equal(c.openMessage(e,alice,alice,ctx).text,'test only');assert.throws(()=>c.openMessage(e,eve,alice,ctx));assert.ok(!JSON.stringify(e).includes('test only'));});
test('Tampering, wrong sender, room, epoch and signature fail closed',()=>{const e=c.sealMessage({text:'hello'},ctx,[alice,bob],alice);for(const k of ['id','sender','room','epoch'])assert.throws(()=>c.openMessage(e,bob,alice,{...ctx,[k]:'wrong'}));const f=structuredClone(e);f.payload.cipher=f.payload.cipher.slice(0,-2)+'AA';assert.throws(()=>c.openMessage(f,bob,alice,ctx));assert.throws(()=>c.openMessage(e,bob,eve,ctx));});
test('Signed membership rejects forged and older rosters',()=>{const r=c.certify(3,[alice,bob],alice);assert.equal(c.validateRoster(r,alice.signPublic,2).members.length,2);assert.throws(()=>c.validateRoster(r,eve.signPublic));assert.throws(()=>c.validateRoster(r,alice.signPublic,4));const fake=structuredClone(r);fake.payload.members.push(eve);assert.throws(()=>c.validateRoster(fake,alice.signPublic));});
test('Removed member does not receive a future message key',()=>{const e=c.sealMessage({text:'after removal'},{...ctx,epoch:2},[alice],alice);assert.throws(()=>c.openMessage(e,bob,alice,{...ctx,epoch:2}));});
test('Binary media round trip and corruption rejection',()=>{const bytes=new Uint8Array([0,255,17,28,0]),e=c.encryptFile(bytes);assert.deepEqual(c.decryptFile(e.cipher,e.key,e.nonce),bytes);e.cipher[0]^=1;assert.throws(()=>c.decryptFile(e.cipher,e.key,e.nonce));});

test('JSONB key reordering preserves signature verification',()=>{const e=c.sealMessage({text:'jsonb'},ctx,[alice,bob],alice);const sorted=JSON.parse(JSON.stringify(e,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value));assert.equal(c.openMessage(sorted,bob,alice,ctx).text,'jsonb');});
test('Roster signature also survives database JSON key ordering',()=>{const r=c.certify(5,[alice,bob],alice);const ordered=JSON.parse(JSON.stringify(r,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value));assert.equal(c.validateRoster(ordered,alice.signPublic).epoch,5);});

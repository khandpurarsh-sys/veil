import sodium from 'libsodium-wrappers';
export async function ready(){await sodium.ready;}
const b64=b=>sodium.to_base64(b,sodium.base64_variants.URLSAFE_NO_PADDING);
const un64=s=>sodium.from_base64(s,sodium.base64_variants.URLSAFE_NO_PADDING);
export function identity(){const box=sodium.crypto_box_keypair(),sign=sodium.crypto_sign_keypair();return {boxPublic:b64(box.publicKey),boxSecret:b64(box.privateKey),signPublic:b64(sign.publicKey),signSecret:b64(sign.privateKey)};}
export function token(){return b64(sodium.randombytes_buf(32));}
export function digest(s){return b64(sodium.crypto_generichash(32,s));}
export function sign(value,secret){return b64(sodium.crypto_sign_detached(JSON.stringify(value),un64(secret)));}
export function verify(value,sig,pub){try{return sodium.crypto_sign_verify_detached(un64(sig),JSON.stringify(value),un64(pub));}catch{return false;}}
export function rosterPayload(epoch,members){return {v:1,epoch,members:members.map(m=>({id:m.id,alias:m.alias,boxPublic:m.boxPublic,signPublic:m.signPublic})).sort((a,b)=>a.id.localeCompare(b.id))};}
export function certify(epoch,members,owner){const payload=rosterPayload(epoch,members);return {payload,signature:sign(payload,owner.signSecret)};}
export function validateRoster(roster,ownerPub,minEpoch=0){if(roster?.payload?.v!==1||!Number.isSafeInteger(roster.payload.epoch)||roster.payload.epoch<minEpoch||!Array.isArray(roster.payload.members)||roster.payload.members.length>20||!verify(roster.payload,roster.signature,ownerPub))throw Error('Invalid or stale owner-signed membership list');return roster.payload;}
export function sealMessage(value,{id,sender,room,epoch},recipients,author){
  if(!recipients.length||recipients.length>20)throw Error('Invalid recipient count');
  const key=sodium.crypto_secretbox_keygen(),nonce=sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const payload={v:1,id,sender,room,epoch,nonce:b64(nonce),cipher:b64(sodium.crypto_secretbox_easy(JSON.stringify(value),nonce,key)),keys:Object.fromEntries(recipients.map(r=>[r.id,b64(sodium.crypto_box_seal(key,un64(r.boxPublic)))]))};
  sodium.memzero(key);return {payload,signature:sign(payload,author.signSecret)};
}
export function openMessage(envelope,me,member,{id,sender,room,epoch}){
 const p=envelope.payload;if(p?.v!==1||p.id!==id||p.sender!==sender||p.room!==room||p.epoch!==epoch||!verify(p,envelope.signature,member.signPublic))throw Error('Message signature or context mismatch');
 const key=sodium.crypto_box_seal_open(un64(p.keys[me.id]),un64(me.boxPublic),un64(me.boxSecret));
 try{return JSON.parse(sodium.to_string(sodium.crypto_secretbox_open_easy(un64(p.cipher),un64(p.nonce),key)));}finally{sodium.memzero(key);}
}
export function encryptFile(bytes){const key=sodium.crypto_secretbox_keygen(),nonce=sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES),cipher=sodium.crypto_secretbox_easy(bytes,nonce,key);return {cipher,key:b64(key),nonce:b64(nonce)};}
export function decryptFile(bytes,key,nonce){return sodium.crypto_secretbox_open_easy(bytes,un64(nonce),un64(key));}
export function safetyCode(id){return digest(id.boxPublic+id.signPublic).slice(0,16).match(/.{1,4}/g).join(' ');}

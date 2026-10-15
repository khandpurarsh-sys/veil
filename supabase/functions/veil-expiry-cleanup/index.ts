import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
Deno.serve(async (req: Request) => {
 const secret=Deno.env.get('VEIL_CLEANUP_TOKEN');
 if(req.method!=='POST'||!secret||req.headers.get('x-veil-cleanup-token')!==secret) return new Response('Unauthorized',{status:401});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try {
  const now=new Date().toISOString();
  const {data:files,error}=await client.from('veil_files').select('id').lte('expires_at',now).limit(200);
  if(error) throw error;
  let removed=0;
  for(const file of files||[]) {
   const {error:storageError}=await client.storage.from('veil').remove([file.id]);
   if(storageError) throw storageError;
   const {error:rowError}=await client.from('veil_files').delete().eq('id',file.id).lte('expires_at',now);
   if(rowError) throw rowError;
   removed++;
  }
  const {error:messageError}=await client.from('veil_messages').delete().lte('expires_at',now);
  if(messageError) throw messageError;
  return Response.json({ok:true,expired_files_removed:removed});
 } catch {
  return Response.json({ok:false,error:'Cleanup incomplete; retry later'},{status:500});
 }
});

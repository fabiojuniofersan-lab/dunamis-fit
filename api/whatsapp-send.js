// Dunamis Fit — envio manual de mensagem WhatsApp pelo administrador.
// O token da Meta permanece exclusivamente nas variáveis de ambiente do servidor.
function normalizePhone(value){let p=String(value||'').replace(/\D/g,'');if(!p)return '';if(!p.startsWith('55'))p='55'+p;return p;}
async function sb(path,options={}){return fetch(`${process.env.SUPABASE_URL}${path}`,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...(options.headers||{})}})}
module.exports=async function(req,res){
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/,'');
  if(!token||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return res.status(500).json({ok:false,error:'Configuração do servidor incompleta.'});
  const required=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID'];
  const missing=required.filter(k=>!process.env[k]);
  if(missing.length)return res.status(500).json({ok:false,error:`Variáveis ausentes: ${missing.join(', ')}`});
  try{
    const me=await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${token}`}});
    const user=await me.json();
    if(!me.ok||!user?.id)return res.status(401).json({ok:false,error:'Sessão inválida.'});
    const pr=await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`);const profiles=await pr.json();
    if(!pr.ok||profiles?.[0]?.role!=='admin')return res.status(403).json({ok:false,error:'Somente o administrador pode enviar mensagens.'});
    const body=req.body||{};const studentId=String(body.studentId||'');const message=String(body.message||'').trim();
    if(!studentId||!message)return res.status(400).json({ok:false,error:'Aluno e mensagem são obrigatórios.'});
    if(message.length>4096)return res.status(400).json({ok:false,error:'A mensagem excede o limite permitido.'});
    const rr=await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(studentId)}&select=id,full_name,phone&role=eq.student`);const student=(await rr.json())?.[0];
    if(!rr.ok||!student)return res.status(404).json({ok:false,error:'Aluno não encontrado.'});
    const phone=normalizePhone(student.phone);if(!phone||phone.length<12)return res.status(400).json({ok:false,error:'O aluno não possui um WhatsApp válido cadastrado.'});
    const version=process.env.WHATSAPP_API_VERSION||'v26.0';
    const endpoint=`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    // Mensagens livres só são aceitas pela Meta dentro da janela de atendimento aplicável.
    // Para cobranças iniciadas pela academia fora dessa janela, use o endpoint automático com template aprovado.
    const wr=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:phone,type:'text',text:{preview_url:false,body:message}})});
    const wd=await wr.json().catch(()=>({}));
    if(!wr.ok)throw new Error(wd?.error?.message||'A Meta recusou o envio da mensagem.');
    await sb('/rest/v1/notifications',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:studentId,title:'Mensagem enviada pelo WhatsApp',message:`Mensagem enviada pela administração para ${student.full_name}.`,type:'whatsapp_manual'})});
    return res.status(200).json({ok:true,messageId:wd?.messages?.[0]?.id||null,studentId});
  }catch(error){console.error('Dunamis Fit WhatsApp manual:',error);return res.status(400).json({ok:false,error:String(error.message||error)});}
};

// Dunamis Fit — cobrança automática via WhatsApp Cloud API.
// Executado diariamente pelo Vercel Cron. Segredos ficam somente nas variáveis de ambiente.
function normalizePhone(value){let phone=String(value||'').replace(/\D/g,'');if(!phone)return '';if(!phone.startsWith('55'))phone='55'+phone;return phone;}
function brazilToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function daysInMonth(year,month){return new Date(Date.UTC(year,month,0)).getUTCDate();}
function currentMonth(today){const [year,month]=today.split('-').map(Number);return {year,month,period:`${year}-${String(month).padStart(2,'0')}`};}
async function supabaseRequest(path,options={}){const response=await fetch(`${process.env.SUPABASE_URL}${path}`,{...options,headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...(options.headers||{})}});const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{data=text;}if(!response.ok)throw new Error(typeof data==='string'?data:JSON.stringify(data));return data;}
async function sendTemplate(to,amount,dueDate){const version=process.env.WHATSAPP_API_VERSION||'v26.0',template=process.env.WHATSAPP_TEMPLATE_LATE||'dunamis_mensalidade_atrasada',language=process.env.WHATSAPP_TEMPLATE_LANG||'pt_BR',endpoint=`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to,type:'template',template:{name:template,language:{code:language},components:[{type:'body',parameters:[{type:'text',text:amount},{type:'text',text:dueDate}]}]}})});const body=await response.text();let parsed=null;try{parsed=body?JSON.parse(body):null;}catch{parsed=body;}if(!response.ok)throw new Error(typeof parsed==='string'?parsed:JSON.stringify(parsed));return parsed;}
module.exports=async function handler(request,response){try{
  if(request.method!=='GET')return response.status(405).json({ok:false,error:'Method not allowed'});
  if(!process.env.CRON_SECRET||request.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return response.status(401).json({ok:false,error:'Unauthorized'});
  const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID'];const missing=required.filter(key=>!process.env[key]);if(missing.length)return response.status(500).json({ok:false,error:`Variáveis ausentes: ${missing.join(', ')}`});
  const today=brazilToday(),{year,month,period}=currentMonth(today),day=Number(today.slice(8,10)),nextMonth=new Date(Date.UTC(year,month,1)),nextMonthIso=`${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth()+1).padStart(2,'0')}-01`;
  // O pagamento da competência atual é a fonte de verdade; status agregado do aluno pode estar defasado.
  const students=await supabaseRequest('/rest/v1/students?select=id,monthly_value,due_day,status');
  const profiles=await supabaseRequest('/rest/v1/profiles?select=id,full_name,phone&role=eq.student');
  const payments=await supabaseRequest(`/rest/v1/payments?due_date=gte.${period}-01&due_date=lt.${nextMonthIso}&select=student_id,due_date,status`);
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p])),paidSet=new Set((payments||[]).filter(p=>p.status==='paid').map(p=>`${p.student_id}:${p.due_date}`));
  let sent=0,skipped=0,failed=0;const results=[];
  for(const student of students||[]){
    const profile=profileMap.get(student.id),effectiveDueDay=Math.min(Number(student.due_day||1),daysInMonth(year,month)),dueDate=`${year}-${String(month).padStart(2,'0')}-${String(effectiveDueDay).padStart(2,'0')}`;
    if(paidSet.has(`${student.id}:${dueDate}`)){skipped++;results.push({id:student.id,status:'ja_pago'});continue;}
    if(day<=effectiveDueDay){skipped++;continue;}
    const phone=normalizePhone(profile?.phone);if(!phone||phone.length<12){skipped++;results.push({id:student.id,status:'sem_whatsapp'});continue;}
    const dedupeKey=`whatsapp_overdue:${student.id}:${period}`;
    const already=await supabaseRequest(`/rest/v1/notifications?select=id&dedupe_key=eq.${encodeURIComponent(dedupeKey)}&limit=1`);if(already?.length){skipped++;continue;}
    try{
      const sentMessage=await sendTemplate(phone,`R$ ${Number(student.monthly_value||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`,dueDate),messageId=sentMessage?.messages?.[0]?.id||null;
      const record=await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications`,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({user_id:student.id,title:'Cobrança enviada pelo WhatsApp',message:`Aviso de mensalidade em atraso enviado para ${profile?.full_name||'aluno'}.${messageId?` ID: ${messageId}`:''}`,type:'whatsapp_overdue',dedupe_key:dedupeKey})});
      if(!record.ok&&record.status!==409)throw new Error('WhatsApp enviado, mas não foi possível registrar o histórico.');sent++;results.push({id:student.id,status:'enviado',messageId});
    }catch(error){failed++;results.push({id:student.id,status:'erro',error:String(error.message||error).slice(0,300)});}
  }
  return response.status(200).json({ok:true,date:today,sent,skipped,failed,results});
}catch(error){console.error('Dunamis Fit WhatsApp cron:',error);return response.status(500).json({ok:false,error:String(error.message||error)});}};

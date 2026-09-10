// Dunamis Fit — status mensal automático no front-end.
// A situação do mês é determinada pelo pagamento da competência atual, não por um status antigo.
(function(){
  const originalRefresh=window.refreshCloudData;
  if(!originalRefresh)return;
  const brToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dueDate=(day)=>{const [y,m]=brToday().split('-').map(Number);const last=new Date(Date.UTC(y,m,0)).getUTCDate();return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(Math.max(Number(day)||1,1),last)).padStart(2,'0')}`};
  window.refreshCloudData=async function(){
    await originalRefresh();
    if(!window.data?.students)return;
    const today=brToday(), month=today.slice(0,7), payments=Array.isArray(data.payments)?data.payments:[];
    data.students=data.students.map(s=>{
      const current=payments.filter(p=>String(p.studentId||p.student_id)===String(s.id)&&String(p.dueDate||p.due_date||'').slice(0,7)===month&&String(p.status||'')==='paid').sort((a,b)=>String(b.dueDate||b.due_date).localeCompare(String(a.dueDate||a.due_date)))[0];
      if(current)return {...s,status:'paid'};
      return {...s,status:today>dueDate(s.due)?'late':'pending'};
    });
    try{localStorage.setItem('dunamis_fit_cloud_cache',JSON.stringify(data))}catch(e){}
  };
})();

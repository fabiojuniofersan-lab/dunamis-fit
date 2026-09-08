// Dunamis Fit — status mensal automático no front-end
(function(){
  const originalRefresh=window.refreshCloudData;
  if(!originalRefresh)return;
  const localDate=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
  const dueDate=(day)=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),Math.min(Math.max(Number(day)||1,1),28))};
  window.refreshCloudData=async function(){
    await originalRefresh();
    if(!window.data?.students)return;
    const today=localDate();
    data.students=data.students.map(s=>{
      if(s.status==='paid')return s;
      return {...s,status:today>dueDate(s.due)?'late':'pending'};
    });
    try{localStorage.setItem('dunamis_fit_cloud_cache',JSON.stringify(data))}catch(e){}
  };
})();

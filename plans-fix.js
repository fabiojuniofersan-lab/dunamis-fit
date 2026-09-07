// Dunamis Fit — quantidade de alunos por plano
(function(){
  window.plans=function(){
    const plans=[['3 dias por semana',75,'Treino 3x por semana'],['4 dias por semana',80,'Treino 4x por semana'],['5 dias por semana',100,'Treino 5x por semana']];
    const students=Array.isArray(data?.students)?data.students:[];
    return shell(header('Planos','Valores e quantidade de alunos por plano.')+
      `<div class="plans-grid">${plans.map(([name,value,desc])=>{
        const count=students.filter(s=>s.plan===name).length;
        return `<div class="plan-card"><span class="plan-tag">DUNAMIS FIT</span><h3>${name}</h3><p class="muted">${desc}</p><strong>R$ ${money(value)}</strong><div class="metric-row"><span>Alunos neste plano</span><b>${count}</b></div><small class="muted">${count===1?'1 aluno matriculado':`${count} alunos matriculados`}</small></div>`;
      }).join('')}</div>`+
      `<div class="panel" style="margin-top:18px"><h3>Distribuição dos alunos</h3><div class="metric-row"><span>3 dias por semana</span><strong>${students.filter(s=>s.plan==='3 dias por semana').length}</strong></div><div class="metric-row"><span>4 dias por semana</span><strong>${students.filter(s=>s.plan==='4 dias por semana').length}</strong></div><div class="metric-row"><span>5 dias por semana</span><strong>${students.filter(s=>s.plan==='5 dias por semana').length}</strong></div></div>`);
  };
})();

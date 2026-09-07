// Dunamis Fit — proteção final de dados e ações administrativas
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  window.deleteStudent=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode excluir alunos.');
    const s=data.students.find(x=>String(x.id)===String(id));if(!s)return;
    if(!confirm(`Excluir o cadastro de ${s.name}? Esta ação remove também avaliações e pagamentos vinculados.`))return;
    try{const {error}=await sb.from('profiles').delete().eq('id',id);if(error)throw error;await window.refreshCloudData();render()}catch(e){console.error(e);alert('Não foi possível excluir o aluno.')}
  };
  const oldTable=window.table;
  window.table=function(list){const html=oldTable(list);return html.replace(/<button class="btn secondary" onclick='evaluationForm\(([^']+)\)'>Avaliar<\/button>/g,(m,id)=>`<button class="btn secondary" onclick='evaluationForm(${id})'>Avaliar</button><button class="btn secondary" onclick='deleteStudent(${id})'>Excluir</button>`) };
})();

// Dunamis Fit — compatibilidade do cadastro de alunos
// A autenticação/cadastro principal já é implementada por auth4.js.
// Este arquivo NÃO deve sobrescrever window.saveStudent, pois isso fazia
// o formulário usar um endpoint diferente da API /api/admin-student.
(function(){
  // Mantido como arquivo de compatibilidade para versões anteriores.
  // auth4.js permanece como a implementação oficial de saveStudent.
  if (typeof window.refreshCloudData !== 'function') return;
})();

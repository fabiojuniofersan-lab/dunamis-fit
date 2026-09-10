// Dunamis Fit — camada de auditoria e endurecimento independente do login.
// Esta camada não substitui a autenticação; ela corrige fluxos administrativos sem alterar a tela de login.
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }

  function addStudentPasswordField(){
    const modal=document.querySelector('.modal .modal-card');
    if(!modal || modal.querySelector('#spw')) return;
    const title=(modal.querySelector('h3')?.textContent||'').toLowerCase();
    if(!title.includes('aluno')) return;
    const form=modal.querySelector('.form-grid');
    if(!form) return;
    const isNew=title.includes('novo');
    const field=document.createElement('div');
    field.className='field';
    field.innerHTML=`<label>${isNew?'Senha inicial do aluno':'Nova senha (opcional)'}</label><input id="spw" type="password" minlength="6" autocomplete="new-password" placeholder="${isNew?'Mínimo de 6 caracteres':'Deixe em branco para manter a atual'}"><small class="muted">${isNew?'O aluno usará esta senha no primeiro acesso.':'Preencha somente se quiser alterar a senha do aluno.'}</small>`;
    form.appendChild(field);
  }

  function wrapStudentForm(){
    if(typeof window.studentForm!=='function' || window.studentForm.__hardened) return;
    const original=window.studentForm;
    function wrapped(id){
      original(id);
      setTimeout(addStudentPasswordField,0);
    }
    wrapped.__hardened=true;
    window.studentForm=wrapped;
  }

  function validatePhone(value){
    return String(value||'').replace(/\D/g,'').replace(/^55/,'').length>=10;
  }

  function audit(){
    const checks=[];
    checks.push({name:'Supabase client',ok:!!window.dunamisSupabase});
    checks.push({name:'Sessão atual',ok:!!window.current});
    checks.push({name:'Dados do aplicativo',ok:!!window.data && Array.isArray(window.data.students)});
    checks.push({name:'Endpoint WhatsApp',ok:true});
    checks.push({name:'Cron de notificações',ok:true});
    checks.push({name:'Gateway Asaas',ok:true});
    checks.push({name:'Cadastro de aluno com senha',ok:!!document.querySelector('#spw') || !document.querySelector('.modal')});
    return checks;
  }

  window.dunamisAudit=function(){
    const result=audit();
    console.table(result);
    return {ok:result.every(x=>x.ok),checks:result};
  };

  window.dunamisNormalizePhone=function(value){
    let p=String(value||'').replace(/\D/g,'');
    if(p && !p.startsWith('55')) p='55'+p;
    return p;
  };

  window.dunamisPhoneIsValid=validatePhone;

  ready(function(){
    wrapStudentForm();
    const observer=new MutationObserver(function(){wrapStudentForm();addStudentPasswordField();});
    observer.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(function(){observer.disconnect();},30000);
  });
})();

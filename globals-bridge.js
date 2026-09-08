// Dunamis Fit — compatibilidade entre variáveis globais e escopo lexical
(function(){
  try{
    Object.defineProperty(window,'data',{configurable:true,get:function(){return data},set:function(v){data=v}});
    Object.defineProperty(window,'current',{configurable:true,get:function(){return current},set:function(v){current=v}});
  }catch(e){ console.warn('Dunamis Fit globals bridge:',e); }
})();

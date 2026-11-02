(function(root){
  'use strict';
  function normalizeName(value){
    return String(value??'').replace(/[<>]/g,'').replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' ').slice(0,24);
  }
  function needsSetup(value){return normalizeName(value).length===0;}
  function greeting(value){const name=normalizeName(value);return name?'Welcome '+name+',':'Welcome,';}
  const api={normalizeName,needsSetup,greeting};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TickerProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this);

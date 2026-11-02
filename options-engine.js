(function(root){
  'use strict';
  const SQRT_2PI=Math.sqrt(2*Math.PI);
  function erf(x){const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return sign*y;}
  function cdf(x){return .5*(1+erf(x/Math.SQRT2));}
  function pdf(x){return Math.exp(-.5*x*x)/SQRT_2PI;}
  function price(q){const S=+q.spot,K=+q.strike,D=+q.days,V=+q.volatility,r=+q.rate,T=D/365;if(!(S>0&&K>0&&D>0&&V>0)||!Number.isFinite(r))throw new Error('Spot, strike, days and volatility must be positive');if(q.type!=='call'&&q.type!=='put')throw new Error('Option type must be call or put');const rootT=Math.sqrt(T),d1=(Math.log(S/K)+(r+.5*V*V)*T)/(V*rootT),d2=d1-V*rootT,disc=Math.exp(-r*T),n1=pdf(d1),call=S*cdf(d1)-K*disc*cdf(d2),put=K*disc*cdf(-d2)-S*cdf(-d1),isCall=q.type==='call';const premium=Math.max(0,isCall?call:put),delta=isCall?cdf(d1):cdf(d1)-1,gamma=n1/(S*V*rootT),vega=S*n1*rootT/100,theta=(-(S*n1*V)/(2*rootT)+(isCall?-r*K*disc*cdf(d2):r*K*disc*cdf(-d2)))/365;return {premium,delta,gamma,vega,theta,d1,d2};}
  function payoff(q){const intrinsic=q.type==='call'?Math.max(0,q.spotAtExpiry-q.strike):Math.max(0,q.strike-q.spotAtExpiry);return intrinsic-q.premium;}
  function breakEven(q){return q.type==='call'?q.strike+q.premium:q.strike-q.premium;}
  const api={price,payoff,breakEven};root.TickerOptions=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

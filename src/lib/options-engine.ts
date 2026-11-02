import type { Stock } from "@/lib/market";
export type OptionType="call"|"put";
export type OptionQuote={strike:number;bid:number;ask:number;mark:number;last:number;change:number;delta:number;gamma:number;theta:number;vega:number;volume:number;openInterest:number;impliedVolatility:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const normalPdf=(x:number)=>Math.exp(-.5*x*x)/Math.sqrt(2*Math.PI);
function normalCdf(x:number):number {
  const sign=x<0?-1:1,z=Math.abs(x),t=1/(1+.2316419*z);
  const polynomial=t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return clamp(.5+sign*(.5-normalPdf(z)*polynomial),0,1);
}
function priceOption(spot:number,strike:number,days:number,volatility:number,rate:number,type:OptionType) {
  const time=Math.max(1,days)/365,sigma=Math.max(.01,volatility),root=Math.sqrt(time);
  const d1=(Math.log(spot/strike)+(rate+.5*sigma*sigma)*time)/(sigma*root),d2=d1-sigma*root;
  const discount=Math.exp(-rate*time),nd1=normalCdf(d1),nd2=normalCdf(d2);
  const call=spot*nd1-strike*discount*nd2,put=strike*discount*normalCdf(-d2)-spot*normalCdf(-d1);
  const delta=type==="call"?nd1:nd1-1;
  const gamma=normalPdf(d1)/(spot*sigma*root);
  const vega=spot*normalPdf(d1)*root/100;
  const theta=type==="call"?(-spot*normalPdf(d1)*sigma/(2*root)-rate*strike*discount*nd2)/365:(-spot*normalPdf(d1)*sigma/(2*root)+rate*strike*discount*normalCdf(-d2))/365;
  return {mark:Math.max(.01,type==="call"?call:put),delta,gamma,vega,theta};
}
export function generateOptionChain(stock:Stock,daysToExpiry:number,type:OptionType,seed=731991):OptionQuote[] {
  const spot=Math.max(.01,stock.price),step=Math.max(1,Math.round(spot*.025)),center=Math.round(spot/step)*step;
  const volatility=clamp(.25+stock.beta*.12,.18,.95);
  return Array.from({length:15},(_,index)=>{
    const strike=center+(index-7)*step;
    const greeks=priceOption(spot,strike,daysToExpiry,volatility,.04,type);
    const spread=Math.max(.01,greeks.mark*.035),mark=Number(greeks.mark.toFixed(2));
    const pseudo=Math.abs(Math.sin(seed+index*17.13+daysToExpiry*.37));
    return {strike:Number(strike.toFixed(2)),bid:Number(Math.max(.01,mark-spread/2).toFixed(2)),ask:Number((mark+spread/2).toFixed(2)),mark,last:Number(Math.max(.01,mark*(1+(pseudo-.5)*.035)).toFixed(2)),change:Number((stock.change*greeks.delta*.65+(pseudo-.5)*5).toFixed(2)),delta:Number(greeks.delta.toFixed(3)),gamma:Number(greeks.gamma.toFixed(4)),theta:Number(greeks.theta.toFixed(3)),vega:Number(greeks.vega.toFixed(3)),volume:Math.floor(500+pseudo*18000),openInterest:Math.floor(1200+pseudo*85000),impliedVolatility:Number((volatility*100).toFixed(1))};
  });
}

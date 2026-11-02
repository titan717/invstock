import type { Stock } from "@/lib/market";
import { ACHIEVEMENTS, calculateNetWorth, type GameNews, type GameState } from "@/lib/game-engine";

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const templates:[string,string,string,number][]=[
  ["Earnings beat","The quarter came in ahead of expectations.","earnings",1],
  ["Earnings miss","Guidance disappointed analysts.","earnings",-1],
  ["Product launch","A new product is winning early praise.","product",1],
  ["Regulatory scrutiny","Regulators are asking difficult questions.","regulation",-1],
  ["CEO surprise","The CEO made an unexpected announcement.","drama",0],
  ["Sector momentum","Investors are rotating into this sector.","sector",1],
  ["Macro rate cut","Central bank signals a softer rate path.","macro",1],
  ["Inflation shock","Hot inflation data rattles the market.","macro",-1],
  ["Viral rumor","Unconfirmed reports are moving the stock.","rumor",1],
  ["Supply disruption","A supply-chain problem hits production.","sector",-1]
];

export function applyMarketEvent(state:GameState,stocks:Stock[],event:GameNews):Stock[] {
  const affected=new Set(event.tickers);
  return stocks.map(stock=>{
    if(!affected.has(stock.ticker))return stock;
    const beta=event.type==="macro"?clamp(stock.beta,.65,1.5):1;
    const price=Math.max(.5,stock.price*(1+event.sentiment*Number(event.magnitude??0)*beta));
    return {...stock,price:Number(price.toFixed(2)),change:stock.change+(price/stock.price-1)*100,history:[...stock.history.slice(-389),Number(price.toFixed(2))]};
  });
}

export function createMarketEvent(state:GameState,stocks:Stock[],seed:number):GameNews {
  let value=seed>>>0;
  const random=()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};
  const stock=stocks[Math.floor(random()*stocks.length)];
  const template=templates[Math.floor(random()*templates.length)];
  const magnitude=.012+random()*.055;
  const sentiment=template[3]||(random()<.5?1:-1);
  const affected=template[2]==="macro"?stocks:template[2]==="sector"?stocks.filter(s=>s.sector===stock.sector):[stock];
  const rumour=template[2]==="rumor";
  const event:GameNews={id:Math.floor(random()*1e9),headline:template[0]+(rumour?": Unverified chatter around "+stock.name:""),body:template[1],tickers:affected.map(s=>s.ticker),sentiment,magnitude,type:template[2],day:state.market.day,minute:state.market.minute,after:rumour?state.market.day*390+(state.market.minute-570)+15+Math.floor(random()*26):null,truth:random()<.56};
  state.news=[event,...state.news].slice(0,80);
  if(rumour)state.pendingNews=[event,...state.pendingNews];
  return event;
}

export function resolvePendingRumours(state:GameState,stocks:Stock[],absoluteTick:number):GameNews[] {
  const resolved:GameNews[]=[];
  state.pendingNews=state.pendingNews.filter(event=>{
    if(event.after==null||absoluteTick<event.after)return true;
    const ticker=event.tickers[0];
    const stock=stocks.find(item=>item.ticker===ticker);
    const confirmed=Boolean(event.truth);
    const direction=confirmed?event.sentiment:-event.sentiment;
    if(stock){
      const multiplier=confirmed?.8:1.15;
      const previous=stock.price;
      const price=Math.max(.5,previous*(1+direction*Number(event.magnitude??0)*multiplier));
      stock.price=Number(price.toFixed(2));
      stock.change+=(price/Math.max(.01,previous)-1)*100;
      stock.history=[...stock.history.slice(-389),stock.price];
    }
    const followUp:GameNews={...event,id:event.id+1,headline:confirmed?"Rumour confirmed: "+(stock?.name??ticker):"Rumour debunked: "+(stock?.name??ticker),type:"aftermath",sentiment:direction,after:null};
    resolved.push(followUp);
    return false;
  });
  state.news=[...resolved,...state.news].slice(0,80);
  return resolved;
}

export function evaluateAchievements(state:GameState,stocks:Stock[]):{id:string;description:string}[] {
  const netWorth=calculateNetWorth(state,stocks);
  const candidates:{id:string;description:string}[]=[];
  if(state.realizedPnl>0)candidates.push({id:ACHIEVEMENTS[0].id,description:ACHIEVEMENTS[0].description});
  if(Object.values(state.holdSince).some(day=>state.market.day-day>=7))candidates.push({id:ACHIEVEMENTS[1].id,description:ACHIEVEMENTS[1].description});
  if(state.achievements.includes("Margin Called"))candidates.push({id:ACHIEVEMENTS[2].id,description:ACHIEVEMENTS[2].description});
  if(state.buildings.length>0)candidates.push({id:ACHIEVEMENTS[3].id,description:ACHIEVEMENTS[3].description});
  if(netWorth>=1_000_000)candidates.push({id:ACHIEVEMENTS[4].id,description:ACHIEVEMENTS[4].description});
  const unlocked=candidates.filter(item=>!state.achievements.includes(item.id));
  state.achievements=[...state.achievements,...unlocked.map(item=>item.id)];
  return unlocked;
}

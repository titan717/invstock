import type { Stock } from "@/lib/market";
import { ACHIEVEMENTS, calculateNetWorth, createWeeklyChallenge, sessionTick, type GameNews, type GameState } from "@/lib/game-engine";

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
  const event:GameNews={id:Math.floor(random()*1e9),headline:template[0]+(rumour?": Unverified chatter around "+stock.name:""),body:template[1],tickers:affected.map(s=>s.ticker),sentiment,magnitude,type:template[2],day:state.market.day,minute:state.market.minute,after:rumour?sessionTick(state.market.day,state.market.minute)+15+Math.floor(random()*26):null,truth:random()<.56};
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

export function updateProgression(state:GameState,stocks:Stock[],seed:number):void {
  const week=Math.ceil(state.market.day/7);
  const previousChallenge=state.weeklyChallenge;
  if(previousChallenge.week!==week){
    const gracePeriodExpired=week>previousChallenge.week+1;
    if(previousChallenge.joined&&!previousChallenge.claimed&&gracePeriodExpired){
      const playerReturn=(calculateNetWorth(state,stocks)/Math.max(1,previousChallenge.startValue)-1)*100;
      const place=previousChallenge.bots.filter(bot=>bot.returnPct>playerReturn).length+1;
      const reward=place===1?previousChallenge.reward:150;
      state.cash+=reward;
      state.xp+=place===1?150:50;
      state.activity=[{type:"weekly-reward",amount:reward,day:state.market.day},...state.activity].slice(0,100);
    }
    if(!previousChallenge.joined||previousChallenge.claimed||gracePeriodExpired){
      state.weeklyChallenge=createWeeklyChallenge(week,calculateNetWorth(state,stocks));
    }
  }
  let randomState=seed>>>0;
  const random=()=>{randomState=(randomState*1664525+1013904223)>>>0;return randomState/4294967296;};
  state.weeklyChallenge.bots=state.weeklyChallenge.bots.map(bot=>({...bot,returnPct:bot.returnPct+(random()-.49)*bot.risk*.12}));
  const growth=Math.max(0,calculateNetWorth(state,stocks)-state.start);
  state.missions=state.missions.map(mission=>({...mission,progress:Math.min(mission.target,mission.metric==="trades"?state.trades:mission.metric==="properties"?state.buildings.length:growth)}));
  state.rank=state.xp>=2000?"Market Legend":state.xp>=1000?"Portfolio Pro":state.xp>=450?"Analyst":state.xp>=150?"Trader":"Apprentice";
}
export function claimMission(state:GameState,id:string):{ok:boolean;reason?:string} {
  const mission=state.missions.find(item=>item.id===id);
  if(!mission)return {ok:false,reason:"Mission not found."};
  if(mission.claimed)return {ok:false,reason:"This mission reward has already been claimed."};
  if(mission.progress<mission.target)return {ok:false,reason:"Complete the mission objective first."};
  mission.claimed=true;state.cash+=mission.reward;state.xp+=mission.xpReward;
  state.rank=state.xp>=2000?"Market Legend":state.xp>=1000?"Portfolio Pro":state.xp>=450?"Analyst":state.xp>=150?"Trader":"Apprentice";
  return {ok:true};
}
export function joinWeeklyChallenge(state:GameState,stocks:Stock[]):{ok:boolean;reason?:string} {
  if(state.weeklyChallenge.joined)return {ok:false,reason:"You have already joined this week's challenge."};
  if(state.weeklyChallenge.claimed)return {ok:false,reason:"This week's challenge has ended."};
  state.weeklyChallenge.joined=true;state.weeklyChallenge.startValue=calculateNetWorth(state,stocks);
  return {ok:true};
}
export function claimWeeklyChallenge(state:GameState,stocks:Stock[]):{ok:boolean;reward?:number;reason?:string} {
  const challenge=state.weeklyChallenge;
  if(!challenge.joined)return {ok:false,reason:"Join the weekly challenge before claiming a reward."};
  if(challenge.claimed)return {ok:false,reason:"The weekly reward has already been claimed."};
  if(state.market.day<=challenge.week*7)return {ok:false,reason:"The challenge ends after seven simulated market days."};
  const playerReturn=(calculateNetWorth(state,stocks)/Math.max(1,challenge.startValue)-1)*100;
  const place=challenge.bots.filter(bot=>bot.returnPct>playerReturn).length+1;
  const reward=place===1?challenge.reward:150;
  state.cash+=reward;state.xp+=place===1?150:50;challenge.claimed=true;
  state.rank=state.xp>=2000?"Market Legend":state.xp>=1000?"Portfolio Pro":state.xp>=450?"Analyst":state.xp>=150?"Trader":"Apprentice";
  return {ok:true,reward};
}

import type { Stock } from "@/lib/market";

export type GameHolding = { quantity: number; averageCost: number };
export type GameBuilding = { id: string; name: string; icon: string; cost: number; value: number; income: number; level: number };
export type GameActivity = { type: string; ticker?: string; qty?: number; price?: number; fee?: number; amount?: number; day: number };
export type GameSettings = { speed: number; sound: boolean; haptics: boolean; theme: "dark" };
export type GameNews = { id: number; headline: string; body: string; tickers: string[]; sentiment: number; magnitude?: number; type: string; day: number; minute?: number; after?: number | null; truth?: boolean };
export type GameState = {
  version: 2;
  cash: number;
  savings: number;
  loan: number;
  holdings: Record<string, GameHolding>;
  buildings: GameBuilding[];
  activity: GameActivity[];
  trades: number;
  realizedPnl: number;
  achievements: string[];
  watchlist: string[];
  settings: GameSettings;
  history: {v:number;t:number}[];
  dailyHistory: {v:number;t:number}[];
  holdSince: Record<string, number>;
  best: number;
  start: number;
  lastDay: number;
  lastBankDay: number;
  lastDividendDay: number;
  market: { regime: string; day: number; minute: number; marketFactor: number; sectorFactors: Record<string,number>; stocks: Record<string,unknown> };
  news: GameNews[];
  pendingNews: GameNews[];
  prngSeed: number;
  eventsNextAt: number;
  orphanedPositions: Record<string, GameHolding>;
};
export type GameActionResult = {ok:true; state:GameState; message?:string} | {ok:false; state:GameState; reason:string};
type BuildingDefinition = {name:string;icon:string;cost:number;income:number};
export const BUILDING_CATALOG: BuildingDefinition[] = [
  {name:"Lemonade Stand",icon:"🍋",cost:250,income:.22},
  {name:"Coffee Cafe",icon:"☕",cost:1800,income:1.35},
  {name:"City Apartment",icon:"🏙️",cost:12000,income:8.2},
  {name:"Office Tower",icon:"🏢",cost:85000,income:58},
  {name:"Data Center",icon:"🖥️",cost:420000,income:320}
];
export const ACHIEVEMENTS = [
  {id:"First Profit",description:"Complete your first profitable sale."},
  {id:"Diamond Hands",description:"Hold a position through seven simulated market days."},
  {id:"Margin Called",description:"Experience a forced liquidation after a margin breach."},
  {id:"Landlord",description:"Buy your first property."},
  {id:"Millionaire",description:"Reach one million dollars in net worth."}
] as const;
const defaultSettings: GameSettings = {speed:1,sound:true,haptics:true,theme:"dark"};
const object = (v:unknown):Record<string,any> => v && typeof v==="object" && !Array.isArray(v) ? v as Record<string,any> : {};
const number = (v:unknown,fallback=0) => typeof v==="number" && Number.isFinite(v) ? v : fallback;
const strings = (v:unknown) => Array.isArray(v) ? v.filter((x):x is string=>typeof x==="string") : [];

export function createGameState(seed=731991): GameState {
  return {version:2,cash:5000,savings:0,loan:0,holdings:{},buildings:[],activity:[],trades:0,realizedPnl:0,achievements:[],watchlist:["MSFT","META","GOOGL","COIN","SHOP"],settings:{...defaultSettings},history:[],dailyHistory:[],holdSince:{},best:10000,start:10000,lastDay:1,lastBankDay:1,lastDividendDay:0,market:{regime:"Sideways",day:1,minute:570,marketFactor:0,sectorFactors:{},stocks:{}},news:[],pendingNews:[],prngSeed:seed>>>0,eventsNextAt:0,orphanedPositions:{}};
}

export function migrateLegacySave(raw: unknown, stocks: Stock[]): GameState {
  const source=object(raw), state=createGameState(number(source.prngSeed,731991));
  const quantities=object(source.holdings), costs=object(source.costs), known=new Set(stocks.map(s=>s.ticker));
  state.cash=number(source.cash,state.cash); state.savings=number(source.savings); state.loan=number(source.loan);
  for(const [ticker,value] of Object.entries(quantities)){
    const quantity=number(value);
    if(quantity<=0) continue;
    const holding={quantity,averageCost:number(costs[ticker])/quantity};
    (known.has(ticker)?state.holdings:state.orphanedPositions)[ticker]=holding;
  }
  state.buildings=Array.isArray(source.buildings)?source.buildings.filter((b:unknown)=>object(b).name).map((b:unknown,i:number)=>{const x=object(b);return{id:String(x.id??"legacy-building-"+i),name:String(x.name),icon:String(x.icon??"🏢"),cost:number(x.cost),value:number(x.value,number(x.cost)),income:number(x.income),level:Math.max(1,number(x.level,1))};}):[];
  state.activity=Array.isArray(source.activity)?source.activity.slice(0,100):[];
  state.trades=number(source.trades);state.realizedPnl=number(source.realizedPnl);
  state.achievements=strings(source.achievements);
  state.watchlist=strings(source.watch).length?strings(source.watch):state.watchlist;
  state.settings={...defaultSettings,...object(source.settings),theme:"dark",speed:number(object(source.settings).speed,1)};
  state.history=Array.isArray(source.history)?source.history.slice(-1950):[];
  state.dailyHistory=Array.isArray(source.dailyHistory)?source.dailyHistory.slice(-3650):[];
  state.holdSince=object(source.holdSince) as Record<string,number>;
  state.best=number(source.best,state.best);state.start=number(source.start,state.start);
  state.lastDay=number(source.lastDay,1);state.lastBankDay=number(source.lastBankDay,1);
  const snapshot=object(source.marketSnapshot);
  state.market={regime:String(snapshot.regime??"Sideways"),day:number(snapshot.day,1),minute:number(snapshot.minute,570),marketFactor:number(snapshot.marketFactor),sectorFactors:object(snapshot.sectorFactors) as Record<string,number>,stocks:object(snapshot.stocks)};
  state.news=Array.isArray(source.news)?source.news:[];
  state.pendingNews=Array.isArray(source.pendingNews)?source.pendingNews:[];
  state.prngSeed=number(source.prngSeed,731991)>>>0;
  state.eventsNextAt=number(source.eventsNextAt);
  state.lastDividendDay=number(source.lastDividendDay);
  return state;
}

export function calculateNetWorth(state:GameState, stocks:Stock[]):number {
  const prices=new Map(stocks.map(s=>[s.ticker,s.price]));
  const positions=Object.entries(state.holdings).reduce((sum,[ticker,h])=>sum+(prices.get(ticker)??0)*h.quantity,0);
  return state.cash+state.savings+positions+state.buildings.reduce((sum,b)=>sum+b.value,0)-state.loan;
}

function result(state:GameState,ok:boolean,reason=""):GameActionResult {
  return ok?{ok:true,state}:{ok:false,state,reason};
}
export function bankAction(state:GameState, stocks:Stock[], action:"deposit"|"withdraw"|"borrow"|"repay", amount:number):GameActionResult {
  if(!Number.isFinite(amount)||amount<=0)return result(state,false,"Enter an amount greater than zero.");
  if(action==="deposit"){if(amount>state.cash)return result(state,false,"Not enough cash to deposit.");state.cash-=amount;state.savings+=amount;state.activity.unshift({type:"deposit",amount,day:state.market.day});}
  if(action==="withdraw"){if(amount>state.savings)return result(state,false,"Not enough savings to withdraw.");state.savings-=amount;state.cash+=amount;state.activity.unshift({type:"withdraw",amount,day:state.market.day});}
  if(action==="borrow"){const available=Math.max(0,calculateNetWorth(state,stocks)*.35-state.loan);if(amount>available)return result(state,false,"Above your available credit limit.");state.loan+=amount;state.cash+=amount;state.activity.unshift({type:"loan",amount,day:state.market.day});}
  if(action==="repay"){if(amount>state.cash||amount>state.loan)return result(state,false,"Invalid loan repayment.");state.cash-=amount;state.loan-=amount;state.activity.unshift({type:"repayment",amount,day:state.market.day});}
  state.activity=state.activity.slice(0,100);return result(state,true);
}
export function buildingAction(state:GameState,_stocks:Stock[],action:"buy"|"upgrade"|"sell",building:string):GameActionResult {
  if(action==="buy"){
    const definition=BUILDING_CATALOG.find(item=>item.name===building);
    if(!definition)return result(state,false,"Unknown property.");
    if(state.cash<definition.cost)return result(state,false,"Not enough cash.");
    state.cash-=definition.cost;
    state.buildings.push({id:building.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+(state.buildings.length+1),...definition,value:definition.cost,level:1});
    if(!state.achievements.includes("Landlord"))state.achievements.push("Landlord");
    return result(state,true,definition.name+" acquired.");
  }
  const index=state.buildings.findIndex(item=>item.id===building);
  if(index<0)return result(state,false,"Property not found.");
  const asset=state.buildings[index];
  if(action==="upgrade"){
    const cost=asset.cost*asset.level*.8;
    if(state.cash<cost)return result(state,false,"Not enough cash to upgrade.");
    state.cash-=cost;asset.level+=1;asset.value*=1.22;asset.income*=1.55;
    return result(state,true);
  }
  state.cash+=asset.value*.92;state.buildings.splice(index,1);
  return result(state,true,"Property sold at market value.");
}
export function advanceGameDay(state:GameState, stocks:Stock[]):{state:GameState;market:Stock[];events:GameNews[]} {
  const day=state.market.day+1;
  if(state.lastDividendDay<day){
    for(const stock of stocks){const holding=state.holdings[stock.ticker];if(holding&&stock.dividend>0){const payment=stock.price*stock.dividend/365*holding.quantity;state.cash+=payment;state.activity.unshift({type:"dividend",ticker:stock.ticker,amount:payment,day});}}
    state.lastDividendDay=day;
  }
  state.savings*=1+.035/365;
  state.loan*=1+.12/365;
  if(state.loan>0){const minimum=state.loan*.02;if(state.cash>=minimum){state.cash-=minimum;state.loan-=minimum;}else{state.loan*=1.01;}}
  state.market.day=day;state.lastBankDay=day;
  if(state.loan>calculateNetWorth(state,stocks)+state.loan&&state.loan>0){
    const largest=Object.entries(state.holdings).sort((a,b)=>b[1].quantity*(stocks.find(s=>s.ticker===b[0])?.price??0)-a[1].quantity*(stocks.find(s=>s.ticker===a[0])?.price??0))[0];
    if(largest){const [ticker,holding]=largest,stock=stocks.find(s=>s.ticker===ticker);if(stock){const proceeds=holding.quantity*stock.price*.9993;state.cash+=proceeds-Math.max(.01,proceeds*.0005);delete state.holdings[ticker];delete state.holdSince[ticker];state.achievements.push("Margin Called");}}
  }
  state.activity=state.activity.slice(0,100);
  return {state,market:stocks,events:[]};
}

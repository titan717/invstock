import type { Stock } from "@/lib/market";
import type { CurrencyCode, Difficulty } from "@/lib/currency";
import { createCryptoMarket, executeCryptoTrade, type CryptoAsset, type CryptoHolding } from "@/lib/crypto";
import { purchaseBusiness, hireEmployee, fireEmployee, promoteEmployee, upgradeBusiness, setBusinessStrategy, relocateBusiness, simulateBusinessMinutes, type Business, type BusinessStrategy, type EmployeeRole } from "@/lib/business-engine";
import { purchaseProperty, upgradeProperty, sellProperty, simulatePropertyMinutes, type RealEstateProperty } from "@/lib/real-estate";
import { createScrutinyState, evaluateFinancialScrutiny, hireComplianceOfficer, resolveInvestigation, type ScrutinyState, type ScrutinySignals, type InvestigationAction } from "@/lib/compliance-engine";
import { createLegacyState, completeRebirth, purchaseLegacyUpgrade, type LegacyState, type LegacyUpgrade, type RebirthSnapshot } from "@/lib/rebirth-engine";
import { createMultiAssetMarket, executeMultiAssetTrade, calculateMultiAssetValue, accrueBondIncome, advanceMultiAssetMarket, type MultiAssetInstrument, type MultiAssetHolding } from "@/lib/multi-asset";
import { getWorldIndustryModifiers, pruneExpiredWorldNews } from "@/lib/world-economy";

export const MARKET_OPEN_MINUTE = 570;
export const MARKET_SESSION_MINUTES = 390;

export type GameHolding = { quantity: number; averageCost: number };
export type GameBuilding = { id: string; name: string; icon: string; cost: number; value: number; income: number; level: number };
export type GameActivity = { type: string; ticker?: string; qty?: number; price?: number; fee?: number; amount?: number; day: number };
export type GameSettings = { speed: number; sound: boolean; haptics: boolean; theme: "dark"; currency: CurrencyCode; difficulty: Difficulty };
export type GameNews = { id: number; headline: string; body: string; tickers: string[]; sentiment: number; magnitude?: number; type: string; day: number; minute?: number; after?: number | null; truth?: boolean; source?: string; category?: string; affectedIndustries?: string[]; affectedSectors?: string[]; reliability?: number; status?: "developing"|"confirmed"|"unverified"; severity?: "low"|"moderate"|"high"|"critical"; expiresDay?: number; demandImpact?: number; costImpact?: number };
export type GameMission={id:string;title:string;description:string;metric:"trades"|"properties"|"growth";target:number;progress:number;reward:number;xpReward:number;claimed:boolean};
export type ChallengeBot={name:string;returnPct:number;risk:number};
export type WeeklyChallenge={week:number;joined:boolean;startValue:number;bots:ChallengeBot[];reward:number;claimed:boolean};
export function createDefaultMissions():GameMission[]{return [
  {id:"first-trade",title:"Make your first trade",description:"Complete one stock buy or sell.",metric:"trades",target:1,progress:0,reward:150,xpReward:50,claimed:false},
  {id:"first-property",title:"Build your first asset",description:"Acquire a property in the property market.",metric:"properties",target:1,progress:0,reward:250,xpReward:80,claimed:false},
  {id:"portfolio-growth",title:"Grow your portfolio",description:"Increase net worth by $250 from starting capital.",metric:"growth",target:250,progress:0,reward:200,xpReward:60,claimed:false}
];}
export function createWeeklyChallenge(week:number,startValue:number):WeeklyChallenge{return {week,joined:false,startValue,bots:[{name:"Alex Momentum",returnPct:0,risk:.9},{name:"Taylor Value",returnPct:0,risk:.45},{name:"Jordan Quant",returnPct:0,risk:.7},{name:"Casey Contrarian",returnPct:0,risk:1.15}],reward:500,claimed:false};}
export type GameState = {
  version: 5;
  profileName: string;
  xp: number;
  rank: string;
  missions: GameMission[];
  weeklyChallenge: WeeklyChallenge;
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
  cryptoHoldings: Record<string, CryptoHolding>;
  cryptoMarket: CryptoAsset[];
  businesses: Business[];
  realEstate: RealEstateProperty[];
  lastActiveAt: number;
  scrutiny: ScrutinyState;
  legacy: LegacyState;
  multiAssetMarket: MultiAssetInstrument[];
  multiAssetHoldings: Record<string,MultiAssetHolding>;
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
const defaultSettings: GameSettings = {speed:1,sound:true,haptics:true,theme:"dark",currency:"USD",difficulty:"normal"};
export const DIFFICULTY_RULES: Record<Difficulty,{marketVolatility:number;businessIncome:number;buildingCost:number;savingsApy:number;loanApr:number;creditLimit:number;missedPaymentPenalty:number}> = {
  easy:{marketVolatility:.75,businessIncome:1.2,buildingCost:.85,savingsApy:.04,loanApr:.08,creditLimit:.45,missedPaymentPenalty:.005},
  normal:{marketVolatility:1,businessIncome:1,buildingCost:1,savingsApy:.035,loanApr:.12,creditLimit:.35,missedPaymentPenalty:.01},
  hard:{marketVolatility:1.35,businessIncome:.9,buildingCost:1.15,savingsApy:.03,loanApr:.16,creditLimit:.3,missedPaymentPenalty:.015},
  expert:{marketVolatility:1.7,businessIncome:.8,buildingCost:1.35,savingsApy:.02,loanApr:.22,creditLimit:.25,missedPaymentPenalty:.02}
};
const object = (v:unknown):Record<string,any> => v && typeof v==="object" && !Array.isArray(v) ? v as Record<string,any> : {};
const number = (v:unknown,fallback=0) => typeof v==="number" && Number.isFinite(v) ? v : fallback;
const strings = (v:unknown) => Array.isArray(v) ? v.filter((x):x is string=>typeof x==="string") : [];


function hydrateScrutiny(value:unknown,fallback:ScrutinyState):ScrutinyState {
  const source=object(value), investigation=object(source.investigation);
  const level=["low","moderate","high","critical"].includes(source.level)?source.level:fallback.level;
  const status=["open","cleared","fine-paid","dismissed"].includes(investigation.status)?investigation.status:"open";
  return {
    score:Math.max(0,Math.min(100,number(source.score))),
    level:level as ScrutinyState["level"],
    reasons:strings(source.reasons),
    investigation:source.investigation&&investigation.id?{
      id:String(investigation.id),status:status as NonNullable<ScrutinyState["investigation"]>["status"],
      openedAtReview:number(investigation.openedAtReview),fine:number(investigation.fine),
      estimatedTaxAdjustment:number(investigation.estimatedTaxAdjustment),legalCost:number(investigation.legalCost),
      reputationPenalty:number(investigation.reputationPenalty),reason:String(investigation.reason??"Financial activity requires review.")
    }:null,
    complianceOfficer:Boolean(source.complianceOfficer),
    reviews:number(source.reviews),
    lastActivityFingerprint:String(source.lastActivityFingerprint??""),
  };
}
function hydrateLegacy(value:unknown):LegacyState {
  const source=object(value),upgrades=object(source.upgrades);
  return {
    points:number(source.points),lifetimePoints:number(source.lifetimePoints),rebirthCount:number(source.rebirthCount),
    upgrades:{
      startingCapital:number(upgrades.startingCapital),
      businessCostReduction:number(upgrades.businessCostReduction),
      researchEfficiency:number(upgrades.researchEfficiency),
    },
    permanentAchievements:strings(source.permanentAchievements),
    lastRebirthDay:number(source.lastRebirthDay),
  };
}

export function createGameState(seed=731991): GameState {
  return {version:5,profileName:"",xp:0,rank:"Apprentice",missions:createDefaultMissions(),weeklyChallenge:createWeeklyChallenge(1,10000),cash:5000,savings:0,loan:0,holdings:{},buildings:[],activity:[],trades:0,realizedPnl:0,achievements:[],watchlist:["MSFT","META","GOOGL","COIN","SHOP"],settings:{...defaultSettings},history:[],dailyHistory:[],holdSince:{},best:10000,start:10000,lastDay:1,lastBankDay:1,lastDividendDay:0,market:{regime:"Sideways",day:1,minute:MARKET_OPEN_MINUTE,marketFactor:0,sectorFactors:{},stocks:{}},news:[],pendingNews:[],prngSeed:seed>>>0,eventsNextAt:0,orphanedPositions:{},cryptoHoldings:{},cryptoMarket:createCryptoMarket(seed),businesses:[],realEstate:[],lastActiveAt:0,scrutiny:createScrutinyState(),legacy:createLegacyState()};
}

export function migrateLegacySave(raw: unknown, stocks: Stock[]): GameState {
  const source=object(raw), state=createGameState(number(source.prngSeed,731991));
  const quantities=object(source.holdings), costs=object(source.costs), known=new Set(stocks.map(s=>s.ticker));
  state.cash=number(source.cash,state.cash); state.savings=number(source.savings); state.loan=number(source.loan);
  for(const [ticker,value] of Object.entries(quantities)){
    const quantity=number(value);
    if(quantity<=0) continue;
    const totalCost=number(costs[ticker]);
    const marketPrice=stocks.find(stock=>stock.ticker===ticker)?.price??0;
    const holding={quantity,averageCost:totalCost>0?totalCost/quantity:marketPrice};
    (known.has(ticker)?state.holdings:state.orphanedPositions)[ticker]=holding;
  }
  state.buildings=Array.isArray(source.buildings)?source.buildings.filter((b:unknown)=>object(b).name).map((b:unknown,i:number)=>{const x=object(b);return{id:String(x.id??"legacy-building-"+i),name:String(x.name),icon:String(x.icon??"🏢"),cost:number(x.cost),value:number(x.value,number(x.cost)),income:number(x.income),level:Math.max(1,number(x.level,1))};}):[];
  state.activity=Array.isArray(source.activity)?source.activity.slice(0,100):[];
  state.trades=number(source.trades);state.realizedPnl=number(source.realizedPnl);state.profileName=String(source.profileName??source.name??"");state.xp=number(source.xp);state.rank=String(source.rank??"Apprentice");state.missions=Array.isArray(source.missions)?source.missions:createDefaultMissions();state.weeklyChallenge=object(source.weeklyChallenge).bots?source.weeklyChallenge:createWeeklyChallenge(Math.ceil(number(source.marketSnapshot?.day,1)/7),number(source.start,10000));
  state.achievements=strings(source.achievements);
  state.watchlist=strings(source.watch).length?strings(source.watch):state.watchlist;
  state.settings={...defaultSettings,...object(source.settings),theme:"dark",speed:number(object(source.settings).speed,1)};
  state.history=Array.isArray(source.history)?source.history.slice(-1950):[];
  state.dailyHistory=Array.isArray(source.dailyHistory)?source.dailyHistory.slice(-3650):[];
  state.holdSince=object(source.holdSince) as Record<string,number>;
  state.best=number(source.best,state.best);state.start=number(source.start,state.start);
  state.lastDay=number(source.lastDay,1);state.lastBankDay=number(source.lastBankDay,1);
  const snapshot=object(source.marketSnapshot);
  state.market={regime:String(snapshot.regime??"Sideways"),day:number(snapshot.day,1),minute:number(snapshot.minute,MARKET_OPEN_MINUTE),marketFactor:number(snapshot.marketFactor),sectorFactors:object(snapshot.sectorFactors) as Record<string,number>,stocks:object(snapshot.stocks)};
  state.news=Array.isArray(source.news)?source.news:[];
  state.pendingNews=Array.isArray(source.pendingNews)?source.pendingNews:[];
  state.prngSeed=number(source.prngSeed,731991)>>>0;
  state.eventsNextAt=number(source.eventsNextAt);
  state.lastDividendDay=number(source.lastDividendDay);
  state.cryptoHoldings=object(source.cryptoHoldings) as Record<string,CryptoHolding>;
  state.cryptoMarket=Array.isArray(source.cryptoMarket)?source.cryptoMarket:state.cryptoMarket;
  state.settings.currency=["USD","INR","EUR","GBP","AED","JPY"].includes(object(source.settings).currency)?object(source.settings).currency:"USD";
  state.settings.difficulty=["easy","normal","hard","expert"].includes(object(source.settings).difficulty)?object(source.settings).difficulty:"normal";
  state.businesses=Array.isArray(source.businesses)?source.businesses:[];
  state.realEstate=Array.isArray(source.realEstate)?source.realEstate:[];
  state.lastActiveAt=number(source.lastActiveAt);
  return state;
}

export function hydrateGameState(raw:unknown,stocks:Stock[]):GameState {
  const source=object(raw);
  if(source.version!==2&&source.version!==3&&source.version!==4&&source.version!==5)return migrateLegacySave(raw,stocks);
  const defaults=createGameState();
  const market=object(source.market),challenge=object(source.weeklyChallenge);
  const holdings:Record<string,GameHolding>={};
  for(const [ticker,value] of Object.entries(object(source.holdings))){
    const holding=object(value);
    const quantity=number(holding.quantity);
    if(quantity>0){const savedCost=number(holding.averageCost);const marketPrice=stocks.find(stock=>stock.ticker===ticker)?.price??0;holdings[ticker]={quantity,averageCost:savedCost>0?savedCost:marketPrice};}
  }
  return {
    ...defaults,...source,version:5,profileName:String(source.profileName??defaults.profileName),
    xp:number(source.xp),rank:String(source.rank??defaults.rank),
    missions:Array.isArray(source.missions)?source.missions:defaults.missions,
    weeklyChallenge:Array.isArray(challenge.bots)?{...defaults.weeklyChallenge,...challenge}:defaults.weeklyChallenge,
    cash:number(source.cash,defaults.cash),savings:number(source.savings),loan:number(source.loan),
    holdings,cryptoHoldings:object(source.cryptoHoldings) as Record<string,CryptoHolding>,cryptoMarket:Array.isArray(source.cryptoMarket)?source.cryptoMarket:defaults.cryptoMarket,businesses:Array.isArray(source.businesses)?source.businesses:[],realEstate:Array.isArray(source.realEstate)?source.realEstate:[],lastActiveAt:number(source.lastActiveAt),buildings:Array.isArray(source.buildings)?source.buildings:[],
    activity:Array.isArray(source.activity)?source.activity:[],trades:number(source.trades),realizedPnl:number(source.realizedPnl),
    achievements:strings(source.achievements),watchlist:strings(source.watchlist).length?strings(source.watchlist):defaults.watchlist,
    settings:{...defaults.settings,...object(source.settings),theme:"dark",speed:number(object(source.settings).speed,1),currency:["USD","INR","EUR","GBP","AED","JPY"].includes(object(source.settings).currency)?object(source.settings).currency:"USD",difficulty:["easy","normal","hard","expert"].includes(object(source.settings).difficulty)?object(source.settings).difficulty:"normal"},
    history:Array.isArray(source.history)?source.history.slice(-1950):[],
    dailyHistory:Array.isArray(source.dailyHistory)?source.dailyHistory.slice(-3650):[],
    holdSince:object(source.holdSince) as Record<string,number>,
    market:{...defaults.market,...market,regime:String(market.regime??"Sideways"),day:number(market.day,1),minute:number(market.minute,MARKET_OPEN_MINUTE),sectorFactors:object(market.sectorFactors) as Record<string,number>,stocks:object(market.stocks)},
    news:Array.isArray(source.news)?source.news:[],pendingNews:Array.isArray(source.pendingNews)?source.pendingNews:[],
    prngSeed:number(source.prngSeed,731991)>>>0,eventsNextAt:number(source.eventsNextAt),lastDividendDay:number(source.lastDividendDay),
    scrutiny:hydrateScrutiny(source.scrutiny,defaults.scrutiny),legacy:hydrateLegacy(source.legacy),
    multiAssetMarket:Array.isArray(source.multiAssetMarket)?source.multiAssetMarket:defaults.multiAssetMarket,
    multiAssetHoldings:object(source.multiAssetHoldings) as Record<string,MultiAssetHolding>
  };
}

export function restoreMarketSnapshot(state:GameState, stocks:Stock[]):Stock[] {
  const saved=state.market.stocks;
  return stocks.map(base=>{
    const raw=object(saved[base.ticker]);
    if(!Object.keys(raw).length)return base;
    const price=number(raw.price,base.price);
    const candles=Array.isArray(raw.candles)?raw.candles:[];
    const daily=Array.isArray(raw.daily)?raw.daily:[];
    const savedHistory=candles.map((item:unknown)=>number(object(item).c)).filter((value:number)=>value>0);
    const dailyHistory=daily.map((item:unknown)=>number(object(item).c)).filter((value:number)=>value>0);
    const directHistory=Array.isArray(raw.history)?raw.history.filter((value:unknown)=>typeof value==="number"&&Number.isFinite(value)) as number[]:[];
    const history=directHistory.length?directHistory.slice(-390):[...dailyHistory.slice(-252),...savedHistory.slice(-390)].slice(-390);
    const open=number(raw.open,base.price);
    return {...base,price,change:number(raw.change,open>0?(price/open-1)*100:base.change),volume:number(raw.volume,base.volume),marketCap:number(raw.marketCap,number(raw.cap,base.marketCap)),pe:number(raw.pe,base.pe),dividend:number(raw.dividend,number(raw.div,base.dividend)),beta:number(raw.beta,base.beta),history:history.length?history:base.history};
  });
}

export function calculateNetWorth(state:GameState, stocks:Stock[]):number {
  const prices=new Map(stocks.map(s=>[s.ticker,s.price]));
  const positions=Object.entries(state.holdings).reduce((sum,[ticker,h])=>sum+(prices.get(ticker)??0)*h.quantity,0);
  const cryptoValue=Object.entries(state.cryptoHoldings).reduce((sum,[symbol,h])=>sum+(state.cryptoMarket.find(asset=>asset.symbol===symbol)?.price??0)*h.quantity,0);
  const multiAssetValue=calculateMultiAssetValue(state.multiAssetHoldings,state.multiAssetMarket);
  const businessValue=state.businesses.reduce((sum,business)=>sum+business.value,0);
  const realEstateValue=state.realEstate.reduce((sum,property)=>sum+property.value,0);
  return state.cash+state.savings+positions+cryptoValue+multiAssetValue+businessValue+realEstateValue+state.buildings.reduce((sum,b)=>sum+b.value,0)-state.loan;
}

function result(state:GameState,ok:boolean,reason=""):GameActionResult {
  return ok?{ok:true,state}:{ok:false,state,reason};
}
export function bankAction(state:GameState, stocks:Stock[], action:"deposit"|"withdraw"|"borrow"|"repay", amount:number):GameActionResult {
  if(!Number.isFinite(amount)||amount<=0)return result(state,false,"Enter an amount greater than zero.");
  if(action==="deposit"){if(amount>state.cash)return result(state,false,"Not enough cash to deposit.");state.cash-=amount;state.savings+=amount;state.activity.unshift({type:"deposit",amount,day:state.market.day});}
  if(action==="withdraw"){if(amount>state.savings)return result(state,false,"Not enough savings to withdraw.");state.savings-=amount;state.cash+=amount;state.activity.unshift({type:"withdraw",amount,day:state.market.day});}
  if(action==="borrow"){const available=Math.max(0,calculateNetWorth(state,stocks)*DIFFICULTY_RULES[state.settings.difficulty].creditLimit-state.loan);if(amount>available)return result(state,false,"Above your available credit limit.");state.loan+=amount;state.cash+=amount;state.activity.unshift({type:"loan",amount,day:state.market.day});}
  if(action==="repay"){if(amount>state.cash||amount>state.loan)return result(state,false,"Invalid loan repayment.");state.cash-=amount;state.loan-=amount;state.activity.unshift({type:"repayment",amount,day:state.market.day});}
  state.activity=state.activity.slice(0,100);return result(state,true);
}
export function buildingAction(state:GameState,_stocks:Stock[],action:"buy"|"upgrade"|"sell",building:string):GameActionResult {
  if(action==="buy"){
    const definition=BUILDING_CATALOG.find(item=>item.name===building);
    if(!definition)return result(state,false,"Unknown property.");
    const purchaseCost=definition.cost*DIFFICULTY_RULES[state.settings.difficulty].buildingCost;
    if(state.cash<purchaseCost)return result(state,false,"Not enough cash.");
    state.cash-=purchaseCost;
    state.buildings.push({id:building.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+(state.buildings.length+1),...definition,cost:purchaseCost,value:purchaseCost,level:1});
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

export function cryptoTradeAction(state:GameState, symbol:string, side:"buy"|"sell", quantity:number):GameActionResult {
  const asset=state.cryptoMarket.find(item=>item.symbol===symbol);
  if(!asset)return result(state,false,"Crypto asset not found.");
  const trade=executeCryptoTrade({cash:state.cash,holdings:state.cryptoHoldings},asset,side,quantity);
  if(!trade.ok)return result(state,false,trade.reason);
  state.cash=trade.portfolio.cash;
  state.cryptoHoldings=trade.portfolio.holdings;
  state.activity.unshift({type:side==="buy"?"crypto-buy":"crypto-sell",ticker:symbol,qty:quantity,price:trade.executionPrice,fee:trade.fee,amount:trade.executionPrice*quantity,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,side==="buy"?"Crypto purchased.":"Crypto sold.");
}


export function purchaseBusinessAction(state:GameState,definitionId:string,city:string):GameActionResult {
  const id="business-"+(state.businesses.length+1)+"-"+state.market.day;
  const purchase=purchaseBusiness(state.cash,definitionId,city,id,1-state.legacy.upgrades.businessCostReduction*.02);
  if(!purchase.ok)return result(state,false,purchase.reason);
  state.cash=purchase.cash??state.cash;
  state.businesses.push(purchase.business);
  state.activity.unshift({type:"business-purchase",amount:purchase.business.value,day:state.market.day});
  return result(state,true,purchase.business.name+" acquired in "+purchase.business.city+".");
}

export function hireBusinessEmployeeAction(state:GameState,businessId:string,role:EmployeeRole,name:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const business=state.businesses[index],id=businessId+"-employee-"+(state.activity.length+1);
  const hired=hireEmployee(business,role,id,name);
  if(!hired.ok)return result(state,false,hired.reason);
  state.businesses[index]=hired.business;
  state.activity.unshift({type:"business-hire",amount:hired.business.employees.find(employee=>employee.id===id)?.salaryPerDay??0,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,name+" hired.");
}


export function promoteBusinessEmployeeAction(state:GameState,businessId:string,employeeId:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const promoted=promoteEmployee(state.businesses[index],employeeId);
  if(!promoted.ok)return result(state,false,promoted.reason);
  state.businesses[index]=promoted.business;
  state.activity.unshift({type:"business-promotion",day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,"Employee promoted.");
}

export function fireBusinessEmployeeAction(state:GameState,businessId:string,employeeId:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const fired=fireEmployee(state.businesses[index],employeeId);
  if(!fired.ok)return result(state,false,fired.reason);
  state.businesses[index]=fired.business;
  state.activity.unshift({type:"business-fire",day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,"Employee dismissed.");
}

export function upgradeBusinessAction(state:GameState,businessId:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const upgraded=upgradeBusiness(state.businesses[index],state.cash);
  if(!upgraded.ok)return result(state,false,upgraded.reason);
  state.cash=upgraded.cash??state.cash;
  state.businesses[index]=upgraded.business;
  return result(state,true,"Business upgraded.");
}

export function setBusinessStrategyAction(state:GameState,businessId:string,strategy:BusinessStrategy):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  state.businesses[index]=setBusinessStrategy(state.businesses[index],strategy);
  return result(state,true,"Business strategy updated.");
}

export function relocateBusinessAction(state:GameState,businessId:string,city:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const moved=relocateBusiness(state.businesses[index],city,state.cash);
  if(!moved.ok)return result(state,false,moved.reason);
  state.cash=moved.cash??state.cash;
  state.businesses[index]=moved.business;
  return result(state,true,"Business relocated to "+moved.business.city+".");
}

export function sellBusinessAction(state:GameState,businessId:string):GameActionResult {
  const index=state.businesses.findIndex(item=>item.id===businessId);
  if(index<0)return result(state,false,"Business not found.");
  const [business]=state.businesses.splice(index,1);
  const proceeds=business.value*.9;
  state.cash+=proceeds;
  state.activity.unshift({type:"business-sale",amount:proceeds,day:state.market.day});
  return result(state,true,business.name+" sold.");
}


export function purchasePropertyAction(state:GameState,listingId:string,city:string):GameActionResult {
  const id="property-"+Date.now()+"-"+(state.realEstate.length+1);
  const purchase=purchaseProperty(state.cash,listingId,city,id,DIFFICULTY_RULES[state.settings.difficulty].buildingCost);
  if(!purchase.ok)return result(state,false,purchase.reason);
  state.cash=purchase.cash??state.cash;
  state.realEstate.push(purchase.property);
  state.activity.unshift({type:"property-purchase",amount:purchase.property.value,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,purchase.property.name+" acquired in "+purchase.property.city+".");
}

export function upgradeRealEstateAction(state:GameState,propertyId:string):GameActionResult {
  const index=state.realEstate.findIndex(item=>item.id===propertyId);
  if(index<0)return result(state,false,"Property not found.");
  const upgraded=upgradeProperty(state.realEstate[index],state.cash);
  if(!upgraded.ok)return result(state,false,upgraded.reason);
  state.cash=upgraded.cash??state.cash;
  state.realEstate[index]=upgraded.property;
  return result(state,true,"Property renovated.");
}

export function sellRealEstateAction(state:GameState,propertyId:string):GameActionResult {
  const index=state.realEstate.findIndex(item=>item.id===propertyId);
  if(index<0)return result(state,false,"Property not found.");
  const [property]=state.realEstate.splice(index,1);
  const sale=sellProperty(property);
  state.cash+=sale.proceeds;
  state.activity.unshift({type:"property-sale",amount:sale.proceeds,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,property.name+" sold.");
}


export function multiAssetTradeAction(state:GameState,symbol:string,side:"buy"|"sell",quantity:number):GameActionResult {
  const trade=executeMultiAssetTrade(state.cash,state.multiAssetHoldings,state.multiAssetMarket,symbol,side,quantity);
  if(!trade.ok)return result(state,false,trade.reason);
  state.cash=trade.cash;
  state.multiAssetHoldings=trade.holdings;
  state.realizedPnl+=trade.realizedPnl;
  state.activity.unshift({type:side==="buy"?"multiasset-buy":"multiasset-sell",ticker:symbol,qty:quantity,price:state.multiAssetMarket.find(asset=>asset.symbol===symbol)?.price,fee:trade.fee,amount:quantity*(state.multiAssetMarket.find(asset=>asset.symbol===symbol)?.price??0),day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,(side==="buy"?"Bought ":"Sold ")+quantity+" "+symbol+".");
}

export function reviewFinancialScrutinyAction(state:GameState,signals:ScrutinySignals):GameActionResult {
  const financialTypes=new Set(["buy","sell","crypto-buy","crypto-sell","multiasset-buy","multiasset-sell","deposit","withdraw","borrow","repay","business-purchase","business-sale","property-purchase","property-sale","transfer"]);
  const fingerprint=state.activity.filter(item=>financialTypes.has(item.type)).slice(0,12).map(item=>[item.type,item.amount??0,item.qty??0,item.day].join(":")).join("|");
  if(!fingerprint||fingerprint===state.scrutiny.lastActivityFingerprint)return result(state,true,"No new financial activity since the last review.");
  const previous=state.scrutiny.investigation?.id;
  const evaluated=evaluateFinancialScrutiny(state.scrutiny,signals);
  state.scrutiny={...evaluated.state,lastActivityFingerprint:fingerprint};
  if(state.scrutiny.investigation?.id&&state.scrutiny.investigation.id!==previous){
    state.activity.unshift({type:"investigation-opened",amount:state.scrutiny.investigation.fine,day:state.market.day});
  }
  state.activity=state.activity.slice(0,100);
  return result(state,true,state.scrutiny.investigation?.status==="open"?"Financial review opened. Check the reasons and respond with records or an appeal.":"Financial risk review updated.");
}

export function hireComplianceOfficerAction(state:GameState):GameActionResult {
  const cost=5000;
  if(state.scrutiny.complianceOfficer)return result(state,false,"A compliance officer is already employed.");
  if(state.cash<cost)return result(state,false,"Not enough cash to hire a compliance officer.");
  state.cash-=cost;
  state.scrutiny=hireComplianceOfficer(state.scrutiny);
  state.activity.unshift({type:"compliance-officer-hired",amount:cost,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,"Compliance officer hired. Future risk reviews will be more forgiving.");
}

export function resolveFinancialInvestigationAction(state:GameState,action:InvestigationAction,challengeSuccessful=false):GameActionResult {
  if(!state.scrutiny.investigation||state.scrutiny.investigation.status!=="open")return result(state,false,"There is no open investigation to resolve.");
  const resolved=resolveInvestigation(state.scrutiny,action,challengeSuccessful);
  state.scrutiny={
    score:resolved.score,level:resolved.level,reasons:resolved.reasons,
    investigation:resolved.investigation,complianceOfficer:resolved.complianceOfficer,reviews:resolved.reviews,lastActivityFingerprint:resolved.lastActivityFingerprint
  };
  const tax=action==="submit-records"||action==="challenge"&&challengeSuccessful?0:resolved.investigation?.estimatedTaxAdjustment??0;
  const totalDue=resolved.cashPenalty+resolved.legalCost+tax;
  if(totalDue>0){
    const paid=Math.min(state.cash,totalDue);
    state.cash-=paid;
    state.loan+=totalDue-paid;
    state.activity.unshift({type:"investigation-settlement",amount:totalDue,day:state.market.day});
  }else{
    state.activity.unshift({type:"investigation-resolved",day:state.market.day});
  }
  state.activity=state.activity.slice(0,100);
  return result(state,true,totalDue>0?"Investigation settled. Review the transaction history for costs.":"Investigation cleared.");
}

export function purchaseLegacyUpgradeAction(state:GameState,upgrade:LegacyUpgrade):GameActionResult {
  const purchased=purchaseLegacyUpgrade(state.legacy,upgrade);
  if(!purchased.ok)return result(state,false,purchased.reason);
  state.legacy=purchased.legacy;
  state.activity.unshift({type:"legacy-upgrade",amount:upgrade==="startingCapital"?2500:upgrade==="businessCostReduction"?2:1,day:state.market.day});
  state.activity=state.activity.slice(0,100);
  return result(state,true,"Permanent legacy upgrade unlocked.");
}

export function rebirthGameAction(state:GameState,stocks:Stock[]):GameActionResult {
  const snapshot:RebirthSnapshot={
    profileName:state.profileName,
    netWorth:calculateNetWorth(state,stocks),
    achievements:state.achievements,
    settings:{currency:state.settings.currency,difficulty:state.settings.difficulty},
    stockPositions:Object.keys(state.holdings).length,
    cryptoPositions:Object.keys(state.cryptoHoldings).length,
    businesses:state.businesses.length,
    properties:state.realEstate.length,
  };
  const completed=completeRebirth(state.legacy,snapshot,state.market.day);
  if(!completed.ok)return result(state,false,completed.reason);
  const next=createGameState((state.prngSeed+1)>>>0);
  next.profileName=state.profileName;
  next.settings={...state.settings,speed:1};
  next.legacy=completed.legacy;
  next.cash=completed.preview.reset.cash;
  next.start=next.cash;
  next.best=next.cash;
  next.weeklyChallenge=createWeeklyChallenge(1,next.cash);
  next.activity=[{type:"rebirth",amount:completed.preview.legacyPointsEarned,day:1}];
  return {ok:true,state:next,message:"Empire reborn. Permanent legacy rewards and profile settings were preserved."};
}

export function advanceBusinessEconomy(state:GameState,minutes=1):number {
  let totalProfit=0;
  pruneExpiredWorldNews(state,state.market.day);
  const bondIncome=accrueBondIncome(state.multiAssetHoldings,state.multiAssetMarket,minutes);
  totalProfit+=bondIncome;
  state.multiAssetMarket=advanceMultiAssetMarket(state.multiAssetMarket,(state.prngSeed+state.market.minute+state.market.day)>>>0);
  state.businesses=state.businesses.map(business=>{
    const modifiers=getWorldIndustryModifiers(state.news,business.industry,state.market.day);
    const result=simulateBusinessMinutes(business,minutes,state.settings.difficulty,modifiers.demand,modifiers.costs);
    totalProfit+=result.profit;
    return result.business;
  });
  state.realEstate=state.realEstate.map(property=>{
    const industry=property.type==="retail"?"retail":property.type==="warehouse"?"logistics":"construction";
    const modifiers=getWorldIndustryModifiers(state.news,industry,state.market.day);
    const result=simulatePropertyMinutes(property,minutes,modifiers.demand,state.settings.difficulty,modifiers.costs);
    totalProfit+=result.netIncome;
    return result.property;
  });
  state.cash=Math.max(0,state.cash+totalProfit);
  return totalProfit;
}

export const OFFLINE_EARNINGS_CAP_MINUTES=480;
export function applyOfflineBusinessEarnings(state:GameState,elapsedMs:number):{earned:number;minutes:number} {
  const elapsedMinutes=state.lastActiveAt>0&&state.settings.speed>0&&Number.isFinite(elapsedMs)?Math.max(0,elapsedMs/60000):0;
  const minutes=Math.min(OFFLINE_EARNINGS_CAP_MINUTES,elapsedMinutes);
  const earned=advanceBusinessEconomy(state,minutes);
  state.lastActiveAt=Date.now();
  return {earned,minutes};
}

export function advanceGameDay(state:GameState, stocks:Stock[]):{state:GameState;market:Stock[];events:GameNews[]} {
  const day=state.market.day+1;
  if(state.lastDividendDay<day){
    for(const stock of stocks){const holding=state.holdings[stock.ticker];if(holding&&stock.dividend>0){const payment=stock.price*stock.dividend/365*holding.quantity;state.cash+=payment;state.activity.unshift({type:"dividend",ticker:stock.ticker,amount:payment,day});}}
    state.lastDividendDay=day;
  }
  const difficulty=DIFFICULTY_RULES[state.settings.difficulty];
  state.savings*=1+difficulty.savingsApy/365;
  state.loan*=1+difficulty.loanApr/365;
  if(state.loan>0){const minimum=state.loan*.02;if(state.cash>=minimum){state.cash-=minimum;state.loan-=minimum;}else{state.loan*=1+difficulty.missedPaymentPenalty;}}
  state.market.day=day;state.lastBankDay=day;
  if(state.loan>calculateNetWorth(state,stocks)+state.loan&&state.loan>0){
    const largest=Object.entries(state.holdings).sort((a,b)=>b[1].quantity*(stocks.find(s=>s.ticker===b[0])?.price??0)-a[1].quantity*(stocks.find(s=>s.ticker===a[0])?.price??0))[0];
    if(largest){const [ticker,holding]=largest,stock=stocks.find(s=>s.ticker===ticker);if(stock){const proceeds=holding.quantity*stock.price*.9993;state.cash+=proceeds-Math.max(.01,proceeds*.0005);delete state.holdings[ticker];delete state.holdSince[ticker];state.achievements.push("Margin Called");}}
  }
  state.activity=state.activity.slice(0,100);
  return {state,market:stocks,events:[]};
}

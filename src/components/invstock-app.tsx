"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, Check, ChevronDown, Coins, ChevronRight, CircleHelp, Clock3, Compass, Crown, Flame, Home, Landmark, Layers, ListFilter, Menu, Minus, Newspaper, Play, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, Target, TrendingDown, TrendingUp, Trophy, User, Wallet, X, Zap } from "lucide-react";
import { advanceMarket, createMarket, type Stock } from "@/lib/market";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { initialPortfolio, type Portfolio } from "@/lib/simulator";
import { AccountGamePanels } from "@/components/account/AccountGamePanels";
import { AccountScreen, type AccountView } from "@/components/account/AccountScreen";
import { SettingsScreen, speedLabel, type SettingKey, type SettingValue } from "@/components/settings/SettingsScreen";
import { startAmbientMusic, stopAmbientMusic } from "@/lib/ambient-music";
import { applyLiveQuotes, type LiveQuoteMap } from "@/lib/live-quotes";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { StockListRow } from "@/components/discovery/StockListRow";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { advanceGameDay, advanceBusinessEconomy, applyOfflineBusinessEarnings, bankAction, buildingAction, calculateNetWorth, createGameState, cryptoTradeAction, fireBusinessEmployeeAction, hireBusinessEmployeeAction, promoteBusinessEmployeeAction, hydrateGameState, migrateLegacySave, purchaseBusinessAction, purchasePropertyAction, relocateBusinessAction, sellBusinessAction, sellRealEstateAction, setBusinessStrategyAction, upgradeBusinessAction, upgradeRealEstateAction, reviewFinancialScrutinyAction, hireComplianceOfficerAction, resolveFinancialInvestigationAction, purchaseLegacyUpgradeAction, rebirthGameAction, restoreMarketSnapshot, sessionTick, MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES, DIFFICULTY_RULES, type GameState } from "@/lib/game-engine";
import { applyMarketEvent, claimMission, claimWeeklyChallenge, createMarketEvent, evaluateAchievements, joinWeeklyChallenge, resolvePendingRumours, updateProgression } from "@/lib/game-runtime";
import { generateOptionChain } from "@/lib/options-engine";
import TradeFlow from "@/components/trade/TradeFlow";
import { applyStockTrade, clockStepMinutes, enqueueOrder, isMarketOpen, MINUTES_PER_DAY, processQueuedOrders, processSips, updateWatchlist } from "@/lib/trading-automation";
import { createWorldNewsEvent, applyWorldNewsToMarket } from "@/lib/world-economy";
import { formatMoney, formatCompactMoney, type CurrencyCode, type Difficulty } from "@/lib/currency";
import { advanceCryptoMarket } from "@/lib/crypto";
import type { BusinessStrategy, EmployeeRole } from "@/lib/business-engine";

type Tab = "Home" | "Discovery" | "Options" | "News" | "Account";
type Modal = "trade" | "news" | null;
const TICK_MS = 1500;
const money = (n:number,currency:CurrencyCode="USD") => formatMoney(n,currency);
const signed = (n:number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
function portfolioFromGame(state:GameState):Portfolio {
 return {cash:state.cash,holdings:Object.fromEntries(Object.entries(state.holdings)),realizedPnl:state.realizedPnl,trades:state.trades};
}
function playUiFeedback(state:GameState,frequency=620) {
 if(typeof window==="undefined")return;
 if(state.settings.haptics&&typeof navigator!=="undefined")navigator.vibrate?.(12);
 if(!state.settings.sound||!("AudioContext" in window))return;
 try{const context=new window.AudioContext();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.045,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.13);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.13);oscillator.onended=()=>void context.close();}catch{}
}
function gameFromPortfolio(portfolio:Portfolio,stocks:Stock[]):GameState {
 const state=createGameState();
 state.cash=portfolio.cash;state.holdings=Object.fromEntries(Object.entries(portfolio.holdings));state.realizedPnl=portfolio.realizedPnl;state.trades=portfolio.trades;
 state.market.stocks=Object.fromEntries(stocks.map(stock=>[stock.ticker,stock]));
 const currentValue=portfolio.cash+Object.entries(portfolio.holdings).reduce((sum,[ticker,holding])=>sum+(stocks.find(stock=>stock.ticker===ticker)?.price??0)*holding.quantity,0);
 // Start with one honest portfolio snapshot; never reconstruct account history from stock-only candles.
 state.history=[{v:currentValue,t:0}];
 state.dailyHistory=[{v:currentValue,t:0}];
 const benchmark=stocks.find(stock=>stock.ticker==="SPY");
 state.benchmarkHistory=benchmark?[{v:benchmark.price,t:0}]:[];
 state.best=currentValue;state.start=currentValue;
 return state;
}
const fmtCompact = (n:number) => n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : money(n);
const newsItems: {source:string;time:string;ticker:string;tone:string;title:string;body:string;tickers?:string[]}[] = [
  {source:"Trading Post",time:"7h 6m ago",ticker:"NVDA",tone:"up",title:"Nvidia expands its next-generation AI platform as demand accelerates",body:"The simulated company update points to stronger demand across data-centre customers. Chipmakers are leading today's sector rotation."},
  {source:"Finance Daily",time:"Jan 6",ticker:"XOM",tone:"up",title:"Energy names rally as integrated producers raise shareholder returns",body:"A broad energy-sector move is lifting producers and service companies in the simulator's latest market session."},
  {source:"Market Wire",time:"2h ago",ticker:"MRNA",tone:"down",title:"Moderna slips as investors reassess the near-term pipeline outlook",body:"The simulated outlook update weighs on healthcare sentiment. Volatility is elevated compared with the wider market."},
  {source:"The Closing Bell",time:"Yesterday",ticker:"MSFT",tone:"up",title:"Cloud spending outlook supports large-cap technology shares",body:"Enterprise software and cloud infrastructure remain key themes for this week's simulated market."}
];

function BrandMark(){return <div className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24V17h4v7M14 24V10h4v14M23 24V5h4v19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><path d="m4 13 8-5 7 2 8-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
export function BottomNav({active,onChange,badges={}}:{active:Tab;onChange:(tab:Tab)=>void;badges?:Partial<Record<Tab,boolean>>}) {
 const items:[Tab,string,typeof Home][]=[["Home","Home",Home],["Discovery","Discover",Compass],["Options","Options",Layers],["News","News",Newspaper],["Account","Account",User]];
 return <nav className="bottom-nav" aria-label="Main navigation">{items.map(([name,label,Icon])=><button key={name} aria-label={label} className={active===name?"nav-item active":"nav-item"} onClick={()=>onChange(name)} aria-current={active===name?"page":undefined}><span className="nav-icon relative"><Icon size={20} strokeWidth={2}/>{badges[name]&&<i aria-hidden className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-[#FF5722]"/>}</span><span>{label}</span></button>)}</nav>;
}
function Sparkline({stock}:{stock:Stock}) {const data=stock.history.map((v,i)=>({i,v}));const rising=data.length<2||data[data.length-1].v>=data[0].v;return <div className={`sparkline ${rising?"chart-positive":"chart-negative"}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><Line type="monotone" dataKey="v" stroke={rising?"#00D09C":"#FF5722"} strokeWidth={1.5} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>}
function StockLogo({stock,size=40}:{stock:Stock;size?:number}) {return <CompanyLogo ticker={stock.ticker} name={stock.name} size={size}/>;}
function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) {return <div className="section-title"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>}
function Chart({data,currency="USD"}:{data:{label:string;value:number}[];currency?:CurrencyCode}) {const [reducedMotion,setReducedMotion]=useState(false);useEffect(()=>{const media=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReducedMotion(media.matches);update();media.addEventListener?.("change",update);return()=>media.removeEventListener?.("change",update);},[]);const rising=data.length<2||data[data.length-1].value>=data[0].value;const color=rising?"#0ECB81":"#F6465D";const gradient=rising?"#0ECB81":"#F6465D";return <div className={"main-chart "+(rising?"chart-positive":"chart-negative")} role="img" aria-label="Portfolio value chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:3,left:0,bottom:0}}><defs><linearGradient id={rising?"heroFillPositive":"heroFillNegative"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={gradient} stopOpacity={.3}/><stop offset="95%" stopColor={gradient} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.6} fill={rising?"url(#heroFillPositive)":"url(#heroFillNegative)"} isAnimationActive={!reducedMotion} animationDuration={650} animationEasing="ease-in-out" animationBegin={0}/><XAxis dataKey="label" hide/><YAxis hide domain={["dataMin - 1","dataMax + 1"]}/><Tooltip formatter={(value)=>money(Number(value),currency)} contentStyle={{background:"#111519",border:"1px solid "+color+"66",borderRadius:12,color:"#fff",boxShadow:"0 0 16px "+color+"33"}} labelStyle={{color:"#848E9C"}}/></AreaChart></ResponsiveContainer></div>}
export default function InvStockApp(){
 const [tab,setTab]=useState<Tab>("Home");
 const [stocks,setStocks]=useState<Stock[]>(()=>createMarket());
 const [portfolio,setPortfolio]=useState<Portfolio>(initialPortfolio);
 const [game,setGame]=useState<GameState>(()=>gameFromPortfolio(initialPortfolio,createMarket()));
 const saved=game.watchlist;
 const stocksRef=useRef(stocks);
 const gameRef=useRef(game);
 const [selected,setSelected]=useState<Stock|null>(null);
 const [modal,setModal]=useState<Modal>(null);
 const [newsIndex,setNewsIndex]=useState(0);
 const [search,setSearch]=useState("");
 const [sector,setSector]=useState("All");
 const [discoveryAsset,setDiscoveryAsset]=useState<"Stocks"|"Crypto">("Stocks");
 const [timeframe,setTimeframe]=useState("ALL");
 const [newsFilter,setNewsFilter]=useState("All");
 const [optionExpiry,setOptionExpiry]=useState("4d · weekly");
 const [optionSide,setOptionSide]=useState<"Calls"|"Puts">("Calls");
 const [optionAction,setOptionAction]=useState<"Buy"|"Sell">("Buy");
 const [optionTab,setOptionTab]=useState("Prices");
 const [tradeSide,setTradeSide]=useState<"buy"|"sell">("buy");
 const [unit,setUnit]=useState<"Shares"|"Dollars">("Dollars");
 const [amount,setAmount]=useState("");
 const [toast,setToast]=useState("");
 const [ready,setReady]=useState(false);
 const [accountInitialPanel,setAccountInitialPanel]=useState<"Bank"|"Settings">("Bank");
 const [accountEntry,setAccountEntry]=useState<{view:AccountView;nonce:number}>({view:"root",nonce:0});
 const [settingsOpen,setSettingsOpen]=useState(false);
 const liveQuotesRef=useRef<LiveQuoteMap|null>(null);
 const [liveStatus,setLiveStatus]=useState<string|undefined>(undefined);
 useEffect(()=>{
  if(!ready)return;
  if(!game.settings.liveData){liveQuotesRef.current=null;setLiveStatus("Off");return;}
  let cancelled=false;
  const poll=async()=>{
   if(document.hidden)return;
   try{
    const response=await fetch("/api/quotes?symbols="+stocksRef.current.map(stock=>stock.ticker).join(","),{cache:"no-store"});
    if(!response.ok)throw new Error("quote request failed");
    const payload=await response.json() as {quotes?:LiveQuoteMap};
    if(cancelled)return;
    const quotes=payload.quotes??{};
    const count=Object.keys(quotes).length;
    if(!count){setLiveStatus("Unavailable");return;}
    liveQuotesRef.current=quotes;
    const nextStocks=applyLiveQuotes(stocksRef.current,quotes);
    if(nextStocks!==stocksRef.current){stocksRef.current=nextStocks;setStocks(nextStocks);}
    setLiveStatus(count+" live");
   }catch{if(!cancelled)setLiveStatus("Unavailable");}
  };
  void poll();
  const id=window.setInterval(()=>void poll(),15000);
  return()=>{cancelled=true;window.clearInterval(id);};
 },[ready,game.settings.liveData]);
 const startingValue=useMemo(()=>calculateNetWorth(gameFromPortfolio(initialPortfolio,stocks),stocks),[stocks]);
 useEffect(()=>{if(!ready||!game.settings.music)return;startAmbientMusic();return()=>stopAmbientMusic();},[ready,game.settings.music]);
 const openSettings=()=>{setSettingsOpen(true);setSelected(null);setTab("Account");};
 const openAccount=(view:AccountView,panel:"Bank"|"Settings"="Bank")=>{setSettingsOpen(false);setAccountInitialPanel(panel);setAccountEntry(entry=>({view,nonce:entry.nonce+1}));setSelected(null);setTab("Account");};
 const money=(value:number)=>formatMoney(value,game.settings.currency);
 const fmtCompact=(value:number)=>formatCompactMoney(value,game.settings.currency);

 useEffect(()=>{try{
  const legacy=localStorage.getItem("ticker_game_v1");
  const legacyMigrated=localStorage.getItem("invstock-legacy-migrated")==="true";
  const savedGame=localStorage.getItem("invstock-game-v2");
  const current=localStorage.getItem("invstock-v2");
  let restored:GameState|null=null;
  if(legacy&&!legacyMigrated){restored=migrateLegacySave(JSON.parse(legacy),stocksRef.current);localStorage.setItem("invstock-legacy-migrated","true");}
  else if(savedGame){const parsed=JSON.parse(savedGame);restored=hydrateGameState(parsed,stocksRef.current);}
  else if(current){const data=JSON.parse(current);if(data.portfolio)setPortfolio(data.portfolio);if(data.portfolio){restored=gameFromPortfolio(data.portfolio,stocksRef.current);if(Array.isArray(data.saved))restored.watchlist=data.saved.filter((ticker:unknown):ticker is string=>typeof ticker==="string");}}
  if(restored){const offline=applyOfflineBusinessEarnings(restored,restored.lastActiveAt>0?Date.now()-restored.lastActiveAt:0);if(offline.earned>0)setToast("Your empire earned "+formatMoney(offline.earned,restored.settings.currency)+" while you were away.");const restoredStocks=restoreMarketSnapshot(restored,stocksRef.current);stocksRef.current=restoredStocks;setStocks(restoredStocks);restored.market.stocks=Object.fromEntries(restoredStocks.map(stock=>[stock.ticker,stock]));gameRef.current=restored;setGame(restored);setPortfolio(portfolioFromGame(restored));}
 }catch{setToast("A saved game could not be fully restored. Your current session remains available.");}
 setReady(true);},[]);
 useEffect(()=>{if(!ready)return;try{
  const persisted={...game,market:{...game.market,stocks:Object.fromEntries(stocks.map(stock=>[stock.ticker,stock]))}};
  persisted.lastActiveAt=Date.now();
  localStorage.setItem("invstock-game-v2",JSON.stringify(persisted));
  localStorage.setItem("invstock-v2",JSON.stringify({portfolio,saved:game.watchlist}));
 }catch{}},[portfolio,ready,game,stocks]);
 useEffect(()=>{let lastTickAt=Date.now();let carry=0;const id=window.setInterval(()=>{
  const now=Date.now();const elapsed=Math.min(15000,Math.max(0,now-lastTickAt));lastTickAt=now;
  if(document.hidden)return;
  let nextGame=structuredClone(gameRef.current);
  const speed=nextGame.settings.speed;
  if(speed<=0)return;
  // Speed is market minutes per real minute (Live = 1, Fast = 60, Turbo = 390).
  carry+=speed*elapsed/60000;
  const steps=Math.floor(carry);carry-=steps;
  let nextStocks=stocksRef.current;
  for(let step=0;step<steps;step++){
    const marketSeed=nextGame.prngSeed>>>0;
    const sessionOpen=isMarketOpen(nextGame);
    // Stock prices, business income and portfolio history only move during the trading session.
    if(sessionOpen)nextStocks=advanceMarket(nextStocks,marketSeed,nextGame.market.regime as "Bull"|"Bear"|"Sideways"|"Panic",DIFFICULTY_RULES[nextGame.settings.difficulty].marketVolatility);
    // Crypto trades 24/7.
    nextGame.cryptoMarket=advanceCryptoMarket(nextGame.cryptoMarket,(marketSeed^0x9e3779b9)>>>0,DIFFICULTY_RULES[nextGame.settings.difficulty].marketVolatility);
    nextGame.prngSeed=(marketSeed*1664525+1013904223)>>>0;
    if(nextGame.prngSeed%7000===0){const regimes=["Bull","Bear","Sideways","Panic"];nextGame.market.regime=regimes[Math.floor(nextGame.prngSeed/4294967296*regimes.length)];}
    if(sessionOpen){
      const regime=nextGame.market.regime;
      const incomeFactor=(regime==="Bear"?.78:regime==="Panic"?.55:regime==="Bull"?1.15:1)*DIFFICULTY_RULES[nextGame.settings.difficulty].businessIncome;
      nextGame.cash+=nextGame.buildings.reduce((sum,building)=>sum+building.income*incomeFactor,0);
      advanceBusinessEconomy(nextGame,1);
    }
    nextGame.market.minute+=clockStepMinutes(nextGame.market.minute);
    if(nextGame.market.minute>=MINUTES_PER_DAY){
      const previousDay=nextGame.market.day;
      nextGame.market.minute=0;
      nextGame=advanceGameDay(nextGame,nextStocks).state;
      const worth=calculateNetWorth(nextGame,nextStocks);
      nextGame.dailyHistory=[...nextGame.dailyHistory.slice(-3649),{v:worth,t:previousDay+1}];
      const benchmark=nextStocks.find(stock=>stock.ticker==="SPY");
      if(benchmark)nextGame.benchmarkHistory=[...nextGame.benchmarkHistory.slice(-3649),{v:benchmark.price,t:previousDay+1}];
    }
    // Fills pending orders on the step that lands exactly on the opening bell.
    const queued=processQueuedOrders(nextGame,nextStocks);
    nextGame=queued.state;
    if(queued.filled.length)setToast(`${queued.filled.length} queued order${queued.filled.length>1?"s":""} filled at market open`);
    else if(queued.rejected.length)setToast(`${queued.rejected.length} queued order${queued.rejected.length>1?"s":""} could not be filled`);
    if(sessionOpen){
      const worth=calculateNetWorth(nextGame,nextStocks);
      const last=nextGame.history.at(-1)?.t??0;
      nextGame.history=[...nextGame.history.slice(-1949),{v:worth,t:last+1}];
      nextGame.best=Math.max(nextGame.best,worth);
    }
  }
  const sipRun=processSips(nextGame,nextStocks);
  nextGame=sipRun.state;
  if(sipRun.paused.length)setToast(`${sipRun.paused[0].ticker} SIP paused: ${sipRun.paused[0].failureReason??"unable to execute"}`);
  if(!nextGame.eventsNextAt)nextGame.eventsNextAt=Date.now()+20000;
  if(isMarketOpen(nextGame)&&Date.now()>=nextGame.eventsNextAt){
    const seed=nextGame.prngSeed;
    const event=createMarketEvent(nextGame,nextStocks,seed);
    nextStocks=applyMarketEvent(nextGame,nextStocks,event);
    if(nextGame.settings.notifications&&event.headline)setToast(event.headline);
    nextGame.prngSeed=(seed*1664525+1013904223)>>>0;
    nextGame.eventsNextAt=Date.now()+20000+(nextGame.prngSeed%40001);
  }
  const absoluteTick=sessionTick(nextGame.market.day,nextGame.market.minute);
  resolvePendingRumours(nextGame,nextStocks,absoluteTick);
  evaluateAchievements(nextGame,nextStocks);updateProgression(nextGame,nextStocks,nextGame.prngSeed);
  // Real-time exchange quotes override simulated prices for listed tickers.
  if(nextGame.settings.liveData)nextStocks=applyLiveQuotes(nextStocks,liveQuotesRef.current);
  nextGame.market.stocks=Object.fromEntries(nextStocks.map(stock=>[stock.ticker,stock]));
  stocksRef.current=nextStocks;gameRef.current=nextGame;
  setStocks(nextStocks);setGame(nextGame);setPortfolio(portfolioFromGame(nextGame));

 },TICK_MS);return()=>window.clearInterval(id);},[]);
 useEffect(()=>{if(!selected)return;const latest=stocks.find(stock=>stock.ticker===selected.ticker);if(latest&&latest!==selected)setSelected(latest);},[stocks,selected]);
 useEffect(()=>{if(!toast)return;const id=window.setTimeout(()=>setToast(""),2600);return()=>window.clearTimeout(id);},[toast]);

 const totalValue=useMemo(()=>calculateNetWorth(game,stocks),[game,stocks]);
 const previousClose=game.dailyHistory.at(-1)?.v??game.start;
 const dailyChange=totalValue-previousClose;
 const dailyChangePct=dailyChange/Math.max(1,previousClose)*100;
 const chartData=useMemo(()=>{const intraday=timeframe==="1D"?game.history.slice(-390):timeframe==="1W"?game.history.slice(-1950):null;const daily=timeframe==="1M"?game.dailyHistory.slice(-30):timeframe==="3M"?game.dailyHistory.slice(-90):timeframe==="1Y"?game.dailyHistory.slice(-252):timeframe==="ALL"?game.dailyHistory:[];const points=intraday??daily;const source=points.length?points:[{v:totalValue,t:game.market.day}];return source.map(point=>({label:"Day "+point.t,value:point.v}));},[game.history,game.dailyHistory,game.market.day,timeframe,totalValue]);
 const stockByTicker=(ticker:string)=>stocks.find(s=>s.ticker===ticker)!;
 const optionExpiryDays=Number(optionExpiry.match(/(\d+)d/)?.[1]??4);
 const optionRows=useMemo(()=>generateOptionChain(stockByTicker("NVDA"),optionExpiryDays,optionSide==="Calls"?"call":"put"),[stocks,optionExpiryDays,optionSide]);
 
 const activeNews=game.news.length?game.news.map(event=>({source:event.source?(event.source+" · "+event.status+" · "+Math.round((event.reliability??1)*100)+"% reliable"):(event.type==="aftermath"?"Rumour desk":"Market simulator"),time:"Day "+event.day+" · "+String(event.minute??0).padStart(3,"0"),ticker:event.tickers[0]??"SPY",tone:event.sentiment>=0?"up":"down",title:event.headline,body:event.body,tickers:event.tickers,status:event.status,category:event.category,severity:event.severity,reliability:event.reliability})):newsItems;
 const filteredNews=activeNews.filter(item=>newsFilter==="My stocks"?(saved.includes(item.ticker)||Boolean(portfolio.holdings[item.ticker])):newsFilter==="Market"?(item.tickers?.length??1)>1:true);
const positions=Object.entries(game.holdings).map(([ticker,holding])=>({stock:stocks.find(item=>item.ticker===ticker),holding})).filter((item):item is {stock:Stock;holding:GameState["holdings"][string]}=>Boolean(item.stock));
 const stockValue=positions.reduce((sum,item)=>sum+item.stock.price*item.holding.quantity,0);
 const unrealizedPnl=positions.reduce((sum,item)=>sum+(item.stock.price-item.holding.averageCost)*item.holding.quantity,0);
 const dividendTotal=game.activity.filter(item=>item.type==="dividend").reduce((sum,item)=>sum+(item.amount??0),0);
 const openStock=(stock:Stock)=>{setSelected(stock);setAmount("");};
 const closeDetail=()=>setSelected(null);
 const startTrade=(side:"buy"|"sell")=>{setTradeSide(side);setUnit("Dollars");setAmount("");setModal("trade");};
 const commitStockTrade=(stock:Stock,side:"buy"|"sell",quantity:number):boolean=>{
  const fill=applyStockTrade(gameRef.current,stock,side,quantity);
  if(!fill.ok){setToast(fill.reason);return false;}
  const nextGame=structuredClone(fill.state);
  evaluateAchievements(nextGame,stocksRef.current);updateProgression(nextGame,stocksRef.current,nextGame.prngSeed);gameRef.current=nextGame;setGame(nextGame);
  playUiFeedback(nextGame,side==="buy"?760:390);setPortfolio(portfolioFromGame(nextGame));setToast(`${side==="buy"?"Bought":"Sold"} ${fill.quantity.toFixed(4)} shares of ${stock.ticker}`);
  return true;
 };
 const queueStockOrder=(stock:Stock,side:"buy"|"sell",shares:number,targetPrice:number):boolean=>{
  const next=enqueueOrder(gameRef.current,{ticker:stock.ticker,action:side,shares,targetPrice});
  if(next===gameRef.current){setToast("Enter a valid order to queue.");return false;}
  gameRef.current=next;setGame(next);setToast(`${side==="buy"?"Buy":"Sell"} order for ${stock.ticker} queued for market open`);
  return true;
 };
 const joinChallenge=()=>{const next=structuredClone(gameRef.current);const result=joinWeeklyChallenge(next,stocksRef.current);if(!result.ok){setToast(result.reason??"Unable to join challenge.");return;}gameRef.current=next;setGame(next);setToast("You joined this week's trading challenge.");};
 const claimMissionReward=(id:string)=>{const next=structuredClone(gameRef.current);updateProgression(next,stocksRef.current,next.prngSeed);const result=claimMission(next,id);if(!result.ok){setToast(result.reason??"Mission not ready.");return;}gameRef.current=next;setGame(next);setPortfolio(portfolioFromGame(next));playUiFeedback(next,980);setToast("Mission reward added to your cash balance.");};
 const claimChallengeReward=()=>{const next=structuredClone(gameRef.current);const result=claimWeeklyChallenge(next,stocksRef.current);if(!result.ok){setToast(result.reason??"Challenge reward unavailable.");return;}gameRef.current=next;setGame(next);setPortfolio(portfolioFromGame(next));playUiFeedback(next,1040);setToast(`Weekly challenge reward: ${money(result.reward??0)}`);};
 const performBankAction=(action:"deposit"|"withdraw"|"borrow"|"repay",value:number)=>{const next=structuredClone(gameRef.current);const result=bankAction(next,stocksRef.current,action,value);if(!result.ok){setToast(result.reason);return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,540);setToast(result.message??"Bank transaction complete.");};
 const performBuildingAction=(action:"buy"|"upgrade"|"sell",idOrName:string)=>{const next=structuredClone(gameRef.current);const result=buildingAction(next,stocksRef.current,action,idOrName);if(!result.ok){setToast(result.reason);return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,880);setToast(result.message??"Property updated.");};
 const commitBusinessAction=(action:(state:GameState)=>{ok:boolean;state:GameState;message?:string;reason?:string})=>{const next=structuredClone(gameRef.current);const result=action(next);if(!result.ok){setToast(result.reason??"Business action could not be completed.");return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,760);setToast(result.message??"Business updated.");};
 const performBusinessBuy=(definitionId:string,city:string)=>commitBusinessAction(next=>purchaseBusinessAction(next,definitionId,city));
 const performBusinessHire=(businessId:string,role:EmployeeRole,name:string)=>commitBusinessAction(next=>hireBusinessEmployeeAction(next,businessId,role,name));
 const performBusinessFire=(businessId:string,employeeId:string)=>commitBusinessAction(next=>fireBusinessEmployeeAction(next,businessId,employeeId));
 const performBusinessPromote=(businessId:string,employeeId:string)=>commitBusinessAction(next=>promoteBusinessEmployeeAction(next,businessId,employeeId));
 const performBusinessUpgrade=(businessId:string)=>commitBusinessAction(next=>upgradeBusinessAction(next,businessId));
 const performBusinessStrategy=(businessId:string,strategy:BusinessStrategy)=>commitBusinessAction(next=>setBusinessStrategyAction(next,businessId,strategy));
 const performBusinessRelocate=(businessId:string,city:string)=>commitBusinessAction(next=>relocateBusinessAction(next,businessId,city));
 const performBusinessSell=(businessId:string)=>commitBusinessAction(next=>sellBusinessAction(next,businessId));
 const performPropertyBuy=(listingId:string,city:string)=>commitBusinessAction(next=>purchasePropertyAction(next,listingId,city));
 const performPropertyUpgrade=(propertyId:string)=>commitBusinessAction(next=>upgradeRealEstateAction(next,propertyId));
 const performPropertySell=(propertyId:string)=>commitBusinessAction(next=>sellRealEstateAction(next,propertyId));
 const performComplianceReview=()=>{const state=gameRef.current;const recent=state.activity.slice(0,12);const netWorth=Math.max(1,calculateNetWorth(state,stocksRef.current));const signals={largeMovementCount:recent.filter(item=>Math.abs(item.amount??0)>Math.max(50000,netWorth*.2)).length,rapidTradeCount:recent.filter(item=>["buy","sell","crypto-buy","crypto-sell"].includes(item.type)).length,highRiskBusinessCount:state.businesses.filter(item=>item.industry==="banking").length,unexplainedWealthRatio:0,unpaidTax:0,recordsQuality:1};commitBusinessAction(next=>reviewFinancialScrutinyAction(next,signals));};
 const performComplianceHire=()=>commitBusinessAction(next=>hireComplianceOfficerAction(next));
 const performInvestigationResolve=(action:"submit-records"|"pay-fine"|"challenge")=>commitBusinessAction(next=>resolveFinancialInvestigationAction(next,action,action==="challenge"&&gameRef.current.scrutiny.complianceOfficer));
 const performLegacyUpgrade=(upgrade:"startingCapital"|"businessCostReduction"|"researchEfficiency")=>commitBusinessAction(next=>purchaseLegacyUpgradeAction(next,upgrade));
 const performRebirth=()=>{const result=rebirthGameAction(structuredClone(gameRef.current),stocksRef.current);if(!result.ok){setToast(result.reason);return;}const freshStocks=createMarket();result.state.market.stocks=Object.fromEntries(freshStocks.map(stock=>[stock.ticker,stock]));stocksRef.current=freshStocks;gameRef.current=result.state;setStocks(freshStocks);setGame(result.state);setPortfolio(portfolioFromGame(result.state));setToast(result.message??"Empire reborn.");};

 const performCryptoTrade=(symbol:string,side:"buy"|"sell",quantity:number)=>{const next=structuredClone(gameRef.current);const result=cryptoTradeAction(next,symbol,side,quantity);if(!result.ok){setToast(result.reason);return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,side==="buy"?720:460);setToast(result.message??"Crypto order complete.");};
 const changeSpeed=(speed:number)=>{const next={...gameRef.current,settings:{...gameRef.current.settings,speed}};gameRef.current=next;setGame(next);setToast(speed===0?"Simulation paused":`Market speed set to ${speedLabel(speed)}`);};
 const cycleSpeed=()=>{const values=[0,1,2,5,60,390];const current=gameRef.current.settings.speed;changeSpeed(values[(values.indexOf(current)+1)%values.length]);};
 const changeSetting=(key:SettingKey,value:SettingValue)=>{const next={...gameRef.current,settings:{...gameRef.current.settings,[key]:value}};gameRef.current=next;setGame(next);};
 const exportSave=()=>{const payload=JSON.stringify({...gameRef.current,market:{...gameRef.current.market,stocks:Object.fromEntries(stocksRef.current.map(stock=>[stock.ticker,stock]))}},null,2);const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="invstock-save.json";anchor.click();URL.revokeObjectURL(url);};
 const importSave=(json:string)=>{try{const parsed=JSON.parse(json);const imported=hydrateGameState(parsed,stocksRef.current);const restoredStocks=restoreMarketSnapshot(imported,stocksRef.current);stocksRef.current=restoredStocks;setStocks(restoredStocks);imported.market.stocks=Object.fromEntries(restoredStocks.map(stock=>[stock.ticker,stock]));localStorage.setItem("invstock-legacy-migrated","true");gameRef.current=imported;setGame(imported);setPortfolio(portfolioFromGame(imported));setToast("Save imported successfully.");}catch{setToast("Could not import this save. Check the JSON and try again.");}};
 const resetGame=()=>{const next=gameFromPortfolio(initialPortfolio,stocksRef.current);next.profileName=gameRef.current.profileName;gameRef.current=next;setGame(next);setPortfolio(initialPortfolio);try{localStorage.removeItem("ticker_game_v1");localStorage.removeItem("invstock-game-v2");localStorage.removeItem("invstock-v2");localStorage.removeItem("invstock-legacy-migrated");}catch{}setToast("Simulator progress reset.");};
 const toggleSaved=(ticker:string)=>{const nextGame=updateWatchlist(gameRef.current,{type:"toggle",ticker});gameRef.current=nextGame;setGame(nextGame);};
 const gotoStock=(ticker:string)=>{const stock=stockByTicker(ticker);if(stock)openStock(stock);};
 const pageTitle=selected?selected.ticker:tab;

 return <main className="app-shell">
  {((tab!=="Home"&&tab!=="Account")||selected)&&<header className="topbar"><button className="brand-lockup" aria-label="Go to STONKS home" onClick={()=>{setSelected(null);setTab("Home");}}><BrandMark/><span>STONKS</span></button><div className="topbar-actions"><button className="icon-button" aria-label="Search stocks" onClick={()=>{setSelected(null);setTab("Discovery");setSearch("");}}><Search size={19}/></button><button className="speed-chip" aria-label="Change simulation speed" onClick={cycleSpeed}><Zap size={14}/>{game.settings.speed===0?"Paused":game.settings.speed+"×"}</button><button className="icon-button" aria-label="Notifications" onClick={()=>{setNewsFilter("All");setNewsIndex(0);setModal("news");}}><Bell size={19}/></button><button className="icon-button" aria-label="Open account profile" onClick={()=>{setSelected(null);setTab("Account");}}><BriefcaseBusiness size={18}/></button></div></header>}
  {selected?<section className="stock-detail-page"><button className="back-link" onClick={closeDetail}><ArrowLeft size={17}/> Back to {tab}</button><div className="detail-heading"><div className="detail-identity"><StockLogo stock={selected} size={54}/><div><h1>{selected.ticker}</h1><p>{selected.name} · {selected.sector}</p></div></div><button className="icon-button" aria-label={saved.includes(selected.ticker)?"Remove stock from watchlist":"Save stock"} onClick={()=>toggleSaved(selected.ticker)}><Star size={19} fill={saved.includes(selected.ticker)?"currentColor":"none"}/></button></div><div className="detail-price">{money(selected.price)}</div><div className={selected.change>=0?"detail-change gain":"detail-change loss"}>{selected.change>=0?<ArrowUpRight size={17}/>:<ArrowDownLeft size={17}/>} {signed(selected.change)} today</div><Chart currency={game.settings.currency} data={selected.history.slice(-({"1D":78,"1W":390,"1M":30,"3M":90,"1Y":252,"ALL":390}[timeframe]??390)).map((value,i)=>({label:String(i),value}))}/><div className="timeframes">{["1D","1W","1M","3M","1Y","ALL"].map(t=><button key={t} className={timeframe===t?"selected":""} onClick={()=>setTimeframe(t)}>{t}</button>)}</div><div className="detail-stats">{[["Market cap",fmtCompact(selected.marketCap)],["P/E ratio",selected.pe?selected.pe.toFixed(1):"—"],["Dividend yield",`${(selected.dividend*100).toFixed(2)}%`],["Beta",selected.beta.toFixed(2)],["Volume",fmtCompact(selected.volume)],["52-week range",`${money(selected.price*.78)} – ${money(selected.price*1.16)}`]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><div className="detail-actions"><button className="buy-button" onClick={()=>startTrade("buy")}>Buy {selected.ticker}</button><button className="sell-button" onClick={()=>startTrade("sell")}>Sell {selected.ticker}</button></div></section>
  :<>{tab!=="Home"&&tab!=="Account"&&<div className="page-heading"><div>{tab!=="Discovery"&&<p className="eyebrow">PAPER TRADING · SIMULATED MARKET</p>}<h1>{tab==="Discovery"?"Discover":tab}</h1></div></div>}
  {tab==="Home"&&<HomeDashboard
    marketMinute={game.market.minute}
    totalValue={totalValue}
    dailyChange={dailyChange}
    dailyChangePct={dailyChangePct}
    previousClose={previousClose}
    chartData={chartData}
    currency={game.settings.currency}
    buyingPower={game.cash}
    timeframe={timeframe}
    positions={positions.map(({stock,holding})=>({stock,quantity:holding.quantity,marketValue:stock.price*holding.quantity,returnPct:(stock.price/Math.max(0.01,holding.averageCost)-1)*100}))}
    onTimeframeChange={setTimeframe}
    onStockSelect={openStock}
    onHistory={()=>setTab("Account")}
    onAddCash={()=>openAccount("empire","Bank")}
    onSettings={openSettings}
    belowPositions={<>
      <details className="home-extras"><summary><span>Challenges & missions</span><ChevronDown size={16}/></summary><div className="home-extras-content">
        <div className="challenge-card"><div className="challenge-icon"><Trophy size={22}/></div><div className="challenge-copy"><b>Weekly trading challenge</b><p>{game.weeklyChallenge.joined?"You are competing against four trading bots. Your return: "+signed((totalValue/Math.max(1,game.weeklyChallenge.startValue)-1)*100)+".":"Join the weekly market challenge and compete against four simulated trading bots."}</p></div><button onClick={game.weeklyChallenge.joined?()=>setToast("Your leaderboard is shown below."):joinChallenge}>{game.weeklyChallenge.joined?"Joined":"Join challenge"} <ArrowRight size={16}/></button></div>
        {game.weeklyChallenge.joined&&<div className="challenge-leaderboard"><div><b>You</b><strong className={totalValue>=game.weeklyChallenge.startValue?"gain":"loss"}>{signed((totalValue/Math.max(1,game.weeklyChallenge.startValue)-1)*100)}</strong></div>{game.weeklyChallenge.bots.map(bot=><div key={bot.name}><b>{bot.name}</b><strong className={bot.returnPct>=0?"gain":"loss"}>{signed(bot.returnPct)}</strong></div>)}{game.market.day>game.weeklyChallenge.week*7&&!game.weeklyChallenge.claimed&&<button onClick={claimChallengeReward}>Claim weekly reward</button>}</div>}
        <div className="home-missions">{game.missions.map(mission=><div className="mission-row" key={mission.id}><span><Target size={17}/><span><b>{mission.title}</b><small>{mission.description} · {mission.progress}/{mission.target}</small></span></span><button disabled={mission.claimed||mission.progress<mission.target} onClick={()=>claimMissionReward(mission.id)}>{mission.claimed?"Claimed":mission.progress>=mission.target?"Claim "+money(mission.reward):"In progress"}</button></div>)}</div>
      </div></details>
      <SectionTitle title="Watchlist" action="Discover" onAction={()=>setTab("Discovery")}/><div className="surface stock-list">{game.watchlist.map(ticker=>{const stock=stockByTicker(ticker);return stock?<div className="watchlist-item" key={ticker}><StockListRow stock={stock} currency={game.settings.currency} onClick={()=>openStock(stock)}/><button aria-label={"Remove "+ticker+" from watchlist"} onClick={()=>toggleSaved(ticker)}><X size={15}/></button></div>:null;})}</div>
    </>}
  />}
  {tab==="Discovery"&&<DiscoveryPage
    stocks={stocks}
    state={game}
    currency={game.settings.currency}
    search={search}
    onSearchChange={setSearch}
    sector={sector}
    onSectorChange={setSector}
    asset={discoveryAsset}
    onAssetChange={setDiscoveryAsset}
    onStockSelect={openStock}
    onCryptoTrade={performCryptoTrade}
  />}
  {tab==="Options"&&<section className="options-view"><div className="options-header"><div><p className="eyebrow">OPTIONS MARKET</p><h2>Options chain</h2></div><button className="icon-button"><ListFilter size={18}/></button></div><div className="option-underlying" onClick={()=>gotoStock("NVDA")}><StockLogo stock={stockByTicker("NVDA")}/><span><b>NVDA</b><small>Nvidia</small></span><strong>{money(stockByTicker("NVDA").price)}<small className="gain">{signed(stockByTicker("NVDA").change)}</small></strong><ChevronDown size={17}/></div><div className="expiry-strip">{["4d · weekly","11d · 2 weeks","18d · 3 weeks","25d · monthly"].map(e=><button key={e} className={optionExpiry===e?"selected":""} onClick={()=>setOptionExpiry(e)}>{e}</button>)}</div><div className="options-controls"><div className="segmented">{(["Buy","Sell"] as const).map(v=><button key={v} className={optionAction===v?"selected":""} onClick={()=>setOptionAction(v)}>{v}</button>)}</div><div className="segmented">{(["Calls","Puts"] as const).map(v=><button key={v} className={optionSide===v?"selected":""} onClick={()=>setOptionSide(v)}>{v}</button>)}</div></div><div className="option-tabs">{["Prices","Activity","Greeks"].map(v=><button key={v} className={optionTab===v?"selected":""} onClick={()=>setOptionTab(v)}>{v}</button>)}</div><div className="option-table-wrap"><table className="option-table"><thead><tr>{optionTab==="Greeks"?<><th>Strike</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>IV</th></>:optionTab==="Activity"?<><th>Strike</th><th>Volume</th><th>Open int.</th><th>Last</th><th>% Chg</th><th>IV</th></>:<><th>Strike</th><th>Bid</th><th>Ask</th><th>Mark</th><th>Last</th><th>% Chg</th></>}</tr></thead><tbody>{optionRows.map((r,i)=><Fragment key={r.strike}>{i===7&&<tr className="share-divider"><td colSpan={6}><span>Share price {money(stockByTicker("NVDA").price)}</span></td></tr>}<tr><td>{money(r.strike)}</td>{optionTab==="Greeks"?<><td>{r.delta.toFixed(3)}</td><td>{r.gamma.toFixed(4)}</td><td>{r.theta.toFixed(3)}</td><td>{r.vega.toFixed(3)}</td><td>{r.impliedVolatility.toFixed(1)}%</td></>:optionTab==="Activity"?<><td>{r.volume.toLocaleString()}</td><td>{r.openInterest.toLocaleString()}</td><td>{money(r.last)}</td><td className={r.change>=0?"gain":"loss"}>{signed(r.change)}</td><td>{r.impliedVolatility.toFixed(1)}%</td></>:<><td className={optionAction==="Sell"?"gain":"quote-muted"}>{money(r.bid)}</td><td className={optionAction==="Buy"?"gain":"quote-muted"}>{money(r.ask)}</td><td className={r.change>=0?"gain":"loss"}>{money(r.mark)}</td><td>{money(r.last)}</td><td className={r.change>=0?"gain":"loss"}>{signed(r.change)}</td></>}</tr></Fragment>)}</tbody></table></div><p className="sim-note"><ShieldCheck size={15}/> {optionAction==="Buy"?"Buy-side estimate uses the ask.":"Sell-side estimate uses the bid."} Simulated options quotes for learning only; no real contracts are traded.</p></section>}
  {tab==="News"&&<section className="news-view"><div className="news-tabs">{["All","My stocks","Market"].map(v=><button key={v} className={newsFilter===v?"selected":""} onClick={()=>setNewsFilter(v)}>{v}</button>)}</div>{filteredNews.map((item,i)=><button className="news-card" key={item.title} onClick={()=>{setNewsIndex(i);setModal("news");}}><div className="news-source"><i className={item.tone==="up"?"up-dot":"down-dot"}/>{item.source}<span>· {item.time}</span></div><b>{item.title}</b><div className="news-bottom"><span>{item.ticker} · Simulated market news</span><CompanyLogo ticker={item.ticker} name={stockByTicker(item.ticker).name} size={32}/></div></button>)}</section>}
  {tab==="Account"&&settingsOpen&&<SettingsScreen
    settings={game.settings}
    startingValue={startingValue}
    liveStatus={liveStatus}
    onBack={()=>setSettingsOpen(false)}
    onSpeed={changeSpeed}
    onSetting={changeSetting}
    onAddCash={()=>openAccount("empire","Bank")}
    onUnavailable={(feature)=>setToast(feature+" is not available in the simulator yet.")}
    onExport={exportSave}
    onImport={importSave}
    onReset={resetGame}
  />}
  {tab==="Account"&&!settingsOpen&&<AccountScreen
    key={accountEntry.nonce}
    initialView={accountEntry.view}
    state={game}
    stocks={stocks}
    totalValue={totalValue}
    currency={game.settings.currency}
    onOpenStock={openStock}
    onClaimMission={claimMissionReward}
    onJoinChallenge={joinChallenge}
    onClaimChallenge={claimChallengeReward}
    onOpenSettings={openSettings}
    onAddCash={()=>openAccount("empire","Bank")}
    onUnavailable={(feature)=>setToast(feature+" is not available in the simulator yet.")}
    empirePanels={<AccountGamePanels key={accountInitialPanel} initialPanel={accountInitialPanel} state={game} stocks={stocks} onBank={performBankAction} onBuilding={performBuildingAction} onCryptoTrade={performCryptoTrade} onBusinessBuy={performBusinessBuy} onBusinessHire={performBusinessHire} onBusinessFire={performBusinessFire} onBusinessPromote={performBusinessPromote} onBusinessUpgrade={performBusinessUpgrade} onBusinessStrategy={performBusinessStrategy} onBusinessRelocate={performBusinessRelocate} onBusinessSell={performBusinessSell} onPropertyBuy={performPropertyBuy} onPropertyUpgrade={performPropertyUpgrade} onPropertySell={performPropertySell} onComplianceReview={performComplianceReview} onComplianceHire={performComplianceHire} onInvestigationResolve={performInvestigationResolve} onLegacyUpgrade={performLegacyUpgrade} onRebirth={performRebirth} onSpeed={changeSpeed} onSetting={changeSetting} onImport={importSave} onExport={exportSave} onReset={resetGame}/>}
  />}
  </>}
  {!selected&&!(tab==="Account"&&settingsOpen)&&<BottomNav badges={{Account:game.missions.some(mission=>!mission.claimed&&mission.progress>=mission.target)}} active={tab} onChange={(nextTab)=>{if(nextTab==="Account"){openAccount("root");return;}setTab(nextTab);}}/>}
  {modal==="trade"&&selected&&<div className="fixed inset-0 z-50 overflow-y-auto bg-black" role="dialog" aria-modal="true" aria-label={`${tradeSide==="buy"?"Buy":"Sell"} ${selected.ticker}`}><TradeFlow
    key={selected.ticker+tradeSide}
    ticker={selected.ticker}
    price={selected.price}
    bid={selected.price*.9997}
    ask={selected.price*1.0003}
    buyingPower={game.cash}
    isMarketOpen={isMarketOpen(game)}
    chartHistory={selected.history.slice(-78)}
    tradeSide={tradeSide}
    onBack={()=>setModal(null)}
    onExecuteTrade={({side,shares})=>commitStockTrade(selected,side,shares)}
    onQueueOrder={({side,shares,targetPrice})=>queueStockOrder(selected,side,shares,targetPrice)}
  /></div>}
  {modal==="news"&&<div className="modal-backdrop" onClick={()=>setModal(null)}><section className="news-modal" role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={e=>e.stopPropagation()}><div className="modal-head"><span className="news-kicker"><i/> MARKET UPDATE</span><button onClick={()=>setModal(null)} aria-label="Close news"><X size={20}/></button></div><div className="news-modal-source">{filteredNews[newsIndex%filteredNews.length]?.source??"Market simulator"} · {filteredNews[newsIndex%filteredNews.length]?.time??"Latest"}</div><h2 id="news-title">{filteredNews[newsIndex%filteredNews.length]?.title??"No market update selected"}</h2><p>{filteredNews[newsIndex%filteredNews.length]?.body??"Open the news feed to select a market update."}</p><div className="news-modal-ticker"><span>AFFECTED TICKER</span><b>{filteredNews[newsIndex%filteredNews.length]?.ticker??"—"}</b></div><button className="news-open-button" onClick={()=>{setModal(null);setTab("News");}}>Open news feed <ArrowRight size={16}/></button></section></div>}
  {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast("")}><X size={14}/></button></div>}
 </main>;
}

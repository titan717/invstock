"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bookmark, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Crown, Flame, Home, Landmark, ListFilter, Menu, Minus, Newspaper, Play, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Wallet, X, Zap } from "lucide-react";
import { advanceMarket, createMarket, sectors, type Stock } from "@/lib/market";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { executeTrade, INITIAL_DEPOSIT, initialPortfolio, portfolioValue, type Portfolio } from "@/lib/simulator";
import { AccountGamePanels } from "@/components/account/AccountGamePanels";
import { advanceGameDay, bankAction, buildingAction, calculateNetWorth, createGameState, hydrateGameState, migrateLegacySave, restoreMarketSnapshot, type GameState } from "@/lib/game-engine";
import { applyMarketEvent, claimMission, claimWeeklyChallenge, createMarketEvent, evaluateAchievements, joinWeeklyChallenge, resolvePendingRumours, updateProgression } from "@/lib/game-runtime";
import { generateOptionChain } from "@/lib/options-engine";

type Tab = "Home" | "Discovery" | "Options" | "News" | "Account";
type Modal = "trade" | "news" | null;
const money = (n:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
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
 const historyLength=Math.max(1,Math.min(390,...Object.keys(portfolio.holdings).map(ticker=>stocks.find(stock=>stock.ticker===ticker)?.history.length??390)));\n state.history=Array.from({length:historyLength},(_,index)=>({v:portfolio.cash+Object.entries(portfolio.holdings).reduce((sum,[ticker,holding])=>{const stock=stocks.find(item=>item.ticker===ticker);return sum+(stock?.history[index]??stock?.price??0)*holding.quantity;},0),t:index+1}));\n state.dailyHistory=state.history.filter((_,index)=>index%Math.max(1,Math.floor(historyLength/78))===0).slice(-3650);\n state.best=Math.max(state.best,...state.history.map(point=>point.v));state.start=INITIAL_DEPOSIT;
 return state;
}
const fmtCompact = (n:number) => n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : money(n);
const newsItems = [
  {source:"Trading Post",time:"7h 6m ago",ticker:"NVDA",tone:"up",title:"Nvidia expands its next-generation AI platform as demand accelerates",body:"The simulated company update points to stronger demand across data-centre customers. Chipmakers are leading today's sector rotation."},
  {source:"Finance Daily",time:"Jan 6",ticker:"XOM",tone:"up",title:"Energy names rally as integrated producers raise shareholder returns",body:"A broad energy-sector move is lifting producers and service companies in the simulator's latest market session."},
  {source:"Market Wire",time:"2h ago",ticker:"MRNA",tone:"down",title:"Moderna slips as investors reassess the near-term pipeline outlook",body:"The simulated outlook update weighs on healthcare sentiment. Volatility is elevated compared with the wider market."},
  {source:"The Closing Bell",time:"Yesterday",ticker:"MSFT",tone:"up",title:"Cloud spending outlook supports large-cap technology shares",body:"Enterprise software and cloud infrastructure remain key themes for this week's simulated market."}
];
const performance = Array.from({length:42},(_,i)=>({day:i,value:10000+i*11+Math.sin(i/3)*90,benchmark:10000+i*6+Math.cos(i/4)*45}));

function BrandMark(){return <div className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24V17h4v7M14 24V10h4v14M23 24V5h4v19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><path d="m4 13 8-5 7 2 8-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
function BottomNav({active,onChange}:{active:Tab;onChange:(tab:Tab)=>void}) {
 const items:[Tab,typeof Home][]=[["Home",Home],["Discovery",Search],["Options",Activity],["News",Newspaper],["Account",BriefcaseBusiness]];
 return <nav className="bottom-nav" aria-label="Main navigation">{items.map(([name,Icon])=><button key={name} className={active===name?"nav-item active":"nav-item"} onClick={()=>onChange(name)} aria-current={active===name?"page":undefined}><span className="nav-icon"><Icon size={20}/>{name==="Account"&&<i className="notification-dot"/>}</span><span>{name}</span></button>)}</nav>;
}
function Sparkline({stock}:{stock:Stock}) {const data=stock.history.map((v,i)=>({i,v}));const rising=data.length<2||data[data.length-1].v>=data[0].v;return <div className={`sparkline ${rising?"chart-positive":"chart-negative"}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><Line type="monotone" dataKey="v" stroke={rising?"#0ECB81":"#F6465D"} strokeWidth={1.8} dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>}
function StockLogo({stock,size=40}:{stock:Stock;size?:number}) {return <CompanyLogo ticker={stock.ticker} name={stock.name} size={size}/>;}
function StockRow({stock,onClick,mode="price"}:{stock:Stock;onClick:()=>void;mode?:"price"|"volume"}) {return <button className="stock-row" onClick={onClick}><StockLogo stock={stock}/><span className="stock-meta"><b>{stock.ticker}</b><small>{mode==="volume"?stock.name:stock.name}</small></span><Sparkline stock={stock}/><span className="stock-quote"><b className={stock.change>=0?"gain":"loss"}>{mode==="volume"?`Vol ${(stock.volume/1e6).toFixed(1)}M`:money(stock.price)}</b><small className={stock.change>=0?"pill gain-pill":"pill loss-pill"}>{signed(stock.change)}</small></span><ChevronRight size={16} className="row-chevron"/></button>}
function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) {return <div className="section-title"><h2>{title}</h2>{action&&<button onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>}
function Chart({data}:{data:{label:string;value:number}[]}) {const rising=data.length<2||data[data.length-1].value>=data[0].value;const color=rising?"#0ECB81":"#F6465D";const gradient=rising?"#0ECB81":"#F6465D";return <div className={`main-chart ${rising?"chart-positive":"chart-negative"}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:3,left:0,bottom:0}}><defs><linearGradient id={rising?"heroFillPositive":"heroFillNegative"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={gradient} stopOpacity={.3}/><stop offset="95%" stopColor={gradient} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.6} fill={`url(#${rising?"heroFillPositive":"heroFillNegative"})`} isAnimationActive={true} animationDuration={350}/><XAxis dataKey="label" hide/><YAxis hide domain={["dataMin - 1","dataMax + 1"]}/><Tooltip formatter={(value)=>money(Number(value))} contentStyle={{background:"#111519",border:`1px solid ${color}66`,borderRadius:12,color:"#fff",boxShadow:`0 0 16px ${color}33`}} labelStyle={{color:"#848E9C"}}/></AreaChart></ResponsiveContainer></div>}
export default function InvStockApp(){
 const [tab,setTab]=useState<Tab>("Home");
 const [stocks,setStocks]=useState<Stock[]>(()=>createMarket());
 const [portfolio,setPortfolio]=useState<Portfolio>(initialPortfolio);
 const [game,setGame]=useState<GameState>(()=>gameFromPortfolio(initialPortfolio,createMarket()));
 const stocksRef=useRef(stocks);
 const gameRef=useRef(game);
 const [portfolioHistory,setPortfolioHistory]=useState<{label:string;value:number}[]>(()=>game.history.map(point=>({label:"Day "+point.t,value:point.v})));
 const [selected,setSelected]=useState<Stock|null>(null);
 const [modal,setModal]=useState<Modal>(null);
 const [newsIndex,setNewsIndex]=useState(0);
 const [search,setSearch]=useState("");
 const [sector,setSector]=useState("All");
 const [timeframe,setTimeframe]=useState("ALL");
 const [newsFilter,setNewsFilter]=useState("All");
 const [optionExpiry,setOptionExpiry]=useState("Jan 9 · 4d");
 const [optionSide,setOptionSide]=useState<"Calls"|"Puts">("Calls");
 const [optionAction,setOptionAction]=useState<"Buy"|"Sell">("Buy");
 const [optionTab,setOptionTab]=useState("Prices");
 const [tradeSide,setTradeSide]=useState<"buy"|"sell">("buy");
 const [unit,setUnit]=useState<"Shares"|"Dollars">("Dollars");
 const [amount,setAmount]=useState("");
 const [toast,setToast]=useState("");
 const [saved,setSaved]=useState<string[]>(["NVDA","MSFT"]);
 const [ready,setReady]=useState(false);

 useEffect(()=>{try{
  const legacy=localStorage.getItem("ticker_game_v1");
  const legacyMigrated=localStorage.getItem("invstock-legacy-migrated")==="true";
  const savedGame=localStorage.getItem("invstock-game-v2");
  const current=localStorage.getItem("invstock-v2");
  let restored:GameState|null=null;
  if(legacy&&!legacyMigrated){restored=migrateLegacySave(JSON.parse(legacy),stocksRef.current);localStorage.setItem("invstock-legacy-migrated","true");}
  else if(savedGame){const parsed=JSON.parse(savedGame);restored=hydrateGameState(parsed,stocksRef.current);}
  else if(current){const data=JSON.parse(current);if(data.portfolio)setPortfolio(data.portfolio);if(Array.isArray(data.saved))setSaved(data.saved);if(data.portfolio)restored=gameFromPortfolio(data.portfolio,stocksRef.current);}
  if(restored){const restoredStocks=restoreMarketSnapshot(restored,stocksRef.current);stocksRef.current=restoredStocks;setStocks(restoredStocks);restored.market.stocks=Object.fromEntries(restoredStocks.map(stock=>[stock.ticker,stock]));gameRef.current=restored;setGame(restored);setPortfolio(portfolioFromGame(restored));setSaved(restored.watchlist);setPortfolioHistory(restored.history.map(point=>({label:"Day "+point.t,value:point.v})).slice(-720));}
 }catch{setToast("A saved game could not be fully restored. Your current session remains available.");}
 setReady(true);},[]);
 useEffect(()=>{if(!ready)return;try{
  const persisted={...game,market:{...game.market,stocks:Object.fromEntries(stocks.map(stock=>[stock.ticker,stock]))}};
  localStorage.setItem("invstock-game-v2",JSON.stringify(persisted));
  localStorage.setItem("invstock-v2",JSON.stringify({portfolio,saved}));
 }catch{}},[portfolio,saved,ready,game,stocks]);
 useEffect(()=>{const id=window.setInterval(()=>{
  if(document.hidden)return;
  let nextGame=structuredClone(gameRef.current);
  const speed=nextGame.settings.speed;
  if(speed<=0)return;
  const marketSeed=nextGame.prngSeed>>>0;
  let nextStocks=advanceMarket(stocksRef.current,marketSeed,nextGame.market.regime as "Bull"|"Bear"|"Sideways"|"Panic");
  nextGame.prngSeed=(marketSeed*1664525+1013904223)>>>0;
  if(nextGame.prngSeed%7000===0){const regimes=["Bull","Bear","Sideways","Panic"];nextGame.market.regime=regimes[Math.floor(nextGame.prngSeed/4294967296*regimes.length)];}
  for(let step=0;step<speed;step++){
    const regime=nextGame.market.regime;
    const incomeFactor=regime==="Bear"?.78:regime==="Panic"?.55:regime==="Bull"?1.15:1;
    nextGame.cash+=nextGame.buildings.reduce((sum,building)=>sum+building.income*incomeFactor,0);
    nextGame.market.minute+=1;
    if(nextGame.market.minute>=960){
      const previousDay=nextGame.market.day;
      nextGame.market.minute=570;
      nextGame=advanceGameDay(nextGame,nextStocks).state;
      const worth=calculateNetWorth(nextGame,nextStocks);
      nextGame.dailyHistory=[...nextGame.dailyHistory.slice(-3649),{v:worth,t:previousDay+1}];
    }
    const worth=calculateNetWorth(nextGame,nextStocks);
    const last=nextGame.history.at(-1)?.t??0;
    nextGame.history=[...nextGame.history.slice(-1949),{v:worth,t:last+1}];
    nextGame.best=Math.max(nextGame.best,worth);
  }
  if(!nextGame.eventsNextAt)nextGame.eventsNextAt=Date.now()+20000;
  if(Date.now()>=nextGame.eventsNextAt){
    const seed=nextGame.prngSeed;
    const event=createMarketEvent(nextGame,nextStocks,seed);
    nextStocks=applyMarketEvent(nextGame,nextStocks,event);
    nextGame.prngSeed=(seed*1664525+1013904223)>>>0;
    nextGame.eventsNextAt=Date.now()+20000+(nextGame.prngSeed%40001);
  }
  const absoluteTick=nextGame.market.day*390+(nextGame.market.minute-570);
  resolvePendingRumours(nextGame,nextStocks,absoluteTick);
  evaluateAchievements(nextGame,nextStocks);
  nextGame.market.stocks=Object.fromEntries(nextStocks.map(stock=>[stock.ticker,stock]));
  stocksRef.current=nextStocks;gameRef.current=nextGame;
  setStocks(nextStocks);setGame(nextGame);setPortfolio(portfolioFromGame(nextGame));
  setPortfolioHistory(history=>[...history.slice(-719),{label:"Day "+nextGame.market.day+" · "+String(Math.floor(nextGame.market.minute/60)).padStart(2,"0")+":"+String(nextGame.market.minute%60).padStart(2,"0"),value:calculateNetWorth(nextGame,nextStocks)}]);
 },4500);return()=>window.clearInterval(id);},[]);
 useEffect(()=>{if(!selected)return;const latest=stocks.find(stock=>stock.ticker===selected.ticker);if(latest&&latest!==selected)setSelected(latest);},[stocks,selected]);
 useEffect(()=>{if(!toast)return;const id=window.setTimeout(()=>setToast(""),2600);return()=>window.clearTimeout(id);},[toast]);

 const totalValue=useMemo(()=>calculateNetWorth(game,stocks),[game,stocks]);
 const chartData=useMemo(()=>{const count:Record<string,number>={"1D":48,"1W":96,"1M":180,"3M":360,"1Y":600,"ALL":720};const source=portfolioHistory.length?portfolioHistory:game.history.map(point=>({label:"Day "+point.t,value:point.v}));return source.slice(-count[timeframe]).map(point=>({label:point.label,value:point.value}));},[portfolioHistory,game.history,timeframe]);
 const stockByTicker=(ticker:string)=>stocks.find(s=>s.ticker===ticker)!;
 const optionExpiryDays=Number(optionExpiry.match(/(\d+)d/)?.[1]??4);
 const optionRows=useMemo(()=>generateOptionChain(stockByTicker("NVDA"),optionExpiryDays,optionSide==="Calls"?"call":"put"),[stocks,optionExpiryDays,optionSide]);
 
 const activeNews=game.news.length?game.news.map(event=>({source:event.type==="aftermath"?"Rumour desk":"Market simulator",time:"Day "+event.day+" · "+String(event.minute??0).padStart(3,"0"),ticker:event.tickers[0]??"SPY",tone:event.sentiment>=0?"up":"down",title:event.headline,body:event.body,tickers:event.tickers})):newsItems;
const positions=Object.entries(portfolio.holdings).map(([ticker,h])=>({stock:stockByTicker(ticker),holding:h})).filter(x=>x.stock);
 const stockValue=positions.reduce((sum,item)=>sum+item.stock.price*item.holding.quantity,0);
 const unrealizedPnl=positions.reduce((sum,item)=>sum+(item.stock.price-item.holding.averageCost)*item.holding.quantity,0);
 const dividendTotal=game.activity.filter(item=>item.type==="dividend").reduce((sum,item)=>sum+(item.amount??0),0);
 const filtered=stocks.filter(s=>(sector==="All"||s.sector===sector)&&(`${s.ticker} ${s.name}`.toLowerCase().includes(search.toLowerCase())));
 const gainers=[...stocks].sort((a,b)=>b.change-a.change).slice(0,5);
 const losers=[...stocks].sort((a,b)=>a.change-b.change).slice(0,5);
 const active=[...stocks].sort((a,b)=>b.volume-a.volume).slice(0,5);
 const openStock=(stock:Stock)=>{setSelected(stock);setAmount("");};
 const closeDetail=()=>setSelected(null);
 const startTrade=(side:"buy"|"sell")=>{setTradeSide(side);setUnit("Dollars");setAmount("");setModal("trade");};
 const placeTrade=()=>{if(!selected)return;const numeric=Number(amount);const quantity=unit==="Dollars"?numeric/selected.price:numeric;const result=executeTrade(portfolio,selected,tradeSide,quantity);if(!result.ok){setToast(result.reason);return;}
  const nextGame=structuredClone(gameRef.current);const previous=nextGame.holdings[selected.ticker];
  nextGame.cash=result.portfolio.cash;nextGame.holdings=Object.fromEntries(Object.entries(result.portfolio.holdings));nextGame.realizedPnl=result.portfolio.realizedPnl;nextGame.trades=result.portfolio.trades;
  if(tradeSide==="buy"&&!previous)nextGame.holdSince[selected.ticker]=nextGame.market.day;
  if(tradeSide==="sell"&&!result.portfolio.holdings[selected.ticker])delete nextGame.holdSince[selected.ticker];
  nextGame.activity=[{type:tradeSide,ticker:selected.ticker,qty:result.quantity,price:result.executionPrice,fee:result.fee,day:nextGame.market.day},...nextGame.activity].slice(0,100);
  evaluateAchievements(nextGame,stocksRef.current);updateProgression(nextGame,stocksRef.current,nextGame.prngSeed);gameRef.current=nextGame;setGame(nextGame);
  playUiFeedback(nextGame,tradeSide==="buy"?760:390);setPortfolio(result.portfolio);setModal(null);setToast(`${tradeSide==="buy"?"Bought":"Sold"} ${result.quantity.toFixed(4)} shares of ${selected.ticker}`);};
 const joinChallenge=()=>{const next=structuredClone(gameRef.current);const result=joinWeeklyChallenge(next,stocksRef.current);if(!result.ok){setToast(result.reason??"Unable to join challenge.");return;}gameRef.current=next;setGame(next);setToast("You joined this week's trading challenge.");};
 const claimMissionReward=(id:string)=>{const next=structuredClone(gameRef.current);updateProgression(next,stocksRef.current,next.prngSeed);const result=claimMission(next,id);if(!result.ok){setToast(result.reason??"Mission not ready.");return;}gameRef.current=next;setGame(next);setPortfolio(portfolioFromGame(next));playUiFeedback(next,980);setToast("Mission reward added to your cash balance.");};
 const claimChallengeReward=()=>{const next=structuredClone(gameRef.current);const result=claimWeeklyChallenge(next,stocksRef.current);if(!result.ok){setToast(result.reason??"Challenge reward unavailable.");return;}gameRef.current=next;setGame(next);setPortfolio(portfolioFromGame(next));playUiFeedback(next,1040);setToast(`Weekly challenge reward: ${money(result.reward??0)}`);};
 const performBankAction=(action:"deposit"|"withdraw"|"borrow"|"repay",value:number)=>{const next=structuredClone(gameRef.current);const result=bankAction(next,stocksRef.current,action,value);if(!result.ok){setToast(result.reason);return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,540);setToast(result.message??"Bank transaction complete.");};
 const performBuildingAction=(action:"buy"|"upgrade"|"sell",idOrName:string)=>{const next=structuredClone(gameRef.current);const result=buildingAction(next,stocksRef.current,action,idOrName);if(!result.ok){setToast(result.reason);return;}gameRef.current=result.state;setGame(result.state);setPortfolio(portfolioFromGame(result.state));playUiFeedback(result.state,880);setToast(result.message??"Property updated.");};
 const changeSpeed=(speed:number)=>{const next={...gameRef.current,settings:{...gameRef.current.settings,speed}};gameRef.current=next;setGame(next);setToast(speed===0?"Simulation paused":`Simulation speed set to ${speed}×`);};
 const cycleSpeed=()=>{const values=[0,1,2,5,60,390];const current=gameRef.current.settings.speed;changeSpeed(values[(values.indexOf(current)+1)%values.length]);};
 const changeSetting=(key:"sound"|"haptics",value:boolean)=>{const next={...gameRef.current,settings:{...gameRef.current.settings,[key]:value}};gameRef.current=next;setGame(next);};
 const exportSave=()=>{const payload=JSON.stringify({...gameRef.current,market:{...gameRef.current.market,stocks:Object.fromEntries(stocksRef.current.map(stock=>[stock.ticker,stock]))}},null,2);const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download="invstock-save.json";anchor.click();URL.revokeObjectURL(url);};
 const importSave=(json:string)=>{try{const parsed=JSON.parse(json);const imported=hydrateGameState(parsed,stocksRef.current);gameRef.current=imported;setGame(imported);setPortfolio(portfolioFromGame(imported));setSaved(imported.watchlist);setPortfolioHistory(imported.history.map(point=>({label:"Day "+point.t,value:point.v})).slice(-720));setToast("Save imported successfully.");}catch{setToast("Could not import this save. Check the JSON and try again.");}};
 const resetGame=()=>{const next=gameFromPortfolio(initialPortfolio,stocksRef.current);gameRef.current=next;setGame(next);setPortfolio(initialPortfolio);setPortfolioHistory(next.history.map(point=>({label:"Day "+point.t,value:point.v})).slice(-720));setSaved(["NVDA","MSFT"]);try{localStorage.removeItem("ticker_game_v1");localStorage.removeItem("invstock-game-v2");localStorage.removeItem("invstock-v2");localStorage.removeItem("invstock-legacy-migrated");}catch{}setToast("Simulator progress reset.");};
 const addDigit=(digit:string)=>setAmount(v=>digit==="back"?v.slice(0,-1):digit==="."?(v.includes(".")?v:v+"."):(v==="0"?digit:v+digit));
 const toggleSaved=(ticker:string)=>setSaved(v=>v.includes(ticker)?v.filter(t=>t!==ticker):[...v,ticker]);
 const gotoStock=(ticker:string)=>{const stock=stockByTicker(ticker);if(stock)openStock(stock);};
 const pageTitle=selected?selected.ticker:tab;

 return <main className="app-shell">
  <header className="topbar"><div className="brand-lockup"><BrandMark/><span>invstock</span></div><div className="topbar-actions"><span className="market-live"><i/>SIMULATED MARKET</span><button className="speed-chip" aria-label="Change simulation speed" onClick={cycleSpeed}><Zap size={14}/>{game.settings.speed===0?"Paused":game.settings.speed+"×"}</button><button className="icon-button" aria-label="Notifications" onClick={()=>{setNewsIndex(0);setModal("news");}}><Bell size={19}/><i/></button></div></header>
  {selected?<section className="stock-detail-page"><button className="back-link" onClick={closeDetail}><ArrowLeft size={17}/> Back to {tab}</button><div className="detail-heading"><div className="detail-identity"><StockLogo stock={selected} size={54}/><div><h1>{selected.ticker}</h1><p>{selected.name} · {selected.sector}</p></div></div><button className="icon-button" aria-label="Save stock" onClick={()=>toggleSaved(selected.ticker)}><Bookmark size={19} fill={saved.includes(selected.ticker)?"currentColor":"none"}/></button></div><div className="detail-price">{money(selected.price)}</div><div className={selected.change>=0?"detail-change gain":"detail-change loss"}>{selected.change>=0?<ArrowUpRight size={17}/>:<ArrowDownLeft size={17}/>} {signed(selected.change)} today</div><Chart data={selected.history.slice(-({"1D":78,"1W":390,"1M":30,"3M":90,"1Y":252,"ALL":390}[timeframe]??390)).map((value,i)=>({label:String(i),value}))}/><div className="timeframes">{["1D","1W","1M","3M","1Y","ALL"].map(t=><button key={t} className={timeframe===t?"selected":""} onClick={()=>setTimeframe(t)}>{t}</button>)}</div><div className="detail-stats">{[["Market cap",fmtCompact(selected.marketCap)],["P/E ratio",selected.pe?selected.pe.toFixed(1):"—"],["Dividend yield",`${(selected.dividend*100).toFixed(2)}%`],["Beta",selected.beta.toFixed(2)],["Volume",fmtCompact(selected.volume)],["52-week range",`${money(selected.price*.78)} – ${money(selected.price*1.16)}`]].map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div><div className="detail-actions"><button className="buy-button" onClick={()=>startTrade("buy")}>Buy {selected.ticker}</button><button className="sell-button" onClick={()=>startTrade("sell")}>Sell {selected.ticker}</button></div></section>
  :<><div className="page-heading"><div><p className="eyebrow">PAPER TRADING · SIMULATED MARKET</p><h1>{tab==="Home"?"Investing":tab}</h1></div>{tab==="Home"&&<div className="session-chip"><i/>Market open <span>· closes in 2h 13m</span></div>}{tab==="Account"&&<button className="icon-button" aria-label="Settings" onClick={()=>document.getElementById("account-game-panels")?.scrollIntoView({behavior:"smooth",block:"start"})}><Settings size={19}/></button>}</div>
  {tab==="Home"&&<section className="home-view"><div className="hero-card"><div className="hero-topline"><span>Portfolio value</span><span className="live-tag"><i/>LIVE SIMULATION</span></div><div className="portfolio-value">{money(totalValue)}</div><div className="hero-return"><span>↗</span> {totalValue>=INITIAL_DEPOSIT?"+":"−"}{money(Math.abs(totalValue-INITIAL_DEPOSIT))} ({((totalValue/INITIAL_DEPOSIT-1)*100)>=0?"+":"−"}{Math.abs((totalValue/INITIAL_DEPOSIT-1)*100).toFixed(2)}%) <small>All time</small></div><Chart data={chartData}/><div className="timeframes">{["1D","1W","1M","3M","1Y","ALL"].map(t=><button key={t} className={timeframe===t?"selected":""} onClick={()=>setTimeframe(t)}>{t}</button>)}</div></div><button className="buying-power-row" onClick={()=>setToast(`Available buying power: ${money(portfolio.cash)}`)}><span><Wallet size={18}/>Buying power <b className="add-cash">ADD CASH</b></span><strong>{money(portfolio.cash)}<ChevronRight size={17}/></strong></button><div className="challenge-card"><div className="challenge-icon"><Trophy size={22}/></div><div className="challenge-copy"><b>Weekly trading challenge</b><p>{game.weeklyChallenge.joined?`You are competing against four trading bots. Your return: ${signed((totalValue/Math.max(1,game.weeklyChallenge.startValue)-1)*100)}.`:"Join the weekly market challenge and compete against four simulated trading bots."}</p></div><button onClick={game.weeklyChallenge.joined?()=>setToast("Your leaderboard is shown below."):joinChallenge}>{game.weeklyChallenge.joined?"Joined":"Join challenge"} <ArrowRight size={16}/></button></div>{game.weeklyChallenge.joined&&<div className="challenge-leaderboard"><div><b>You</b><strong className={totalValue>=game.weeklyChallenge.startValue?"gain":"loss"}>{signed((totalValue/Math.max(1,game.weeklyChallenge.startValue)-1)*100)}</strong></div>{game.weeklyChallenge.bots.map(bot=><div key={bot.name}><b>{bot.name}</b><strong className={bot.returnPct>=0?"gain":"loss"}>{signed(bot.returnPct)}</strong></div>)}{game.market.day>game.weeklyChallenge.week*7&&!game.weeklyChallenge.claimed&&<button onClick={claimChallengeReward}>Claim weekly reward</button>}</div>}<div className="home-missions">{game.missions.map(mission=><div className="mission-row" key={mission.id}><span><Target size={17}/><span><b>{mission.title}</b><small>{mission.description} · {mission.progress}/{mission.target}</small></span></span><button disabled={mission.claimed||mission.progress<mission.target} onClick={()=>claimMissionReward(mission.id)}>{mission.claimed?"Claimed":mission.progress>=mission.target?`Claim ${money(mission.reward)}`:"In progress"}</button></div>)}</div><SectionTitle title="Positions" action="History" onAction={()=>setTab("Account")}/><div className="surface position-list">{positions.length?positions.map(({stock,holding})=><button key={stock.ticker} className="position-row" onClick={()=>openStock(stock)}><StockLogo stock={stock}/><span className="stock-meta"><b>{stock.ticker}</b><small>{holding.quantity.toFixed(3)} shares</small></span><Sparkline stock={stock}/><span className="stock-quote"><b className={stock.price>=holding.averageCost?"gain":"loss"}>{money(stock.price*holding.quantity)}</b><small className={stock.price>=holding.averageCost?"pill gain-pill":"pill loss-pill"}>{signed((stock.price/holding.averageCost-1)*100)}</small></span></button>):<p className="empty-state">Your positions will appear here after your first trade.</p>}</div></section>}
  {tab==="Discovery"&&<section className="discovery-view"><div className="search-box"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search companies or tickers"/>{search&&<button onClick={()=>setSearch("")}><X size={16}/></button>}</div><div className="sector-strip">{sectors.map(s=><button key={s} className={sector===s?"selected":""} onClick={()=>setSector(s)}>{s}</button>)}</div><SectionTitle title="Top gainers" action="See all" onAction={()=>setSector("All")}/><div className="surface stock-list">{gainers.map(s=><StockRow key={s.ticker} stock={s} onClick={()=>openStock(s)}/>)}</div><SectionTitle title="Top losers" action="See all" onAction={()=>setSector("All")}/><div className="surface stock-list">{losers.map(s=><StockRow key={s.ticker} stock={s} onClick={()=>openStock(s)}/>)}</div><SectionTitle title="Most active" action="See all" onAction={()=>setSearch("")}/><div className="surface stock-list">{active.map(s=><StockRow key={s.ticker} stock={s} mode="volume" onClick={()=>openStock(s)}/>)}</div><SectionTitle title={sector==="All"?"Explore stocks":sector}/><div className="surface stock-list">{filtered.slice(0,12).map(s=><StockRow key={s.ticker} stock={s} onClick={()=>openStock(s)}/>)}</div></section>}
  {tab==="Options"&&<section className="options-view"><div className="options-header"><div><p className="eyebrow">OPTIONS MARKET</p><h2>Options chain</h2></div><button className="icon-button"><ListFilter size={18}/></button></div><div className="option-underlying" onClick={()=>gotoStock("NVDA")}><StockLogo stock={stockByTicker("NVDA")}/><span><b>NVDA</b><small>Nvidia</small></span><strong>{money(stockByTicker("NVDA").price)}<small className="gain">{signed(stockByTicker("NVDA").change)}</small></strong><ChevronDown size={17}/></div><div className="expiry-strip">{["Jan 9 · 4d","Jan 16 · 11d","Jan 23 · 18d","Jan 30 · 25d"].map(e=><button key={e} className={optionExpiry===e?"selected":""} onClick={()=>setOptionExpiry(e)}>{e}</button>)}</div><div className="options-controls"><div className="segmented">{(["Buy","Sell"] as const).map(v=><button key={v} className={optionAction===v?"selected":""} onClick={()=>setOptionAction(v)}>{v}</button>)}</div><div className="segmented">{(["Calls","Puts"] as const).map(v=><button key={v} className={optionSide===v?"selected":""} onClick={()=>setOptionSide(v)}>{v}</button>)}</div></div><div className="option-tabs">{["Prices","Activity","Greeks"].map(v=><button key={v} className={optionTab===v?"selected":""} onClick={()=>setOptionTab(v)}>{v}</button>)}</div><div className="option-table-wrap"><table className="option-table"><thead><tr>{optionTab==="Greeks"?<><th>Strike</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>IV</th></>:optionTab==="Activity"?<><th>Strike</th><th>Volume</th><th>Open int.</th><th>Last</th><th>% Chg</th><th>IV</th></>:<><th>Strike</th><th>Bid</th><th>Ask</th><th>Mark</th><th>Last</th><th>% Chg</th></>}</tr></thead><tbody>{optionRows.map((r,i)=><Fragment key={r.strike}>{i===7&&<tr className="share-divider"><td colSpan={6}><span>Share price {money(stockByTicker("NVDA").price)}</span></td></tr>}<tr><td>{money(r.strike)}</td>{optionTab==="Greeks"?<><td>{r.delta.toFixed(3)}</td><td>{r.gamma.toFixed(4)}</td><td>{r.theta.toFixed(3)}</td><td>{r.vega.toFixed(3)}</td><td>{r.impliedVolatility.toFixed(1)}%</td></>:optionTab==="Activity"?<><td>{r.volume.toLocaleString()}</td><td>{r.openInterest.toLocaleString()}</td><td>{money(r.last)}</td><td className={r.change>=0?"gain":"loss"}>{signed(r.change)}</td><td>{r.impliedVolatility.toFixed(1)}%</td></>:<><td>{money(r.bid)}</td><td>{money(r.ask)}</td><td className={r.change>=0?"gain":"loss"}>{money(r.mark)}</td><td>{money(r.last)}</td><td className={r.change>=0?"gain":"loss"}>{signed(r.change)}</td></>}</tr></Fragment>)}</tbody></table></div><p className="sim-note"><ShieldCheck size={15}/> Simulated options quotes for learning only. No real orders are placed.</p></section>}
  {tab==="News"&&<section className="news-view"><div className="news-tabs">{["All","My stocks","Market"].map(v=><button key={v} className={newsFilter===v?"selected":""} onClick={()=>setNewsFilter(v)}>{v}</button>)}</div>{activeNews.filter(n=>newsFilter!=="My stocks"||saved.includes(n.ticker)||portfolio.holdings[n.ticker]).map((item,i)=><button className="news-card" key={item.title} onClick={()=>{setNewsIndex(i);setModal("news");}}><div className="news-source"><i className={item.tone==="up"?"up-dot":"down-dot"}/>{item.source}<span>· {item.time}</span></div><b>{item.title}</b><div className="news-bottom"><span>{item.ticker} · Simulated market news</span><CompanyLogo ticker={item.ticker} name={stockByTicker(item.ticker).name} size={32}/></div></button>)}</section>}
  {tab==="Account"&&<section className="account-view"><div className="rank-card"><div className="rank-icon"><Crown size={25}/></div><div className="rank-info"><small>YOUR RANK</small><b>{game.rank}</b><div className="xp-track"><i style={{width:Math.min(100,game.xp/2000*100)+"%"}}/></div><span>{game.xp} XP · {Math.max(0,450-game.xp)} XP to Analyst</span></div><ChevronRight size={18}/></div><SectionTitle title="Portfolio"/><div className="surface account-stats">{[["Total value",money(totalValue)],["Cash",money(portfolio.cash)],["Savings",money(game.savings)],["Outstanding loan",money(game.loan)],["Property value",money(game.buildings.reduce((sum,item)=>sum+item.value,0))],["Stocks",money(stockValue)],["Options","$0.00"],["Unrealized P/L",money(unrealizedPnl)],["Realized P/L",money(portfolio.realizedPnl)],["Dividends",money(dividendTotal)],["Starting capital",money(game.start)],["All-time return",`${money(totalValue-game.start)} (${((totalValue/game.start-1)*100).toFixed(2)}%)`]].map(([label,value],i)=><div className="account-stat" key={label}><span>{label}</span><b className={i===5||i===6||i===9?"gain":""}>{value}</b></div>)}</div><SectionTitle title="Performance"/><div className="surface performance-card"><div className="performance-legend"><span><i/>You +4.06%</span><span><i/>MSBM +2.27%</span></div><div className="performance-chart"><Chart data={chartData}/></div><div className="timeframes">{["1M","3M","1Y","ALL"].map(t=><button key={t} className={timeframe===t?"selected":""} onClick={()=>setTimeframe(t)}>{t}</button>)}</div></div><AccountGamePanels state={game} stocks={stocks} onBank={performBankAction} onBuilding={performBuildingAction} onSpeed={changeSpeed} onSetting={changeSetting} onImport={importSave} onExport={exportSave} onReset={resetGame}/></section>}
  </>}
  {!selected&&<BottomNav active={tab} onChange={setTab}/>}
  {modal==="trade"&&selected&&<div className="modal-backdrop" onClick={()=>setModal(null)}><section className="trade-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><button onClick={()=>setModal(null)} aria-label="Close"><X size={19}/></button><b>{tradeSide==="buy"?"Buy":"Sell"} {selected.ticker}</b><span/></div><div className="order-type"><span>Order type</span><button onClick={()=>setToast("Market orders execute at the simulated market price.")}>Market <ChevronDown size={15}/></button></div><div className="segmented amount-toggle">{(["Shares","Dollars"] as const).map(v=><button key={v} className={unit===v?"selected":""} onClick={()=>{setUnit(v);setAmount("");}}>{v}</button>)}</div><label className="amount-label">Amount</label><div className="amount-display">{unit==="Dollars"?"$":""}{amount||"0"}{unit==="Shares"&&<small> shares</small>}</div><div className="quick-amounts">{(unit==="Dollars"?["50","100","250","500"]:["1","2","5","10"]).map(v=><button key={v} onClick={()=>setAmount(v)}>{unit==="Dollars"?"$":""}{v}</button>)}</div><div className="market-info"><div><span>Market price</span><b>{money(selected.price)} · Bid {money(selected.price*.9997)} · Ask {money(selected.price*1.0003)}</b></div><div><span>Est. shares</span><b>{unit==="Dollars"?(Number(amount||0)/selected.price).toFixed(4):Number(amount||0).toFixed(4)}</b></div><small>{money(portfolio.cash)} buying power available</small></div><div className="keypad">{["1","2","3","4","5","6","7","8","9",".","0","back"].map(k=><button key={k} onClick={()=>addDigit(k)}>{k==="back"?"⌫":k}</button>)}</div><button className="review-button" disabled={!amount||Number(amount)<=0||(tradeSide==="buy"&&(unit==="Dollars"?Number(amount)>portfolio.cash:Number(amount)*selected.price>portfolio.cash))||(tradeSide==="sell"&&(unit==="Dollars"?Number(amount)/selected.price:Number(amount))>(portfolio.holdings[selected.ticker]?.quantity??0))} onClick={placeTrade}>Review order</button></section></div>}
  {modal==="news"&&<div className="modal-backdrop" onClick={()=>setModal(null)}><section className="news-modal" role="dialog" aria-modal="true" aria-labelledby="news-title" onClick={e=>e.stopPropagation()}><div className="modal-head"><span className="news-kicker"><i/> MARKET UPDATE</span><button onClick={()=>setModal(null)} aria-label="Close news"><X size={20}/></button></div><div className="news-modal-source">{activeNews[newsIndex%activeNews.length].source} · {activeNews[newsIndex%activeNews.length].time}</div><h2 id="news-title">{activeNews[newsIndex%activeNews.length].title}</h2><p>{activeNews[newsIndex%activeNews.length].body}</p><div className="news-modal-ticker"><span>AFFECTED TICKER</span><b>{activeNews[newsIndex%activeNews.length].ticker}</b></div><button className="news-open-button" onClick={()=>{setModal(null);setTab("News");}}>Open news feed <ArrowRight size={16}/></button></section></div>}
  {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast("")}><X size={14}/></button></div>}
 </main>;
}

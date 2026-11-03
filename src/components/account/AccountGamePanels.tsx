"use client";

import { useState } from "react";
import { ACHIEVEMENTS, BUILDING_CATALOG, calculateNetWorth, type GameState } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { CURRENCIES, formatCompactMoney, formatMoney, type CurrencyCode, type Difficulty } from "@/lib/currency";

type BankAction="deposit"|"withdraw"|"borrow"|"repay";
type BuildingAction="buy"|"upgrade"|"sell";
type Panel="Bank"|"Crypto"|"Buildings"|"Achievements"|"Settings";
type Props={
  state:GameState;stocks:Stock[];
  onBank:(action:BankAction,amount:number)=>void;
  onBuilding:(action:BuildingAction,idOrName:string)=>void;\n  onCryptoTrade:(symbol:string,side:"buy"|"sell",quantity:number)=>void;
  onSpeed:(speed:number)=>void;
  onSetting:(key:"sound"|"haptics"|"currency"|"difficulty",value:boolean|CurrencyCode|Difficulty)=>void;
  onImport:(json:string)=>void;onExport:()=>void;onReset:()=>void;
};


export function AccountGamePanels({state,stocks,onBank,onBuilding,onCryptoTrade,onSpeed,onSetting,onImport,onExport,onReset}:Props) {
  const [panel,setPanel]=useState<Panel>("Bank");
  const [amount,setAmount]=useState("100");\n  const [cryptoAmount,setCryptoAmount]=useState("0.01");
  const [saveText,setSaveText]=useState("");
  const [confirmReset,setConfirmReset]=useState(false);
  const money=(value:number)=>formatMoney(value,state.settings.currency);\n  const compactMoney=(value:number)=>formatCompactMoney(value,state.settings.currency);\n  const availableCredit=Math.max(0,calculateNetWorth(state,stocks)*.35-state.loan);
  return <section className="game-panels" id="account-game-panels">
    <div className="game-panel-nav" aria-label="Simulator tools">
      {(["Bank","Crypto","Buildings","Achievements","Settings"] as Panel[]).map(item=><button key={item} className={panel===item?"selected":""} onClick={()=>setPanel(item)}>{item}</button>)}
    </div>
    {panel==="Bank"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Cash balance</small><b>{compactMoney(state.cash)}</b></div><div><small>Savings balance</small><b>{compactMoney(state.savings)}</b></div><div><small>Outstanding loan</small><b className={state.loan>0?"loss":""}>{compactMoney(state.loan)}</b></div><div><small>Available credit</small><b>{compactMoney(availableCredit)}</b></div></div>
      <label className="game-field-label" htmlFor="bank-amount">Amount in USD</label>
      <input id="bank-amount" className="game-amount-input" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <div className="game-action-grid">
        <button onClick={()=>onBank("deposit",Number(amount))}>Deposit</button>
        <button onClick={()=>onBank("withdraw",Number(amount))}>Withdraw</button>
        <button onClick={()=>onBank("borrow",Number(amount))}>Borrow</button>
        <button onClick={()=>onBank("repay",Number(amount))}>Repay</button>
      </div>
      <p className="game-muted">Savings earns 3.5% simulated APY. Loans accrue 12% simulated APR with a 2% daily minimum payment. Missed payments incur a 1% penalty.</p>
      <h3>Recent activity</h3>
      <div className="game-activity">{state.activity.slice(0,12).map((item,index)=><div key={index}><span>{item.type==="deposit"?"Savings deposit":item.type==="withdraw"?"Savings withdrawal":item.type==="loan"?"Loan drawn":item.type==="repayment"?"Loan repayment":item.type==="dividend"?"Dividend":item.type==="buy"?"Stock purchase":item.type==="sell"?"Stock sale":item.type}</span><b>{money(item.amount??(item.qty??0)*(item.price??0))}</b></div>)}</div>
    </div>}
    {panel==="Crypto"&&<div className="game-panel-content">\n      <div className="game-balance-grid"><div><small>Crypto holdings</small><b>{Object.keys(state.cryptoHoldings).length}</b></div><div><small>Crypto portfolio value</small><b>{compactMoney(Object.entries(state.cryptoHoldings).reduce((sum,[symbol,holding])=>sum+(state.cryptoMarket.find(asset=>asset.symbol===symbol)?.price??0)*holding.quantity,0))}</b></div></div>\n      <label className="game-field-label" htmlFor="crypto-quantity">Order quantity (crypto units)</label>\n      <input id="crypto-quantity" className="game-amount-input" type="number" min="0.000001" step="any" value={cryptoAmount} onChange={e=>setCryptoAmount(e.target.value)}/>\n      <p className="game-muted">Simulated crypto market · prices are game-generated, not live exchange quotes. Orders use your shared cash balance and a simulated 0.10% fee.</p>\n      <div className="game-activity">{state.cryptoMarket.map(asset=>{const holding=state.cryptoHoldings[asset.symbol];const value=(holding?.quantity??0)*asset.price;return <div key={asset.symbol} className="game-crypto-row"><span><b>{asset.symbol}</b><small>{asset.name} · {money(asset.price)}</small></span><span><b>{compactMoney(value)}</b><small>{holding?holding.quantity.toFixed(6)+" owned":"Not owned"}</small></span><button onClick={()=>onCryptoTrade(asset.symbol,"buy",Number(cryptoAmount))}>Buy</button><button className="danger-outline" onClick={()=>onCryptoTrade(asset.symbol,"sell",Number(cryptoAmount))} disabled={!holding||holding.quantity<=0}>Sell</button></div>;})}</div>\n    </div>}\n    {panel==="Buildings"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Property value</small><b>{money(state.buildings.reduce((sum,item)=>sum+item.value,0))}</b></div><div><small>Income per minute</small><b className="gain">{money(state.buildings.reduce((sum,item)=>sum+item.income,0))}</b></div></div>
      <h3>Your properties</h3>
      {state.buildings.length?state.buildings.map(item=><div className="game-property" key={item.id}><span className="game-property-icon">{item.icon}</span><div><b>{item.name}</b><small>Level {item.level} · {money(item.income)}/min · Value {money(item.value)}</small></div><button onClick={()=>onBuilding("upgrade",item.id)}>Upgrade {item.name}</button><button className="danger-outline" onClick={()=>onBuilding("sell",item.id)}>Sell</button></div>):<p className="game-muted">You have not acquired any properties yet.</p>}
      <h3>Property market</h3>
      {BUILDING_CATALOG.map(item=><div className="game-property" key={item.name}><span className="game-property-icon">{item.icon}</span><div><b>{item.name}</b><small>Produces {money(item.income)}/min · Owned {state.buildings.filter(x=>x.name===item.name).length}</small></div><b>{money(item.cost)}</b><button onClick={()=>onBuilding("buy",item.name)}>Buy {item.name}</button></div>)}
    </div>}
    {panel==="Achievements"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Achievements unlocked</small><b>{state.achievements.length}/{ACHIEVEMENTS.length}</b></div><div><small>Best net worth</small><b>{money(state.best)}</b></div><div><small>Market day</small><b>{state.market.day}</b></div><div><small>Completed trades</small><b>{state.trades}</b></div></div>
      {ACHIEVEMENTS.map(item=>{const unlocked=state.achievements.includes(item.id);return <div className="game-achievement" key={item.id}><span>{unlocked?"🏆":"🔒"}</span><div><b>{item.id}</b><small>{item.description}</small></div><strong className={unlocked?"gain":""}>{unlocked?"Unlocked":"Locked"}</strong></div>;})}
    </div>}
    {panel==="Settings"&&<div className="game-panel-content">
      <h3>Display currency</h3>\n      <label className="game-field-label" htmlFor="display-currency">Choose your currency</label>\n      <select id="display-currency" className="game-amount-input" value={state.settings.currency} onChange={e=>onSetting("currency",e.target.value as CurrencyCode)}>{CURRENCIES.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select>\n      <p className="game-muted">Currency changes only how values are displayed. Your actual game balance remains in USD. Conversion uses fixed simulator reference rates, not live FX quotes.</p>\n      <h3>Difficulty</h3>\n      <label className="game-field-label" htmlFor="game-difficulty">Economy difficulty</label>\n      <select id="game-difficulty" className="game-amount-input" value={state.settings.difficulty} onChange={e=>onSetting("difficulty",e.target.value as Difficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option><option value="expert">Expert</option></select>\n      <p className="game-muted">Difficulty is saved with your profile. Its effects will apply across markets, business costs, property and credit as those systems are introduced.</p>\n      <h3>Simulation speed</h3>
      <div className="game-speed-options">{[0,1,2,5,60,390].map(speed=><button key={speed} className={state.settings.speed===speed?"selected":""} onClick={()=>onSpeed(speed)}>{speed===0?"Pause":speed+"×"}</button>)}</div>
      <label className="game-setting-row"><span><b>Sound effects</b><small>Trade and market event sounds</small></span><input type="checkbox" checked={state.settings.sound} onChange={e=>onSetting("sound",e.target.checked)}/></label>
      <label className="game-setting-row"><span><b>Haptic feedback</b><small>Subtle feedback on supported devices</small></span><input type="checkbox" checked={state.settings.haptics} onChange={e=>onSetting("haptics",e.target.checked)}/></label>
      <h3>How to play</h3><p className="game-muted">Buy and sell simulated shares using the market price, spread and trading fee. Use the Bank to earn savings interest or borrow against your net worth. Properties generate income each simulated market minute. Market events and rumours can move individual stocks, sectors or the whole market. Hold positions for seven market days to earn Diamond Hands, and manage debt to avoid margin calls.</p><h3>Save data</h3>
      <p className="game-muted">Export a local backup or import a previously exported InvStock save.</p>
      <button className="game-primary-action" onClick={onExport}>Export save</button>
      <textarea className="game-import-area" aria-label="Save data JSON" value={saveText} onChange={e=>setSaveText(e.target.value)} placeholder="Paste an InvStock save JSON here"/>
      <button className="game-secondary-action" disabled={!saveText.trim()} onClick={()=>onImport(saveText)}>Import save</button>
      {confirmReset?<div className="game-reset-confirm" role="alertdialog" aria-label="Confirm simulator reset"><b>Reset all simulator progress?</b><p>This permanently clears your portfolio, properties, achievements and settings on this device.</p><div><button className="game-reset-action" onClick={()=>{onReset();setConfirmReset(false);}}>Yes, reset everything</button><button className="game-secondary-action" onClick={()=>setConfirmReset(false)}>Cancel</button></div></div>:<button className="game-reset-action" onClick={()=>setConfirmReset(true)}>Reset simulator</button>}
    </div>}
  </section>;
}

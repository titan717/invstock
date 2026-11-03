"use client";

import { useState } from "react";
import { ACHIEVEMENTS, BUILDING_CATALOG, calculateNetWorth, DIFFICULTY_RULES, type GameState } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { CURRENCIES, formatCompactMoney, formatMoney, type CurrencyCode, type Difficulty } from "@/lib/currency";
import { BUSINESS_CATALOG, EMPLOYEE_ROLES, calculateBusinessEconomics, type BusinessStrategy, type EmployeeRole } from "@/lib/business-engine";
import { PROPERTY_CATALOG, PROPERTY_CITIES, calculatePropertyEconomics } from "@/lib/real-estate";

type BankAction="deposit"|"withdraw"|"borrow"|"repay";
type BuildingAction="buy"|"upgrade"|"sell";
type Panel="Bank"|"Crypto"|"Businesses"|"Real Estate"|"Buildings"|"Achievements"|"Settings";
type Props={
  state:GameState;stocks:Stock[];
  onBank:(action:BankAction,amount:number)=>void;
  onBuilding:(action:BuildingAction,idOrName:string)=>void;
  onCryptoTrade:(symbol:string,side:"buy"|"sell",quantity:number)=>void;
  onBusinessBuy:(definitionId:string,city:string)=>void;
  onBusinessHire:(businessId:string,role:EmployeeRole,name:string)=>void;
  onBusinessFire:(businessId:string,employeeId:string)=>void;
  onBusinessPromote:(businessId:string,employeeId:string)=>void;
  onBusinessUpgrade:(businessId:string)=>void;
  onBusinessStrategy:(businessId:string,strategy:BusinessStrategy)=>void;
  onBusinessRelocate:(businessId:string,city:string)=>void;
  onBusinessSell:(businessId:string)=>void;
  onPropertyBuy:(listingId:string,city:string)=>void;
  onPropertyUpgrade:(propertyId:string)=>void;
  onPropertySell:(propertyId:string)=>void;
  onSpeed:(speed:number)=>void;
  onSetting:(key:"sound"|"haptics"|"currency"|"difficulty",value:boolean|CurrencyCode|Difficulty)=>void;
  onImport:(json:string)=>void;onExport:()=>void;onReset:()=>void;
};


export function AccountGamePanels({state,stocks,onBank,onBuilding,onCryptoTrade,onBusinessBuy,onBusinessHire,onBusinessFire,onBusinessPromote,onBusinessUpgrade,onBusinessStrategy,onBusinessRelocate,onBusinessSell,onPropertyBuy,onPropertyUpgrade,onPropertySell,onSpeed,onSetting,onImport,onExport,onReset}:Props) {
  const [panel,setPanel]=useState<Panel>("Bank");
  const [amount,setAmount]=useState("100");
  const [cryptoAmount,setCryptoAmount]=useState("0.01");
  const [businessCity,setBusinessCity]=useState("Bengaluru");
  const [propertyCity,setPropertyCity]=useState("Bengaluru");
  const [employeeName,setEmployeeName]=useState("");
  const [employeeRole,setEmployeeRole]=useState<EmployeeRole>("worker");
  const [relocationCity,setRelocationCity]=useState("Mumbai");
  const [saveText,setSaveText]=useState("");
  const [confirmReset,setConfirmReset]=useState(false);
  const money=(value:number)=>formatMoney(value,state.settings.currency);
  const compactMoney=(value:number)=>formatCompactMoney(value,state.settings.currency);
  const availableCredit=Math.max(0,calculateNetWorth(state,stocks)*DIFFICULTY_RULES[state.settings.difficulty].creditLimit-state.loan);
  return <section className="game-panels" id="account-game-panels">
    <div className="game-panel-nav" aria-label="Simulator tools">
      {(["Bank","Crypto","Businesses","Real Estate","Buildings","Achievements","Settings"] as Panel[]).map(item=><button key={item} className={panel===item?"selected":""} onClick={()=>setPanel(item)}>{item}</button>)}
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
    {panel==="Crypto"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Crypto holdings</small><b>{Object.keys(state.cryptoHoldings).length}</b></div><div><small>Crypto portfolio value</small><b>{compactMoney(Object.entries(state.cryptoHoldings).reduce((sum,[symbol,holding])=>sum+(state.cryptoMarket.find(asset=>asset.symbol===symbol)?.price??0)*holding.quantity,0))}</b></div></div>
      <label className="game-field-label" htmlFor="crypto-quantity">Order quantity (crypto units)</label>
      <input id="crypto-quantity" className="game-amount-input" type="number" min="0.000001" step="any" value={cryptoAmount} onChange={e=>setCryptoAmount(e.target.value)}/>
      <p className="game-muted">Simulated crypto market · prices are game-generated, not live exchange quotes. Orders use your shared cash balance and a simulated 0.10% fee.</p>
      <div className="game-activity">{state.cryptoMarket.map(asset=>{const holding=state.cryptoHoldings[asset.symbol];const value=(holding?.quantity??0)*asset.price;return <div key={asset.symbol} className="game-crypto-row"><span><b>{asset.symbol}</b><small>{asset.name} · {money(asset.price)}</small></span><span><b>{compactMoney(value)}</b><small>{holding?holding.quantity.toFixed(6)+" owned":"Not owned"}</small></span><button onClick={()=>onCryptoTrade(asset.symbol,"buy",Number(cryptoAmount))}>Buy</button><button className="danger-outline" onClick={()=>onCryptoTrade(asset.symbol,"sell",Number(cryptoAmount))} disabled={!holding||holding.quantity<=0}>Sell</button></div>;})}</div>
    </div>}
    {panel==="Businesses"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Companies owned</small><b>{state.businesses.length}</b></div><div><small>Business value</small><b>{compactMoney(state.businesses.reduce((sum,business)=>sum+business.value,0))}</b></div><div><small>Daily operating profit</small><b className="gain">{compactMoney(state.businesses.reduce((sum,business)=>sum+calculateBusinessEconomics(business,state.settings.difficulty).dailyProfit,0))}</b></div></div>
      <h3>Your companies</h3>
      {state.businesses.length?state.businesses.map(business=>{const economics=calculateBusinessEconomics(business,state.settings.difficulty);return <div className="game-business-card" key={business.id}>
        <div className="game-business-heading"><div><b>{business.name}</b><small>{business.industry.toUpperCase()} · {business.city} · Level {business.level}</small></div><b>{money(business.value)}</b></div>
        <div className="game-business-metrics"><span><small>Daily revenue</small><b>{money(economics.dailyRevenue)}</b></span><span><small>Daily expenses</small><b>{money(economics.dailyOperatingCosts+economics.dailyPayroll)}</b></span><span><small>Daily profit</small><b className={economics.dailyProfit>=0?"gain":"loss"}>{money(economics.dailyProfit)}</b></span><span><small>Employees</small><b>{business.employees.length}/20</b></span></div>
        <label className="game-field-label" htmlFor={"strategy-"+business.id}>Business strategy</label>
        <select id={"strategy-"+business.id} className="game-amount-input" value={business.strategy} onChange={e=>onBusinessStrategy(business.id,e.target.value as BusinessStrategy)}><option value="value">Value pricing · higher demand</option><option value="balanced">Balanced</option><option value="premium">Premium pricing · lower demand</option></select>
        <div className="game-employee-list">{business.employees.map(employee=><div className="game-employee-row" key={employee.id}><span><b>{employee.name}</b><small>{EMPLOYEE_ROLES[employee.role].label} · {money(employee.salaryPerDay)}/day</small></span><button onClick={()=>onBusinessPromote(business.id,employee.id)} disabled={employee.role==="director"}>Promote</button><button className="danger-outline" onClick={()=>onBusinessFire(business.id,employee.id)}>Dismiss</button></div>)}</div>
        <div className="game-business-hire"><input aria-label={"Employee name for "+business.name} placeholder="Employee name" value={employeeName} onChange={e=>setEmployeeName(e.target.value)}/><select aria-label={"Employee role for "+business.name} value={employeeRole} onChange={e=>setEmployeeRole(e.target.value as EmployeeRole)}>{Object.entries(EMPLOYEE_ROLES).map(([role,definition])=><option key={role} value={role}>{definition.label} · {money(definition.salaryPerDay)}/day</option>)}</select><button onClick={()=>{onBusinessHire(business.id,employeeRole,employeeName);setEmployeeName("");}}>Hire</button></div>
        <div className="game-business-actions"><button onClick={()=>onBusinessUpgrade(business.id)}>Upgrade</button><input aria-label={"Relocation city for "+business.name} value={relocationCity} onChange={e=>setRelocationCity(e.target.value)} placeholder="New city"/><button onClick={()=>onBusinessRelocate(business.id,relocationCity)}>Relocate</button><button className="danger-outline" onClick={()=>onBusinessSell(business.id)}>Sell company</button></div>
      </div>;}):<p className="game-muted">You do not own a company yet. Choose an industry below to start your first business.</p>}
      <h3>Start a business</h3>
      <label className="game-field-label" htmlFor="business-city">Business city</label>
      <input id="business-city" className="game-amount-input" value={businessCity} onChange={e=>setBusinessCity(e.target.value)} placeholder="Enter a city"/>
      {BUSINESS_CATALOG.map(definition=><div className="game-business-market" key={definition.id}><span><b>{definition.name}</b><small>{definition.description}</small></span><b>{money(definition.baseCost)}</b><button onClick={()=>onBusinessBuy(definition.id,businessCity)}>Acquire</button></div>)}
    </div>}
    {panel==="Real Estate"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Properties owned</small><b>{state.realEstate.length}</b></div><div><small>Property equity</small><b>{compactMoney(state.realEstate.reduce((sum,property)=>sum+property.value,0))}</b></div><div><small>Monthly net rent</small><b className="gain">{compactMoney(state.realEstate.reduce((sum,property)=>sum+calculatePropertyEconomics(property).monthlyNetRent,0))}</b></div></div>
      <h3>Your global properties</h3>
      {state.realEstate.length?state.realEstate.map(property=>{const economics=calculatePropertyEconomics(property,1,state.settings.difficulty);return <div className="game-property-card" key={property.id}>
        <div className="game-business-heading"><div><b>{property.name}</b><small>{property.type.toUpperCase()} · {property.city}, {property.country} · Level {property.level}</small></div><b>{money(property.value)}</b></div>
        <div className="game-business-metrics"><span><small>Monthly rent</small><b>{money(economics.monthlyGrossRent)}</b></span><span><small>Maintenance</small><b>{money(economics.monthlyMaintenance)}</b></span><span><small>Net rent</small><b className={economics.monthlyNetRent>=0?"gain":"loss"}>{money(economics.monthlyNetRent)}</b></span><span><small>Occupancy</small><b>{Math.round(property.occupancy*100)}%</b></span></div>
        <div className="game-business-actions"><button onClick={()=>onPropertyUpgrade(property.id)}>Renovate</button><button className="danger-outline" onClick={()=>onPropertySell(property.id)}>Sell property</button></div>
      </div>;}):<p className="game-muted">You have not invested in real estate yet. Choose a city and buy your first property.</p>}
      <h3>Global property market</h3>
      <label className="game-field-label" htmlFor="property-city">Investment city</label>
      <select id="property-city" className="game-amount-input" value={propertyCity} onChange={e=>setPropertyCity(e.target.value)}>{PROPERTY_CITIES.map(city=><option key={city.name} value={city.name}>{city.name}, {city.country}</option>)}</select>
      {PROPERTY_CATALOG.map(listing=>{const city=PROPERTY_CITIES.find(item=>item.name===propertyCity)??PROPERTY_CITIES[0];return <div className="game-business-market" key={listing.id}><span><b>{listing.name}</b><small>{listing.description} · {listing.type}</small></span><b>{money(listing.basePrice*city.priceIndex*DIFFICULTY_RULES[state.settings.difficulty].buildingCost)}</b><button onClick={()=>onPropertyBuy(listing.id,propertyCity)}>Buy property</button></div>;})}
    </div>}
    {panel==="Buildings"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Property value</small><b>{money(state.buildings.reduce((sum,item)=>sum+item.value,0))}</b></div><div><small>Income per minute</small><b className="gain">{money(state.buildings.reduce((sum,item)=>sum+item.income,0))}</b></div></div>
      <h3>Your properties</h3>
      {state.buildings.length?state.buildings.map(item=><div className="game-property" key={item.id}><span className="game-property-icon">{item.icon}</span><div><b>{item.name}</b><small>Level {item.level} · {money(item.income)}/min · Value {money(item.value)}</small></div><button onClick={()=>onBuilding("upgrade",item.id)}>Upgrade {item.name}</button><button className="danger-outline" onClick={()=>onBuilding("sell",item.id)}>Sell</button></div>):<p className="game-muted">You have not acquired any properties yet.</p>}
      <h3>Property market</h3>
      {BUILDING_CATALOG.map(item=><div className="game-property" key={item.name}><span className="game-property-icon">{item.icon}</span><div><b>{item.name}</b><small>Produces {money(item.income)}/min · Owned {state.buildings.filter(x=>x.name===item.name).length}</small></div><b>{money(item.cost*DIFFICULTY_RULES[state.settings.difficulty].buildingCost)}</b><button onClick={()=>onBuilding("buy",item.name)}>Buy {item.name}</button></div>)}
    </div>}
    {panel==="Achievements"&&<div className="game-panel-content">
      <div className="game-balance-grid"><div><small>Achievements unlocked</small><b>{state.achievements.length}/{ACHIEVEMENTS.length}</b></div><div><small>Best net worth</small><b>{money(state.best)}</b></div><div><small>Market day</small><b>{state.market.day}</b></div><div><small>Completed trades</small><b>{state.trades}</b></div></div>
      {ACHIEVEMENTS.map(item=>{const unlocked=state.achievements.includes(item.id);return <div className="game-achievement" key={item.id}><span>{unlocked?"🏆":"🔒"}</span><div><b>{item.id}</b><small>{item.description}</small></div><strong className={unlocked?"gain":""}>{unlocked?"Unlocked":"Locked"}</strong></div>;})}
    </div>}
    {panel==="Settings"&&<div className="game-panel-content">
      <h3>Display currency</h3>
      <label className="game-field-label" htmlFor="display-currency">Choose your currency</label>
      <select id="display-currency" className="game-amount-input" value={state.settings.currency} onChange={e=>onSetting("currency",e.target.value as CurrencyCode)}>{CURRENCIES.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select>
      <p className="game-muted">Currency changes only how values are displayed. Your actual game balance remains in USD. Conversion uses fixed simulator reference rates, not live FX quotes.</p>
      <h3>Difficulty</h3>
      <label className="game-field-label" htmlFor="game-difficulty">Economy difficulty</label>
      <select id="game-difficulty" className="game-amount-input" value={state.settings.difficulty} onChange={e=>onSetting("difficulty",e.target.value as Difficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option><option value="expert">Expert</option></select>
      <p className="game-muted">Difficulty is saved with your profile. Its effects will apply across markets, business costs, property and credit as those systems are introduced.</p>
      <h3>Simulation speed</h3>
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

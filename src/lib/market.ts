export type Stock = {
  ticker: string; name: string; sector: string; price: number; change: number;
  volume: number; marketCap: number; pe: number; dividend: number; beta: number;
  color: string; history: number[];
};

type Definition = [string,string,string,number,number,number,number,number,number,number,string];

const definitions: Definition[] = [
  ["MSFT","Microsoft","Technology",420,.019,.00005,1.05,3.2e12,7.4,.007,"#2778dc"],
  ["META","Meta Platforms","Technology",585,.031,.00008,1.25,1.5e12,26,.004,"#4267bd"],
  ["GOOGL","Alphabet","Technology",188,.023,.00006,1.08,2.3e12,22,.005,"#4285f4"],
  ["NVDA","Nvidia","Technology",178,.045,.00012,1.65,4.2e12,48,.0003,"#78b84b"],
  ["AAPL","Apple","Technology",245,.021,.00004,1.12,3.6e12,31,.004,"#9ba6b8"],
  ["ORCL","Oracle","Technology",205,.027,.00005,1.1,580e9,34,.009,"#d34d38"],
  ["JPM","JPMorgan","Banking",290,.018,.00004,.92,820e9,12,.021,"#4279b9"],
  ["VISA","Visa","Financial Services",345,.017,.00005,.88,690e9,31,.008,"#234e9b"],
  ["PYPL","PayPal","Financial Services",78,.035,.00002,1.3,78e9,18,0,"#3678d4"],
  ["GS","Goldman Sachs","Banking",710,.024,.00003,1.18,220e9,15,.019,"#80a7bc"],
  ["XOM","Exxon Mobil","Energy",118,.022,.00004,.8,500e9,14,.034,"#d54b38"],
  ["ENPH","Enphase Energy","Energy",64,.052,.00003,1.65,8e9,26,0,"#e6a33d"],
  ["NEE","NextEra Energy","Utilities",82,.025,.00004,.72,170e9,21,.026,"#4f9b6b"],
  ["LLY","Eli Lilly","Healthcare",820,.026,.00006,.85,780e9,48,.006,"#d889b4"],
  ["ISRG","Intuitive Surgical","Healthcare",520,.029,.00007,1.05,185e9,62,0,"#43a7a3"],
  ["MRNA","Moderna","Healthcare",38,.058,-.00002,1.7,15e9,0,0,"#a78bfa"],
  ["COST","Costco","Consumer",980,.019,.00005,.72,435e9,52,.005,"#d74c56"],
  ["SHOP","Shopify","Consumer",118,.041,.00009,1.55,155e9,76,0,"#85b64a"],
  ["COIN","Coinbase","Technology",295,.065,.00012,2.1,75e9,34,0,"#3974e8"],
  ["BTCX","BitForge","Technology",72,.078,.0001,2.35,28e9,0,0,"#e5a13b"],
  ["AMD","AMD","Semiconductors",165,.043,.0001,1.55,270e9,28,0,"#1f75c9"],
  ["AVGO","Broadcom","Semiconductors",345,.035,.00009,1.35,1.6e12,34,.012,"#c65c3b"],
  ["TSM","Taiwan Semiconductor","Semiconductors",205,.032,.00008,1.2,1.05e12,25,.012,"#c83d45"],
  ["QCOM","Qualcomm","Semiconductors",170,.031,.00005,1.25,190e9,18,.021,"#3478bd"],
  ["BAC","Bank of America","Banking",48,.025,.00004,1.15,370e9,13,.023,"#d84c4c"],
  ["WFC","Wells Fargo","Banking",78,.026,.00004,1.12,250e9,12,.025,"#d84a36"],
  ["C","Citigroup","Banking",92,.031,.00003,1.25,170e9,12,.032,"#3473bb"],
  ["BKNG","Booking Holdings","Travel",5200,.035,.00007,1.25,175e9,28,0,"#3976b8"],
  ["ABNB","Airbnb","Travel",145,.042,.00008,1.4,95e9,31,0,"#e75c6b"],
  ["DAL","Delta Air Lines","Travel",58,.044,.00003,1.35,38e9,8,0,"#3975b8"],
  ["CAT","Caterpillar","Industrials",390,.026,.00004,1.05,190e9,17,.016,"#e2b83d"],
  ["GE","GE Aerospace","Industrials",275,.031,.00007,1.15,300e9,34,.006,"#3972aa"],
  ["HON","Honeywell","Industrials",220,.022,.00004,.95,145e9,22,.021,"#c94c4c"],
  ["ADBE","Adobe","Technology",390,.031,.00006,1.25,175e9,25,0,"#e34c4c"],
  ["CRM","Salesforce","Technology",295,.034,.00007,1.3,285e9,28,0,"#4c9bc8"],
  ["AMZN","Amazon","Consumer",225,.031,.00008,1.25,2.35e12,34,0,"#e49a39"],
  ["WMT","Walmart","Consumer",105,.019,.00005,.62,850e9,37,.011,"#4385c8"],
  ["HD","Home Depot","Consumer",395,.023,.00004,.95,390e9,24,.022,"#e67836"],
  ["UNH","UnitedHealth","Healthcare",315,.032,.00003,.75,290e9,17,.018,"#3c8bba"],
  ["ABBV","AbbVie","Healthcare",190,.022,.00004,.62,335e9,62,.036,"#438caa"],
  ["CVX","Chevron","Energy",155,.025,.00003,.9,285e9,15,.041,"#d64b3d"],
  ["SHEL","Shell","Energy",72,.026,.00003,.85,220e9,10,.039,"#e4b83d"],
  ["PLTR","Palantir","Technology",145,.055,.00012,1.9,330e9,180,0,"#a4b0bf"]
];
const etfs: Definition[] = [
  ["SPY","SPDR S&P 500 ETF","ETF",590,.012,.00002,1,590e9,0,.013,"#8ba6bd"],
  ["QQQ","Invesco QQQ ETF","ETF",510,.018,.00004,1.15,330e9,0,.006,"#4b91c9"],
  ["VTI","Vanguard Total Market ETF","ETF",295,.011,.00002,.95,480e9,0,.013,"#c94c4c"]
];

export const sectors = ["All","Technology","Semiconductors","Banking","Energy","Healthcare","Consumer","Travel","Industrials","Utilities","Financial Services","ETF"];

export function createMarket(seed = 731991): Stock[] {
  let state = seed >>> 0;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  return [...definitions, ...etfs].map(([ticker,name,sector,base,vol,drift,beta,cap,pe,dividend,color]) => {
    let p = base;
    const history = Array.from({length: 48}, () => {
      p = Math.max(.5, p * Math.exp(drift / 48 + (random() - .5) * vol / 4));
      return Number(p.toFixed(2));
    });
    const change = (p / base - 1) * 100;
    return { ticker,name,sector,price:Number(p.toFixed(2)),change,volume:Math.floor(2e6 + random()*24e6),marketCap:cap,pe,dividend,beta,color,history };
  });
}

export function advanceMarket(stocks: Stock[], seed = Date.now()): Stock[] {
  let state = seed >>> 0;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  return stocks.map(stock => {
    const delta = (random() - .495) * .0018 * Math.max(.65, stock.beta);
    const price = Math.max(.5, stock.price * (1 + delta));
    return {...stock, price:Number(price.toFixed(2)), change:stock.change + delta*100, volume:stock.volume + Math.floor(random()*18000), history:[...stock.history.slice(-47),Number(price.toFixed(2))]};
  });
}

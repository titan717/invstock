"use client";

import { useState, type ReactNode } from "react";
import { Bell, Check, ChevronLeft, ChevronRight, Coins, Crown, DollarSign, Download, FastForward, FileText, Gauge, Globe, Heart, Info, LifeBuoy, Moon, Pause, Play, Radio, Smartphone, Upload, Zap } from "lucide-react";
import type { GameSettings } from "@/lib/game-engine";
import { CURRENCIES, formatMoney, type CurrencyCode, type Difficulty } from "@/lib/currency";

export type SettingKey = "sound" | "haptics" | "currency" | "difficulty" | "notifications" | "music" | "liveData";
export type SettingValue = boolean | CurrencyCode | Difficulty;

/** Speeds are market minutes per real minute; the tick loop converts them to real time. */
export const MARKET_SPEEDS: { label: string; speed: number; description: string; icon: ReactNode }[] = [
  { label: "Live", speed: 1, description: "Real time: one market minute per real minute.", icon: <Play size={16} fill="currentColor" /> },
  { label: "Fast", speed: 60, description: "One market hour per real minute.", icon: <FastForward size={16} fill="currentColor" /> },
  { label: "Turbo", speed: 390, description: "A full trading day in one real minute.", icon: <FastForward size={16} fill="currentColor" /> },
  { label: "Paused", speed: 0, description: "Time stands still. Prices and orders wait for you.", icon: <Pause size={16} fill="currentColor" /> },
];

export const speedLabel = (speed: number) => (speed <= 0 ? "Paused" : `${speed}x`);

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

type Sheet = "speed" | "reset" | "disclaimer" | "currency" | "difficulty" | "import" | null;
type Page = "root" | "privacy" | "terms" | "help";

export type SettingsScreenProps = {
  settings: GameSettings;
  startingValue: number;
  liveStatus?: string;
  onBack: () => void;
  onSpeed: (speed: number) => void;
  onSetting: (key: SettingKey, value: SettingValue) => void;
  onAddCash: () => void;
  onUnavailable: (feature: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onReset: () => void;
};

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? "bg-[#00D09C]" : "bg-[#39393D]"}`}>
      <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-[left] ${checked ? "left-[22px]" : "left-[2px]"}`} />
    </button>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1C1C1E] text-white">{children}</span>;
}

function Row({ icon, label, value, onClick, trailing }: { icon: ReactNode; label: string; value?: ReactNode; onClick?: () => void; trailing?: ReactNode }) {
  const body = (
    <>
      <Icon>{icon}</Icon>
      <span className="flex-1 text-[15px] font-semibold text-white">{label}</span>
      {value !== undefined && <span className="text-[13px] font-medium text-[#8E8E93] tabular-nums">{value}</span>}
      {trailing ?? <ChevronRight size={18} className="text-[#8E8E93]" />}
    </>
  );
  if (trailing) return <div className="flex w-full items-center gap-3 py-[7px]">{body}</div>;
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-[7px] text-left">{body}</button>;
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 mt-4 text-[17px] font-bold text-white">{children}</h2>;
}

function Header({ title, onBack, label }: { title: string; onBack: () => void; label: string }) {
  return (
    <header className="sticky top-0 z-10 -mx-4 flex h-12 items-center justify-center bg-black px-4">
      <button type="button" aria-label={label} onClick={onBack} className="absolute left-3 flex h-10 w-10 items-center text-[#FF5722]"><ChevronLeft size={24} /></button>
      <h1 className="text-[17px] font-bold text-white">{title}</h1>
    </header>
  );
}

function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()} className="w-full max-w-[480px] rounded-t-[24px] bg-[#1C1C1E] px-4 pb-8 pt-2">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#48484A]" />
        {children}
      </section>
    </div>
  );
}

const LEGAL: Record<Exclude<Page, "root">, { title: string; body: string[] }> = {
  privacy: { title: "Privacy policy", body: [
    "STONKS stores your game on this device only, in your browser's local storage. There are no accounts and nothing about your portfolio is sent to a server.",
    "When live market data is on, the app requests public stock quotes for the tickers in the simulator. These requests contain only ticker symbols.",
    "Clearing your browser data or using Reset account removes your saved game.",
  ] },
  terms: { title: "Terms of service", body: [
    "STONKS is a game for education and entertainment. Virtual cash has no monetary value and cannot be withdrawn or exchanged.",
    "Quotes may be delayed, incomplete or unavailable. Nothing in the app is financial advice, and simulated results do not predict real returns.",
  ] },
  help: { title: "Help and support", body: [
    "Buy and sell shares at the market price plus a small spread and trading fee. Orders placed while the market is closed are queued and fill at the next open.",
    "Market speed controls how quickly simulated time runs. Live runs one market minute per real minute; Fast and Turbo speed up dividends, SIPs and challenges.",
    "Use Bank & empire on the Account tab for savings, loans, crypto, businesses and property. Missions and the weekly challenge award XP that raises your rank.",
    "Export your save from Settings to back it up, and import it on another device to continue.",
  ] },
};

export function SettingsScreen({ settings, startingValue, liveStatus, onBack, onSpeed, onSetting, onAddCash, onUnavailable, onExport, onImport, onReset }: SettingsScreenProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [page, setPage] = useState<Page>("root");
  const [saveText, setSaveText] = useState("");
  const currencyLabel = CURRENCIES.find(item => item.code === settings.currency)?.code ?? settings.currency;

  if (page !== "root") {
    const doc = LEGAL[page];
    return (
      <section className="settings-screen min-h-screen bg-black px-4 pb-28">
        <Header title={doc.title} label="Back to settings" onBack={() => setPage("root")} />
        {doc.body.map(paragraph => <p key={paragraph} className="mt-4 text-[15px] leading-6 text-[#C7C7CC]">{paragraph}</p>)}
      </section>
    );
  }

  return (
    <section className="settings-screen min-h-screen bg-black px-4 pb-28">
      <Header title="Settings" label="Back to account" onBack={onBack} />

      <Heading>Appearance</Heading>
      <div className="flex items-center gap-3 py-[7px]">
        <Icon><Moon size={17} fill="currentColor" /></Icon>
        <span className="flex-1 text-[15px] font-semibold text-white">Theme</span>
        <div className="flex w-[170px] rounded-[12px] bg-[#1C1C1E] p-[3px]" role="radiogroup" aria-label="Theme">
          <button type="button" role="radio" aria-checked="true" className="flex-1 rounded-[10px] bg-[#2C2C2E] py-2 text-[12px] font-semibold text-white">Dark</button>
          <button type="button" role="radio" aria-checked="false" onClick={() => onUnavailable("Light theme")} className="flex-1 rounded-[10px] py-2 text-[12px] font-semibold text-[#8E8E93]">Light</button>
        </div>
      </div>
      <Row icon={<Globe size={17} />} label="Language" value="English" onClick={() => onUnavailable("More languages")} />

      <Heading>Simulation</Heading>
      <Row icon={<FastForward size={17} fill="currentColor" />} label="Market speed" value={speedLabel(settings.speed)} onClick={() => setSheet("speed")} />
      <Row icon={<Radio size={17} />} label="Live market data" value={liveStatus} trailing={<Toggle label="Live market data" checked={settings.liveData} onChange={value => onSetting("liveData", value)} />} />
      <Row icon={<Coins size={17} />} label="Display currency" value={currencyLabel} onClick={() => setSheet("currency")} />
      <Row icon={<Gauge size={17} />} label="Difficulty" value={DIFFICULTIES.find(item => item.value === settings.difficulty)?.label} onClick={() => setSheet("difficulty")} />

      <Heading>Notifications and feedback</Heading>
      <Row icon={<Bell size={17} />} label="Notifications" trailing={<Toggle label="Notifications" checked={settings.notifications} onChange={value => onSetting("notifications", value)} />} />
      <Row icon={<Zap size={17} fill="currentColor" />} label="Haptics" trailing={<Toggle label="Haptics" checked={settings.haptics} onChange={value => onSetting("haptics", value)} />} />
      <Row icon={<Play size={16} fill="currentColor" />} label="Sound effects" trailing={<Toggle label="Sound effects" checked={settings.sound} onChange={value => onSetting("sound", value)} />} />
      <Row icon={<Heart size={17} fill="currentColor" />} label="Music" trailing={<Toggle label="Music" checked={settings.music} onChange={value => onSetting("music", value)} />} />

      <Heading>Purchases</Heading>
      <Row icon={<Crown size={17} fill="currentColor" />} label="Market Sim Pro" onClick={() => onUnavailable("Market Sim Pro")} />
      <Row icon={<DollarSign size={17} />} label="Add virtual cash" onClick={onAddCash} />

      <Heading>Privacy</Heading>
      <Row icon={<FileText size={17} />} label="Privacy policy" onClick={() => setPage("privacy")} />
      <Row icon={<FileText size={17} />} label="Terms of service" onClick={() => setPage("terms")} />

      <Heading>About</Heading>
      <Row icon={<Info size={17} />} label="Simulator disclaimer" onClick={() => setSheet("disclaimer")} />
      <Row icon={<LifeBuoy size={17} />} label="Help and support" onClick={() => setPage("help")} />
      <Row icon={<Smartphone size={17} />} label="Version" value="STONKS 1.0" trailing={<span />} />

      <Heading>Data</Heading>
      <Row icon={<Download size={17} />} label="Export save" onClick={onExport} />
      <Row icon={<Upload size={17} />} label="Import save" onClick={() => setSheet("import")} />

      <Heading>Account</Heading>
      <button type="button" onClick={() => setSheet("reset")} className="mt-1 w-full py-3 text-center text-[15px] font-semibold text-white">Reset account</button>
      <p className="text-center text-[12px] text-[#8E8E93]">Start over with a fresh portfolio. This can&apos;t be undone.</p>

      {sheet === "speed" && (
        <BottomSheet label="Market speed" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Market speed</h2>
          <p className="mb-3 mt-1 text-[13px] leading-[18px] text-[#C7C7CC]">Choose how fast simulated time runs. Orders, options and dividends follow the simulated clock.</p>
          {MARKET_SPEEDS.map(option => {
            const active = settings.speed === option.speed;
            return (
              <button key={option.label} type="button" aria-pressed={active} onClick={() => { onSpeed(option.speed); setSheet(null); }} className={`mb-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-[10px] text-left ${active ? "bg-[#0A3D33]" : ""}`}>
                <span className="w-5 text-white">{option.icon}</span>
                <span className="flex-1"><b className="block text-[15px] text-white">{option.label}</b><small className="text-[12px] text-[#C7C7CC]">{option.description}</small></span>
                {active && <Check size={20} className="text-[#00D09C]" />}
              </button>
            );
          })}
        </BottomSheet>
      )}

      {sheet === "reset" && (
        <BottomSheet label="Reset your account?" onClose={() => setSheet(null)}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3D1A10] text-[#FF5722]"><Info size={30} /></div>
          <h2 className="mt-4 text-center text-[22px] font-bold text-white">Reset your account?</h2>
          <p className="mx-auto mt-2 max-w-[340px] text-center text-[14px] leading-5 text-[#C7C7CC]">All positions, orders and history will be cleared and you will start again with {formatMoney(startingValue, settings.currency)}. Your profile settings are kept.</p>
          <button type="button" onClick={() => { onReset(); setSheet(null); }} className="mt-5 h-12 w-full rounded-full bg-[#FF5722] text-[16px] font-semibold text-white">Reset</button>
          <button type="button" onClick={() => setSheet(null)} className="mt-3 h-10 w-full text-[15px] font-bold text-[#FF5722]">Cancel</button>
        </BottomSheet>
      )}

      {sheet === "disclaimer" && (
        <BottomSheet label="Before you start" onClose={() => setSheet(null)}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3D1A10] text-[#FF5722]"><FileText size={28} /></div>
          <h2 className="mt-4 text-center text-[22px] font-bold text-white">Before you start</h2>
          <div className="mt-3 space-y-2 text-[14px] leading-5 text-[#C7C7CC]">
            <p>STONKS is a trading simulator and game. Prices follow the simulated clock, or public quotes when live market data is on, and every dollar in it is fictional.</p>
            <p>No real money is invested, and nothing you earn can be withdrawn. Purchases only add virtual cash and features.</p>
            <p>Nothing in the app is financial advice. Real markets carry real risk.</p>
          </div>
          <button type="button" onClick={() => setSheet(null)} className="mt-5 h-12 w-full rounded-full bg-[#2C2C2E] text-[16px] font-semibold text-white">Close</button>
        </BottomSheet>
      )}

      {sheet === "currency" && (
        <BottomSheet label="Display currency" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Display currency</h2>
          <p className="mb-3 mt-1 text-[13px] text-[#C7C7CC]">Changes only how values are shown. Balances stay in USD at fixed reference rates.</p>
          {CURRENCIES.map(item => (
            <button key={item.code} type="button" onClick={() => { onSetting("currency", item.code); setSheet(null); }} className={`mb-1 flex w-full items-center rounded-[12px] px-3 py-3 text-left text-[15px] font-semibold text-white ${settings.currency === item.code ? "bg-[#0A3D33]" : ""}`}>
              <span className="flex-1">{item.label}</span>{settings.currency === item.code && <Check size={20} className="text-[#00D09C]" />}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === "difficulty" && (
        <BottomSheet label="Difficulty" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Difficulty</h2>
          <p className="mb-3 mt-1 text-[13px] text-[#C7C7CC]">Affects market volatility, business income, property costs and credit limits.</p>
          {DIFFICULTIES.map(item => (
            <button key={item.value} type="button" onClick={() => { onSetting("difficulty", item.value); setSheet(null); }} className={`mb-1 flex w-full items-center rounded-[12px] px-3 py-3 text-left text-[15px] font-semibold text-white ${settings.difficulty === item.value ? "bg-[#0A3D33]" : ""}`}>
              <span className="flex-1">{item.label}</span>{settings.difficulty === item.value && <Check size={20} className="text-[#00D09C]" />}
            </button>
          ))}
        </BottomSheet>
      )}

      {sheet === "import" && (
        <BottomSheet label="Import save" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Import save</h2>
          <textarea aria-label="Save data JSON" value={saveText} onChange={event => setSaveText(event.target.value)} placeholder="Paste an exported save here" className="mt-3 h-36 w-full rounded-[12px] bg-black p-3 text-[13px] text-white placeholder:text-[#8E8E93]" />
          <button type="button" disabled={!saveText.trim()} onClick={() => { onImport(saveText); setSheet(null); }} className="mt-4 h-12 w-full rounded-full bg-[#00D09C] text-[16px] font-semibold text-black disabled:opacity-40">Import</button>
        </BottomSheet>
      )}
    </section>
  );
}

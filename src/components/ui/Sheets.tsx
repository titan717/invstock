"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, DollarSign, Gift, Play } from "lucide-react";
import { MARKET_SPEEDS } from "@/components/settings/SettingsScreen";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { CASH_PACKS, DAILY_BONUSES, VIDEO_BONUS, type DailyBonusStatus } from "@/lib/rewards";

export function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()} className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-[#1C1C1E] px-4 pb-8 pt-2">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#48484A]" />
        {children}
      </section>
    </div>
  );
}

export function MarketSpeedSheet({ speed, onSelect, onClose }: { speed: number; onSelect: (speed: number) => void; onClose: () => void }) {
  return (
    <BottomSheet label="Market speed" onClose={onClose}>
      <h2 className="text-[22px] font-bold text-white">Market speed</h2>
      <p className="mb-3 mt-1 text-[13px] leading-[18px] text-[#C7C7CC]">Choose how fast simulated time runs. Orders, options and dividends follow the simulated clock.</p>
      {MARKET_SPEEDS.map(option => {
        const active = speed === option.speed;
        return (
          <button key={option.label} type="button" aria-pressed={active} onClick={() => { onSelect(option.speed); onClose(); }} className={`mb-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-[10px] text-left ${active ? "bg-[#0A3D33]" : ""}`}>
            <span className="w-5 text-white">{option.icon}</span>
            <span className="flex-1"><b className="block text-[15px] text-white">{option.label}</b><small className="text-[12px] text-[#C7C7CC]">{option.description}</small></span>
            {active && <Check size={20} className="text-[#00D09C]" />}
          </button>
        );
      })}
    </BottomSheet>
  );
}

/** Short simulated "video" break: a five-second countdown with a market tip, then the reward is granted. */
export function VideoBreak({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const timer = setTimeout(() => setLeft(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onDone]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Video bonus" className="fixed inset-0 z-[210] flex flex-col items-center justify-center bg-black px-8 text-center text-white">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#0B3D2E] text-[#00D09C]"><Play size={28} fill="currentColor" /></span>
      <p className="mt-6 text-[19px] font-bold">Market tip</p>
      <p className="mt-2 text-[15px] leading-6 text-[#C7C7CC]">Diversifying across sectors smooths out swings. No single stock should decide your week.</p>
      <p className="mt-6 text-[13px] text-[#8E8E93] tabular-nums">Reward in {left}s</p>
      <button onClick={onCancel} className="mt-6 text-[14px] font-semibold text-[#8E8E93]">Skip and lose reward</button>
    </div>
  );
}

export function DailyBonusSheet({ status, currency, onClaim, onClose }: { status: DailyBonusStatus; currency: CurrencyCode; onClaim: (doubled: boolean) => void; onClose: () => void }) {
  const [video, setVideo] = useState(false);
  const money = (value: number) => formatMoney(value, currency, { maximumFractionDigits: 0 });
  return (
    <BottomSheet label="Daily login bonus" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#3A3220] text-[#F5C542]"><Gift size={28} /></span>
        <h2 className="mt-3 text-[22px] font-bold text-white">Daily login bonus</h2>
        <p className="mt-1 text-[13px] leading-[18px] text-[#C7C7CC]">Log in every day for bigger cash bonuses. Miss a day and the streak starts over.</p>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-[6px]">
        {DAILY_BONUSES.map((amount, index) => {
          const current = index === status.dayIndex, done = index < status.dayIndex || (!status.claimable && current);
          return (
            <div key={amount} aria-current={current ? "step" : undefined} className={`flex flex-col items-center rounded-[10px] py-2 ${current ? "bg-[#5B4A1E] ring-1 ring-[#F5C542]" : "bg-[#2C2C2E]"}`}>
              <span className="text-[10px] font-semibold text-[#C7C7CC]">Day {index + 1}</span>
              <span className={`text-[16px] ${current ? "text-[#F5C542]" : "text-[#8E8E93]"}`}>{done ? <Check size={16} className="my-[3px]" /> : "$"}</span>
              <b className="text-[11px] text-white tabular-nums">{money(amount)}</b>
            </div>
          );
        })}
      </div>
      {status.claimable ? (
        <>
          <button onClick={() => setVideo(true)} className="mt-5 h-12 w-full rounded-full bg-[#F5E15A] text-[15px] font-bold text-black">Watch a video: claim {money(status.amount * 2)}</button>
          <button onClick={() => onClaim(false)} className="mt-3 h-12 w-full rounded-full bg-[#2C2C2E] text-[15px] font-bold text-white">Claim {money(status.amount)}</button>
        </>
      ) : (
        <p className="mt-5 rounded-[12px] bg-[#2C2C2E] p-3 text-center text-[14px] text-[#C7C7CC]">Today&apos;s bonus is claimed. Come back tomorrow for Day {status.dayIndex + 2 > 7 ? 1 : status.dayIndex + 2}.</p>
      )}
      {video && <VideoBreak onDone={() => { setVideo(false); onClaim(true); }} onCancel={() => setVideo(false)} />}
    </BottomSheet>
  );
}

export function AddCashSheet({ buyingPower, videosLeft, currency, onAdd, onVideo, onClose }: { buyingPower: number; videosLeft: number; currency: CurrencyCode; onAdd: (amount: number) => void; onVideo: () => void; onClose: () => void }) {
  const [video, setVideo] = useState(false);
  const money = (value: number, digits = 0) => formatMoney(value, currency, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return (
    <BottomSheet label="Add virtual cash" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#0B3D2E] text-[#00D09C]"><DollarSign size={28} /></span>
        <h2 className="mt-3 text-[22px] font-bold text-white">Add virtual cash</h2>
        <p className="mt-1 text-[13px] leading-[18px] text-[#C7C7CC]">A bigger balance lets you buy more shares. Add cash and keep trading.</p>
        <p className="mt-2 text-[13px] font-semibold text-white tabular-nums">Buying power: {money(buyingPower, 2)}</p>
      </div>
      {CASH_PACKS.map(amount => (
        <button key={amount} onClick={() => onAdd(amount)} className="mt-3 flex h-12 w-full items-center rounded-[14px] bg-[#00D09C] px-9 text-[15px] font-bold text-black tabular-nums">+{money(amount)}</button>
      ))}
      <button onClick={() => setVideo(true)} disabled={videosLeft <= 0} className="mt-3 h-12 w-full rounded-full bg-[#2C2C2E] text-[15px] font-bold text-white disabled:opacity-40">Watch a video for {money(VIDEO_BONUS)}</button>
      <p className="mt-2 text-center text-[12px] text-[#C7C7CC] tabular-nums">{videosLeft} video bonus{videosLeft === 1 ? "" : "es"} left today</p>
      <p className="mt-3 text-center text-[11px] text-[#8E8E93]">Virtual cash is for the simulator only and can&apos;t be withdrawn. Added cash counts as a deposit, so it doesn&apos;t inflate your returns.</p>
      {video && <VideoBreak onDone={() => { setVideo(false); onVideo(); }} onCancel={() => setVideo(false)} />}
    </BottomSheet>
  );
}

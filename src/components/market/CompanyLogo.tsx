"use client";

import { useState } from "react";
import { companyLogoFor } from "@/lib/company-logos";

type Props = {ticker:string;name:string;size?:number;className?:string};
export function CompanyLogo({ticker,name,size=40,className=""}:Props) {
  const identity=companyLogoFor(ticker);
  const fallbackHue = [...ticker.toUpperCase()].reduce((value, character) => (value * 31 + character.charCodeAt(0)) % 360, 0);
  const fallbackColor = `hsl(${fallbackHue} 42% 28%)`;
  const [fallbackLevel,setFallbackLevel]=useState(identity.simpleIcon?0:1);
  const src=fallbackLevel===0
    ? `https://cdn.simpleicons.org/${identity.simpleIcon}`
    : fallbackLevel===1&&identity.domain
      ? `https://www.google.com/s2/favicons?domain=${identity.domain}&sz=128`
      : null;
  return <span className={`company-logo ${className}`} style={{width:size,height:size,backgroundColor:fallbackColor}} aria-label={`${name} (${ticker})`}>
    {src ? <img key={src} src={src} alt={`${name} logo`} loading="lazy" ref={node=>{if(node&&node.complete&&node.naturalWidth===0)setFallbackLevel(level=>level===fallbackLevel?level+1:level);}} onError={()=>setFallbackLevel(level=>level===fallbackLevel?level+1:level)} /> : <span className="company-logo-fallback" aria-label={ticker}>{identity.fallback.slice(0,2)}</span>}
  </span>;
}

"use client";

import { useState } from "react";
import { companyLogoFor } from "@/lib/company-logos";

type Props = {ticker:string;name:string;size?:number;className?:string};
export function CompanyLogo({ticker,name,size=40,className=""}:Props) {
  const identity=companyLogoFor(ticker);
  const [fallbackLevel,setFallbackLevel]=useState(identity.simpleIcon?0:1);
  const src=fallbackLevel===0
    ? `https://cdn.simpleicons.org/${identity.simpleIcon}`
    : fallbackLevel===1&&identity.domain
      ? `https://www.google.com/s2/favicons?domain=${identity.domain}&sz=128`
      : null;
  return <span className={`company-logo ${className}`} style={{width:size,height:size}} aria-label={`${name} (${ticker})`}>
    {src ? <img src={src} alt={`${name} logo`} loading="lazy" onError={()=>setFallbackLevel(level=>level+1)} /> : <span className="company-logo-fallback" aria-label={ticker}>{identity.fallback}</span>}
  </span>;
}

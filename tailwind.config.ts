import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#0B0E11", panel: "#1A1D21", line: "#2B3139", gain: "#0ECB81", loss: "#F6465D", muted: "#848E9C" }, boxShadow: { glow: "0 0 32px rgba(14,203,129,.12)" } } },
  plugins: []
};
export default config;

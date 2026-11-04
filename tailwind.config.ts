import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#1C1C1E",
        surfaceHover: "#2C2C2E",
        primary: { DEFAULT: "#00D09C", hover: "#00B386" },
        danger: { DEFAULT: "#FF5722", hover: "#E64A19" },
        accent: { DEFAULT: "#5A6CF3" },
        text: { primary: "#FFFFFF", secondary: "#8E8E93", muted: "#48484A" },
        border: "#2C2C2E",
        // Keep the existing semantic aliases so older screens remain compatible.
        ink: "#000000",
        panel: "#1C1C1E",
        line: "#2C2C2E",
        gain: "#00D09C",
        loss: "#FF5722",
        muted: "#8E8E93"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
        pill: "9999px"
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 208, 156, .10)"
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out"
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;

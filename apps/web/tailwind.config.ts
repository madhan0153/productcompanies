import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      // Mobile-first type scale — sized for legibility on phones first.
      fontSize: {
        xs:   ["0.75rem",  { lineHeight: "1.1rem" }],
        sm:   ["0.875rem", { lineHeight: "1.35rem" }],
        base: ["1rem",     { lineHeight: "1.6rem" }],
        lg:   ["1.125rem", { lineHeight: "1.7rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.8rem" }],
        "2xl": ["1.5rem",  { lineHeight: "2rem",    letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem",{ lineHeight: "2.25rem", letterSpacing: "-0.015em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem",  letterSpacing: "-0.02em" }],
        "5xl": ["3rem",    { lineHeight: "3.25rem", letterSpacing: "-0.025em" }],
        "6xl": ["3.75rem", { lineHeight: "4rem",    letterSpacing: "-0.03em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
          "soft-foreground": "hsl(var(--primary-soft-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
          "soft-foreground": "hsl(var(--info-soft-foreground))",
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
          soft: "hsl(var(--premium-soft))",
          "soft-foreground": "hsl(var(--premium-soft-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        /* Back-compat aliases for legacy `bg-warm/10` `text-cool` etc. references.
         * Map them to the canonical semantic tones so old pages still render
         * cleanly under the new palette without invasive find-and-replace. */
        warm: "hsl(var(--warning))",
        cool: "hsl(var(--success))",
        glow: "hsl(var(--primary))",
      },
      borderRadius: {
        none: "0px",
        sm:   "calc(var(--radius) - 4px)",   /* 6px */
        DEFAULT: "calc(var(--radius) - 2px)",/* 8px */
        md:   "calc(var(--radius) - 2px)",   /* 8px */
        lg:   "var(--radius)",                /* 10px */
        xl:   "calc(var(--radius) + 4px)",   /* 14px */
        "2xl": "calc(var(--radius) + 8px)",  /* 18px */
        "3xl": "calc(var(--radius) + 14px)", /* 24px */
        full: "9999px",
      },
      boxShadow: {
        elev1: "var(--elev-1)",
        elev2: "var(--elev-2)",
        pop:   "var(--elev-pop)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.72" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in":    "fade-in 0.3s ease-out",
        "scale-in":   "scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up":   "slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

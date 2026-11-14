import animate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Noto Sans JP"', "system-ui", "sans-serif"] },
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        track: "rgb(var(--track) / <alpha-value>)",
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", soft: "rgb(var(--ink-soft) / <alpha-value>)", faint: "rgb(var(--ink-faint) / <alpha-value>)" },
        rule: "rgb(var(--rule) / <alpha-value>)",
        brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", dark: "rgb(var(--brand-dark) / <alpha-value>)", tint: "rgb(var(--brand-tint) / <alpha-value>)" },
        caution: { DEFAULT: "rgb(var(--caution) / <alpha-value>)", tint: "rgb(var(--caution-tint) / <alpha-value>)", dark: "rgb(var(--caution-dark) / <alpha-value>)" },
        done: { DEFAULT: "rgb(var(--done) / <alpha-value>)", tint: "rgb(var(--done-tint) / <alpha-value>)" },
      },
      borderRadius: { lg: "10px", md: "8px", sm: "6px" },
    },
  },
  plugins: [animate],
};

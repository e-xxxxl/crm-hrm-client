/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dark sidebar / shell — its whole background, hover and active-item
        // highlight all track the org's brand color. See the `brand` entry
        // below and src/utils/brandTheme.js.
        sidebar: {
          DEFAULT: "rgb(var(--brand-900) / <alpha-value>)",
          hover: "rgb(var(--brand-800) / <alpha-value>)",
          active: "rgb(var(--brand-600) / <alpha-value>)",
          border: "rgb(var(--brand-800) / <alpha-value>)",
        },
        // Neutral content surfaces
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
          400: "#94a3b8",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50: "#f8fafc",
        },
        // Per-organization accent, swapped at runtime via CSS variables — see
        // src/utils/brandTheme.js. Defaults (set in index.css) match the old
        // static blue so the app looks right before a session is loaded.
        brand: {
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)",
        drawer: "-8px 0 24px -8px rgba(15, 23, 42, 0.15)",
      },
    },
  },
  plugins: [],
};

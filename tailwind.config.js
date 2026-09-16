/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dark sidebar / shell
        sidebar: {
          DEFAULT: "#0f172a",
          hover: "#1e293b",
          active: "#334155",
          border: "#1e293b",
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
        brand: {
          600: "#1d4ed8",
          700: "#1e40af",
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

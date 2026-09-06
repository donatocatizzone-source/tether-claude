import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {
      // Denser ramp than Tailwind's default — a console reads at 13px, not
      // 14px. Only the small end is overridden; headings keep their defaults.
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1rem" }], // 11px
        sm: ["0.75rem", { lineHeight: "1.125rem" }], // 12px
        base: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
      },
      // Two real steps instead of Tailwind's five. `sm` is a hairline lift for
      // cards, `md` is a genuine popover shadow. This alone quiets most of the
      // shadow-lg/xl/2xl scattered through the app without touching them.
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.16)",
        DEFAULT: "0 1px 2px 0 rgb(0 0 0 / 0.16)",
        md: "0 4px 12px -2px rgb(0 0 0 / 0.28)",
        lg: "0 8px 24px -4px rgb(0 0 0 / 0.32)",
        xl: "0 12px 32px -6px rgb(0 0 0 / 0.36)",
        "2xl": "0 16px 48px -8px rgb(0 0 0 / 0.4)",
      },
      colors: {
        // Previously hand-written utilities in index.css, which meant opacity
        // modifiers silently did nothing — `bg-mode-danger/10` produced no
        // background at all, which is why the codebase reached for literal
        // `bg-amber-500/10` instead. Registering them here makes the tokens
        // usable the same way every other color is.
        mode: {
          safe: "hsl(var(--mode-safe))",
          active: "hsl(var(--mode-active))",
          danger: "hsl(var(--mode-danger))",
          dating: "hsl(var(--mode-dating))",
          ride: "hsl(var(--mode-ride))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 5px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

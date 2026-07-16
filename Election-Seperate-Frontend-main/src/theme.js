import { extendTheme } from "@chakra-ui/react";

/**
 * Centralized light/dark theme.
 *
 * - initialColorMode "system": first visit follows the OS preference; once the
 *   user toggles, Chakra persists the choice to localStorage
 *   ("chakra-ui-color-mode") and reuses it on refresh.
 * - Semantic tokens give every surface/border/text a single name that resolves
 *   to the right value per mode, so components (and the custom CSS layer) stay
 *   consistent. Palette is tuned to feel like GitHub / Linear / Vercel:
 *   charcoal (not pure black) backgrounds, elevated cards, soft borders,
 *   a calm blue accent.
 */

const config = {
  initialColorMode: "system",
  useSystemColorMode: false,
};

const semanticTokens = {
  colors: {
    // Page + surfaces
    "app-bg": { default: "gray.50", _dark: "#0d1117" },
    surface: { default: "white", _dark: "#161b22" },
    "surface-elevated": { default: "white", _dark: "#1c2128" },
    "surface-hover": { default: "gray.50", _dark: "#21262d" },

    // Borders
    "border-subtle": { default: "gray.200", _dark: "#30363d" },
    "border-strong": { default: "gray.300", _dark: "#3d444d" },

    // Text
    "text-primary": { default: "gray.800", _dark: "gray.100" },
    "text-secondary": { default: "gray.500", _dark: "gray.400" },
    "text-muted": { default: "gray.400", _dark: "gray.500" },

    // Brand accent
    "brand-primary": { default: "blue.500", _dark: "blue.300" },
    "brand-hover": { default: "blue.600", _dark: "blue.400" },

    // Accent-tinted surfaces/text (were hardcoded blue.50/.600/.200/.900 —
    // those are fixed light values that turn into near-white pills / invisible
    // dark text in dark mode). These adapt per color mode.
    "accent-surface": { default: "blue.50", _dark: "rgba(99, 102, 241, 0.16)" },
    "accent-surface-hover": { default: "blue.100", _dark: "rgba(99, 102, 241, 0.28)" },
    "accent-text": { default: "blue.600", _dark: "blue.200" },
    "accent-border": { default: "blue.200", _dark: "rgba(99, 102, 241, 0.45)" },
    "heading-accent": { default: "blue.900", _dark: "blue.200" },
  },
};

const theme = extendTheme({
  config,
  semanticTokens,
  styles: {
    global: {
      "html, body, #root": {
        bg: "app-bg",
        color: "text-primary",
      },
      // Smooth, subtle theme-switch transitions on the things that recolor.
      // Kept off transform/opacity so component animations are unaffected.
      "body, .chakra-modal__content, .chakra-menu__menu-list, .glass-card, .site-details-card, .custom-input, input, textarea, select, button, .chakra-card":
        {
          transitionProperty: "background-color, border-color, color, box-shadow",
          transitionDuration: "250ms",
          transitionTimingFunction: "ease",
        },
    },
  },
});

export default theme;

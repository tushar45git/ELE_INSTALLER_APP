import React from "react";
import { IconButton, Tooltip, useColorMode } from "@chakra-ui/react";
import { MdDarkMode, MdLightMode } from "react-icons/md";

/**
 * Light/Dark toggle. Chakra persists the choice to localStorage and applies it
 * instantly (no reload). Drop it anywhere; pass Chakra props to size/place it.
 */
export default function ThemeToggle(props) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === "dark";
  return (
    <Tooltip label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        aria-label="Toggle color mode"
        variant="ghost"
        fontSize="1.25rem"
        color="text-secondary"
        _hover={{ color: "brand-primary", bg: "surface-hover" }}
        onClick={toggleColorMode}
        icon={isDark ? <MdLightMode /> : <MdDarkMode />}
        {...props}
      />
    </Tooltip>
  );
}

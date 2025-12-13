/**
 * Types for the ThemeSelector component
 * @module chat/ThemeSelector/types
 */

/**
 * Available theme options
 */
export type Theme =
  | "grey"
  | "gruvbox"
  | "nord"
  | "tokyo"
  | "catppuccin"
  | "matrix"
  | "christmas"
  | "space"
  | "nightsky"
  | "synthwave";

/**
 * Props for the ThemeSelector component
 */
export interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  matrixRain: boolean;
  onMatrixRainChange: (enabled: boolean) => void;
  christmasSnow: boolean;
  onChristmasSnowChange: (enabled: boolean) => void;
  spaceStars: boolean;
  onSpaceStarsChange: (enabled: boolean) => void;
  nightSkyRotation: boolean;
  onNightSkyRotationChange: (enabled: boolean) => void;
  synthwaveGrid: boolean;
  onSynthwaveGridChange: (enabled: boolean) => void;
}

/**
 * Theme option definition
 */
export interface ThemeOption {
  id: Theme;
  name: string;
  color: string;
}

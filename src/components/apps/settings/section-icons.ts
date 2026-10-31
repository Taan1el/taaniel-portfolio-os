import {
  Accessibility,
  Bell,
  Clock,
  HardDrive,
  Info,
  Keyboard,
  Laptop,
  LayoutGrid,
  Palette,
  ShieldCheck,
  Sun,
  Volume2,
  Wifi,
  Zap,
} from "lucide-react";
import type { SettingsSectionId } from "@/lib/settings-sections";
import type { AppIcon } from "@/types/system";

/** One glyph per Settings page, for the navigation pane and the overview. */
export const SETTINGS_SECTION_ICONS: Record<SettingsSectionId, AppIcon> = {
  system: Laptop,
  display: Sun,
  sound: Volume2,
  power: Zap,
  network: Wifi,
  personalization: Palette,
  accessibility: Accessibility,
  time: Clock,
  notifications: Bell,
  storage: HardDrive,
  apps: LayoutGrid,
  privacy: ShieldCheck,
  input: Keyboard,
  about: Info,
};

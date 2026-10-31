import { Beaker, Image, LayoutGrid, Settings2, Sparkles } from "lucide-react";
import type { StartMenuCategoryDescriptor } from "@/types/system";

export const startMenuCategories: StartMenuCategoryDescriptor[] = [
  {
    category: "Portfolio",
    label: "Portfolio",
    description: "High-signal portfolio apps and walkthroughs.",
    icon: Sparkles,
    defaultExpanded: true,
  },
  {
    category: "Workspace",
    label: "Workspace",
    description: "Productivity apps, browser tools, and document workflows.",
    icon: LayoutGrid,
    defaultExpanded: false,
  },
  {
    category: "Media",
    label: "Media",
    description: "Photo, video, and rich asset viewers.",
    icon: Image,
    defaultExpanded: true,
  },
  {
    category: "Lab",
    label: "Lab",
    description: "Optional extras and experiments.",
    icon: Beaker,
    defaultExpanded: false,
  },
  {
    category: "System",
    label: "System",
    description: "Environment controls and desktop configuration.",
    icon: Settings2,
    defaultExpanded: false,
  },
];

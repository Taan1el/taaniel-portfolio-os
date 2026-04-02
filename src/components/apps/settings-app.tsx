import { Paintbrush, RotateCcw, Sparkles, Waves } from "lucide-react";
import { AppContent, AppScaffold, Button } from "@/components/apps/app-layout";
import { themePresets } from "@/data/portfolio";
import {
  animatedWallpaperPresets,
  gradientWallpaperPresets,
} from "@/data/wallpapers";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function SettingsApp({ window }: AppComponentProps) {
  void window;
  const themeId = useSystemStore((state) => state.themeId);
  const wallpaper = useSystemStore((state) => state.wallpaper);
  const setThemeId = useSystemStore((state) => state.setThemeId);
  const setWallpaperPreset = useSystemStore((state) => state.setWallpaperPreset);
  const resetWallpaper = useSystemStore((state) => state.resetWallpaper);
  const resetLayout = useSystemStore((state) => state.resetLayout);

  return (
    <AppScaffold className="settings-app">
      <AppContent padded>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Personalization</p>
          <h1>Theme the desktop</h1>
          <p className="lead">
            The desktop stays intentionally art-directed. These presets tune the wallpaper, shell tint,
            and highlight color without turning the experience into a generic OS clone.
          </p>
        </div>
      </section>

      <div className="theme-grid">
        {themePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`theme-card ${themeId === preset.id ? "is-active" : ""}`}
            onClick={() => setThemeId(preset.id)}
          >
            <span className="theme-card__preview" style={{ background: preset.wallpaper }} />
            <span className="theme-card__meta">
              <strong>{preset.name}</strong>
              <small>{preset.id}</small>
            </span>
          </button>
        ))}
      </div>

      <article className="glass-card">
        <div className="section-row">
          <div>
            <p className="eyebrow">Wallpaper mode</p>
            <h3>
              {wallpaper.mode === "theme"
                ? "Using theme wallpaper"
                : wallpaper.mode === "image"
                  ? "Static image wallpaper"
                  : wallpaper.mode === "gradient"
                    ? "Gradient wallpaper"
                    : "Animated wallpaper"}
            </h3>
            <p>
              {wallpaper.mode === "image"
                ? "A filesystem image is driving the desktop background."
                : wallpaper.mode === "theme"
                  ? "The desktop is using the active theme's built-in wallpaper."
                  : "Pick a preset below or return to the theme wallpaper at any time."}
            </p>
          </div>
          <Button type="button" variant="panel" onClick={() => resetWallpaper()}>
            <Paintbrush size={15} />
            Use theme wallpaper
          </Button>
        </div>
      </article>

      <article className="glass-card">
        <div className="section-row">
          <div>
            <p className="eyebrow">Static gradients</p>
            <h3>Compact desktop-friendly backgrounds</h3>
          </div>
          <div className="action-row">
            <Waves size={16} />
            <small>Lightweight CSS gradients</small>
          </div>
        </div>
        <div className="theme-grid">
          {gradientWallpaperPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`theme-card ${wallpaper.mode === "gradient" && wallpaper.presetId === preset.id ? "is-active" : ""}`}
              onClick={() => setWallpaperPreset("gradient", preset.id)}
            >
              <span className="theme-card__preview" style={{ background: preset.preview }} />
              <span className="theme-card__meta">
                <strong>{preset.name}</strong>
                <small>Gradient</small>
              </span>
            </button>
          ))}
        </div>
      </article>

      <article className="glass-card">
        <div className="section-row">
          <div>
            <p className="eyebrow">Animated mode</p>
            <h3>Slow-moving ambient wallpapers</h3>
          </div>
          <div className="action-row">
            <Sparkles size={16} />
            <small>CSS animation only</small>
          </div>
        </div>
        <div className="theme-grid">
          {animatedWallpaperPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`theme-card ${wallpaper.mode === "animated" && wallpaper.presetId === preset.id ? "is-active" : ""}`}
              onClick={() => setWallpaperPreset("animated", preset.id)}
            >
              <span className="theme-card__preview" style={{ background: preset.preview }} />
              <span className="theme-card__meta">
                <strong>{preset.name}</strong>
                <small>Animated</small>
              </span>
            </button>
          ))}
        </div>
      </article>

      <article className="glass-card">
        <div className="section-row">
          <div>
            <p className="eyebrow">Session controls</p>
            <h3>Refresh the workspace layout</h3>
          </div>
          <div className="action-row">
            <button type="button" className="pill-button" onClick={() => resetLayout()}>
              <RotateCcw size={15} />
              Reset windows
            </button>
            <button type="button" className="pill-button" onClick={() => setThemeId(themePresets[0].id)}>
              <Paintbrush size={15} />
              Restore default
            </button>
          </div>
        </div>
      </article>
      </AppContent>
    </AppScaffold>
  );
}

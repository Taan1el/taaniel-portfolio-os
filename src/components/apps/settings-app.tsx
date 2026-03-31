import { Paintbrush, RotateCcw } from "lucide-react";
import { themePresets } from "@/data/portfolio";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function SettingsApp({ window }: AppComponentProps) {
  void window;
  const themeId = useSystemStore((state) => state.themeId);
  const customWallpaperSource = useSystemStore((state) => state.customWallpaperSource);
  const setThemeId = useSystemStore((state) => state.setThemeId);
  const setCustomWallpaperSource = useSystemStore((state) => state.setCustomWallpaperSource);
  const resetLayout = useSystemStore((state) => state.resetLayout);

  return (
    <div className="app-screen settings-app">
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
            <p className="eyebrow">Wallpaper source</p>
            <h3>{customWallpaperSource ? "Custom image is active" : "Using theme wallpaper"}</h3>
            <p>
              {customWallpaperSource
                ? "A photo or project image has overridden the preset wallpaper."
                : "Select a preset above or open an image and use Set as wallpaper."}
            </p>
          </div>
          {customWallpaperSource ? (
            <button type="button" className="pill-button" onClick={() => setCustomWallpaperSource(null)}>
              <Paintbrush size={15} />
              Clear custom wallpaper
            </button>
          ) : null}
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
    </div>
  );
}

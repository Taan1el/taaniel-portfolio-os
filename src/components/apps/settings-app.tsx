import { Paintbrush, RotateCcw } from "lucide-react";
import { themePresets } from "@/data/portfolio";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function SettingsApp({ window }: AppComponentProps) {
  void window;
  const themeId = useSystemStore((state) => state.themeId);
  const setThemeId = useSystemStore((state) => state.setThemeId);
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

import { AlignHorizontalJustifyStart, Image as ImageIcon, Layers, MonitorUp, Paintbrush, Palette, RotateCcw, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { ACCENT_SWATCHES } from "@/lib/accents";
import {
  ACCENT_IDS,
  sanitizeDesktopIconSize,
  sanitizeTaskbarAlignment,
  sanitizeWallpaperFit,
  useSystemSettingsStore,
} from "@/stores/system-settings-store";
import { themePresets } from "@/data/portfolio";
import {
  animatedWallpaperPresets,
  gradientWallpaperPresets,
  imageWallpaperPresets,
} from "@/data/wallpapers";
import { useSystemStore } from "@/stores/system-store";

/** The theme and wallpaper pickers that used to be the whole Settings app. */
export function PersonalizationPage() {
  const themeId = useSystemStore((state) => state.themeId);
  const wallpaper = useSystemStore((state) => state.wallpaper);
  const setThemeId = useSystemStore((state) => state.setThemeId);
  const setWallpaperPreset = useSystemStore((state) => state.setWallpaperPreset);
  const setWallpaperImage = useSystemStore((state) => state.setWallpaperImage);
  const resetWallpaper = useSystemStore((state) => state.resetWallpaper);
  const resetLayout = useSystemStore((state) => state.resetLayout);
  const settings = useSystemSettingsStore();

  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Personalization</p>
          <h1>Theme the desktop</h1>
          <p className="lead">Wallpaper, shell tint, and accent presets. Custom image wallpapers are listed below.</p>
        </div>
      </section>

      <SettingsGroup title="Colors">
        <SettingsRow
          icon={<Palette size={18} />}
          settingId="accent"
          title="Accent colour"
          description="Switches, selections, focus marks and the current-page marker."
        >
          <span className="w11-settings__swatches" role="radiogroup" aria-label="Accent colour">
            {ACCENT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={settings.accent === id}
                aria-label={ACCENT_SWATCHES[id].label}
                title={ACCENT_SWATCHES[id].label}
                className="w11-settings__swatch"
                style={{ background: ACCENT_SWATCHES[id].color }}
                onClick={() => settings.setAccent(id)}
              />
            ))}
          </span>
        </SettingsRow>
        <SettingsRow
          icon={<Layers size={18} />}
          settingId="transparency"
          title="Transparency effects"
          description="Frosted glass on the taskbar, Start, flyouts and windows. Off makes them solid."
        >
          <ToggleSwitch label="Transparency effects" checked={settings.transparency} onChange={settings.setTransparency} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Taskbar">
        <SettingsRow
          icon={<AlignHorizontalJustifyStart size={18} />}
          settingId="taskbar-alignment"
          title="Taskbar alignment"
          description="Where the Start button and apps sit on the taskbar."
        >
          <select
            aria-label="Taskbar alignment"
            value={settings.taskbarAlignment}
            onChange={(event) => settings.setTaskbarAlignment(sanitizeTaskbarAlignment(event.target.value))}
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
          </select>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Desktop">
        <SettingsRow
          icon={<MonitorUp size={18} />}
          settingId="show-desktop-icons"
          title="Show desktop icons"
          description="Hides or shows the icons on the desktop. Nothing is deleted."
        >
          <ToggleSwitch label="Show desktop icons" checked={settings.showDesktopIcons} onChange={settings.setShowDesktopIcons} />
        </SettingsRow>
        <SettingsRow settingId="desktop-icon-size" title="Desktop icon size" className="is-nested">
          <select
            aria-label="Desktop icon size"
            value={settings.desktopIconSize}
            onChange={(event) => settings.setDesktopIconSize(sanitizeDesktopIconSize(event.target.value))}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </SettingsRow>
        <SettingsRow
          settingId="wallpaper-fit"
          title="Wallpaper fit"
          description={
            wallpaper.mode === "image"
              ? "How your picture fills the screen."
              : "Applies to picture wallpapers. Pick one below to use it."
          }
          className="is-nested"
        >
          <select
            aria-label="Wallpaper fit"
            value={settings.wallpaperFit}
            disabled={wallpaper.mode !== "image"}
            onChange={(event) => settings.setWallpaperFit(sanitizeWallpaperFit(event.target.value))}
          >
            <option value="fill">Fill</option>
            <option value="fit">Fit</option>
            <option value="stretch">Stretch</option>
            <option value="center">Center</option>
            <option value="tile">Tile</option>
          </select>
        </SettingsRow>
      </SettingsGroup>

      <div className="theme-grid" data-setting-id="theme">
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
            <p className="eyebrow">Static images</p>
            <h3>Photography as wallpaper</h3>
          </div>
          <div className="action-row">
            <ImageIcon size={16} />
            <small>Bundled local images</small>
          </div>
        </div>
        <div className="theme-grid">
          {imageWallpaperPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`theme-card ${wallpaper.mode === "image" && wallpaper.imageSource === preset.source ? "is-active" : ""}`}
              onClick={() => setWallpaperImage(preset.source)}
            >
              <span
                className="theme-card__preview"
                style={{
                  background: `linear-gradient(rgba(6, 12, 20, 0.22), rgba(6, 12, 20, 0.58)), url('${preset.preview}') center/cover no-repeat`,
                }}
              />
              <span className="theme-card__meta">
                <strong>{preset.name}</strong>
                <small>Static image</small>
              </span>
            </button>
          ))}
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
    </>
  );
}

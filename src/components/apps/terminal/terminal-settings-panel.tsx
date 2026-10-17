import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { TERMINAL_SHORTCUTS } from "@/lib/terminal-keys";
import { terminalProfiles, type ShellProfileId } from "@/lib/terminal-profiles";
import { getTerminalScheme, terminalSchemes } from "@/lib/terminal-schemes";
import {
  clampFontSize,
  DEFAULT_TERMINAL_SETTINGS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  useTerminalSettingsStore,
  type TerminalCursorShape,
  type TerminalSettings,
} from "@/stores/terminal-settings-store";

interface TerminalSettingsPanelProps {
  /** The system asks for less motion: the cursor will not blink whatever is chosen here. */
  reducedMotion: boolean;
  onClose: () => void;
}

function Field({ label, hint, hintId, children }: { label: string; hint?: string; hintId?: string; children: ReactNode }) {
  return (
    <div className="w11-terminal__field">
      <span className="w11-terminal__field-label">{label}</span>
      {children}
      {hint ? (
        <span id={hintId} className="w11-terminal__field-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Typing "16" passes through "1": the value is only applied (and clamped) when the person is done. */
function FontSizeInput({ value, onCommit }: { value: number; onCommit: (size: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const next = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(next)) {
      setDraft(String(value));
      return;
    }
    setDraft(String(clampFontSize(next)));
    onCommit(next);
  };

  return (
    <input
      type="number"
      aria-label="Font size in pixels"
      min={MIN_FONT_SIZE}
      max={MAX_FONT_SIZE}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  // The hint is a description, not part of the name: a screen reader says "Screen reader mode, checkbox, ..., <hint>".
  return (
    <div className="w11-terminal__toggle">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className="w11-terminal__toggle-text">
        <label htmlFor={inputId}>{label}</label>
        {hint ? (
          <span id={hintId} className="w11-terminal__field-hint">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The settings that matter to a terminal, in Windows Terminal's words. Changes show in the open tabs at once and are remembered. */
export function TerminalSettingsPanel({ reducedMotion, onClose }: TerminalSettingsPanelProps) {
  const settings = useTerminalSettingsStore();
  const { update, changeFontSize, reset } = settings;
  const titleId = useId();
  const schemeRef = useRef<HTMLSelectElement | null>(null);
  const scheme = getTerminalScheme(settings.schemeId);
  const isDefault = (Object.keys(DEFAULT_TERMINAL_SETTINGS) as Array<keyof TerminalSettings>).every(
    (key) => settings[key] === DEFAULT_TERMINAL_SETTINGS[key]
  );

  useEffect(() => {
    schemeRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <section role="dialog" aria-modal="false" aria-labelledby={titleId} className="w11-terminal__settings" onKeyDown={handleKeyDown}>
      <header className="w11-terminal__settings-header">
        <h2 id={titleId}>Terminal settings</h2>
        <button type="button" className="w11-terminal__icon-button" aria-label="Close settings" title="Close (Esc)" onClick={onClose}>
          <X size={16} />
        </button>
      </header>

      <div className="w11-terminal__settings-body">
        <h3 className="w11-terminal__settings-group">Appearance</h3>

        <Field label="Colour scheme">
          <select
            ref={schemeRef}
            aria-label="Colour scheme"
            value={settings.schemeId}
            onChange={(event) => update({ schemeId: event.target.value })}
          >
            {terminalSchemes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <span
            className="w11-terminal__swatch"
            aria-hidden="true"
            style={{ background: scheme.theme.background, color: scheme.theme.foreground }}
          >
            <span>PS&gt;</span>
            {[scheme.theme.red, scheme.theme.green, scheme.theme.yellow, scheme.theme.blue, scheme.theme.magenta, scheme.theme.cyan].map((colour) => (
              <i key={colour} style={{ background: colour }} />
            ))}
          </span>
        </Field>

        <Field label="Font size">
          <div className="w11-terminal__stepper" role="group" aria-label="Font size">
            <button
              type="button"
              className="w11-terminal__icon-button"
              aria-label="Smaller text"
              disabled={settings.fontSize <= MIN_FONT_SIZE}
              onClick={() => changeFontSize(-1)}
            >
              <Minus size={14} />
            </button>
            <FontSizeInput value={settings.fontSize} onCommit={(fontSize) => update({ fontSize })} />
            <button
              type="button"
              className="w11-terminal__icon-button"
              aria-label="Larger text"
              disabled={settings.fontSize >= MAX_FONT_SIZE}
              onClick={() => changeFontSize(1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </Field>

        <Field label="Cursor shape">
          <select
            aria-label="Cursor shape"
            value={settings.cursorShape}
            onChange={(event) => update({ cursorShape: event.target.value as TerminalCursorShape })}
          >
            <option value="bar">Bar</option>
            <option value="block">Block</option>
            <option value="underline">Underline</option>
          </select>
        </Field>

        <Toggle
          label="Blink the cursor"
          checked={settings.cursorBlink}
          hint={reducedMotion ? "Your system asks for reduced motion, so the cursor stays still." : undefined}
          onChange={(cursorBlink) => update({ cursorBlink })}
        />

        <h3 className="w11-terminal__settings-group">Accessibility</h3>

        <Toggle
          label="Screen reader mode"
          hint="Makes the output readable to screen readers. Turn this on if you use one."
          checked={settings.screenReaderMode}
          onChange={(screenReaderMode) => update({ screenReaderMode })}
        />
        <Toggle
          label="Improve text contrast"
          hint="Adjusts text colours that are hard to read against the background."
          checked={settings.improveContrast}
          onChange={(improveContrast) => update({ improveContrast })}
        />

        <h3 className="w11-terminal__settings-group">Behaviour</h3>

        <Field label="Default profile">
          <select
            aria-label="Default profile"
            value={settings.defaultProfile}
            onChange={(event) => update({ defaultProfile: event.target.value as ShellProfileId })}
          >
            {terminalProfiles
              .filter((profile) => profile.kind === "shell")
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
          </select>
        </Field>

        <Toggle label="Copy selected text automatically" checked={settings.copyOnSelect} onChange={(copyOnSelect) => update({ copyOnSelect })} />
        <Toggle
          label="Warn before pasting several lines"
          hint="Pasting more than one line runs each line as a command."
          checked={settings.multiLinePasteWarning}
          onChange={(multiLinePasteWarning) => update({ multiLinePasteWarning })}
        />

        <h3 className="w11-terminal__settings-group">Keyboard</h3>
        <dl className="w11-terminal__shortcuts">
          {TERMINAL_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="w11-terminal__shortcut">
              <dt>
                {shortcut.keys.map((key, index) => (
                  <span key={index}>
                    {index > 0 ? <span aria-hidden="true"> + </span> : null}
                    <kbd>{key}</kbd>
                  </span>
                ))}
              </dt>
              <dd>{shortcut.label}</dd>
            </div>
          ))}
        </dl>

        <button type="button" className="w11-terminal__button" onClick={() => reset()} disabled={isDefault}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset to defaults
        </button>
      </div>
    </section>
  );
}

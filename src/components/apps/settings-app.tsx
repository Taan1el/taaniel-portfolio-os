import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppContent, AppScaffold, SearchInput } from "@/components/apps/app-layout";
import { AboutPage } from "@/components/apps/settings/about-page";
import { AccessibilityPage } from "@/components/apps/settings/accessibility-page";
import { AppsPage } from "@/components/apps/settings/apps-page";
import { DisplayPage } from "@/components/apps/settings/display-page";
import { InputPage } from "@/components/apps/settings/input-page";
import { NetworkPage } from "@/components/apps/settings/network-page";
import { NotificationsPage } from "@/components/apps/settings/notifications-page";
import { PersonalizationPage } from "@/components/apps/settings/personalization-page";
import { PowerPage } from "@/components/apps/settings/power-page";
import { PrivacyPage } from "@/components/apps/settings/privacy-page";
import { SETTINGS_SECTION_ICONS } from "@/components/apps/settings/section-icons";
import { SettingsLinkRow } from "@/components/apps/settings/settings-controls";
import { SoundPage } from "@/components/apps/settings/sound-page";
import { StoragePage } from "@/components/apps/settings/storage-page";
import { SystemPage } from "@/components/apps/settings/system-page";
import { TimePage } from "@/components/apps/settings/time-page";
import { LogoMark } from "@/components/ui/logo-mark";
import { profile } from "@/data/portfolio";
import { searchSettings } from "@/lib/settings-search";
import {
  SETTINGS_SECTIONS,
  getSettingsSection,
  sanitizeSettingsSection,
  type SettingsSectionId,
} from "@/lib/settings-sections";
import { cn } from "@/lib/utils";
import { useProcessStore } from "@/stores/process-store";
import type { AppComponentProps } from "@/types/system";

/**
 * Keeps the window's launch payload on the page being shown. A later deep link
 * to the page the visitor already left (Quick Settings > Sound settings, after
 * browsing elsewhere) then differs from the payload, so it still navigates.
 */
function rememberSection(processId: string, section: SettingsSectionId) {
  const store = useProcessStore.getState();
  const process = store.processes.find((candidate) => candidate.id === processId);

  if (process && process.launchPayload?.section !== section) {
    store.updateProcess(processId, { launchPayload: { ...process.launchPayload, section } });
  }
}

export function SettingsApp({ window }: AppComponentProps) {
  const requestedSection = sanitizeSettingsSection(window.payload?.section);
  const [section, setSection] = useState<SettingsSectionId>(requestedSection);
  const seenRequest = useRef(requestedSection);
  const [query, setQuery] = useState("");
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const results = searchSettings(query);

  // A deep link that arrives while Settings is already open (ms-settings: style).
  useEffect(() => {
    if (seenRequest.current !== requestedSection) {
      seenRequest.current = requestedSection;
      setSection(requestedSection);
    }
  }, [requestedSection]);

  const openSection = (next: SettingsSectionId) => {
    setSection(next);
    seenRequest.current = next;
    rememberSection(window.processId, next);
  };

  const openResult = (result: ReturnType<typeof searchSettings>[number]) => {
    openSection(result.section);
    setQuery("");
    setJumpTo(result.id.startsWith("page:") ? null : result.id);
  };

  // Scroll to the setting a search result named and mark it for a moment.
  useEffect(() => {
    if (!jumpTo || query) return;

    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-setting-id="${CSS.escape(jumpTo)}"]`);
      row?.scrollIntoView({ block: "center" });
      row?.classList.add("is-found");
      globalThis.setTimeout(() => row?.classList.remove("is-found"), 2000);
      setJumpTo(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [jumpTo, query, section]);

  const pages: Record<SettingsSectionId, ReactNode> = {
    system: <SystemPage onOpen={openSection} />,
    display: <DisplayPage />,
    sound: <SoundPage />,
    power: <PowerPage />,
    network: <NetworkPage />,
    personalization: <PersonalizationPage />,
    accessibility: <AccessibilityPage />,
    time: <TimePage />,
    notifications: <NotificationsPage />,
    storage: <StoragePage />,
    apps: <AppsPage />,
    privacy: <PrivacyPage />,
    input: <InputPage />,
    about: <AboutPage />,
  };
  const current = getSettingsSection(section);

  return (
    <AppScaffold className="settings-app w11-settings">
      <div className="w11-settings__layout">
        <nav className="w11-settings__nav" aria-label="Settings">
          <div className="w11-settings__profile">
            <LogoMark size={36} />
            <span className="w11-settings__profile-text">
              <strong>{profile.name}</strong>
              <small>Local account</small>
            </span>
          </div>
          <SearchInput
            containerClassName="w11-settings__search"
            aria-label="Search settings"
            placeholder="Find a setting"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) openResult(results[0]);
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setQuery("");
              }
            }}
          />
          <ul className="w11-settings__nav-list">
            {SETTINGS_SECTIONS.map((item) => {
              const Icon = SETTINGS_SECTION_ICONS[item.id];
              const active = item.id === section;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn("w11-settings__nav-item", active && "is-active")}
                    aria-current={active ? "page" : undefined}
                    onClick={() => openSection(item.id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <AppContent
          padded
          className="w11-settings__page"
          role="region"
          aria-label={query ? "Search results" : current.title}
          data-section={section}
        >
          {query ? (
            <>
              <h1 className="w11-settings__title">Search results</h1>
              <div className="w11-settings__group" role="list" aria-label={`Results for ${query}`}>
                {results.map((result) => {
                  const Icon = SETTINGS_SECTION_ICONS[result.section];

                  return (
                    <SettingsLinkRow
                      key={result.id}
                      icon={<Icon size={18} />}
                      title={result.title}
                      description={result.id.startsWith("page:") ? "Settings page" : `Settings > ${result.pageTitle}`}
                      onOpen={() => openResult(result)}
                    />
                  );
                })}
                {results.length === 0 ? <p className="w11-settings__note">No settings match "{query.trim()}".</p> : null}
              </div>
            </>
          ) : (
            <>
              {/* Personalization keeps its own hero heading, so the page has one h1. */}
              {section === "personalization" ? null : <h1 className="w11-settings__title">{current.title}</h1>}
              {pages[section]}
            </>
          )}
        </AppContent>
      </div>
    </AppScaffold>
  );
}

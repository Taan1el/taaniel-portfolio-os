import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { BrowserTab, type BrowserTabMeta } from "@/components/apps/browser/browser-tab";
import { SiteBadge } from "@/components/apps/browser/site-badge";
import { NEW_TAB_URL } from "@/lib/browser/urlUtils";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

interface TabRecord {
  id: string;
  initialAddress: string;
}

let tabSequence = 0;
const createTabId = () => `tab-${(tabSequence += 1)}`;

export function Browser({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const closeWindow = useSystemStore((state) => state.closeWindow);
  const requestedAddress = useMemo(
    () => window.payload?.externalUrl?.trim() || window.payload?.filePath?.trim() || NEW_TAB_URL,
    [window.payload?.externalUrl, window.payload?.filePath]
  );

  const [{ tabs, activeId }, setTabState] = useState(() => {
    const id = createTabId();
    return { tabs: [{ id, initialAddress: requestedAddress }] as TabRecord[], activeId: id };
  });
  const [meta, setMeta] = useState<Record<string, BrowserTabMeta>>({});

  const handleMeta = useCallback((id: string, next: BrowserTabMeta) => {
    setMeta((current) => {
      const previous = current[id];
      if (previous && previous.title === next.title && previous.url === next.url && previous.loading === next.loading) {
        return current;
      }
      return { ...current, [id]: next };
    });
  }, []);

  const newTab = useCallback((address: string = NEW_TAB_URL) => {
    const id = createTabId();
    setTabState((state) => ({ tabs: [...state.tabs, { id, initialAddress: address }], activeId: id }));
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length === 1) {
        // Closing the last tab closes the window, like a real browser.
        closeWindow(window.id);
        return;
      }
      const index = tabs.findIndex((tab) => tab.id === id);
      const remaining = tabs.filter((tab) => tab.id !== id);
      const nextActive = id === activeId ? (remaining[index] ?? remaining[index - 1]).id : activeId;
      setTabState({ tabs: remaining, activeId: nextActive });
      setMeta(({ [id]: _closed, ...rest }) => rest);
    },
    [activeId, closeWindow, tabs, window.id]
  );

  // A link opened while the browser is already running arrives as a new tab.
  const firstRequest = useRef(requestedAddress);
  useEffect(() => {
    if (requestedAddress === firstRequest.current) return;
    firstRequest.current = requestedAddress;
    newTab(requestedAddress);
  }, [newTab, requestedAddress]);

  const activate = (id: string) => setTabState((state) => ({ ...state, activeId: id }));

  // Ctrl+T, Ctrl+W and Ctrl+Tab are often kept by the real browser; they work wherever the page receives them.
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (!ctrl) return;

    if (key === "t") {
      event.preventDefault();
      newTab();
    } else if (key === "w") {
      event.preventDefault();
      closeTab(activeId);
    } else if (event.key === "Tab") {
      event.preventDefault();
      const index = tabs.findIndex((tab) => tab.id === activeId);
      const step = event.shiftKey ? -1 : 1;
      activate(tabs[(index + step + tabs.length) % tabs.length].id);
    } else if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      const target = event.key === "9" ? tabs.at(-1) : tabs[Number(event.key) - 1];
      if (target) activate(target.id);
    }
  };

  return (
    <AppScaffold className="browser-app w11-browser" onKeyDown={handleKeyDown}>
      <div className="w11-browser__tabs" role="tablist" aria-label="Tabs">
        {tabs.map((tab) => {
          const info = meta[tab.id];
          const isActive = tab.id === activeId;
          const label = info?.title ?? "New tab";
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              className={cn("w11-browser__tab", isActive && "is-active")}
              title={label}
              onClick={() => activate(tab.id)}
              onAuxClick={(event) => {
                // Middle-click closes a tab.
                if (event.button === 1) closeTab(tab.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") activate(tab.id);
              }}
            >
              <span className="w11-browser__tab-icon" aria-hidden="true">
                {info?.loading ? <Loader2 size={14} className="is-spinning" /> : <SiteBadge url={info?.url ?? NEW_TAB_URL} size={16} />}
              </span>
              <span className="w11-browser__tab-title">{label}</span>
              <button
                type="button"
                className="w11-browser__tab-close"
                aria-label={`Close ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <button type="button" className="w11-browser__new-tab" aria-label="New tab" title="New tab" onClick={() => newTab()}>
          <Plus size={16} />
        </button>
      </div>

      <AppContent className="browser-app__content w11-browser__body" padded={false} scrollable={false} stacked={false}>
        {tabs.map((tab) => (
          <BrowserTab
            key={tab.id}
            tabId={tab.id}
            active={tab.id === activeId}
            initialAddress={tab.initialAddress}
            nodes={nodes}
            onMeta={handleMeta}
            onNewTab={newTab}
          />
        ))}
      </AppContent>
    </AppScaffold>
  );
}

import { ArrowLeft, ArrowRight, ExternalLink, Globe2, LoaderCircle, RefreshCcw } from "lucide-react";
import { AppToolbar, Button, IconButton, SearchInput } from "@/components/apps/app-layout";
import {
  proxyModeLabels,
  proxyModes,
  type ProxyMode,
} from "@/lib/browser/proxy";
import type { BrowserLoadState } from "@/lib/browser/types";

interface BrowserToolbarProps {
  address: string;
  displayedUrl: string;
  proxyMode: ProxyMode;
  loadState: BrowserLoadState;
  securityIndicatorTitle: string;
  canGoBack: boolean;
  canGoForward: boolean;
  canOpenExternally: boolean;
  onAddressChange: (value: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onSubmit: () => void;
  onProxyModeChange: (mode: ProxyMode) => void;
  onOpenInNewTab: () => void;
}

export function BrowserToolbar({
  address,
  displayedUrl,
  proxyMode,
  loadState,
  securityIndicatorTitle,
  canGoBack,
  canGoForward,
  canOpenExternally,
  onAddressChange,
  onBack,
  onForward,
  onReload,
  onSubmit,
  onProxyModeChange,
  onOpenInNewTab,
}: BrowserToolbarProps) {
  return (
    <AppToolbar className="browser-app__toolbar">
      <div className="app-toolbar__group">
        <IconButton type="button" disabled={!canGoBack} onClick={onBack} aria-label="Back">
          <ArrowLeft size={15} />
        </IconButton>
        <IconButton type="button" disabled={!canGoForward} onClick={onForward} aria-label="Forward">
          <ArrowRight size={15} />
        </IconButton>
        <IconButton type="button" onClick={onReload} aria-label="Reload">
          <RefreshCcw size={15} />
        </IconButton>
      </div>

      <form
        className="browser-app__address-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <SearchInput
          containerClassName="browser-app__address"
          placeholder="Enter a URL, search, or /local/path"
          title={displayedUrl}
          type="text"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          icon={<Globe2 size={14} />}
        />
      </form>

      <div className="browser-app__mode-cluster">
        <label className="browser-app__proxy-select-shell" title={securityIndicatorTitle}>
          <select
            className="browser-app__proxy-select"
            aria-label="Proxy mode"
            value={proxyMode}
            onChange={(event) => onProxyModeChange(event.target.value as ProxyMode)}
          >
            {proxyModes.map((mode) => (
              <option key={mode} value={mode}>
                {proxyModeLabels[mode]}
              </option>
            ))}
          </select>
        </label>

        {loadState === "loading" ? (
          <span className="browser-app__loading-chip" aria-live="polite">
            <LoaderCircle size={13} />
            <span>Loading</span>
          </span>
        ) : null}
      </div>

      <Button type="button" variant="panel" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
        <ExternalLink size={15} />
        Open in new tab
      </Button>
    </AppToolbar>
  );
}

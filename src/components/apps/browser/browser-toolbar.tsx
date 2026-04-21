import { ArrowLeft, ArrowRight, ExternalLink, Globe2, RefreshCcw } from "lucide-react";
import { AppToolbar, Button, IconButton, SearchInput } from "@/components/apps/app-layout";
import {
  proxyModeLabels,
  type ProxyMode,
} from "@/lib/browser/proxy";

interface BrowserToolbarProps {
  address: string;
  proxyMode: ProxyMode;
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

const proxyModes = Object.keys(proxyModeLabels) as ProxyMode[];

export function BrowserToolbar({
  address,
  proxyMode,
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
          placeholder="Enter a URL, search, or local file path"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          icon={<Globe2 size={14} />}
        />
      </form>

      <div className="browser-app__proxy-group" role="group" aria-label="Proxy mode">
        {proxyModes.map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={proxyMode === mode ? "panel" : "ghost"}
            onClick={() => onProxyModeChange(mode)}
          >
            {proxyModeLabels[mode]}
          </Button>
        ))}
      </div>

      <Button type="button" variant="panel" onClick={onOpenInNewTab} disabled={!canOpenExternally}>
        <ExternalLink size={15} />
        Open in new tab
      </Button>
    </AppToolbar>
  );
}

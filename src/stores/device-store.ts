import { create } from "zustand";
import {
  isNetworkBlocked,
  resolveBatteryState,
  resolveNetworkStatus,
  type BatteryReading,
  type NetworkStatus,
} from "@/lib/device-status";

/**
 * Live device readings for the tray. Nothing here is persisted: Wi-Fi and
 * airplane mode reset every session, so a returning visitor never lands on a
 * Browser that is "offline" because of a switch they forgot about.
 */
interface DeviceState {
  browserOnline: boolean;
  wifiEnabled: boolean;
  airplaneMode: boolean;
  /** Wi-Fi state to restore when airplane mode turns off. */
  wifiBeforeAirplane: boolean;
  /** navigator.connection.effectiveType, when the browser exposes it. */
  effectiveType: string | null;
  /** True once the Battery Status API answered at all. */
  batterySupported: boolean;
  /** Latest reading; null while unknown or when the device has no battery. */
  battery: BatteryReading | null;
  /** True once a reading only a real battery gives has been seen this session; see resolveBatteryState. */
  batteryLatched: boolean;
  setBrowserOnline: (online: boolean) => void;
  setWifiEnabled: (enabled: boolean) => void;
  toggleWifi: () => void;
  setAirplaneMode: (enabled: boolean) => void;
  toggleAirplaneMode: () => void;
  setEffectiveType: (effectiveType: string | null) => void;
  setBatteryReading: (reading: BatteryReading | null) => void;
  resetDevice: () => void;
}

function readBrowserOnline() {
  return typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;
}

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
}

interface BatteryManagerLike extends EventTarget, BatteryReading {}

interface DeviceNavigator extends Navigator {
  connection?: NetworkInformationLike;
  getBattery?: () => Promise<BatteryManagerLike>;
}

function getConnection() {
  return typeof navigator === "undefined" ? undefined : (navigator as DeviceNavigator).connection;
}

const initialDeviceState = {
  browserOnline: readBrowserOnline(),
  wifiEnabled: true,
  airplaneMode: false,
  wifiBeforeAirplane: true,
  effectiveType: getConnection()?.effectiveType ?? null,
  batterySupported: false,
  battery: null,
  batteryLatched: false,
};

export const useDeviceStore = create<DeviceState>()((set) => ({
  ...initialDeviceState,
  setBrowserOnline: (browserOnline) => set({ browserOnline }),
  setWifiEnabled: (wifiEnabled) => set({ wifiEnabled }),
  toggleWifi: () => set((state) => ({ wifiEnabled: !state.wifiEnabled })),
  setAirplaneMode: (enabled) =>
    set((state) => {
      if (enabled === state.airplaneMode) {
        return state;
      }

      return enabled
        ? { airplaneMode: true, wifiBeforeAirplane: state.wifiEnabled, wifiEnabled: false }
        : { airplaneMode: false, wifiEnabled: state.wifiBeforeAirplane };
    }),
  toggleAirplaneMode: () => useDeviceStore.getState().setAirplaneMode(!useDeviceStore.getState().airplaneMode),
  setEffectiveType: (effectiveType) => set({ effectiveType }),
  setBatteryReading: (reading) =>
    set((state) => {
      const { battery, latched } = resolveBatteryState(reading, state.batteryLatched);
      return { batterySupported: true, battery, batteryLatched: latched };
    }),
  resetDevice: () => set({ ...initialDeviceState, browserOnline: readBrowserOnline() }),
}));

type NetworkSlice = Pick<DeviceState, "browserOnline" | "wifiEnabled" | "airplaneMode">;

export const selectNetworkStatus = (state: NetworkSlice): NetworkStatus => resolveNetworkStatus(state);
export const selectIsNetworkBlocked = (state: NetworkSlice): boolean => isNetworkBlocked(state);

/**
 * Plain, non-React read for code outside components (the terminal's
 * ShellHost.isOffline, fetch helpers). True while airplane mode, Wi-Fi off or
 * a real browser outage keeps the virtual OS off the network.
 */
export function getIsNetworkBlocked(): boolean {
  return selectIsNetworkBlocked(useDeviceStore.getState());
}

/**
 * Starts the online/offline, connection and battery listeners. Returns a
 * cleanup, so React effects (and Strict Mode's double run) stay balanced.
 */
export function startDeviceWatchers(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const store = useDeviceStore.getState();
  const cleanups: Array<() => void> = [];
  let disposed = false;

  const syncOnline = () => store.setBrowserOnline(readBrowserOnline());
  syncOnline();
  window.addEventListener("online", syncOnline);
  window.addEventListener("offline", syncOnline);
  cleanups.push(() => {
    window.removeEventListener("online", syncOnline);
    window.removeEventListener("offline", syncOnline);
  });

  const connection = getConnection();
  if (connection && typeof connection.addEventListener === "function") {
    const syncConnection = () => store.setEffectiveType(connection.effectiveType ?? null);
    syncConnection();
    connection.addEventListener("change", syncConnection);
    cleanups.push(() => connection.removeEventListener("change", syncConnection));
  }

  const getBattery = (navigator as DeviceNavigator).getBattery;
  if (typeof getBattery === "function") {
    void getBattery
      .call(navigator)
      .then((battery) => {
        if (disposed) {
          return;
        }

        const syncBattery = () =>
          store.setBatteryReading({
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          });
        const events = ["levelchange", "chargingchange", "chargingtimechange", "dischargingtimechange"];

        syncBattery();
        events.forEach((name) => battery.addEventListener(name, syncBattery));
        cleanups.push(() => events.forEach((name) => battery.removeEventListener(name, syncBattery)));
      })
      .catch(() => undefined);
  }

  return () => {
    disposed = true;
    cleanups.splice(0).forEach((cleanup) => cleanup());
  };
}

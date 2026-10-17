// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getIsNetworkBlocked,
  selectNetworkStatus,
  startDeviceWatchers,
  useDeviceStore,
} from "@/stores/device-store";

describe("device store", () => {
  beforeEach(() => {
    useDeviceStore.getState().resetDevice();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts online with Wi-Fi on", () => {
    expect(selectNetworkStatus(useDeviceStore.getState())).toBe("connected");
    expect(getIsNetworkBlocked()).toBe(false);
  });

  it("restores the earlier Wi-Fi state when airplane mode turns off", () => {
    const store = useDeviceStore.getState();
    store.setAirplaneMode(true);
    expect(useDeviceStore.getState().wifiEnabled).toBe(false);
    expect(getIsNetworkBlocked()).toBe(true);
    store.setAirplaneMode(false);
    expect(useDeviceStore.getState().wifiEnabled).toBe(true);

    store.setWifiEnabled(false);
    store.toggleAirplaneMode();
    store.toggleAirplaneMode();
    expect(useDeviceStore.getState().wifiEnabled).toBe(false);
  });

  it("drops desktop battery readings", () => {
    useDeviceStore.getState().setBatteryReading({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity });
    expect(useDeviceStore.getState()).toMatchObject({ batterySupported: true, battery: null });
  });

  it("keeps a laptop's battery on show when it reaches full and plugged in", () => {
    const { setBatteryReading } = useDeviceStore.getState();
    setBatteryReading({ level: 0.97, charging: true, chargingTime: 300, dischargingTime: Infinity });
    expect(useDeviceStore.getState().battery?.level).toBe(0.97);

    // Chrome now answers exactly as it does on a desktop PC.
    setBatteryReading({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity });
    expect(useDeviceStore.getState()).toMatchObject({ batteryLatched: true, battery: { level: 1, charging: true } });

    setBatteryReading({ level: 1, charging: false, chargingTime: Infinity, dischargingTime: 20000 });
    expect(useDeviceStore.getState().battery?.charging).toBe(false);
  });

  it("forgets the latch when the device state is reset", () => {
    useDeviceStore.getState().setBatteryReading({ level: 0.5, charging: false, chargingTime: Infinity, dischargingTime: 5000 });
    useDeviceStore.getState().resetDevice();
    useDeviceStore.getState().setBatteryReading({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity });
    expect(useDeviceStore.getState().battery).toBeNull();
  });

  it("follows the browser's online and offline events", () => {
    const stop = startDeviceWatchers();
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    expect(selectNetworkStatus(useDeviceStore.getState())).toBe("no-internet");

    onLine.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    expect(selectNetworkStatus(useDeviceStore.getState())).toBe("connected");
    stop();

    onLine.mockReturnValue(false);
    window.dispatchEvent(new Event("offline"));
    expect(useDeviceStore.getState().browserOnline).toBe(true);
  });

  it("reads and follows the battery when the API exists", async () => {
    const battery = Object.assign(new EventTarget(), {
      level: 0.5,
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 7200,
    });
    Object.defineProperty(navigator, "getBattery", { configurable: true, value: () => Promise.resolve(battery) });

    const stop = startDeviceWatchers();
    await vi.waitFor(() => expect(useDeviceStore.getState().battery?.level).toBe(0.5));

    battery.level = 0.4;
    battery.dispatchEvent(new Event("levelchange"));
    expect(useDeviceStore.getState().battery?.level).toBe(0.4);

    stop();
    battery.level = 0.3;
    battery.dispatchEvent(new Event("levelchange"));
    expect(useDeviceStore.getState().battery?.level).toBe(0.4);
    Reflect.deleteProperty(navigator, "getBattery");
  });
});

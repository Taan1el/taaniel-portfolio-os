export interface LiveChannel {
  id: string;
  /** One or two characters for the channel's tile. */
  mark: string;
  name: string;
  description: string;
  kind: "tv" | "radio";
  url: string;
}

/**
 * Public broadcasters' own HTTPS streams, checked by hand. Plain http streams from
 * iptv-org cannot play on an https page, and its mirrors of paid channels stay out.
 * The viewer's browser pulls these straight from the broadcaster.
 */
export const LIVE_CHANNELS: LiveChannel[] = [
  { id: "etv", mark: "1", name: "ETV", description: "Estonia's main public channel", kind: "tv", url: "https://sb.err.ee/live/etv.m3u8" },
  { id: "etv2", mark: "2", name: "ETV2", description: "Culture, films and children's shows", kind: "tv", url: "https://sb.err.ee/live/etv2.m3u8" },
  { id: "etv-plus", mark: "+", name: "ETV+", description: "ERR's Russian-language channel", kind: "tv", url: "https://sb.err.ee/live/etvpluss.m3u8" },
  { id: "riigikogu", mark: "RK", name: "Riigikogu", description: "Live from the Estonian parliament", kind: "tv", url: "https://router.euddn.net/862366dd346d6b6392d5231546f3d179/smil:rk_live_1.smil/playlist.m3u8?c=8005" },
  { id: "vikerraadio", mark: "V", name: "Vikerraadio", description: "News and talk", kind: "radio", url: "https://icecast.err.ee/vikerraadio.mp3" },
  { id: "raadio2", mark: "R2", name: "Raadio 2", description: "New music", kind: "radio", url: "https://icecast.err.ee/raadio2.mp3" },
  { id: "klassikaraadio", mark: "K", name: "Klassikaraadio", description: "Classical and jazz", kind: "radio", url: "https://icecast.err.ee/klassikaraadio.mp3" },
  { id: "raadio4", mark: "R4", name: "Raadio 4", description: "In Russian", kind: "radio", url: "https://icecast.err.ee/raadio4.mp3" },
  { id: "raadio-tallinn", mark: "RT", name: "Raadio Tallinn", description: "Music and the capital's news", kind: "radio", url: "https://icecast.err.ee/raadiotallinn.mp3" },
];

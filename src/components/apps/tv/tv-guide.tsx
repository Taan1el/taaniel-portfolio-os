import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Search, Star } from "lucide-react";
import type { LiveChannel } from "@/data/live-channels";
import { prefersStillMotion } from "@/lib/motion";
import { programmeAt, type TvGuideData } from "@/lib/tv-guide";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function ChannelLogo({ channel }: { channel: LiveChannel }) {
  const [broken, setBroken] = useState(false);

  return (
    <span className="tv__logo" aria-hidden="true">
      {channel.logo && !broken ? (
        <img src={channel.logo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        channel.mark
      )}
    </span>
  );
}

export function TvGuide({
  tabs,
  tab,
  onTab,
  query,
  onQuery,
  categories,
  category,
  onCategory,
  channels,
  numberOf,
  currentId,
  favourites,
  offAir,
  guide,
  now,
  onPlay,
  onFavourite,
}: {
  tabs: { id: string; label: string }[];
  tab: string;
  onTab: (id: string) => void;
  query: string;
  onQuery: (value: string) => void;
  categories: string[];
  category: string;
  onCategory: (value: string) => void;
  channels: LiveChannel[];
  numberOf: (channel: LiveChannel) => number;
  currentId?: string;
  favourites: string[];
  offAir: string[];
  guide: TvGuideData;
  now: number;
  onPlay: (channel: LiveChannel) => void;
  onFavourite: (id: string) => void;
}) {
  const listRef = useRef<HTMLUListElement | null>(null);

  // A new line-up deals itself in. The list stays still while someone types.
  useGSAP(
    () => {
      if (prefersStillMotion() || query) return;
      gsap.from(".tv__row", { opacity: 0, x: -10, duration: 0.24, ease: "power2.out", stagger: { amount: 0.22 }, clearProps: "all" });
    },
    { scope: listRef, dependencies: [tab, category], revertOnUpdate: true }
  );

  return (
    <aside className="tv__guide" aria-label="Channels">
      <div className="tv__tabs" role="group" aria-label="Line-up">
        {tabs.map((entry) => (
          <button key={entry.id} type="button" className={cn(tab === entry.id && "is-active")} aria-pressed={tab === entry.id} onClick={() => onTab(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>

      <label className="tv__search">
        <Search size={14} aria-hidden="true" />
        <input type="search" placeholder="Find a channel" aria-label="Find a channel" value={query} onChange={(event) => onQuery(event.target.value)} />
      </label>

      {categories.length > 1 ? (
        <div className="tv__chips" role="group" aria-label="Category">
          {["All", ...categories].map((entry) => (
            <button key={entry} type="button" className={cn(category === entry && "is-active")} aria-pressed={category === entry} onClick={() => onCategory(entry)}>
              {entry}
            </button>
          ))}
        </div>
      ) : null}

      {channels.length > 0 ? (
        <ul ref={listRef} className="tv__list">
          {channels.map((channel) => {
            const favourite = favourites.includes(channel.id);
            const down = offAir.includes(channel.id);
            const onNow = programmeAt(guide[channel.id], now)?.current.title;

            return (
              <li key={channel.id} className={cn("tv__row", currentId === channel.id && "is-active", down && "is-down")}>
                <button type="button" className="tv__tune" aria-current={currentId === channel.id ? "true" : undefined} onClick={() => onPlay(channel)}>
                  <span className="tv__number">{String(numberOf(channel)).padStart(2, "0")}</span>
                  <ChannelLogo channel={channel} />
                  <span className="tv__row-text">
                    <strong>{channel.name}</strong>
                    <small>{down ? "Off air right now" : (onNow ?? channel.category)}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={cn("tv__star", favourite && "is-on")}
                  aria-label={`Save ${channel.name}`}
                  aria-pressed={favourite}
                  onClick={() => onFavourite(channel.id)}
                >
                  <Star size={14} fill={favourite ? "currentColor" : "none"} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="tv__none">{tab === "saved" && !query ? "Star a channel to keep it here." : "No channels match."}</p>
      )}

      <p className="tv__credit">Free public streams, found through iptv-org. Some stop or stay in their own country. Programme names come from public listings and can be out.</p>
    </aside>
  );
}

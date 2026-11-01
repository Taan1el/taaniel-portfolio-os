import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface CodeCommand {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
}

export interface CodeMenu {
  label: string;
  /** Command ids; "-" draws a line. */
  items: string[];
}

export function CodeMenuBar({ menus, commands }: { menus: CodeMenu[]; commands: CodeCommand[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open === null) return undefined;
    const close = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  const itemsIn = () => [...(barRef.current?.querySelectorAll<HTMLButtonElement>(".code-app__dropdown [role=menuitem]:not(:disabled)") ?? [])];

  useEffect(() => {
    if (open !== null) itemsIn()[0]?.focus();
  }, [open]);

  const handleKey = (event: KeyboardEvent) => {
    if (open === null) return;
    const items = itemsIn();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "Escape") setOpen(null);
    else if (event.key === "ArrowRight") setOpen((open + 1) % menus.length);
    else if (event.key === "ArrowLeft") setOpen((open - 1 + menus.length) % menus.length);
    else if (event.key === "ArrowDown") items[(index + 1) % items.length]?.focus();
    else if (event.key === "ArrowUp") items[(index - 1 + items.length) % items.length]?.focus();
    else return;

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div ref={barRef} className="code-app__menus" role="menubar" aria-label="Code menu" onKeyDown={handleKey}>
      {menus.map((menu, position) => (
        <div key={menu.label} className="code-app__menu">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === position}
            className={cn(open === position && "is-open")}
            onClick={() => setOpen(open === position ? null : position)}
            onPointerEnter={() => open !== null && setOpen(position)}
          >
            {menu.label}
          </button>
          {open === position ? (
            <div className="code-app__dropdown" role="menu" aria-label={menu.label}>
              {menu.items.map((id, index) => {
                if (id === "-") return <hr key={index} />;
                const command = commands.find((entry) => entry.id === id);
                if (!command) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    disabled={command.disabled}
                    onClick={() => {
                      setOpen(null);
                      command.run();
                    }}
                  >
                    <span>{command.label}</span>
                    {command.hint ? <small>{command.hint}</small> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

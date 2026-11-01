import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  Minus,
  Paperclip,
  PenLine,
  Phone,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { getResumeDownloadUrls, profile, repoUrl, resumeAlternate, socialLinks } from "@/data/portfolio";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/contact-mail.css";

const STARRED_KEY = "taaniel-os-mail-starred";
const SENT_KEY = "taaniel-os-mail-sent";
const READ_KEY = "taaniel-os-mail-read";

interface MailLink {
  label: string;
  detail?: string;
  href: string;
  download?: boolean;
}

interface Message {
  id: string;
  subject: string;
  snippet: string;
  body: string[];
  links?: MailLink[];
}

interface SentMessage {
  id: string;
  subject: string;
  body: string;
}

type Folder = "inbox" | "starred" | "sent";

const INBOX: Message[] = [
  {
    id: "hello",
    subject: "Get in touch",
    snippet: "Email is the best way to reach me.",
    body: [
      `Hi, I'm ${profile.name}, based in ${profile.location}.`,
      profile.availability,
      "Email is the best way to reach me. Press Compose, or use the buttons at the top of this inbox.",
    ],
    links: [
      { label: profile.emailText, detail: "Email", href: profile.email },
      { label: profile.phoneText, detail: "Phone", href: profile.phone },
    ],
  },
  {
    id: "cv",
    subject: "My CV",
    snippet: "The same PDF as Resume.pdf on the desktop.",
    body: ["Here is my CV as a PDF, the same file as Resume.pdf on the desktop."],
    links: [
      { label: "Taaniel Vananurm CV", detail: "PDF", href: getResumeDownloadUrls()[0], download: true },
      { label: resumeAlternate.label, detail: "PDF", href: resumeAlternate.href, download: true },
    ],
  },
  {
    id: "links",
    subject: "Where to find me online",
    snippet: socialLinks.map((link) => link.label).join(", "),
    body: ["My profiles, and the source code of this OS."],
    links: [
      ...socialLinks.map((link) => ({ label: link.label, detail: "Profile", href: link.url })),
      { label: "Source code", detail: "GitHub", href: repoUrl },
    ],
  },
  {
    id: "about-inbox",
    subject: "How this inbox works",
    snippet: "Compose opens your own email app.",
    body: [
      "This site has no server, so it cannot send mail by itself.",
      "Compose writes your message here, then opens it in your own email app, ready to send. Messages listed under Sent stay in this browser.",
    ],
  },
];

function readList<T>(key: string, isValid: (entry: unknown) => entry is T): T[] {
  try {
    const saved: unknown = JSON.parse(readLocalStorage(key) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isValid) : [];
  } catch {
    return [];
  }
}

const isString = (entry: unknown): entry is string => typeof entry === "string";
const isSent = (entry: unknown): entry is SentMessage => {
  const value = entry as Partial<SentMessage> | null;
  return typeof value?.id === "string" && typeof value.subject === "string" && typeof value.body === "string";
};

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast("Copied to clipboard", "success");
  } catch {
    toast("Could not access clipboard", "error");
  }
}

function Compose({
  initialSubject,
  onClose,
  onSend,
}: {
  initialSubject: string;
  onClose: () => void;
  onSend: (subject: string, body: string) => void;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [minimised, setMinimised] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialSubject) bodyRef.current?.focus();
    else firstFieldRef.current?.focus();
  }, [initialSubject]);

  const send = () => onSend(subject.trim() || "Hello", body);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form className={cn("mail__compose", minimised && "is-minimised")} aria-label="New message" onSubmit={submit} onKeyDown={handleKeyDown}>
      <header>
        <strong>{subject.trim() || "New message"}</strong>
        <button type="button" aria-label={minimised ? "Restore" : "Minimise"} onClick={() => setMinimised((value) => !value)}>
          <Minus size={16} />
        </button>
        <button type="button" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      {minimised ? null : (
        <>
          <p className="mail__field">
            <span>To</span>
            <span className="mail__recipient">
              <span className="mail__avatar mail__avatar--small" aria-hidden="true">
                {profile.name[0]}
              </span>
              {profile.emailText}
            </span>
          </p>
          <label className="mail__field">
            <span className="sr-only">Subject</span>
            <input ref={firstFieldRef} placeholder="Subject" maxLength={150} value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <textarea
            ref={bodyRef}
            aria-label="Message"
            placeholder="Write your message"
            maxLength={1500}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <footer>
            <button type="submit" className="mail__send">
              Send
              <Send size={14} aria-hidden="true" />
            </button>
            <small>Opens in your email app</small>
            <button type="button" className="mail__discard" aria-label="Discard" title="Discard" onClick={onClose}>
              <Trash2 size={16} />
            </button>
          </footer>
        </>
      )}
    </form>
  );
}

export function ContactApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [folder, setFolder] = useState<Folder>("inbox");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ subject: string } | null>(null);
  const [starred, setStarred] = useState(() => readList(STARRED_KEY, isString));
  const [read, setRead] = useState(() => readList(READ_KEY, isString));
  const [sent, setSent] = useState(() => readList(SENT_KEY, isSent));

  const sentAsMessages = useMemo<Message[]>(
    () => sent.map((entry) => ({ id: entry.id, subject: entry.subject, snippet: entry.body, body: [entry.body] })),
    [sent]
  );
  const shown = useMemo(() => {
    const source = folder === "sent" ? sentAsMessages : INBOX.filter((entry) => folder === "inbox" || starred.includes(entry.id));
    const needle = query.trim().toLowerCase();
    return needle
      ? source.filter((entry) => `${entry.subject} ${entry.body.join(" ")}`.toLowerCase().includes(needle))
      : source;
  }, [folder, query, sentAsMessages, starred]);
  const open = [...INBOX, ...sentAsMessages].find((entry) => entry.id === openId);
  const unread = INBOX.filter((entry) => !read.includes(entry.id)).length;
  const isRead = (id: string) => folder === "sent" || read.includes(id);

  const toggleStar = (id: string) => {
    const next = starred.includes(id) ? starred.filter((entry) => entry !== id) : [...starred, id];
    setStarred(next);
    writeLocalStorage(STARRED_KEY, JSON.stringify(next));
  };

  const openMessage = (id: string) => {
    setOpenId(id);
    if (folder === "sent" || read.includes(id)) return;
    const next = [...read, id];
    setRead(next);
    writeLocalStorage(READ_KEY, JSON.stringify(next));
  };

  const send = (subject: string, body: string) => {
    const next = [{ id: `sent-${Date.now()}`, subject, body }, ...sent];
    setSent(next);
    writeLocalStorage(SENT_KEY, JSON.stringify(next));
    setComposing(null);
    setFolder("sent");
    setOpenId(null);
    globalThis.window.location.href = `${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const folders: { id: Folder; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: unread || undefined },
    { id: "starred", label: "Starred", icon: Star },
    { id: "sent", label: "Sent", icon: Send },
  ];
  const folderLabel = folders.find((entry) => entry.id === folder)?.label;

  return (
    <div className="mail">
      <div className="mail__frame">
      <header className="mail__top">
        <span className="mail__brand">
          <Mail size={20} aria-hidden="true" />
          Mail
        </span>
        <label className="mail__search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search mail" aria-label="Search mail" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </header>

      <nav className="mail__rail" aria-label="Mail">
        <button type="button" className="mail__compose-button" onClick={() => setComposing({ subject: "" })}>
          <PenLine size={18} aria-hidden="true" />
          <span>Compose</span>
        </button>
        {folders.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            className={cn("mail__folder", folder === id && "is-active")}
            aria-current={folder === id ? "page" : undefined}
            onClick={() => {
              setFolder(id);
              setOpenId(null);
            }}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
            {count ? <small aria-label={`${count} unread`}>{count}</small> : null}
          </button>
        ))}
      </nav>

      <main className="mail__main">
        {open ? (
          <article className="mail__reader">
            <div className="mail__toolbar">
              <button type="button" className="mail__back" aria-label="Back" onClick={() => setOpenId(null)}>
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mail__letter">
              <h1>{open.subject}</h1>
              <div className="mail__from">
                <span className="mail__avatar" aria-hidden="true">
                  {profile.name[0]}
                </span>
                <span>
                  <strong>{folder === "sent" ? "You" : profile.name}</strong>
                  <small>{folder === "sent" ? `to ${profile.emailText}` : `${profile.emailText}, to you`}</small>
                </span>
              </div>
              <div className="mail__body">
                {open.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {open.links ? (
                <ul className="mail__attachments">
                  {open.links.map((link) => {
                    const external = link.href.startsWith("http") && !link.download;
                    const Icon = link.download ? FileText : external ? ExternalLink : link.href.startsWith("tel:") ? Phone : Mail;

                    return (
                      <li key={link.label}>
                        <a href={link.href} download={link.download} target={external ? "_blank" : undefined} rel="noreferrer">
                          <Icon size={18} aria-hidden="true" />
                          <span>
                            <strong>{link.label}</strong>
                            {link.detail ? <small>{link.detail}</small> : null}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {folder === "sent" ? null : (
                <button type="button" className="mail__reply" onClick={() => setComposing({ subject: `Re: ${open.subject}` })}>
                  <Reply size={16} aria-hidden="true" />
                  Reply
                </button>
              )}
            </div>
          </article>
        ) : (
          <>
            <div className="mail__toolbar">
              <h1>{folderLabel}</h1>
              <small>{shown.length === 0 ? "No messages" : `1-${shown.length} of ${shown.length}`}</small>
            </div>

            {folder === "inbox" && !query ? (
              <section className="mail__card" aria-label="Quick contact">
                <span className="mail__avatar mail__avatar--large" aria-hidden="true">
                  {profile.name[0]}
                </span>
                <span className="mail__card-text">
                  <strong>{profile.name}</strong>
                  <small>{profile.role}</small>
                </span>
                <span className="mail__quick">
                  <a href={profile.email}>
                    <Mail size={14} aria-hidden="true" />
                    Email me
                  </a>
                  <button type="button" onClick={() => void copy(profile.emailText)}>
                    <Copy size={14} aria-hidden="true" />
                    Copy address
                  </button>
                  <a href={profile.phone}>
                    <Phone size={14} aria-hidden="true" />
                    Call
                  </a>
                  <a href={getResumeDownloadUrls()[0]} download>
                    <Download size={14} aria-hidden="true" />
                    CV
                  </a>
                </span>
              </section>
            ) : null}

            {shown.length > 0 ? (
              <ul className="mail__list">
                {shown.map((entry) => (
                  <li key={entry.id} className={cn("mail__row", !isRead(entry.id) && "is-unread")}>
                    {folder === "sent" ? (
                      <span className="mail__star-space" />
                    ) : (
                      <button
                        type="button"
                        className={cn("mail__star", starred.includes(entry.id) && "is-on")}
                        aria-label={`Star ${entry.subject}`}
                        aria-pressed={starred.includes(entry.id)}
                        onClick={() => toggleStar(entry.id)}
                      >
                        <Star size={16} fill={starred.includes(entry.id) ? "currentColor" : "none"} />
                      </button>
                    )}
                    <button type="button" className="mail__open" onClick={() => openMessage(entry.id)}>
                      <span className="mail__sender">{folder === "sent" ? "To: Taaniel" : profile.name}</span>
                      <span className="mail__line">
                        <span className="mail__subject">{entry.subject}</span>
                        {entry.snippet ? <span className="mail__snippet">{entry.snippet}</span> : null}
                      </span>
                      {entry.links ? <Paperclip className="mail__clip" size={14} aria-label="Has links" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mail__empty">{query ? "No messages match your search." : `Nothing in ${folderLabel} yet.`}</p>
            )}
          </>
        )}
      </main>

      {composing ? <Compose initialSubject={composing.subject} onClose={() => setComposing(null)} onSend={send} /> : null}
      </div>
    </div>
  );
}

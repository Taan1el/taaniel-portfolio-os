import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  File,
  Inbox,
  Mail,
  PenLine,
  Phone,
  Search,
  Send,
  Star,
  X,
} from "lucide-react";
import { getResumeDownloadUrls, profile, repoUrl, socialLinks } from "@/data/portfolio";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/contact-mail.css";

const STARRED_KEY = "taaniel-os-mail-starred";
const SENT_KEY = "taaniel-os-mail-sent";

interface MailLink {
  label: string;
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
      { label: profile.emailText, href: profile.email },
      { label: profile.phoneText, href: profile.phone },
    ],
  },
  {
    id: "cv",
    subject: "My CV",
    snippet: "The same PDF as Resume.pdf on the desktop.",
    body: ["Here is my CV as a PDF, the same file as Resume.pdf on the desktop."],
    links: [{ label: "CV_Taaniel_Vananurm.pdf", href: getResumeDownloadUrls()[0], download: true }],
  },
  {
    id: "links",
    subject: "Where to find me online",
    snippet: socialLinks.map((link) => link.label).join(", "),
    body: ["My profiles, and the source code of this OS."],
    links: [...socialLinks.map((link) => ({ label: link.label, href: link.url })), { label: "Source code", href: repoUrl }],
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

function Compose({ onClose, onSend }: { onClose: () => void; onSend: (subject: string, body: string) => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend(subject.trim() || "Hello", body);
  };

  return (
    <form className="mail__compose" aria-label="New message" onSubmit={submit}>
      <header>
        <strong>New message</strong>
        <button type="button" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <p className="mail__compose-to">
        To <span>{profile.emailText}</span>
      </p>
      <input
        aria-label="Subject"
        placeholder="Subject"
        maxLength={150}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <textarea
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
      </footer>
    </form>
  );
}

export function ContactApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [folder, setFolder] = useState<Folder>("inbox");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [starred, setStarred] = useState(() => readList(STARRED_KEY, isString));
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

  const toggleStar = (id: string) => {
    const next = starred.includes(id) ? starred.filter((entry) => entry !== id) : [...starred, id];
    setStarred(next);
    writeLocalStorage(STARRED_KEY, JSON.stringify(next));
  };

  const send = (subject: string, body: string) => {
    const next = [{ id: `sent-${Date.now()}`, subject, body }, ...sent];
    setSent(next);
    writeLocalStorage(SENT_KEY, JSON.stringify(next));
    setComposing(false);
    setFolder("sent");
    setOpenId(null);
    globalThis.window.location.href = `${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const folders: { id: Folder; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: INBOX.length },
    { id: "starred", label: "Starred", icon: Star, count: starred.length || undefined },
    { id: "sent", label: "Sent", icon: Send, count: sent.length || undefined },
  ];

  return (
    <div className="mail">
      <nav className="mail__rail" aria-label="Mail">
        <button type="button" className="mail__compose-button" onClick={() => setComposing(true)}>
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
            {count ? <small>{count}</small> : null}
          </button>
        ))}
      </nav>

      <div className="mail__main">
        <label className="mail__search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search mail" aria-label="Search mail" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>

        <div className="mail__quick" role="group" aria-label="Quick contact">
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
            Download CV
          </a>
        </div>

        {open ? (
          <article className="mail__reader">
            <button type="button" className="mail__back" onClick={() => setOpenId(null)}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
            <h1>{open.subject}</h1>
            <p className="mail__from">
              <span className="mail__avatar" aria-hidden="true">
                {profile.name[0]}
              </span>
              <span>
                <strong>{folder === "sent" ? "You" : profile.name}</strong>
                <small>{folder === "sent" ? `to ${profile.emailText}` : profile.emailText}</small>
              </span>
            </p>
            {open.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {open.links ? (
              <div className="mail__attachments">
                {open.links.map((link) => (
                  <a key={link.label} href={link.href} download={link.download} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    <File size={14} aria-hidden="true" />
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </article>
        ) : shown.length > 0 ? (
          <ul className="mail__list">
            {shown.map((entry) => (
              <li key={entry.id} className="mail__row">
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
                <button type="button" className="mail__open" onClick={() => setOpenId(entry.id)}>
                  <strong>{folder === "sent" ? "You" : profile.name}</strong>
                  <span>
                    <b>{entry.subject}</b> {entry.snippet ? `- ${entry.snippet}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mail__empty">{query ? "No messages match your search." : `Nothing in ${folder} yet.`}</p>
        )}
      </div>

      {composing ? <Compose onClose={() => setComposing(false)} onSend={send} /> : null}
    </div>
  );
}

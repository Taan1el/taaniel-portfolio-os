import { Copy, ExternalLink, Mail, Phone } from "lucide-react";
import { profile, socialLinks } from "@/data/portfolio";
import type { AppComponentProps } from "@/types/system";

function copyToClipboard(value: string) {
  void navigator.clipboard?.writeText(value);
}

export function ContactApp({ window }: AppComponentProps) {
  void window;

  return (
    <div className="app-screen contact-app">
      <section className="glass-card contact-app__hero">
        <div>
          <p className="eyebrow">Contact</p>
          <h1>{profile.name}</h1>
          <p>{profile.location}</p>
        </div>
        <a className="ghost-button" href={profile.email}>
          <Mail size={15} />
          Compose email
        </a>
      </section>

      <div className="contact-app__grid">
        <article className="glass-card contact-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Email</p>
              <h2>{profile.emailText}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => copyToClipboard(profile.emailText)}>
              <Copy size={15} />
              Copy
            </button>
          </div>
          <a className="inline-link" href={profile.email}>
            <Mail size={15} />
            Compose email
          </a>
        </article>

        <article className="glass-card contact-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Phone</p>
              <h2>{profile.phoneText}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => copyToClipboard(profile.phoneText)}>
              <Copy size={15} />
              Copy
            </button>
          </div>
          <a className="inline-link" href={profile.phone}>
            <Phone size={15} />
            Call directly
          </a>
        </article>
      </div>

      <article className="glass-card contact-app__links">
        <div className="section-row">
          <p className="eyebrow">Links</p>
          <small>{socialLinks.length} profiles</small>
        </div>
        <div className="link-grid">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="contact-link-card">
              <strong>{link.label}</strong>
              <span>{link.url.replace(/^https?:\/\/(www\.)?/i, "")}</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </article>
    </div>
  );
}

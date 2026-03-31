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
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1>Available for thoughtful frontend and UI work</h1>
          <p className="lead">{profile.availability}</p>
        </div>
      </section>

      <div className="dashboard-grid">
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

      <article className="glass-card">
        <p className="eyebrow">Links</p>
        <div className="link-grid">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="contact-link-card">
              <strong>{link.label}</strong>
              <span>{link.url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </article>
    </div>
  );
}

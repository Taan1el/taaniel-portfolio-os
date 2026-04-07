import { Copy, Download, ExternalLink, LayoutGrid, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { getResumeDownloadUrls, profile, socialLinks } from "@/data/portfolio";
import type { AppComponentProps } from "@/types/system";

function copyToClipboard(value: string) {
  void navigator.clipboard?.writeText(value);
}

export function ContactApp({ window }: AppComponentProps) {
  void window;

  return (
    <AppScaffold className="contact-app">
      <AppContent padded>
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
          <p className="eyebrow">Fast path</p>
        </div>
        <div className="link-grid" style={{ marginBottom: "0.75rem" }}>
          <Link className="contact-link-card" to="/simple">
            <strong>Quick portfolio</strong>
            <span>Scrollable page without the desktop shell</span>
            <LayoutGrid size={15} />
          </Link>
          <a className="contact-link-card" href={getResumeDownloadUrls()[0]} download>
            <strong>Download CV</strong>
            <span>PDF · same file as Resume.pdf on the desktop</span>
            <Download size={15} />
          </a>
        </div>
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
      </AppContent>
    </AppScaffold>
  );
}

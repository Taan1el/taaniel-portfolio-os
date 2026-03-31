const content = window.PORTFOLIO_CONTENT;
const currentPage = document.body.dataset.page;
const metaDescription = document.querySelector('meta[name="description"]');
const langButtons = document.querySelectorAll("[data-lang-trigger]");
const textNodes = document.querySelectorAll("[data-i18n]");
const htmlNodes = document.querySelectorAll("[data-i18n-html]");
const altNodes = document.querySelectorAll("[data-i18n-alt]");
const ariaNodes = document.querySelectorAll("[data-i18n-aria-label]");
const yearNode = document.getElementById("year");
const langStorageKey = content.site.localStorageKey;
const defaultLang = content.site.defaultLang;

function readPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function getLocalized(path, lang) {
  const value = readPath(content, path);

  if (value && typeof value === "object" && lang in value) {
    return value[lang];
  }

  return value;
}

function applyMeta(lang) {
  const pageContent = content.pages[currentPage];

  if (!pageContent?.meta) {
    return;
  }

  document.title = pageContent.meta.title[lang];

  if (metaDescription) {
    metaDescription.setAttribute("content", pageContent.meta.description[lang]);
  }
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;

  textNodes.forEach((node) => {
    const translated = getLocalized(node.dataset.i18n, lang);

    if (typeof translated === "string") {
      node.textContent = translated;
    }
  });

  htmlNodes.forEach((node) => {
    const translated = getLocalized(node.dataset.i18nHtml, lang);

    if (typeof translated === "string") {
      node.innerHTML = translated;
    }
  });

  altNodes.forEach((node) => {
    const translated = getLocalized(node.dataset.i18nAlt, lang);

    if (typeof translated === "string") {
      node.setAttribute("alt", translated);
    }
  });

  ariaNodes.forEach((node) => {
    const translated = getLocalized(node.dataset.i18nAriaLabel, lang);

    if (typeof translated === "string") {
      node.setAttribute("aria-label", translated);
    }
  });

  langButtons.forEach((button) => {
    const isActive = button.dataset.langTrigger === lang;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  applyMeta(lang);
  localStorage.setItem(langStorageKey, lang);
}

function resolveInitialLanguage() {
  const savedLang = localStorage.getItem(langStorageKey);

  if (savedLang === "et" || savedLang === "en") {
    return savedLang;
  }

  return defaultLang;
}

function initializeLanguage() {
  const initialLang = resolveInitialLanguage();

  applyLanguage(initialLang);

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.langTrigger);
    });
  });
}

function initializeRevealSequence() {
  const sequences = document.querySelectorAll(
    ".hero-section, .page-intro, .proof-strip, .featured-section, .tools-section, .case-study-list, .email-gallery-section, .detail-grid, .photo-section, .contact-grid"
  );

  sequences.forEach((sequence) => {
    sequence.querySelectorAll(".reveal").forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${Math.min(index * 90, 420)}ms`);
    });
  });
}

function initializeReveal() {
  const revealItems = document.querySelectorAll(".reveal");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function initializeMediaParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const motionTargets = document.querySelectorAll(
    ".project-image, .case-hero-image, .case-layout-image, .photo-card img"
  );

  if (!motionTargets.length) {
    return;
  }

  let ticking = false;

  const updateMotion = () => {
    const viewportCenter = window.innerHeight / 2;

    motionTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }

      const elementCenter = rect.top + rect.height / 2;
      const distance = (elementCenter - viewportCenter) / viewportCenter;
      const shift = Math.max(-14, Math.min(14, distance * -10));

      target.style.setProperty("--media-shift", `${shift.toFixed(2)}px`);
    });

    ticking = false;
  };

  const requestTick = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateMotion);
  };

  updateMotion();
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
}

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

initializeLanguage();
initializeRevealSequence();
initializeReveal();
initializeMediaParallax();

const content = window.PORTFOLIO_CONTENT;
const currentPage = document.body.dataset.page;
const metaDescription = document.querySelector('meta[name="description"]');
const langButtons = document.querySelectorAll("[data-lang-trigger]");
const textNodes = document.querySelectorAll("[data-i18n]");
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

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

initializeLanguage();
initializeReveal();

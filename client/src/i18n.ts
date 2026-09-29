import { UI_TRANSLATIONS } from "./ui-translations";

type LanguageCode = keyof typeof UI_TRANSLATIONS;
const catalogs = UI_TRANSLATIONS as unknown as Record<string, Record<string, string>>;
const english = catalogs.en;
const englishToKey = new Map(Object.entries(english).map(([key, value]) => [value, key]));
englishToKey.set("See officer above", "officer");
const translatedToEnglish = new Map<string, string>();
for (const catalog of Object.values(catalogs)) {
  for (const [key, value] of Object.entries(catalog)) {
    translatedToEnglish.set(value, english[key] ?? value);
  }
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  const tag = parent.tagName;
  return tag === "SCRIPT" || tag === "STYLE" || tag === "SELECT" || tag === "OPTION" || parent.closest("[data-no-translate='true']") !== null;
}

function translateText(value: string, language: LanguageCode) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const source = translatedToEnglish.get(trimmed) ?? trimmed;
  const key = englishToKey.get(source);
  if (!key) return value;
  const translated = catalogs[language]?.[key] ?? source;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
}

export function translatePage(language: string) {
  if (typeof document === "undefined") return;
  const selected = (language in UI_TRANSLATIONS ? language : "en") as LanguageCode;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!shouldSkip(node)) nodes.push(node as Text);
  }
  nodes.forEach(textNode => {
    const current = textNode.nodeValue ?? "";
    const next = translateText(current, selected);
    if (next !== current) textNode.nodeValue = next;
  });

  document.querySelectorAll<HTMLElement>("input, textarea, [aria-label], [title]").forEach(element => {
    if (element.closest("[data-no-translate='true']")) return;
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const value = element.getAttribute(attribute);
      if (value) {
        const translated = translateText(value, selected);
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    }
  });
}

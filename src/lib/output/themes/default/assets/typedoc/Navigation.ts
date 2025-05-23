import { decompressJson } from "./utils/decompress";

export interface NavigationElement {
    text: string;
    path?: string;
    kind?: number;
    class?: string;
    children?: NavigationElement[];
    icon?: string | number;
}

let BASE_URL: string;

declare global {
    interface Window {
        // Base64 encoded data url, gzipped, JSON encoded NavigationElement[]
        navigationData?: string;
    }
}

export function initNav() {
    const script = document.getElementById("tsd-nav-script");
    if (!script) return;

    script.addEventListener("load", buildNav);
    buildNav();
}

async function buildNav() {
    const container = document.getElementById("tsd-nav-container");
    if (!container || !window.navigationData) return;

    const nav: NavigationElement[] = await decompressJson(
        window.navigationData,
    );

    BASE_URL = document.documentElement.dataset.base!;
    if (!BASE_URL.endsWith("/")) BASE_URL += "/";
    container.innerHTML = "";
    for (const el of nav) {
        buildNavElement(el, container, []);
    }

    window.app.createComponents(container);
    window.app.showPage();
    window.app.ensureActivePageVisible();
}

function buildNavElement(
    el: NavigationElement,
    parent: HTMLElement,
    path: string[],
) {
    const li = parent.appendChild(document.createElement("li"));

    if (el.children) {
        const fullPath = [...path, el.text];
        const details = li.appendChild(document.createElement("details"));
        details.className = el.class
            ? `${el.class} tsd-accordion`
            : "tsd-accordion";

        const summary = details.appendChild(document.createElement("summary"));
        summary.className = "tsd-accordion-summary";
        summary.dataset.key = fullPath.join("$");
        // Would be nice to not hardcode this here, if someone overwrites the chevronDown icon with an <img>
        // then this won't work... going to wait to worry about that until it actually breaks some custom theme.
        // Also very annoying that we can't encode the svg in the cache, since that gets duplicated here...
        // If that breaks someone, we probably have to get the svg element from the cached div (and include them..)
        // and clone that into place...
        summary.innerHTML =
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><use href="#icon-chevronDown"></use></svg>`;
        addNavText(el, summary);

        const data = details.appendChild(document.createElement("div"));
        data.className = "tsd-accordion-details";
        const ul = data.appendChild(document.createElement("ul"));
        ul.className = "tsd-nested-navigation";

        for (const child of el.children) {
            buildNavElement(child, ul, fullPath);
        }
    } else {
        addNavText(el, li, el.class);
    }
}

function addNavText(
    el: NavigationElement,
    parent: HTMLElement,
    classes?: string | 0,
) {
    if (el.path) {
        const a = parent.appendChild(document.createElement("a"));
        a.href = BASE_URL + el.path; // relativity!
        if (classes) {
            a.className = classes;
        }
        if (location.pathname === a.pathname && !a.href.includes("#")) {
            a.classList.add("current");
            a.ariaCurrent = "page";
        }
        if (el.kind) {
            const label = window.translations[`kind_${el.kind}`].replaceAll(
                '"',
                "&quot;",
            );
            a.innerHTML =
                `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="tsd-kind-icon" aria-label="${label}"><use href="#icon-${
                    el.icon || el.kind
                }"></use></svg>`;
        }
        a.appendChild(wbr(el.text, document.createElement("span")));
    } else {
        const span = parent.appendChild(document.createElement("span"));
        const label = window.translations.folder.replaceAll('"', "&quot;");
        span.innerHTML =
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="tsd-kind-icon" aria-label="${label}"><use href="#icon-folder"></use></svg>`;
        span.appendChild(wbr(el.text, document.createElement("span")));
    }
}

function wbr(str: string, element: HTMLElement) {
    // Keep this in sync with the same helper in lib.tsx
    // We use lookahead/lookbehind to indicate where the string should
    // be split without consuming a character.
    // (?<=[^A-Z])(?=[A-Z]) -- regular camel cased text
    // (?<=[A-Z])(?=[A-Z][a-z]) -- acronym
    // (?<=[_-])(?=[^_-]) -- snake
    const parts = str.split(/(?<=[^A-Z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[_-])(?=[^_-])/);
    for (let i = 0; i < parts.length; ++i) {
        if (i !== 0) {
            element.appendChild(document.createElement("wbr"));
        }
        element.appendChild(document.createTextNode(parts[i]));
    }

    return element;
}

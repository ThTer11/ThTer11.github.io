import { createElement, useEffect, useRef } from "react";
import "./rich-content.css";

const SKIP_MATH_SELECTOR = "script, noscript, style, textarea, pre, code";
const copyTimers = new WeakMap();

function getMathJax() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.MathJax && typeof window.MathJax.typesetPromise === "function"
        ? window.MathJax
        : null;
}

function getCopyLabels() {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/en")) {
        return {
            copyButton: "TeX",
            copiedButton: "OK",
            copyTitle: "Copy LaTeX source",
        };
    }

    return {
        copyButton: "TeX",
        copiedButton: "OK",
        copyTitle: "Copier la source LaTeX",
    };
}

function containsMathSyntax(text = "") {
    return text.includes("$") || text.includes("\\(") || text.includes("\\[");
}

function isEscaped(text, index) {
    let slashCount = 0;

    for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
        slashCount += 1;
    }

    return slashCount % 2 === 1;
}

function getOpeningDelimiter(text, index) {
    if (text.startsWith("$$", index) && !isEscaped(text, index)) {
        return { open: "$$", close: "$$", display: true };
    }

    if (text.startsWith("\\[", index) && !isEscaped(text, index)) {
        return { open: "\\[", close: "\\]", display: true };
    }

    if (text.startsWith("\\(", index) && !isEscaped(text, index)) {
        return { open: "\\(", close: "\\)", display: false };
    }

    if (text[index] === "$" && !text.startsWith("$$", index) && !isEscaped(text, index)) {
        return { open: "$", close: "$", display: false };
    }

    return null;
}

function findClosingDelimiter(text, startIndex, delimiter) {
    for (let cursor = startIndex; cursor < text.length; cursor += 1) {
        if (text.startsWith(delimiter, cursor) && !isEscaped(text, cursor)) {
            return cursor;
        }
    }

    return -1;
}

function splitMathSegments(text = "") {
    if (!containsMathSyntax(text)) {
        return [{ type: "text", content: text }];
    }

    const segments = [];
    let cursor = 0;
    let plainStart = 0;

    while (cursor < text.length) {
        const delimiter = getOpeningDelimiter(text, cursor);

        if (!delimiter) {
            cursor += 1;
            continue;
        }

        const contentStart = cursor + delimiter.open.length;
        const closingIndex = findClosingDelimiter(text, contentStart, delimiter.close);

        if (closingIndex === -1) {
            cursor += delimiter.open.length;
            continue;
        }

        if (plainStart < cursor) {
            segments.push({
                type: "text",
                content: text.slice(plainStart, cursor),
            });
        }

        segments.push({
            type: "math",
            content: text.slice(cursor, closingIndex + delimiter.close.length),
            display: delimiter.display,
        });

        cursor = closingIndex + delimiter.close.length;
        plainStart = cursor;
    }

    if (segments.length === 0) {
        return [{ type: "text", content: text }];
    }

    if (plainStart < text.length) {
        segments.push({
            type: "text",
            content: text.slice(plainStart),
        });
    }

    return segments.filter((segment) => segment.content);
}

function replaceMathInTextNode(node) {
    const text = node.textContent ?? "";
    const segments = splitMathSegments(text);

    if (segments.length === 1 && segments[0].type === "text") {
        return;
    }

    const fragment = node.ownerDocument.createDocumentFragment();

    segments.forEach((segment) => {
        if (segment.type === "text") {
            fragment.appendChild(node.ownerDocument.createTextNode(segment.content));
            return;
        }

        const wrapper = node.ownerDocument.createElement("span");
        wrapper.className = segment.display
            ? "rich-content-math rich-content-math-display"
            : "rich-content-math";
        wrapper.dataset.texSource = segment.content;
        wrapper.dataset.copied = "false";
        wrapper.textContent = segment.content;
        fragment.appendChild(wrapper);
    });

    node.replaceWith(fragment);
}

function annotateMathSources(element) {
    const textNodes = [];
    const walker = element.ownerDocument.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentElement;
                const text = node.textContent ?? "";

                if (!parent || !text.trim() || !containsMathSyntax(text)) {
                    return NodeFilter.FILTER_REJECT;
                }

                if (parent.closest(SKIP_MATH_SELECTOR) || parent.closest(".rich-content-math")) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            },
        },
    );

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    textNodes.forEach(replaceMathInTextNode);
}

async function copyText(text) {
    if (typeof window === "undefined") {
        return false;
    }

    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {
            // Fallback below for browsers that block the Clipboard API.
        }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;

    try {
        copied = document.execCommand("copy");
    } catch (_) {
        copied = false;
    }

    document.body.removeChild(textarea);
    return copied;
}

function clearCopyTimers(element) {
    element.querySelectorAll(".rich-content-math").forEach((wrapper) => {
        const timeoutId = copyTimers.get(wrapper);

        if (timeoutId) {
            window.clearTimeout(timeoutId);
            copyTimers.delete(wrapper);
        }
    });
}

function enhanceMathControls(element, enableMathCopy) {
    element.querySelectorAll(".rich-content-math").forEach((wrapper) => {
        wrapper.dataset.copyEnabled = enableMathCopy ? "true" : "false";
    });

    if (!enableMathCopy) {
        element.querySelectorAll(".rich-content-math-copy").forEach((button) => {
            button.remove();
        });
        return;
    }

    const labels = getCopyLabels();

    element.querySelectorAll(".rich-content-math").forEach((wrapper) => {
        let button = wrapper.querySelector(".rich-content-math-copy");

        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.className = "rich-content-math-copy";
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                const didCopy = await copyText(wrapper.dataset.texSource ?? "");

                if (!didCopy) {
                    return;
                }

                wrapper.dataset.copied = "true";
                button.textContent = labels.copiedButton;

                const currentTimeout = copyTimers.get(wrapper);
                if (currentTimeout) {
                    window.clearTimeout(currentTimeout);
                }

                const timeoutId = window.setTimeout(() => {
                    wrapper.dataset.copied = "false";
                    button.textContent = labels.copyButton;
                    copyTimers.delete(wrapper);
                }, 1600);

                copyTimers.set(wrapper, timeoutId);
            });
            wrapper.appendChild(button);
        }

        button.textContent = wrapper.dataset.copied === "true"
            ? labels.copiedButton
            : labels.copyButton;
        button.title = labels.copyTitle;
        button.setAttribute("aria-label", labels.copyTitle);
    });
}

export default function RichContent({
    as = "div",
    html = "",
    className,
    enableMathCopy = true,
}) {
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        const mathJax = getMathJax();

        if (!element) {
            return;
        }

        if (mathJax && typeof mathJax.typesetClear === "function") {
            mathJax.typesetClear([element]);
        }

        clearCopyTimers(element);
        element.innerHTML = html;
        annotateMathSources(element);

        if (!mathJax) {
            enhanceMathControls(element, enableMathCopy);
            return () => {
                clearCopyTimers(element);
            };
        }

        let cancelled = false;

        mathJax
            .typesetPromise([element])
            .then(() => {
                if (!cancelled) {
                    enhanceMathControls(element, enableMathCopy);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    enhanceMathControls(element, enableMathCopy);
                }
            });

        return () => {
            cancelled = true;
            clearCopyTimers(element);
        };
    }, [enableMathCopy, html]);

    return createElement(as, {
        ref,
        className,
    });
}

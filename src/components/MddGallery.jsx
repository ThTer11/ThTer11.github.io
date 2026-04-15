import { useEffect, useMemo, useState } from "react";

const MDD_STATE_KEY = "home-mdd-state";
const AUTOPLAY_DELAY = 9000;

async function fetchManifest() {
    try {
        const response = await fetch(`${process.env.PUBLIC_URL}/mdds/index.json`);
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

function resolveAsset(src) {
    if (!src) {
        return src;
    }
    if (src.startsWith("http")) {
        return src;
    }
    return `${process.env.PUBLIC_URL}${src}`;
}

function readStoredState() {
    try {
        const raw = window.sessionStorage.getItem(MDD_STATE_KEY);
        if (!raw) {
            return {
                index: 0,
                paused: false,
                lastTick: Date.now(),
                showDual: false,
            };
        }
        const parsed = JSON.parse(raw);
        return {
            index: Number.isInteger(parsed.index) ? parsed.index : 0,
            paused: Boolean(parsed.paused),
            lastTick: typeof parsed.lastTick === "number" ? parsed.lastTick : Date.now(),
            showDual: Boolean(parsed.showDual),
        };
    } catch (error) {
        return {
            index: 0,
            paused: false,
            lastTick: Date.now(),
            showDual: false,
        };
    }
}

function writeStoredState(state) {
    try {
        window.sessionStorage.setItem(MDD_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        return;
    }
}

export default function MddGallery({
    title,
    emptyLabel,
    diagramLabel,
    dualLabel,
    showDualLabel,
    hideDualLabel,
}) {
    const persistedState = useMemo(
        () =>
            typeof window === "undefined"
                ? { index: 0, paused: false, lastTick: Date.now(), showDual: false }
                : readStoredState(),
        []
    );

    const [items, setItems] = useState([]);
    const [activeIndex, setActiveIndex] = useState(persistedState.index);
    const [autoplayPaused, setAutoplayPaused] = useState(persistedState.paused);
    const [showDual, setShowDual] = useState(persistedState.showDual);

    useEffect(() => {
        let mounted = true;

        fetchManifest().then((resolved) => {
            if (!mounted) {
                return;
            }

            if (resolved.length === 0) {
                setItems([]);
                return;
            }

            const stored = readStoredState();
            const boundedIndex = stored.index % resolved.length;

            if (stored.paused) {
                setItems(resolved);
                setActiveIndex(boundedIndex);
                setAutoplayPaused(true);
                setShowDual(stored.showDual);
                return;
            }

            const elapsed = Math.max(0, Date.now() - stored.lastTick);
            const shift = Math.floor(elapsed / AUTOPLAY_DELAY);
            const nextIndex = (boundedIndex + shift) % resolved.length;

            setItems(resolved);
            setActiveIndex(nextIndex);
            setAutoplayPaused(false);
            setShowDual(stored.showDual);

            writeStoredState({
                index: nextIndex,
                paused: false,
                lastTick: Date.now() - (elapsed % AUTOPLAY_DELAY),
                showDual: stored.showDual,
            });
        });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (items.length <= 1 || autoplayPaused) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setActiveIndex((current) => {
                const next = (current + 1) % items.length;
                writeStoredState({
                    index: next,
                    paused: false,
                    lastTick: Date.now(),
                    showDual: false,
                });
                setShowDual(false);
                return next;
            });
        }, AUTOPLAY_DELAY);

        return () => window.clearInterval(intervalId);
    }, [items, autoplayPaused]);

    useEffect(() => {
        if (items.length === 0) {
            return;
        }

        writeStoredState({
            index: activeIndex % items.length,
            paused: autoplayPaused,
            lastTick: Date.now(),
            showDual,
        });
    }, [activeIndex, autoplayPaused, showDual, items]);

    const activeItem = useMemo(() => items[activeIndex] ?? null, [items, activeIndex]);

    const handleDotClick = (index) => {
        setAutoplayPaused(true);
        setShowDual(false);
        setActiveIndex(index);
    };

    const toggleDual = () => {
        setShowDual((current) => !current);
    };

    return (
        <div className="showcase-panel showcase-card home-mdd-card animate-defil">
            <div className="home-mdd-head">
                <div>
                    <h2 className="showcase-card-title">{title}</h2>
                    {activeItem?.label && <p className="home-mdd-caption">{activeItem.label}</p>}
                </div>

                <div className="home-mdd-controls">
                    {activeItem?.dualSrc && (
                        <button
                            type="button"
                            className="home-mdd-toggle"
                            onClick={toggleDual}
                        >
                            {showDual ? hideDualLabel : showDualLabel}
                        </button>
                    )}

                    {items.length > 0 && (
                        <div className="home-mdd-dots" aria-hidden="true">
                            {items.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={
                                        index === activeIndex
                                            ? "home-mdd-dot home-mdd-dot-active"
                                            : "home-mdd-dot"
                                    }
                                    onClick={() => handleDotClick(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {activeItem ? (
                <div className="home-mdd-grid">
                    <div className="home-mdd-panel">
                        <p className="home-mdd-panel-title">
                            {showDual && activeItem.dualSrc ? dualLabel : diagramLabel}
                        </p>
                        <div className="home-mdd-frame">
                            <img
                                key={showDual && activeItem.dualSrc ? activeItem.dualSrc : activeItem.src}
                                src={resolveAsset(
                                    showDual && activeItem.dualSrc ? activeItem.dualSrc : activeItem.src
                                )}
                                alt={`${activeItem.label} ${
                                    showDual && activeItem.dualSrc ? dualLabel : diagramLabel
                                }`}
                                className="home-mdd-image"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="home-mdd-empty">
                    <p>{emptyLabel}</p>
                </div>
            )}
        </div>
    );
}

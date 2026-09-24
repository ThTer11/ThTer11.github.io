import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowsPointingOutIcon,
    MinusIcon, PlusIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

const MDD_STATE_KEY = "home-mdd-state";
const ASSET_ROOT = process.env.PUBLIC_URL ?? "";

function resolveAsset(src) {
    return /^https?:\/\//.test(src) ? src : `${ASSET_ROOT}${src}`;
}

function readStoredState() {
    try {
        const state = JSON.parse(window.sessionStorage.getItem(MDD_STATE_KEY));
        return { index: Number.isInteger(state?.index) ? state.index : 0, showDual: Boolean(state?.showDual) };
    } catch {
        return { index: 0, showDual: false };
    }
}

/** Give zoomed SVGs actual layout dimensions, so every edge stays reachable. */
function DiagramViewport({ item, showDual, labels, diagramLabel, dualLabel, onExpand }) {
    const frameRef = useRef(null);
    const dragRef = useRef(null);
    const centerRef = useRef(null);
    const [zoom, setZoom] = useState(1);
    const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState(null);
    const [failed, setFailed] = useState(false);
    const src = resolveAsset(showDual && item.dualSrc ? item.dualSrc : item.src);
    const fitted = imageSize && frameSize.width
        ? Math.min((frameSize.width - 24) / imageSize.width, (frameSize.height - 24) / imageSize.height)
        : 0;
    const width = Math.max(0, (imageSize?.width ?? 0) * fitted * zoom);
    const height = Math.max(0, (imageSize?.height ?? 0) * fitted * zoom);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const update = () => setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(frame);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const center = centerRef.current;
        if (center) {
            frame.scrollLeft = center.x * frame.scrollWidth - frame.clientWidth / 2;
            frame.scrollTop = center.y * frame.scrollHeight - frame.clientHeight / 2;
            centerRef.current = null;
        } else if (zoom === 1) {
            frame.scrollLeft = 0;
            frame.scrollTop = 0;
        }
    }, [zoom, width, height]);

    const changeZoom = (value) => {
        const frame = frameRef.current;
        centerRef.current = {
            x: (frame.scrollLeft + frame.clientWidth / 2) / frame.scrollWidth,
            y: (frame.scrollTop + frame.clientHeight / 2) / frame.scrollHeight,
        };
        setZoom(Math.min(8, Math.max(1, value)));
    };
    const endDrag = () => {
        dragRef.current = null;
        frameRef.current?.classList.remove("is-dragging");
    };

    return (
        <div className="home-mdd-viewer">
            <div
                ref={frameRef}
                className={`home-mdd-frame${zoom > 1 ? " home-mdd-frame-zoomed" : ""}`}
                tabIndex={0}
                role="region"
                aria-label={`${item.label} — ${showDual ? dualLabel : diagramLabel}. ${labels.pan}`}
                onPointerDown={(event) => {
                    if (event.pointerType !== "mouse" || event.button !== 0 || zoom <= 1) return;
                    const frame = frameRef.current;
                    event.preventDefault();
                    frame.setPointerCapture(event.pointerId);
                    dragRef.current = { x: event.clientX, y: event.clientY, left: frame.scrollLeft, top: frame.scrollTop };
                    frame.classList.add("is-dragging");
                }}
                onPointerMove={(event) => {
                    const drag = dragRef.current;
                    if (!drag) return;
                    frameRef.current.scrollLeft = drag.left - (event.clientX - drag.x);
                    frameRef.current.scrollTop = drag.top - (event.clientY - drag.y);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
            >
                {!imageSize && !failed && <p className="home-mdd-image-status" role="status">{labels.loading}</p>}
                {failed ? (
                    <p className="home-mdd-image-status" role="status">{labels.imageError}</p>
                ) : (
                    <div className="home-mdd-canvas" style={{ width: Math.max(frameSize.width, width + 24), height: Math.max(frameSize.height, height + 24) }}>
                        <img
                            src={src}
                            alt={`${item.label} — ${showDual ? dualLabel : diagramLabel}`}
                            className="home-mdd-image"
                            draggable={false}
                            style={{ width, height, visibility: imageSize ? "visible" : "hidden" }}
                            onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                            onError={() => setFailed(true)}
                        />
                    </div>
                )}
            </div>
            <div className="home-mdd-viewer-footer">
                <div className="home-mdd-zoom-controls" role="group" aria-label={labels.zoom}>
                    <button type="button" onClick={() => changeZoom(zoom - .5)} disabled={zoom <= 1 || !imageSize} aria-label={labels.zoomOut} title={labels.zoomOut}><MinusIcon /></button>
                    <button type="button" onClick={() => changeZoom(1)} className="home-mdd-fit" title={labels.fit} aria-label={labels.fit}>{zoom === 1 ? labels.fit : `${Math.round(zoom * 100)} %`}</button>
                    <button type="button" onClick={() => changeZoom(zoom + .5)} disabled={zoom >= 8 || !imageSize} aria-label={labels.zoomIn} title={labels.zoomIn}><PlusIcon /></button>
                </div>
                {onExpand && <button type="button" className="home-mdd-expand" onClick={onExpand}><ArrowsPointingOutIcon />{labels.expand}</button>}
            </div>
        </div>
    );
}

function ExpandedGallery({ title, onClose, children, closeLabel, returnFocusRef }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            const target = returnFocusRef.current?.querySelector(".home-mdd-expand") ?? previousFocus;
            target?.focus?.({ preventScroll: true });
        };
    }, [returnFocusRef]);
    return createPortal(
        <dialog ref={ref} className="home-mdd-dialog" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
            <header className="home-mdd-dialog-head">
                <h2>{title}</h2>
                <button type="button" className="home-mdd-icon-button" onClick={onClose} aria-label={closeLabel} title={closeLabel}><XMarkIcon /></button>
            </header>
            {children}
        </dialog>,
        document.body,
    );
}

export default function MddGallery({ title, emptyLabel, diagramLabel, dualLabel, galleryLabels: labels }) {
    const galleryRef = useRef(null);
    const [stored] = useState(readStoredState);
    const [items, setItems] = useState([]);
    const [activeIndex, setActiveIndex] = useState(stored.index);
    const [showDual, setShowDual] = useState(stored.showDual);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadVersion, setLoadVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        fetch(`${ASSET_ROOT}/mdds/index.json`, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error("Manifest unavailable");
                return response.json();
            })
            .then((manifest) => {
                if (controller.signal.aborted) return;
                const valid = Array.isArray(manifest) ? manifest.filter((item) => item && typeof item.src === "string" && item.src) : [];
                setItems(valid);
                if (valid.length) setActiveIndex((index) => ((index % valid.length) + valid.length) % valid.length);
            })
            .catch(() => { if (!controller.signal.aborted) setItems([]); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [loadVersion]);

    useEffect(() => {
        if (!items.length) return;
        try {
            window.sessionStorage.setItem(MDD_STATE_KEY, JSON.stringify({ index: activeIndex, showDual }));
        } catch { /* Storage may be disabled; browsing still works. */ }
    }, [activeIndex, showDual, items.length]);

    const item = items[activeIndex];
    const dual = Boolean(showDual && item?.dualSrc);
    const select = (index) => setActiveIndex((index + items.length) % items.length);
    const modeSwitch = (
        <div className="home-mdd-modes" role="group" aria-label={labels.representation}>
            <button type="button" aria-pressed={!dual} onClick={() => setShowDual(false)}>{diagramLabel}</button>
            <button type="button" aria-pressed={dual} disabled={!item?.dualSrc} onClick={() => setShowDual(true)}>{dualLabel}</button>
        </div>
    );
    const examples = (
        <div className="home-mdd-examples" role="group" aria-label={labels.choose}>
            {items.map((example, index) => (
                <button key={`${example.id}-${index}`} type="button" aria-pressed={index === activeIndex} onClick={() => select(index)}>{example.label ?? example.id}</button>
            ))}
        </div>
    );
    const viewer = (full = false) => (
        <DiagramViewport key={`${item.src}:${dual}:${full}`} item={item} showDual={dual} labels={labels} diagramLabel={diagramLabel} dualLabel={dualLabel} onExpand={full ? undefined : () => setExpanded(true)} />
    );

    return (
        <section ref={galleryRef} className="showcase-panel showcase-card home-mdd-card animate-defil" aria-label={title}>
            <header className="home-mdd-head">
                <h2 className="showcase-card-title">{title}</h2>
            </header>
            {loading ? <p className="home-mdd-empty" role="status">{labels.loading}</p> : item ? (
                <>
                    <div className="home-mdd-toolbar">{examples}{modeSwitch}</div>
                    {viewer()}
                    {expanded && (
                        <ExpandedGallery title={title} returnFocusRef={galleryRef} closeLabel={labels.close} onClose={() => setExpanded(false)}>
                            <div className="home-mdd-toolbar">{examples}{modeSwitch}</div>
                            {viewer(true)}
                        </ExpandedGallery>
                    )}
                </>
            ) : (
                <div className="home-mdd-empty" role="status">
                    <p>{emptyLabel || labels.empty}</p>
                    <button type="button" className="home-mdd-expand" onClick={() => setLoadVersion((version) => version + 1)}>{labels.retry}</button>
                </div>
            )}
        </section>
    );
}

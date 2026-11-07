/* =========================================================
   SAKALIS - Trình đọc thơ lật trang 3D
   Không thay đổi nội dung Google Sheets hoặc kiểu đọc cũ.
   Tạo trang từ văn bản thuần, tự phân trang theo khổ giấy.
   ========================================================= */

const READING_MODE_KEY = "sakalis-detail-reading-mode";
const ANIMATION_MS = 880;
const LINES_PER_PAGE = 10;
const CURL_SEGMENTS = 24;
const REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
}

function makePoemLines(content) {
    if (!String(content ?? "").trim()) {
        return [{ text: "Bài thơ chưa có nội dung.", stanzaStart: false }];
    }

    const stanzas = String(content)
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n/)
        .map((stanza) => stanza.trim())
        .filter(Boolean);
    const lines = [];

    stanzas.forEach((stanza, stanzaIndex) => {
        stanza.split("\n").forEach((line, lineIndex) => {
            lines.push({
                text: line.trimEnd(),
                stanzaStart: stanzaIndex > 0 && lineIndex === 0
            });
        });
    });
    return lines;
}

function makeLineNode(line, firstOnPage = false) {
    const el = createElement("span", "flipbook-line", line.text || "\u00a0");
    if (line.stanzaStart && !firstOnPage) el.classList.add("flipbook-stanza-start");
    if (line.fit && line.fit < 0.999) el.style.transform = `scaleX(${line.fit})`;
    return el;
}

function createPage(page, number, total, poem) {
    const paper = createElement("div", `flipbook-paper flipbook-paper-${page.type}`);
    const inner = createElement("div", "flipbook-paper-inner");
    paper.append(inner);

    if (page.type === "cover") {
        inner.append(createElement("div", "flipbook-cover-imprint", "SAKALIS"));
        const coverMiddle = createElement("div", "flipbook-cover-middle");
        coverMiddle.append(createElement("div", "flipbook-cover-ornament", "❧"));
        coverMiddle.append(createElement("div", "flipbook-cover-category", poem.collection || "THI CA · TẢN VĂN"));
        coverMiddle.append(createElement("h2", "flipbook-cover-title", poem.title || "Bài thơ"));
        coverMiddle.append(createElement("div", "flipbook-cover-rule"));
        coverMiddle.append(createElement("div", "flipbook-cover-by", "BNA"));
        inner.append(coverMiddle);
        inner.append(createElement("div", "flipbook-cover-bottom", "MỘT TRANG KÝ ỨC"));
        return paper;
    }

    if (page.type === "end") {
        inner.append(createElement("div", "flipbook-cover-imprint", "SAKALIS"));
        const ending = createElement("div", "flipbook-end-middle");
        ending.append(createElement("div", "flipbook-end-ornament", "❦"));
        ending.append(createElement("p", "flipbook-end-word", "Hết"));
        ending.append(createElement("div", "flipbook-end-rule"));
        ending.append(createElement("p", "flipbook-end-author", "BNA"));
        inner.append(ending);
        inner.append(createElement("div", "flipbook-cover-bottom", "SAKALIS · CREATIVE ARCHIVE"));
        return paper;
    }

    const heading = createElement("div", "flipbook-page-heading");
    heading.append(createElement("span", "", "SAKALIS"));
    heading.append(createElement("span", "flipbook-page-heading-title", poem.title || "BÀI THƠ"));
    inner.append(heading);

    const body = createElement("div", "flipbook-page-body");
    const text = createElement("div", "flipbook-poem-text");
    (page.lines || []).forEach((line, index) => text.append(makeLineNode(line, index === 0)));
    body.append(text);
    inner.append(body);

    const footer = createElement("div", "flipbook-page-footer");
    footer.append(createElement("span", "", "BNA"));
    footer.append(createElement("span", "", `${number} / ${total}`));
    inner.append(footer);
    return paper;
}

/**
 * Mỗi dòng gốc của tác giả phải nằm TRÊN MỘT DÒNG GIẤY.
 * Nhóm 10 dòng mỗi trang, giữ dấu ngắt khổ và điều chỉnh cỡ chữ/độ rộng chữ
 * theo diện tích trang thực tế. Không tự cắt một câu xuống hàng tiếp theo.
 */
function paginatePoem(stage, lines, width, height, poem, baseFontSize) {
    const measurePage = createPage({ type: "poem", lines: [] }, 1, 1, poem);
    measurePage.classList.add("flipbook-measure");
    measurePage.style.width = `${width}px`;
    measurePage.style.height = `${height}px`;
    stage.append(measurePage);
    const body = measurePage.querySelector(".flipbook-page-body");
    const text = measurePage.querySelector(".flipbook-poem-text");
    const availableWidth = Math.max(120, body.clientWidth);
    const bodyStyle = getComputedStyle(body);
    const availableHeight = Math.max(120, body.clientHeight -
        parseFloat(bodyStyle.paddingTop || 0) - parseFloat(bodyStyle.paddingBottom || 0));
    const family = getComputedStyle(text).fontFamily;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const measured = (fontSize) => {
        if (!context) return [];
        context.font = `400 ${fontSize}px ${family}`;
        return lines.map((line) => context.measureText(line.text || " ").width);
    };
    const samples = measured(baseFontSize).sort((a, b) => a - b);
    const typicalLongest = samples[Math.min(samples.length - 1, Math.floor(samples.length * .90))] || 1;
    // Ưu tiên kích thước dễ đọc, chỉ nén ngang những dòng dài bất thường.
    let fontSize = Math.min(baseFontSize, baseFontSize * (availableWidth - 5) / Math.max(1, typicalLongest));
    fontSize = Math.max(width < 330 ? 11.1 : 12.0, fontSize);
    // Nếu màn hình rất thấp, vòng phân trang bên dưới tự giảm số dòng.
    // Giữ cỡ chữ ở mức dễ đọc thay vì ép 10 dòng bằng mọi giá.
    stage.closest(".flipbook-reader")?.style.setProperty("--flipbook-font-size", `${fontSize.toFixed(2)}px`);
    const widths = measured(fontSize);
    const prepared = lines.map((line, i) => ({
        ...line,
        fit: widths[i] > availableWidth - 3 ? (availableWidth - 3) / widths[i] : 1
    }));
    const pages = [];
    let current = [];
    for (const line of prepared) {
        if (current.length >= LINES_PER_PAGE) {
            pages.push({ type: "poem", lines: current });
            current = [];
            text.replaceChildren();
        }
        const node = makeLineNode(line, current.length === 0);
        text.append(node);
        if (current.length > 0 && text.scrollHeight > availableHeight + 1) {
            node.remove();
            pages.push({ type: "poem", lines: current });
            current = [];
            text.replaceChildren();
            text.append(makeLineNode(line, true));
        }
        current.push(line);
    }
    if (current.length) pages.push({ type: "poem", lines: current });
    measurePage.remove();
    return pages.length ? pages : [{ type: "poem", lines: [] }];
}

export function initializeFlipbookReader() {
    const reader = document.querySelector("#flipbook-reader");
    const stage = document.querySelector("#flipbook-stage");
    const book = document.querySelector("#flipbook-book");
    const left = document.querySelector("#flipbook-left");
    const right = document.querySelector("#flipbook-right");
    const curlLayer = document.querySelector("#flipbook-curl-layer");
    const fullscreenButton = document.querySelector("#flipbook-fullscreen");
    const backButton = document.querySelector("#flipbook-previous");
    const nextButton = document.querySelector("#flipbook-next");
    const seek = document.querySelector("#flipbook-seek");
    const pageLabel = document.querySelector("#flipbook-page-label");
    const nameLabel = document.querySelector("#flipbook-reader-name");
    const oldLayout = document.querySelector("#poem-detail-layout");
    const modeButtons = Array.from(document.querySelectorAll("[data-reader-mode]"));
    if (!reader || !stage || !book || !oldLayout || !curlLayer || !seek) {
        return { setPoem() {} };
    }

    let storedMode = "scroll";
    try {
        storedMode = localStorage.getItem(READING_MODE_KEY) === "flip" ? "flip" : "scroll";
    } catch (_) { /* Chế độ riêng tư có thể khóa localStorage. */ }

    const state = {
        poem: null,
        mode: storedMode,
        pages: [],
        single: false,
        spread: 0,
        width: 420,
        height: 586,
        busy: false,
        pointer: null,
        animationFrame: null,
        animationToken: 0,
        resizeTimer: null,
        dragCorner: 1
    };

    const maxSpread = () => state.single
        ? Math.max(0, state.pages.length - 1)
        : Math.max(0, Math.ceil((state.pages.length - 1) / 2));

    const firstVisibleIndex = () => state.single
        ? state.spread
        : state.spread === 0 ? 0 : 2 * state.spread - 1;

    function pageAt(index) {
        return index !== null && index >= 0 ? (state.pages[index] || null) : null;
    }

    function paint(host, index) {
        const page = pageAt(index);
        host.replaceChildren(page ? createPage(page, index + 1, state.pages.length, state.poem) : createElement("div", "flipbook-empty-paper"));
    }

    function updateNavigation() {
        const count = state.pages.length;
        const first = Math.min(firstVisibleIndex(), Math.max(0, count - 1));
        if (state.single || state.spread === 0) {
            pageLabel.textContent = `Trang ${first + 1} / ${count}`;
        } else {
            const last = Math.min(first + 2, count);
            pageLabel.textContent = last === first + 1
                ? `Trang ${first + 1} / ${count}`
                : `Trang ${first + 1}–${last} / ${count}`;
        }
        backButton.disabled = state.busy || state.spread <= 0;
        nextButton.disabled = state.busy || state.spread >= maxSpread();
        seek.max = String(Math.max(1, count));
        seek.value = String(first + 1);
        seek.disabled = state.busy || count <= 1;
        seek.style.setProperty("--seek-progress", `${count > 1 ? 100 * first / (count - 1) : 0}%`);
    }

    function draw() {
        if (!state.poem || state.pages.length === 0) return;
        book.classList.toggle("flipbook-is-single", state.single);
        book.style.width = `${state.width * (state.single ? 1 : 2)}px`;
        book.style.height = `${state.height}px`;
        if (state.single) {
            left.hidden = true;
            paint(right, state.spread);
        } else {
            left.hidden = false;
            paint(left, state.spread === 0 ? null : state.spread * 2 - 1);
            paint(right, state.spread * 2);
        }
        curlLayer.hidden = true;
        updateNavigation();
    }

    function clearFlip() {
        state.animationToken += 1;
        if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
        state.pointer = null;
        state.busy = false;
        curlLayer.hidden = true;
        curlLayer.replaceChildren();
        curlLayer.style.transform = "none";
    }

    function rebuild(preserve = false) {
        if (!state.poem || reader.hidden) return;
        const previousTotal = state.pages.length;
        const previousIndex = firstVisibleIndex();
        clearFlip();

        const available = Math.max(245, stage.clientWidth);
        const isFullscreen = document.fullscreenElement === reader || reader.classList.contains("is-fullscreen-fallback");
        state.single = available < 710;
        const maxWidth = isFullscreen ? 600 : 432;
        const widthForStage = Math.floor((available - (state.single ? 8 : 28)) / (state.single ? 1 : 2));
        const heightForStage = isFullscreen ? Math.max(250, stage.clientHeight - 30) : Infinity;
        state.width = Math.max(215, Math.min(maxWidth, widthForStage, Math.floor(heightForStage / 1.40)));
        state.height = Math.round(state.width * 1.40);
        const baseFont = state.width < 330 ? 13.7 : state.width < 380 ? 14.8 : 16.2;
        reader.style.setProperty("--flipbook-font-size", `${baseFont}px`);
        reader.style.setProperty("--flipbook-page-width", `${state.width}px`);
        reader.style.setProperty("--flipbook-page-height", `${state.height}px`);

        const lines = makePoemLines(state.poem.content);
        const contentPages = paginatePoem(stage, lines, state.width, state.height, state.poem, baseFont);
        state.pages = [{ type: "cover" }, ...contentPages, { type: "end" }];
        const scaledIndex = preserve && previousTotal > 1
            ? Math.round((previousIndex / (previousTotal - 1)) * (state.pages.length - 1))
            : 0;
        state.spread = state.single ? scaledIndex : Math.ceil(scaledIndex / 2);
        state.spread = clamp(state.spread, 0, maxSpread());
        draw();
    }

    /**
     * Một trang giấy = 24 dải 3D liền nhau. Góc của từng dải thay đổi
     * theo vị trí trên tờ giấy, vì vậy toàn trang tạo thành một mặt cong
     * (không phải một tấm phẳng rotateY 180°).
     * Mặt sau được đảo đối xứng để chữ vẫn đọc xuôi sau khi lật.
     */
    function createCurlSurface(page, pageIndex, back, start, pieceWidth) {
        const face = createElement("div", back ? "flipbook-strip-back" : "flipbook-strip-front");
        face.style.width = `${pieceWidth + 1.5}px`;
        const paper = page ? createPage(page, pageIndex + 1, state.pages.length, state.poem)
            : createElement("div", "flipbook-empty-paper");
        paper.style.width = `${state.width}px`;
        paper.style.height = `${state.height}px`;
        paper.style.position = "absolute";
        paper.style.left = `${-start}px`;
        paper.style.top = "0";
        if (back) paper.style.transform = "scaleX(-1)";
        face.append(paper);
        return face;
    }

    function prepareCurl(frontIndex, backIndex) {
        curlLayer.replaceChildren();
        curlLayer.style.left = `${state.single ? 0 : state.width}px`;
        curlLayer.style.width = `${state.width}px`;
        curlLayer.style.height = `${state.height}px`;
        const pieceWidth = state.width / CURL_SEGMENTS;
        const strips = [];
        for (let i = 0; i < CURL_SEGMENTS; i += 1) {
            const start = i * pieceWidth;
            const strip = createElement("div", "flipbook-curl-strip");
            strip.style.width = `${pieceWidth + 1.5}px`;
            strip.style.height = `${state.height}px`;
            strip.append(
                createCurlSurface(pageAt(frontIndex), frontIndex, false, start, pieceWidth),
                createCurlSurface(pageAt(backIndex), backIndex, true, start, pieceWidth)
            );
            curlLayer.append(strip);
            strips.push(strip);
        }
        curlLayer.hidden = false;
        return strips;
    }

    let strips = [];
    function renderCurl(turn) {
        const t = clamp(turn, 0, 1);
        const pieceWidth = state.width / CURL_SEGMENTS;
        const baseAngle = Math.PI * t;
        const bend = .99 * Math.sin(Math.PI * t);
        let x = 0;
        let z = 0;
        for (let i = 0; i < strips.length; i += 1) {
            // Góc riêng từng dải, tích phân vị trí để các dải nối nhau.
            const s = (i + .5) / CURL_SEGMENTS;
            const theta = baseAngle - bend * Math.sin(Math.PI * s);
            const strip = strips[i];
            strip.style.transform = `translate3d(${x.toFixed(3)}px,0,${z.toFixed(3)}px) rotateY(${(-theta).toFixed(5)}rad)`;
            strip.style.setProperty("--flipbook-strip-shade", `${Math.min(.83, Math.abs(Math.sin(theta)) * .49 + Math.sin(Math.PI * t) * .19).toFixed(3)}`);
            x += pieceWidth * Math.cos(theta);
            z += pieceWidth * Math.sin(theta);
        }
        const skew = state.dragCorner * -7 * Math.sin(Math.PI * t);
        curlLayer.style.transform = `skewY(${skew.toFixed(2)}deg)`;
        curlLayer.style.setProperty("--flipbook-fold-shadow", `${(.17 + .30 * Math.sin(Math.PI * t)).toFixed(2)}`);
    }

    function prepareFlip(direction) {
        if (state.busy || !state.pages.length) return false;
        const target = state.spread + direction;
        if (target < 0 || target > maxSpread()) return false;
        state.busy = true;
        let frontIndex;
        let backIndex;
        if (state.single) {
            paint(right, direction > 0 ? target : state.spread);
            frontIndex = direction > 0 ? state.spread : target;
            backIndex = null; // Mặt sau là trang trắng như một tờ giấy lẻ.
        } else if (direction > 0) {
            paint(left, state.spread === 0 ? null : state.spread * 2 - 1);
            paint(right, target * 2);
            frontIndex = state.spread * 2;
            backIndex = target * 2 - 1;
        } else {
            paint(left, target === 0 ? null : target * 2 - 1);
            paint(right, state.spread * 2);
            frontIndex = target * 2;
            backIndex = state.spread * 2 - 1;
        }
        strips = prepareCurl(frontIndex, backIndex);
        setProgress(direction, 0);
        updateNavigation();
        return true;
    }

    function setProgress(direction, progress) {
        renderCurl(direction > 0 ? progress : 1 - progress);
    }

    function settle(direction, complete, fromProgress = 0) {
        const startProgress = clamp(fromProgress, 0, 1);
        const targetProgress = complete ? 1 : 0;
        const distance = Math.abs(targetProgress - startProgress);
        const duration = REDUCED_MOTION?.matches ? 0 : Math.max(120, ANIMATION_MS * distance);
        const token = ++state.animationToken;
        let startTime = null;
        const animate = (time) => {
            if (token !== state.animationToken) return;
            if (startTime === null) startTime = time;
            const t = duration ? clamp((time - startTime) / duration, 0, 1) : 1;
            // Ease-in-out quintic: tăng tốc nhẹ, giảm tốc mềm khi giấy đáp xuống.
            const eased = t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
            setProgress(direction, startProgress + (targetProgress - startProgress) * eased);
            if (t < 1) {
                state.animationFrame = requestAnimationFrame(animate);
            } else {
                if (complete) state.spread = clamp(state.spread + direction, 0, maxSpread());
                clearFlip();
                draw();
            }
        };
        state.animationFrame = requestAnimationFrame(animate);
    }

    function flip(direction) {
        if (!prepareFlip(direction)) return;
        settle(direction, true, 0);
    }

    function goToPage(pageOneBased) {
        if (state.busy) return;
        const index = clamp(Number(pageOneBased) - 1, 0, state.pages.length - 1);
        state.spread = state.single ? index : Math.ceil(index / 2);
        draw();
    }

    function setMode(mode) {
        if (mode !== "scroll" && mode !== "flip") return;
        state.mode = mode;
        const isFlip = mode === "flip";
        oldLayout.hidden = isFlip;
        reader.hidden = !isFlip;
        modeButtons.forEach((button) => {
            const selected = button.dataset.readerMode === mode;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        try { localStorage.setItem(READING_MODE_KEY, mode); } catch (_) {}
        if (isFlip && state.poem) {
            // Trước khi đo giấy cần bỏ hidden để clientHeight đúng.
            requestAnimationFrame(() => rebuild(false));
        } else {
            clearFlip();
            if (reader.classList.contains("is-fullscreen-fallback")) exitFallbackFullscreen();
            if (document.fullscreenElement === reader) document.exitFullscreen().catch(() => {});
        }
    }

    function pointerPosition(event) {
        const rect = book.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function pointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        if (!state.poem || state.busy || reader.hidden) return;
        const pos = pointerPosition(event);
        if (pos.y < 0 || pos.y > state.height) return;
        const bookWidth = state.width * (state.single ? 1 : 2);
        const edge = Math.max(65, state.width * 0.34);
        const direction = pos.x >= bookWidth - edge ? 1 : pos.x <= edge ? -1 : 0;
        if (direction === 0 || !prepareFlip(direction)) return;
        state.dragCorner = pos.y < state.height / 2 ? -1 : 1;
        state.pointer = {
            id: event.pointerId,
            startX: event.clientX,
            progress: 0,
            direction,
            moved: false
        };
        book.setPointerCapture?.(event.pointerId);
    }

    function pointerMove(event) {
        const drag = state.pointer;
        if (!drag || drag.id !== event.pointerId) return;
        const delta = drag.direction > 0 ? drag.startX - event.clientX : event.clientX - drag.startX;
        const progress = clamp(delta / (state.width * (state.single ? 0.95 : 1.65)), 0, 1);
        if (Math.abs(event.clientX - drag.startX) > 6) drag.moved = true;
        drag.progress = progress;
        if (drag.moved) {
            if (event.cancelable) event.preventDefault();
            setProgress(drag.direction, progress);
        }
    }

    function pointerUp(event, cancelled = false) {
        const drag = state.pointer;
        if (!drag || drag.id !== event.pointerId) return;
        state.pointer = null;
        try { book.releasePointerCapture?.(event.pointerId); } catch (_) {}
        const complete = !cancelled && (!drag.moved || drag.progress > 0.26);
        settle(drag.direction, complete, drag.progress);
    }

    function isFullscreen() {
        return document.fullscreenElement === reader || reader.classList.contains("is-fullscreen-fallback");
    }

    function updateFullscreenButton() {
        if (!fullscreenButton) return;
        const active = isFullscreen();
        fullscreenButton.classList.toggle("is-active", active);
        fullscreenButton.setAttribute("aria-label", active ? "Thoát toàn màn hình" : "Mở toàn màn hình");
        fullscreenButton.setAttribute("aria-pressed", String(active));
        const label = fullscreenButton.querySelector(".flipbook-fullscreen-label");
        if (label) label.textContent = active ? "Thu nhỏ" : "Toàn màn hình";
    }

    function exitFallbackFullscreen() {
        reader.classList.remove("is-fullscreen-fallback");
        document.documentElement.classList.remove("sakalis-flipbook-fullscreen");
        updateFullscreenButton();
        if (!reader.hidden) requestAnimationFrame(() => rebuild(true));
    }

    async function toggleFullscreen() {
        if (document.fullscreenElement === reader) {
            try { await document.exitFullscreen(); } catch (error) { console.warn(error); }
        } else if (reader.classList.contains("is-fullscreen-fallback")) {
            exitFallbackFullscreen();
        } else {
            try {
                if (!reader.requestFullscreen) throw new Error("Fullscreen API unavailable");
                await reader.requestFullscreen();
            } catch (_) {
                // iOS Safari cũ không hỗ trợ Fullscreen trên thẻ section.
                reader.classList.add("is-fullscreen-fallback");
                document.documentElement.classList.add("sakalis-flipbook-fullscreen");
                updateFullscreenButton();
                requestAnimationFrame(() => rebuild(true));
            }
        }
    }

    fullscreenButton?.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
        updateFullscreenButton();
        if (!reader.hidden) requestAnimationFrame(() => rebuild(true));
    });

    for (const button of modeButtons) {
        button.addEventListener("click", () => setMode(button.dataset.readerMode));
    }
    backButton.addEventListener("click", () => flip(-1));
    nextButton.addEventListener("click", () => flip(1));
    seek.addEventListener("input", () => goToPage(seek.value));
    book.addEventListener("pointerdown", pointerDown);
    book.addEventListener("pointermove", pointerMove);
    book.addEventListener("pointerup", (event) => pointerUp(event));
    book.addEventListener("pointercancel", (event) => pointerUp(event, true));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && reader.classList.contains("is-fullscreen-fallback")) {
            exitFallbackFullscreen();
            return;
        }
        if (reader.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            flip(event.key === "ArrowRight" ? 1 : -1);
        }
    });
    window.addEventListener("resize", () => {
        if (reader.hidden || !state.poem) return;
        clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(() => rebuild(true), 180);
    });
    document.fonts?.ready.then(() => {
        if (!reader.hidden && state.poem) rebuild(true);
    });

    return {
        setPoem(poem) {
            state.poem = poem;
            nameLabel.textContent = poem.title || "Bài thơ";
            state.pages = [];
            state.spread = 0;
            setMode(state.mode);
        }
    };
}

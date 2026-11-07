/* =========================================================
   SAKALIS - Trình đọc thơ lật trang 3D
   Không thay đổi nội dung Google Sheets hoặc kiểu đọc cũ.
   Tạo trang từ văn bản thuần, tự phân trang theo khổ giấy.
   ========================================================= */

const READING_MODE_KEY = "sakalis-detail-reading-mode";
const ANIMATION_MS = 660;
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
 * Tạo trang dựa trên kích thước giấy THỰC TẾ, không cắt mất câu thơ.
 * Dùng một trang ẩn cùng CSS để đo phần body và thêm từng câu theo thứ tự.
 */
function paginatePoem(stage, lines, width, height, poem) {
    const measurePage = createPage({ type: "poem", lines: [] }, 1, 1, poem);
    measurePage.classList.add("flipbook-measure");
    measurePage.style.width = `${width}px`;
    measurePage.style.height = `${height}px`;
    stage.append(measurePage);
    const body = measurePage.querySelector(".flipbook-page-body");
    const text = measurePage.querySelector(".flipbook-poem-text");
    // clientHeight tính cả padding; phải trừ padding để không che dòng cuối.
    const bodyStyle = getComputedStyle(body);
    const availableHeight = body.clientHeight
        - parseFloat(bodyStyle.paddingTop || 0)
        - parseFloat(bodyStyle.paddingBottom || 0);
    const pages = [];
    let current = [];

    for (const line of lines) {
        const node = makeLineNode(line, current.length === 0);
        text.append(node);
        if (current.length > 0 && text.scrollHeight > availableHeight + 1) {
            node.remove();
            pages.push({ type: "poem", lines: current });
            text.replaceChildren();
            current = [];
            text.append(makeLineNode(line, true));
        }
        current.push(line);
    }

    if (current.length > 0) pages.push({ type: "poem", lines: current });
    measurePage.remove();
    return pages.length ? pages : [{ type: "poem", lines: [] }];
}

export function initializeFlipbookReader() {
    const reader = document.querySelector("#flipbook-reader");
    const stage = document.querySelector("#flipbook-stage");
    const book = document.querySelector("#flipbook-book");
    const left = document.querySelector("#flipbook-left");
    const right = document.querySelector("#flipbook-right");
    const leaf = document.querySelector("#flipbook-leaf");
    const leafFront = document.querySelector("#flipbook-leaf-front");
    const leafBack = document.querySelector("#flipbook-leaf-back");
    const backButton = document.querySelector("#flipbook-previous");
    const nextButton = document.querySelector("#flipbook-next");
    const seek = document.querySelector("#flipbook-seek");
    const pageLabel = document.querySelector("#flipbook-page-label");
    const nameLabel = document.querySelector("#flipbook-reader-name");
    const oldLayout = document.querySelector("#poem-detail-layout");
    const modeButtons = Array.from(document.querySelectorAll("[data-reader-mode]"));
    if (!reader || !stage || !book || !oldLayout || !leaf || !seek) {
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
        animationTimer: null,
        resizeTimer: null
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
        leaf.hidden = true;
        leaf.style.transition = "none";
        updateNavigation();
    }

    function clearFlip() {
        if (state.animationTimer) clearTimeout(state.animationTimer);
        state.animationTimer = null;
        state.pointer = null;
        state.busy = false;
        leaf.hidden = true;
        leaf.style.transition = "none";
        leaf.style.transform = "rotateY(0deg)";
    }

    function rebuild(preserve = false) {
        if (!state.poem || reader.hidden) return;
        const previousTotal = state.pages.length;
        const previousIndex = firstVisibleIndex();
        clearFlip();

        const available = Math.max(245, stage.clientWidth);
        state.single = available < 710;
        state.width = Math.min(432, Math.floor((available - (state.single ? 8 : 28)) / (state.single ? 1 : 2)));
        state.width = Math.max(230, state.width);
        state.height = Math.round(state.width * 1.40);
        reader.style.setProperty("--flipbook-font-size", `${state.width < 330 ? 13.7 : state.width < 380 ? 14.8 : 16.2}px`);
        reader.style.setProperty("--flipbook-page-width", `${state.width}px`);
        reader.style.setProperty("--flipbook-page-height", `${state.height}px`);

        const lines = makePoemLines(state.poem.content);
        const contentPages = paginatePoem(stage, lines, state.width, state.height, state.poem);
        state.pages = [{ type: "cover" }, ...contentPages, { type: "end" }];
        const scaledIndex = preserve && previousTotal > 1
            ? Math.round((previousIndex / (previousTotal - 1)) * (state.pages.length - 1))
            : 0;
        state.spread = state.single ? scaledIndex : Math.ceil(scaledIndex / 2);
        state.spread = clamp(state.spread, 0, maxSpread());
        draw();
    }

    function prepareFlip(direction) {
        if (state.busy || !state.pages.length) return false;
        const target = state.spread + direction;
        if (target < 0 || target > maxSpread()) return false;
        state.busy = true;

        if (state.single) {
            // Bìa phía trước lật đi, trang sau nằm ở dưới.
            paint(right, direction > 0 ? target : state.spread);
            paint(leafFront, direction > 0 ? state.spread : target);
            paint(leafBack, null);
        } else if (direction > 0) {
            // Bên phải trang hiện tại = mặt trước; bên trái tiếp theo = mặt sau.
            paint(left, state.spread === 0 ? null : state.spread * 2 - 1);
            paint(right, target * 2);
            paint(leafFront, state.spread * 2);
            paint(leafBack, target * 2 - 1);
        } else {
            // Đi ngược: trả tờ giấy bên trái về phía phải.
            paint(left, target === 0 ? null : target * 2 - 1);
            paint(right, state.spread * 2);
            paint(leafFront, target * 2);
            paint(leafBack, state.spread * 2 - 1);
        }
        leaf.hidden = false;
        leaf.style.transition = "none";
        setProgress(direction, 0);
        updateNavigation();
        return true;
    }

    function setProgress(direction, progress) {
        const p = clamp(progress, 0, 1);
        const degrees = direction > 0 ? -180 * p : -180 * (1 - p);
        leaf.style.transform = `rotateY(${degrees}deg)`;
        leaf.style.setProperty("--flipbook-curl", String(Math.sin(Math.PI * (direction > 0 ? p : 1 - p))));
    }

    function settle(direction, complete, fromProgress = 0) {
        const distance = complete ? 1 - fromProgress : fromProgress;
        const ms = REDUCED_MOTION?.matches ? 0 : Math.max(140, ANIMATION_MS * distance);
        leaf.style.transition = `transform ${ms}ms cubic-bezier(.22,.65,.2,1)`;
        // Start next frame so drag position is committed before animation begins.
        requestAnimationFrame(() => setProgress(direction, complete ? 1 : 0));
        state.animationTimer = setTimeout(() => {
            if (complete) state.spread = clamp(state.spread + direction, 0, maxSpread());
            clearFlip();
            draw();
        }, ms + 45);
    }

    function flip(direction) {
        if (!prepareFlip(direction)) return;
        requestAnimationFrame(() => settle(direction, true, 0));
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

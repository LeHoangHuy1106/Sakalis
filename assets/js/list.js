/* =========================================================
   SAKALIS
   File: assets/js/list.js
   ========================================================= */


/* =========================================================
   1. CONFIG
   ========================================================= */
import {
    assignRandomImage
} from "./image-manager.js";

const CONFIG = Object.freeze({
    csvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv",

    locale: "vi-VN",

    pageSize: 24,

  image: {
    directory: "./assets/images",
    prefix: "image-",
    extension: "webp",
    count: 2,
    numberLength: 2,
    customFiles: []
}
});


/* =========================================================
   2. GOOGLE SHEET COLUMN ALIASES
   ========================================================= */

const FIELD_ALIASES = Object.freeze({
    id: [
        "id",
        "index",
        "stt",
        "số thứ tự",
        "so thu tu"
    ],

    title: [
        "title",
        "tiêu đề",
        "tieu de",
        "tên bài",
        "ten bai",
        "tên bài thơ",
        "ten bai tho"
    ],

    slug: [
        "slug",
        "đường dẫn",
        "duong dan"
    ],

    collection: [
        "collection",
        "tập thơ",
        "tap tho",
        "tập",
        "tap"
    ],

    startTime: [
        "start_time",
        "start time",
        "bắt đầu",
        "bat dau",
        "ngày bắt đầu",
        "ngay bat dau",
        "thời gian bắt đầu",
        "thoi gian bat dau"
    ],

    endTime: [
        "end_time",
        "end time",
        "kết thúc",
        "ket thuc",
        "ngày kết thúc",
        "ngay ket thuc"
    ],

    year: [
        "year",
        "năm",
        "nam"
    ],

    topics: [
        "topics",
        "topic",
        "tags",
        "tag",
        "chủ đề",
        "chu de"
    ],

    views: [
        "views",
        "view",
        "lượt xem",
        "luot xem"
    ],

    content: [
        "content",
        "nội dung",
        "noi dung",
        "poem",
        "bài thơ",
        "bai tho"
    ]
});


/* =========================================================
   3. STATE
   ========================================================= */
const state = {
    poems: [],
    filteredPoems: [],
    visibleCount: CONFIG.pageSize,

    query: "",
    sortMode: "date",
    sortDirection: "desc",

    scope: {
        type: "all",
        value: ""
    },

    bookmarks: new Set(),


};

/* =========================================================
   4. DOM
   ========================================================= */

const elements = {
    form: document.querySelector(
        "#list-filter-form"
    ),

    searchInput: document.querySelector(
        "#list-search-input"
    ),

    searchClear: document.querySelector(
        "#list-search-clear"
    ),

    sortSelect: document.querySelector(
        "#list-sort-select"
    ),

    directionButton: document.querySelector(
        "#list-direction-button"
    ),

    directionLabel: document.querySelector(
        "#list-direction-label"
    ),

    scope: document.querySelector(
        "#list-scope"
    ),

    scopeLabel: document.querySelector(
        "#list-scope-label"
    ),

    resultSummary: document.querySelector(
        "#list-result-summary"
    ),

    status: document.querySelector(
        "#list-status"
    ),

    list: document.querySelector(
        "#archive-list"
    ),

    loadMoreWrapper: document.querySelector(
        "#list-load-more-wrapper"
    ),

    loadMoreButton: document.querySelector(
        "#list-load-more-button"
    ),

    template: document.querySelector(
        "#archive-poem-template"
    )
};


/* =========================================================
   5. GENERAL HELPERS
   ========================================================= */

function normalizeKey(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}


function normalizeSearchText(value) {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(CONFIG.locale)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, " ");
}


function cleanSingleLine(value) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}


function cleanPoemContent(value) {
    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}


function createSlug(value) {
    return normalizeSearchText(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "bai-tho";
}


function parseInteger(value) {
    const result = Number.parseInt(
        String(value ?? "")
            .replace(/[^\d-]/g, ""),
        10
    );

    return Number.isFinite(result)
        ? result
        : 0;
}


function parseTopics(value) {
    const uniqueTopics = new Map();

    String(value ?? "")
        .split(/[,;|\n]+/)
        .map(cleanSingleLine)
        .filter(Boolean)
        .forEach((topic) => {
            const key = normalizeSearchText(topic);

            if (!uniqueTopics.has(key)) {
                uniqueTopics.set(key, topic);
            }
        });

    return [...uniqueTopics.values()];
}


function debounce(callback, delay = 180) {
    let timeoutId = null;

    return (...argumentsList) => {
        window.clearTimeout(timeoutId);

        timeoutId = window.setTimeout(
            () => callback(...argumentsList),
            delay
        );
    };
}


/* =========================================================
   6. DATE PARSING
   ========================================================= */

function parseDate(value) {
    const text = cleanSingleLine(value);

    if (!text) {
        return null;
    }

    const isoMatch = text.match(
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );

    if (isoMatch) {
        return createValidDate({
            year: isoMatch[1],
            month: isoMatch[2],
            day: isoMatch[3],
            hour: isoMatch[4] || 0,
            minute: isoMatch[5] || 0,
            second: isoMatch[6] || 0
        });
    }


    const vietnameseMatch = text.match(
        /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );

    if (vietnameseMatch) {
        return createValidDate({
            day: vietnameseMatch[1],
            month: vietnameseMatch[2],
            year: vietnameseMatch[3],
            hour: vietnameseMatch[4] || 0,
            minute: vietnameseMatch[5] || 0,
            second: vietnameseMatch[6] || 0
        });
    }


    const nativeTimestamp = Date.parse(text);

    return Number.isNaN(nativeTimestamp)
        ? null
        : new Date(nativeTimestamp);
}


function createValidDate({
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0
}) {
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);

    const date = new Date(
        numericYear,
        numericMonth - 1,
        numericDay,
        Number(hour),
        Number(minute),
        Number(second)
    );

    const isValid =
        date.getFullYear() === numericYear &&
        date.getMonth() === numericMonth - 1 &&
        date.getDate() === numericDay;

    return isValid ? date : null;
}


/* =========================================================
   7. CSV
   ========================================================= */

async function fetchCsv() {
    const separator = CONFIG.csvUrl.includes("?")
        ? "&"
        : "?";

    const response = await fetch(
        `${CONFIG.csvUrl}${separator}cache=${Date.now()}`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Không thể tải CSV. HTTP ${response.status}.`
        );
    }

    const csvText = await response.text();

    if (!csvText.trim()) {
        throw new Error(
            "Google Sheets trả về dữ liệu trống."
        );
    }

    return csvText;
}


function parseCsv(csvText) {
    const text = String(csvText)
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (
        let index = 0;
        index < text.length;
        index += 1
    ) {
        const character = text[index];
        const nextCharacter = text[index + 1];

        if (character === '"') {
            if (
                insideQuotes &&
                nextCharacter === '"'
            ) {
                cell += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }

            continue;
        }

        if (
            character === "," &&
            !insideQuotes
        ) {
            row.push(cell);
            cell = "";
            continue;
        }

        if (
            character === "\n" &&
            !insideQuotes
        ) {
            row.push(cell);

            if (!isEmptyRow(row)) {
                rows.push(row);
            }

            row = [];
            cell = "";
            continue;
        }

        cell += character;
    }

    row.push(cell);

    if (!isEmptyRow(row)) {
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map(normalizeKey);

    return rows.slice(1).map((csvRow) => {
        const record = {};

        headers.forEach((header, index) => {
            if (header) {
                record[header] = csvRow[index] ?? "";
            }
        });

        return record;
    });
}


function isEmptyRow(row) {
    return row.every(
        (cell) => String(cell).trim() === ""
    );
}


function getField(record, aliases) {
    for (const alias of aliases) {
        const key = normalizeKey(alias);

        if (
            Object.prototype.hasOwnProperty.call(
                record,
                key
            ) &&
            String(record[key]).trim() !== ""
        ) {
            return record[key];
        }
    }

    return "";
}


/* =========================================================
   8. NORMALIZE DATA
   ========================================================= */

function normalizePoems(records) {
    return records
        .map((record, index) => {
            const rawTitle = getField(
                record,
                FIELD_ALIASES.title
            );

            const rawContent = getField(
                record,
                FIELD_ALIASES.content
            );

            const rawStartTime = getField(
                record,
                FIELD_ALIASES.startTime
            );

            const rawEndTime = getField(
                record,
                FIELD_ALIASES.endTime
            );

            const startDate = parseDate(rawStartTime);
            const endDate = parseDate(rawEndTime);

            const parsedYear = parseInteger(
                getField(
                    record,
                    FIELD_ALIASES.year
                )
            );

            const title =
                cleanSingleLine(rawTitle) ||
                `Bài thơ ${index + 1}`;

            const id =
                cleanSingleLine(
                    getField(
                        record,
                        FIELD_ALIASES.id
                    )
                ) ||
                String(index + 1);

            const collection = cleanSingleLine(
                getField(
                    record,
                    FIELD_ALIASES.collection
                )
            );

            const topics = parseTopics(
                getField(
                    record,
                    FIELD_ALIASES.topics
                )
            );

            const year =
                parsedYear ||
                startDate?.getFullYear() ||
                endDate?.getFullYear() ||
                null;

            return {
                id,

                title,

                slug:
                    cleanSingleLine(
                        getField(
                            record,
                            FIELD_ALIASES.slug
                        )
                    ) ||
                    createSlug(title),

                collection,

                topics,

                content:
                    cleanPoemContent(rawContent),

                views: Math.max(
                    0,
                    parseInteger(
                        getField(
                            record,
                            FIELD_ALIASES.views
                        )
                    )
                ),

                year,

                timestamp:
                    startDate?.getTime() ||
                    endDate?.getTime() ||
                    (
                        year
                            ? new Date(
                                year,
                                0,
                                1
                            ).getTime()
                            : 0
                    ),

                sheetIndex: index
            };
        })
        .filter((poem) => {
            return Boolean(
                poem.title || poem.content
            );
        });
}


/* =========================================================
   9. URL STATE
   ========================================================= */

function readUrlState() {
    const parameters = new URLSearchParams(
        window.location.search
    );

    const topic =
        cleanSingleLine(
            parameters.get("topic")
        );

    const collection =
        cleanSingleLine(
            parameters.get("collection")
        );

    if (topic) {
        state.scope = {
            type: "topic",
            value: topic
        };
    } else if (collection) {
        state.scope = {
            type: "collection",
            value: collection
        };
    }


    state.query =
        cleanSingleLine(
            parameters.get("q")
        );


    const sortMode =
        parameters.get("sort");

    if (
        ["date", "title", "views"]
            .includes(sortMode)
    ) {
        state.sortMode = sortMode;
    }


    const sortDirection =
        parameters.get("dir");

    if (
        ["asc", "desc"]
            .includes(sortDirection)
    ) {
        state.sortDirection =
            sortDirection;
    } else {
        state.sortDirection =
            getDefaultDirection(
                state.sortMode
            );
    }


    elements.searchInput.value =
        state.query;

    elements.sortSelect.value =
        state.sortMode;
}


function updateUrlState() {
    const url = new URL(
        window.location.href
    );

    if (state.query) {
        url.searchParams.set(
            "q",
            state.query
        );
    } else {
        url.searchParams.delete("q");
    }


    url.searchParams.set(
        "sort",
        state.sortMode
    );

    url.searchParams.set(
        "dir",
        state.sortDirection
    );


    window.history.replaceState(
        {},
        "",
        url
    );
}


/* =========================================================
   10. FILTER AND SORT
   ========================================================= */

function getDefaultDirection(sortMode) {
    if (sortMode === "title") {
        return "asc";
    }

    return "desc";
}


function filterByScope(poems) {
    if (
        state.scope.type === "all" ||
        !state.scope.value
    ) {
        return poems;
    }

    const target = normalizeSearchText(
        state.scope.value
    );


    if (state.scope.type === "collection") {
        return poems.filter((poem) => {
            return normalizeSearchText(
                poem.collection
            ) === target;
        });
    }


    if (state.scope.type === "topic") {
        return poems.filter((poem) => {
            return poem.topics.some(
                (topic) => {
                    return normalizeSearchText(
                        topic
                    ) === target;
                }
            );
        });
    }

    return poems;
}


function filterBySearch(poems) {
    const query = normalizeSearchText(
        state.query
    );

    if (!query) {
        return poems;
    }

    return poems.filter((poem) => {
        return normalizeSearchText(
            poem.title
        ).includes(query);
    });
}


function sortPoems(poems) {
    const collator = new Intl.Collator(
        CONFIG.locale,
        {
            sensitivity: "base",
            numeric: true
        }
    );

    const directionMultiplier =
        state.sortDirection === "asc"
            ? 1
            : -1;

    return [...poems].sort(
        (firstPoem, secondPoem) => {
            let comparison = 0;


            if (state.sortMode === "title") {
                comparison = collator.compare(
                    firstPoem.title,
                    secondPoem.title
                );
            }


            if (state.sortMode === "views") {
                comparison =
                    firstPoem.views -
                    secondPoem.views;
            }


            if (state.sortMode === "date") {
                const firstHasDate =
                    firstPoem.timestamp > 0;

                const secondHasDate =
                    secondPoem.timestamp > 0;

                if (
                    firstHasDate &&
                    !secondHasDate
                ) {
                    return -1;
                }

                if (
                    !firstHasDate &&
                    secondHasDate
                ) {
                    return 1;
                }

                comparison =
                    firstPoem.timestamp -
                    secondPoem.timestamp;
            }


            if (comparison !== 0) {
                return (
                    comparison *
                    directionMultiplier
                );
            }

            return (
                firstPoem.sheetIndex -
                secondPoem.sheetIndex
            );
        }
    );
}


function applyFilters() {
    let result = filterByScope(
        state.poems
    );

    result = filterBySearch(result);

    result = sortPoems(result);

    state.filteredPoems = result;

    state.visibleCount =
        CONFIG.pageSize;

    updateUrlState();

    render();
}

/* =========================================================

==================================================
   12. BOOKMARKS
   ========================================================= */

function loadBookmarks() {
    try {
        const saved = JSON.parse(
            window.localStorage.getItem(
                "sakalis-bookmarks"
            ) || "[]"
        );

        if (Array.isArray(saved)) {
            state.bookmarks =
                new Set(saved.map(String));
        }
    } catch {
        state.bookmarks = new Set();
    }
}


function saveBookmarks() {
    window.localStorage.setItem(
        "sakalis-bookmarks",
        JSON.stringify(
            [...state.bookmarks]
        )
    );
}


function toggleBookmark(poemId) {
    const id = String(poemId);

    if (state.bookmarks.has(id)) {
        state.bookmarks.delete(id);
    } else {
        state.bookmarks.add(id);
    }

    saveBookmarks();

    updateBookmarkButtons(id);
}


function updateBookmarkButtons(poemId) {
    const buttons = document.querySelectorAll(
        `[data-poem-id="${CSS.escape(poemId)}"]`
    );

    const isSaved =
        state.bookmarks.has(
            String(poemId)
        );

    buttons.forEach((button) => {
        button.classList.toggle(
            "is-saved",
            isSaved
        );

        button.setAttribute(
            "aria-pressed",
            String(isSaved)
        );

        button.setAttribute(
            "aria-label",
            isSaved
                ? "Bỏ lưu bài thơ"
                : "Lưu bài thơ"
        );
    });
}


/* =========================================================
   13. FORMAT
   ========================================================= */

const numberFormatter =
    new Intl.NumberFormat(CONFIG.locale);


function formatNumber(value) {
    return numberFormatter.format(
        Number(value) || 0
    );
}


function createExcerpt(
    content,
    maximumLength = 105
) {
    const normalizedContent =
        String(content ?? "")
            .replace(/\s+/g, " ")
            .trim();

    if (!normalizedContent) {
        return "Bài thơ chưa có nội dung.";
    }

    if (
        normalizedContent.length <=
        maximumLength
    ) {
        return normalizedContent;
    }

    const slicedContent =
        normalizedContent.slice(
            0,
            maximumLength
        );

    const lastSpaceIndex =
        slicedContent.lastIndexOf(" ");

    const safeContent =
        lastSpaceIndex >
        maximumLength * 0.65
            ? slicedContent.slice(
                0,
                lastSpaceIndex
            )
            : slicedContent;

    return `${safeContent.trim()}…`;
}


function createPoemUrl(poem) {
    const parameters =
        new URLSearchParams();

    parameters.set("id", poem.id);

    parameters.set(
        "slug",
        poem.slug
    );

    return (
        `./detail.html?${parameters.toString()}`
    );
}


function getPoemCategory(poem) {
    return (
        poem.collection ||
        poem.topics[0] ||
        "Chưa phân loại"
    );
}


/* =========================================================
   14. RENDER SCOPE
   ========================================================= */

function renderScope() {
    if (
        state.scope.type === "all" ||
        !state.scope.value
    ) {
        elements.scope.hidden = true;

        document.title =
            "Danh sách thơ | Sakalis";

        return;
    }


    const prefix =
        state.scope.type === "topic"
            ? "Chủ đề"
            : "Tập thơ";

    elements.scope.hidden = false;

    elements.scopeLabel.textContent =
        `${prefix}: ${state.scope.value}`;

    document.title =
        `${state.scope.value} | Sakalis`;
}


/* =========================================================
   15. RENDER DIRECTION
   ========================================================= */

function renderDirectionLabel() {
    let label = "";

    if (state.sortMode === "date") {
        label =
            state.sortDirection === "desc"
                ? "Mới → cũ"
                : "Cũ → mới";
    }

    if (state.sortMode === "title") {
        label =
            state.sortDirection === "asc"
                ? "A → Z"
                : "Z → A";
    }

    if (state.sortMode === "views") {
        label =
            state.sortDirection === "desc"
                ? "Cao → thấp"
                : "Thấp → cao";
    }

    elements.directionLabel.textContent =
        label;

    elements.directionButton.title =
        `Đang sắp xếp: ${label}`;
}


/* =========================================================
   16. RENDER LIST
   ========================================================= */

function render() {
    renderScope();

    renderDirectionLabel();

    renderSearchClear();

    renderPoemList();

    renderResultSummary();
}


function renderPoemList() {
    elements.status.hidden = true;

    elements.list.replaceChildren();

    const visiblePoems =
        state.filteredPoems.slice(
            0,
            state.visibleCount
        );


    if (visiblePoems.length === 0) {
        renderEmptyState();

        elements.loadMoreWrapper.hidden =
            true;

        return;
    }


    const fragment =
        document.createDocumentFragment();

    visiblePoems.forEach((poem) => {
        fragment.append(
            createPoemCard(poem)
        );
    });

    elements.list.append(fragment);


    elements.loadMoreWrapper.hidden =
        state.visibleCount >=
        state.filteredPoems.length;
}


function createPoemCard(poem) {
    if (
        !(elements.template
            instanceof HTMLTemplateElement)
    ) {
        throw new Error(
            "Không tìm thấy template bài thơ."
        );
    }

    const card =
        elements.template.content
            .firstElementChild
            .cloneNode(true);

    const poemUrl =
        createPoemUrl(poem);


    const imageLink =
        card.querySelector(
            '[data-field="image-link"]'
        );

    const image =
        card.querySelector(
            '[data-field="image"]'
        );

    const titleLink =
        card.querySelector(
            '[data-field="title-link"]'
        );

    const title =
        card.querySelector(
            '[data-field="title"]'
        );

    const excerpt =
        card.querySelector(
            '[data-field="excerpt"]'
        );

    const category =
        card.querySelector(
            '[data-field="category"]'
        );

    const year =
        card.querySelector(
            '[data-field="year"]'
        );

    const views =
        card.querySelector(
            '[data-field="views"]'
        );

    const bookmark =
        card.querySelector(
            '[data-field="bookmark"]'
        );


    imageLink.href = poemUrl;

    titleLink.href = poemUrl;

    title.textContent = poem.title;

    excerpt.textContent =
        createExcerpt(poem.content);

    category.textContent =
        getPoemCategory(poem);

    year.textContent =
        poem.year || "Không rõ năm";

    views.textContent =
        formatNumber(poem.views);

image.dataset.poemId =
    String(poem.id);

image.dataset.imageAttempts = "0";

    assignRandomImage(
        image,
        `Ảnh minh họa cho bài thơ ${poem.title}`,
        `poem-${poem.id}`
    );

    bookmark.dataset.poemId =
        String(poem.id);

    const isSaved =
        state.bookmarks.has(
            String(poem.id)
        );

    bookmark.classList.toggle(
        "is-saved",
        isSaved
    );

    bookmark.setAttribute(
        "aria-pressed",
        String(isSaved)
    );

    bookmark.setAttribute(
        "aria-label",
        isSaved
            ? "Bỏ lưu bài thơ"
            : "Lưu bài thơ"
    );


    titleLink.setAttribute(
        "aria-label",
        `Đọc bài thơ ${poem.title}`
    );

    return card;
}


function renderEmptyState() {
    const wrapper =
        document.createElement("div");

    wrapper.className =
        "list-empty-state";


    const title =
        document.createElement("h2");

    title.className =
        "list-empty-title";

    title.textContent =
        "Không tìm thấy bài thơ";


    const description =
        document.createElement("p");

    description.className =
        "list-empty-text";

    description.textContent =
        state.query
            ? `Không có bài thơ nào khớp với “${state.query}”.`
            : "Chưa có bài thơ phù hợp với điều kiện hiện tại.";


    wrapper.append(
        title,
        description
    );

    elements.list.append(wrapper);
}


function renderResultSummary() {
    const total =
        state.filteredPoems.length;

    const visible = Math.min(
        state.visibleCount,
        total
    );

    if (total === 0) {
        elements.resultSummary.textContent =
            "Không có bài thơ nào.";

        return;
    }

    elements.resultSummary.textContent =
        `Đang hiển thị ${formatNumber(visible)} trên ${formatNumber(total)} bài thơ.`;
}


function renderSearchClear() {
    elements.searchClear.hidden =
        !state.query;
}


/* =========================================================
   17. ERROR
   ========================================================= */

function renderError(error) {
    console.error(
        "[Sakalis List]",
        error
    );

    elements.status.hidden = false;

    elements.status.replaceChildren();


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-state";


    const title =
        document.createElement("h2");

    title.className =
        "message-state-title";

    title.textContent =
        "Không thể tải danh sách thơ";


    const message =
        document.createElement("p");

    message.className =
        "message-state-text";

    message.textContent =
        "Hãy kiểm tra đường dẫn Google Sheets, tên cột dữ liệu và Console của trình duyệt.";


    wrapper.append(
        title,
        message
    );

    elements.status.append(wrapper);

    elements.resultSummary.textContent =
        "Không thể tải dữ liệu.";
}


/* =========================================================
   18. EVENTS
   ========================================================= */
async function initialize() {
    initializeMobileMenu();

    loadBookmarks();

    readUrlState();

    initializeEvents();

    renderDirectionLabel();

    renderScope();


    try {
        const csvText = await fetchCsv();

        const records = parseCsv(csvText);

        state.poems = normalizePoems(records);

        if (state.poems.length === 0) {
            throw new Error(
                "Không tìm thấy bài thơ hợp lệ."
            );
        }

        applyFilters();

        window.SakalisListData =
            state.poems;

        window.SakalisListState =
            state;
    } catch (error) {
        renderError(error);
    }
}
function initializeEvents() {
    const handleSearch = debounce(() => {
        state.query =
            cleanSingleLine(
                elements.searchInput.value
            );

        applyFilters();
    });


    elements.form.addEventListener(
        "submit",
        (event) => {
            event.preventDefault();

            state.query =
                cleanSingleLine(
                    elements.searchInput.value
                );

            applyFilters();
        }
    );


    elements.searchInput.addEventListener(
        "input",
        handleSearch
    );


    elements.searchClear.addEventListener(
        "click",
        () => {
            elements.searchInput.value = "";

            state.query = "";

            applyFilters();

            elements.searchInput.focus();
        }
    );


    elements.sortSelect.addEventListener(
        "change",
        () => {
            state.sortMode =
                elements.sortSelect.value;

            state.sortDirection =
                getDefaultDirection(
                    state.sortMode
                );

            applyFilters();
        }
    );


    elements.directionButton.addEventListener(
        "click",
        () => {
            state.sortDirection =
                state.sortDirection === "asc"
                    ? "desc"
                    : "asc";

            applyFilters();
        }
    );


    elements.loadMoreButton.addEventListener(
        "click",
        () => {
            state.visibleCount +=
                CONFIG.pageSize;

            renderPoemList();

            renderResultSummary();
        }
    );


    elements.list.addEventListener(
        "click",
        (event) => {
            const bookmarkButton =
                event.target.closest(
                    "[data-poem-id]"
                );

            if (!bookmarkButton) {
                return;
            }

            event.preventDefault();

            toggleBookmark(
                bookmarkButton.dataset.poemId
            );
        }
    );
}


/* =========================================================
   19. MOBILE MENU
   ========================================================= */

function initializeMobileMenu() {
    const menuButton =
        document.querySelector(
            "#header-menu-button"
        );

    const menuDrawer =
        document.querySelector(
            "#menu-drawer"
        );

    const menuOverlay =
        document.querySelector(
            "#menu-overlay"
        );

    const closeButton =
        document.querySelector(
            "#menu-drawer-close"
        );

    if (
        !menuButton ||
        !menuDrawer ||
        !menuOverlay
    ) {
        return;
    }


    const openMenu = () => {
        menuButton.classList.add(
            "is-open"
        );

        menuDrawer.classList.add(
            "is-open"
        );

        menuOverlay.classList.add(
            "is-open"
        );

        document.body.classList.add(
            "menu-open"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        menuDrawer.setAttribute(
            "aria-hidden",
            "false"
        );

        menuOverlay.setAttribute(
            "aria-hidden",
            "false"
        );
    };


    const closeMenu = () => {
        menuButton.classList.remove(
            "is-open"
        );

        menuDrawer.classList.remove(
            "is-open"
        );

        menuOverlay.classList.remove(
            "is-open"
        );

        document.body.classList.remove(
            "menu-open"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        menuDrawer.setAttribute(
            "aria-hidden",
            "true"
        );

        menuOverlay.setAttribute(
            "aria-hidden",
            "true"
        );
    };


    menuButton.addEventListener(
        "click",
        () => {
            if (
                menuDrawer.classList.contains(
                    "is-open"
                )
            ) {
                closeMenu();
            } else {
                openMenu();
            }
        }
    );


    menuOverlay.addEventListener(
        "click",
        closeMenu
    );


    closeButton?.addEventListener(
        "click",
        closeMenu
    );


    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        }
    );


    window.addEventListener(
        "resize",
        () => {
            if (window.innerWidth >= 1024) {
                closeMenu();
            }
        }
    );
}


/* =========================================================
   20. INITIALIZE
   ========================================================= */


    initializeMobileMenu();

    loadBookmarks();

    readUrlState();

    initializeEvents();

    renderDirectionLabel();

    renderScope();

    try {
        const csvText = await fetchCsv();

        const records = parseCsv(csvText);

        state.poems =
            normalizePoems(records);

        if (state.poems.length === 0) {
            throw new Error(
                "Không tìm thấy bài thơ hợp lệ."
            );
        }

        applyFilters();

        window.SakalisListData =
            state.poems;

        console.info(
            `[Sakalis] Đã tải ${state.poems.length} bài thơ.`
        );
    } catch (error) {
        renderError(error);
    }


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


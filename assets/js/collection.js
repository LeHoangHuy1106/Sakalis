/* =========================================================
   SAKALIS
   File: assets/js/collection.js

   Dùng chung cho:
   - collection.html?type=collection
   - collection.html?type=topic
   ========================================================= */

import {
    assignRandomImage
} from "./image-manager.js";


/* =========================================================
   1. CONFIG
   ========================================================= */

const CONFIG = Object.freeze({
    csvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv",

    locale: "vi-VN",

    pageSize: 12
});


/* =========================================================
   2. COLUMN ALIASES
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

    collection: [
        "collection",
        "tập thơ",
        "tap tho",
        "tập",
        "tap",
        "bộ sưu tập",
        "bo suu tap"
    ],

    topics: [
        "topics",
        "topic",
        "tags",
        "tag",
        "chủ đề",
        "chu de",
        "thẻ",
        "the"
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
        "ngay ket thuc",
        "thời gian kết thúc",
        "thoi gian ket thuc"
    ],

    year: [
        "year",
        "năm",
        "nam"
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

    catalogItems: [],

    filteredItems: [],

    type: "collection",

    query: "",

    visibleCount: CONFIG.pageSize
};


/* =========================================================
   4. DOM
   ========================================================= */

const elements = {
    pageTitle:
        document.querySelector(
            "#catalog-page-title"
        ),

    pageEyebrow:
        document.querySelector(
            "#catalog-page-eyebrow"
        ),

    pageDescription:
        document.querySelector(
            "#catalog-page-description"
        ),

    resultSummary:
        document.querySelector(
            "#catalog-result-summary"
        ),

    searchForm:
        document.querySelector(
            "#catalog-search-form"
        ),

    searchInput:
        document.querySelector(
            "#catalog-search-input"
        ),

    searchClear:
        document.querySelector(
            "#catalog-search-clear"
        ),

    loadingLabel:
        document.querySelector(
            "#catalog-loading-label"
        ),

    status:
        document.querySelector(
            "#catalog-status"
        ),

    grid:
        document.querySelector(
            "#catalog-grid"
        ),

    loadMoreWrapper:
        document.querySelector(
            "#catalog-load-more-wrapper"
        ),

    loadMoreButton:
        document.querySelector(
            "#catalog-load-more-button"
        ),

    cardTemplate:
        document.querySelector(
            "#catalog-card-template"
        ),

    emptyTemplate:
        document.querySelector(
            "#catalog-empty-template"
        ),

    desktopCollectionLink:
        document.querySelector(
            "#desktop-collection-link"
        ),

    desktopTopicLink:
        document.querySelector(
            "#desktop-topic-link"
        ),

    bottomCollectionLink:
        document.querySelector(
            "#bottom-collection-link"
        ),

    bottomTopicLink:
        document.querySelector(
            "#bottom-topic-link"
        )
};


/* =========================================================
   5. BASIC HELPERS
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


function parseInteger(value) {
    const number = Number.parseInt(
        String(value ?? "")
            .replace(/[^\d-]/g, ""),
        10
    );

    return Number.isFinite(number)
        ? number
        : 0;
}


function parseTopics(value) {
    const topicMap = new Map();

    String(value ?? "")
        .split(/[,;|\n]+/)
        .map(cleanSingleLine)
        .filter(Boolean)
        .forEach((topic) => {
            const key =
                normalizeSearchText(topic);

            if (!topicMap.has(key)) {
                topicMap.set(key, topic);
            }
        });

    return [...topicMap.values()];
}


function debounce(callback, delay = 180) {
    let timeoutId;

    return (...argumentsList) => {
        window.clearTimeout(timeoutId);

        timeoutId = window.setTimeout(
            () => {
                callback(...argumentsList);
            },
            delay
        );
    };
}


function formatNumber(value) {
    return new Intl.NumberFormat(
        CONFIG.locale
    ).format(Number(value) || 0);
}


function formatPoemCount(value) {
    return `${formatNumber(value)} bài thơ`;
}


/* =========================================================
   6. DATE
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


    const timestamp = Date.parse(text);

    if (Number.isNaN(timestamp)) {
        return null;
    }

    return new Date(timestamp);
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

    const valid =
        date.getFullYear() === numericYear &&
        date.getMonth() === numericMonth - 1 &&
        date.getDate() === numericDay;

    return valid ? date : null;
}


/* =========================================================
   7. CSV FETCH
   ========================================================= */

async function fetchCsv() {
    const separator =
        CONFIG.csvUrl.includes("?")
            ? "&"
            : "?";

    const requestUrl =
        `${CONFIG.csvUrl}${separator}cache=${Date.now()}`;

    const response = await fetch(
        requestUrl,
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

    const beginning = csvText
        .trimStart()
        .slice(0, 100)
        .toLowerCase();

    if (
        beginning.includes("<html") ||
        beginning.includes("<!doctype html")
    ) {
        throw new Error(
            "Google Sheets trả về HTML thay vì CSV."
        );
    }

    return csvText;
}


/* =========================================================
   8. CSV PARSER
   ========================================================= */

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

    const headers = rows[0].map(
        normalizeKey
    );

    return rows
        .slice(1)
        .map((csvRow) => {
            const record = {};

            headers.forEach(
                (header, index) => {
                    if (!header) {
                        return;
                    }

                    record[header] =
                        csvRow[index] ?? "";
                }
            );

            return record;
        });
}


function isEmptyRow(row) {
    return row.every((cell) => {
        return String(cell).trim() === "";
    });
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
   9. NORMALIZE POEMS
   ========================================================= */

function normalizePoems(records) {
    return records
        .map((record, index) => {
            const title =
                cleanSingleLine(
                    getField(
                        record,
                        FIELD_ALIASES.title
                    )
                ) ||
                `Bài thơ ${index + 1}`;

            const startDate = parseDate(
                getField(
                    record,
                    FIELD_ALIASES.startTime
                )
            );

            const endDate = parseDate(
                getField(
                    record,
                    FIELD_ALIASES.endTime
                )
            );

            const parsedYear = parseInteger(
                getField(
                    record,
                    FIELD_ALIASES.year
                )
            );

            const year =
                parsedYear ||
                startDate?.getFullYear() ||
                endDate?.getFullYear() ||
                null;

            return {
                id:
                    cleanSingleLine(
                        getField(
                            record,
                            FIELD_ALIASES.id
                        )
                    ) ||
                    String(index + 1),

                title,

                collection:
                    cleanSingleLine(
                        getField(
                            record,
                            FIELD_ALIASES.collection
                        )
                    ),

                topics:
                    parseTopics(
                        getField(
                            record,
                            FIELD_ALIASES.topics
                        )
                    ),

                content:
                    String(
                        getField(
                            record,
                            FIELD_ALIASES.content
                        ) ?? ""
                    ).trim(),

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
                poem.title ||
                poem.content
            );
        });
}


/* =========================================================
   10. URL STATE
   ========================================================= */

function readUrlState() {
    const parameters =
        new URLSearchParams(
            window.location.search
        );

    const requestedType =
        parameters.get("type");

    state.type =
        requestedType === "topic"
            ? "topic"
            : "collection";

    state.query =
        cleanSingleLine(
            parameters.get("q")
        );

    if (elements.searchInput) {
        elements.searchInput.value =
            state.query;
    }
}


function updateUrlState() {
    const url = new URL(
        window.location.href
    );

    url.searchParams.set(
        "type",
        state.type
    );

    if (state.query) {
        url.searchParams.set(
            "q",
            state.query
        );
    } else {
        url.searchParams.delete("q");
    }

    window.history.replaceState(
        {},
        "",
        url
    );
}


/* =========================================================
   11. GROUP DATA
   ========================================================= */

function createCatalogItems(poems) {
    if (state.type === "topic") {
        return groupByTopic(poems);
    }

    return groupByCollection(poems);
}


function groupByCollection(poems) {
    const collectionMap = new Map();

    poems.forEach((poem) => {
        const collectionName =
            cleanSingleLine(
                poem.collection
            );

        if (!collectionName) {
            return;
        }

        const key =
            normalizeSearchText(
                collectionName
            );

        if (!collectionMap.has(key)) {
            collectionMap.set(key, {
                title: collectionName,
                poems: []
            });
        }

        collectionMap
            .get(key)
            .poems
            .push(poem);
    });

    return [...collectionMap.values()]
        .map((group) => {
            return createCatalogItem(
                group.title,
                group.poems
            );
        })
        .sort(compareCatalogItems);
}


function groupByTopic(poems) {
    const topicMap = new Map();

    poems.forEach((poem) => {
        poem.topics.forEach((topic) => {
            const topicName =
                cleanSingleLine(topic);

            if (!topicName) {
                return;
            }

            const key =
                normalizeSearchText(
                    topicName
                );

            if (!topicMap.has(key)) {
                topicMap.set(key, {
                    title: topicName,
                    poems: []
                });
            }

            topicMap
                .get(key)
                .poems
                .push(poem);
        });
    });

    return [...topicMap.values()]
        .map((group) => {
            return createCatalogItem(
                group.title,
                group.poems
            );
        })
        .sort(compareCatalogItems);
}


function createCatalogItem(title, poems) {
    const years = poems
        .map((poem) => poem.year)
        .filter((year) => {
            return Number.isFinite(year);
        });

    const newestTimestamp = Math.max(
        ...poems.map(
            (poem) => poem.timestamp
        ),
        0
    );

    const minimumYear =
        years.length > 0
            ? Math.min(...years)
            : null;

    const maximumYear =
        years.length > 0
            ? Math.max(...years)
            : null;

    return {
        title,

        poems,

        count: poems.length,

        minimumYear,

        maximumYear,

        newestTimestamp
    };
}


function compareCatalogItems(
    firstItem,
    secondItem
) {
    if (
        state.type === "topic" &&
        secondItem.count !== firstItem.count
    ) {
        return (
            secondItem.count -
            firstItem.count
        );
    }

    if (
        state.type === "collection" &&
        secondItem.newestTimestamp !==
            firstItem.newestTimestamp
    ) {
        return (
            secondItem.newestTimestamp -
            firstItem.newestTimestamp
        );
    }

    return firstItem.title.localeCompare(
        secondItem.title,
        CONFIG.locale,
        {
            sensitivity: "base",
            numeric: true
        }
    );
}


/* =========================================================
   12. FILTER
   ========================================================= */

function applyFilters() {
    const query =
        normalizeSearchText(
            state.query
        );

    if (!query) {
        state.filteredItems = [
            ...state.catalogItems
        ];
    } else {
        state.filteredItems =
            state.catalogItems.filter(
                (item) => {
                    return normalizeSearchText(
                        item.title
                    ).includes(query);
                }
            );
    }

    state.visibleCount =
        CONFIG.pageSize;

    updateUrlState();

    render();
}


/* =========================================================
   13. PAGE MODE
   ========================================================= */

function configurePageMode() {
    const isTopic =
        state.type === "topic";

    document.body.dataset.page =
        isTopic
            ? "topic"
            : "collection";

    document.title =
        isTopic
            ? "Chủ đề | Sakalis"
            : "Tập thơ | Sakalis";


    if (elements.pageTitle) {
        elements.pageTitle.textContent =
            isTopic
                ? "CHỦ ĐỀ"
                : "TẬP THƠ";
    }


    if (elements.pageEyebrow) {
        elements.pageEyebrow.textContent =
            "Kho lưu trữ Sakalis";
    }


    if (elements.pageDescription) {
        elements.pageDescription.textContent =
            isTopic
                ? "Khám phá những bài thơ được lưu giữ theo từng chủ đề và sắc thái cảm xúc."
                : "Những tập thơ lưu giữ từng giai đoạn, cảm xúc và hành trình sáng tác.";
    }


    if (elements.searchInput) {
        elements.searchInput.placeholder =
            isTopic
                ? "Tìm chủ đề..."
                : "Tìm tập thơ...";
    }


    if (elements.loadingLabel) {
        elements.loadingLabel.textContent =
            isTopic
                ? "Đang tải chủ đề"
                : "Đang tải tập thơ";
    }

    updateActiveNavigation();
}


/* =========================================================
   14. ACTIVE NAVIGATION
   ========================================================= */

function updateActiveNavigation() {
    const allLinks = [
        elements.desktopCollectionLink,
        elements.desktopTopicLink,
        elements.bottomCollectionLink,
        elements.bottomTopicLink
    ].filter(Boolean);

    allLinks.forEach((link) => {
        link.classList.remove(
            "is-active"
        );

        link.removeAttribute(
            "aria-current"
        );
    });


    const activeLinks =
        state.type === "topic"
            ? [
                elements.desktopTopicLink,
                elements.bottomTopicLink
            ]
            : [
                elements.desktopCollectionLink,
                elements.bottomCollectionLink
            ];

    activeLinks
        .filter(Boolean)
        .forEach((link) => {
            link.classList.add(
                "is-active"
            );

            link.setAttribute(
                "aria-current",
                "page"
            );
        });
}


/* =========================================================
   15. LINKS AND DESCRIPTIONS
   ========================================================= */

function createItemUrl(item) {
    const parameters =
        new URLSearchParams();

    if (state.type === "topic") {
        parameters.set(
            "topic",
            item.title
        );
    } else {
        parameters.set(
            "collection",
            item.title
        );
    }

    return (
        `./list.html?${parameters.toString()}`
    );
}


function createItemDescription(item) {
    if (state.type === "topic") {
        return (
            `Các bài thơ thuộc chủ đề “${item.title}”.`
        );
    }

    if (
        item.minimumYear &&
        item.maximumYear
    ) {
        if (
            item.minimumYear ===
            item.maximumYear
        ) {
            return (
                `Những bài thơ được sáng tác trong năm ${item.minimumYear}.`
            );
        }

        return (
            `Những bài thơ được sáng tác từ năm ${item.minimumYear} đến ${item.maximumYear}.`
        );
    }

    return (
        "Những bài thơ được lưu giữ trong tập thơ này."
    );
}


/* =========================================================
   16. TEMPLATE
   ========================================================= */

function cloneCardTemplate() {
    if (
        !(
            elements.cardTemplate
            instanceof HTMLTemplateElement
        )
    ) {
        throw new Error(
            "Không tìm thấy #catalog-card-template."
        );
    }

    const element =
        elements.cardTemplate.content
            .firstElementChild;

    if (!element) {
        throw new Error(
            "Template catalog không có nội dung."
        );
    }

    return element.cloneNode(true);
}


function getFieldElement(
    root,
    fieldName
) {
    return root.querySelector(
        `[data-field="${fieldName}"]`
    );
}


/* =========================================================
   17. RENDER
   ========================================================= */

function render() {
    renderSearchClear();

    renderGrid();

    renderResultSummary();
}


function renderGrid() {
    elements.status.hidden = true;

    elements.grid.replaceChildren();

    const visibleItems =
        state.filteredItems.slice(
            0,
            state.visibleCount
        );

    if (visibleItems.length === 0) {
        renderEmptyState();

        elements.loadMoreWrapper.hidden =
            true;

        return;
    }

    const fragment =
        document.createDocumentFragment();

    visibleItems.forEach((item) => {
        fragment.append(
            createCatalogCard(item)
        );
    });

    elements.grid.append(fragment);

    elements.loadMoreWrapper.hidden =
        state.visibleCount >=
        state.filteredItems.length;
}


function createCatalogCard(item) {
    const card =
        cloneCardTemplate();

    const mediaLink =
        getFieldElement(
            card,
            "media-link"
        );

    const image =
        getFieldElement(
            card,
            "image"
        );

    const countBadge =
        getFieldElement(
            card,
            "count-badge"
        );

    const typeElement =
        getFieldElement(
            card,
            "type"
        );

    const titleLink =
        getFieldElement(
            card,
            "title-link"
        );

    const title =
        getFieldElement(
            card,
            "title"
        );

    const description =
        getFieldElement(
            card,
            "description"
        );

    const collectionIcon =
        getFieldElement(
            card,
            "meta-icon-collection"
        );

    const topicIcon =
        getFieldElement(
            card,
            "meta-icon-topic"
        );

    const count =
        getFieldElement(
            card,
            "count"
        );

    const buttonLink =
        getFieldElement(
            card,
            "button-link"
        );

    const itemUrl =
        createItemUrl(item);

    const countText =
        formatPoemCount(item.count);

    const typeText =
        state.type === "topic"
            ? "Chủ đề"
            : "Tập thơ";


    mediaLink.href = itemUrl;

    titleLink.href = itemUrl;

    buttonLink.href = itemUrl;

    title.textContent =
        item.title;

    typeElement.textContent =
        typeText;

    description.textContent =
        createItemDescription(item);

    countBadge.textContent =
        countText;

    count.textContent =
        countText;


    collectionIcon.hidden =
        state.type === "topic";

    topicIcon.hidden =
        state.type !== "topic";


    assignRandomImage(
        image,
        `Ảnh minh họa cho ${typeText.toLowerCase()} ${item.title}`,
        `catalog-${state.type}-${item.title}`
    );


    titleLink.setAttribute(
        "aria-label",
        `Xem thơ trong ${typeText.toLowerCase()} ${item.title}`
    );

    buttonLink.setAttribute(
        "aria-label",
        `Xem thơ trong ${typeText.toLowerCase()} ${item.title}`
    );

    return card;
}


function renderEmptyState() {
    let emptyElement;

    if (
        elements.emptyTemplate
        instanceof HTMLTemplateElement
    ) {
        emptyElement =
            elements.emptyTemplate.content
                .firstElementChild
                .cloneNode(true);
    } else {
        emptyElement =
            document.createElement("div");

        emptyElement.className =
            "catalog-empty-state";

        emptyElement.innerHTML = `
            <h2 class="catalog-empty-title">
                Không tìm thấy dữ liệu
            </h2>

            <p
                class="catalog-empty-text"
                data-field="message"
            ></p>
        `;
    }

    const message =
        getFieldElement(
            emptyElement,
            "message"
        );

    if (message) {
        message.textContent =
            state.query
                ? `Không tìm thấy kết quả nào phù hợp với “${state.query}”.`
                : state.type === "topic"
                    ? "Chưa có chủ đề nào để hiển thị."
                    : "Chưa có tập thơ nào để hiển thị.";
    }

    elements.grid.append(
        emptyElement
    );
}


function renderResultSummary() {
    const total =
        state.filteredItems.length;

    const visible = Math.min(
        state.visibleCount,
        total
    );

    const noun =
        state.type === "topic"
            ? "chủ đề"
            : "tập thơ";

    if (total === 0) {
        elements.resultSummary.textContent =
            `Không có ${noun} nào.`;

        return;
    }

    elements.resultSummary.textContent =
        `Đang hiển thị ${formatNumber(visible)} trên ${formatNumber(total)} ${noun}.`;
}


function renderSearchClear() {
    if (!elements.searchClear) {
        return;
    }

    elements.searchClear.hidden =
        !state.query;
}


/* =========================================================
   18. ERROR
   ========================================================= */

function renderError(error) {
    console.error(
        "[Sakalis Catalog]",
        error
    );

    elements.grid.replaceChildren();

    elements.loadMoreWrapper.hidden =
        true;

    elements.status.hidden =
        false;

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
        "Không thể tải dữ liệu";


    const message =
        document.createElement("p");

    message.className =
        "message-state-text";

    message.textContent =
        "Hãy kiểm tra đường dẫn Google Sheets, tên cột và Console của trình duyệt.";


    wrapper.append(
        title,
        message
    );

    elements.status.append(
        wrapper
    );

    elements.resultSummary.textContent =
        "Không thể tải dữ liệu.";
}


/* =========================================================
   19. EVENTS
   ========================================================= */

function initializeEvents() {
    const handleSearch = debounce(
        () => {
            state.query =
                cleanSingleLine(
                    elements.searchInput.value
                );

            applyFilters();
        }
    );


    elements.searchForm?.addEventListener(
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


    elements.searchInput?.addEventListener(
        "input",
        handleSearch
    );


    elements.searchClear?.addEventListener(
        "click",
        () => {
            elements.searchInput.value = "";

            state.query = "";

            applyFilters();

            elements.searchInput.focus();
        }
    );


    elements.loadMoreButton?.addEventListener(
        "click",
        () => {
            state.visibleCount +=
                CONFIG.pageSize;

            renderGrid();

            renderResultSummary();
        }
    );
}


/* =========================================================
   20. MOBILE MENU
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
            const isOpen =
                menuDrawer.classList.contains(
                    "is-open"
                );

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }
    );


    closeButton?.addEventListener(
        "click",
        closeMenu
    );


    menuOverlay.addEventListener(
        "click",
        closeMenu
    );


    document
        .querySelectorAll(
            ".menu-drawer-link"
        )
        .forEach((link) => {
            link.addEventListener(
                "click",
                closeMenu
            );
        });


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
   21. INITIALIZE
   ========================================================= */

async function initialize() {
    readUrlState();

    configurePageMode();

    initializeMobileMenu();

    initializeEvents();

    try {
        const csvText =
            await fetchCsv();

        const records =
            parseCsv(csvText);

        state.poems =
            normalizePoems(records);

        if (state.poems.length === 0) {
            throw new Error(
                "Không tìm thấy bài thơ hợp lệ."
            );
        }

        state.catalogItems =
            createCatalogItems(
                state.poems
            );

        applyFilters();

        window.SakalisCatalogState =
            state;

        console.info(
            `[Sakalis] Đã tải ${state.catalogItems.length} mục ${state.type}.`
        );
    } catch (error) {
        renderError(error);
    }
}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);
/* =========================================================
   SAKALIS
   File: assets/js/detail.js
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

    relatedLimit: 3,

    bookmarkStorageKey:
        "sakalis-bookmarks",

    viewApiUrl:
        "https://script.google.com/macros/s/AKfycbxhDb3472BOmdCw4AvmPDpCR6bBFl2yCJwdLBCIrVHla9fYb2xnolNeulnY-2cQZQ1qJw/exec"
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
        "tap",
        "bộ sưu tập",
        "bo suu tap"
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

    views: [
        "views",
        "view",
        "lượt xem",
        "luot xem"
    ],

    image: [
        "image",
        "ảnh",
        "anh",
        "thumbnail",
        "cover"
    ],

    featured: [
        "featured",
        "nổi bật",
        "noi bat",
        "feature"
    ],

    content: [
        "content",
        "nội dung",
        "noi dung",
        "poem",
        "bài thơ",
        "bai tho"
    ],

    youtube: [
        "youtube",
        "youtube link",
        "youtube_url",
        "youtube url",
        "video",
        "video youtube"
    ]
});

/* =========================================================
   3. STATE
   ========================================================= */

const state = {
    poems: [],

    currentPoem: null,

    orderedPoems: [],

    currentIndex: -1,

    bookmarks: new Set(),

    toastTimeoutId: null,

    viewIsSending: false
};

/* =========================================================
   4. DOM
   ========================================================= */

const elements = {
    status:
        document.querySelector(
            "#detail-status"
        ),

    error:
        document.querySelector(
            "#detail-error"
        ),

    detail:
        document.querySelector(
            "#poem-detail"
        ),

    backLink:
        document.querySelector(
            "#detail-back-link"
        ),

    bookmarkButton:
        document.querySelector(
            "#detail-bookmark-button"
        ),

    shareButton:
        document.querySelector(
            "#detail-share-button"
        ),

    image:
        document.querySelector(
            "#poem-detail-image"
        ),

    caption:
        document.querySelector(
            "#poem-detail-caption"
        ),

    eyebrow:
        document.querySelector(
            "#poem-detail-eyebrow"
        ),

    title:
        document.querySelector(
            "#poem-detail-title"
        ),

    collection:
        document.querySelector(
            "#poem-detail-collection"
        ),

    collectionLabel:
        document.querySelector(
            "#poem-detail-collection-label"
        ),

    date:
        document.querySelector(
            "#poem-detail-date"
        ),

    views:
        document.querySelector(
            "#poem-detail-views"
        ),

    topics:
        document.querySelector(
            "#poem-detail-topics"
        ),

    content:
        document.querySelector(
            "#poem-detail-content"
        ),

    signatureDate:
        document.querySelector(
            "#poem-detail-signature-date"
        ),

    previousLink:
        document.querySelector(
            "#previous-poem-link"
        ),

    previousTitle:
        document.querySelector(
            "#previous-poem-title"
        ),

    nextLink:
        document.querySelector(
            "#next-poem-link"
        ),

    nextTitle:
        document.querySelector(
            "#next-poem-title"
        ),

    relatedSection:
        document.querySelector(
            "#related-poems-section"
        ),

    relatedGrid:
        document.querySelector(
            "#related-poems-grid"
        ),

    relatedViewAll:
        document.querySelector(
            "#related-poems-view-all"
        ),

    topicTemplate:
        document.querySelector(
            "#detail-topic-template"
        ),

    relatedTemplate:
        document.querySelector(
            "#related-poem-template"
        ),

    toast:
        document.querySelector(
            "#detail-toast"
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
        .toLocaleLowerCase(
            CONFIG.locale
        )
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
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}


function createSlug(value) {
    return normalizeSearchText(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
        "bai-tho";
}


function parseInteger(value) {
    const parsedValue = Number.parseInt(
        String(value ?? "")
            .replace(/[^\d-]/g, ""),
        10
    );

    return Number.isFinite(parsedValue)
        ? parsedValue
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


function getTemplateField(
    root,
    fieldName
) {
    return root.querySelector(
        `[data-field="${fieldName}"]`
    );
}


function formatNumber(value) {
    return new Intl.NumberFormat(
        CONFIG.locale
    ).format(Number(value) || 0);
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


function formatDate(date) {
    if (!(date instanceof Date)) {
        return "";
    }

    return new Intl.DateTimeFormat(
        CONFIG.locale,
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}


function isSameDate(
    firstDate,
    secondDate
) {
    if (
        !(firstDate instanceof Date) ||
        !(secondDate instanceof Date)
    ) {
        return false;
    }

    return (
        firstDate.getFullYear() ===
            secondDate.getFullYear() &&
        firstDate.getMonth() ===
            secondDate.getMonth() &&
        firstDate.getDate() ===
            secondDate.getDate()
    );
}


function formatCompositionDate(poem) {
    const {
        startDate,
        endDate,
        year
    } = poem;

    if (startDate && endDate) {
        if (
            isSameDate(
                startDate,
                endDate
            )
        ) {
            return formatDate(startDate);
        }

        return (
            `${formatDate(startDate)} – ` +
            `${formatDate(endDate)}`
        );
    }

    if (startDate) {
        return formatDate(startDate);
    }

    if (endDate) {
        return formatDate(endDate);
    }

    if (year) {
        return `Năm ${year}`;
    }

    return "Không rõ thời gian";
}


function formatSignatureDate(poem) {
    if (poem.endDate) {
        return formatDate(poem.endDate);
    }

    if (poem.startDate) {
        return formatDate(poem.startDate);
    }

    if (poem.year) {
        return String(poem.year);
    }

    return "";
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

    const csvText =
        await response.text();

    if (!csvText.trim()) {
        throw new Error(
            "Google Sheets trả về dữ liệu trống."
        );
    }

    const beginning = csvText
        .trimStart()
        .slice(0, 120)
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
        const character =
            text[index];

        const nextCharacter =
            text[index + 1];

        if (character === '"') {
            if (
                insideQuotes &&
                nextCharacter === '"'
            ) {
                cell += '"';
                index += 1;
            } else {
                insideQuotes =
                    !insideQuotes;
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


function getField(
    record,
    aliases
) {
    for (const alias of aliases) {
        const key =
            normalizeKey(alias);

        if (
            Object.prototype
                .hasOwnProperty.call(
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
            const rawTitle =
                getField(
                    record,
                    FIELD_ALIASES.title
                );

            const title =
                cleanSingleLine(rawTitle) ||
                `Bài thơ ${index + 1}`;

            const startDate =
                parseDate(
                    getField(
                        record,
                        FIELD_ALIASES.startTime
                    )
                );

            const endDate =
                parseDate(
                    getField(
                        record,
                        FIELD_ALIASES.endTime
                    )
                );

            const parsedYear =
                parseInteger(
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

            const id =
                cleanSingleLine(
                    getField(
                        record,
                        FIELD_ALIASES.id
                    )
                ) ||
                String(index + 1);

            const customSlug =
                cleanSingleLine(
                    getField(
                        record,
                        FIELD_ALIASES.slug
                    )
                );

            return {
                id,

                title,

                slug:
                    customSlug ||
                    createSlug(title),

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

                views:
                    Math.max(
                        0,
                        parseInteger(
                            getField(
                                record,
                                FIELD_ALIASES.views
                            )
                        )
                    ),

                image:
                    cleanSingleLine(
                        getField(
                            record,
                            FIELD_ALIASES.image
                        )
                    ),

                youtube:
                    cleanSingleLine(
                        getField(
                            record,
                            FIELD_ALIASES.youtube
                        )
                    ),

                content:
                    cleanPoemContent(
                        getField(
                            record,
                            FIELD_ALIASES.content
                        )
                    ),

                startDate,

                endDate,

                year,

                timestamp:
                    endDate?.getTime() ||
                    startDate?.getTime() ||
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
   10. CURRENT POEM
   ========================================================= */

function findCurrentPoem(poems) {
    const parameters =
        new URLSearchParams(
            window.location.search
        );

    const requestedId =
        cleanSingleLine(
            parameters.get("id")
        );

    const requestedSlug =
        cleanSingleLine(
            parameters.get("slug")
        );


    if (requestedId) {
        const poemById =
            poems.find((poem) => {
                return String(poem.id) ===
                    String(requestedId);
            });

        if (poemById) {
            return poemById;
        }
    }


    if (requestedSlug) {
        const normalizedSlug =
            createSlug(requestedSlug);

        const poemBySlug =
            poems.find((poem) => {
                return createSlug(
                    poem.slug
                ) === normalizedSlug;
            });

        if (poemBySlug) {
            return poemBySlug;
        }
    }

    return null;
}


function sortPoemsByNewest(poems) {
    return [...poems].sort(
        (
            firstPoem,
            secondPoem
        ) => {
            if (
                secondPoem.timestamp !==
                firstPoem.timestamp
            ) {
                return (
                    secondPoem.timestamp -
                    firstPoem.timestamp
                );
            }

            return (
                firstPoem.sheetIndex -
                secondPoem.sheetIndex
            );
        }
    );
}


/* =========================================================
   11. URL HELPERS
   ========================================================= */

function createPoemUrl(poem) {
    const parameters =
        new URLSearchParams();

    parameters.set(
        "id",
        poem.id
    );

    parameters.set(
        "slug",
        poem.slug
    );

    return (
        `./detail.html?${parameters.toString()}`
    );
}


function createCollectionUrl(
    collectionName
) {
    const parameters =
        new URLSearchParams();

    parameters.set(
        "collection",
        collectionName
    );

    return (
        `./list.html?${parameters.toString()}`
    );
}


function createTopicUrl(topicName) {
    const parameters =
        new URLSearchParams();

    parameters.set(
        "topic",
        topicName
    );

    return (
        `./list.html?${parameters.toString()}`
    );
}


/* =========================================================
   12. MAIN RENDER
   ========================================================= */

function renderPoem(poem) {
    elements.status.hidden = true;

    elements.error.hidden = true;

    elements.detail.hidden = false;
console.log("YOUTUBE:", poem.youtube);

    document.title =
        `${poem.title} | Sakalis`;

    updateMetaDescription(poem);

    configureBackLink();


    elements.title.textContent =
        poem.title;

    elements.eyebrow.textContent =
        poem.collection
            ? `Bài thơ thuộc tập ${poem.collection}`
            : "Bài thơ";

    elements.date.textContent =
        formatCompositionDate(poem);

    elements.views.textContent =
        `${formatNumber(poem.views)} lượt xem`;

    elements.signatureDate.textContent =
        formatSignatureDate(poem);

    elements.caption.textContent =
        poem.collection
            ? `Tập thơ ${poem.collection}`
            : "Sakalis Creative Archive";

renderYoutube(poem);
assignRandomImage(
    elements.image,
    `Ảnh minh họa cho bài thơ ${poem.title}`,
    `detail-poem-${poem.id}`
);

    


    renderCollection(poem);

    renderTopics(poem);

    renderPoemContent(poem.content);

    renderBookmarkState();

    renderPagination();

    renderRelatedPoems();
}
function renderYoutube(poem) {

    const container =
        document.getElementById(
            "poem-detail-youtube"
        );

    container.innerHTML = "";
    container.hidden = true;

    const videoId =
        getYoutubeVideoId(poem.youtube);

    if (!videoId) {
        return;
    }

    container.hidden = false;

    container.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${videoId}?rel=0"
            loading="lazy"
            allowfullscreen
        ></iframe>
    `;
}
function renderYoutubeBelowImage(poem) {
    const figure =
        document.querySelector(
            ".poem-detail-figure"
        );

    if (!figure) {
        return;
    }

    const oldYoutube =
        figure.querySelector(
            ".poem-youtube"
        );

    if (oldYoutube) {
        oldYoutube.remove();
    }

    const youtubeUrl =
        typeof poem.youtube === "string"
            ? poem.youtube.trim()
            : "";

    const videoId =
        getYoutubeVideoId(youtubeUrl);

    if (!videoId) {
        return;
    }

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "poem-youtube";

    const iframe =
        document.createElement("iframe");

    iframe.src =
        `https://www.youtube.com/embed/${videoId}?rel=0`;

    iframe.title =
        poem.title ||
        "YouTube video";

    iframe.loading = "lazy";

    iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );

    iframe.setAttribute(
        "referrerpolicy",
        "strict-origin-when-cross-origin"
    );

    iframe.setAttribute(
        "allowfullscreen",
        ""
    );

    wrapper.appendChild(iframe);

    const caption =
        figure.querySelector(
            ".poem-detail-caption"
        );

    if (caption) {
        caption.insertAdjacentElement(
            "beforebegin",
            wrapper
        );
    } else {
        figure.appendChild(wrapper);
    }
}
/* =========================================================
   13. META DESCRIPTION
   ========================================================= */

function updateMetaDescription(poem) {
    const descriptionElement =
        document.querySelector(
            'meta[name="description"]'
        );

    if (!descriptionElement) {
        return;
    }

    const description =
        poem.content
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 155);

    descriptionElement.content =
        description ||
        `Đọc bài thơ ${poem.title} trong kho lưu trữ Sakalis.`;
}


/* =========================================================
   14. COLLECTION
   ========================================================= */

function renderCollection(poem) {
    if (!poem.collection) {
        elements.collection.hidden = true;
        return;
    }

    elements.collection.hidden = false;

    elements.collection.href =
        createCollectionUrl(
            poem.collection
        );

    elements.collectionLabel.textContent =
        poem.collection;
}


/* =========================================================
   15. TOPICS
   ========================================================= */

function renderTopics(poem) {
    elements.topics.replaceChildren();

    if (poem.topics.length === 0) {
        elements.topics.hidden = true;
        return;
    }

    elements.topics.hidden = false;

    const fragment =
        document.createDocumentFragment();

    poem.topics.forEach((topic) => {
        let topicElement;

        if (
            elements.topicTemplate
            instanceof HTMLTemplateElement
        ) {
            topicElement =
                elements.topicTemplate.content
                    .firstElementChild
                    .cloneNode(true);
        } else {
            topicElement =
                document.createElement("a");

            topicElement.className =
                "poem-detail-topic";

            topicElement.innerHTML =
                '<span data-field="title"></span>';
        }

        const link =
            getTemplateField(
                topicElement,
                "link"
            ) ||
            topicElement;

        const title =
            getTemplateField(
                topicElement,
                "title"
            );

        link.href =
            createTopicUrl(topic);

        title.textContent =
            topic;

        fragment.append(
            topicElement
        );
    });

    elements.topics.append(
        fragment
    );
}


/* =========================================================
   16. POEM CONTENT
   ========================================================= */

function renderPoemContent(content) {
    elements.content.replaceChildren();

    if (!content) {
        const emptyParagraph =
            document.createElement("p");

        emptyParagraph.className =
            "poem-detail-empty-content";

        emptyParagraph.textContent =
            "Bài thơ chưa có nội dung.";

        elements.content.append(
            emptyParagraph
        );

        return;
    }

    const stanzas = content
        .split(/\n\s*\n/)
        .map((stanza) => stanza.trim())
        .filter(Boolean);

    const fragment =
        document.createDocumentFragment();

    stanzas.forEach((stanza) => {
        const paragraph =
            document.createElement("p");

        paragraph.className =
            "poem-detail-stanza";

        const lines =
            stanza.split("\n");

        lines.forEach(
            (line, index) => {
                paragraph.append(
                    document.createTextNode(
                        line.trimEnd()
                    )
                );

                if (
                    index <
                    lines.length - 1
                ) {
                    paragraph.append(
                        document.createElement(
                            "br"
                        )
                    );
                }
            }
        );

        fragment.append(paragraph);
    });

    elements.content.append(fragment);
}


/* =========================================================
   17. BACK LINK
   ========================================================= */

function configureBackLink() {
    if (!document.referrer) {
        return;
    }

    try {
        const referrerUrl =
            new URL(
                document.referrer
            );

        const sameOrigin =
            referrerUrl.origin ===
            window.location.origin;

        const validPage =
            referrerUrl.pathname.endsWith(
                "/list.html"
            ) ||
            referrerUrl.pathname.endsWith(
                "/collection.html"
            ) ||
            referrerUrl.pathname.endsWith(
                "/index.html"
            );

        if (
            sameOrigin &&
            validPage
        ) {
            elements.backLink.href =
                referrerUrl.href;
        }
    } catch {
        elements.backLink.href =
            "./list.html";
    }
}


/* =========================================================
   18. BOOKMARKS
   ========================================================= */

function loadBookmarks() {
    try {
        const savedBookmarks =
            JSON.parse(
                window.localStorage.getItem(
                    CONFIG.bookmarkStorageKey
                ) || "[]"
            );

        if (
            Array.isArray(
                savedBookmarks
            )
        ) {
            state.bookmarks =
                new Set(
                    savedBookmarks.map(
                        String
                    )
                );
        }
    } catch {
        state.bookmarks =
            new Set();
    }
}


function saveBookmarks() {
    try {
        window.localStorage.setItem(
            CONFIG.bookmarkStorageKey,
            JSON.stringify(
                [...state.bookmarks]
            )
        );
    } catch (error) {
        console.warn(
            "[Sakalis] Không thể lưu bookmark.",
            error
        );
    }
}


function toggleBookmark() {
    if (!state.currentPoem) {
        return;
    }

    const poemId =
        String(
            state.currentPoem.id
        );

    if (
        state.bookmarks.has(
            poemId
        )
    ) {
        state.bookmarks.delete(
            poemId
        );

        showToast(
            "Đã bỏ lưu bài thơ"
        );
    } else {
        state.bookmarks.add(
            poemId
        );

        showToast(
            "Đã lưu bài thơ"
        );
    }

    saveBookmarks();

    renderBookmarkState();
}


function renderBookmarkState() {
    if (
        !state.currentPoem ||
        !elements.bookmarkButton
    ) {
        return;
    }

    const isSaved =
        state.bookmarks.has(
            String(
                state.currentPoem.id
            )
        );

    elements.bookmarkButton
        .classList.toggle(
            "is-saved",
            isSaved
        );

    elements.bookmarkButton
        .setAttribute(
            "aria-pressed",
            String(isSaved)
        );

    elements.bookmarkButton
        .setAttribute(
            "aria-label",
            isSaved
                ? "Bỏ lưu bài thơ"
                : "Lưu bài thơ"
        );
}


/* =========================================================
   19. SHARE
   ========================================================= */

async function shareCurrentPoem() {
    const poem =
        state.currentPoem;

    if (!poem) {
        return;
    }

    const shareData = {
        title:
            `${poem.title} | Sakalis`,

        text:
            `Đọc bài thơ “${poem.title}” trên Sakalis.`,

        url:
            window.location.href
    };


    if (
        typeof navigator.share ===
        "function"
    ) {
        try {
            await navigator.share(
                shareData
            );

            return;
        } catch (error) {
            if (
                error?.name ===
                "AbortError"
            ) {
                return;
            }
        }
    }


    const copied =
        await copyText(
            window.location.href
        );

    showToast(
        copied
            ? "Đã sao chép đường dẫn"
            : "Không thể sao chép đường dẫn"
    );
}


async function copyText(text) {
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        try {
            await navigator.clipboard
                .writeText(text);

            return true;
        } catch {
            // Chuyển sang cách dự phòng.
        }
    }

    const input =
        document.createElement(
            "textarea"
        );

    input.value = text;

    input.setAttribute(
        "readonly",
        ""
    );

    input.style.position =
        "fixed";

    input.style.opacity =
        "0";

    input.style.pointerEvents =
        "none";

    document.body.append(input);

    input.select();

    let successful = false;

    try {
        successful =
            document.execCommand(
                "copy"
            );
    } catch {
        successful = false;
    }

    input.remove();

    return successful;
}


/* =========================================================
   20. TOAST
   ========================================================= */

function showToast(message) {
    if (!elements.toast) {
        return;
    }

    window.clearTimeout(
        state.toastTimeoutId
    );

    elements.toast.textContent =
        message;

    elements.toast.hidden =
        false;

    requestAnimationFrame(() => {
        elements.toast.classList.add(
            "is-visible"
        );
    });

    state.toastTimeoutId =
        window.setTimeout(
            () => {
                elements.toast.classList
                    .remove(
                        "is-visible"
                    );

                window.setTimeout(
                    () => {
                        elements.toast.hidden =
                            true;
                    },
                    220
                );
            },
            2300
        );
}


/* =========================================================
   21. PREVIOUS / NEXT
   ========================================================= */

function renderPagination() {
    const currentIndex =
        state.currentIndex;

    const olderPoem =
        state.orderedPoems[
            currentIndex + 1
        ] || null;

    const newerPoem =
        state.orderedPoems[
            currentIndex - 1
        ] || null;


    renderPaginationItem({
        link:
            elements.previousLink,

        title:
            elements.previousTitle,

        poem:
            olderPoem
    });


    renderPaginationItem({
        link:
            elements.nextLink,

        title:
            elements.nextTitle,

        poem:
            newerPoem
    });
}


function renderPaginationItem({
    link,
    title,
    poem
}) {
    if (!poem) {
        link.hidden = true;
        return;
    }

    link.hidden = false;

    link.href =
        createPoemUrl(poem);

    title.textContent =
        poem.title;
}


/* =========================================================
   22. RELATED POEMS
   ========================================================= */

function renderRelatedPoems() {
    const currentPoem =
        state.currentPoem;

    const relatedPoems =
        state.poems
            .filter((poem) => {
                return (
                    String(poem.id) !==
                    String(currentPoem.id)
                );
            })
            .map((poem) => {
                return {
                    poem,

                    score:
                        calculateRelatedScore(
                            currentPoem,
                            poem
                        )
                };
            })
            .sort(
                (
                    firstItem,
                    secondItem
                ) => {
                    if (
                        secondItem.score !==
                        firstItem.score
                    ) {
                        return (
                            secondItem.score -
                            firstItem.score
                        );
                    }

                    return (
                        secondItem.poem.timestamp -
                        firstItem.poem.timestamp
                    );
                }
            )
            .slice(
                0,
                CONFIG.relatedLimit
            )
            .map((item) => item.poem);


    if (relatedPoems.length === 0) {
        elements.relatedSection.hidden =
            true;

        return;
    }

    elements.relatedSection.hidden =
        false;

    elements.relatedGrid
        .replaceChildren();

    configureRelatedViewAllLink(
        currentPoem
    );


    const fragment =
        document.createDocumentFragment();

    relatedPoems.forEach((poem) => {
        fragment.append(
            createRelatedPoemCard(
                poem
            )
        );
    });

    elements.relatedGrid.append(
        fragment
    );
}


function calculateRelatedScore(
    currentPoem,
    candidatePoem
) {
    let score = 0;

    const sameCollection =
        currentPoem.collection &&
        normalizeSearchText(
            currentPoem.collection
        ) ===
        normalizeSearchText(
            candidatePoem.collection
        );

    if (sameCollection) {
        score += 100;
    }


    const currentTopics =
        new Set(
            currentPoem.topics.map(
                normalizeSearchText
            )
        );

    candidatePoem.topics.forEach(
        (topic) => {
            if (
                currentTopics.has(
                    normalizeSearchText(
                        topic
                    )
                )
            ) {
                score += 25;
            }
        }
    );


    if (
        currentPoem.year &&
        candidatePoem.year
    ) {
        const yearDistance =
            Math.abs(
                currentPoem.year -
                candidatePoem.year
            );

        if (yearDistance === 0) {
            score += 10;
        } else if (
            yearDistance <= 2
        ) {
            score += 5;
        }
    }

    return score;
}


function configureRelatedViewAllLink(
    poem
) {
    if (poem.collection) {
        elements.relatedViewAll.href =
            createCollectionUrl(
                poem.collection
            );

        return;
    }

    if (poem.topics.length > 0) {
        elements.relatedViewAll.href =
            createTopicUrl(
                poem.topics[0]
            );

        return;
    }

    elements.relatedViewAll.href =
        "./list.html";
}


function createRelatedPoemCard(poem) {
    if (
        !(
            elements.relatedTemplate
            instanceof HTMLTemplateElement
        )
    ) {
        throw new Error(
            "Không tìm thấy #related-poem-template."
        );
    }

    const card =
        elements.relatedTemplate.content
            .firstElementChild
            .cloneNode(true);

    const mediaLink =
        getTemplateField(
            card,
            "media-link"
        );

    const image =
        getTemplateField(
            card,
            "image"
        );

    const category =
        getTemplateField(
            card,
            "category"
        );

    const titleLink =
        getTemplateField(
            card,
            "title-link"
        );

    const title =
        getTemplateField(
            card,
            "title"
        );

    const year =
        getTemplateField(
            card,
            "year"
        );

    const views =
        getTemplateField(
            card,
            "views"
        );

    const poemUrl =
        createPoemUrl(poem);


    mediaLink.href =
        poemUrl;

    titleLink.href =
        poemUrl;

    title.textContent =
        poem.title;

    category.textContent =
        poem.collection ||
        poem.topics[0] ||
        "Bài thơ";

    year.textContent =
        poem.year ||
        "Không rõ năm";

    views.textContent =
        `${formatNumber(poem.views)} lượt xem`;


    assignRandomImage(
        image,
        `Ảnh minh họa cho bài thơ ${poem.title}`,
        `related-poem-${poem.id}`
    );

    return card;
}


/* =========================================================
   23. ERROR
   ========================================================= */

function renderError(error) {
    console.error(
        "[Sakalis Detail]",
        error
    );

    elements.status.hidden =
        true;

    elements.detail.hidden =
        true;

    elements.error.hidden =
        false;

    document.title =
        "Không tìm thấy bài thơ | Sakalis";
}


/* =========================================================
   24. EVENTS
   ========================================================= */

function initializeEvents() {
    elements.bookmarkButton
        ?.addEventListener(
            "click",
            toggleBookmark
        );

    elements.shareButton
        ?.addEventListener(
            "click",
            shareCurrentPoem
        );
}


/* =========================================================
   25. MOBILE MENU
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
                menuDrawer.classList
                    .contains(
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
            if (
                window.innerWidth >=
                1024
            ) {
                closeMenu();
            }
        }
    );
}


/* =========================================================
   26. INITIALIZE
   ========================================================= */
/* =========================================================
   VIEW TRACKING
   Mỗi lần mở bài thơ sẽ tính 1 view
   ========================================================= */

async function incrementCurrentPoemView() {
    if (
        !state.currentPoem ||
        state.viewIsSending
    ) {
        return;
    }

    state.viewIsSending = true;

    const poemId =
        String(state.currentPoem.id).trim();

    const requestUrl =
        new URL(CONFIG.viewApiUrl);

    requestUrl.searchParams.set(
        "action",
        "increment"
    );

    requestUrl.searchParams.set(
        "id",
        poemId
    );

    requestUrl.searchParams.set(
        "_",
        String(Date.now())
    );

    try {
        const response =
            await fetch(
                requestUrl.toString(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        if (!result.success) {
            throw new Error(
                result.message ||
                "API không tăng được view."
            );
        }

        state.currentPoem.views =
            Number(result.views) || 0;

        elements.views.textContent =
            `${formatNumber(result.views)} lượt xem`;

        console.info(
            `[Sakalis] Đã tăng view bài ${poemId}:`,
            result
        );
    } catch (error) {
        console.error(
            `[Sakalis] Tăng view thất bại cho bài ${poemId}:`,
            error
        );
    } finally {
        state.viewIsSending = false;
    }
}
async function initialize() {
    initializeMobileMenu();

    initializeEvents();

    loadBookmarks();

    try {
        const csvText =
            await fetchCsv();

        const records =
            parseCsv(csvText);

        state.poems =
            normalizePoems(records);

        if (
            state.poems.length === 0
        ) {
            throw new Error(
                "Không tìm thấy dữ liệu bài thơ."
            );
        }


        state.currentPoem =
            findCurrentPoem(
                state.poems
            );

        if (!state.currentPoem) {
            throw new Error(
                "Không tìm thấy bài thơ theo ID hoặc slug."
            );
        }


        state.orderedPoems =
            sortPoemsByNewest(
                state.poems
            );

        state.currentIndex =
            state.orderedPoems
                .findIndex((poem) => {
                    return (
                        String(poem.id) ===
                        String(
                            state.currentPoem.id
                        )
                    );
                });


        renderPoem(
            state.currentPoem
        );

        incrementCurrentPoemView();

        window.SakalisDetailState =
            state;

        console.info(
            `[Sakalis] Đã tải bài thơ: ${state.currentPoem.title}`
        );
    } catch (error) {
        renderError(error);
    }



}
function renderPoemMedia(poem) {
    const image = elements.image;

    if (!image) {
        console.warn(
            "Không tìm thấy phần tử ảnh bài thơ."
        );

        return;
    }

    const youtubeUrl =
        typeof poem.youtube === "string"
            ? poem.youtube.trim()
            : "";

    const videoId =
        getYoutubeVideoId(youtubeUrl);

    /*
     * Nếu trước đó đã render YouTube,
     * khôi phục lại thẻ img trước khi render bài khác.
     */
    let mediaElement =
        document.querySelector(
            ".detail-youtube"
        );

    if (mediaElement) {
        const restoredImage =
            document.createElement("img");

        restoredImage.className =
            image.className || "detail-image";

        restoredImage.id =
            image.id || "";

        restoredImage.alt = "";

        mediaElement.replaceWith(
            restoredImage
        );

        elements.image =
            restoredImage;
    }

    /*
     * Có link YouTube hợp lệ:
     * thay ảnh bằng iframe.
     */
    if (videoId) {
        const youtubeContainer =
            document.createElement("div");

        youtubeContainer.className =
            "detail-youtube";

        const iframe =
            document.createElement("iframe");

iframe.src =
    `https://www.youtube.com/embed/${videoId}?rel=0`;
        iframe.title =
            poem.title ||
            "YouTube video";
    iframe.loading = "lazy";
        iframe.setAttribute(
            "allow",
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );

        iframe.setAttribute(
            "referrerpolicy",
            "strict-origin-when-cross-origin"
        );

        iframe.setAttribute(
            "allowfullscreen",
            ""
        );

        youtubeContainer.appendChild(
            iframe
        );

        elements.image.replaceWith(
            youtubeContainer
        );

        return;
    }

    /*
     * Không có YouTube:
     * giữ cách render ảnh random như cũ.
     */
assignRandomImage(
    elements.image,
    `Ảnh minh họa cho bài thơ ${poem.title}`,
    `detail-poem-${poem.id}`
);
}
function getYoutubeVideoId(url) {
    if (!url) {
        return null;
    }

    try {
        const parsedUrl =
            new URL(url);

        const hostname =
            parsedUrl.hostname
                .replace("www.", "")
                .toLowerCase();

        if (hostname === "youtu.be") {
            return parsedUrl.pathname
                .replace(/^\/+/, "")
                .split("/")[0] || null;
        }

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com"
        ) {
            if (
                parsedUrl.pathname ===
                "/watch"
            ) {
                return parsedUrl.searchParams.get(
                    "v"
                );
            }

            if (
                parsedUrl.pathname.startsWith(
                    "/embed/"
                )
            ) {
                return parsedUrl.pathname
                    .split("/embed/")[1]
                    .split("/")[0] || null;
            }

            if (
                parsedUrl.pathname.startsWith(
                    "/shorts/"
                )
            ) {
                return parsedUrl.pathname
                    .split("/shorts/")[1]
                    .split("/")[0] || null;
            }

            if (
                parsedUrl.pathname.startsWith(
                    "/live/"
                )
            ) {
                return parsedUrl.pathname
                    .split("/live/")[1]
                    .split("/")[0] || null;
            }
        }
    } catch (error) {
        console.warn(
            "Link YouTube không hợp lệ:",
            url
        );
    }

    return null;
}
document.addEventListener(
    "DOMContentLoaded",
    initialize
);
/* =========================================================
   SAKALIS
   File: assets/js/api.js

   Chức năng:
   - Tải CSV từ Google Sheets
   - Parse CSV có nội dung nhiều dòng
   - Chuẩn hóa dữ liệu bài thơ
   - Random ảnh trong assets/images
   - Render Home:
       + Hero
       + Tập thơ
       + Danh sách thơ
       + Chủ đề
   - Xử lý menu mobile
   - Xử lý trạng thái lỗi và ảnh lỗi
   ========================================================= */


/* =========================================================
   1. CONFIG
   ========================================================= */

const CONFIG = Object.freeze({
    csvUrl:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv",

    locale: "vi-VN",

    home: {
        collectionLimit: 3,
        poemLimit: 5,
        topicLimit: 6
    },

    image: {
        directory: "./assets/images",
        prefix: "image-",
        extension: "webp",

        /*
         * Ví dụ:
         *
         * image-01.webp
         * image-02.webp
         * ...
         * image-20.webp
         */
        count: 11,

        /*
         * image-01 thay vì image-1.
         */
        numberLength: 2,

        /*
         * Nếu tên ảnh không theo thứ tự, khai báo tại đây.
         * Khi mảng này có dữ liệu, image.count sẽ bị bỏ qua.
         *
         * Ví dụ:
         *
         * customFiles: [
         *     "rain.webp",
         *     "house.webp",
         *     "city.webp"
         * ]
         */
        customFiles: []
    }
});


/* =========================================================
   2. FIELD ALIASES
   ========================================================= */

/*
 * Hỗ trợ cả tiêu đề cột tiếng Việt và tiếng Anh.
 *
 * Ví dụ:
 * - Tiêu đề / title
 * - Tập thơ / collection
 * - Nội dung / content
 */

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

    featured: [
        "featured",
        "nổi bật",
        "noi bat"
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
   3. APPLICATION STATE
   ========================================================= */

const state = {
    poems: [],

    imageFiles: [],

    imagePool: [],

    imagePoolIndex: 0
};


/* =========================================================
   4. DOM HELPERS
   ========================================================= */

function select(selector, parent = document) {
    return parent.querySelector(selector);
}


function selectAll(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
}


function setText(element, value) {
    if (!element) {
        return;
    }

    element.textContent = String(value ?? "");
}


function setLink(element, url) {
    if (!element) {
        return;
    }

    element.href = url;
}

function toTitleCase(text) {
     const value = String(text || "")
        .trim()
        .toLocaleLowerCase("vi-VN");

    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toLocaleUpperCase("vi-VN") +
        value.slice(1)
    );
}

function getTemplateField(root, fieldName) {
    return root.querySelector(
        `[data-field="${fieldName}"]`
    );
}


function cloneTemplate(templateId) {
    const template = document.getElementById(templateId);

    if (!(template instanceof HTMLTemplateElement)) {
        throw new Error(
            `Không tìm thấy template #${templateId}.`
        );
    }

    const firstElement =
        template.content.firstElementChild;

    if (!firstElement) {
        throw new Error(
            `Template #${templateId} không có nội dung.`
        );
    }

    return firstElement.cloneNode(true);
}


/* =========================================================
   5. GENERAL TEXT HELPERS
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
    const slug = String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "bai-tho";
}


function parseInteger(value) {
    const text = String(value ?? "")
        .replace(/[^\d-]/g, "");

    const result = Number.parseInt(text, 10);

    return Number.isFinite(result)
        ? result
        : 0;
}


function parseBoolean(value) {
    const normalizedValue = normalizeKey(value);

    return [
        "true",
        "1",
        "yes",
        "y",
        "co",
        "featured",
        "noi_bat"
    ].includes(normalizedValue);
}


function parseTopics(value) {
    const topics = String(value ?? "")
        .split(/[,;|\n]+/)
        .map((topic) => cleanSingleLine(topic))
        .filter(Boolean);

    const uniqueTopics = new Map();

    topics.forEach((topic) => {
        const key = topic.toLocaleLowerCase(
            CONFIG.locale
        );

        if (!uniqueTopics.has(key)) {
            uniqueTopics.set(key, topic);
        }
    });

    return [...uniqueTopics.values()];
}


/* =========================================================
   6. DATE PARSING
   ========================================================= */

function parseDate(value) {
    const text = cleanSingleLine(value);

    if (!text) {
        return null;
    }

    /*
     * ISO:
     * 2026-07-04
     * 2026-07-04 21:15
     * 2026/07/04 21:15:00
     */

    const isoMatch = text.match(
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );

    if (isoMatch) {
        const [
            ,
            year,
            month,
            day,
            hour = "0",
            minute = "0",
            second = "0"
        ] = isoMatch;

        return createValidDate({
            year,
            month,
            day,
            hour,
            minute,
            second
        });
    }

    /*
     * Việt Nam:
     * 4-7-2026
     * 04/07/2026 21:15
     */

    const vietnameseMatch = text.match(
        /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
    );

    if (vietnameseMatch) {
        const [
            ,
            day,
            month,
            year,
            hour = "0",
            minute = "0",
            second = "0"
        ] = vietnameseMatch;

        return createValidDate({
            year,
            month,
            day,
            hour,
            minute,
            second
        });
    }

    const nativeTimestamp = Date.parse(text);

    if (!Number.isNaN(nativeTimestamp)) {
        return new Date(nativeTimestamp);
    }

    return null;
}


function createValidDate({
    year,
    month,
    day,
    hour,
    minute,
    second
}) {
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);
    const numericHour = Number(hour);
    const numericMinute = Number(minute);
    const numericSecond = Number(second);

    const date = new Date(
        numericYear,
        numericMonth - 1,
        numericDay,
        numericHour,
        numericMinute,
        numericSecond
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
    const separator = CONFIG.csvUrl.includes("?")
        ? "&"
        : "?";

    /*
     * Thêm timestamp để tránh trình duyệt dùng CSV cũ.
     */

    const requestUrl =
        `${CONFIG.csvUrl}${separator}cache=${Date.now()}`;

    const response = await fetch(requestUrl, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Không thể tải CSV. HTTP ${response.status}.`
        );
    }

    const csvText = await response.text();

    if (!csvText.trim()) {
        throw new Error(
            "Google Sheets trả về CSV trống."
        );
    }

    const beginning = csvText
        .trimStart()
        .slice(0, 120)
        .toLowerCase();

    if (
        beginning.includes("<!doctype html") ||
        beginning.includes("<html")
    ) {
        throw new Error(
            "Google Sheets trả về HTML thay vì CSV. " +
            "Kiểm tra lại chế độ Publish."
        );
    }

    return csvText;
}


/* =========================================================
   8. CSV PARSER
   ========================================================= */

/*
 * Parser này hỗ trợ:
 * - Dấu phẩy trong nội dung
 * - Dấu nháy kép
 * - Nội dung thơ nhiều dòng
 * - Dấu nháy kép escaped bằng ""
 */

function parseCsv(csvText) {
    const normalizedText = String(csvText)
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (
        let index = 0;
        index < normalizedText.length;
        index += 1
    ) {
        const character = normalizedText[index];
        const nextCharacter = normalizedText[index + 1];

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

            if (!isEmptyCsvRow(row)) {
                rows.push(row);
            }

            row = [];
            cell = "";

            continue;
        }

        cell += character;
    }

    row.push(cell);

    if (!isEmptyCsvRow(row)) {
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map((header) => {
        return normalizeKey(header);
    });

    return rows.slice(1).map((csvRow) => {
        const record = {};

        headers.forEach((header, index) => {
            if (!header) {
                return;
            }

            record[header] = csvRow[index] ?? "";
        });

        return record;
    });
}


function isEmptyCsvRow(row) {
    return row.every((cell) => {
        return String(cell).trim() === "";
    });
}


/* =========================================================
   9. FIELD READING
   ========================================================= */

function getField(record, aliases) {
    for (const alias of aliases) {
        const key = normalizeKey(alias);

        if (
            !Object.prototype.hasOwnProperty.call(
                record,
                key
            )
        ) {
            continue;
        }

        const value = record[key];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return "";
}


/* =========================================================
   10. DATA NORMALIZATION
   ========================================================= */

function normalizePoems(records) {
    return records
        .map((record, index) => {
            return normalizePoem(record, index);
        })
        .filter((poem) => {
            return Boolean(
                poem.title || poem.content
            );
        });
}


function normalizePoem(record, index) {
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
        getField(record, FIELD_ALIASES.year)
    );

    const title =
        cleanSingleLine(rawTitle) ||
        `Bài thơ ${index + 1}`;

    const id =
        cleanSingleLine(
            getField(record, FIELD_ALIASES.id)
        ) ||
        String(index + 1);

    const customSlug = cleanSingleLine(
        getField(record, FIELD_ALIASES.slug)
    );

    const content = cleanPoemContent(rawContent);

    const collection = cleanSingleLine(
        getField(
            record,
            FIELD_ALIASES.collection
        )
    );

    const topics = parseTopics(
        getField(record, FIELD_ALIASES.topics)
    );

    const views = Math.max(
        0,
        parseInteger(
            getField(record, FIELD_ALIASES.views)
        )
    );

    const year =
        parsedYear ||
        startDate?.getFullYear() ||
        endDate?.getFullYear() ||
        null;

    const timestamp =
        startDate?.getTime() ||
        endDate?.getTime() ||
        (
            year
                ? new Date(year, 0, 1).getTime()
                : 0
        );

    return {
        id,
        title,

        slug:
            customSlug ||
            createSlug(title),

        collection,

        startTime: cleanSingleLine(rawStartTime),

        endTime: cleanSingleLine(rawEndTime),

        startDate,

        endDate,

        year,

        topics,

        views,

        featured: parseBoolean(
            getField(
                record,
                FIELD_ALIASES.featured
            )
        ),

        content,

        timestamp
    };
}


/* =========================================================
   11. IMAGE MANAGEMENT
   ========================================================= */

function createImageFileList() {
    const customFiles =
        CONFIG.image.customFiles;

    if (
        Array.isArray(customFiles) &&
        customFiles.length > 0
    ) {
        return customFiles.map((fileName) => {
            return (
                `${CONFIG.image.directory}/` +
                `${fileName}`
            );
        });
    }

    return Array.from(
        {
            length: CONFIG.image.count
        },
        (_, index) => {
            const number = String(index + 1)
                .padStart(
                    CONFIG.image.numberLength,
                    "0"
                );

            return (
                `${CONFIG.image.directory}/` +
                `${CONFIG.image.prefix}` +
                `${number}.` +
                `${CONFIG.image.extension}`
            );
        }
    );
}


function shuffleArray(items) {
    const result = [...items];

    for (
        let index = result.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1)
        );

        [
            result[index],
            result[randomIndex]
        ] = [
            result[randomIndex],
            result[index]
        ];
    }

    return result;
}


function resetImagePool() {
    state.imagePool = shuffleArray(
        state.imageFiles
    );

    state.imagePoolIndex = 0;
}


function getRandomImage() {
    if (state.imageFiles.length === 0) {
        return createFallbackImage();
    }

    if (
        state.imagePool.length === 0 ||
        state.imagePoolIndex >=
            state.imagePool.length
    ) {
        resetImagePool();
    }

    const image =
        state.imagePool[state.imagePoolIndex];

    state.imagePoolIndex += 1;

    return image;
}


function assignRandomImage(
    imageElement,
    altText = ""
) {
    if (!(imageElement instanceof HTMLImageElement)) {
        return;
    }

    imageElement.alt = altText;
    imageElement.dataset.imageAttempts = "0";

    imageElement.addEventListener(
        "error",
        handleImageError
    );

    imageElement.src = getRandomImage();
}


function handleImageError(event) {
    const imageElement = event.currentTarget;

    const currentAttempts = Number(
        imageElement.dataset.imageAttempts || 0
    );

    const newAttempts = currentAttempts + 1;

    imageElement.dataset.imageAttempts =
        String(newAttempts);

    const maximumAttempts = Math.min(
        Math.max(state.imageFiles.length, 1),
        8
    );

    if (newAttempts < maximumAttempts) {
        imageElement.src = getRandomImage();
        return;
    }

    imageElement.removeEventListener(
        "error",
        handleImageError
    );

    imageElement.src = createFallbackImage();
}


function createFallbackImage() {
    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 800"
            width="1200"
            height="800"
        >
            <rect
                width="1200"
                height="800"
                fill="#eeeeec"
            />

            <path
                d="
                    M0 620
                    L230 430
                    L410 570
                    L650 310
                    L860 520
                    L1040 380
                    L1200 520
                    V800
                    H0
                    Z
                "
                fill="#d7d7d3"
            />

            <circle
                cx="930"
                cy="180"
                r="82"
                fill="#c6c6c1"
            />

            <text
                x="600"
                y="720"
                text-anchor="middle"
                font-family="Georgia, serif"
                font-size="54"
                letter-spacing="12"
                fill="#757570"
            >
                SAKALIS
            </text>
        </svg>
    `;

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );
}


/* =========================================================
   12. DATA SORTING AND GROUPING
   ========================================================= */

function sortPoemsByNewest(poems) {
    return [...poems].sort(
        (firstPoem, secondPoem) => {
            if (
                secondPoem.timestamp !==
                firstPoem.timestamp
            ) {
                return (
                    secondPoem.timestamp -
                    firstPoem.timestamp
                );
            }

            return String(secondPoem.id)
                .localeCompare(
                    String(firstPoem.id),
                    CONFIG.locale,
                    {
                        numeric: true
                    }
                );
        }
    );
}


function groupPoemsByCollection(poems) {
    const collectionMap = new Map();

    poems.forEach((poem) => {
        const collectionName =
            poem.collection.trim();

        if (!collectionName) {
            return;
        }

        const key =
            collectionName.toLocaleLowerCase(
                CONFIG.locale
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
        .sort(
            (
                firstCollection,
                secondCollection
            ) => {
                const firstLatest = Math.max(
                    ...firstCollection.poems.map(
                        (poem) => poem.timestamp
                    ),
                    0
                );

                const secondLatest = Math.max(
                    ...secondCollection.poems.map(
                        (poem) => poem.timestamp
                    ),
                    0
                );

                if (secondLatest !== firstLatest) {
                    return secondLatest - firstLatest;
                }

                return firstCollection.title
                    .localeCompare(
                        secondCollection.title,
                        CONFIG.locale
                    );
            }
        );
}


function countTopics(poems) {
    const topicMap = new Map();

    poems.forEach((poem) => {
        poem.topics.forEach((topic) => {
            const key =
                topic.toLocaleLowerCase(
                    CONFIG.locale
                );

            if (!topicMap.has(key)) {
                topicMap.set(key, {
                    title: topic,
                    count: 0
                });
            }

            topicMap.get(key).count += 1;
        });
    });

    return [...topicMap.values()]
        .sort((firstTopic, secondTopic) => {
            if (
                secondTopic.count !==
                firstTopic.count
            ) {
                return (
                    secondTopic.count -
                    firstTopic.count
                );
            }

            return firstTopic.title
                .localeCompare(
                    secondTopic.title,
                    CONFIG.locale
                );
        });
}


/* =========================================================
   13. URL HELPERS
   ========================================================= */

function createPoemUrl(poem) {
    const parameters = new URLSearchParams();

    parameters.set("id", poem.id);

    if (poem.slug) {
        parameters.set("slug", poem.slug);
    }

    return (
        `./detail.html?${parameters.toString()}`
    );
}


function createCollectionUrl(collectionName) {
    const name = String(
        collectionName || ""
    ).trim();

    if (!name) {
        return "./list.html";
    }

    return (
        "./list.html?collection=" +
        encodeURIComponent(name)
    );
}


function createTopicUrl(topicName) {
    return (
        `./list.html?topic=${encodeURIComponent(topicName)}`
    );
}

/* =========================================================
   14. FORMATTERS
   ========================================================= */

const numberFormatter =
    new Intl.NumberFormat(CONFIG.locale);


function formatNumber(value) {
    return numberFormatter.format(
        Number(value) || 0
    );
}


function formatPoemCount(value) {
    return `${formatNumber(value)} bài thơ`;
}


function createExcerpt(
    content,
    maximumLength = 110
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

    const truncatedContent =
        normalizedContent.slice(
            0,
            maximumLength
        );

    const lastSpaceIndex =
        truncatedContent.lastIndexOf(" ");

    const safeContent =
        lastSpaceIndex >
        maximumLength * 0.6
            ? truncatedContent.slice(
                0,
                lastSpaceIndex
            )
            : truncatedContent;

    return `${safeContent.trim()}…`;
}


/* =========================================================
   15. MESSAGE STATE
   ========================================================= */

function createMessageState({
    title,
    message
}) {
    const wrapper =
        document.createElement("div");

    wrapper.className = "message-state";

    /*
     * Dùng được cả trong collection grid,
     * topic grid và các vùng khác.
     */

    wrapper.style.gridColumn = "1 / -1";

    const titleElement =
        document.createElement("h3");

    titleElement.className =
        "message-state-title";

    titleElement.textContent = title;

    const messageElement =
        document.createElement("p");

    messageElement.className =
        "message-state-text";

    messageElement.textContent = message;

    wrapper.append(
        titleElement,
        messageElement
    );

    return wrapper;
}


/* =========================================================
   16. HERO RENDERING
   ========================================================= */

function renderHeroImage() {
    const heroImage = select(
        "#hero-background"
    );

    assignRandomImage(heroImage, "");
}


/* =========================================================
   17. COLLECTION RENDERING
   ========================================================= */

function renderCollections(poems) {
    const container = select(
        "#collection-list"
    );

    if (!container) {
        return;
    }

    container.replaceChildren();

    const collections =
        groupPoemsByCollection(poems)
            .slice(
                0,
                CONFIG.home.collectionLimit
            );

    if (collections.length === 0) {
        container.append(
            createMessageState({
                title: "Chưa có tập thơ",
                message:
                    "Các bài thơ hiện chưa được phân vào tập. " +
                    "Hãy điền cột Tập thơ trong Google Sheets."
            })
        );

        return;
    }

    collections.forEach((collection) => {
        const card = cloneTemplate(
            "collection-card-template"
        );

        const mediaLink =
            getTemplateField(
                card,
                "media-link"
            );

        const imageElement =
            getTemplateField(
                card,
                "image"
            );

        const titleLink =
            getTemplateField(
                card,
                "title-link"
            );

        const titleElement =
            getTemplateField(
                card,
                "title"
            );

        const countElement =
            getTemplateField(
                card,
                "count"
            );

        const buttonLink =
            getTemplateField(
                card,
                "button-link"
            );

        const collectionUrl =
            createCollectionUrl(
                collection.title
            );

        setLink(
            mediaLink,
            collectionUrl
        );

        setLink(
            titleLink,
            collectionUrl
        );

        setLink(
            buttonLink,
            collectionUrl
        );

        setText(
            titleElement,
            collection.title
        );

        setText(
            countElement,
            formatPoemCount(
                collection.poems.length
            )
        );

        assignRandomImage(
            imageElement,
            `Ảnh minh họa ngẫu nhiên cho tập thơ ${collection.title}`
        );

        container.append(card);
    });
}


/* =========================================================
   18. POEM LIST RENDERING
   ========================================================= */

function renderPoems(poems) {
    const container = select("#poem-list");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const latestPoems =
        sortPoemsByNewest(poems)
            .slice(
                0,
                CONFIG.home.poemLimit
            );

    if (latestPoems.length === 0) {
        container.append(
            createMessageState({
                title: "Chưa có bài thơ",
                message:
                    "Danh sách thơ hiện chưa có dữ liệu để hiển thị."
            })
        );

        return;
    }

    latestPoems.forEach((poem) => {
        const row = cloneTemplate(
            "poem-row-template"
        );

        const imageLink =
            getTemplateField(
                row,
                "image-link"
            );

        const imageElement =
            getTemplateField(
                row,
                "image"
            );

        const titleLink =
            getTemplateField(
                row,
                "title-link"
            );

        const titleElement =
            getTemplateField(
                row,
                "title"
            );

        const excerptElement =
            getTemplateField(
                row,
                "excerpt"
            );

        const collectionElement =
            getTemplateField(
                row,
                "collection"
            );

        const viewsElement =
            getTemplateField(
                row,
                "views"
            );

        const readLink =
            getTemplateField(
                row,
                "read-link"
            );

        const poemUrl =
            createPoemUrl(poem);

        setLink(
            imageLink,
            poemUrl
        );

        setLink(
            titleLink,
            poemUrl
        );

        setLink(
            readLink,
            poemUrl
        );

        setText(
            titleElement,
            toTitleCase(poem.title)
        );

        setText(
            excerptElement,
            createExcerpt(
                poem.content,
                120
            )
        );

        setText(
            collectionElement,
            poem.collection ||
            poem.topics[0] ||
            "Chưa phân loại"
        );

        setText(
            viewsElement,
            formatNumber(poem.views)
        );

        assignRandomImage(
            imageElement,
            `Ảnh minh họa ngẫu nhiên cho bài thơ ${poem.title}`
        );

        if (readLink) {
            readLink.setAttribute(
                "aria-label",
                `Đọc bài thơ ${poem.title}`
            );
        }

        container.append(row);
    });
}


/* =========================================================
   19. TOPIC RENDERING
   ========================================================= */

function renderTopics(poems) {
    const container = select("#topic-list");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const topics = countTopics(poems)
        .slice(
            0,
            CONFIG.home.topicLimit
        );

    if (topics.length === 0) {
        container.append(
            createMessageState({
                title: "Chưa có chủ đề",
                message:
                    "Hãy điền cột Chủ đề trong Google Sheets để phân loại bài thơ."
            })
        );

        return;
    }

   topics.forEach((topic) => {
            const pill = cloneTemplate(
                "topic-pill-template"
            );

            const linkElement = pill;

            const titleElement =
                getTemplateField(
                    pill,
                    "title"
                );

            const topicName =
                typeof topic === "string"
                    ? topic
                    : (
                        topic.title ||
                        topic.name ||
                        ""
                    );

            setText(
                titleElement,
                topicName
            );

            setLink(
                linkElement,
                createTopicUrl(topicName)
            );

            container.append(pill);
        });
}


/* =========================================================
   20. HOME RENDERING
   ========================================================= */

function renderHome(poems) {
    renderHeroImage();

    renderCollections(poems);

    renderPoems(poems);

    renderTopics(poems);
}


/* =========================================================
   21. MOBILE MENU
   ========================================================= */

function initializeMobileMenu() {
    const menuButton = select(
        "#header-menu-button"
    );

    const menuDrawer = select(
        "#menu-drawer"
    );

    const menuOverlay = select(
        "#menu-overlay"
    );

    const closeButton = select(
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
        menuButton.classList.add("is-open");

        menuDrawer.classList.add("is-open");

        menuOverlay.classList.add("is-open");

        document.body.classList.add(
            "menu-open"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        menuButton.setAttribute(
            "aria-label",
            "Đóng menu"
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

        menuButton.setAttribute(
            "aria-label",
            "Mở menu"
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


    menuOverlay.addEventListener(
        "click",
        closeMenu
    );


    closeButton?.addEventListener(
        "click",
        closeMenu
    );


    selectAll(
        ".menu-drawer-link",
        menuDrawer
    ).forEach((link) => {
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
   22. ACTIVE NAVIGATION
   ========================================================= */

function initializeActiveNavigation() {
    const currentPage =
        document.body.dataset.page || "home";

    const pageTargets = {
        home: "./index.html",
        list: "./list.html",
        collection:
            "./collection.html?type=collection",
        topic:
            "./collection.html?type=topic"
    };

    const activeTarget =
        pageTargets[currentPage];

    if (!activeTarget) {
        return;
    }

    const navigationLinks = selectAll(
        ".desktop-nav-link, " +
        ".bottom-nav-link"
    );

    navigationLinks.forEach((link) => {
        link.classList.remove("is-active");

        link.removeAttribute("aria-current");

        const href = link.getAttribute("href");

        if (href === activeTarget) {
            link.classList.add("is-active");

            link.setAttribute(
                "aria-current",
                "page"
            );
        }
    });
}


/* =========================================================
   23. ERROR RENDERING
   ========================================================= */

function renderLoadError(error) {
    console.error(
        "[Sakalis]",
        error
    );

    /*
     * Hero vẫn có thể dùng ảnh random dù CSV lỗi.
     */

    renderHeroImage();

    const errorTargets = [
        {
            selector: "#collection-list",
            title:
                "Không thể tải tập thơ"
        },

        {
            selector: "#poem-list",
            title:
                "Không thể tải danh sách thơ"
        },

        {
            selector: "#topic-list",
            title:
                "Không thể tải chủ đề"
        }
    ];

    errorTargets.forEach((target) => {
        const container = select(
            target.selector
        );

        if (!container) {
            return;
        }

        container.replaceChildren(
            createMessageState({
                title: target.title,

                message:
                    "Không thể đọc dữ liệu từ Google Sheets. " +
                    "Hãy kiểm tra đường dẫn CSV, tên cột và Console của trình duyệt."
            })
        );
    });
}


/* =========================================================
   24. APPLICATION STARTUP
   ========================================================= */

async function initializeApplication() {
    initializeMobileMenu();

    initializeActiveNavigation();

    state.imageFiles =
        createImageFileList();

    resetImagePool();

    /*
     * Hero xuất hiện trước khi CSV tải xong.
     */

    renderHeroImage();

    try {
        const csvText = await fetchCsv();

        const records = parseCsv(csvText);

        const poems =
            normalizePoems(records);

        if (poems.length === 0) {
            throw new Error(
                "CSV tải thành công nhưng không tìm thấy bài thơ hợp lệ."
            );
        }

        state.poems = poems;

        renderHome(poems);

        /*
         * Có thể kiểm tra dữ liệu bằng Console:
         *
         * window.SakalisData
         */

        window.SakalisData = poems;

        window.SakalisState = state;

        console.info(
            `[Sakalis] Đã tải ${poems.length} bài thơ.`
        );
    } catch (error) {
        renderLoadError(error);
    }
}


/* =========================================================
   25. START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);
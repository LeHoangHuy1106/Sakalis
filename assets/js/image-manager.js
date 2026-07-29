/* =========================================================
   SAKALIS
   Shared random image manager
   ========================================================= */

const IMAGE_CONFIG = Object.freeze({
    prefix: "image-",
    extension: "webp",
    count: 11,
    numberLength: 2
});


const imageFiles = Array.from(
    {
        length: IMAGE_CONFIG.count
    },
    (_, index) => {
        const number = String(index + 1)
            .padStart(
                IMAGE_CONFIG.numberLength,
                "0"
            );

        /*
         * Đường dẫn được tính từ chính file JS này:
         * assets/js/image-manager.js
         *          ↓
         * assets/images/image-01.webp
         */
        return new URL(
            `../images/${IMAGE_CONFIG.prefix}${number}.${IMAGE_CONFIG.extension}`,
            import.meta.url
        ).href;
    }
);


const imageAssignments = new Map();

let imagePool = [];
let imagePoolIndex = 0;


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
    imagePool = shuffleArray(imageFiles);
    imagePoolIndex = 0;
}


function takeRandomImage() {
    if (imageFiles.length === 0) {
        return createFallbackImage();
    }

    if (
        imagePool.length === 0 ||
        imagePoolIndex >= imagePool.length
    ) {
        resetImagePool();
    }

    const imageUrl =
        imagePool[imagePoolIndex];

    imagePoolIndex += 1;

    return imageUrl;
}


function getImageForKey(key) {
    const normalizedKey = String(
        key || crypto.randomUUID()
    );

    if (!imageAssignments.has(normalizedKey)) {
        imageAssignments.set(
            normalizedKey,
            takeRandomImage()
        );
    }

    return imageAssignments.get(normalizedKey);
}


export function assignRandomImage(
    imageElement,
    altText = "",
    assignmentKey = ""
) {
    if (
        !(imageElement instanceof HTMLImageElement)
    ) {
        return;
    }

    const key =
        String(assignmentKey) ||
        crypto.randomUUID();

    let attempts = 0;

    const maximumAttempts = Math.min(
        imageFiles.length,
        10
    );


    const loadNextImage = () => {
        imageAssignments.delete(key);

        const imageUrl =
            getImageForKey(key);

        imageElement.dataset.originalSrc =
            imageUrl;

        imageElement.src = imageUrl;
    };


    imageElement.alt = altText;


    imageElement.onerror = () => {
        attempts += 1;

        console.warn(
            "[Sakalis] Không tải được ảnh:",
            imageElement.dataset.originalSrc
        );

        if (attempts < maximumAttempts) {
            loadNextImage();
            return;
        }

        imageElement.onerror = null;

        imageElement.src =
            createFallbackImage();
    };


    imageElement.dataset.originalSrc =
        getImageForKey(key);

    imageElement.src =
        imageElement.dataset.originalSrc;
}


export function getRandomImageUrl(
    assignmentKey = ""
) {
    return getImageForKey(
        assignmentKey
    );
}


export function clearImageAssignments() {
    imageAssignments.clear();

    resetImagePool();
}


function createFallbackImage() {
    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 900"
        >
            <rect
                width="600"
                height="900"
                fill="#eeeeec"
            />

            <path
                d="
                    M0 700
                    L130 530
                    L250 640
                    L380 420
                    L510 570
                    L600 500
                    V900
                    H0
                    Z
                "
                fill="#d1d1cd"
            />

            <circle
                cx="440"
                cy="190"
                r="65"
                fill="#c4c4bf"
            />

            <text
                x="300"
                y="815"
                text-anchor="middle"
                font-family="Georgia, serif"
                font-size="36"
                letter-spacing="7"
                fill="#777772"
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
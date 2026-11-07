(() => {
    "use strict";

    const MUSIC_SOURCE =
        "./assets/audio/background.mp3";

    const STORAGE_KEY =
        "sakalis-detail-music";

    const audio = new Audio(MUSIC_SOURCE);

    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0.35;

    let isPlaying = false;

    const savedState = loadState();

    if (typeof savedState.volume === "number") {
        audio.volume = savedState.volume;
    }

    if (typeof savedState.currentTime === "number") {
        audio.addEventListener(
            "loadedmetadata",
            () => {
                if (
                    savedState.currentTime >= 0 &&
                    savedState.currentTime < audio.duration
                ) {
                    audio.currentTime =
                        savedState.currentTime;
                }
            },
            {
                once: true
            }
        );
    }

    injectStyles();
    createMusicButton();
    bindAudioEvents();

    function createMusicButton() {
        const button = document.createElement("button");

        button.id = "sakalis-music-button";
        button.type = "button";
        button.className = "sakalis-music-button";
        button.setAttribute(
            "aria-label",
            "Bật nhạc nền"
        );

        button.innerHTML = `
            <span
                class="sakalis-music-icon"
                aria-hidden="true"
            >
                ♫
            </span>
        `;

        button.addEventListener(
            "click",
            toggleMusic
        );

        document.body.appendChild(button);

        updateButton();
    }
    async function toggleMusic() {
        if (audio.paused) {
            try {
                await audio.play();
            } catch (error) {
                console.warn(
                    "[Sakalis Music] Không thể phát nhạc.",
                    error
                );
            }

            return;
        }

        audio.pause();
    }


    function bindAudioEvents() {
        audio.addEventListener(
            "play",
            () => {
                isPlaying = true;

                updateButton();
                saveState();
            }
        );

        audio.addEventListener(
            "pause",
            () => {
                isPlaying = false;

                updateButton();
                saveState();
            }
        );

        audio.addEventListener(
            "timeupdate",
            saveState
        );

        audio.addEventListener(
            "error",
            () => {
                console.warn(
                    "[Sakalis Music] Không tải được file:",
                    MUSIC_SOURCE
                );
            }
        );

        window.addEventListener(
            "beforeunload",
            saveState
        );

        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) {
                    saveState();
                }
            }
        );
    }


    function updateButton() {
        const button = document.getElementById(
            "sakalis-music-button"
        );

        if (!button) {
            return;
        }

        button.classList.toggle(
            "is-playing",
            isPlaying
        );

        button.setAttribute(
            "aria-label",
            isPlaying
                ? "Tắt nhạc nền"
                : "Bật nhạc nền"
        );

        button.title =
            isPlaying
                ? "Tắt nhạc nền"
                : "Bật nhạc nền";
    }


    function saveState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    currentTime:
                        Number.isFinite(audio.currentTime)
                            ? audio.currentTime
                            : 0,

                    volume:
                        audio.volume
                })
            );
        } catch (error) {
            console.warn(
                "[Sakalis Music] Không lưu được trạng thái.",
                error
            );
        }
    }


    function loadState() {
        try {
            const value =
                localStorage.getItem(STORAGE_KEY);

            if (!value) {
                return {};
            }

            return JSON.parse(value);
        } catch (error) {
            return {};
        }
    }


    function injectStyles() {
        if (
            document.getElementById(
                "sakalis-music-styles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id = "sakalis-music-styles";

        style.textContent = `
            .sakalis-music-button {
                position: fixed;
                right: 22px;
                bottom: 100px;
                z-index: 9999;

                width: 52px;
                height: 52px;

                display: flex;
                align-items: center;
                justify-content: center;

                padding: 0;
                border: 1px solid rgba(255, 255, 255, 0.25);
                border-radius: 50%;

                color: #ffffff;
                background: rgba(18, 18, 18, 0.82);

                box-shadow:
                    0 8px 28px rgba(0, 0, 0, 0.25);

                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);

                cursor: pointer;
                transition:
                    transform 180ms ease,
                    background-color 180ms ease,
                    box-shadow 180ms ease;
            }

            .sakalis-music-button:hover {
                transform: translateY(-2px);
                background: rgba(35, 35, 35, 0.92);
            }

            .sakalis-music-button:active {
                transform: scale(0.94);
            }

            .sakalis-music-button:focus-visible {
                outline: 2px solid currentColor;
                outline-offset: 4px;
            }

            .sakalis-music-icon {
                display: block;
                font-size: 25px;
                line-height: 1;
            }

            .sakalis-music-button.is-playing {
                animation:
                    sakalis-music-pulse 2s ease-in-out infinite;
            }

            .sakalis-music-button.is-playing
            .sakalis-music-icon {
                animation:
                    sakalis-music-spin 4s linear infinite;
            }

            @keyframes sakalis-music-pulse {
                0%,
                100% {
                    box-shadow:
                        0 8px 28px rgba(0, 0, 0, 0.25),
                        0 0 0 0 rgba(255, 255, 255, 0.16);
                }

                50% {
                    box-shadow:
                        0 8px 28px rgba(0, 0, 0, 0.25),
                        0 0 0 9px rgba(255, 255, 255, 0);
                }
            }

            @keyframes sakalis-music-spin {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
                }
            }

            @media (max-width: 640px) {
                .sakalis-music-button {
                    right: 16px;
                    bottom: 100px;

                    width: 46px;
                    height: 46px;
                            }

                .sakalis-music-icon {
                    font-size: 22px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .sakalis-music-button,
                .sakalis-music-icon {
                    animation: none !important;
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }
})();
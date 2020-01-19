Extracts = {
    baseURL: "https://xv.ax",
    popupStylesID: "popups-styles",
    popupContainerID: "popup-container",
    popupContainerParentSelector: "html",
    targetElementsSelector: "#markdownBody a[href^='http'], #markdownBody a[href^='.'], #markdownBody p a[href^='#'], #TOC a",
    minPopupWidth: 360,
    maxPopupWidth: 640,
    screenshotSize: 768,
    popupBorderWidth: 3.0,
    videoPopupWidth: 495,
    videoPopupHeight: 310,
    popupTriggerDelay: 150,
    popupFadeoutDelay: 50,
    popupFadeoutDuration: 250,
    popupFadeTimer: false,
    popupDespawnTimer: false,
    popupSpawnTimer: false,
    popupBreathingRoomX: 24.0,
    popupBreathingRoomY: 16.0,
    popup: null,
    encoder: new TextEncoder(),
    previewsPath: "/static/previews/",
    previewsFileExtension: "png",
    isMobileMediaQuery: matchMedia("not screen and (hover:hover) and (pointer:fine)"),
    escapeForJQ: (target) => {
        return target.replace( /(:|\.|\[|\])/g, "\\$1" );
    },
    extractForTarget: (target) => {
        return `<div class='popup-extract' onclick='parentNode.remove()'>` +
            `<p class='data-field title'><a class='icon' target='_new' href='${target.href}' title='Open this reference in a new window'></a><a class='title-link' target='_new' href='${target.href}' title='${target.href}'>${target.dataset.popupTitle||""}</a></p>` +
            `<p class='data-field author-plus-date'>${target.dataset.popupAuthor||""}${target.dataset.popupDate?(" ("+target.dataset.popupDate+")"):""}</p>` +
            `<div class='data-field abstract' onclick='parentNode.remove()'>${target.dataset.popupAbstract||""}</div>` +
            `</div>`;
    },
    youtubeId: (url) => {
        let match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        if (match && match[2].length == 11) {
            return match[2];
        } else {
            return '';
        }
    },
    videoForTarget: (target, videoId) => {
        return `<div class='popup-screenshot' onclick="parentNode.remove()">` +
            `<iframe width="${Extracts.videoPopupWidth}px" height="${Extracts.videoPopupHeight}px"` +
            `src="//www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen>` +
            `</iframe></div>`;
    },
    previewForTarget: (target) => {
        const canonicalHref = target.href.startsWith(Extracts.baseURL) ? target.pathname.substr(1) + target.hash : target.href;
        console.log(canonicalHref);
        const hashPromise = crypto.subtle.digest('SHA-1', Extracts.encoder.encode(canonicalHref));
        hashPromise.then(async (linkURLArrayBuffer) => {
            const linkURLHash = Array.from(new Uint8Array(linkURLArrayBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            let imageWidth = target.dataset.popupImageWidth + "px";
            let imageHeight = target.dataset.popupImageHeight + "px";
            Extracts.popup.innerHTML = `<div class='popup-screenshot'>` +
                `<a alt='Screenshot of page at ${target.href}' title='${target.href}\n[Opens in new window]' target='_new' href='${target.href}'>` +
                `<img src='${Extracts.previewsPath}${linkURLHash}.${Extracts.previewsFileExtension}' style='width:${imageWidth}; height:${imageHeight};'>` +
                `</a></div>`;
        });
        return "";
    },
    sectionEmbedForTarget: (target) => {
        let targetSectionHTML = document.querySelector(Extracts.escapeForJQ(target.getAttribute('href'))).innerHTML;
        return `<div class='popup-section-embed'>${targetSectionHTML}</div>`;
    },
    localImageForTarget: (target) => {
        return `<div class='popup-local-image'><img src='${target.href}'></div>`;
    },
    unbind: () => {
        document.querySelectorAll(Extracts.targetElementsSelector).forEach(target => {
            target.removeEventListener("mouseover", Extracts.targetover);
            target.removeEventListener("mouseout", Extracts.targetout);
            target.onclick = () => {};
        });
        if (Extracts.popupContainer)
            Extracts.popupContainer.removeEventListener("mouseup", Extracts.popupContainerClicked);
    },
    cleanup: () => {
        console.log("popups.js: Cleaning up...");
        Extracts.unbind();
        document.querySelectorAll(`#${Extracts.popupStylesID}, #${Extracts.popupContainerID}`).forEach(element => element.remove());
    },
    setup: () => {
        Extracts.cleanup();
        if (('ontouchstart' in document.documentElement) && Extracts.isMobileMediaQuery.matches) {
            console.log("Mobile client detected. Exiting.");
            return;
        } else {
            console.log("popups.js: Setting up...");
        }
        document.querySelector("head").insertAdjacentHTML("beforeend", Extracts.popupStylesHTML);
        var popupContainerParent = document.querySelector(Extracts.popupContainerParentSelector);
        document.querySelector(Extracts.popupContainerParentSelector).insertAdjacentHTML("beforeend", `<div id='${Extracts.popupContainerID}'></div>`);
        requestAnimationFrame(() => {
            Extracts.popupContainer = document.querySelector(`#${Extracts.popupContainerID}`);
            Extracts.popupContainer.addEventListener("mouseup", Extracts.popupContainerClicked);
        });
        document.querySelectorAll(Extracts.targetElementsSelector).forEach(target => {
            target.addEventListener("mouseover", Extracts.targetover);
            target.addEventListener("mouseout", Extracts.targetout);
            target.removeAttribute("title");
            target.onclick = () => {
                return false;
            };
        });
    },
    targetover: (event) => {
        let target = event.target.closest("a");
        if (target.classList.contains("footnote-ref"))
            return;
        event.preventDefault();
        clearTimeout(Extracts.popupFadeTimer);
        clearTimeout(Extracts.popupDespawnTimer);
        clearTimeout(Extracts.popupSpawnTimer);
        Extracts.popupSpawnTimer = setTimeout(() => {
            target.onclick = () => {};
            let popupContainerViewportRect = Extracts.popupContainer.getBoundingClientRect();
            let targetViewportRect = target.getBoundingClientRect();
            let targetOriginInPopupContainer = {
                x: (targetViewportRect.left - popupContainerViewportRect.left),
                y: (targetViewportRect.top - popupContainerViewportRect.top)
            }
            let mouseOverEventPositionInPopupContainer = {
                x: (event.clientX - popupContainerViewportRect.left),
                y: (event.clientY - popupContainerViewportRect.top)
            };
            Extracts.popup = document.querySelector("#popupdiv");
            if (Extracts.popup) {
                Extracts.popup.classList.remove("fading");
                Extracts.popup.remove();
            } else {
                Extracts.popup = document.createElement('div');
                Extracts.popup.id = "popupdiv";
                Extracts.popup.className = target.className;
            }
            var isVideo = false;
            let videoId = Extracts.youtubeId(target.href);
            Extracts.popup.removeAttribute("style");
            if (videoId) {
                Extracts.popup.innerHTML = Extracts.videoForTarget(target, videoId);
                isVideo = true;
            } else if (target.getAttribute("href").startsWith("#")) {
                Extracts.popup.innerHTML = Extracts.sectionEmbedForTarget(target);
                Extracts.popup.querySelectorAll(".caption-wrapper").forEach(captionWrapper => {
                    captionWrapper.style.minWidth = "";
                });
                Extracts.popup.querySelectorAll("a:not([href^='#'])").forEach(externalLink => {
                    externalLink.target = "_new";
                    externalLink.title = externalLink.href + "\n[Opens in new window]";
                });
                Extracts.popup.style.width = Extracts.maxPopupWidth + "px";
                Extracts.popup.style.maxHeight = (Extracts.maxPopupWidth * 0.75) + "px";
            } else if (target.href.startsWith("https://xv.ax/img/") && target.href.endsWith(".svg")) {
                Extracts.popup.innerHTML = Extracts.localImageForTarget(target);
            } else if (target.classList.contains("docMetadata")) {
                if (target.dataset.popupImageWidth) {
                    Extracts.popup.innerHTML = Extracts.previewForTarget(target);
                } else {
                    Extracts.popup.innerHTML = Extracts.extractForTarget(target);
                }
            }
            Extracts.popup.style.visibility = "hidden";
            Extracts.popup.style.left = "0px";
            Extracts.popup.style.top = "0px";
            document.querySelector(`#${Extracts.popupContainerID}`).appendChild(Extracts.popup);
            Extracts.popup.addEventListener("mouseup", (event) => {
                event.stopPropagation();
            });
            Extracts.popup.addEventListener("mouseover", Extracts.divover);
            Extracts.popup.addEventListener("mouseout", Extracts.targetout);
            requestAnimationFrame(() => {
                var popupBreathingRoom = {
                    x: Extracts.popupBreathingRoomX,
                    y: Extracts.popupBreathingRoomY
                };
                var popupIntrinsicWidth = Extracts.popup.clientWidth;
                var popupIntrinsicHeight = Extracts.popup.clientHeight;
                var tocLink = target.closest("#TOC");
                var offToTheSide = false;
                var provisionalPopupXPosition;
                var provisionalPopupYPosition;
                var popupSpawnYOriginForSpawnAbove = Math.min(mouseOverEventPositionInPopupContainer.y - popupBreathingRoom.y, targetOriginInPopupContainer.y + targetViewportRect.height - (popupBreathingRoom.y * 2.0));
                var popupSpawnYOriginForSpawnBelow = Math.max(mouseOverEventPositionInPopupContainer.y + popupBreathingRoom.y, targetOriginInPopupContainer.y + (popupBreathingRoom.y * 2.0));
                if (tocLink) {
                    provisionalPopupXPosition = document.querySelector("#TOC").getBoundingClientRect().right + 1.0 - popupContainerViewportRect.left;
                    provisionalPopupYPosition = mouseOverEventPositionInPopupContainer.y - ((event.clientY / window.innerHeight) * popupIntrinsicHeight);
                } else if (popupSpawnYOriginForSpawnAbove - popupIntrinsicHeight >= popupContainerViewportRect.y * -1) {
                    provisionalPopupYPosition = popupSpawnYOriginForSpawnAbove - popupIntrinsicHeight;
                } else if (popupSpawnYOriginForSpawnBelow + popupIntrinsicHeight <= (popupContainerViewportRect.y * -1) + window.innerHeight) {
                    provisionalPopupYPosition = popupSpawnYOriginForSpawnBelow;
                } else {
                    offToTheSide = true;
                }
                if (offToTheSide) {
                    popupBreathingRoom.x *= 2.0;
                    provisionalPopupYPosition = mouseOverEventPositionInPopupContainer.y - ((event.clientY / window.innerHeight) * popupIntrinsicHeight);
                    if (provisionalPopupYPosition - popupContainerViewportRect.y < 0)
                        provisionalPopupYPosition = 0.0;
                    if (mouseOverEventPositionInPopupContainer.x +
                        popupBreathingRoom.x +
                        popupIntrinsicWidth <= popupContainerViewportRect.x * -1 +
                        window.innerWidth) {
                        provisionalPopupXPosition = mouseOverEventPositionInPopupContainer.x + popupBreathingRoom.x;
                    } else if (mouseOverEventPositionInPopupContainer.x -
                        popupBreathingRoom.x -
                        popupIntrinsicWidth >= popupContainerViewportRect.x * -1) {
                        provisionalPopupXPosition = mouseOverEventPositionInPopupContainer.x - popupIntrinsicWidth - popupBreathingRoom.x;
                    }
                } else if (!tocLink) {
                    provisionalPopupXPosition = mouseOverEventPositionInPopupContainer.x + popupBreathingRoom.x;
                }
                if (provisionalPopupXPosition + popupIntrinsicWidth > popupContainerViewportRect.width) {
                    provisionalPopupXPosition -= provisionalPopupXPosition + popupIntrinsicWidth - popupContainerViewportRect.width;
                }
                if (provisionalPopupXPosition < 0) {
                    provisionalPopupXPosition = 0;
                }
                Extracts.popup.style.left = provisionalPopupXPosition + "px";
                Extracts.popup.style.top = provisionalPopupYPosition + "px";
                Extracts.popupContainer.classList.add("popup-visible");
                Extracts.popup.style.visibility = "";
                document.activeElement.blur();
            });
        }, Extracts.popupTriggerDelay);
    },
    targetout: (event) => {
        clearTimeout(Extracts.popupFadeTimer);
        clearTimeout(Extracts.popupDespawnTimer);
        clearTimeout(Extracts.popupSpawnTimer);
        if (!Extracts.popup) return;
        Extracts.popupFadeTimer = setTimeout(() => {
            Extracts.popup.classList.add("fading");
            Extracts.popupDespawnTimer = setTimeout(() => {
                Extracts.despawnPopup();
            }, Extracts.popupFadeoutDuration);
        }, Extracts.popupFadeoutDelay);
    },
    divover: (event) => {
        clearTimeout(Extracts.popupFadeTimer);
        clearTimeout(Extracts.popupDespawnTimer);
        clearTimeout(Extracts.popupSpawnTimer);
        Extracts.popup.classList.remove("fading");
    },
    popupContainerClicked: (event) => {
        Extracts.despawnPopup();
    },
    despawnPopup: () => {
        Extracts.popup.remove();
        document.activeElement.blur();
        Extracts.popup.classList.remove("fading");
        document.querySelector("html").style.transform = "";
        Extracts.popupContainer.classList.remove("popup-visible");
    },
}
Extracts.popupStylesHTML = `<style id='${Extracts.popupStylesID}'>
#${Extracts.popupContainerID} {
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 3;
}
#${Extracts.popupContainerID} > * {
	pointer-events: auto;
}
@media not screen and (hover:hover) and (pointer:fine) {
	#${Extracts.popupContainerID}.popup-visible::before {
		content: "";
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		pointer-events: auto;
		background-color: #000;
		opacity: 0.4;
	}
}

#popupdiv {
	z-index: 10001;
	font-size: 0.8em;
	box-shadow: 0 0 0 2px #fff;
	position: absolute;
	opacity: 1.0;
	transition: none;
	touch-action: none;
	user-select: none;
}
#popupdiv.fading {
	opacity: 0.0;
	transition:
		opacity 0.75s ease-in 0.1s;
}
#popupdiv > div {
	background-color: #fff;
	padding: 12px 16px 14px 16px;
	border: 3px double #aaa;
	line-height: 1.45;
	overflow: auto;
	overscroll-behavior: none;
	touch-action: none;
	user-select: none;
	min-width: ${Extracts.minPopupWidth}px;
	max-width: ${Extracts.maxPopupWidth}px;
	max-height: calc(100vh - 2 * ${Extracts.popupBorderWidth}px - 26px);
}
#popupdiv > div .data-field {
	text-align: left;
	text-indent: 0;
	hyphens: none;
}
#popupdiv > div .data-field + .data-field {
	margin-top: 0.25em;
}
#popupdiv > div .data-field:empty {
	display: none;
}
#popupdiv > div .data-field.title {
	font-weight: bold;
	font-size: 1.125em;
}
#popupdiv > div .data-field.author-plus-date {
	font-style: italic;
}
#popupdiv > div .data-field.abstract {
	text-align: justify;
	text-indent: 2em;
	hyphens: auto;
}
#popupdiv > div.popup-screenshot {
	padding: 0;
	max-width: unset;
}
#popupdiv > div.popup-screenshot img {
	display: block;
}
#popupdiv > div.popup-screenshot a::after {
	content: none;
}
#popupdiv > div.popup-section-embed {
	height: 100%;
	padding: 12px 24px 14px 24px;
	overflow-x: hidden;
}
#popupdiv > div.popup-section-embed > h1:first-child,
#popupdiv > div.popup-section-embed > h2:first-child,
#popupdiv > div.popup-section-embed > h3:first-child,
#popupdiv > div.popup-section-embed > h4:first-child  {
	margin-top: 0;
}
#popupdiv > div.popup-section-embed > :last-child {
	margin-bottom: 12px;
}
#popupdiv > div .icon {
	background-image: none !important;
	position: relative;
	top: 0.15em;
	font-size: 1.125em;
}
#popupdiv > div .icon::after {
	margin: 0 0.175em 0 0;
	width: 1em;
	height: 1em;
	font-size: 1em;
}
#popupdiv > div .icon:not([href*='.pdf'])::after {
	background-position: center center;
	background-size: 100%;
}
#popupdiv > div .title-link::after {
	content: none;
}

/*  Scroll bar styles (Webkit/Blink only).
	*/
#popupdiv > div::-webkit-scrollbar {
	width: 14px;
}
#popupdiv > div::-webkit-scrollbar-thumb {
	background-color: #ccc;
	box-shadow:
		0 0 0 3px #fff inset;
}
#popupdiv > div::-webkit-scrollbar-thumb:hover {
	background-color: #999;
}

/*	Popups on mobile.
	*/
@media only screen and (max-width: 64.9ch), not screen and (hover:hover) and (pointer:fine) {
	#popupdiv > div {
		max-width: 100%;
	}
}

/*  Image focus interaction.
	*/
#markdownBody #popupdiv img {
	filter: none;
	cursor: initial;
	transform: none;
}
#markdownBody #popupdiv .popup-screenshot a img {
	cursor: pointer;
}
</style>`;
if (document.readyState == "complete") {
    Extracts.setup();
} else {
    window.addEventListener("load", Extracts.setup);
}

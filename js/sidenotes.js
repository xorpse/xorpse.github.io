if (typeof window.GW == "undefined")
    window.GW = {};

function GWLog(string) {
    if (GW.loggingEnabled || localStorage.getItem("logging-enabled") == "true")
        console.log(string);
}
GW.enableLogging = (permanently = false) => {
    if (permanently)
        localStorage.setItem("logging-enabled", "true");
    else
        GW.loggingEnabled = true;
};
GW.disableLogging = (permanently = false) => {
    if (permanently)
        localStorage.removeItem("logging-enabled");
    else
        GW.loggingEnabled = false;
};

function updateTargetCounterpart() {
    GWLog("updateTargetCounterpart");
    document.querySelectorAll(".targeted").forEach(element => {
        element.classList.remove("targeted");
    });
    var counterpart;
    if (location.hash.match(/#sn[0-9]/)) {
        counterpart = document.querySelector("#fnref" + location.hash.substr(3));
    } else if (location.hash.match(/#fnref[0-9]/) && GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == false) {
        counterpart = document.querySelector("#sn" + location.hash.substr(6));
    }
    if (counterpart)
        counterpart.classList.toggle("targeted", true);
}

function isOnScreen(element) {
    let rect = element.getBoundingClientRect();
    return (rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0);
}

function realignHashIfNeeded() {
    GWLog("realignHashIfNeeded");
    if (location.hash.match(/#sn[0-9]/) || location.hash.match(/#fnref[0-9]/))
        realignHash();
}

function realignHash() {
    GWLog("realignHash");
    var hash = location.hash;
    history.replaceState(null, null, "#");
    location.hash = hash;
}

function setHashWithoutScrolling(newHash) {
    var selectedRange;
    if (GW.isFirefox)
        selectedRange = window.getSelection().getRangeAt(0);
    let scrollPositionBeforeNavigate = window.scrollY;
    location.hash = newHash;
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionBeforeNavigate);
    });
    if (GW.isFirefox)
        window.getSelection().addRange(selectedRange);
}

function ridiculousWorkaroundsForBrowsersFromBizarroWorld() {
    GWLog("ridiculousWorkaroundsForBrowsersFromBizarroWorld");
    GW.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    if (!GW.isFirefox) {
        GW.sidenotes.viewportWidthBreakpointMediaQueryString = `(max-width: 176ch)`;
        GW.sidenotes.mobileViewportWidthBreakpointMediaQueryString = `(max-width: 65ch)`;
    } else {
        GW.maxBodyWidthInCharacterUnits = 112;
        GW.firefoxTargetingSelector = "@supports (-moz-user-focus: normal)";
        let widthOfCharacterUnit = parseInt(getComputedStyle(document.body).maxWidth) / GW.maxBodyWidthInCharacterUnits;
        let viewportWidthBreakpointInPixels = 176 * widthOfCharacterUnit;
        GW.sidenotes.viewportWidthBreakpointMediaQueryString = `(max-width: ${viewportWidthBreakpointInPixels}px)`;
        let mobileViewportWidthBreakpointInPixels = 65 * widthOfCharacterUnit;
        GW.sidenotes.mobileViewportWidthBreakpointMediaQueryString = `(max-width: ${mobileViewportWidthBreakpointInPixels}px)`;
        var sidenotesBrowserWorkaroundStyleBlock = document.querySelector("style#sidenotes-browser-workaround");
        if (!sidenotesBrowserWorkaroundStyleBlock) {
            sidenotesBrowserWorkaroundStyleBlock = document.createElement("style");
            sidenotesBrowserWorkaroundStyleBlock.id = "sidenotes-browser-workaround";
            document.querySelector("body").appendChild(sidenotesBrowserWorkaroundStyleBlock);
        }
        sidenotesBrowserWorkaroundStyleBlock.innerHTML = `
			${GW.firefoxTargetingSelector} {
				@media only screen and (max-width: ${viewportWidthBreakpointInPixels}px) {
					#sidenote-column-left,
					#sidenote-column-right {
						display: none;
					}
				}
				@media only screen and (min-width: ${viewportWidthBreakpointInPixels+1}px) {
					main {
						position: relative;
						right: 4ch;
					}
					#markdownBody {
						position: relative;
					}
				}
				@media only screen and (max-width: ${viewportWidthBreakpointInPixels}px) {
					.footnote-ref:target {
						background-color: inherit;
						box-shadow: none;
					}
				}
			}
		`;
    }
    GW.sidenotes.mediaQueries = {
        viewportWidthBreakpoint: matchMedia(GW.sidenotes.viewportWidthBreakpointMediaQueryString),
        mobileViewportWidthBreakpoint: matchMedia(GW.sidenotes.mobileViewportWidthBreakpointMediaQueryString),
        hover: matchMedia("only screen and (hover: hover) and (pointer: fine)")
    };
    GW.sidenotes.mediaQueries.viewportWidthBreakpoint.addListener(GW.sidenotes.viewportWidthBreakpointChanged = () => {
        GWLog("GW.sidenotes.viewportWidthBreakpointChanged");
        updateFootnoteEventListeners();
        GW.sidenotes.footnotesObserver.disconnect();
        updateFootnoteReferenceLinks();
    });
}
String.prototype.hasPrefix = function(prefix) {
    return (this.lastIndexOf(prefix, 0) === 0);
}

function isCollapsed(collapseBlock) {
    let collapseCheckbox = collapseBlock.querySelector(".disclosure-button");
    return (collapseCheckbox.checked == false);
}

function isWithinCollapsedBlock(element) {
    let collapseParent = element.closest(".collapse");
    if (!collapseParent) return false;
    if (isCollapsed(collapseParent)) return true;
    return isWithinCollapsedBlock(collapseParent.parentElement);
}

function expandCollapseBlocksToReveal(element) {
    GWLog("expandCollapseBlocksToReveal");
    if (!isWithinCollapsedBlock(element)) return false;
    let collapseParent = element.closest(".collapse");
    let disclosureButton = collapseParent.querySelector(".disclosure-button");
    let expansionOccurred = (disclosureButton.checked == false);
    disclosureButton.checked = true;
    collapseParent.classList.toggle("expanded", disclosureButton.checked);
    if (!expandCollapseBlocksToReveal(collapseParent.parentElement) && expansionOccurred)
        setTimeout(updateSidenotePositions);
    return expansionOccurred;
}

function revealTarget() {
    GWLog("revealTarget");
    if (!location.hash) return;
    let target = document.querySelector(decodeURIComponent(location.hash));
    if (!target) return;
    let targetInText = location.hash.match(/#sn[0-9]/) ? document.querySelector("#fnref" + location.hash.substr(3)) : target;
    expandCollapseBlocksToReveal(targetInText);
    target.scrollIntoView();
}

function updateSidenotesInCollapseBlocks() {
    GWLog("updateSidenotesInCollapseBlocks");
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let fnref = GW.sidenotes.footnoteRefs[i];
        let sidenote = GW.sidenotes.sidenoteDivs[i];
        if (isWithinCollapsedBlock(fnref)) {
            GW.sidenotes.hiddenSidenoteStorage.appendChild(sidenote);
            continue;
        }
        let side = (i % 2) ? GW.sidenotes.sidenoteColumnLeft : GW.sidenotes.sidenoteColumnRight;
        var nextSidenoteIndex = i + 2;
        while (nextSidenoteIndex < GW.sidenotes.footnoteRefs.length && GW.sidenotes.sidenoteDivs[nextSidenoteIndex].parentElement == GW.sidenotes.hiddenSidenoteStorage)
            nextSidenoteIndex += 2;
        if (nextSidenoteIndex >= GW.sidenotes.footnoteRefs.length) {
            side.appendChild(sidenote);
        } else {
            side.insertBefore(sidenote, GW.sidenotes.sidenoteDivs[nextSidenoteIndex]);
        }
    }
}

function updateFootnoteReferenceLinks() {
    GWLog("updateFootnoteReferenceLinks");
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let fnref = GW.sidenotes.footnoteRefs[i];
        if (GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == false) {
            fnref.href = "#sn" + (i + 1);
        } else {
            fnref.href = "#fn" + (i + 1);
        }
    }
}

function updateFootnoteEventListeners() {
    GWLog("updateFootnoteEventListeners");
    var sidenotesMode = (GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == false);
    if (sidenotesMode) {
        if (window.Footnotes) {
            Footnotes.unbind();
        }
        for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
            let fnref = GW.sidenotes.footnoteRefs[i];
            let sidenote = GW.sidenotes.sidenoteDivs[i];
            fnref.addEventListener("mouseover", GW.sidenotes.footnoteover = () => {
                sidenote.classList.toggle("highlighted", true);
            });
            fnref.addEventListener("mouseout", GW.sidenotes.footnoteout = () => {
                sidenote.classList.remove("highlighted");
            });
            sidenote.addEventListener("mouseover", GW.sidenotes.sidenoteover = () => {
                fnref.classList.toggle("highlighted", true);
            });
            sidenote.addEventListener("mouseout", GW.sidenotes.sidenoteout = () => {
                fnref.classList.remove("highlighted");
            });
        }
        clearFootnotePopups();
    } else {
        for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
            let fnref = GW.sidenotes.footnoteRefs[i];
            let sidenote = GW.sidenotes.sidenoteDivs[i];
            fnref.removeEventListener("mouseover", GW.sidenotes.footnoteover);
            fnref.removeEventListener("mouseout", GW.sidenotes.footnoteout);
            sidenote.removeEventListener("mouseover", GW.sidenotes.sidenoteover);
            sidenote.removeEventListener("mouseout", GW.sidenotes.sidenoteout);
        }
        if (window.Footnotes && GW.sidenotes.mediaQueries.mobileViewportWidthBreakpoint.matches == false && GW.sidenotes.mediaQueries.hover == true) {
            Footnotes.setup();
        }
    }
}

function clearFootnotePopups() {
    GWLog("clearFootnotePopups");
    document.querySelectorAll("#footnotediv").forEach(footnotePopup => {
        footnotePopup.remove();
    });
}

function updateSidenotePositions() {
    GWLog("updateSidenotePositions");
    if (GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == true)
        return;
    let markdownBody = document.querySelector("#markdownBody");
    var firstFullWidthBlock;
    for (var block of markdownBody.children) {
        if (block.clientWidth == markdownBody.clientWidth) {
            firstFullWidthBlock = block;
            break;
        }
    }
    let offset = firstFullWidthBlock.offsetTop || 0;
    if (GW.sidenotes.sidenoteColumnLeft.offsetTop < firstFullWidthBlock.offsetTop) {
        GW.sidenotes.sidenoteColumnLeft.style.top = offset + "px";
        GW.sidenotes.sidenoteColumnLeft.style.height = `calc(100% - ${offset}px)`;
    }
    updateSidenotesInCollapseBlocks();
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let sidenote = GW.sidenotes.sidenoteDivs[i];
        if (sidenote.parentElement == GW.sidenotes.hiddenSidenoteStorage)
            continue;
        let side = (i % 2) ? GW.sidenotes.sidenoteColumnLeft : GW.sidenotes.sidenoteColumnRight;
        sidenote.style.top = Math.round(((GW.sidenotes.footnoteRefs[i].getBoundingClientRect().top) - side.getBoundingClientRect().top) + 4) + "px";
        let sidenoteOuterWrapper = sidenote.firstElementChild;
        sidenote.classList.toggle("cut-off", (sidenoteOuterWrapper.scrollHeight > sidenoteOuterWrapper.clientHeight + 2));
    }
    var proscribedVerticalRanges = [];
    let rightColumnBoundingRect = GW.sidenotes.sidenoteColumnRight.getBoundingClientRect();
    document.querySelectorAll(".tableWrapper.full-width").forEach(fullWidthTable => {
        let tableBoundingRect = fullWidthTable.getBoundingClientRect();
        proscribedVerticalRanges.push({
            top: tableBoundingRect.top - rightColumnBoundingRect.top,
            bottom: tableBoundingRect.bottom - rightColumnBoundingRect.top
        });
    });
    proscribedVerticalRanges.push({
        top: GW.sidenotes.sidenoteColumnRight.clientHeight,
        bottom: GW.sidenotes.sidenoteColumnRight.clientHeight
    });
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let sidenote = GW.sidenotes.sidenoteDivs[i];
        let nextSidenote = sidenote.nextElementSibling;
        if (sidenote.parentElement == GW.sidenotes.hiddenSidenoteStorage) continue;
        let side = (i % 2) ? GW.sidenotes.sidenoteColumnLeft : GW.sidenotes.sidenoteColumnRight;
        let room = {
            ceiling: 0,
            floor: side.clientHeight
        };
        let sidenoteFootprint = {
            top: sidenote.offsetTop - GW.sidenotes.sidenoteSpacing,
            bottom: sidenote.offsetTop + sidenote.clientHeight + GW.sidenotes.sidenoteSpacing
        };
        let sidenoteFootprintHalfwayPoint = (sidenoteFootprint.top + sidenoteFootprint.bottom) / 2;
        var nextProscribedRangeAfterSidenote = -1;
        for (var j = 0; j < proscribedVerticalRanges.length; j++) {
            let rangeCountingUp = {
                top: proscribedVerticalRanges[j].top - side.offsetTop,
                bottom: proscribedVerticalRanges[j].bottom - side.offsetTop,
            };
            rangeCountingUp.halfwayPoint = (rangeCountingUp.top + rangeCountingUp.bottom) / 2;
            if (rangeCountingUp.halfwayPoint < sidenoteFootprintHalfwayPoint)
                room.ceiling = rangeCountingUp.bottom;
            let indexCountingDown = proscribedVerticalRanges.length - j - 1;
            let rangeCountingDown = {
                top: proscribedVerticalRanges[indexCountingDown].top - side.offsetTop,
                bottom: proscribedVerticalRanges[indexCountingDown].bottom - side.offsetTop
            };
            rangeCountingDown.halfwayPoint = (rangeCountingDown.top + rangeCountingDown.bottom) / 2;
            if (rangeCountingDown.halfwayPoint > sidenoteFootprintHalfwayPoint) {
                room.floor = rangeCountingDown.top;
                nextProscribedRangeAfterSidenote = indexCountingDown;
            }
        }
        GWLog(`Sidenote ${i+1}â€™s room is: (${room.ceiling}, ${room.floor}).`);
        if (sidenoteFootprint.bottom - sidenoteFootprint.top > room.floor - room.ceiling) {
            if (nextProscribedRangeAfterSidenote == -1) {
                GWLog("TOO MUCH SIDENOTES. GIVING UP. :(");
                return;
            }
            sidenote.style.top = (proscribedVerticalRanges[nextProscribedRangeAfterSidenote].bottom + GW.sidenotes.sidenoteSpacing) + "px";
            i--;
            continue;
        }
        var overlapWithCeiling = room.ceiling - sidenoteFootprint.top;
        if (overlapWithCeiling > 0) {
            GWLog(`Sidenote ${sidenote.id.substr(2)} overlaps its ceiling!`);
            sidenote.style.top = (parseInt(sidenote.style.top) + overlapWithCeiling) + "px";
            sidenoteFootprint.top += overlapWithCeiling;
            sidenoteFootprint.bottom += overlapWithCeiling;
        }
        var overlapWithFloor = sidenoteFootprint.bottom - room.floor;
        if (overlapWithFloor > 0)
            GWLog(`Sidenote ${sidenote.id.substr(2)} overlaps its floor!`);
        var overlapWithNextSidenote = nextSidenote ? (sidenoteFootprint.bottom - nextSidenote.offsetTop) : -1;
        if (overlapWithNextSidenote > 0)
            GWLog(`Sidenote ${sidenote.id.substr(2)} overlaps sidenote ${nextSidenote.id.substr(2)}!`);
        var overlapBelow = Math.max(overlapWithNextSidenote, overlapWithFloor);
        if (overlapBelow <= 0) continue;
        let previousSidenote = sidenote.previousElementSibling;
        let maxHeadroom = sidenoteFootprint.top - room.ceiling;
        let headroom = previousSidenote ? Math.min(maxHeadroom, (sidenoteFootprint.top - (previousSidenote.offsetTop + previousSidenote.clientHeight))) : maxHeadroom;
        GWLog(`We have ${headroom}px of headroom.`);
        if (headroom >= overlapBelow) {
            GWLog(`There is enough headroom. Moving sidenote ${sidenote.id.substr(2)} up.`);
            sidenote.style.top = (parseInt(sidenote.style.top) - overlapBelow) + "px";
            continue;
        } else {
            GWLog(`There is not enough headroom to move sidenote ${sidenote.id.substr(2)} all the way up!`);
            if (headroom < overlapWithFloor) {
                sidenote.style.top = (proscribedVerticalRanges[nextProscribedRangeAfterSidenote].bottom + GW.sidenotes.sidenoteSpacing) + "px";
                i--;
                continue;
            }
            if ((sidenoteFootprint.bottom + nextSidenote.clientHeight + GW.sidenotes.sidenoteSpacing - headroom) > proscribedVerticalRanges[nextProscribedRangeAfterSidenote].top)
                continue;
            GWLog(`Moving sidenote ${sidenote.id.substr(2)} up by ${headroom} pixels...`);
            sidenote.style.top = (parseInt(sidenote.style.top) - headroom) + "px";
            overlapWithNextSidenote -= headroom;
            GWLog(`... and moving sidenote ${nextSidenote.id.substr(2)} down by ${overlapWithNextSidenote} pixels.`);
            nextSidenote.style.top = (parseInt(nextSidenote.style.top) + overlapWithNextSidenote) + "px";
        }
    }
    GW.sidenotes.sidenoteColumnLeft.style.visibility = "";
    GW.sidenotes.sidenoteColumnRight.style.visibility = "";
}

function constructSidenotes() {
    GWLog("constructSidenotes");
    let markdownBody = document.querySelector("#markdownBody");
    if (!markdownBody) return;
    if (GW.sidenotes.sidenoteColumnLeft) GW.sidenotes.sidenoteColumnLeft.remove();
    if (GW.sidenotes.sidenoteColumnRight) GW.sidenotes.sidenoteColumnRight.remove();
    markdownBody.insertAdjacentHTML("beforeend", "<div id='sidenote-column-left' class='footnotes' style='visibility:hidden'></div>" +
        "<div id='sidenote-column-right' class='footnotes' style='visibility:hidden'></div>");
    GW.sidenotes.sidenoteColumnLeft = document.querySelector("#sidenote-column-left");
    GW.sidenotes.sidenoteColumnRight = document.querySelector("#sidenote-column-right");
    GW.sidenotes.sidenoteDivs = [];
    GW.sidenotes.footnoteRefs = Array.from(document.querySelectorAll("a.footnote-ref"));
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let sidenote = document.createElement("div");
        sidenote.classList.add("sidenote");
        sidenote.id = "sn" + (i + 1);
        let referencedFootnote = document.querySelector(GW.sidenotes.footnoteRefs[i].hash);
        sidenote.innerHTML = "<div class='sidenote-outer-wrapper'><div class='sidenote-inner-wrapper'>" +
            (referencedFootnote ? referencedFootnote.innerHTML : "Loading sidenote contents, please waitâ€¦") +
            "</div></div>";
        GW.sidenotes.sidenoteDivs.push(sidenote);
        let side = (i % 2) ? GW.sidenotes.sidenoteColumnLeft : GW.sidenotes.sidenoteColumnRight;
        side.appendChild(sidenote);
    }
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let sidenoteSelfLink = document.createElement("a");
        sidenoteSelfLink.classList.add("sidenote-self-link");
        sidenoteSelfLink.href = "#sn" + (i + 1);
        sidenoteSelfLink.textContent = (i + 1);
        GW.sidenotes.sidenoteDivs[i].appendChild(sidenoteSelfLink);
    }
    if (GW.sidenotes.hiddenSidenoteStorage) GW.sidenotes.hiddenSidenoteStorage.remove();
    GW.sidenotes.hiddenSidenoteStorage = document.createElement("div");
    GW.sidenotes.hiddenSidenoteStorage.id = "hidden-sidenote-storage";
    GW.sidenotes.hiddenSidenoteStorage.style.display = "none";
    markdownBody.appendChild(GW.sidenotes.hiddenSidenoteStorage);
    for (var i = 0; i < GW.sidenotes.footnoteRefs.length; i++) {
        let sidenote = GW.sidenotes.sidenoteDivs[i];
        sidenote.addEventListener("click", GW.sidenotes.sidenoteClicked = (event) => {
            GWLog("GW.sidenotes.sidenoteClicked");
            if (decodeURIComponent(location.hash) == sidenote.id || event.target.tagName == "A") return;
            if (!(location.hash.hasPrefix("#sn") || location.hash.hasPrefix("#fnref")))
                GW.sidenotes.hashBeforeSidenoteWasFocused = location.hash;
            setHashWithoutScrolling(encodeURIComponent(sidenote.id));
        });
    }
    GW.sidenotes.problematicCharacters = '/=â‰ ';
    GW.sidenotes.sidenoteDivs.forEach(sidenote => {
        sidenote.querySelectorAll("*").forEach(element => {
            if (element.closest(".sourceCode")) return;
            element.childNodes.forEach(node => {
                if (node.childNodes.length > 0) return;
                node.textContent = node.textContent.replace(new RegExp("(\\w[" + GW.sidenotes.problematicCharacters + "])(\\w)", 'g'), "$1\u{200B}$2");
            });
        });
    });
}

function sidenotesSetup() {
    GWLog("sidenotesSetup");
    GW.sidenotes = {
        sidenoteSpacing: 60
    };
    ridiculousWorkaroundsForBrowsersFromBizarroWorld();
    if (GW.isFirefox && document.readyState != "complete")
        window.addEventListener("load", ridiculousWorkaroundsForBrowsersFromBizarroWorld);
    constructSidenotes();
    if (document.readyState == "loading")
        window.addEventListener("DOMContentLoaded", constructSidenotes);
    window.addEventListener('resize', GW.sidenotes.windowResized = (event) => {
        GWLog("GW.sidenotes.windowResized");
        updateSidenotePositions();
    });
    if (document.readyState == "complete") {
        updateSidenotePositions();
    } else {
        if (document.readyState == "loading") {
            window.addEventListener("DOMContentLoaded", updateSidenotePositions);
        } else {
            updateSidenotePositions();
        }
        window.addEventListener("load", updateSidenotePositions);
    }
    if (document.readyState == "complete") {
        updateFootnoteEventListeners();
        updateFootnoteReferenceLinks();
    } else {
        window.addEventListener("load", () => {
            updateFootnoteEventListeners();
            updateFootnoteReferenceLinks();
        });
    }
    GW.sidenotes.footnotesObserver = new MutationObserver((mutationsList, observer) => {
        if (document.querySelector("#footnotediv")) {
            updateFootnoteEventListeners();
            GW.sidenotes.footnotesObserver.disconnect();
        }
    });
    GW.sidenotes.footnotesObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true
    });
    if (location.hash.match(/#sn[0-9]/) && GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == true) {
        location.hash = "#fn" + location.hash.substr(3);
    } else if (location.hash.match(/#fn[0-9]/) && GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == false) {
        location.hash = "#sn" + location.hash.substr(3);
    } else {
        requestAnimationFrame(realignHashIfNeeded);
    }
    window.addEventListener("hashchange", GW.sidenotes.hashChanged = () => {
        GWLog("GW.sidenotes.hashChanged");
        revealTarget();
        updateTargetCounterpart();
    });
    window.addEventListener("load", () => {
        revealTarget();
        updateTargetCounterpart();
    });
    document.querySelectorAll(".disclosure-button").forEach(collapseCheckbox => {
        collapseCheckbox.addEventListener("change", GW.sidenotes.disclosureButtonValueChanged = (event) => {
            GWLog("GW.sidenotes.disclosureButtonValueChanged");
            setTimeout(updateSidenotePositions);
        });
    });
    GW.sidenotes.hashBeforeSidenoteWasFocused = (location.hash.hasPrefix("#sn") || location.hash.hasPrefix("#fnref")) ? "" : location.hash;
    document.body.addEventListener("click", GW.sidenotes.bodyClicked = (event) => {
        GWLog("GW.sidenotes.bodyClicked");
        if (!(event.target.tagName == "A" || event.target.closest(".sidenote")) && (location.hash.hasPrefix("#sn") || location.hash.hasPrefix("#fnref"))) {
            setHashWithoutScrolling(GW.sidenotes.hashBeforeSidenoteWasFocused);
        }
    });
}
sidenotesSetup();

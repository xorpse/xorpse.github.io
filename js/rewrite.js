function doWhenPageLoaded(f) {
    if (document.readyState == "complete")
        f();
    else
        window.addEventListener("load", f);
}

function expandFullWidthBlocks() {
    document.querySelectorAll("img.full-width").forEach(fullWidthImage => {
        fullWidthImage.closest("figure").classList.add("full-width");
    });
    let fullWidthBlockMargin = "2.5ch";
    let pageWidth = document.querySelector("html").clientWidth;
    document.querySelectorAll(".tableWrapper.full-width, figure.full-width").forEach(fullWidthBlock => {
        fullWidthBlock.removeAttribute("style");
        fullWidthBlock.style.left = `calc(${(fullWidthBlock.getBoundingClientRect().left*-1)+"px"} + ${fullWidthBlockMargin})`;
        fullWidthBlock.style.width = `calc(${pageWidth+"px"} - (2 * ${fullWidthBlockMargin}))`;
    });
    requestAnimationFrame(() => {
        if (typeof window.GW == "undefined" || typeof GW.sidenotes == "undefined" || GW.sidenotes.mediaQueries.viewportWidthBreakpoint.matches == true || GW.sidenotes.sidenoteDivs.length == 0)
            return;
        updateSidenotePositions();
    });
}

function getAllCaptionedMedia() {
    return Array.prototype.map.call(document.querySelectorAll("figure"), figure => {
        let media = figure.querySelector("img") || figure.querySelector("video");
        let caption = figure.querySelector("figcaption");
        return {
            media: media,
            caption: caption
        };
    }).filter(captionedMedia => captionedMedia.media && captionedMedia.caption);
}

function setCaptionsMinimumWidth() {
    getAllCaptionedMedia().forEach(captionedMedia => {
        let wrapper = captionedMedia.caption.closest(".caption-wrapper");
        wrapper.style.minWidth = captionedMedia.media.clientWidth + "px";
    });
}

function rectifyCodeBlockHeight(codeBlock) {
    codeBlock.style.height = parseInt(getComputedStyle(codeBlock).height) + "px";
}
document.querySelectorAll("table").forEach(table => {
    if (table.parentElement.tagName == "DIV" && table.parentElement.children.length == 1)
        table.parentElement.classList.toggle("tableWrapper", true);
    else
        table.outerHTML = "<div class='tableWrapper'>" + table.outerHTML + "</div>";
});
doWhenPageLoaded(expandFullWidthBlocks);
window.addEventListener("resize", expandFullWidthBlocks);
document.querySelectorAll("div.sourceCode").forEach(scd => {
    scd.outerHTML = scd.innerHTML;
});
doWhenPageLoaded(() => {
    document.querySelectorAll("pre code").forEach(codeBlock => {
        rectifyCodeBlockHeight(codeBlock);
    });
});
document.querySelectorAll(".collapse").forEach(collapseBlock => {
    let disclosureButtonHTML = "<input type='checkbox' class='disclosure-button' aria-label='Open/close collapsed section'>";
    if (collapseBlock.tagName == "SECTION") {
        collapseBlock.children[0].insertAdjacentHTML("afterend", disclosureButtonHTML);
    } else {
        let realCollapseBlock = document.createElement("div");
        realCollapseBlock.classList.add("collapse");
        realCollapseBlock.insertAdjacentHTML("afterbegin", disclosureButtonHTML);
        collapseBlock.parentElement.insertBefore(realCollapseBlock, collapseBlock);
        collapseBlock.classList.remove("collapse");
        realCollapseBlock.appendChild(collapseBlock);
    }
});
document.querySelectorAll(".disclosure-button").forEach(disclosureButton => {
    let collapseBlock = disclosureButton.closest(".collapse");
    disclosureButton.addEventListener("change", (event) => {
        collapseBlock.classList.toggle("expanded", disclosureButton.checked);
        if (collapseBlock.lastElementChild.tagName == "PRE") {
            let codeBlock = collapseBlock.lastElementChild.lastElementChild;
            if (codeBlock.tagName != "CODE") return;
            codeBlock.style.height = "";
            requestAnimationFrame(() => {
                rectifyCodeBlockHeight(codeBlock);
            });
        }
    });
});
document.querySelectorAll("q").forEach(q => {
    let openQuote = `<span class='quote-mark open'>${q.innerHTML.substring(0,1)}</span>`;
    let closeQuote = `<span class='quote-mark close'>${q.innerHTML.substring(q.innerHTML.length-1)}</span>`;
    q.innerHTML = q.innerHTML.substring(1, q.innerHTML.length - 1);
    if (q.parentElement.tagName == "A" && q.parentElement.childNodes.length == 1) {
        q.parentElement.outerHTML = `${openQuote}${q.parentElement.outerHTML}${closeQuote}`;
    } else {
        q.outerHTML = `${openQuote}${q.outerHTML}${closeQuote}`;
    }
});
getAllCaptionedMedia().forEach(captionedMedia => {
    let wrapper = document.createElement("span");
    wrapper.classList.add("caption-wrapper");
    wrapper.appendChild(captionedMedia.caption);
    let figure = captionedMedia.media.closest("figure");
    figure.appendChild(wrapper);
});
doWhenPageLoaded(setCaptionsMinimumWidth);
window.addEventListener('resize', setCaptionsMinimumWidth);
let problematicCharacters = '/';
document.querySelectorAll("p a, p a *").forEach(element => {
    element.childNodes.forEach(node => {
        if (node.childNodes.length > 0) return;
        node.textContent = node.textContent.replace(new RegExp("(\\w[" + problematicCharacters + "])(\\w)", 'g'), "$1\u{200B}$2");
    });
});
let textCleanRegexps = [
    [/([^A-Za-z0-9_\)]|^)"(\S)/, '$1\u201c$2'],
    [/(\u201c[^"]*)"([^"]*$|[^\u201c"]*\u201c)/, '$1\u201d$2'],
    [/([^0-9])"/, '$1\u201d'],
    [/"(.+?)"/, '\u201c$1\u201d'],
    [/(\W|^)'(\S)/, '$1\u2018$2'],
    [/([a-z])'([a-z])/, '$1\u2019$2'],
    [/(\u2018)([0-9]{2}[^\u2019]*)(\u2018([^0-9]|$)|$|\u2019[a-z])/, '\u2019$2$3'],
    [/((\u2018[^']*)|[a-z])'([^0-9]|$)/, '$1\u2019$3'],
    [/(\B|^)\u2018(?=([^\u2018\u2019]*\u2019\b)*([^\u2018\u2019]*\B\W[\u2018\u2019]\b|[^\u2018\u2019]*$))/, '$1\u2019'],
];
document.querySelectorAll("header *, #page-metadata *").forEach(element => {
    element.childNodes.forEach(node => {
        if (node.childNodes.length > 0) return;
        textCleanRegexps.forEach(tcr => {
            node.textContent = node.textContent.replace(new RegExp(tcr[0], 'ig'), tcr[1]);
        });
    });
});
document.querySelectorAll(".footnote-back").forEach(backlink => {
    backlink.textContent += "\u{FE0E}";
});

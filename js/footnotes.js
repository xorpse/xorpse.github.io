Footnotes = {
    contentContainerSelector: "#markdownBody",
    minFootnoteWidth: 520,
    footnotefadetimeout: false,
    footnotekilltimeout: false,
    footnotepopuptimeout: false,
    footnotePopup: null,
    unbind: function() {
        document.querySelectorAll(".footnote-ref").forEach(fnref => {
            fnref.removeEventListener("mouseover", Footnotes.footnoteover);
            fnref.removeEventListener("mouseout", Footnotes.footnoteoout);
        });
    },
    setup: function() {
        Footnotes.unbind();
        document.querySelectorAll(".footnote-ref").forEach(fnref => {
            fnref.addEventListener("mouseover", Footnotes.footnoteover);
            fnref.addEventListener("mouseout", Footnotes.footnoteoout);
        });
    },
    footnoteover: (event) => {
        clearTimeout(Footnotes.footnotefadetimeout);
        clearTimeout(Footnotes.footnotekilltimeout);
        clearTimeout(Footnotes.footnotepopuptimeout);
        Footnotes.footnotepopuptimeout = setTimeout(() => {
            var citationAbsoluteRect = event.target.getBoundingClientRect();
            let bodyAbsoluteRect = document.body.getBoundingClientRect();
            var citationPosition = {
                left: (citationAbsoluteRect.left - bodyAbsoluteRect.left),
                top: (citationAbsoluteRect.top - bodyAbsoluteRect.top)
            };
            if (!event.target.hash) return;
            var targetFootnoteId = event.target.hash.substr(1);
            Footnotes.footnotePopup = document.querySelector("#footnotediv");
            if (Footnotes.footnotePopup) {
                Footnotes.footnotePopup.classList.remove("fading");
                Footnotes.footnotePopup.remove();
            } else {
                Footnotes.footnotePopup = document.createElement('div');
                Footnotes.footnotePopup.id = "footnotediv";
            }
            if (Footnotes.footnotePopup.dataset.footnoteReference != targetFootnoteId) {
                var targetFootnote = document.querySelector("#" + targetFootnoteId);
                Footnotes.footnotePopup.innerHTML = '<div>' + targetFootnote.innerHTML + '</div>';
                Footnotes.footnotePopup.dataset.footnoteReference = targetFootnoteId;
            }
            document.querySelector(Footnotes.contentContainerSelector).appendChild(Footnotes.footnotePopup);
            Footnotes.footnotePopup.addEventListener("mouseover", Footnotes.divover);
            Footnotes.footnotePopup.addEventListener("mouseout", Footnotes.footnoteoout);
            var footnotePopupBreathingRoom = {
                x: (Math.round(citationAbsoluteRect.width) * 1.5),
                y: Math.round(citationAbsoluteRect.height) + (Math.round(citationAbsoluteRect.width) * 0.5)
            };
            var footnotePopupLeft = citationPosition.left + footnotePopupBreathingRoom.x;
            if (footnotePopupLeft + Footnotes.minFootnoteWidth > window.innerWidth)
                footnotePopupLeft = window.innerWidth - Footnotes.minFootnoteWidth;
            Footnotes.footnotePopup.style.left = footnotePopupLeft + "px";
            if (Footnotes.footnotePopup.getBoundingClientRect().right > window.innerWidth)
                Footnotes.footnotePopup.style.maxWidth = (Footnotes.footnotePopup.clientWidth - (Footnotes.footnotePopup.getBoundingClientRect().right - window.innerWidth) - parseInt(getComputedStyle(Footnotes.footnotePopup.firstElementChild).paddingRight)) + "px";
            else if (citationPosition.left + footnotePopupBreathingRoom.x + Footnotes.footnotePopup.clientWidth < window.innerWidth)
                Footnotes.footnotePopup.style.left = (citationPosition.left + footnotePopupBreathingRoom.x) + "px";
            else if (citationPosition.left - (footnotePopupBreathingRoom.x + Footnotes.footnotePopup.clientWidth) > Footnotes.footnotePopup.getBoundingClientRect().left)
                Footnotes.footnotePopup.style.left = (citationPosition.left - footnotePopupBreathingRoom.x - Footnotes.footnotePopup.clientWidth) + "px";
            var provisionalFootnotePopupHeight = Footnotes.footnotePopup.clientHeight;
            var footnotePopupTop = citationPosition.top + footnotePopupBreathingRoom.y;
            if (footnotePopupTop + provisionalFootnotePopupHeight > window.innerHeight + window.scrollY) {
                footnotePopupTop -= (provisionalFootnotePopupHeight + footnotePopupBreathingRoom.y);
            }
            if (top + provisionalFootnotePopupHeight > window.innerHeight + window.scrollY || provisionalFootnotePopupHeight == window.innerHeight || footnotePopupTop < window.scrollY) {
                footnotePopupTop = window.scrollY;
            }
            if (footnotePopupTop + provisionalFootnotePopupHeight + 120 < citationPosition.top) {
                footnotePopupTop = citationPosition.top - provisionalFootnotePopupHeight;
            } else if (top > citationPosition.top) {
                footnotePopupTop -= 90;
            }
            if (footnotePopupTop < 0) {
                footnotePopupTop = 0;
            }
            Footnotes.footnotePopup.style.top = footnotePopupTop + "px";
        }, 50);
    },
    footnoteoout: (event) => {
        clearTimeout(Footnotes.footnotefadetimeout);
        clearTimeout(Footnotes.footnotekilltimeout);
        clearTimeout(Footnotes.footnotepopuptimeout);
        if (!Footnotes.footnotePopup) return;
        Footnotes.footnotefadetimeout = setTimeout(() => {
            Footnotes.footnotePopup.classList.add("fading");
            Footnotes.footnotekilltimeout = setTimeout(() => {
                Footnotes.footnotePopup.classList.remove("fading");
                Footnotes.footnotePopup.remove();
            }, 750);
        }, 100);
    },
    divover: (event) => {
        clearTimeout(Footnotes.footnotefadetimeout);
        clearTimeout(Footnotes.footnotekilltimeout);
        clearTimeout(Footnotes.footnotepopuptimeout);
        Footnotes.footnotePopup.classList.remove("fading");
    }
}
if (document.readyState == "complete") {
    Footnotes.setup();
} else {
    window.addEventListener("load", Footnotes.setup);
}

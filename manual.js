/* Manual behaviour. Loaded with defer alongside index.js on manual.html only. Two concerns: the collapsible table
   of contents, and scroll-spy that marks the section you are reading. */

(function () {
    "use strict";

    var toc = document.querySelector(".manual-toc");
    var topics = Array.prototype.slice.call(document.querySelectorAll(".manual-topic[id]"));
    if (!toc || topics.length === 0) return;

    var contents = toc.querySelector("[data-manual-contents]");
    var toggle = document.querySelector(".manual-toc-toggle");
    var compact = window.matchMedia("(max-width: 1000px)");

    /* ----------------------------------------------------------------------
       Collapsible table of contents
       ---------------------------------------------------------------------- */
    if (contents && toggle) {
        var toggleState = toggle.querySelector(".manual-toc-toggle-state");

        var setContentsOpen = function (open) {
            contents.hidden = !open;
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            if (toggleState) toggleState.textContent = open ? "Hide sections" : "Show sections";
        };

        setContentsOpen(!compact.matches);

        toggle.addEventListener("click", function () {
            setContentsOpen(contents.hidden);
        });

        contents.addEventListener("click", function (event) {
            if (event.target.closest("a") && compact.matches) setContentsOpen(false);
        });

        compact.addEventListener("change", function (event) {
            setContentsOpen(!event.matches);
        });
    }

    /* ----------------------------------------------------------------------
       Scroll-spy
       ---------------------------------------------------------------------- */
    if (!("IntersectionObserver" in window)) return;

    var links = new Map();
    toc.querySelectorAll('a[href^="#"]').forEach(function (link) {
        links.set(link.getAttribute("href").slice(1), link);
    });

    var current = null;

    /* scrollIntoView here would scroll the PAGE, not just the sticky TOC's own
       overflow box, so nudge scrollTop by hand instead. */
    var keepCurrentInView = function (link) {
        if (!contents || contents.hidden || compact.matches) return;

        var box = contents.getBoundingClientRect();
        var item = link.getBoundingClientRect();

        if (item.top < box.top + 16) {
            contents.scrollTop -= (box.top + 16) - item.top;
        } else if (item.bottom > box.bottom - 16) {
            contents.scrollTop += item.bottom - (box.bottom - 16);
        }
    };

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            var link = links.get(entry.target.id);
            if (!link || link === current) return;

            if (current) current.classList.remove("is-current");
            link.classList.add("is-current");
            current = link;
            keepCurrentInView(link);
        });
    }, { rootMargin: "-20% 0px -70% 0px" });

    topics.forEach(function (topic) {
        observer.observe(topic);
    });
})();

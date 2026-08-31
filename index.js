/* MorrowTab site behaviour. Loaded with defer on every page.
   Five concerns, each guarded so a page without the markup is a no-op:
   mobile nav, motion-aware anchor scrolling, screenshot tabs, screenshot
   light/dark variants, and the screenshot lightbox. */

(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* Declared at module scope so the shared Escape handler can call them even
       when the corresponding markup is absent on this page. */
    var closeSiteNav = function () {};
    var closeLightbox = function () {};

    /* ----------------------------------------------------------------------
       1. Mobile navigation
       ---------------------------------------------------------------------- */
    var headerInner = document.querySelector(".header-inner");
    var navToggle = document.querySelector(".nav-toggle");
    var siteNav = document.getElementById("site-nav");

    if (headerInner && navToggle && siteNav) {
        var setNavOpen = function (open) {
            headerInner.dataset.navOpen = open ? "true" : "false";
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
            document.body.classList.toggle("nav-open", open);
        };

        closeSiteNav = function () {
            if (headerInner.dataset.navOpen === "true") setNavOpen(false);
        };

        setNavOpen(false);

        navToggle.addEventListener("click", function (event) {
            /* Stop the document listener below from seeing this click and
               immediately closing what we just opened. */
            event.stopPropagation();
            setNavOpen(headerInner.dataset.navOpen !== "true");
        });

        siteNav.addEventListener("click", function (event) {
            if (event.target.closest("a")) closeSiteNav();
        });

        document.addEventListener("click", function (event) {
            if (!headerInner.contains(event.target)) closeSiteNav();
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 768) closeSiteNav();
        });
    }

    /* ----------------------------------------------------------------------
       2. Anchor scrolling — honours prefers-reduced-motion, unlike the
          unconditional smooth scroll on the sibling sites.
       ---------------------------------------------------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) {
            var id = link.getAttribute("href");
            if (!id || id === "#") return;

            var target = document.querySelector(id);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({
                behavior: reduceMotion.matches ? "auto" : "smooth",
                block: "start"
            });
            /* scrollIntoView moves the viewport but not focus, so a keyboard
               user would carry on tabbing from the link. Move focus too. */
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
            history.replaceState(null, "", id);
        });
    });

    /* ----------------------------------------------------------------------
       3. Screenshot tabs — real tab semantics (role=tab / tabpanel), with
          arrow-key roving focus, which the sibling sites do not implement.
       ---------------------------------------------------------------------- */
    var tablist = document.querySelector('[role="tablist"]');

    if (tablist) {
        var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

        var selectTab = function (tab, moveFocus) {
            tabs.forEach(function (candidate) {
                var selected = candidate === tab;
                candidate.setAttribute("aria-selected", selected ? "true" : "false");
                candidate.tabIndex = selected ? 0 : -1;

                var panel = document.getElementById(candidate.getAttribute("aria-controls"));
                if (panel) panel.hidden = !selected;
            });
            if (moveFocus) tab.focus();
        };

        tabs.forEach(function (tab, index) {
            tab.addEventListener("click", function () {
                selectTab(tab, false);
            });

            tab.addEventListener("keydown", function (event) {
                var next = null;
                if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
                else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
                else if (event.key === "Home") next = tabs[0];
                else if (event.key === "End") next = tabs[tabs.length - 1];
                if (!next) return;

                event.preventDefault();
                selectTab(next, true);
            });
        });
    }

    /* ----------------------------------------------------------------------
       4. Light / dark screenshot variants
       ---------------------------------------------------------------------- */
    document.querySelectorAll(".screenshot-variants").forEach(function (group) {
        var panel = group.closest(".screenshot-panel");
        if (!panel) return;

        var card = panel.querySelector(".screenshot-card");
        var picture = panel.querySelector("picture");
        var image = panel.querySelector(".screenshot-card img");
        var label = panel.querySelector(".screenshot-label");
        if (!card || !image) return;

        group.querySelectorAll(".screenshot-variant").forEach(function (button) {
            button.addEventListener("click", function () {
                group.querySelectorAll(".screenshot-variant").forEach(function (other) {
                    other.setAttribute("aria-pressed", other === button ? "true" : "false");
                });

                if (picture) {
                    var avif = picture.querySelector('source[type="image/avif"]');
                    var webp = picture.querySelector('source[type="image/webp"]');
                    if (avif && button.dataset.avif) avif.srcset = button.dataset.avif;
                    if (webp && button.dataset.webp) webp.srcset = button.dataset.webp;
                }

                if (button.dataset.previewsrc) image.src = button.dataset.previewsrc;
                if (button.dataset.alt) image.alt = button.dataset.alt;
                if (button.dataset.fullsrc) card.dataset.fullsrc = button.dataset.fullsrc;
                /* Deliberately no aria-label here: a label that does not repeat
                   the visible text fails label-content-name-mismatch. */
                if (label && button.dataset.label) label.textContent = button.dataset.label;
            });
        });
    });

    /* ----------------------------------------------------------------------
       5. Lightbox
       ---------------------------------------------------------------------- */
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightboxImg");

    if (lightbox && lightboxImg) {
        var lastFocused = null;
        /* aria-modal="true" is a promise that the rest of the page is unreachable.
           Marking the landmarks inert is what actually keeps it — without this,
           Tab walks straight out of the dialog into the header and the page. */
        var backdropRegions = [
            document.querySelector(".skip-link"),
            document.querySelector("header"),
            document.getElementById("main-content"),
            document.querySelector("footer")
        ].filter(Boolean);

        var setBackdropInert = function (inert) {
            backdropRegions.forEach(function (region) {
                if (inert) region.setAttribute("inert", "");
                else region.removeAttribute("inert");
            });
        };

        closeLightbox = function () {
            if (!lightbox.classList.contains("active")) return;
            lightbox.classList.remove("active");
            lightbox.setAttribute("aria-hidden", "true");
            document.body.classList.remove("lightbox-open");
            lightboxImg.removeAttribute("src");
            setBackdropInert(false);
            if (lastFocused) lastFocused.focus();
        };

        document.querySelectorAll(".screenshot-card").forEach(function (card) {
            card.addEventListener("click", function () {
                var source = card.dataset.fullsrc;
                if (!source) return;

                var preview = card.querySelector("img");
                lastFocused = card;
                lightboxImg.src = source;
                lightboxImg.alt = preview ? preview.alt : "";
                lightbox.classList.add("active");
                lightbox.setAttribute("aria-hidden", "false");
                document.body.classList.add("lightbox-open");
                setBackdropInert(true);

                var close = lightbox.querySelector(".lightbox-close");
                if (close) close.focus();
            });
        });

        lightbox.addEventListener("click", closeLightbox);
    }

    /* One shared Escape handler for both dismissible surfaces. */
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        closeSiteNav();
        closeLightbox();
    });
})();

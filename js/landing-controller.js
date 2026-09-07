// ── Landing Page View Transitions & Actions (js/landing-controller.js) ─
import { state, updateDocumentTitle } from "./state.js";
import { showToast } from "./toast.js";

export function openLeaveEditorModal() {
    const leaveModal = document.getElementById("leaveEditorModal");
    if (leaveModal) {
        leaveModal.style.display = "flex";
        leaveModal.classList.add("active");
        if (typeof lucide !== "undefined") lucide.createIcons();
    }
}

export function closeLeaveEditorModal() {
    const leaveModal = document.getElementById("leaveEditorModal");
    if (leaveModal) {
        leaveModal.style.display = "none";
        leaveModal.classList.remove("active");
    }
}

export function showLandingScreen(force = false, skipPush = false) {
    const editor = document.getElementById("appEditorScreen");
    const isEditorActive = Boolean(editor && (document.body.classList.contains("editor-active") || editor.classList.contains("active") || editor.style.display === "flex" || editor.style.display === "block"));
    const hasUnsavedWork = Boolean(state.pdfDoc || (state.fields && state.fields.length > 0));

    // If leaving from active editor with fields or document in progress, warn the user first
    if (!force && (isEditorActive || state.pdfDoc) && hasUnsavedWork) {
        openLeaveEditorModal();
        return;
    }

    const landing = document.getElementById("landingScreen");
    if (landing) landing.style.display = "block";
    if (editor) editor.style.display = "none";
    document.body.classList.remove("editor-active");

    closeLeaveEditorModal();

    // Close any floating onboarding tours
    try {
        import("./onboarding-tour.js").then(tour => tour.closeTour?.()).catch(() => {});
    } catch(e){}
    document.querySelectorAll(".onboarding-tour-popover").forEach(el => el.remove());

    // Restore standard scrolling
    document.body.style.overflow = "";

    // Close all open modals & banners
    document.querySelectorAll(".modal").forEach(m => {
        m.style.display = "none";
        m.classList.remove("active");
    });
    const fillBanner = document.getElementById("fillModeBanner");
    if (fillBanner) fillBanner.style.display = "none";

    // Ensure all landing sections are immediately visible and interactive
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));

    // Resume background hero video smoothly
    const bgVideo = document.querySelector(".hero-showcase-video");
    if (bgVideo) {
        try {
            bgVideo.playbackRate = 0.85;
            bgVideo.play().catch(() => {});
        } catch (e) {}
    }

    if (force) {
        state.fields = [];
        state.selectedFieldIds.clear();
        state.pdfDoc = null;
        state.originalPdfBytes = null;
        state.history = [];
        state.historyIndex = -1;
        state.fileName = "interactive_form.pdf";
        state.activeTool = "select";
        state.mode = "design";

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "flex";

        const overlayContainer = document.getElementById("overlayContainer");
        if (overlayContainer) overlayContainer.innerHTML = "";

        const canvas = document.getElementById("pageCanvas");
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // Sync browser history state
    if (!skipPush) {
        if (window.location.hash === "#editor" || (history.state && history.state.screen === "editor")) {
            history.pushState({ screen: "landing" }, "", window.location.pathname);
        } else {
            history.replaceState({ screen: "landing" }, "", window.location.pathname);
        }
    }

    renderLandingReviews();
    updateDocumentTitle();
    if (typeof lucide !== "undefined") lucide.createIcons();
    if (!skipPush && landing) {
        landing.scrollTop = 0;
    }
}

let currentReviewPageSize = 6;
let reviewsInitialized = false;

// These are placeholder/example content for the landing page, not real
// customer testimonials — there's no verification mechanism anywhere in
// this app, so they must never be badged "Verified User" alongside genuine
// submitted reviews (see isExample handling in renderLandingReviews).
const DEFAULT_EXAMPLE_REVIEWS = [
    {
        id: "def_1",
        date: "2026-08-18T10:00:00.000Z",
        rating: 5,
        category: "Legal Counsel",
        sender: "Sarah Jenkins",
        message: "Formblatt made converting our corporate NDA into a fillable AcroForm effortless! Zero server uploads gives our legal team complete peace of mind.",
        isVerified: false,
        isExample: true
    },
    {
        id: "def_2",
        date: "2026-08-16T14:30:00.000Z",
        rating: 5,
        category: "Tax Consultant",
        sender: "Marcus Vance",
        message: "The smart field auto-detection feature saved me hours on W-9 tax forms. The exported AcroForms work flawlessly in Adobe Acrobat and Chrome.",
        isVerified: false,
        isExample: true
    },
    {
        id: "def_3",
        date: "2026-08-14T09:15:00.000Z",
        rating: 5,
        category: "Software Engineer",
        sender: "David K.",
        message: "Finally a privacy-first PDF form builder that runs 100% in the browser without requiring any subscriptions or sign-ups. Outstanding tool!",
        isVerified: false,
        isExample: true
    }
];

export function renderLandingReviews() {
    const grid = document.getElementById("userReviewsGrid");
    const countPill = document.getElementById("reviewCountPill");
    const loadMoreBtnContainer = document.getElementById("loadMoreReviewsContainer");
    const loadMoreBtn = document.getElementById("loadMoreReviewsBtn");
    const loadMoreText = document.getElementById("loadMoreReviewsText");
    const sortSelect = document.getElementById("reviewSortSelect");

    if (!grid) return;

    let savedReviews = [];
    try {
        savedReviews = JSON.parse(localStorage.getItem("justforms_reviews") || "[]");
    } catch(e) {}

    // Only genuine, user-submitted reviews are sortable/countable/paginated
    // here. The example testimonials are rendered in their own section
    // below (see renderExampleReviewsSection) so a fabricated 5-star can
    // never outrank, or be counted alongside, a real submission.
    const realReviews = savedReviews.map((r, idx) => ({
        id: `user_${idx}`,
        date: r.date || new Date().toISOString(),
        rating: parseInt(r.rating) || 5,
        category: r.category || "General Review",
        sender: r.sender ? r.sender.split("@")[0] : "Verified User",
        message: (r.message || "").trim(),
        isVerified: false
    })).filter(r => r.message.length > 0);

    const sortBy = sortSelect ? sortSelect.value : "latest";
    if (sortBy === "oldest") {
        realReviews.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === "rating") {
        realReviews.sort((a, b) => b.rating - a.rating || new Date(b.date) - new Date(a.date));
    } else {
        realReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const totalCount = realReviews.length;
    const visibleReviews = realReviews.slice(0, currentReviewPageSize);

    if (countPill) {
        countPill.textContent = totalCount > 0
            ? `Showing ${visibleReviews.length} of ${totalCount} Review${totalCount > 1 ? 's' : ''}`
            : "No user reviews yet, be the first!";
    }

    const escapeHtml = str => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    if (visibleReviews.length === 0) {
        grid.innerHTML = `
            <div class="reviews-empty-state">
                <p>No user-submitted reviews yet. Used Formblatt? Be the first to share your experience.</p>
            </div>
        `;
    } else {
        grid.innerHTML = visibleReviews.map(r => {
            // Clamp: a rating outside 1-5 (corrupted localStorage entry, future
            // widget bug, manual tampering via devtools) would otherwise make
            // "☆".repeat(5 - rating) receive a negative count and throw,
            // breaking the entire grid's render, not just this one card.
            const rating = Math.min(5, Math.max(1, parseInt(r.rating) || 5));
            const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
            const msg = escapeHtml(r.message);
            const sender = escapeHtml(r.sender);
            const category = escapeHtml(r.category);
            const badgeText = r.isVerified ? "Verified User" : "User Submitted";
            const badgeStyle = r.isVerified
                ? "background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;"
                : "background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe;";

            return `
                <div class="review-card" style="${r.isVerified ? '' : 'border: 1.5px solid #bfdbfe; background: #f8fafc;'}">
                    <div class="review-card-header">
                        <div class="review-stars">${stars}</div>
                        <span class="review-badge" style="${badgeStyle}">${badgeText}</span>
                    </div>
                    <p class="review-text">"${msg}"</p>
                    <div class="review-footer">
                        <strong class="review-author">${sender}</strong>
                        <span class="review-meta">${category} • ${rating}.0 Rating</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    if (loadMoreBtnContainer && loadMoreBtn && loadMoreText) {
        if (visibleReviews.length >= totalCount || totalCount === 0) {
            loadMoreBtnContainer.style.display = "none";
        } else {
            loadMoreBtnContainer.style.display = "flex";
            const remaining = totalCount - visibleReviews.length;
            loadMoreText.textContent = `Show More Reviews (${remaining} remaining)`;
        }
    }

    if (!reviewsInitialized) {
        reviewsInitialized = true;
        sortSelect?.addEventListener("change", () => {
            currentReviewPageSize = 6;
            renderLandingReviews();
        });

        loadMoreBtn?.addEventListener("click", () => {
            currentReviewPageSize += 6;
            renderLandingReviews();
        });
    }

    renderExampleReviewsSection();
}

// Renders the example testimonials in their own dedicated section, fully
// separate from the sortable/countable real-reviews grid above — created
// once and inserted just before it, so examples read as illustrative
// ("why people use JustForms") rather than as part of the user-generated
// review count or ranking.
function renderExampleReviewsSection() {
    const grid = document.getElementById("userReviewsGrid");
    if (!grid || !grid.parentNode) return;

    let section = document.getElementById("exampleReviewsSection");
    if (!section) {
        section = document.createElement("div");
        section.id = "exampleReviewsSection";
        section.className = "example-reviews-section";
        grid.parentNode.insertBefore(section, grid);
    }

    const escapeHtml = str => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    section.innerHTML = `
        <h3 class="example-reviews-heading">Why people use Formblatt</h3>
        <div class="example-reviews-grid">
            ${DEFAULT_EXAMPLE_REVIEWS.map(r => {
                const rating = Math.min(5, Math.max(1, parseInt(r.rating) || 5));
                const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
                return `
                    <div class="review-card example-review-card">
                        <div class="review-card-header">
                            <div class="review-stars">${stars}</div>
                            <span class="review-badge" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">Example</span>
                        </div>
                        <p class="review-text">"${escapeHtml(r.message)}"</p>
                        <div class="review-footer">
                            <strong class="review-author">${escapeHtml(r.sender)}</strong>
                            <span class="review-meta">${escapeHtml(r.category)}</span>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

export async function showEditorScreen(onReady, skipPush = false) {
    const landing = document.getElementById("landingScreen");
    const editor = document.getElementById("appEditorScreen");
    if (landing) landing.style.display = "none";
    if (editor) {
        editor.style.display = "flex";
        document.body.classList.add("editor-active");
        updateDocumentTitle();
    }

    // Ensure editor subsystems are initialized
    const { initEditorSubsystems } = await import("./editor-app.js");
    initEditorSubsystems();

    // Manage history state so browser Back button returns to landing or prompts to save
    if (!skipPush) {
        history.pushState({ screen: "editor" }, "", "#editor");
    }

    closeLeaveEditorModal();

    if (typeof lucide !== "undefined") lucide.createIcons();
    if (onReady) onReady();
}

export async function loadPdfFile(file, onLoaded) {
    if (!file) return;

    if (file.name.endsWith(".json") || file.name.endsWith(".jform") || file.name.endsWith(".justforms") || file.name.endsWith(".formblatt") || file.name.endsWith(".fblatt")) {
        const { importProjectJson } = await import("./storage-manager.js");
        importProjectJson(file, onLoaded);
        return;
    }

    try {
        const { loadPdfLibraries, analyzePdfDocument, goToPage } = await import("./pdf-engine.js");
        const { importExistingAcroFormFields } = await import("./auto-detector.js");
        const { saveHistory } = await import("./storage-manager.js");

        await loadPdfLibraries();
        const pdfjs = typeof window !== "undefined" ? (window.pdfjsLib || globalThis.pdfjsLib) : (typeof pdfjsLib !== "undefined" ? pdfjsLib : null);
        if (!pdfjs) throw new Error("PDF.js library could not be loaded");

        const bytes = new Uint8Array(await file.arrayBuffer());
        const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
        const loadedDoc = await loadingTask.promise;
        state.originalPdfBytes = bytes;
        state.pdfDoc = loadedDoc;
        state.totalPages = state.pdfDoc.numPages;
        state.currentPageNum = 1;
        state.fields.length = 0;
        state.selectedFieldIds.clear();
        state.fileName = file.name ? (file.name.toLowerCase().endsWith(".pdf") ? file.name : file.name + ".pdf") : "interactive_form.pdf";

        await analyzePdfDocument();
        try {
            await importExistingAcroFormFields("all");
        } catch(importErr) {
            console.warn("Could not import existing acroform widgets:", importErr);
        }
        state.lastSelectedFieldId = state.fields[0]?.id || null;

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";

        await showEditorScreen(() => {
            goToPage(1).then(() => {
                saveHistory();
                if (onLoaded) onLoaded();
            });
        });
    } catch(err) {
        console.error("Failed to load PDF:", err);
        showToast("Failed to load PDF: " + (err.message || err), "error");
    }
}

export async function loadTemplate(key, onLoaded) {
    try {
        const { STARTER_TEMPLATES, createTemplatePdf } = await import("./templates-engine.js");
        const { loadPdfLibraries, analyzePdfDocument, goToPage } = await import("./pdf-engine.js");
        const { saveHistory } = await import("./storage-manager.js");

        const tpl = STARTER_TEMPLATES[key];
        if (!tpl) return;

        await loadPdfLibraries();
        const pdfjs = typeof window !== "undefined" ? (window.pdfjsLib || globalThis.pdfjsLib) : (typeof pdfjsLib !== "undefined" ? pdfjsLib : null);
        if (!pdfjs) throw new Error("PDF.js library could not be loaded");

        state.originalPdfBytes = await createTemplatePdf(key);
        state.pdfDoc = await pdfjs.getDocument({ data: state.originalPdfBytes.slice() }).promise;
        state.totalPages = state.pdfDoc.numPages;
        state.fields = JSON.parse(JSON.stringify(tpl.fields));
        state.fields.forEach(f => { f.page = 1; });
        state.fieldCounter = state.fields.length + 1;
        state.selectedFieldIds.clear();
        state.lastSelectedFieldId = state.fields[0]?.id || null;
        state.fileName = key + ".pdf";

        await analyzePdfDocument();

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";

        await showEditorScreen(() => {
            goToPage(1).then(() => {
                saveHistory();
                if (onLoaded) onLoaded();
            });
        });
    } catch(err) {
        console.error("Failed to generate template PDF:", err);
        showToast("Failed to load template: " + (err.message || err), "error");
    }
}

export function initLandingController(onLoaded) {
    // Set initial baseline history state
    if (!history.state) {
        history.replaceState({ screen: "landing" }, "", window.location.pathname);
    }

    // Handle Browser Back / Forward Buttons (popstate)
    window.addEventListener("popstate", e => {
        const editor = document.getElementById("appEditorScreen");
        const isEditorActive = Boolean(editor && (document.body.classList.contains("editor-active") || editor.classList.contains("active") || editor.style.display === "flex" || editor.style.display === "block"));
        const hasActiveSession = Boolean(state.pdfDoc || (state.fields && state.fields.length > 0) || isEditorActive);

        if (hasActiveSession) {
            // Keep editor visible
            if (editor) editor.style.display = "flex";
            document.body.classList.add("editor-active");
            const landing = document.getElementById("landingScreen");
            if (landing) landing.style.display = "none";

            // Re-push editor state so browser remains in app on #editor
            history.pushState({ screen: "editor" }, "", "#editor");
            openLeaveEditorModal();
        } else {
            showLandingScreen(true, true);
        }
    });

    // Guard against accidental tab close or page reload when form fields/doc exist
    window.addEventListener("beforeunload", e => {
        const isEditorActive = document.getElementById("appEditorScreen")?.style.display !== "none";
        const hasUnsavedWork = Boolean(state.pdfDoc || (state.fields && state.fields.length > 0));
        if (isEditorActive && hasUnsavedWork) {
            e.preventDefault();
            e.returnValue = "";
        }
    });

    // Navigation to home & smooth anchor scrolling
    const scrollToTop = () => {
        const landingScreen = document.getElementById("landingScreen");
        if (landingScreen) {
            landingScreen.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    document.getElementById("landingLogoBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToTop();
    });
    document.getElementById("footerBrandLogo")?.addEventListener("click", (e) => {
        e.preventDefault();
        scrollToTop();
    });
    document.getElementById("backToHomeBtn")?.addEventListener("click", () => showLandingScreen(false));
    document.getElementById("editorBrandLogo")?.addEventListener("click", () => showLandingScreen(false));
    document.getElementById("menuHomeBtn")?.addEventListener("click", () => showLandingScreen(false));
    document.getElementById("newProjectMenuBtn")?.addEventListener("click", () => showLandingScreen(false));

    // Leave Editor Unsaved Changes Modal Actions
    const leaveModal = document.getElementById("leaveEditorModal");

    document.getElementById("cancelLeaveEditorBtn")?.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeLeaveEditorModal();
    });
    
    document.getElementById("discardAndLeaveEditorBtn")?.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        closeLeaveEditorModal();
        showLandingScreen(true);
    });

    document.getElementById("saveAndLeaveEditorBtn")?.addEventListener("click", async e => {
        e.preventDefault();
        e.stopPropagation();
        const { exportProjectJson } = await import("./storage-manager.js");
        const baseName = (state.fileName || "interactive_form").replace(/\.pdf$/i, "");
        exportProjectJson(baseName);
        closeLeaveEditorModal();
        showLandingScreen(true);
    });

    leaveModal?.addEventListener("click", e => {
        if (e.target === leaveModal) closeLeaveEditorModal();
    });

    // Helper to wire modals with open, close buttons, and backdrop click
    function bindModal(triggerIds, modalId, closeBtnIds = []) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const openModal = () => {
            modal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        };
        const closeModal = () => {
            modal.style.display = "none";
        };

        const triggers = Array.isArray(triggerIds) ? triggerIds : [triggerIds];
        triggers.forEach(id => {
            document.getElementById(id)?.addEventListener("click", openModal);
        });

        closeBtnIds.forEach(id => {
            document.getElementById(id)?.addEventListener("click", closeModal);
        });

        modal.addEventListener("click", e => {
            if (e.target === modal) closeModal();
        });
    }

    // Bind Legal & Info Modals
    bindModal("footerPrivacyBtn", "privacyModal", ["closePrivacyModalBtn", "dismissPrivacyModalBtn"]);
    bindModal("footerTermsBtn", "termsModal", ["closeTermsModalBtn", "dismissTermsModalBtn"]);
    bindModal("footerCookieBtn", "cookieModal", ["closeCookieModalBtn", "dismissCookieModalBtn"]);
    bindModal(["footerComplianceBtn", "complianceNoticeBtn"], "complianceModal", ["closeComplianceModalBtn", "dismissComplianceModalBtn"]);
    bindModal("footerAboutBtn", "aboutModal", ["closeAboutModalBtn", "dismissAboutModalBtn"]);
    bindModal(["landingShortcutsBtn", "footerShortcutsBtn", "shortcutsMenuBtn"], "shortcutsModal", ["closeShortcutsModalBtn"]);
    bindModal(["landingFeedbackBtn", "footerFeedbackBtn", "feedbackMenuBtn"], "feedbackModal", ["closeFeedbackModalBtn"]);

    // Smooth Scroll for Landing Anchor Links with Sticky Header Offset
    // Smooth Scroll for Landing Anchor Links
    document.querySelectorAll("#landingScreen a[href^='#'], .nav-links a[href^='#'], .foot-col a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", e => {
            const href = anchor.getAttribute("href");
            if (!href || href === "#") return;
            const targetId = href.substring(1);
            if (!targetId) return;

            e.preventDefault();
            if (targetId === "hero" || targetId === "landingScreen") {
                scrollToTop();
                return;
            }
            const targetElem = document.getElementById(targetId);
            if (targetElem) {
                targetElem.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });

    // File Upload inputs & Trigger Buttons
    const handleUploadInput = async e => {
        const file = e.target.files[0];
        if (file) await loadPdfFile(file, onLoaded);
        e.target.value = "";
    };

    // Keyboard accessibility triggers for upload labels
    ["navUploadBtn", "heroBrowseBtn", "heroOpenProjectBtn", "footerBrowseBtn"].forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                el.click();
            }
        });
    });

    document.getElementById("navCreateBlankBtn")?.addEventListener("click", e => {
        e.preventDefault();
        loadTemplate("blank", () => {
            if (onLoaded) onLoaded();
        });
    });
    document.getElementById("heroCreateBlankBtn")?.addEventListener("click", e => {
        e.preventDefault();
        loadTemplate("blank", () => {
            if (onLoaded) onLoaded();
        });
    });
    document.getElementById("emptyStateCreateBlankBtn")?.addEventListener("click", e => {
        e.preventDefault();
        loadTemplate("blank", () => {
            if (onLoaded) onLoaded();
        });
    });

    document.getElementById("landingPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("landingOpenProjectUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("heroPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("heroOpenProjectUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("footerPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("pdfUploadMenu")?.addEventListener("change", handleUploadInput);
    document.getElementById("emptyStateUpload")?.addEventListener("change", handleUploadInput);

    // Comprehensive UI & Video Caption Localization Dictionary
    const UI_CAPTIONS = {
        en: {
            sponsorCaption: "Formblatt is free & privacy-first",
            sponsorTitle: "Support Open-Source & Free Tools",
            sponsorDesc: "Help keep Formblatt 100% private, client-side, and ad-free.",
            sponsorAction: "Support",
            heroEyebrow: "YOUR PDF NEVER LEAVES YOUR COMPUTER"
        },
        de: {
            sponsorCaption: "Formblatt ist 100% kostenlos & privat",
            sponsorTitle: "Open-Source & Datenschutz unterstützen",
            sponsorDesc: "Formblatt bleibt privat, clientseitig und werbefrei.",
            sponsorAction: "Unterstützen",
            heroEyebrow: "IHRE PDF-DATEI VERLÄSST NIEMALS IHREN COMPUTER"
        },
        fr: {
            sponsorCaption: "Formblatt est gratuit & confidentiel",
            sponsorTitle: "Soutenir l'Open-Source & les Outils Libres",
            sponsorDesc: "Gardez Formblatt 100% privé, local et sans publicité.",
            sponsorAction: "Soutenir",
            heroEyebrow: "VOTRE PDF NE QUITTE JAMAIS VOTRE ORDINATEUR"
        },
        es: {
            sponsorCaption: "Formblatt es gratuito y privado",
            sponsorTitle: "Apoyar el código abierto y herramientas libres",
            sponsorDesc: "Mantenga Formblatt 100% privado, local y sin anuncios.",
            sponsorAction: "Apoyar",
            heroEyebrow: "SU PDF NUNCA SALE DE SU COMPUTADORA"
        },
        it: {
            sponsorCaption: "Formblatt è gratuito e riservato",
            sponsorTitle: "Sostieni l'Open Source & Strumenti Gratuiti",
            sponsorDesc: "Formblatt rimane privato, eseguito in locale e senza pubblicità.",
            sponsorAction: "Sostieni",
            heroEyebrow: "IL TUO PDF NON LASCIA MAI IL TUO COMPUTER"
        },
        pt: {
            sponsorCaption: "Formblatt é gratuito e seguro",
            sponsorTitle: "Apoie o Código Aberto & Ferramentas Livres",
            sponsorDesc: "Mantenha o Formblatt 100% privado, local e sem anúncios.",
            sponsorAction: "Apoiar",
            heroEyebrow: "O SEU PDF NUNCA SAI DO SEU COMPUTADOR"
        },
        nl: {
            sponsorCaption: "Formblatt is gratis & privacy-vriendelijk",
            sponsorTitle: "Steun Open-Source & Vrije Software",
            sponsorDesc: "Houd Formblatt 100% lokaal, privé en advertentievrij.",
            sponsorAction: "Steunen",
            heroEyebrow: "UW PDF VERLAAT NOOIT UW COMPUTER"
        },
        ja: {
            sponsorCaption: "Formblattは完全無料でプライバシー重視",
            sponsorTitle: "オープンソースと無料ツールの支援",
            sponsorDesc: "完全ブラウザ完結で安全なPDFフォーム作成を支援。",
            sponsorAction: "支援する",
            heroEyebrow: "PDFファイルはお使いの端末から送信されません"
        },
        zh: {
            sponsorCaption: "Formblatt 完全免费且保护隐私",
            sponsorTitle: "支持开源与免费工具",
            sponsorDesc: "纯浏览器端运行，确保您的 PDF 数据完全私密安全。",
            sponsorAction: "支持我们",
            heroEyebrow: "您的 PDF 绝不会离开您的电脑"
        },
        ne: {
            sponsorCaption: "Formblatt पूर्ण रूपमा निःशुल्क र गोप्य छ",
            sponsorTitle: "खुला स्रोत र निःशुल्क सफ्टवेयरलाई समर्थन गर्नुहोस्",
            sponsorDesc: "तपाईंको PDF कम्प्युटरमै प्रशोधन हुन्छ, कतै अपलोड हुँदैन।",
            sponsorAction: "सहयोग",
            heroEyebrow: "तपाईंको PDF फाइल तपाईंको कम्प्युटरबाट बाहिर जाँदैन"
        }
    };

    function getUserPreferredLang() {
        try {
            const saved = localStorage.getItem("formblatt_caption_lang");
            if (saved && (UI_CAPTIONS[saved] || saved === "off")) return saved;
        } catch (e) {}

        const nav = typeof navigator !== "undefined" ? navigator : {};
        const navLangs = nav.languages && nav.languages.length 
            ? nav.languages 
            : [nav.language || nav.userLanguage || "en"];
        for (const raw of navLangs) {
            const code = (raw || "").slice(0, 2).toLowerCase();
            if (UI_CAPTIONS[code]) return code;
        }
        return "en";
    }

    function switchCaptionTrack(videoElement, targetLang) {
        if (!videoElement) return;

        const apply = () => {
            const trackElements = videoElement.querySelectorAll("track");
            trackElements.forEach(el => {
                const isMatch = targetLang !== "off" && el.srclang === targetLang;
                if (isMatch) {
                    el.default = true;
                    if (el.track) el.track.mode = "showing";
                } else {
                    el.default = false;
                    if (el.track) el.track.mode = "disabled";
                }
            });

            if (videoElement.textTracks && videoElement.textTracks.length > 0) {
                for (let i = 0; i < videoElement.textTracks.length; i++) {
                    const track = videoElement.textTracks[i];
                    if (targetLang !== "off" && track.language === targetLang) {
                        track.mode = "showing";
                    } else {
                        track.mode = "disabled";
                    }
                }
            }
        };

        if (videoElement.readyState >= 1) {
            apply();
        } else {
            videoElement.addEventListener("loadedmetadata", apply, { once: true });
        }
    }

    function localizeUiCaptions(langCode) {
        const dict = UI_CAPTIONS[langCode] || UI_CAPTIONS["en"];
        if (!dict) return;

        const sponsorCap = document.getElementById("exportSponsorCaption");
        const sponsorTitle = document.getElementById("exportSponsorTitle");
        const sponsorDesc = document.getElementById("exportSponsorDesc");
        const sponsorAct = document.getElementById("exportSponsorActionText");
        const heroEyebrow = document.querySelector(".hero-eyebrow");

        if (sponsorCap && dict.sponsorCaption) sponsorCap.textContent = dict.sponsorCaption;
        if (sponsorTitle && dict.sponsorTitle) sponsorTitle.textContent = dict.sponsorTitle;
        if (sponsorDesc && dict.sponsorDesc) sponsorDesc.textContent = dict.sponsorDesc;
        if (sponsorAct && dict.sponsorAction) sponsorAct.textContent = dict.sponsorAction;
        if (heroEyebrow && dict.heroEyebrow) heroEyebrow.textContent = dict.heroEyebrow;
    }

    // Glassy Video Player Modal Controller
    const heroBgVideo = document.querySelector(".hero-showcase-video");
    const expVideo = document.getElementById("expandedDemoVideo");
    const captionSelect = document.getElementById("videoCaptionSelect");

    const activeLang = getUserPreferredLang();
    localizeUiCaptions(activeLang);

    if (captionSelect) {
        captionSelect.value = activeLang;
        captionSelect.addEventListener("change", e => {
            const chosen = e.target.value;
            try { localStorage.setItem("formblatt_caption_lang", chosen); } catch(e){}
            if (chosen !== "off") {
                localizeUiCaptions(chosen);
            }
            if (expVideo) switchCaptionTrack(expVideo, chosen);
            if (heroBgVideo) switchCaptionTrack(heroBgVideo, chosen);
        });
    }

    if (heroBgVideo) {
        try { heroBgVideo.playbackRate = 0.85; } catch(e){}
        switchCaptionTrack(heroBgVideo, activeLang);
        heroBgVideo.addEventListener("loadedmetadata", () => {
            try { heroBgVideo.playbackRate = 0.85; } catch(e){}
            switchCaptionTrack(heroBgVideo, activeLang);
        });
    }

    if (expVideo) {
        switchCaptionTrack(expVideo, activeLang);
    }

    window.openHeroVideoModal = function() {
        const modal = document.getElementById("videoPlayerModal");
        const expVideo = document.getElementById("expandedDemoVideo");
        const bgVideo = document.querySelector(".hero-showcase-video");
        const captionSelect = document.getElementById("videoCaptionSelect");
        if (!modal || !expVideo) return;
        
        modal.classList.add("active");
        modal.style.display = "flex";
        
        const currentLang = captionSelect ? captionSelect.value : getUserPreferredLang();
        switchCaptionTrack(expVideo, currentLang);
        
        // Always playback from the start (00:00)
        try {
            expVideo.currentTime = 0;
        } catch (e) {}
        
        try {
            bgVideo?.pause();
            expVideo.play().catch(() => {});
        } catch (e) {}

        document.body.style.overflow = "hidden";
    };

    window.closeHeroVideoModal = function() {
        const modal = document.getElementById("videoPlayerModal");
        const expVideo = document.getElementById("expandedDemoVideo");
        const bgVideo = document.querySelector(".hero-showcase-video");
        if (!modal || !expVideo) return;
        
        modal.classList.remove("active");
        modal.style.display = "none";
        
        try {
            expVideo.pause();
            expVideo.currentTime = 0;
            bgVideo?.play().catch(() => {});
        } catch (e) {}

        document.body.style.overflow = "";
    };

    // Interactive Dropzone with Drag & Drop & Click-to-Play Modal
    const heroDropzone = document.getElementById("heroDropzone");
    if (heroDropzone) {
        heroDropzone.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            window.openHeroVideoModal();
        });
        ["dragenter", "dragover"].forEach(name => {
            heroDropzone.addEventListener(name, e => {
                e.preventDefault();
                heroDropzone.classList.add("dragover");
            });
        });
        ["dragleave", "drop"].forEach(name => {
            heroDropzone.addEventListener(name, e => {
                e.preventDefault();
                heroDropzone.classList.remove("dragover");
            });
        });
        heroDropzone.addEventListener("drop", async e => {
            const file = e.dataTransfer?.files[0];
            if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".json") || file.name.endsWith(".formblatt") || file.name.endsWith(".jform") || file.name.endsWith(".justforms"))) {
                await loadPdfFile(file, onLoaded);
            } else if (file) {
                showToast("Supported formats: PDF documents (.pdf) or Formblatt project files (.formblatt).", "warning");
            }
        });
    }

    const videoModalEl = document.getElementById("videoPlayerModal");
    const pureVideoCardEl = document.getElementById("pureVideoCard");

    document.getElementById("closeVideoModalBtn")?.addEventListener("click", () => {
        window.closeHeroVideoModal();
    });

    document.getElementById("closeVideoModalBackdrop")?.addEventListener("click", () => {
        window.closeHeroVideoModal();
    });

    videoModalEl?.addEventListener("click", e => {
        if (!e.target.closest("#pureVideoCard")) {
            window.closeHeroVideoModal();
        }
    });

    pureVideoCardEl?.addEventListener("click", e => {
        e.stopPropagation();
    });

    document.getElementById("videoModalTryBtn")?.addEventListener("click", () => {
        window.closeHeroVideoModal();
        loadTemplate("expenseClaim", () => {
            if (onLoaded) onLoaded();
        });
    });

    window.addEventListener("keydown", e => {
        const modal = document.getElementById("videoPlayerModal");
        const expVideo = document.getElementById("expandedDemoVideo");
        if (!modal || !modal.classList.contains("active")) return;
        if (e.key === "Escape") {
            window.closeHeroVideoModal();
        } else if (e.key === " " || e.code === "Space") {
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                if (expVideo && expVideo.paused) expVideo.play();
                else if (expVideo) expVideo.pause();
            }
        } else if (e.key === "f" || e.key === "F") {
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                if (expVideo && expVideo.requestFullscreen) expVideo.requestFullscreen();
            }
        }
    });

    // Global Canvas & Window Drag & Drop PDF Loader
    window.addEventListener("dragover", e => {
        if (e.dataTransfer?.types?.includes("Files")) {
            e.preventDefault();
        }
    });
    window.addEventListener("drop", async e => {
        if (e.target.closest("#layersList") || e.target.closest(".layer-item")) return;
        const file = e.dataTransfer?.files[0];
        if (!file) return;
        const isValid = file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".json") || file.name.endsWith(".formblatt") || file.name.endsWith(".jform") || file.name.endsWith(".justforms");
        // Always preventDefault on any dropped file — otherwise the browser's
        // default behavior for an unhandled drop is to navigate the whole
        // tab away to that file, silently destroying the user's session.
        // Previously this only ran inside the valid-file branch below.
        e.preventDefault();
        if (isValid) {
            await loadPdfFile(file, onLoaded);
        } else {
            showToast("Supported formats: PDF documents (.pdf) or Formblatt project files (.formblatt).", "warning");
        }
    });

    // Interactive Demo Playground Event Handlers
    const demoNameInput = document.getElementById("demoNameInput");
    const demoSigPreview = document.getElementById("demoSigPreview");
    if (demoNameInput && demoSigPreview) {
        demoNameInput.addEventListener("input", e => {
            const val = e.target.value.trim();
            demoSigPreview.textContent = val.length > 0 ? val : "Alex Morgan";
        });
    }

    // Dismiss Floating Editor Shortcut Bar
    document.getElementById("closeShortcutBarBtn")?.addEventListener("click", () => {
        const bar = document.getElementById("editorShortcutBar");
        if (bar) bar.style.display = "none";
    });

    // Mobile Device Handoff & Web Share API Handlers
    const handleDeviceShare = async () => {
        const shareData = {
            title: "Formblatt: Client-Side PDF Form Builder",
            text: "Create fillable PDF AcroForms on desktop without server uploads!",
            url: window.location.href
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {}
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast("Link copied to clipboard! Open on desktop to create fillable forms.", "success");
            } catch (e) {
                showToast("Copy this page's link from your browser's address bar to share it.", "info", 6000);
            }
        }
    };

    document.getElementById("mobileHeroShareBtn")?.addEventListener("click", handleDeviceShare);
    document.getElementById("mobileBottomShareBtn")?.addEventListener("click", handleDeviceShare);
    document.getElementById("mobileExploreFormsBtn")?.addEventListener("click", () => {
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    });

    // Sample Document Cards & Intermediary Preview Modal
    let pendingTemplateKey = null;
    const sampleModal = document.getElementById("samplePreviewModal");
    const sampleTitle = document.getElementById("sampleModalTitle");
    const sampleDesc = document.getElementById("sampleModalDesc");
    const confirmBtn = document.getElementById("confirmOpenSampleBtn");

    const closeSampleModal = () => {
        if (sampleModal) sampleModal.style.display = "none";
        pendingTemplateKey = null;
    };

    document.getElementById("closeSampleModalBtn")?.addEventListener("click", closeSampleModal);
    document.getElementById("cancelSampleModalBtn")?.addEventListener("click", closeSampleModal);

    confirmBtn?.addEventListener("click", () => {
        if (pendingTemplateKey) {
            const keyToLoad = pendingTemplateKey;
            closeSampleModal();
            loadTemplate(keyToLoad, () => {
                if (onLoaded) onLoaded();
                import("./onboarding-tour.js").then(tour => tour.startOnboardingTour());
            });
        }
    });

    document.querySelectorAll(".template-card, .template-use-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            const card = e.target.closest("[data-template]");
            const key = card?.dataset.template;
            if (!key) return;

            // Skip the "confirm to load" modal entirely when there's nothing
            // to lose — mirrors the hasUnsavedWork check showLandingScreen()
            // already uses above for the same reason (only warn when a real
            // choice, current PDF or fields, is actually at stake).
            const hasUnsavedWork = Boolean(state.pdfDoc || (state.fields && state.fields.length > 0));
            if (!hasUnsavedWork) {
                loadTemplate(key, () => {
                    if (onLoaded) onLoaded();
                    import("./onboarding-tour.js").then(tour => tour.startOnboardingTour());
                });
                return;
            }

            import("./templates-engine.js").then(({ STARTER_TEMPLATES }) => {
                const tpl = STARTER_TEMPLATES[key];
                pendingTemplateKey = key;

                if (sampleTitle) sampleTitle.textContent = tpl ? tpl.title : "Sample Document Preview";
                if (sampleDesc) sampleDesc.textContent = tpl ? `${tpl.description} Includes ${tpl.fields.length} pre-configured interactive fields.` : "Preview this pre-built sample document before editing.";

                if (sampleModal) {
                    sampleModal.style.display = "flex";
                    if (typeof lucide !== "undefined") lucide.createIcons();
                }
            });
        });
    });

    document.getElementById("heroTryInEditorBtn")?.addEventListener("click", e => {
        e.stopPropagation();
        loadTemplate("w9", () => {
            if (onLoaded) onLoaded();
            import("./onboarding-tour.js").then(tour => tour.startOnboardingTour());
        });
    });
}

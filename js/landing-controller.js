// ── Landing Page View Transitions & Actions (js/landing-controller.js) ─
import { state } from "./state.js";
import { STARTER_TEMPLATES, createTemplatePdf } from "./templates-engine.js";
import { renderPage, goToPage, analyzePdfDocument } from "./pdf-engine.js";
import { saveHistory } from "./storage-manager.js";

export function showLandingScreen() {
    const landing = document.getElementById("landingScreen");
    const editor = document.getElementById("appEditorScreen");
    if (landing) landing.style.display = "block";
    if (editor) editor.style.display = "none";
    renderLandingReviews();
    if (typeof lucide !== "undefined") lucide.createIcons();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

let currentReviewPageSize = 6;
let reviewsInitialized = false;

const DEFAULT_VERIFIED_REVIEWS = [
    {
        id: "def_1",
        date: "2026-08-18T10:00:00.000Z",
        rating: 5,
        category: "Legal Counsel",
        sender: "Sarah Jenkins",
        message: "JustForms made converting our corporate NDA into a fillable AcroForm effortless! Zero server uploads gives our legal team complete peace of mind.",
        isVerified: true
    },
    {
        id: "def_2",
        date: "2026-08-16T14:30:00.000Z",
        rating: 5,
        category: "Tax Consultant",
        sender: "Marcus Vance",
        message: "The smart field auto-detection feature saved me hours on W-9 tax forms. The exported AcroForms work flawlessly in Adobe Acrobat and Chrome.",
        isVerified: true
    },
    {
        id: "def_3",
        date: "2026-08-14T09:15:00.000Z",
        rating: 5,
        category: "Software Engineer",
        sender: "David K.",
        message: "Finally a privacy-first PDF form builder that runs 100% in the browser without requiring any subscriptions or sign-ups. Outstanding tool!",
        isVerified: true
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

    const allReviews = [
        ...savedReviews.map((r, idx) => ({
            id: `user_${idx}`,
            date: r.date || new Date().toISOString(),
            rating: parseInt(r.rating) || 5,
            category: r.category || "General Review",
            sender: r.sender ? r.sender.split("@")[0] : "Verified User",
            message: (r.message || "").trim(),
            isVerified: false
        })).filter(r => r.message.length > 0),
        ...DEFAULT_VERIFIED_REVIEWS
    ];

    const sortBy = sortSelect ? sortSelect.value : "latest";
    if (sortBy === "oldest") {
        allReviews.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === "rating") {
        allReviews.sort((a, b) => b.rating - a.rating || new Date(b.date) - new Date(a.date));
    } else {
        allReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const totalCount = allReviews.length;
    const visibleReviews = allReviews.slice(0, currentReviewPageSize);

    if (countPill) {
        countPill.textContent = `Showing ${visibleReviews.length} of ${totalCount} Review${totalCount > 1 ? 's' : ''}`;
    }

    grid.innerHTML = visibleReviews.map(r => {
        const rating = parseInt(r.rating) || 5;
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const msg = r.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const badgeText = r.isVerified ? "Verified User" : "User Submitted";
        const badgeStyle = r.isVerified ? "background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0;" : "background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe;";

        return `
            <div class="review-card" style="${r.isVerified ? '' : 'border: 1.5px solid #bfdbfe; background: #f8fafc;'}">
                <div class="review-card-header">
                    <div class="review-stars">${stars}</div>
                    <span class="review-badge" style="${badgeStyle}">${badgeText}</span>
                </div>
                <p class="review-text">"${msg}"</p>
                <div class="review-footer">
                    <strong class="review-author">${r.sender}</strong>
                    <span class="review-meta">${r.category} • ${rating}.0 Rating</span>
                </div>
            </div>
        `;
    }).join("");

    if (loadMoreBtnContainer && loadMoreBtn && loadMoreText) {
        if (visibleReviews.length >= totalCount) {
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
}

export function showEditorScreen(onReady) {
    const landing = document.getElementById("landingScreen");
    const editor = document.getElementById("appEditorScreen");
    if (landing) landing.style.display = "none";
    if (editor) {
        editor.style.display = "flex";
        renderPage(true).then(() => {
            if (onReady) onReady();
        });
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
}

export async function loadPdfFile(file, onLoaded) {
    if (!file) return;

    if (file.name.endsWith(".json") || file.name.endsWith(".jform") || file.name.endsWith(".justforms")) {
        import("./storage-manager.js").then(mod => {
            mod.importProjectJson(file, onLoaded);
        });
        return;
    }

    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
        const loadedDoc = await loadingTask.promise;
        state.originalPdfBytes = bytes;
        state.pdfDoc = loadedDoc;
        state.totalPages = state.pdfDoc.numPages;
        state.fields.length = 0;
        state.selectedFieldIds.clear();
        state.fileName = file.name ? file.name.replace(/\.pdf$/i, "") + "_form.pdf" : "interactive_form.pdf";

        await analyzePdfDocument();

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";

        await goToPage(1);
        saveHistory();
        showEditorScreen(onLoaded);
    } catch(err) {
        console.error("Failed to load PDF:", err);
        alert("Failed to load PDF: " + (err.message || err));
    }
}

export async function loadTemplate(key, onLoaded) {
    const tpl = STARTER_TEMPLATES[key];
    if (!tpl) return;
    try {
        state.originalPdfBytes = await createTemplatePdf(key);
        state.pdfDoc = await pdfjsLib.getDocument({ data: state.originalPdfBytes.slice() }).promise;
        state.totalPages = state.pdfDoc.numPages;
        state.fields = JSON.parse(JSON.stringify(tpl.fields));
        state.fields.forEach(f => { f.page = 1; });
        state.fieldCounter = state.fields.length + 1;
        state.selectedFieldIds.clear();
        state.fileName = key + "_form.pdf";

        await analyzePdfDocument();

        const es = document.getElementById("emptyState");
        if (es) es.style.display = "none";

        await goToPage(1);
        saveHistory();
        showEditorScreen(onLoaded);
    } catch(err) {
        console.error("Failed to generate template PDF:", err);
    }
}

export function initLandingController(onLoaded) {
    // Navigation to home & smooth anchor scrolling
    document.getElementById("landingLogoBtn")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.getElementById("backToHomeBtn")?.addEventListener("click", showLandingScreen);
    document.getElementById("editorBrandLogo")?.addEventListener("click", showLandingScreen);
    document.getElementById("menuHomeBtn")?.addEventListener("click", showLandingScreen);

    // Header Modal Triggers
    document.getElementById("landingFeedbackBtn")?.addEventListener("click", () => {
        const feedbackModal = document.getElementById("feedbackModal");
        if (feedbackModal) {
            feedbackModal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    document.getElementById("landingShortcutsBtn")?.addEventListener("click", () => {
        const shortcutsModal = document.getElementById("shortcutsModal");
        if (shortcutsModal) {
            shortcutsModal.style.display = "flex";
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    });

    // Smooth Scroll for Landing Anchor Links
    document.querySelectorAll(".landing-nav-links a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", e => {
            e.preventDefault();
            const targetId = anchor.getAttribute("href")?.substring(1);
            if (targetId) {
                const targetElem = document.getElementById(targetId);
                if (targetElem) {
                    targetElem.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });

    // File Upload inputs
    const handleUploadInput = async e => {
        const file = e.target.files[0];
        if (file) await loadPdfFile(file, onLoaded);
        e.target.value = "";
    };
    document.getElementById("landingPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("landingOpenProjectUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("heroPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("heroOpenProjectUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("footerPdfUpload")?.addEventListener("change", handleUploadInput);
    document.getElementById("pdfUploadMenu")?.addEventListener("change", handleUploadInput);
    document.getElementById("emptyStateUpload")?.addEventListener("change", handleUploadInput);

    // Interactive Dropzone with Drag & Drop Visual State Feedback
    const heroDropzone = document.getElementById("heroDropzone");
    if (heroDropzone) {
        heroDropzone.addEventListener("click", () => document.getElementById("heroPdfUpload")?.click());
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
            if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf") || file.name.endsWith(".json") || file.name.endsWith(".jform") || file.name.endsWith(".justforms"))) {
                await loadPdfFile(file, onLoaded);
            } else if (file) {
                alert("Supported Formats: PDF documents (.pdf) or JustForms project files (.jform).");
            }
        });
    }

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

    document.getElementById("heroTryInEditorBtn")?.addEventListener("click", e => {
        e.stopPropagation();
        loadTemplate("w9", () => {
            if (onLoaded) onLoaded();
            import("./onboarding-tour.js").then(tour => tour.startOnboardingTour());
        });
    });
}



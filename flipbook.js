/**
 * FLIPBOOK CATALOG CONTROLLER - FORTUNE REEF ZONA
 * Realistic 3D Interactive Flipbook Engine
 */

let pageFlipInstance = null;
let allCatalogProducts = [];
let catalogCategories = [];
let categoryPageMap = {}; // Maps category name to starting page index
let totalPagesCount = 0;
let isAudioEnabled = true;
let isAutoPlaying = false;
let autoPlayInterval = null;
let isZoomed = false;

// Audio Context for Realistic Paper Flip Synthesizer
let audioCtx = null;

document.addEventListener("DOMContentLoaded", function () {
  // 1. Initialize Navbar if not already loaded
  const navContainer = document.getElementById("main-navbar");
  if (navContainer && !navContainer.children.length && typeof loadComponent === "function") {
    loadComponent("main-navbar", "navbar.html", () => {
      if (typeof initMobileMenu === "function") initMobileMenu();
      if (typeof setActiveLink === "function") setActiveLink();
    });
  }

  // 2. Fetch products and build flipbook
  initFlipbookApp();
});

async function initFlipbookApp() {
  const loader = document.getElementById("flipbook-loader");
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("Gagal mengambil data produk");
    allCatalogProducts = await res.json();

    // Group categories
    const catSet = new Set();
    allCatalogProducts.forEach((p) => {
      if (p.category) catSet.add(p.category.trim());
    });
    catalogCategories = Array.from(catSet).sort();

    // Build Category Pills in Topbar
    buildCategoryPills();

    // Render HTML Pages into DOM
    renderFlipbookPages();

    // Initialize StPageFlip
    setupPageFlipEngine();

    // Setup All Interactive Event Listeners (Controls, Audio, Search, Modals)
    setupEventListeners();

    // Hide Loader
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => (loader.style.display = "none"), 300);
    }
  } catch (err) {
    console.error("Kesalahan inisialisasi flipbook:", err);
    if (loader) {
      loader.innerHTML = `
        <div style="color: #ef4444; font-size: 1.5rem; margin-bottom: 10px;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <p>Gagal memuat katalog: ${err.message}</p>
        <button onclick="location.reload()" class="topbar-btn" style="margin-top: 15px;">
          <i class="fas fa-redo"></i> Coba Lagi
        </button>
      `;
    }
  }
}

/* ========================================================
   CATEGORY PILLS & TABLE OF CONTENTS SETUP
   ======================================================== */
function buildCategoryPills() {
  const pillsContainer = document.getElementById("category-pills");
  if (!pillsContainer) return;

  catalogCategories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "pill-btn";
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      jumpToCategory(cat);
    });
    pillsContainer.appendChild(btn);
  });

  const allBtn = pillsContainer.querySelector('[data-cat="all"]');
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      document.querySelectorAll(".pill-btn").forEach((b) => b.classList.remove("active"));
      allBtn.classList.add("active");
      if (pageFlipInstance) pageFlipInstance.turnToPage(0);
    });
  }
}

function jumpToCategory(catName) {
  if (categoryPageMap[catName] !== undefined && pageFlipInstance) {
    pageFlipInstance.turnToPage(categoryPageMap[catName]);
  }
}

/* ========================================================
   PAGE GENERATOR: BUILD RICH FLIPBOOK HTML
   ======================================================== */
function renderFlipbookPages() {
  const bookContainer = document.getElementById("flipbook");
  if (!bookContainer) return;

  let pagesHTML = "";
  let currentPageIndex = 0;

  // 1. FRONT COVER (Hard Density)
  pagesHTML += createFrontCoverHTML();
  currentPageIndex++;

  // 2. INSIDE FRONT COVER (Company Strengths & Global Brands)
  pagesHTML += createInsideCoverHTML();
  currentPageIndex++;

  // Placeholder for Table of Contents page (we know its index is 2)
  const tocPageIndex = currentPageIndex;
  pagesHTML += `<div class="catalog-page page-toc" id="page-toc-slot" data-density="soft"></div>`;
  currentPageIndex++;

  // 3. PRODUCT PAGES GROUPED BY CATEGORY
  const tocData = [];

  catalogCategories.forEach((catName, catIdx) => {
    const items = allCatalogProducts.filter((p) => p.category === catName);
    if (items.length === 0) return;

    // Record category starting page
    categoryPageMap[catName] = currentPageIndex;
    tocData.push({
      num: catIdx + 1,
      category: catName,
      count: items.length,
      pageIndex: currentPageIndex,
    });

    // A. Category Divider Page
    pagesHTML += createCategoryDividerHTML(catName, items.length, currentPageIndex);
    currentPageIndex++;

    // B. Product Pages (6 items per page)
    const ITEMS_PER_PAGE = 6;
    const pageCountForCat = Math.ceil(items.length / ITEMS_PER_PAGE);

    for (let pIdx = 0; pIdx < pageCountForCat; pIdx++) {
      const sliceStart = pIdx * ITEMS_PER_PAGE;
      const pageItems = items.slice(sliceStart, sliceStart + ITEMS_PER_PAGE);
      const isLeft = currentPageIndex % 2 === 0;

      pagesHTML += createProductPageHTML(
        pageItems,
        catName,
        currentPageIndex,
        isLeft,
        pIdx + 1,
        pageCountForCat
      );
      currentPageIndex++;
    }
  });

  // 4. INSIDE BACK COVER: HOW TO ORDER & EXPORT LOGISTICS
  pagesHTML += createHowToOrderHTML(currentPageIndex);
  currentPageIndex++;

  // 5. BACK COVER (Hard Density)
  pagesHTML += createBackCoverHTML(currentPageIndex);
  currentPageIndex++;

  // Inject into DOM
  bookContainer.innerHTML = pagesHTML;
  totalPagesCount = currentPageIndex;

  // Now populate the TOC page slot
  const tocSlot = document.getElementById("page-toc-slot");
  if (tocSlot) {
    tocSlot.innerHTML = createTOCContentHTML(tocData);
  }

  // Populate Slide-out TOC Drawer and Thumbnails Drawer
  populateTOCDrawer(tocData);
  populateThumbnailsDrawer(totalPagesCount);
}

/* ========================================================
   INDIVIDUAL PAGE TEMPLATES
   ======================================================== */
function createFrontCoverHTML() {
  return `
    <div class="catalog-page page-cover-front" data-density="hard">
      <div class="cover-header">
        <img src="image/Logo.png" alt="Fortune Reef Zona" class="cover-logo" onerror="this.style.display='none'">
        <div class="cover-brand-name">Fortune Reef Zona</div>
        <div class="cover-badge">Official Export Catalogue 2026/2027</div>
      </div>

      <div class="cover-body">
        <h2 class="cover-main-title">
          GLOBAL FMCG
          <span>DISTRIBUTION</span>
        </h2>
        <p class="cover-tagline">
          Global Goods Local Good &bull; Sustainably Delivered Your Needs.
          Mitra distribusi ekspor terpercaya untuk ratusan merek internasional.
        </p>

        <div class="cover-stats-row">
          <div class="cover-stat-box">
            <strong>800+</strong>
            <span>Produk Ekspor</span>
          </div>
          <div class="cover-stat-box">
            <strong>0 MOQ</strong>
            <span>Fleksibel</span>
          </div>
          <div class="cover-stat-box">
            <strong>Global</strong>
            <span>Worldwide Delivery</span>
          </div>
        </div>
      </div>

      <div class="cover-footer">
        <span>Citra Grand Cibubur CBD, Indonesia</span>
        <a href="https://www.fortunereefzona.com" target="_blank">fortunereefzona.com</a>
      </div>
    </div>
  `;
}

function createInsideCoverHTML() {
  return `
    <div class="catalog-page page-inside-cover" data-density="soft">
      <div class="inside-header">
        <h2>Tentang Fortune Reef Zona</h2>
        <p>Your Trusted Global FMCG Export Partner</p>
      </div>

      <div class="inside-welcome">
        <p>
          Selamat datang di Katalog Ekspor Resmi <strong>Fortune Reef Zona</strong>. Kami berdedikasi menyediakan rantai pasok FMCG (Fast-Moving Consumer Goods) berskala internasional dengan integritas, transparansi harga grosir termurah, dan komitmen keberlanjutan lingkungan.
        </p>
      </div>

      <div class="inside-strengths-grid">
        <div class="strength-item-mini">
          <i class="fas fa-shipping-fast"></i>
          <h4>Instant Delivery</h4>
          <p>Pengiriman sigap dan efisien untuk pemenuhan kebutuhan bisnis tepat waktu.</p>
        </div>
        <div class="strength-item-mini">
          <i class="fas fa-box-open"></i>
          <h4>No Minimum Order</h4>
          <p>Tanpa batas minimum kuantitas untuk mendukung seluruh skala usaha Anda.</p>
        </div>
        <div class="strength-item-mini">
          <i class="fas fa-tags"></i>
          <h4>Lowest Price</h4>
          <p>Struktur harga grosir pabrik yang paling kompetitif untuk menjaga margin keuntungan Anda.</p>
        </div>
        <div class="strength-item-mini">
          <i class="fas fa-leaf"></i>
          <h4>Eco-Conscious</h4>
          <p>Standar distribusi ramah lingkungan untuk melindungi kelestarian bumi.</p>
        </div>
      </div>

      <div class="inside-brands">
        <h4>Merek Global Unggulan</h4>
        <div class="brands-grid-mini">
          <span class="brand-chip">Unilever</span>
          <span class="brand-chip">P&G</span>
          <span class="brand-chip">Wings</span>
          <span class="brand-chip">Nestle</span>
          <span class="brand-chip">Indofood</span>
          <span class="brand-chip">Mayora</span>
          <span class="brand-chip">Otsuka</span>
          <span class="brand-chip">Colgate</span>
          <span class="brand-chip">Johnson & Johnson</span>
          <span class="brand-chip">Garuda Food</span>
        </div>
      </div>

      <div class="page-footer">
        <span class="page-hotline"><i class="fab fa-whatsapp"></i> +62 812-3456-7890</span>
        <span class="page-number">Hal. 1</span>
      </div>
    </div>
  `;
}

function createTOCContentHTML(tocData) {
  let listItems = "";
  tocData.forEach((item) => {
    listItems += `
      <div class="toc-entry-item" onclick="pageFlipInstance && pageFlipInstance.turnToPage(${item.pageIndex})">
        <span class="toc-entry-num">${item.num < 10 ? "0" + item.num : item.num}</span>
        <span class="toc-entry-name">${item.category}</span>
        <span class="toc-entry-count">(${item.count} items)</span>
        <div class="toc-dots"></div>
        <span class="toc-entry-page">Hal. ${item.pageIndex + 1}</span>
      </div>
    `;
  });

  return `
    <div class="toc-page-header">
      <h2>Daftar Isi Katalog</h2>
      <p>Pilih kategori untuk langsung menuju ke halaman produk</p>
    </div>
    <div class="toc-entries">
      ${listItems}
    </div>
    <div class="page-footer">
      <span class="page-hotline">Klik kategori untuk membuka</span>
      <span class="page-number">Hal. 2</span>
    </div>
  `;
}

function createCategoryDividerHTML(catName, totalCount, pageIndex) {
  const iconMap = {
    "Baby Care": "fa-baby",
    "Personal Care": "fa-pump-soap",
    "Beverages": "fa-wine-bottle",
    "Cooking & Food": "fa-utensils",
    "Household Care": "fa-spray-can-sparkles",
    "Health Care": "fa-heart-pulse",
    "Snacks": "fa-cookie-bite",
  };
  const iconClass = iconMap[catName] || "fa-boxes-stacked";

  return `
    <div class="catalog-page page-category-divider" data-density="soft">
      <div class="divider-icon">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="divider-badge">Kategori Ekspor</div>
      <h2 class="divider-category-title">${catName}</h2>
      <p class="divider-desc">
        Koleksi lengkap ${totalCount} produk pilihan dengan standar kualitas internasional dan jaminan harga grosir terbaik.
      </p>
      <div class="page-footer" style="position: absolute; bottom: 0; left: 0; right: 0; border-color: rgba(255,255,255,0.15); color: #94a3b8;">
        <span class="header-company" style="color: #38bdf8;">Fortune Reef Zona</span>
        <span class="page-number" style="color: #fff;">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createProductPageHTML(items, catName, pageIndex, isLeft, subPageNum, totalSubPages) {
  let cardsHTML = "";
  items.forEach((p) => {
    const isBest = p.isBestSeller ? `<span class="bestseller-tag">Best Seller</span>` : "";
    const starsHTML = generateStars(p.rating || 4.7);
    const escapedName = (p.name || "").replace(/"/g, "&quot;");

    cardsHTML += `
      <div class="catalog-product-card" data-id="${p.id}" onclick="openProductModal(${p.id})">
        <div class="product-img-wrapper">
          ${isBest}
          <img src="${p.image}" alt="${escapedName}" loading="lazy" onerror="this.src='https://placehold.co/200x200?text=Produk'">
        </div>
        <div class="product-meta">
          <div class="product-title" title="${escapedName}">${p.name}</div>
          <div class="product-bottom-row">
            <div class="product-stars">
              ${starsHTML}
              <span class="rating-num">${p.rating || 4.7}</span>
            </div>
            <button class="btn-card-inquire" onclick="event.stopPropagation(); openProductModal(${p.id})">
              Detail
            </button>
          </div>
        </div>
      </div>
    `;
  });

  const sideClass = isLeft ? "page-left" : "page-right";

  return `
    <div class="catalog-page ${sideClass}" data-density="soft">
      <div class="page-header">
        <span class="header-company"><i class="fas fa-box"></i> Fortune Reef Zona</span>
        <span class="header-category">${catName} (${subPageNum}/${totalSubPages})</span>
      </div>

      <div class="page-content-grid">
        ${cardsHTML}
      </div>

      <div class="page-footer">
        <span class="page-hotline"><i class="fab fa-whatsapp"></i> Hubungi untuk Harga Grosir</span>
        <span class="page-number">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createHowToOrderHTML(pageIndex) {
  return `
    <div class="catalog-page page-how-to-order" data-density="soft">
      <div class="inside-header">
        <h2>Prosedur Pemesanan &amp; Ekspor</h2>
        <p>Langkah Mudah Memulai Kemitraan Bersama Kami</p>
      </div>

      <div class="order-steps-list">
        <div class="order-step-item">
          <div class="step-num">1</div>
          <div class="step-text">
            <h4>Pilih Produk &amp; Buat Inquiry</h4>
            <p>Tentukan daftar produk yang ingin Anda pesan, lalu klik tombol inquiry atau hubungi WhatsApp/Email tim sales kami.</p>
          </div>
        </div>

        <div class="order-step-item">
          <div class="step-num">2</div>
          <div class="step-text">
            <h4>Dapatkan Penawaran Harga (Quotation)</h4>
            <p>Kami menerbitkan penawaran harga grosir terbaik mencakup rincian kuantitas, estimasi berat, dan lead time pengiriman.</p>
          </div>
        </div>

        <div class="order-step-item">
          <div class="step-num">3</div>
          <div class="step-text">
            <h4>Konfirmasi &amp; Pengemasan Ekspor</h4>
            <p>Pesanan Anda diproses dengan standar proteksi kemasan ekspor internasional (palletized / shrink-wrapped) bebas biaya tambahan.</p>
          </div>
        </div>

        <div class="order-step-item">
          <div class="step-num">4</div>
          <div class="step-text">
            <h4>Pengiriman Cepat &amp; Dokumen Legal</h4>
            <p>Dukungan penuh dokumen ekspor (COO, Invoice, Packing List, Bill of Lading) dengan opsi FCL atau LCL ke pelabuhan tujuan.</p>
          </div>
        </div>
      </div>

      <div style="background: #e0f2fe; border-left: 4px solid #008cff; padding: 10px 14px; border-radius: 4px;">
        <strong style="color: #004a99; font-size: 0.8rem;">Jaminan Fortune Reef Zona:</strong>
        <p style="font-size: 0.72rem; color: #334155; margin: 2px 0 0 0;">
          Semua produk kami 100% original, masa kedaluwarsa panjang (fresh batch), dan didukung pelacakan pengiriman transparan.
        </p>
      </div>

      <div class="page-footer">
        <span class="page-hotline">B2B Wholesale &amp; Global Export</span>
        <span class="page-number">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createBackCoverHTML(pageIndex) {
  return `
    <div class="catalog-page page-cover-back" data-density="hard">
      <div style="z-index: 2; margin-top: 20px;">
        <img src="image/Logo.png" alt="Fortune Reef Zona" class="back-cover-logo" onerror="this.style.display='none'">
        <h3 style="font-size: 1.25rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
          Fortune Reef Zona
        </h3>
        <p style="color: #38bdf8; font-size: 0.82rem; margin-top: 4px;">
          Global FMCG Distribution with a Sustainability Focus
        </p>
      </div>

      <div class="back-contact-info" style="z-index: 2;">
        <p><strong>Kantor Pusat:</strong><br>
        Citra Grand Cibubur CBD Ruko Marquette AR1 No. 27,<br>
        Jatirangga, Jatisampurna, Kota Bekasi, Jawa Barat 17434</p>

        <p style="margin-top: 12px;">
          <strong>Email:</strong> fortunereefzona@gmail.com<br>
          <strong>WhatsApp:</strong> +62 812-3456-7890<br>
          <strong>Website:</strong> www.fortunereefzona.com
        </p>

        <div class="back-socials">
          <a href="https://instagram.com" target="_blank" class="back-social-link"><i class="fab fa-instagram"></i></a>
          <a href="https://linkedin.com" target="_blank" class="back-social-link"><i class="fab fa-linkedin-in"></i></a>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=fortunereefzona@gmail.com" target="_blank" class="back-social-link"><i class="fas fa-envelope"></i></a>
          <a href="https://wa.me/6281234567890" target="_blank" class="back-social-link"><i class="fab fa-whatsapp"></i></a>
        </div>
      </div>

      <div style="z-index: 2; font-size: 0.72rem; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); width: 100%; padding-top: 12px;">
        &copy; 2026 Fortune Reef Zona. All Rights Reserved.
      </div>
    </div>
  `;
}

function generateStars(rating) {
  const full = Math.floor(rating);
  let html = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      html += '<i class="fas fa-star"></i>';
    } else {
      html += '<i class="far fa-star"></i>';
    }
  }
  return html;
}

/* ========================================================
   STPAGEFLIP ENGINE INITIALIZATION
   ======================================================== */
function setupPageFlipEngine() {
  const flipContainer = document.getElementById("flipbook");
  if (!flipContainer) return;

  // Responsive dimensions calculation
  const isMobile = window.innerWidth <= 768;
  const stageWidth = window.innerWidth;
  const stageHeight = window.innerHeight - 150; // topbar and dock offset

  let pageWidth, pageHeight;

  if (isMobile) {
    // Single page mode on mobile
    pageWidth = Math.min(stageWidth * 0.9, 440);
    pageHeight = Math.min(stageHeight * 0.85, 620);
  } else {
    // Two-page spread on desktop/tablet
    const spreadWidth = Math.min(stageWidth * 0.82, 1100);
    pageWidth = Math.floor(spreadWidth / 2);
    pageHeight = Math.min(stageHeight * 0.88, 700);
  }

  // Instantiate St.PageFlip
  pageFlipInstance = new St.PageFlip(flipContainer, {
    width: pageWidth,
    height: pageHeight,
    size: "stretch",
    minWidth: 280,
    maxWidth: 700,
    minHeight: 400,
    maxHeight: 900,
    maxShadowOpacity: 0.45,
    showCover: true,
    mobileScrollSupport: false,
    usePortrait: true,
    startPage: 0,
    flippingTime: 650,
  });

  // Load from rendered HTML elements
  const allPages = flipContainer.querySelectorAll(".catalog-page");
  pageFlipInstance.loadFromHTML(allPages);

  // Sync state & UI
  updateDockPageCounter(0);

  // Page Flip Event
  pageFlipInstance.on("flip", (e) => {
    const curIdx = e.data;
    updateDockPageCounter(curIdx);
    playPaperFlipSound();
    highlightCurrentCategoryPill(curIdx);
    updateThumbnailsActive(curIdx);

    // Update floating stage nav buttons
    const prevBtn = document.getElementById("stage-prev-btn");
    const nextBtn = document.getElementById("stage-next-btn");
    if (prevBtn) prevBtn.disabled = curIdx === 0;
    if (nextBtn) nextBtn.disabled = curIdx >= totalPagesCount - 1;
  });

  // Window Resize adaptation
  window.addEventListener("resize", () => {
    if (pageFlipInstance) {
      pageFlipInstance.update();
    }
  });
}

function updateDockPageCounter(pageIdx) {
  const input = document.getElementById("page-jump-input");
  const totalLabel = document.getElementById("total-pages-label");
  const scrubber = document.getElementById("page-scrubber");

  if (input) {
    input.value = pageIdx + 1;
    input.max = totalPagesCount;
  }
  if (totalLabel) {
    totalLabel.textContent = totalPagesCount;
  }
  if (scrubber) {
    scrubber.max = totalPagesCount - 1;
    scrubber.value = pageIdx;
  }
}

function highlightCurrentCategoryPill(pageIdx) {
  // Find which category corresponds to this page
  let activeCat = "all";
  for (let i = catalogCategories.length - 1; i >= 0; i--) {
    const cat = catalogCategories[i];
    if (pageIdx >= categoryPageMap[cat]) {
      activeCat = cat;
      break;
    }
  }

  document.querySelectorAll(".pill-btn").forEach((btn) => {
    if (btn.dataset.cat === activeCat) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/* ========================================================
   EVENT LISTENERS: DOCK, KEYBOARD, SEARCH & TOOLS
   ======================================================== */
function setupEventListeners() {
  // 1. Stage Nav Buttons
  const stagePrev = document.getElementById("stage-prev-btn");
  const stageNext = document.getElementById("stage-next-btn");

  if (stagePrev) {
    stagePrev.addEventListener("click", () => {
      if (pageFlipInstance) pageFlipInstance.flipPrev();
    });
  }
  if (stageNext) {
    stageNext.addEventListener("click", () => {
      if (pageFlipInstance) pageFlipInstance.flipNext();
    });
  }

  // 2. Dock Navigation
  const btnFirst = document.getElementById("btn-first-page");
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");
  const btnLast = document.getElementById("btn-last-page");

  if (btnFirst) btnFirst.onclick = () => pageFlipInstance && pageFlipInstance.turnToPage(0);
  if (btnPrev) btnPrev.onclick = () => pageFlipInstance && pageFlipInstance.flipPrev();
  if (btnNext) btnNext.onclick = () => pageFlipInstance && pageFlipInstance.flipNext();
  if (btnLast) {
    btnLast.onclick = () => pageFlipInstance && pageFlipInstance.turnToPage(totalPagesCount - 1);
  }

  // 3. Jump Input & Scrubber
  const pageInput = document.getElementById("page-jump-input");
  if (pageInput) {
    pageInput.addEventListener("change", function () {
      let val = parseInt(this.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > totalPagesCount) val = totalPagesCount;
      if (pageFlipInstance) pageFlipInstance.turnToPage(val - 1);
    });
    pageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") this.blur();
    });
  }

  const scrubber = document.getElementById("page-scrubber");
  if (scrubber) {
    scrubber.addEventListener("input", function () {
      const targetPage = parseInt(this.value, 10);
      if (pageFlipInstance) pageFlipInstance.turnToPage(targetPage);
    });
  }

  // 4. Keyboard Navigation (Arrows & Shortcuts)
  window.addEventListener("keydown", (e) => {
    // If typing in search or jump input, don't trigger flip shortcuts
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

    if (e.key === "ArrowLeft") {
      if (pageFlipInstance) pageFlipInstance.flipPrev();
    } else if (e.key === "ArrowRight") {
      if (pageFlipInstance) pageFlipInstance.flipNext();
    } else if (e.key === "f" || e.key === "F") {
      toggleFullscreen();
    } else if (e.key === "z" || e.key === "Z") {
      toggleZoom();
    } else if (e.key === "Escape") {
      closeProductModal();
      closeTOCDrawer();
      closeThumbnailsDrawer();
      if (isZoomed) toggleZoom();
    }
  });

  // 5. Sound FX Toggle
  const btnSound = document.getElementById("btn-sound");
  if (btnSound) {
    btnSound.addEventListener("click", function () {
      isAudioEnabled = !isAudioEnabled;
      this.classList.toggle("active", isAudioEnabled);
      this.innerHTML = isAudioEnabled
        ? '<i class="fas fa-volume-up"></i>'
        : '<i class="fas fa-volume-mute"></i>';
    });
  }

  // 6. Autoplay Toggle
  const btnAutoPlay = document.getElementById("btn-autoplay");
  if (btnAutoPlay) {
    btnAutoPlay.addEventListener("click", function () {
      isAutoPlaying = !isAutoPlaying;
      this.classList.toggle("active", isAutoPlaying);
      if (isAutoPlaying) {
        this.innerHTML = '<i class="fas fa-pause"></i>';
        autoPlayInterval = setInterval(() => {
          if (!pageFlipInstance) return;
          const cur = pageFlipInstance.getCurrentPageIndex();
          if (cur >= totalPagesCount - 1) {
            pageFlipInstance.turnToPage(0);
          } else {
            pageFlipInstance.flipNext();
          }
        }, 4000);
      } else {
        this.innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(autoPlayInterval);
      }
    });
  }

  // 7. Zoom Mode
  const btnZoom = document.getElementById("btn-zoom");
  if (btnZoom) {
    btnZoom.addEventListener("click", toggleZoom);
  }

  // 8. Fullscreen Toggle
  const btnFullscreen = document.getElementById("btn-fullscreen");
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", toggleFullscreen);
  }

  // 9. Table of Contents Slide-out Drawer
  const tocBtn = document.getElementById("toc-toggle-btn");
  const tocClose = document.getElementById("toc-close-btn");
  const overlay = document.getElementById("drawer-overlay");

  if (tocBtn) tocBtn.onclick = openTOCDrawer;
  if (tocClose) tocClose.onclick = closeTOCDrawer;
  if (overlay) overlay.onclick = () => {
    closeTOCDrawer();
    closeThumbnailsDrawer();
  };

  // 10. Thumbnails Drawer Toggle
  const btnThumbs = document.getElementById("btn-thumbnails");
  const thumbsClose = document.getElementById("thumbnails-close-btn");
  if (btnThumbs) {
    btnThumbs.addEventListener("click", toggleThumbnailsDrawer);
  }
  if (thumbsClose) {
    thumbsClose.onclick = closeThumbnailsDrawer;
  }

  // 11. Search in Catalog
  const searchInput = document.getElementById("flipbook-search-input");
  const searchClear = document.getElementById("search-clear-btn");
  const searchCounter = document.getElementById("search-results-counter");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (searchClear) searchClear.classList.toggle("active", q.length > 0);

      // Remove existing highlights
      document.querySelectorAll(".catalog-product-card.search-match").forEach((c) => {
        c.classList.remove("search-match");
      });

      if (!q) {
        if (searchCounter) searchCounter.classList.remove("active");
        return;
      }

      // Find products matching query
      const matches = allCatalogProducts.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );

      if (searchCounter) {
        searchCounter.textContent = `${matches.length} produk ditemukan`;
        searchCounter.classList.add("active");
      }

      if (matches.length > 0) {
        const firstMatchId = matches[0].id;
        // Find DOM card
        const cardElem = document.querySelector(`.catalog-product-card[data-id="${firstMatchId}"]`);
        if (cardElem) {
          const pageElem = cardElem.closest(".catalog-page");
          if (pageElem) {
            // Find page index
            const allPages = Array.from(document.querySelectorAll("#flipbook .catalog-page"));
            const targetPageIndex = allPages.indexOf(pageElem);
            if (targetPageIndex !== -1 && pageFlipInstance) {
              pageFlipInstance.turnToPage(targetPageIndex);
            }
          }
        }

        // Highlight matching cards
        matches.forEach((m) => {
          const mCard = document.querySelector(`.catalog-product-card[data-id="${m.id}"]`);
          if (mCard) mCard.classList.add("search-match");
        });
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input"));
      }
    });
  }

  // 12. Print Catalog Trigger
  const btnPrint = document.getElementById("btn-print-catalog");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      // Direct user to products print or trigger print
      if (confirm("Apakah Anda ingin mencetak katalog ini atau dialihkan ke halaman cetak khusus?")) {
        window.location.href = "products.html?action=print";
      }
    });
  }
}

/* ========================================================
   REALISTIC PAPER FLIP SOUND SYNTHESIZER (WEB AUDIO API)
   Zero external audio assets, works completely offline!
   ======================================================== */
function playPaperFlipSound() {
  if (!isAudioEnabled) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const duration = 0.18; // 180ms paper whoosh
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Exponential decay noise to simulate paper rustle
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.35));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Bandpass filter to isolate paper frequency (swish sound)
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + duration);
    filter.Q.value = 1.8;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.28, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start();
  } catch (e) {
    // AudioContext blocked or unsupported, silently fail
  }
}

/* ========================================================
   ZOOM & FULLSCREEN CONTROLS
   ======================================================== */
function toggleZoom() {
  const wrapper = document.getElementById("book-container-wrapper");
  const zoomBtn = document.getElementById("btn-zoom");
  if (!wrapper) return;

  isZoomed = !isZoomed;
  wrapper.classList.toggle("zoomed", isZoomed);
  if (zoomBtn) {
    zoomBtn.classList.toggle("active", isZoomed);
    zoomBtn.innerHTML = isZoomed
      ? '<i class="fas fa-search-minus"></i>'
      : '<i class="fas fa-search-plus"></i>';
  }
}

function toggleFullscreen() {
  const app = document.getElementById("flipbook-app");
  const fsBtn = document.getElementById("btn-fullscreen");
  if (!app) return;

  if (!document.fullscreenElement) {
    if (app.requestFullscreen) {
      app.requestFullscreen();
    } else if (app.webkitRequestFullscreen) {
      app.webkitRequestFullscreen();
    }
    if (fsBtn) {
      fsBtn.classList.add("active");
      fsBtn.innerHTML = '<i class="fas fa-compress"></i>';
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    if (fsBtn) {
      fsBtn.classList.remove("active");
      fsBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  }
}

/* ========================================================
   DRAWER CONTROLLERS: TOC & THUMBNAILS
   ======================================================== */
function openTOCDrawer() {
  const drawer = document.getElementById("toc-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("active");
}

function closeTOCDrawer() {
  const drawer = document.getElementById("toc-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
}

function populateTOCDrawer(tocData) {
  const listElem = document.getElementById("toc-list");
  if (!listElem) return;

  let html = `
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(0); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-book"></i> Halaman Sampul Depan</span>
      <span class="toc-badge-page">Hal. 1</span>
    </li>
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(1); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-building"></i> Profil &amp; Keunggulan FRZ</span>
      <span class="toc-badge-page">Hal. 2</span>
    </li>
  `;

  tocData.forEach((item) => {
    html += `
      <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(${item.pageIndex}); closeTOCDrawer();">
        <div>
          <span class="toc-cat-name">${item.category}</span>
          <span class="toc-cat-count">(${item.count} produk)</span>
        </div>
        <span class="toc-badge-page">Hal. ${item.pageIndex + 1}</span>
      </li>
    `;
  });

  html += `
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(${totalPagesCount - 2}); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-truck-fast"></i> Prosedur Ekspor &amp; Pemesanan</span>
      <span class="toc-badge-page">Hal. ${totalPagesCount - 1}</span>
    </li>
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(${totalPagesCount - 1}); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-address-book"></i> Kontak &amp; Sampul Belakang</span>
      <span class="toc-badge-page">Hal. ${totalPagesCount}</span>
    </li>
  `;

  listElem.innerHTML = html;
}

function toggleThumbnailsDrawer() {
  const drawer = document.getElementById("thumbnails-drawer");
  const btn = document.getElementById("btn-thumbnails");
  if (!drawer) return;

  const isOpen = drawer.classList.toggle("open");
  if (btn) btn.classList.toggle("active", isOpen);

  if (isOpen && pageFlipInstance) {
    updateThumbnailsActive(pageFlipInstance.getCurrentPageIndex());
  }
}

function closeThumbnailsDrawer() {
  const drawer = document.getElementById("thumbnails-drawer");
  const btn = document.getElementById("btn-thumbnails");
  if (drawer) drawer.classList.remove("open");
  if (btn) btn.classList.remove("active");
}

function populateThumbnailsDrawer(total) {
  const container = document.getElementById("thumbnails-scroll");
  if (!container) return;

  let html = "";
  for (let i = 0; i < total; i++) {
    let title = `Hal. ${i + 1}`;
    if (i === 0) title = "Cover Depan";
    else if (i === 1) title = "Profil Perusahaan";
    else if (i === 2) title = "Daftar Isi";
    else if (i === total - 2) title = "Cara Order";
    else if (i === total - 1) title = "Cover Belakang";

    html += `
      <div class="thumbnail-item ${i === 0 ? "active" : ""}" data-page="${i}" onclick="jumpToPageThumb(${i})">
        <i class="fas fa-file-lines" style="color: #94a3b8; font-size: 1.6rem; margin-bottom: 6px;"></i>
        <span class="thumb-title">${title}</span>
        <span class="thumb-num">${i + 1}</span>
      </div>
    `;
  }
  container.innerHTML = html;
}

function jumpToPageThumb(pageIdx) {
  if (pageFlipInstance) {
    pageFlipInstance.turnToPage(pageIdx);
  }
  updateThumbnailsActive(pageIdx);
}

function updateThumbnailsActive(pageIdx) {
  document.querySelectorAll(".thumbnail-item").forEach((item) => {
    const p = parseInt(item.dataset.page, 10);
    item.classList.toggle("active", p === pageIdx);
  });
  // Auto scroll active thumbnail into view
  const activeThumb = document.querySelector(`.thumbnail-item[data-page="${pageIdx}"]`);
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

/* ========================================================
   PRODUCT MODAL (QUICK VIEW & ORDER INQUIRY)
   ======================================================== */
function openProductModal(productId) {
  const product = allCatalogProducts.find((p) => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("product-detail-modal");
  const content = document.getElementById("product-modal-content");
  if (!modal || !content) return;

  const starsHTML = generateStars(product.rating || 4.7);
  const waMsg = encodeURIComponent(
    `Halo Fortune Reef Zona, saya melihat produk "${product.name}" di Katalog Flipbook digital Anda. Bisakah saya meminta info harga grosir dan ketersediaan stok untuk ekspor?`
  );
  const emailSubject = encodeURIComponent(`Inquiry Produk Ekspor: ${product.name}`);
  const emailBody = encodeURIComponent(
    `Halo Tim Fortune Reef Zona,\n\nSaya tertarik dengan produk "${product.name}" yang tertera pada Katalog Flipbook Resmi.\nTolong berikan penawaran harga grosir (FOB/CIF) serta ketentuan minimum kuantitas pengiriman.\n\nTerima kasih.`
  );

  content.innerHTML = `
    <div class="modal-img-col">
      <img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x400?text=Produk'">
    </div>
    <div class="modal-info-col">
      <span class="modal-badge-cat"><i class="fas fa-tag"></i> ${product.category}</span>
      <h3 class="modal-product-title">${product.name}</h3>
      <div class="modal-rating-row">
        <span class="stars">${starsHTML}</span>
        <span style="font-weight: 600; color: #475569;">${product.rating || 4.7} / 5.0</span>
        <span style="color: #94a3b8;">(${product.reviewCount || 100}+ ulasan)</span>
      </div>
      <div class="modal-desc-text">
        Produk <strong>${product.name}</strong> siap untuk didistribusikan secara global dengan jaminan keaslian merek dan kesegaran batch pabrik. Dapatkan harga kontainer atau LCL paling kompetitif melalui jalur ekspor resmi kami.
      </div>
      <div class="modal-action-buttons">
        <a href="https://wa.me/6281234567890?text=${waMsg}" target="_blank" class="btn-modal-wa">
          <i class="fab fa-whatsapp"></i> Hubungi WhatsApp untuk Harga Grosir
        </a>
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=fortunereefzona@gmail.com&su=${emailSubject}&body=${emailBody}" target="_blank" class="btn-modal-email">
          <i class="fas fa-envelope"></i> Kirim Permintaan Penawaran (Email)
        </a>
      </div>
    </div>
  `;

  modal.classList.add("active");

  const closeBtn = document.getElementById("modal-close-btn");
  if (closeBtn) closeBtn.onclick = closeProductModal;

  modal.onclick = (e) => {
    if (e.target === modal) closeProductModal();
  };
}

function closeProductModal() {
  const modal = document.getElementById("product-detail-modal");
  if (modal) modal.classList.remove("active");
}

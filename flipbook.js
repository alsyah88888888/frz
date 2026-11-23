/**
 * PROFESSIONAL DIGITAL FLIPBOOK CONTROLLER - FORTUNE REEF ZONA
 * Human-Centered Magazine Engine & 2-Page Spread
 */

let pageFlipInstance = null;
let allCatalogProducts = [];
let catalogCategories = [];
let categoryPageMap = {}; // Category -> starting page index
let totalPagesCount = 0;
let isAudioEnabled = true;
let isAutoPlaying = false;
let autoPlayInterval = null;
let isZoomed = false;
let audioCtx = null;

document.addEventListener("DOMContentLoaded", function () {
  // Theme check
  const savedTheme = localStorage.getItem("frz-flipbook-theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("theme-light");
  }

  // Load components if needed
  if (typeof loadComponent === "function") {
    const navEl = document.getElementById("main-navbar");
    if (navEl && !navEl.children.length) {
      loadComponent("main-navbar", "navbar.html", () => {
        if (typeof initMobileMenu === "function") initMobileMenu();
        if (typeof setActiveLink === "function") setActiveLink();
      });
    }
  }

  // Start app
  initFlipbookApp();
});

async function initFlipbookApp() {
  const loader = document.getElementById("flipbook-loader");
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("Gagal mengambil data produk");
    allCatalogProducts = await res.json();

    // Unique Categories
    const catMap = new Map();
    allCatalogProducts.forEach((p) => {
      const cat = (p.category || "Lainnya").trim();
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    catalogCategories = Array.from(catMap.keys()).sort();

    // Setup Category Selector
    setupCategoryDropdown(catMap);

    // Render HTML Pages
    renderFlipbookPages(catMap);

    // Initialize PageFlip with explicit dimensions
    setupPageFlipEngine();

    // Attach Event Listeners
    setupAllEventListeners();

    // Hide loader
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => (loader.style.display = "none"), 300);
    }
  } catch (err) {
    console.error("Kesalahan inisialisasi flipbook:", err);
    if (loader) {
      loader.innerHTML = `
        <div style="color: #ef4444; font-size: 2rem; margin-bottom: 12px;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 style="margin: 0; color: #fff;">Gagal Memuat Katalog</h3>
        <p style="color: #94a3b8; font-size: 0.85rem; margin: 8px 0 16px 0;">${err.message}</p>
        <button onclick="location.reload()" class="btn-back-grid">
          <i class="fas fa-redo"></i> Coba Muat Ulang
        </button>
      `;
    }
  }
}

/* ========================================================
   TOPBAR CATEGORY SELECTOR DROPDOWN
   ======================================================== */
function setupCategoryDropdown(catMap) {
  const dropdownBtn = document.getElementById("category-dropdown-btn");
  const dropdownMenu = document.getElementById("category-dropdown-menu");
  const currentLabel = document.getElementById("current-category-label");
  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle Dropdown
  dropdownBtn.onclick = (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("open");
  };

  // Close dropdown on outside click
  document.addEventListener("click", () => {
    dropdownMenu.classList.remove("open");
  });

  // Populate options
  let html = `
    <div class="cat-item-option active" data-cat="all">
      <span>Semua Kategori (Katalog Lengkap)</span>
      <span class="cat-badge-count">${allCatalogProducts.length}</span>
    </div>
  `;

  catalogCategories.forEach((cat) => {
    const count = catMap.get(cat) || 0;
    html += `
      <div class="cat-item-option" data-cat="${cat}">
        <span>${cat}</span>
        <span class="cat-badge-count">${count}</span>
      </div>
    `;
  });

  dropdownMenu.innerHTML = html;

  dropdownMenu.querySelectorAll(".cat-item-option").forEach((opt) => {
    opt.onclick = () => {
      const cat = opt.dataset.cat;
      dropdownMenu.querySelectorAll(".cat-item-option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");

      if (currentLabel) {
        currentLabel.textContent = cat === "all" ? "Semua Kategori (Katalog Lengkap)" : cat;
      }
      dropdownMenu.classList.remove("open");

      if (cat === "all") {
        if (pageFlipInstance) pageFlipInstance.turnToPage(0);
      } else if (categoryPageMap[cat] !== undefined) {
        if (pageFlipInstance) pageFlipInstance.turnToPage(categoryPageMap[cat]);
      }
    };
  });
}

/* ========================================================
   PAGE GENERATOR: 4 PRODUCTS PER PAGE (EDITORIAL MAGAZINE)
   ======================================================== */
function renderFlipbookPages(catMap) {
  const bookContainer = document.getElementById("flipbook");
  if (!bookContainer) return;

  let pagesHTML = "";
  let currentPageIndex = 0;

  // 1. FRONT COVER (Hard Cover)
  pagesHTML += createFrontCoverHTML();
  currentPageIndex++;

  // 2. INSIDE FRONT COVER: Company Overview & Global Lineup
  pagesHTML += createInsideCoverHTML(currentPageIndex);
  currentPageIndex++;

  // 3. TABLE OF CONTENTS (Editorial 1-Page Layout)
  const tocPageIndex = currentPageIndex;
  pagesHTML += `<div class="catalog-page page-toc-editorial" id="page-toc-slot" data-density="soft"></div>`;
  currentPageIndex++;

  // 4. CATEGORY DIVIDERS & PRODUCT PAGES (4 items per page for generous readability)
  const tocData = [];
  const ITEMS_PER_PAGE = 4;

  catalogCategories.forEach((catName, catIdx) => {
    const items = allCatalogProducts.filter((p) => (p.category || "Lainnya").trim() === catName);
    if (items.length === 0) return;

    // Record category starting page index
    categoryPageMap[catName] = currentPageIndex;
    tocData.push({
      num: catIdx + 1,
      category: catName,
      count: items.length,
      pageIndex: currentPageIndex,
    });

    // A. Section Divider Page
    pagesHTML += createCategoryDividerHTML(catName, items.length, currentPageIndex);
    currentPageIndex++;

    // B. Product Pages (4 items per page)
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

  // 5. INSIDE BACK COVER: HOW TO ORDER & EXPORT LOGISTICS
  pagesHTML += createHowToOrderHTML(currentPageIndex);
  currentPageIndex++;

  // 6. BACK COVER (Hard Cover)
  pagesHTML += createBackCoverHTML(currentPageIndex);
  currentPageIndex++;

  // Inject into book container
  bookContainer.innerHTML = pagesHTML;
  totalPagesCount = currentPageIndex;

  // Populate Table of Contents in Page 3 Slot
  const tocSlot = document.getElementById("page-toc-slot");
  if (tocSlot) {
    tocSlot.innerHTML = createTOCContentHTML(tocData, tocPageIndex);
  }

  // Populate Drawers
  populateTOCDrawer(tocData);
  populateThumbnailsDrawer(totalPagesCount);
}

/* ========================================================
   INDIVIDUAL PAGE TEMPLATES
   ======================================================== */
function createFrontCoverHTML() {
  return `
    <div class="catalog-page page-cover-front" data-density="hard">
      <div class="cover-header-brand">
        <img src="image/Logo.png" alt="Fortune Reef Zona" onerror="this.style.display='none'">
        <div class="cover-brand-title">Fortune Reef Zona</div>
        <div class="cover-edition-tag">Official Export Catalogue &bull; 2026/2027</div>
      </div>

      <div class="cover-center-editorial">
        <h2 class="cover-title-main">
          GLOBAL FMCG
          <span>DISTRIBUTION</span>
        </h2>
        <p class="cover-subtitle">
          Global Goods Local Good &bull; Sustainably Delivered Your Needs.<br>
          Katalog lengkap grosir komoditas barang konsumsi berkualitas tinggi untuk kebutuhan ekspor mancanegara.
        </p>

        <div class="cover-metrics-bar">
          <div class="metric-cell">
            <strong>818+</strong>
            <span>Produk Ekspor</span>
          </div>
          <div class="metric-cell">
            <strong>0 MOQ</strong>
            <span>Fleksibel</span>
          </div>
          <div class="metric-cell">
            <strong>Global</strong>
            <span>Worldwide Delivery</span>
          </div>
        </div>
      </div>

      <div class="cover-bottom-bar">
        <span>Citra Grand Cibubur CBD, Indonesia</span>
        <span style="color: #38bdf8;">www.fortunereefzona.com</span>
      </div>
    </div>
  `;
}

function createInsideCoverHTML(pageIndex) {
  return `
    <div class="catalog-page page-left" data-density="soft" style="padding: 32px 36px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="border-bottom: 2px solid var(--frz-blue); padding-bottom: 12px; margin-bottom: 18px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--frz-blue); margin: 0;">
            Profil Perusahaan &amp; Nilai Utama
          </h2>
          <p style="font-size: 0.82rem; color: var(--paper-text-muted); margin: 4px 0 0 0;">
            Distribusi FMCG Skala Global dengan Komitmen Berkelanjutan
          </p>
        </div>

        <p style="font-size: 0.86rem; color: var(--paper-text-body); line-height: 1.6; margin-bottom: 20px;">
          <strong>Fortune Reef Zona</strong> adalah mitra distribusi ekspor resmi terkemuka yang menghubungkan produsen FMCG terbaik Indonesia dengan pasar internasional. Kami mengedepankan efisiensi logistik, harga tangan pertama, dan tanpa batasan jumlah pesanan minimum.
        </p>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px;">
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <i class="fas fa-shipping-fast" style="color: #0284c7; font-size: 1.3rem; margin-bottom: 6px;"></i>
            <h4 style="font-size: 0.85rem; color: #0f172a; margin: 2px 0 4px 0;">Instant Delivery</h4>
            <p style="font-size: 0.74rem; color: #64748b; line-height: 1.4; margin: 0;">Pengiriman cepat &amp; terjadwal untuk menjamin ketersediaan barang.</p>
          </div>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <i class="fas fa-boxes-packing" style="color: #0284c7; font-size: 1.3rem; margin-bottom: 6px;"></i>
            <h4 style="font-size: 0.85rem; color: #0f172a; margin: 2px 0 4px 0;">No Minimum Order</h4>
            <p style="font-size: 0.74rem; color: #64748b; line-height: 1.4; margin: 0;">Mendukung seluruh skala bisnis mulai dari LCL hingga FCL kontainer.</p>
          </div>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <i class="fas fa-tags" style="color: #0284c7; font-size: 1.3rem; margin-bottom: 6px;"></i>
            <h4 style="font-size: 0.85rem; color: #0f172a; margin: 2px 0 4px 0;">Lowest Price Guarantee</h4>
            <p style="font-size: 0.74rem; color: #64748b; line-height: 1.4; margin: 0;">Harga grosir langsung dari distributor resmi untuk laba maksimal.</p>
          </div>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <i class="fas fa-leaf" style="color: #10b981; font-size: 1.3rem; margin-bottom: 6px;"></i>
            <h4 style="font-size: 0.85rem; color: #0f172a; margin: 2px 0 4px 0;">Eco-Conscious Shipping</h4>
            <p style="font-size: 0.74rem; color: #64748b; line-height: 1.4; margin: 0;">Pengemasan ramah lingkungan dan terstandarisasi ekspor dunia.</p>
          </div>
        </div>

        <div>
          <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 10px;">
            Merek Mitra Ekspor Utama
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Unilever</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">P&amp;G</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Wings Group</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Nestlé</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Indofood</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Mayora</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Otsuka</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Colgate</span>
            <span style="background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; color: #334155;">Johnson &amp; Johnson</span>
          </div>
        </div>
      </div>

      <div class="page-footer-bar">
        <span class="footer-hotline"><i class="fab fa-whatsapp"></i> +62 812-3456-7890</span>
        <span class="footer-folio-number">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createTOCContentHTML(tocData, pageIndex) {
  let rowsHTML = "";
  tocData.forEach((item) => {
    rowsHTML += `
      <div class="toc-row-card" onclick="pageFlipInstance && pageFlipInstance.turnToPage(${item.pageIndex})">
        <span class="toc-row-index">${item.num < 10 ? "0" + item.num : item.num}</span>
        <span class="toc-row-name">${item.category}</span>
        <span class="toc-row-count">(${item.count} produk)</span>
        <div class="toc-leader-dots"></div>
        <span class="toc-row-folio">Hal. ${item.pageIndex + 1}</span>
      </div>
    `;
  });

  return `
    <div class="toc-title-header">
      <h2>Daftar Isi Katalog</h2>
      <p>Klik nama kategori di bawah untuk langsung menuju ke halaman produk pilihan Anda</p>
    </div>
    <div class="toc-rows-container">
      ${rowsHTML}
    </div>
    <div class="page-footer-bar">
      <span class="footer-hotline"><i class="fas fa-hand-pointer"></i> Klik baris untuk membuka halaman</span>
      <span class="footer-folio-number">Hal. ${pageIndex + 1}</span>
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
    <div class="catalog-page page-category-opener" data-density="soft">
      <div class="opener-icon-circle">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="opener-count-badge">Kategori Ekspor Unggulan</div>
      <h2 class="opener-category-title">${catName}</h2>
      <p class="opener-description">
        Koleksi lengkap <strong>${totalCount} produk pilihan</strong> terstandarisasi ekspor dengan jaminan kualitas produsen dan harga grosir kompetitif.
      </p>
      <div class="page-footer-bar" style="position: absolute; bottom: 0; left: 0; right: 0; border-color: rgba(255,255,255,0.15); color: #94a3b8;">
        <span style="font-weight: 700; color: #38bdf8;">Fortune Reef Zona</span>
        <span class="footer-folio-number" style="color: #fff;">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createProductPageHTML(items, catName, pageIndex, isLeft, subPageNum, totalSubPages) {
  let cardsHTML = "";
  items.forEach((p) => {
    const isBest = p.isBestSeller ? `<span class="card-bestseller-ribbon">Best Seller</span>` : "";
    const starsHTML = generateStarsHTML(p.rating || 4.7);
    const escapedName = (p.name || "").replace(/"/g, "&quot;");
    const skuCode = `FRZ-${String(p.id).padStart(3, "0")}`;
    const waText = encodeURIComponent(
      `Halo Fortune Reef Zona, saya melihat produk "${p.name}" (SKU: ${skuCode}) di Katalog Flipbook digital. Bisakah saya meminta daftar harga grosir dan ketersediaan stoknya?`
    );

    cardsHTML += `
      <div class="editorial-product-card" data-id="${p.id}" onclick="openProductModal(${p.id})">
        <div class="card-media-box">
          <span class="card-sku-badge">${skuCode}</span>
          ${isBest}
          <img src="${p.image}" alt="${escapedName}" loading="lazy" onerror="this.src='https://placehold.co/240x240?text=Produk+FMCG'">
        </div>
        <div class="card-content-area">
          <div class="card-product-title" title="${escapedName}">${p.name}</div>
          <div class="card-meta-row">
            <div class="card-rating-stars">
              ${starsHTML}
              <span class="score">${p.rating || 4.7}</span>
            </div>
            <span class="card-sales-volume">${p.sales || "1,200"}+ terjual</span>
          </div>
          <div class="card-action-row" onclick="event.stopPropagation()">
            <a href="https://wa.me/6281234567890?text=${waText}" target="_blank" class="btn-inquire-wa">
              <i class="fab fa-whatsapp"></i> Inquiry WA
            </a>
            <button class="btn-card-quickview" onclick="openProductModal(${p.id})">
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
      <div class="page-header-bar">
        <span class="header-company-crest"><i class="fas fa-boxes-packing"></i> Fortune Reef Zona</span>
        <span class="header-category-pill">${catName} &bull; Bagian ${subPageNum}/${totalSubPages}</span>
      </div>

      <div class="page-products-layout">
        ${cardsHTML}
      </div>

      <div class="page-footer-bar">
        <span class="footer-hotline"><i class="fas fa-headset"></i> Layanan Ekspor B2B</span>
        <span class="footer-folio-number">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createHowToOrderHTML(pageIndex) {
  return `
    <div class="catalog-page page-left" data-density="soft" style="padding: 32px 36px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="border-bottom: 2px solid var(--frz-blue); padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--frz-blue); margin: 0;">
            Alur Pemesanan &amp; Prosedur Ekspor
          </h2>
          <p style="font-size: 0.82rem; color: var(--paper-text-muted); margin: 4px 0 0 0;">
            Layanan Pengadaan Terpercaya dari Pabrik hingga Pelabuhan Tujuan
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
          <div style="display: flex; gap: 14px; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--frz-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0;">1</div>
            <div>
              <h4 style="margin: 0; font-size: 0.88rem; color: #0f172a;">Pilih Produk &amp; Buat Inquiry</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #64748b; line-height: 1.4;">Klik tombol WhatsApp atau Email pada produk pilihan Anda, cantumkan perkiraan kuantitas yang dibutuhkan.</p>
            </div>
          </div>
          <div style="display: flex; gap: 14px; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--frz-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0;">2</div>
            <div>
              <h4 style="margin: 0; font-size: 0.88rem; color: #0f172a;">Penerbitan Surat Penawaran (Quotation)</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #64748b; line-height: 1.4;">Tim kami menerbitkan Proforma Invoice resmi mencakup rincian harga grosir, estimasi volume, dan jadwal pengiriman.</p>
            </div>
          </div>
          <div style="display: flex; gap: 14px; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--frz-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0;">3</div>
            <div>
              <h4 style="margin: 0; font-size: 0.88rem; color: #0f172a;">Pengemasan Ekspor Internasional</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #64748b; line-height: 1.4;">Pesanan diproses dengan proteksi pallet dan *shrink-wrap* berstandar keamanan pengiriman laut/udara.</p>
            </div>
          </div>
          <div style="display: flex; gap: 14px; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--frz-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0;">4</div>
            <div>
              <h4 style="margin: 0; font-size: 0.88rem; color: #0f172a;">Pengiriman &amp; Dokumen Kepabeanan Lengkap</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #64748b; line-height: 1.4;">Dukungan penuh dokumen ekspor: Bill of Lading, COO, Packing List, Invoice, serta pelacakan real-time.</p>
            </div>
          </div>
        </div>

        <div style="background: #e0f2fe; border-left: 4px solid var(--frz-accent); padding: 12px 16px; border-radius: 6px;">
          <strong style="color: var(--frz-blue); font-size: 0.84rem;">Jaminan Kesegaran &amp; Keaslian:</strong>
          <p style="font-size: 0.76rem; color: #334155; margin: 3px 0 0 0;">
            Seluruh produk yang kami distribusikan dijamin 100% original dari pabrik dengan masa kedaluwarsa panjang (*fresh batch*).
          </p>
        </div>
      </div>

      <div class="page-footer-bar">
        <span class="footer-hotline"><i class="fas fa-globe"></i> Ekspor ke Lebih dari 20 Negara</span>
        <span class="footer-folio-number">Hal. ${pageIndex + 1}</span>
      </div>
    </div>
  `;
}

function createBackCoverHTML(pageIndex) {
  return `
    <div class="catalog-page page-cover-back" data-density="hard">
      <div style="z-index: 2; margin-top: 15px;">
        <img src="image/Logo.png" alt="Fortune Reef Zona" style="height: 68px; margin-bottom: 12px;" onerror="this.style.display='none'">
        <h3 style="font-size: 1.4rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
          Fortune Reef Zona
        </h3>
        <p style="color: #38bdf8; font-size: 0.85rem; margin-top: 4px;">
          Global FMCG Distribution with a Sustainability Focus
        </p>
      </div>

      <div style="z-index: 2; font-size: 0.85rem; line-height: 1.7; color: #cbd5e1; max-width: 360px;">
        <p style="margin: 0;">
          <strong style="color: #fff;">Kantor Operasional:</strong><br>
          Citra Grand Cibubur CBD Ruko Marquette AR1 No. 27,<br>
          Jatirangga, Jatisampurna, Kota Bekasi, Jawa Barat 17434
        </p>
        <p style="margin: 14px 0 0 0;">
          <strong style="color: #fff;">Kontak Resmi:</strong><br>
          Email: fortunereefzona@gmail.com<br>
          WhatsApp: +62 812-3456-7890<br>
          Website: www.fortunereefzona.com
        </p>
      </div>

      <div style="z-index: 2; width: 100%; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 14px; font-size: 0.74rem; color: #94a3b8;">
        &copy; 2026 Fortune Reef Zona. All Rights Reserved.
      </div>
    </div>
  `;
}

function generateStarsHTML(rating) {
  const full = Math.floor(rating);
  let html = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<i class="fas fa-star"></i>';
    else html += '<i class="far fa-star"></i>';
  }
  return html;
}

/* ========================================================
   STPAGEFLIP ENGINE: FIXED SPREAD DIMENSIONS (GLORIOUS SPREAD)
   ======================================================== */
function setupPageFlipEngine() {
  const flipContainer = document.getElementById("flipbook");
  if (!flipContainer) return;

  const isMobile = window.innerWidth <= 768;
  const availHeight = window.innerHeight - 155; // topbar + dock clearance
  const availWidth = window.innerWidth - 160; // left + right arrow clearance

  let pageWidth, pageHeight;

  if (isMobile) {
    // Single page mode for smartphones
    pageWidth = Math.min(window.innerWidth * 0.92, 420);
    pageHeight = Math.min(availHeight, 620);
    flipContainer.style.width = pageWidth + "px";
    flipContainer.style.height = pageHeight + "px";
  } else {
    // 2-PAGE SPREAD ON DESKTOP & TABLETS
    pageHeight = Math.min(Math.max(availHeight, 520), 820);
    pageWidth = Math.round(pageHeight * 0.72);
    // Ensure 2-page spread fits comfortably inside horizontal viewport
    if (pageWidth * 2 > availWidth) {
      pageWidth = Math.floor(availWidth / 2);
      pageHeight = Math.round(pageWidth / 0.72);
    }
    const spreadWidth = pageWidth * 2;

    flipContainer.style.width = spreadWidth + "px";
    flipContainer.style.height = pageHeight + "px";
  }

  pageFlipInstance = new St.PageFlip(flipContainer, {
    width: pageWidth,
    height: pageHeight,
    size: "fixed",
    minWidth: 280,
    maxWidth: 900,
    minHeight: 400,
    maxHeight: 1200,
    drawShadow: true,
    maxShadowOpacity: 0.5,
    showCover: true,
    usePortrait: isMobile, // NEVER portrait on desktop!
    mobileScrollSupport: false,
    startPage: 0,
    flippingTime: 700,
    showPageCorners: true,
  });

  const allPages = flipContainer.querySelectorAll(".catalog-page");
  pageFlipInstance.loadFromHTML(allPages);

  // Sync initial state
  updateSpreadDisplay(0);

  // Flip Event
  pageFlipInstance.on("flip", (e) => {
    const curIdx = e.data;
    updateSpreadDisplay(curIdx);
    playPaperFlipSound();
    updateThumbnailsActive(curIdx);

    // Hide friendly hint on first flip
    const hint = document.getElementById("reader-hint");
    if (hint) hint.classList.add("hide");

    // Update nav button states
    const prevBtn = document.getElementById("stage-prev-btn");
    const nextBtn = document.getElementById("stage-next-btn");
    if (prevBtn) prevBtn.disabled = curIdx === 0;
    if (nextBtn) nextBtn.disabled = curIdx >= totalPagesCount - 1;
  });

  // Safe Window Resize (registered once)
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (pageFlipInstance) {
        pageFlipInstance.update();
      }
    }, 250);
  });
}

/* ========================================================
   SPREAD DISPLAY: HUMAN-FRIENDLY PAGE INDICATOR
   ======================================================== */
function updateSpreadDisplay(curIdx) {
  const spreadLabel = document.getElementById("dock-spread-label");
  const slider = document.getElementById("page-scrubber");
  const stageCenter = document.getElementById("book-stage-center");

  if (stageCenter) {
    const isClosed = curIdx === 0 || curIdx >= totalPagesCount - 1;
    stageCenter.classList.toggle("book-closed", isClosed);
  }

  if (slider) {
    slider.max = totalPagesCount - 1;
    slider.value = curIdx;
  }

  if (!spreadLabel) return;

  if (curIdx === 0) {
    spreadLabel.innerHTML = `<span style="color: var(--frz-gold);">Sampul Depan (Cover)</span>`;
  } else if (curIdx >= totalPagesCount - 1) {
    spreadLabel.innerHTML = `<span style="color: var(--frz-gold);">Sampul Belakang (Back Cover)</span>`;
  } else {
    // If in spread mode, show both pages: e.g. "Hal. 122 - 123 dari 151"
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      spreadLabel.textContent = `Halaman ${curIdx + 1} dari ${totalPagesCount}`;
    } else {
      const leftPage = curIdx % 2 === 1 ? curIdx : curIdx - 1;
      const rightPage = leftPage + 1;
      if (rightPage < totalPagesCount) {
        spreadLabel.textContent = `Halaman ${leftPage + 1} - ${rightPage + 1} dari ${totalPagesCount}`;
      } else {
        spreadLabel.textContent = `Halaman ${leftPage + 1} dari ${totalPagesCount}`;
      }
    }
  }
}

/* ========================================================
   EVENT LISTENERS: CONTROLS, SEARCH, AUDIO, MODALS
   ======================================================== */
function setupAllEventListeners() {
  // 1. Stage Arrows
  const stagePrev = document.getElementById("stage-prev-btn");
  const stageNext = document.getElementById("stage-next-btn");
  if (stagePrev) stagePrev.onclick = () => pageFlipInstance && pageFlipInstance.flipPrev();
  if (stageNext) stageNext.onclick = () => pageFlipInstance && pageFlipInstance.flipNext();

  // 2. Dock Nav Buttons
  const btnFirst = document.getElementById("btn-first-page");
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");
  const btnLast = document.getElementById("btn-last-page");

  if (btnFirst) btnFirst.onclick = () => pageFlipInstance && pageFlipInstance.turnToPage(0);
  if (btnPrev) btnPrev.onclick = () => pageFlipInstance && pageFlipInstance.flipPrev();
  if (btnNext) btnNext.onclick = () => pageFlipInstance && pageFlipInstance.flipNext();
  if (btnLast) btnLast.onclick = () => pageFlipInstance && pageFlipInstance.turnToPage(totalPagesCount - 1);

  // 3. Page Slider
  const scrubber = document.getElementById("page-scrubber");
  if (scrubber) {
    scrubber.oninput = function () {
      const target = parseInt(this.value, 10);
      if (pageFlipInstance) pageFlipInstance.turnToPage(target);
    };
  }

  // 4. Keyboard Navigation
  window.addEventListener("keydown", (e) => {
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
      closeSearchDropdown();
      if (isZoomed) toggleZoom();
    }
  });

  // 5. Sound FX Toggle
  const btnSound = document.getElementById("btn-sound");
  if (btnSound) {
    btnSound.onclick = function () {
      isAudioEnabled = !isAudioEnabled;
      this.classList.toggle("active", isAudioEnabled);
      this.innerHTML = isAudioEnabled
        ? '<i class="fas fa-volume-up"></i>'
        : '<i class="fas fa-volume-mute"></i>';
    };
  }

  // 6. Zoom Mode
  const btnZoom = document.getElementById("btn-zoom");
  if (btnZoom) btnZoom.onclick = toggleZoom;

  // 7. Fullscreen Toggle
  const btnFullscreen = document.getElementById("btn-fullscreen");
  if (btnFullscreen) btnFullscreen.onclick = toggleFullscreen;

  // 8. Theme Switcher (Dark Studio / Light Studio)
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (btnTheme) {
    btnTheme.onclick = function () {
      document.body.classList.toggle("theme-light");
      const isLight = document.body.classList.contains("theme-light");
      localStorage.setItem("frz-flipbook-theme", isLight ? "light" : "dark");
      this.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    };
  }

  // 9. Instant Search with Dropdown Results
  const searchInput = document.getElementById("flipbook-search-input");
  const searchClear = document.getElementById("search-clear-btn");
  const searchDropdown = document.getElementById("search-results-dropdown");

  if (searchInput && searchDropdown) {
    searchInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (searchClear) searchClear.classList.toggle("active", q.length > 0);

      // Clear highlights
      document.querySelectorAll(".editorial-product-card.search-match").forEach((c) => {
        c.classList.remove("search-match");
      });

      if (!q) {
        searchDropdown.classList.remove("open");
        return;
      }

      const matches = allCatalogProducts.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        searchDropdown.innerHTML = `<div style="padding: 12px; font-size: 0.8rem; color: #94a3b8; text-align: center;">Tidak ada produk yang cocok dengan "${q}".</div>`;
        searchDropdown.classList.add("open");
        return;
      }

      let dropHTML = "";
      matches.slice(0, 8).forEach((item) => {
        dropHTML += `
          <div class="search-result-item" onclick="jumpToSearchResult(${item.id})">
            <img src="${item.image}" alt="${item.name}" class="search-result-thumb" onerror="this.src='https://placehold.co/100?text=Produk'">
            <div class="search-result-info">
              <div class="search-result-name">${item.name}</div>
              <div class="search-result-meta">
                <span>${item.category}</span>
                <span class="search-result-page">Lihat &rarr;</span>
              </div>
            </div>
          </div>
        `;
      });

      searchDropdown.innerHTML = dropHTML;
      searchDropdown.classList.add("open");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".flipbook-search-box")) {
        searchDropdown.classList.remove("open");
      }
    });
  }

  if (searchClear) {
    searchClear.onclick = function () {
      if (searchInput) {
        searchInput.value = "";
        searchInput.dispatchEvent(new Event("input"));
      }
    };
  }

  // 10. Drawer Toggles
  const tocBtn = document.getElementById("toc-toggle-btn");
  const tocClose = document.getElementById("toc-close-btn");
  const btnThumbs = document.getElementById("btn-thumbnails");
  const thumbsClose = document.getElementById("thumbnails-close-btn");
  const overlay = document.getElementById("drawer-overlay");

  if (tocBtn) tocBtn.onclick = openTOCDrawer;
  if (tocClose) tocClose.onclick = closeTOCDrawer;
  if (btnThumbs) btnThumbs.onclick = toggleThumbnailsDrawer;
  if (thumbsClose) thumbsClose.onclick = closeThumbnailsDrawer;
  if (overlay) {
    overlay.onclick = () => {
      closeTOCDrawer();
      closeThumbnailsDrawer();
    };
  }

  // 11. Print Button
  const btnPrint = document.getElementById("btn-print-catalog");
  if (btnPrint) {
    btnPrint.onclick = () => {
      if (confirm("Buka format katalog siap cetak?")) {
        window.location.href = "products.html?action=print";
      }
    };
  }

  // 12. Hint Banner dismiss
  const hint = document.getElementById("reader-hint");
  if (hint) {
    setTimeout(() => hint.classList.add("hide"), 7000);
  }
}

function closeSearchDropdown() {
  const dd = document.getElementById("search-results-dropdown");
  if (dd) dd.classList.remove("open");
}

function jumpToSearchResult(productId) {
  closeSearchDropdown();
  const card = document.querySelector(`.editorial-product-card[data-id="${productId}"]`);
  if (!card) return;

  const page = card.closest(".catalog-page");
  if (!page) return;

  const allPages = Array.from(document.querySelectorAll("#flipbook .catalog-page"));
  const targetPageIdx = allPages.indexOf(page);

  if (targetPageIdx !== -1 && pageFlipInstance) {
    pageFlipInstance.turnToPage(targetPageIdx);
    setTimeout(() => {
      card.classList.add("search-match");
    }, 400);
  }
}

/* ========================================================
   WEB AUDIO API: REALISTIC PAPER FLIP SOUND
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

    const duration = 0.16;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.3));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(850, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + duration);
    filter.Q.value = 1.6;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.24, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start();
  } catch (e) {}
}

/* ========================================================
   ZOOM & FULLSCREEN CONTROLS
   ======================================================== */
function toggleZoom() {
  const centerStage = document.getElementById("book-stage-center");
  const zoomBtn = document.getElementById("btn-zoom");
  if (!centerStage) return;

  isZoomed = !isZoomed;
  centerStage.classList.toggle("zoomed", isZoomed);
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
    if (app.requestFullscreen) app.requestFullscreen();
    else if (app.webkitRequestFullscreen) app.webkitRequestFullscreen();
    if (fsBtn) {
      fsBtn.classList.add("active");
      fsBtn.innerHTML = '<i class="fas fa-compress"></i>';
    }
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    if (fsBtn) {
      fsBtn.classList.remove("active");
      fsBtn.innerHTML = '<i class="fas fa-expand"></i>';
    }
  }
}

/* ========================================================
   DRAWERS: TABLE OF CONTENTS & THUMBNAILS
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
      <span class="toc-cat-name"><i class="fas fa-book"></i> Sampul Depan (Cover)</span>
      <span class="toc-badge-page">Hal. 1</span>
    </li>
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(1); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-building"></i> Profil Perusahaan &amp; Nilai</span>
      <span class="toc-badge-page">Hal. 2</span>
    </li>
    <li onclick="pageFlipInstance && pageFlipInstance.turnToPage(2); closeTOCDrawer();">
      <span class="toc-cat-name"><i class="fas fa-list-ol"></i> Daftar Isi Lengkap</span>
      <span class="toc-badge-page">Hal. 3</span>
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
      <span class="toc-cat-name"><i class="fas fa-truck-fast"></i> Alur Pemesanan &amp; Ekspor</span>
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
    else if (i === 1) title = "Profil";
    else if (i === 2) title = "Daftar Isi";
    else if (i === total - 2) title = "Cara Pesan";
    else if (i === total - 1) title = "Cover Belakang";

    html += `
      <div class="thumbnail-item ${i === 0 ? "active" : ""}" data-page="${i}" onclick="jumpToPageThumb(${i})">
        <i class="fas fa-file-lines" style="color: #94a3b8; font-size: 1.5rem; margin-bottom: 4px;"></i>
        <span class="thumb-title">${title}</span>
        <span class="thumb-num">${i + 1}</span>
      </div>
    `;
  }
  container.innerHTML = html;
}

function jumpToPageThumb(pageIdx) {
  if (pageFlipInstance) pageFlipInstance.turnToPage(pageIdx);
  updateThumbnailsActive(pageIdx);
}

function updateThumbnailsActive(pageIdx) {
  document.querySelectorAll(".thumbnail-item").forEach((item) => {
    const p = parseInt(item.dataset.page, 10);
    item.classList.toggle("active", p === pageIdx);
  });
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

  const skuCode = `FRZ-${String(product.id).padStart(3, "0")}`;
  const starsHTML = generateStarsHTML(product.rating || 4.7);
  const waMsg = encodeURIComponent(
    `Halo Fortune Reef Zona, saya tertarik dengan produk "${product.name}" (${skuCode}) yang ada di Katalog Ekspor Resmi. Bisakah saya meminta daftar harga grosir (FOB/CIF) serta ketersediaan stoknya?`
  );
  const emailSubject = encodeURIComponent(`Inquiry Produk Ekspor: ${product.name} (${skuCode})`);
  const emailBody = encodeURIComponent(
    `Halo Tim Fortune Reef Zona,\n\nSaya ingin meminta penawaran harga grosir untuk produk berikut:\n- Nama Produk: ${product.name}\n- SKU: ${skuCode}\n- Kategori: ${product.category}\n\nMohon informasi lead time pengiriman dan ketentuan pemesanan ekspor.\n\nTerima kasih.`
  );

  content.innerHTML = `
    <div class="modal-img-col">
      <img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x400?text=Produk+FMCG'">
    </div>
    <div class="modal-info-col">
      <span class="modal-badge-cat"><i class="fas fa-tag"></i> ${product.category} &bull; ${skuCode}</span>
      <h3 class="modal-product-title">${product.name}</h3>
      <div class="modal-rating-row">
        <span class="stars">${starsHTML}</span>
        <span style="font-weight: 700; color: #1e293b;">${product.rating || 4.7} / 5.0</span>
        <span style="color: #64748b;">(${product.reviewCount || 100}+ ulasan ekspor)</span>
      </div>
      <div class="modal-desc-text">
        Produk <strong>${product.name}</strong> siap didistribusikan secara global dengan jaminan keaslian merek dan masa kedaluwarsa panjang. Tersedia opsi pengiriman peti kemas (FCL) maupun muatan parsial (LCL) dengan perlindungan kemasan bersertifikat internasional.
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

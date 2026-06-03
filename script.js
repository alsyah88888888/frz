/**
 * GLOBAL SCRIPT - FORTUNE REEF ZONA (Optimized for 1000+ Data)
 */

let allProducts = [];
let displayedCount = 24;
let currentFilteredProducts = [];

document.addEventListener("DOMContentLoaded", function () {
  // --- 1. LOAD COMPONENTS ---
  loadComponent("main-navbar", "navbar.html", () => {
    initMobileMenu();
    setActiveLink();
  });
  loadComponent("main-footer", "footer.html");

  // --- 2. SIDEBAR DROPDOWN LOGIC (KODE YANG HILANG) ---
  // Gunakan delegasi event agar lebih aman
  document.addEventListener("click", function (e) {
    const header = e.target.closest(".category-header");
    if (!header) return;

    // Jangan buka/tutup dropdown jika yang diklik adalah checkbox-nya
    if (e.target.type === "checkbox") return;

    const parent = header.parentElement; // li.has-dropdown
    if (parent) {
      parent.classList.toggle("active");
    }
  });

  // --- 3. LOAD DATA PRODUK ---
  const productDisplay = document.getElementById("product-display");
  const bestSellerDisplay = document.getElementById("best-seller-display");
  if (productDisplay || bestSellerDisplay) {
    fetch("products.json")
      .then((res) => res.json())
      .then((data) => {
        allProducts = data;
        currentFilteredProducts = [...allProducts];
        if (productDisplay) {
          buildCategoryFilters();

          // --- READ URL PARAMS ON LOAD ---
          const urlParams = new URLSearchParams(window.location.search);
          const searchParam = urlParams.get("search");
          const categoriesParam = urlParams.get("categories");

          if (searchParam && searchInput) {
            searchInput.value = searchParam;
          }

          if (categoriesParam) {
            const activeCats = categoriesParam.split(",").filter(Boolean);
            const checkboxes = document.querySelectorAll(".category-checkbox");
            checkboxes.forEach(box => {
              if (activeCats.includes(box.value)) {
                box.checked = true;
              }
            });
            // Update "All Categories" parent checkbox
            const parentCheckbox = document.getElementById("all-cats");
            if (parentCheckbox) {
              const allChecked = Array.from(checkboxes).every(b => b.checked);
              parentCheckbox.checked = allChecked;
            }
          }

          applyFilters(); // Applies filters read from URL
        } else {
          if (bestSellerDisplay) {
            renderBestSellers();
          }
        }
      })
      .catch((err) => {
        console.error("Gagal memuat produk:", err);
        if (productDisplay) {
          productDisplay.innerHTML = "<p>Gagal memuat data produk.</p>";
        }
      });
  }

  // --- 4. FILTER & SEARCH LOGIC ---
  const searchInput = document.getElementById("product-search");

  function buildCategoryFilters() {
    const categoryContainer = document.querySelector('.filter-list');
    if (!categoryContainer) return;
    
    // Get unique categories from data
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
    
    // Rebuild the HTML
    let html = `
      <li class="has-dropdown active">
        <div class="category-header">
          <span><input type="checkbox" class="parent-checkbox" id="all-cats" /> All Categories</span>
          <i class="fas fa-chevron-down toggle-icon"></i>
        </div>
        <ul class="sub-filter-list">
    `;
    
    categories.forEach(cat => {
      html += `
          <li>
            <input type="checkbox" class="category-checkbox" value="${cat}" /> ${cat}
          </li>
      `;
    });
    
    html += `</ul></li>`;
    categoryContainer.innerHTML = html;
    
    // Get the newly created checkboxes
    const checkboxes = document.querySelectorAll(".category-checkbox");
    const parentCheckboxes = document.querySelectorAll(".parent-checkbox");
    
    checkboxes.forEach((box) => box.addEventListener("change", applyFilters));
    
    parentCheckboxes.forEach((parent) => {
      parent.addEventListener("change", function () {
        const subContainer = this.closest(".has-dropdown").querySelector(".sub-filter-list");
        if (subContainer) {
          const subs = subContainer.querySelectorAll(".category-checkbox");
          subs.forEach((s) => (s.checked = this.checked));
          applyFilters();
        }
      });
    });
  }

  function applyFilters() {
    if (!allProducts || allProducts.length === 0) return;

    const currentCheckboxes = document.querySelectorAll(".category-checkbox");
    const searchText = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";
    const activeCats = Array.from(currentCheckboxes)
      .filter((i) => i.checked)
      .map((i) => i.value);

    currentFilteredProducts = allProducts.filter((p) => {
      const productName = p.name ? p.name.toLowerCase() : "";
      const productCat = p.category || "";
      const matchSearch = productName.includes(searchText);
      const matchCat =
        activeCats.length === 0 || activeCats.includes(productCat);
      return matchSearch && matchCat;
    });

    displayedCount = 24;
    renderProducts();
    renderBestSellers(); // Update Best Sellers list along with the catalog

    // --- UPDATE URL PARAMS ---
    const url = new URL(window.location.href);
    if (searchText) {
      url.searchParams.set("search", searchText);
    } else {
      url.searchParams.delete("search");
    }
    if (activeCats.length > 0) {
      url.searchParams.set("categories", activeCats.join(","));
    } else {
      url.searchParams.delete("categories");
    }
    window.history.pushState({}, "", url);
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFilters();
        // Closes drawer on mobile when hitting Enter
        if (window.innerWidth < 992) {
          toggleDrawer();
        }
      }
    });
  }

  // --- 5. LOAD MORE LOGIC ---
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      displayedCount += 24;
      renderProducts();
    });
  }

  // --- 6. PRINT CATALOG LOGIC ---
  const printBtn = document.getElementById("print-catalog-btn");
  if (printBtn) {
    printBtn.addEventListener("click", printCatalog);
  }

  // --- 7. PRODUCT DETAIL MODAL EVENT DELEGATION ---
  document.addEventListener("click", function (e) {
    const productCard = e.target.closest(".product-list-item, .best-seller-card");
    if (!productCard) return;

    const productId = productCard.getAttribute("data-id");
    if (productId) {
      openProductDetail(parseInt(productId));
    }
  });

  // --- 5. DRAWER LOGIC ---
  const drawer = document.getElementById("sidebar-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  const filterToggle = document.getElementById("filter-toggle");
  const closeDrawer = document.getElementById("close-drawer");
  const applyBtn = document.getElementById("apply-filters");

  function openDrawer() {
    drawer.classList.add("active");
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  function toggleDrawer() {
    drawer.classList.remove("active");
    backdrop.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (filterToggle) filterToggle.onclick = openDrawer;
  if (closeDrawer) closeDrawer.onclick = toggleDrawer;
  if (backdrop) backdrop.onclick = toggleDrawer;
  if (applyBtn) {
    applyBtn.onclick = () => {
      applyFilters();
      toggleDrawer();
    };
  }

  // Swiper & Counter tetap seperti kode Anda...

  if (typeof Swiper !== "undefined") {
    new Swiper(".heroSwiper", {
      loop: true,
      effect: "fade", // Add smooth fade transition if Swiper effect-fade module is loaded (or defaults to slide if not)
      speed: 1500, // 1.5s transition
      autoplay: {
        delay: 3500, // wait 3.5s
        disableOnInteraction: false,
      },
      allowTouchMove: false, // background slider doesn't need touch
    });

    new Swiper(".brandSwiper", {
      slidesPerView: 2,
      spaceBetween: 30,
      loop: true,
      speed: 3000, // Continuous smooth scrolling speed
      autoplay: {
        delay: 0, // No delay between transitions
        disableOnInteraction: false,
      },
      breakpoints: {
        640: {
          slidesPerView: 3,
          spaceBetween: 40,
        },
        1024: {
          slidesPerView: 5, 
          spaceBetween: 50, 
        },
      },
    });
  }

  // Panggil fungsi counter
  initCounters();
}); // <--- PENUTUP DOMContentLoaded

// --- CORE FUNCTIONS (DILUAR DOMCONTENTLOADED) ---

function generateStarsHTML(rating) {
  let stars = "";
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars += `<i class="fas fa-star" style="color: #3f3d91 !important;"></i>`;
    } else if (i === fullStars + 1 && hasHalf) {
      stars += `<i class="fas fa-star-half-alt" style="color: #3f3d91 !important;"></i>`;
    } else {
      stars += `<i class="far fa-star" style="color: #3f3d91 !important;"></i>`;
    }
  }
  return stars;
}

function renderBestSellers() {
  const container = document.getElementById("best-seller-display");
  const section = document.querySelector(".best-seller-section");
  if (!container) return;

  const bestSellers = currentFilteredProducts.filter(p => p.isBestSeller);
  const allBestSellers = allProducts.filter(p => p.isBestSeller);

  if (bestSellers.length === 0) {
    if (section) section.style.display = "none";
    container.innerHTML = "";
  } else {
    if (section) section.style.display = "block";
    container.innerHTML = bestSellers
      .map(
        (p) => {
          const rank = allBestSellers.findIndex(bp => bp.id === p.id) + 1;
          return `
            <div class="best-seller-card" data-id="${p.id}">
              <div class="top-badge">Top #${rank}</div>
              <div class="bs-img">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x500?text=Product'">
                <button class="quick-shop" title="Quick Shop">
                  <i class="fas fa-shopping-bag"></i>
                </button>
              </div>
              <div class="bs-info">
                <span class="bs-cat">${p.category}</span>
                <h4>${p.name}</h4>
                <div class="star-rating">
                  ${generateStarsHTML(p.rating)}
                </div>
              </div>
            </div>
          `;
        }
      )
      .join("");
  }
}

function renderProducts() {
  const container = document.getElementById("product-display");
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (!container) return;

  const toShow = currentFilteredProducts.slice(0, displayedCount);

  if (toShow.length === 0) {
    container.style.display = "block";
    container.innerHTML = `
      <div style="text-align: center; padding: 50px; color: #718096;">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.2;"></i>
        <p style="font-size: 1.2rem; font-weight: 600;">No products found</p>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  // Preserve layout mode
  const isListMode = document.querySelector(".fa-list").classList.contains("active");
  container.className = isListMode ? "list-container list-mode" : "list-container";

  container.innerHTML = toShow
    .map(
      (p) => `
    <div class="product-list-item" data-id="${p.id}">
      <div class="item-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x500?text=Product'">
        <button class="quick-shop" title="Quick Shop">
          <i class="fas fa-shopping-bag"></i>
        </button>
      </div>
      <div class="item-info">
        <span class="cat-label">${p.category}</span>
        <h4>${p.name}</h4>
      </div>
    </div>
  `,
    )
    .join("");

  const counterElement = document.getElementById("product-counter");
  if (counterElement) {
    counterElement.innerText = `Showing ${toShow.length} of ${currentFilteredProducts.length} results`;
  }

  if (loadMoreBtn) {
    loadMoreBtn.style.display =
      displayedCount >= currentFilteredProducts.length
        ? "none"
        : "inline-block";
  }
}

// --- 7. VIEW TOGGLE LOGIC ---
document.addEventListener("click", function (e) {
  const gridBtn = e.target.closest(".fa-th");
  const listBtn = e.target.closest(".fa-list");

  if (gridBtn || listBtn) {
    const listIcon = document.querySelector(".fa-list");
    const gridIcon = document.querySelector(".fa-th");
    const container = document.getElementById("product-display");

    if (gridBtn) {
      gridIcon.classList.add("active");
      listIcon.classList.remove("active");
      container.classList.remove("list-mode");
    } else {
      listIcon.classList.add("active");
      gridIcon.classList.remove("active");
      container.classList.add("list-mode");
    }
    renderProducts();
  }
});

function loadComponent(id, file, callback) {
  const el = document.getElementById(id);
  if (el) {
    fetch(file)
      .then((res) => res.text())
      .then((data) => {
        el.innerHTML = data;
        if (callback) callback();
      });
  }
}

function initMobileMenu() {
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle && navLinks) {
    menuToggle.onclick = () => {
      navLinks.classList.toggle("active");
      const icon = menuToggle.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-bars");
        icon.classList.toggle("fa-times");
      }
    };
  }
}

function setActiveLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href").toLowerCase() === currentPage.toLowerCase()) {
      link.classList.add("active-link");
    }
  });
}

function initCounters() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = +counter.getAttribute("data-target");
          let count = 0;
          const update = () => {
            count += target / 100;
            if (count < target) {
              counter.innerText = Math.ceil(count);
              setTimeout(update, 10);
            } else counter.innerText = target;
          };
          update();
          observer.unobserve(counter);
        }
      });
    },
    { threshold: 0.7 },
  );
  document.querySelectorAll(".counter").forEach((c) => observer.observe(c));
}

// --- 8. PRODUCT DETAIL MODAL & PRINT FUNCTIONS ---
function openProductDetail(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const modal = document.getElementById("product-detail-modal");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-container">
      <button class="modal-close" id="close-detail-modal">
        <i class="fas fa-times"></i>
      </button>
      <div class="modal-image-col">
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/400x500?text=Product'">
      </div>
      <div class="modal-info-col">
        <span class="modal-cat">${product.category}</span>
        <h3>${product.name}</h3>
        <div class="modal-rating">
          <div class="modal-stars">${generateStarsHTML(product.rating)}</div>
          <span class="modal-reviews">(${product.reviewCount} ulasan)</span>
        </div>
        <p class="modal-desc">
          Dapatkan produk <strong>${product.name}</strong> dengan harga grosir terbaik untuk distribusi FMCG global. Kami melayani pengiriman cepat tanpa batas minimum order untuk mendukung seluruh skala bisnis Anda secara berkelanjutan.
        </p>
        <div class="modal-actions">
          <a class="btn-inquiry btn-whatsapp" href="https://wa.me/6281234567890?text=${encodeURIComponent('Halo Fortune Reef Zona, saya tertarik dengan produk ' + product.name + '. Bisa minta info harga grosirnya?')}" target="_blank">
            <i class="fab fa-whatsapp"></i> Hubungi via WhatsApp
          </a>
          <a class="btn-inquiry btn-email" href="https://mail.google.com/mail/?view=cm&fs=1&to=fortunereefzona@gmail.com&su=${encodeURIComponent('Inquiry: ' + product.name)}&body=${encodeURIComponent('Halo Fortune Reef Zona,\n\nSaya tertarik untuk membeli produk ' + product.name + ' secara grosir. Tolong berikan penawaran harga terbaik.\n\nTerima kasih.')}" target="_blank">
            <i class="fas fa-envelope"></i> Kirim Email Inquiry
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  const closeBtn = document.getElementById("close-detail-modal");
  closeBtn.onclick = closeProductDetail;

  modal.onclick = function (e) {
    if (e.target === modal) {
      closeProductDetail();
    }
  };
}

function closeProductDetail() {
  const modal = document.getElementById("product-detail-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function printCatalog() {
  const printSection = document.getElementById("print-section");
  if (!printSection) return;

  if (currentFilteredProducts.length === 0) {
    alert("Tidak ada produk untuk dicetak.");
    return;
  }

  // Get active categories names for metadata
  const currentCheckboxes = document.querySelectorAll(".category-checkbox");
  const activeCats = Array.from(currentCheckboxes)
    .filter((i) => i.checked)
    .map((i) => i.value);
  const categoriesText = activeCats.length === 0 ? "Semua Kategori" : activeCats.join(", ");

  const cardsHTML = currentFilteredProducts
    .map(p => `
      <div class="print-card">
        <span class="print-product-id">ID: #${String(p.id).padStart(4, '0')}</span>
        <div class="print-card-img">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/100?text=Product'">
        </div>
        <div class="print-card-info">
          <span class="print-card-cat">${p.category}</span>
          <h4 class="print-card-name">${p.name}</h4>
        </div>
      </div>
    `).join("");

  printSection.innerHTML = `
    <div class="print-header">
      <div class="print-header-top">
        <div class="print-logo-box">
          <img src="image/Logo.png" alt="Logo" onerror="this.style.display='none'">
          <h2>Fortune Reef Zona</h2>
        </div>
        <div class="print-header-details">
          <p class="print-subtitle">Global FMCG Distribution & Export</p>
          <p>Citra Grand Cibubur CBD Ruko Marquette AR1 No. 27, Bekasi</p>
          <p>Email: fortunereefzona@gmail.com</p>
        </div>
      </div>
      <div class="print-header-bottom">
        <span class="print-meta-item"><strong>Filter Kategori:</strong> ${categoriesText}</span>
        <span class="print-meta-item"><strong>Jumlah Item:</strong> ${currentFilteredProducts.length} Produk</span>
        <span class="print-meta-item"><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
    <div class="print-grid">
      ${cardsHTML}
    </div>
  `;

  window.print();
}


/**
 * GLOBAL SCRIPT - FORTUNE REEF ZONA (Optimized for 1000+ Data)
 */

let allProducts = [];
let displayedCount = 10;
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
          renderProducts();
        }
        if (bestSellerDisplay) {
          renderBestSellers();
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

    displayedCount = 10;
    renderProducts();
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
      displayedCount += 10;
      renderProducts();
    });
  }

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
  if (!container) return;

  const bestSellers = allProducts.filter(p => p.isBestSeller);

  container.innerHTML = bestSellers
    .map(
      (p, index) => `
    <div class="best-seller-card">
      <div class="top-badge">Top #${index + 1}</div>
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
          <span class="review-count">(${p.reviewCount})</span>
        </div>
        <div class="bs-stats">
          <i class="fas fa-chart-line"></i> Export Choice (${p.sales} Sales)
        </div>
      </div>
    </div>
  `
    )
    .join("");
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
    <div class="product-list-item">
      <div class="item-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x500?text=Product'">
        <button class="quick-shop" title="Quick Shop">
          <i class="fas fa-shopping-bag"></i>
        </button>
      </div>
      <div class="item-info">
        <span class="cat-label">${p.category}</span>
        <h4>${p.name}</h4>
        <div class="star-rating">
          ${generateStarsHTML(p.rating)}
          <span class="review-count">(${p.reviewCount})</span>
        </div>
        <div style="margin-top: auto; padding-top: 15px;">
           <span style="font-size: 0.85rem; padding: 6px 15px; border: 1px solid #edf2f7; border-radius: 50px; color: #3f3d91; font-weight: 600; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.background='#3f3d91'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#3f3d91'">View Details</span>
        </div>
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


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
  if (productDisplay) {
    fetch("products.json")
      .then((res) => res.json())
      .then((data) => {
        allProducts = data;
        currentFilteredProducts = [...allProducts];
        renderProducts();
      })
      .catch((err) => {
        console.error("Gagal memuat produk:", err);
        productDisplay.innerHTML = "<p>Gagal memuat data produk.</p>";
      });
  }

  // --- 4. FILTER & SEARCH LOGIC ---
  const searchInput = document.getElementById("product-search");
  const checkboxes = document.querySelectorAll(".category-checkbox");
  const parentCheckboxes = document.querySelectorAll(".parent-checkbox");

  function applyFilters() {
    if (!allProducts || allProducts.length === 0) return;

    const searchText = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";
    const activeCats = Array.from(checkboxes)
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
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  checkboxes.forEach((box) => box.addEventListener("change", applyFilters));

  // Logika Checkbox Induk (Food, Beverages, dll)
  parentCheckboxes.forEach((parent) => {
    parent.addEventListener("change", function () {
      const subContainer =
        this.closest(".has-dropdown").querySelector(".sub-filter-list");
      if (subContainer) {
        const subs = subContainer.querySelectorAll(".category-checkbox");
        subs.forEach((s) => (s.checked = this.checked));
        applyFilters();
      }
    });
  });

  // --- 5. LOAD MORE LOGIC ---
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      displayedCount += 10;
      renderProducts();
    });
  }

  // Swiper & Counter tetap seperti kode Anda...

  if (typeof Swiper !== "undefined") {
    new Swiper(".brandSwiper", {
      slidesPerView: 2,
      spaceBetween: 20, // Gap rapat untuk mobile
      centeredSlides: true, // Berhenti di tengah
      loop: true,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
      },
      breakpoints: {
        640: {
          slidesPerView: 3,
          spaceBetween: 30,
        },
        1024: {
          slidesPerView: 5, // Menampilkan 5 logo sekaligus agar gap mengecil
          spaceBetween: 40, // Jarak antar logo di desktop
          centeredSlides: false, // Matikan centered di desktop jika jumlah logo pas dengan view
        },
      },
    });
  }

  // Panggil fungsi counter
  initCounters();

  // --- 6. RENDER BEST SELLERS ---
  renderBestSellers();
}); // <--- PENUTUP DOMContentLoaded

// --- CORE FUNCTIONS (DILUAR DOMCONTENTLOADED) ---

const bestSellingProducts = [
  { name: "KIT KAT CHOCOLATE DRINK CAN 24 X 220ML", sales: "18,345", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/1.jpeg" },
  { name: "OREO ROLL VANILA 110,4 GR", sales: "7,010", category: "Snacks & Confectioneries (Camilan)", image: "image/top 10 produk/2.jpeg" },
  { name: "SUNLIGHT 610GR", sales: "6,600", category: "Home Care (Perawatan Rumah)", image: "image/top 10 produk/3.jpg" },
  { name: "SIRUP MARJAN COCO PANDAN 460ML", sales: "5,094", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/4.webp" },
  { name: "NESCAFE KIT KAT RTD LATTE 24x220ML", sales: "3,300", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/5.jpg" },
  { name: "MEDICARE BAR SOAP LIGHT BLUE 80GR", sales: "3,300", category: "Personal Care (Perawatan Tubuh)", image: "image/top 10 produk/6.jpeg" },
  { name: "OATSIDE OAT MILK BARISTA BLEND 6x1000ML", sales: "3,200", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/7.webp" },
  { name: "OATSIDE BARISTA 6 x 1000ML", sales: "2,864", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/8.webp" },
  { name: "SIRUP MARJAN MELON 460ML", sales: "2,750", category: "Beverages & Drinks (Minuman)", image: "image/top 10 produk/9.jpg" },
  { name: "OREO ROLL ORIGINAL 119,6GR", sales: "2,500", category: "Snacks & Confectioneries (Camilan)", image: "https://placehold.co/400x400?text=Oreo+Original" }
];

function renderBestSellers() {
  const container = document.getElementById("best-seller-display");
  if (!container) return;

  container.innerHTML = bestSellingProducts
    .map(
      (p, index) => `
    <div class="best-seller-card">
      <div class="top-badge"><i class="fas fa-crown"></i> Top ${index + 1}</div>
      <div class="bs-img"><img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/200x200?text=Product'"></div>
      <div class="bs-info">
        <span class="bs-cat">${p.category}</span>
        <h4>${p.name}</h4>
        <div class="bs-stats">
          <i class="fas fa-shopping-cart"></i> ${p.sales} Sold
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
  container.style.display = isListMode ? "flex" : "grid";

  container.innerHTML = toShow
    .map(
      (p) => `
    <div class="product-list-item">
      <div class="item-img"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
      <div class="item-info">
        <span class="cat-label">${p.category}</span>
        <h4>${p.name}</h4>
        <a href="${p.detailsLink || "#"}" class="btn-details">
          See Details <i class="fas fa-arrow-right"></i>
        </a>
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
      container.style.display = "grid";
    } else {
      listIcon.classList.add("active");
      gridIcon.classList.remove("active");
      container.classList.add("list-mode");
      container.style.display = "flex";
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


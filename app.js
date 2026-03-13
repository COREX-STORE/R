// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Configuration 1 - Admin/Password ONLY
const firebaseConfigAdmin = {
    apiKey: "AIzaSyCyJ42RKLNvWhRHnhGkGsZxbhlZx5u4AGo",
    authDomain: "corex-store.firebaseapp.com",
    databaseURL: "https://corex-store-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "corex-store",
    storageBucket: "corex-store.firebasestorage.app",
    messagingSenderId: "531906370834",
    appId: "1:531906370834:web:6a2c264e36892aac8227cb"
};

// Firebase Configuration 2 - Products ONLY
const firebaseConfigProducts = {
    apiKey: "AIzaSyCEfWL8YRWslT9B6PVBJJZSnHa3EsnFRf0",
    authDomain: "corex-store1.firebaseapp.com",
    databaseURL: "https://corex-store1-default-rtdb.firebaseio.com",
    projectId: "corex-store1",
    storageBucket: "corex-store1.firebasestorage.app",
    messagingSenderId: "280887883511",
    appId: "1:280887883511:web:1c43a6ce3ecc834a8485f2"
};

// Initialize Firebase apps
const appAdmin = initializeApp(firebaseConfigAdmin, "appAdmin");
const appProducts = initializeApp(firebaseConfigProducts, "appProducts");

// Get database references
const dbAdmin = getDatabase(appAdmin);
const dbProducts = getDatabase(appProducts);

// Global state
let isAdmin = false;
let currentEditId = null;

// DOM Elements - will be initialized after DOM loads
let adminBtn, loginModal, closeModal, loginForm, sidebar, sidebarOverlay, closeSidebar;
let addProductBtn, addProductForm, themeBtn, themeSelector, saveProductBtn, logoutBtn;
let productsGrid, toast, hasDiscount, discountGroup;

// Cookie Helpers
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Initialize DOM Elements
function initDOMElements() {
    adminBtn = document.getElementById('adminBtn');
    loginModal = document.getElementById('loginModal');
    closeModal = document.getElementById('closeModal');
    loginForm = document.getElementById('loginForm');
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebarOverlay');
    closeSidebar = document.getElementById('closeSidebar');
    addProductBtn = document.getElementById('addProductBtn');
    addProductForm = document.getElementById('addProductForm');
    themeBtn = document.getElementById('themeBtn');
    themeSelector = document.getElementById('themeSelector');
    saveProductBtn = document.getElementById('saveProductBtn');
    logoutBtn = document.getElementById('logoutBtn');
    productsGrid = document.getElementById('productsGrid');
    toast = document.getElementById('toast');
    hasDiscount = document.getElementById('hasDiscount');
    discountGroup = document.getElementById('discountGroup');
}

// Initialize
function init() {
    initDOMElements();
    loadProducts();
    checkAdminSession();
    setupEventListeners();
    setupThemeSelector();
    setupDiscountToggle();
}

// Setup Discount Toggle
function setupDiscountToggle() {
    if (hasDiscount && discountGroup) {
        hasDiscount.addEventListener('change', () => {
            discountGroup.style.display = hasDiscount.checked ? 'block' : 'none';
        });
    }
}

// Event Listeners
function setupEventListeners() {
    // Admin login button
    adminBtn?.addEventListener('click', () => {
        if (isAdmin) {
            openSidebar();
        } else {
            openLoginModal();
        }
    });

    // Modal close
    closeModal?.addEventListener('click', closeLoginModal);
    loginModal?.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
    });

    // Login form
    loginForm?.addEventListener('submit', handleLogin);

    // Sidebar
    closeSidebar?.addEventListener('click', closeSidebarFn);
    sidebarOverlay?.addEventListener('click', closeSidebarFn);

    // Add product button
    addProductBtn?.addEventListener('click', () => {
        resetProductForm();
        addProductForm?.classList.add('active');
        currentEditId = null;
    });

    // Theme button
    themeBtn?.addEventListener('click', () => {
        const selector = document.getElementById('themeSelector');
        if (selector) {
            selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
        }
    });

    // Save product - IMPORTANT: Use direct onclick handler
    if (saveProductBtn) {
        saveProductBtn.onclick = saveProduct;
    }

    // Logout
    logoutBtn?.addEventListener('click', handleLogout);

    // Smooth scroll for scroll indicator
    document.querySelector('.scroll-indicator')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    });
}

// Theme Selector
function setupThemeSelector() {
    const themeOptions = document.querySelectorAll('.theme-option');
    const savedTheme = localStorage.getItem('corexTheme') || 'theme-purple';
    document.body.className = savedTheme;

    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            document.body.className = theme;
            localStorage.setItem('corexTheme', theme);

            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            showToast('تم تغيير الثيم بنجاح', 'success');
        });

        if (option.dataset.theme === savedTheme) {
            option.classList.add('active');
        }
    });
}

// Modal Functions
function openLoginModal() {
    loginModal?.classList.add('active');
}

function closeLoginModal() {
    loginModal?.classList.remove('active');
}

// Sidebar Functions
function openSidebar() {
    sidebar?.classList.add('active');
    sidebarOverlay?.classList.add('active');
}

function closeSidebarFn() {
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
    addProductForm?.classList.remove('active');
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        // Check if password exists in database (using dbAdmin for login)
        const passwordRef = ref(dbAdmin, 'admin/password');
        const snapshot = await get(passwordRef);

        if (snapshot.exists()) {
            // Verify password
            const storedPassword = snapshot.val();
            if (password === storedPassword) {
                loginSuccess();
            } else {
                showToast('كلمة المرور غير صحيحة', 'error');
            }
        } else {
            // First time - save password
            await set(passwordRef, password);
            loginSuccess();
            showToast('تم تعيين كلمة المرور بنجاح', 'success');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('حدث خطأ في تسجيل الدخول: ' + error.message, 'error');
    }
}

function loginSuccess() {
    isAdmin = true;
    // Save to both sessionStorage and cookies
    sessionStorage.setItem('corexAdmin', 'true');
    setCookie('corexAdmin', 'true', 30);
    closeLoginModal();
    openSidebar();
    loadProducts();
    showToast('تم تسجيل الدخول بنجاح', 'success');
}

function checkAdminSession() {
    const sessionAdmin = sessionStorage.getItem('corexAdmin') === 'true';
    const cookieAdmin = getCookie('corexAdmin') === 'true';

    if (sessionAdmin || cookieAdmin) {
        isAdmin = true;
        if (sessionAdmin && !cookieAdmin) {
            setCookie('corexAdmin', 'true', 30);
        }
    }
}

function handleLogout() {
    isAdmin = false;
    sessionStorage.removeItem('corexAdmin');
    deleteCookie('corexAdmin');
    closeSidebarFn();
    loadProducts();
    showToast('تم تسجيل الخروج', 'success');
}

// Product Functions
async function loadProducts() {
    try {
        // Get products from dbProducts
        const snapshot = await get(ref(dbProducts, 'products'));
        const products = [];

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                products.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }

        // Sort by timestamp (newest first)
        products.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>حدث خطأ في تحميل المنتجات</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

function displayProducts(products) {
    if (!productsGrid) return;

    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>لا توجد منتجات حالياً</h3>
                <p>سيتم إضافة منتجات قريباً</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const discountedPrice = product.hasDiscount && product.discountPercent > 0
        ? Math.round(product.price * (1 - product.discountPercent / 100))
        : null;

    return `
        <div class="product-card glass-card" data-id="${product.id}">
            <div class="liquid-border"></div>
            <div class="water-ripple"></div>
            <div class="glass-reflection"></div>
            <img src="${product.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                <div class="product-price-container">
                    <span class="product-price">${discountedPrice || product.price} د.ع</span>
                    ${discountedPrice ? `
                        <span class="original-price">${product.price} د.ع</span>
                        <span class="discount-badge">خصم ${product.discountPercent}%</span>
                    ` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn-share" onclick="shareProduct('${escapeString(product.name)}', ${discountedPrice || product.price})">
                        <i class="fas fa-share-alt"></i>
                        مشاركة
                    </button>
                </div>
                ${isAdmin ? `
                    <div class="admin-actions visible">
                        <button class="btn-edit" onclick="editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                            تعديل
                        </button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function escapeString(str) {
    return str ? str.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
}

// Share Product
window.shareProduct = function(name, price) {
    const shareText = `تفقد هذا المنتج من COREX STORE:\n${name}\nالسعر: ${price} د.ع\n\n📍 بغداد - العامرية\n📞 07863300229`;

    if (navigator.share) {
        navigator.share({
            title: 'COREX STORE - ' + name,
            text: shareText,
            url: window.location.href
        }).catch(() => {
            // User cancelled or error
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('تم نسخ معلومات المنتج للمشاركة', 'success');
        });
    }
};

// Edit Product
window.editProduct = async function(id) {
    try {
        const snapshot = await get(ref(dbProducts, `products/${id}`));

        if (snapshot.exists()) {
            const product = snapshot.val();

            // Fill form
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productDesc').value = product.description || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productImage').value = product.image || '';

            // Discount
            const hasDiscountCheckbox = document.getElementById('hasDiscount');
            const discountGroupEl = document.getElementById('discountGroup');
            const discountPercent = document.getElementById('discountPercent');

            if (product.hasDiscount) {
                hasDiscountCheckbox.checked = true;
                discountGroupEl.style.display = 'block';
                discountPercent.value = product.discountPercent || '';
            } else {
                hasDiscountCheckbox.checked = false;
                discountGroupEl.style.display = 'none';
                discountPercent.value = '';
            }

            currentEditId = id;

            openSidebar();
            addProductForm?.classList.add('active');

            showToast('يمكنك الآن تعديل المنتج', 'success');
        }
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showToast('حدث خطأ في تحميل بيانات المنتج', 'error');
    }
};

// Delete Product
window.deleteProduct = async function(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
        await remove(ref(dbProducts, `products/${id}`));
        showToast('تم حذف المنتج بنجاح', 'success');
        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('حدث خطأ في حذف المنتج', 'error');
    }
};

// Save Product - THE MAIN FUNCTION
async function saveProduct() {
    console.log('saveProduct called');

    const nameEl = document.getElementById('productName');
    const descEl = document.getElementById('productDesc');
    const priceEl = document.getElementById('productPrice');
    const imageEl = document.getElementById('productImage');
    const hasDiscountEl = document.getElementById('hasDiscount');
    const discountPercentEl = document.getElementById('discountPercent');

    if (!nameEl || !priceEl) {
        showToast('خطأ: عناصر النموذج غير موجودة', 'error');
        return;
    }

    const name = nameEl.value.trim();
    const description = descEl ? descEl.value.trim() : '';
    const price = parseFloat(priceEl.value);
    const image = imageEl ? imageEl.value.trim() : '';
    const hasDiscountChecked = hasDiscountEl ? hasDiscountEl.checked : false;
    const discountPercent = discountPercentEl ? parseInt(discountPercentEl.value) || 0 : 0;

    // Validation
    if (!name) {
        showToast('الرجاء إدخال اسم المنتج', 'error');
        return;
    }

    if (!price || isNaN(price) || price <= 0) {
        showToast('الرجاء إدخال سعر صحيح للمنتج', 'error');
        return;
    }

    const productData = {
        name: name,
        description: description,
        price: price,
        image: image || 'https://via.placeholder.com/400x300?text=No+Image',
        hasDiscount: hasDiscountChecked,
        discountPercent: hasDiscountChecked ? discountPercent : 0,
        timestamp: Date.now()
    };

    console.log('Saving product:', productData);

    try {
        if (currentEditId) {
            // Update existing product
            await update(ref(dbProducts, `products/${currentEditId}`), productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            // Add new product
            const newProductRef = push(ref(dbProducts, 'products'));
            await set(newProductRef, productData);
            showToast('تم إضافة المنتج بنجاح', 'success');
        }

        resetProductForm();
        addProductForm?.classList.remove('active');
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('حدث خطأ في حفظ المنتج: ' + error.message, 'error');
    }
}

function resetProductForm() {
    const nameEl = document.getElementById('productName');
    const descEl = document.getElementById('productDesc');
    const priceEl = document.getElementById('productPrice');
    const imageEl = document.getElementById('productImage');
    const hasDiscountEl = document.getElementById('hasDiscount');
    const discountPercentEl = document.getElementById('discountPercent');
    const discountGroupEl = document.getElementById('discountGroup');

    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    if (priceEl) priceEl.value = '';
    if (imageEl) imageEl.value = '';
    if (hasDiscountEl) hasDiscountEl.checked = false;
    if (discountPercentEl) discountPercentEl.value = '';
    if (discountGroupEl) discountGroupEl.style.display = 'none';
}

// Toast Notification
function showToast(message, type = 'success') {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Real-time updates
function setupRealtimeListeners() {
    onValue(ref(dbProducts, 'products'), () => {
        if (!currentEditId) loadProducts();
    });
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Setup realtime after initial load
setTimeout(setupRealtimeListeners, 1000);

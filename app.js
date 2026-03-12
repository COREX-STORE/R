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

// Firebase Configuration 2 - Products ONLY (NEW)
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

// DOM Elements
const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const loginForm = document.getElementById('loginForm');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');
const addProductBtn = document.getElementById('addProductBtn');
const addProductForm = document.getElementById('addProductForm');
const themeBtn = document.getElementById('themeBtn');
const themeSelector = document.getElementById('themeSelector');
const saveProductBtn = document.getElementById('saveProductBtn');
const logoutBtn = document.getElementById('logoutBtn');
const productsGrid = document.getElementById('productsGrid');
const toast = document.getElementById('toast');

// Discount checkbox toggle
const hasDiscount = document.getElementById('hasDiscount');
const discountGroup = document.getElementById('discountGroup');

hasDiscount?.addEventListener('change', () => {
    discountGroup.style.display = hasDiscount.checked ? 'block' : 'none';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    checkAdminSession();
    setupEventListeners();
    setupThemeSelector();
});

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
        selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
    });

    // Save product
    saveProductBtn?.addEventListener('click', saveProduct);

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
        showToast('حدث خطأ في تسجيل الدخول', 'error');
    }
}

function loginSuccess() {
    isAdmin = true;
    // Save to both sessionStorage and cookies
    sessionStorage.setItem('corexAdmin', 'true');
    setCookie('corexAdmin', 'true', 30); // Cookie expires in 30 days
    closeLoginModal();
    openSidebar();
    loadProducts(); // Reload to show admin controls
    showToast('تم تسجيل الدخول بنجاح', 'success');
}

function checkAdminSession() {
    // Check both sessionStorage and cookies
    const sessionAdmin = sessionStorage.getItem('corexAdmin') === 'true';
    const cookieAdmin = getCookie('corexAdmin') === 'true';

    if (sessionAdmin || cookieAdmin) {
        isAdmin = true;
        // Sync cookie if only session exists
        if (sessionAdmin && !cookieAdmin) {
            setCookie('corexAdmin', 'true', 30);
        }
    }
}

function handleLogout() {
    isAdmin = false;
    // Clear both sessionStorage and cookies
    sessionStorage.removeItem('corexAdmin');
    deleteCookie('corexAdmin');
    closeSidebarFn();
    loadProducts(); // Reload to hide admin controls
    showToast('تم تسجيل الخروج', 'success');
}

// Product Functions
async function loadProducts() {
    try {
        // Get products from new database ONLY (dbProducts)
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
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>حدث خطأ في تحميل المنتجات</h3>
                <p>يرجى المحاولة مرة أخرى</p>
            </div>
        `;
    }
}

function displayProducts(products) {
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
                    <button class="btn-share" onclick="shareProduct('${product.name}', ${discountedPrice || product.price})">
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

// Make functions available globally for onclick handlers
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
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('تم نسخ معلومات المنتج للمشاركة', 'success');
        });
    }
};

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
            const discountGroup = document.getElementById('discountGroup');
            const discountPercent = document.getElementById('discountPercent');

            if (product.hasDiscount) {
                hasDiscountCheckbox.checked = true;
                discountGroup.style.display = 'block';
                discountPercent.value = product.discountPercent || '';
            } else {
                hasDiscountCheckbox.checked = false;
                discountGroup.style.display = 'none';
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

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDesc').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const image = document.getElementById('productImage').value.trim();
    const hasDiscountChecked = document.getElementById('hasDiscount').checked;
    const discountPercent = parseInt(document.getElementById('discountPercent').value) || 0;

    if (!name || !price) {
        showToast('الرجاء إدخال اسم المنتج والسعر', 'error');
        return;
    }

    const productData = {
        name,
        description,
        price,
        image: image || 'https://via.placeholder.com/400x300?text=No+Image',
        hasDiscount: hasDiscountChecked,
        discountPercent: hasDiscountChecked ? discountPercent : 0,
        timestamp: Date.now()
    };

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
        showToast('حدث خطأ في حفظ المنتج', 'error');
    }
}

function resetProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('hasDiscount').checked = false;
    document.getElementById('discountPercent').value = '';
    document.getElementById('discountGroup').style.display = 'none';
}

// Toast Notification
function showToast(message, type = 'success') {
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

// Setup realtime after initial load
setTimeout(setupRealtimeListeners, 1000);

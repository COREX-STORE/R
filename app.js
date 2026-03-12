// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Configuration 1 (Main - for passwords and alternating products)
const firebaseConfig1 = {
    apiKey: "AIzaSyCyJ42RKLNvWhRHnhGkGsZxbhlZx5u4AGo",
    authDomain: "corex-store.firebaseapp.com",
    databaseURL: "https://corex-store-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "corex-store",
    storageBucket: "corex-store.firebasestorage.app",
    messagingSenderId: "531906370834",
    appId: "1:531906370834:web:6a2c264e36892aac8227cb"
};

// Firebase Configuration 2 (Secondary - for alternating products)
const firebaseConfig2 = {
    apiKey: "AIzaSyCCUDK1HrhU_fxoQH3-c0g_eAHdhPlm_2M",
    authDomain: "corex-store-2374d.firebaseapp.com",
    projectId: "corex-store-2374d",
    storageBucket: "corex-store-2374d.firebasestorage.app",
    messagingSenderId: "953043397413",
    appId: "1:953043397413:web:0765bf89c8089bf98908cc"
};

// Initialize Firebase apps
const app1 = initializeApp(firebaseConfig1, "app1");
const app2 = initializeApp(firebaseConfig2, "app2");

// Get database references
const db1 = getDatabase(app1);
const db2 = getDatabase(app2);

// Global state
let isAdmin = false;
let currentEditId = null;
let currentEditDb = null;
let useFirstDb = true; // Alternating flag for new products

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
        currentEditDb = null;
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
        // Check if password exists in database
        const passwordRef = ref(db1, 'admin/password');
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
    sessionStorage.setItem('corexAdmin', 'true');
    closeLoginModal();
    openSidebar();
    loadProducts(); // Reload to show admin controls
    showToast('تم تسجيل الدخول بنجاح', 'success');
}

function checkAdminSession() {
    if (sessionStorage.getItem('corexAdmin') === 'true') {
        isAdmin = true;
    }
}

function handleLogout() {
    isAdmin = false;
    sessionStorage.removeItem('corexAdmin');
    closeSidebarFn();
    loadProducts(); // Reload to hide admin controls
    showToast('تم تسجيل الخروج', 'success');
}

// Product Functions
async function loadProducts() {
    try {
        // Get products from both databases
        const [snapshot1, snapshot2] = await Promise.all([
            get(ref(db1, 'products')),
            get(ref(db2, 'products'))
        ]);

        const products = [];

        // Process first database
        if (snapshot1.exists()) {
            snapshot1.forEach((childSnapshot) => {
                products.push({
                    id: childSnapshot.key,
                    db: 'db1',
                    ...childSnapshot.val()
                });
            });
        }

        // Process second database
        if (snapshot2.exists()) {
            snapshot2.forEach((childSnapshot) => {
                products.push({
                    id: childSnapshot.key,
                    db: 'db2',
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
        <div class="product-card glass-card" data-id="${product.id}" data-db="${product.db}">
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
                        <button class="btn-edit" onclick="editProduct('${product.id}', '${product.db}')">
                            <i class="fas fa-edit"></i>
                            تعديل
                        </button>
                        <button class="btn-delete" onclick="deleteProduct('${product.id}', '${product.db}')">
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

window.editProduct = async function(id, db) {
    try {
        const database = db === 'db1' ? db1 : db2;
        const snapshot = await get(ref(database, `products/${id}`));

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
            currentEditDb = db;

            openSidebar();
            addProductForm?.classList.add('active');

            showToast('يمكنك الآن تعديل المنتج', 'success');
        }
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showToast('حدث خطأ في تحميل بيانات المنتج', 'error');
    }
};

window.deleteProduct = async function(id, db) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
        const database = db === 'db1' ? db1 : db2;
        await remove(ref(database, `products/${id}`));

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
        let database;

        if (currentEditId && currentEditDb) {
            // Update existing product
            database = currentEditDb === 'db1' ? db1 : db2;
            await update(ref(database, `products/${currentEditId}`), productData);
            showToast('تم تحديث المنتج بنجاح', 'success');
        } else {
            // Add new product - alternate between databases
            if (useFirstDb) {
                database = db1;
            } else {
                database = db2;
            }

            const newProductRef = push(ref(database, 'products'));
            await set(newProductRef, productData);

            // Toggle for next time
            useFirstDb = !useFirstDb;

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
    // Listen to both databases
    onValue(ref(db1, 'products'), () => {
        if (!currentEditId) loadProducts();
    });

    onValue(ref(db2, 'products'), () => {
        if (!currentEditId) loadProducts();
    });
}

// Setup realtime after initial load
setTimeout(setupRealtimeListeners, 1000);

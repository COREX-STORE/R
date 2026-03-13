import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfigAdmin = {
    apiKey: "AIzaSyCyJ42RKLNvWhRHnhGkGsZxbhlZx5u4AGo",
    authDomain: "corex-store.firebaseapp.com",
    databaseURL: "https://corex-store-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "corex-store",
    storageBucket: "corex-store.firebasestorage.app",
    messagingSenderId: "531906370834",
    appId: "1:531906370834:web:6a2c264e36892aac8227cb"
};

const firebaseConfigProducts = {
    apiKey: "AIzaSyCEfWL8YRWslT9B6PVBJJZSnHa3EsnFRf0",
    authDomain: "corex-store1.firebaseapp.com",
    databaseURL: "https://corex-store1-default-rtdb.firebaseio.com",
    projectId: "corex-store1",
    storageBucket: "corex-store1.firebasestorage.app",
    messagingSenderId: "280887883511",
    appId: "1:280887883511:web:1c43a6ce3ecc834a8485f2"
};

const appAdmin = initializeApp(firebaseConfigAdmin, "adminApp");
const dbAdmin = getDatabase(appAdmin);
const appProducts = initializeApp(firebaseConfigProducts, "productsApp");
const dbProducts = getDatabase(appProducts);

let isAdmin = false;
let currentEditId = null;

const adminBtn = document.getElementById('adminBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const loginForm = document.getElementById('loginForm');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebar = document.getElementById('closeSidebar');
const productsGrid = document.getElementById('productsGrid');
const addProductBtn = document.getElementById('addProductBtn');
const addProductForm = document.getElementById('addProductForm');
const saveProductBtn = document.getElementById('saveProductBtn');
const toast = document.getElementById('toast');

if (adminBtn) {
    adminBtn.onclick = () => {
        loginModal.classList.add('active');
    };
}

if (closeModal) {
    closeModal.onclick = () => {
        loginModal.classList.remove('active');
    };
}

if (sidebarOverlay) {
    sidebarOverlay.onclick = () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    };
}

if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const passwordInput = document.getElementById('password').value;

        try {
            const adminRef = ref(dbAdmin, 'admin');
            const snapshot = await get(adminRef);
            const data = snapshot.val();

            if (data && data.password === passwordInput) {
                loginModal.classList.remove('active');
                loginSuccess();
            } else {
                alert("كلمة المرور غير صحيحة.");
            }
        } catch (error) {
            console.error(error);
            alert("خطأ في الاتصال بالقاعدة.");
        }
    };
}

function loginSuccess() {
    isAdmin = true;
    if (sidebar) sidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
    if (adminBtn) adminBtn.style.display = 'none';
    showToast("تم تسجيل الدخول بنجاح", "success");
    loadProducts();
}

if (closeSidebar) {
    closeSidebar.onclick = () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    };
}

async function saveProduct() {
    if (!isAdmin) return;
    const name = document.getElementById('productName').value.trim();
    const desc = document.getElementById('productDesc').value.trim();
    const price = document.getElementById('productPrice').value.trim();
    const image = document.getElementById('productImage').value.trim();
    const hasDiscount = document.getElementById('hasDiscount').checked;
    const discountPercent = document.getElementById('discountPercent').value || 0;

    if (!name || !price) {
        showToast("يرجى إكمال البيانات", "error");
        return;
    }

    const productData = {
        name, description: desc, price,
        image: image || 'https://files.catbox.moe/y6fqhh.jpg',
        hasDiscount, discountPercent: hasDiscount ? discountPercent : 0,
        timestamp: Date.now()
    };

    try {
        if (currentEditId) {
            await update(ref(dbProducts, `products/${currentEditId}`), productData);
            showToast("تم التحديث");
        } else {
            const newRef = push(ref(dbProducts, 'products'));
            await set(newRef, productData);
            showToast("تم النشر");
        }
        resetForm();
    } catch (error) {
        showToast("فشل الحفظ", "error");
    }
}

function loadProducts() {
    onValue(ref(dbProducts, 'products'), (snapshot) => {
        const data = snapshot.val();
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        if (data) {
            Object.keys(data).reverse().forEach(id => {
                const item = data[id];
                const finalPrice = item.hasDiscount ? item.price - (item.price * (item.discountPercent / 100)) : item.price;
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${item.image}" class="product-image">
                    <div class="product-info">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <div class="price-container">
                            ${item.hasDiscount ? `<span class="old-price">${item.price} د.ع</span>` : ''}
                            <span class="current-price">${finalPrice} د.ع</span>
                        </div>
                        <div class="product-actions">
                            ${isAdmin ? `
                                <button onclick="editProduct('${id}')" class="btn-edit"><i class="fas fa-edit"></i></button>
                                <button onclick="deleteProduct('${id}')" class="btn-delete"><i class="fas fa-trash"></i></button>
                            ` : ''}
                        </div>
                    </div>`;
                productsGrid.appendChild(card);
            });
        }
    });
}

window.deleteProduct = async (id) => {
    if (isAdmin && confirm("هل تريد الحذف؟")) {
        try {
            await remove(ref(dbProducts, `products/${id}`));
            showToast("تم الحذف");
        } catch (e) { showToast("فشل الحذف", "error"); }
    }
};

window.editProduct = async (id) => {
    const snapshot = await get(ref(dbProducts, `products/${id}`));
    const item = snapshot.val();
    if (item) {
        document.getElementById('productName').value = item.name;
        document.getElementById('productDesc').value = item.description;
        document.getElementById('productPrice').value = item.price;
        document.getElementById('productImage').value = item.image;
        document.getElementById('hasDiscount').checked = item.hasDiscount;
        document.getElementById('discountPercent').value = item.discountPercent;
        currentEditId = id;
        if (addProductForm) addProductForm.classList.add('active');
    }
};

function resetForm() {
    currentEditId = null;
    document.getElementById('productName').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('hasDiscount').checked = false;
    document.getElementById('discountPercent').value = '';
    if (addProductForm) addProductForm.classList.remove('active');
}

function showToast(msg, type) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

if (saveProductBtn) saveProductBtn.onclick = saveProduct;
if (addProductBtn) addProductBtn.onclick = () => addProductForm.classList.toggle('active');

const hasDiscountCheck = document.getElementById('hasDiscount');
const discountGroup = document.getElementById('discountGroup');
if (hasDiscountCheck && discountGroup) {
    hasDiscountCheck.onchange = () => {
        discountGroup.style.display = hasDiscountCheck.checked ? 'block' : 'none';
    };
}

loadProducts();

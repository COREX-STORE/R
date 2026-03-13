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

const loginBtn = document.getElementById('loginBtn');
const adminPanel = document.getElementById('adminPanel');
const productsGrid = document.getElementById('productsGrid');
const addProductBtn = document.getElementById('addProductBtn');
const addProductForm = document.getElementById('addProductForm');
const saveProductBtn = document.getElementById('saveProductBtn');
const toast = document.getElementById('toast');

async function handleLogin() {
    const password = prompt("أدخل كلمة مرور الإدمن:");
    if (!password) return;

    try {
        const adminRef = ref(dbAdmin, 'adminConfig');
        const snapshot = await get(adminRef);
        const data = snapshot.val();

        if (data && data.password === password) {
            loginSuccess();
        } else {
            alert("كلمة المرور غير صحيحة.");
        }
    } catch (error) {
        console.error(error);
        alert("فشل التحقق: تأكد من تفعيل صلاحية القراءة في القاعدة الأولى.");
    }
}

function loginSuccess() {
    isAdmin = true;
    if (adminPanel) adminPanel.style.display = 'block';
    if (loginBtn) loginBtn.style.display = 'none';
    showToast("تم تسجيل الدخول كإدمن", "success");
    loadProducts();
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
        showToast("الرجاء إدخال البيانات الأساسية", "error");
        return;
    }

    const productData = {
        name: name,
        description: desc,
        price: price,
        image: image || 'https://files.catbox.moe/y6fqhh.jpg',
        hasDiscount: hasDiscount,
        discountPercent: hasDiscount ? discountPercent : 0,
        timestamp: Date.now()
    };

    try {
        if (currentEditId) {
            await update(ref(dbProducts, `products/${currentEditId}`), productData);
            showToast("تم التحديث بنجاح");
        } else {
            const newRef = push(ref(dbProducts, 'products'));
            await set(newRef, productData);
            showToast("تم النشر بنجاح");
        }
        resetForm();
    } catch (error) {
        console.error(error);
        showToast("خطأ: تأكد من صلاحيات الكتابة في القاعدة الثانية", "error");
    }
}

function loadProducts() {
    const productsRef = ref(dbProducts, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        if (data) {
            Object.keys(data).reverse().forEach(id => {
                const item = data[id];
                const finalPrice = item.hasDiscount 
                    ? item.price - (item.price * (item.discountPercent / 100))
                    : item.price;
                const card = document.createElement('div');
                card.className = 'product-card glass-effect';
                card.innerHTML = `
                    <img src="${item.image}">
                    <div class="product-info">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <div class="price-container">
                            ${item.hasDiscount ? `<span class="old-price">${item.price} د.ع</span>` : ''}
                            <span class="current-price">${finalPrice} د.ع</span>
                        </div>
                        <div class="actions">
                            ${isAdmin ? `
                                <button onclick="editProduct('${id}')" class="edit-btn"><i class="fas fa-edit"></i></button>
                                <button onclick="deleteProduct('${id}')" class="delete-btn"><i class="fas fa-trash"></i></button>
                            ` : ''}
                        </div>
                    </div>
                `;
                productsGrid.appendChild(card);
            });
        }
    });
}

window.deleteProduct = async (id) => {
    if (!isAdmin) return;
    if (confirm("حذف المنتج؟")) {
        try {
            await remove(ref(dbProducts, `products/${id}`));
            showToast("تم الحذف");
        } catch (error) {
            showToast("فشل الحذف", "error");
        }
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

if (loginBtn) loginBtn.addEventListener('click', handleLogin);
if (saveProductBtn) saveProductBtn.addEventListener('click', saveProduct);
if (addProductBtn) addProductBtn.addEventListener('click', () => addProductForm.classList.toggle('active'));

loadProducts();

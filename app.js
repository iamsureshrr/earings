// --- FIREBASE LIVE ENVIRONMENT CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAA60xkGygpG9no7Qbq3xsxpCO5hupDHPE",
  authDomain: "my-earings-85407.firebaseapp.com",
  databaseURL: "https://my-earings-85407-default-rtdb.firebaseio.com",
  projectId: "my-earings-85407",
  storageBucket: "my-earings-85407.firebasestorage.app",
  messagingSenderId: "637254172278",
  appId: "1:637254172278:web:33e9741e7017564a5f2957"
};
// --------------------------------------------

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let products = [];
let shoppingCart = {}; 
let isAdmin = false;
let selectedCategoryFilter = "In Stock"; 
const WHATSAPP_NUMBER = "918778096977";

// Check if URL contains '?manage=true' to load Admin features
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('manage') === 'true') {
    isAdmin = true;
    selectedCategoryFilter = "All";
    document.getElementById('add-prod-btn').style.display = "inline-flex";
    document.getElementById('store-title').innerText = "Jeevan Jewellery Admin";
    document.getElementById('chip-All').classList.add('active');
} else {
    document.getElementById('chip-InStock').classList.add('active');
}

// Real-time Database stream mapping logic
database.ref('products').on('value', (snapshot) => {
    document.getElementById('loading-indicator').style.display = 'none';
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ dbKey: key, ...data[key] });
        });
    }
    filterStore();
}, (error) => {
    alert("Database Connection Issue detected.");
});

// Render the storefront UI grids dynamically 
function filterStore() {
    const searchQuery = document.getElementById('search-box').value.toLowerCase().trim();
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.code.toLowerCase().includes(searchQuery);
        const matchesCategory = (selectedCategoryFilter === "All") || (p.status === selectedCategoryFilter);
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading" style="grid-column: span 2;">No products match.</div>';
        return;
    }

    filtered.forEach(product => {
        let overlayHTML = '';
        let displayPrice = product.price;
        let buttonHTML = `<button class="btn btn-primary" onclick="addToCart('${product.dbKey}')">Add to Cart</button>`;
        
        if (product.status === "Sold") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(220,38,38,0.5)">Sold</div>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>Sold Out</button>`;
        } else if (product.status === "Out of Stock") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(234,88,12,0.5)">Out of Stock</div>`;
            buttonHTML = `<button class="btn btn-secondary" disabled>No Stock</button>`;
        } else if (product.status === "Coming Soon") {
            overlayHTML = `<div class="status-overlay" style="background-color: rgba(30,41,59,0.6)">Coming Soon</div>`;
            displayPrice = "****";
            buttonHTML = `<button class="btn btn-secondary" disabled>Coming Soon</button>`;
        }

        let adminButtons = '';
        if (isAdmin) {
            adminButtons = `
                <div class="admin-actions">
                    <button class="btn btn-secondary" onclick="editProduct('${product.dbKey}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteProduct('${product.dbKey}')">Delete</button>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="product-card">
                <div class="img-container" onclick="openLightbox('${product.img}')">
                    <img src="${product.img}" class="product-img" alt="${product.name}">
                    ${overlayHTML}
                </div>
                <div class="product-info">
                    <div>
                        <div class="product-code">${product.code}</div>
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-price">${displayPrice}</div>
                    </div>
                    <div>
                        <div class="card-actions">${buttonHTML}</div>
                        ${adminButtons}
                    </div>
                </div>
            </div>
        `;
    });
}

// Category filter chip controller
function selectCategory(category, element) {
    selectedCategoryFilter = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    filterStore();
}

// Shopping cart items manager
function addToCart(dbKey) {
    const distinctItemsCount = Object.keys(shoppingCart).length;
    
    if (!shoppingCart[dbKey] && distinctItemsCount >= 20) {
        alert("Cart Limit Reached: You can only add up to 20 different items.");
        return;
    }

    if (shoppingCart[dbKey]) {
        if (shoppingCart[dbKey] >= 10) {
            alert("Maximum Limit: 10 units max per item.");
            return;
        }
        shoppingCart[dbKey]++;
    } else {
        shoppingCart[dbKey] = 1;
    }
    updateCartUI();
}

// Drawer dynamic incrementers and decrementers
function changeQty(dbKey, delta) {
    if (!shoppingCart[dbKey]) return;
    
    const targetQty = shoppingCart[dbKey] + delta;
    if (targetQty <= 0) {
        delete shoppingCart[dbKey];
    } else if (targetQty > 10) {
        alert("Maximum limit is 10 items.");
        return;
    } else {
        shoppingCart[dbKey] = targetQty;
    }
    updateCartUI();
    renderCartDrawer();
}

// Update totals on sticky screen overlay elements
function updateCartUI() {
    const bar = document.getElementById('cart-sticky-bar');
    const uniqueKeys = Object.keys(shoppingCart);
    
    if (uniqueKeys.length === 0) {
        bar.style.display = "none";
        return;
    }
    bar.style.display = "flex";

    let totalItems = 0;
    let totalPrice = 0;

    uniqueKeys.forEach(key => {
        const prod = products.find(p => p.dbKey === key);
        if (prod) {
            const qty = shoppingCart[key];
            totalItems += qty;
            let numericPrice = parseInt(prod.price.replace(/[^0-9]/g, '')) || 0;
            totalPrice += (numericPrice * qty);
        }
    });

    document.getElementById('cart-count').innerText = totalItems;
    document.getElementById('cart-total-price').innerText = "₹" + totalPrice;
    document.getElementById('drawer-total-price').innerText = "₹" + totalPrice;
}

function openCartDrawer() {
    renderCartDrawer();
    document.getElementById('cartDrawer').style.display = "flex";
}

function closeCartDrawer(e) {
    if (!e || e.target === document.getElementById('cartDrawer')) {
        document.getElementById('cartDrawer').style.display = "none";
    }
}

// Build list objects inside HTML cart overlay element
function renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    const uniqueKeys = Object.keys(shoppingCart);
    
    if (uniqueKeys.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">Your bag is empty!</div>';
        document.getElementById('cartDrawer').style.display = "none";
        return;
    }

    uniqueKeys.forEach(key => {
        const item = products.find(p => p.dbKey === key);
        if (item) {
            const qty = shoppingCart[key];
            container.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-code">Code: ${item.code}</span>
                    </div>
                    <div class="qty-controls">
                        <button class="btn-qty" onclick="changeQty('${key}', -1)">-</button>
                        <span style="font-weight:bold; min-width:20px; text-align:center;">${qty}</span>
                        <button class="btn-qty" onclick="changeQty('${key}', 1)">+</button>
                    </div>
                    <span style="font-weight:bold; min-width:60px; text-align:right;">${item.price}</span>
                </div>
            `;
        }
    });
}

// Compile items string layout block and redirect execution sequence directly to WhatsApp App Link
function checkoutToWhatsApp() {
    let messageText = "Hi, I want to order from *Jeevan fansy jewellery Stall*:\n\n";
    Object.keys(shoppingCart).forEach((key, idx) => {
        const item = products.find(p => p.dbKey === key);
        if (item) {
            messageText += `${idx + 1}. [${item.code}] ${item.name}\n   Qty: ${shoppingCart[key]} x ${item.price}\n`;
        }
    });
    messageText += `\n*Grand Total: ${document.getElementById('drawer-total-price').innerText}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`, '_blank');
}

// Layout visibility components
function openAdminPopup() { clearForm(); document.getElementById('adminModal').style.display = "flex"; }
function closeAdminPopup() { document.getElementById('adminModal').style.display = "none"; clearForm(); }
function openLightbox(imgSrc) { document.getElementById('modalImg').src = imgSrc; document.getElementById('imageModal').style.display = "flex"; }
function closeLightbox() { document.getElementById('imageModal').style.display = "none"; }

// Handle image conversions locally
let uploadedImageBase64 = "";
function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onloadend = function() {
        uploadedImageBase64 = reader.result;
        document.getElementById('prod-img').value = "Local Image Loaded";
    }
    if (file) reader.readAsDataURL(file);
}

// Populate product data into form inputs for editing
function editProduct(dbKey) {
    const prod = products.find(p => p.dbKey === dbKey);
    if (!prod) return;
    
    document.getElementById('product-id').value = prod.dbKey;
    document.getElementById('prod-code').value = prod.code;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-img').value = prod.img;
    document.getElementById('prod-status').value = prod.status;
    
    document.getElementById('form-title').innerText = "Edit " + prod.code;
    document.getElementById('adminModal').style.display = "flex";
}

// Secure data modifier containing admin passphrase validation
function saveProduct(e) {
    e.preventDefault();
    const dbKey = document.getElementById('product-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    let code = document.getElementById('prod-code').value.trim();
    let img = document.getElementById('prod-img').value;
    const status = document.getElementById('prod-status').value;

    if (img === "Local Image Loaded") img = uploadedImageBase64;
    if (!code) code = "EA-" + Math.floor(10 + Math.random() * 90);

    // Prompt user for authentication confirmation
    const userPass = prompt("Enter Admin Password to save changes:");
    if (!userPass) {
        alert("Action cancelled. Password is required.");
        return;
    }

    const productPayload = { code, name, price, img, status, updatedTime: Date.now() };

    const successCallback = () => {
        document.getElementById('adminModal').style.display = "none";
        clearForm();
        alert("Product saved successfully!");
    };

    const failureCallback = (err) => {
        console.error(err);
        alert("Action unsuccessful! Verify your password configuration or network properties.");
    };

    // Verify key against firebase authentication security database tab rules node
    database.ref('admin_pass').once('value').then((snapshot) => {
        if (snapshot.val() === userPass) {
            if (dbKey) {
                database.ref('products/' + dbKey).set(productPayload).then(successCallback).catch(failureCallback);
            } else {
                database.ref('products').push(productPayload).then(successCallback).catch(failureCallback);
            }
        } else {
            alert("Incorrect password! Access Denied.");
        }
    }).catch((err) => {
        alert("Error connecting to database security check node: " + err.message);
    });
}

// Secure document object removal procedure
function deleteProduct(dbKey) {
    if (confirm("Permanently delete this item?")) {
        const userPass = prompt("Enter Admin Password to confirm deletion:");
        if (!userPass) return;

        database.ref('admin_pass').once('value').then((snapshot) => {
            if (snapshot.val() === userPass) {
                database.ref('products/' + dbKey).remove().then(() => {
                    alert("Product deleted successfully!");
                }).catch((err) => {
                    alert("Delete failed: " + err.message);
                });
            } else {
                alert("Incorrect password! Access Denied.");
            }
        }).catch((err) => {
            alert("Authentication error: " + err.message);
        });
    }
}

// Clear memory cache profiles inside form input scopes
function clearForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = "";
    document.getElementById('form-title').innerText = "Add Product";
    uploadedImageBase64 = "";
}


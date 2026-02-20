// API Base URL
const API_URL = '';

// State
let products = [];
let cart = [];
let currentUser = null;

// Check authentication on page load
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (!isLoggedIn || isLoggedIn !== 'true' || !userData) {
        // Not logged in, redirect to login page
        window.location.replace('/');
        return false;
    }
    
    // Parse user data
    try {
        currentUser = JSON.parse(userData);
        
        // Display user name
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = `Hello, ${currentUser.name}!`;
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        window.location.replace('/');
        return false;
    }
    
    return true;
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('cart'); // Clear cart on logout
        window.location.replace('/');
    }
}

// Go to Home - Show all products
function goToHome() {
    // Reset category filter to "All Products"
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.value = '';
    }
    
    // Clear search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Close any open modals
    closeWishlist();
    closeOrders();
    document.getElementById('cart-sidebar').classList.remove('open');
    
    // Display all products
    displayProducts(products);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (!checkAuth()) {
        return; // Stop execution if not authenticated
    }
    
    loadProducts();
    loadCategories();
    loadCart();
    loadWishlist(); // Load user's wishlist
});

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load Categories - FIXED VERSION
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/api/categories`);
        const data = await response.json();
        const categoryFilter = document.getElementById('category-filter');
        
        // Clear existing options except "All Products" (first option)
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display Products
function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';

    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const isOutOfStock = product.stock === 0;
        const discountPrice = product.discount > 0 
            ? (product.price * (1 - product.discount / 100)).toFixed(2)
            : null;
        
        // Generate star rating
        const fullStars = Math.floor(product.rating);
        const halfStar = product.rating % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;
        const starsHTML = '⭐'.repeat(fullStars) + (halfStar ? '⭐' : '') + '☆'.repeat(emptyStars);
        
        productCard.innerHTML = `
            ${product.discount > 0 ? `<div class="discount-badge">${product.discount}% OFF</div>` : ''}
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <span class="stars">${starsHTML}</span>
                    <span class="rating-text">${product.rating} (${product.reviews_count} reviews)</span>
                </div>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <div class="price-container">
                        ${discountPrice ? `
                            <div class="product-price">$${discountPrice}</div>
                            <div class="original-price">$${product.price.toFixed(2)}</div>
                        ` : `
                            <div class="product-price">$${product.price.toFixed(2)}</div>
                        `}
                        <div class="product-stock">${product.stock} in stock</div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="wishlist-btn" onclick="toggleWishlist(${product.id})" id="wishlist-btn-${product.id}">
                        ❤️
                    </button>
                    <button 
                        class="add-to-cart-btn" 
                        onclick="addToCart(${product.id})"
                        ${isOutOfStock ? 'disabled' : ''}
                    >
                        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    // Update wishlist button states
    updateWishlistButtons();
}

// Filter by Category
function filterByCategory() {
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter.value;
    
    if (selectedCategory === '') {
        displayProducts(products);
    } else {
        const filtered = products.filter(p => p.category === selectedCategory);
        displayProducts(filtered);
    }
}

// Add to Cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;

    const existingItem = cart.find(item => item.product_id === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert('Cannot add more items. Stock limit reached.');
            return;
        }
    } else {
        cart.push({
            product_id: productId,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartDisplay();
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Added!';
    btn.style.backgroundColor = '#10b981';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
    }, 1000);
}

// Update Cart Display
function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update items
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        cartTotal.textContent = '$0.00';
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return;
        
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-price">$${product.price.toFixed(2)}</div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${product.id}, -1)">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${product.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${product.id})">Remove</button>
                </div>
            </div>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    cartTotal.textContent = `$${total.toFixed(2)}`;
}

// Update Quantity
function updateQuantity(productId, change) {
    const product = products.find(p => p.id === productId);
    const item = cart.find(i => i.product_id === productId);
    
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > product.stock) {
        alert('Cannot add more items. Stock limit reached.');
        return;
    }
    
    item.quantity = newQuantity;
    saveCart();
    updateCartDisplay();
}

// Remove from Cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    saveCart();
    updateCartDisplay();
}

// Toggle Cart
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    cartSidebar.classList.toggle('open');
}

// Show Checkout
function showCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    
    // Display items
    checkoutItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return;
        
        const itemTotal = product.price * item.quantity;
        total += itemTotal;
        
        const checkoutItem = document.createElement('div');
        checkoutItem.className = 'checkout-item';
        checkoutItem.innerHTML = `
            <span>${product.name} x ${item.quantity}</span>
            <span>$${itemTotal.toFixed(2)}</span>
        `;
        checkoutItems.appendChild(checkoutItem);
    });
    
    checkoutTotal.textContent = `$${total.toFixed(2)}`;
    checkoutModal.classList.add('open');
}

// Close Checkout
function closeCheckout() {
    const checkoutModal = document.getElementById('checkout-modal');
    checkoutModal.classList.remove('open');
    document.getElementById('checkout-form').reset();
}

// Submit Order
async function submitOrder(event) {
    event.preventDefault();
    
    const customerName = document.getElementById('customer-name').value;
    const customerEmail = document.getElementById('customer-email').value;
    const shippingAddress = document.getElementById('shipping-address').value;
    const paymentMethod = document.getElementById('payment-method').value;
    
    const total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product_id);
        return sum + (product.price * item.quantity);
    }, 0);
    
    const orderData = {
        user_id: currentUser.id,
        items: cart,
        total: total,
        customer_name: customerName,
        customer_email: customerEmail,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        status: "Pending"
    };
    
    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Order failed');
        }
        
        const order = await response.json();
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartDisplay();
        
        // Close checkout modal
        closeCheckout();
        
        // Show success modal
        document.getElementById('order-id').textContent = order.id;
        document.getElementById('success-modal').classList.add('open');
        
        // Reload products to update stock
        loadProducts();
        
    } catch (error) {
        alert('Error placing order: ' + error.message);
        console.error('Error:', error);
    }
}

// Close Success Modal
function closeSuccess() {
    document.getElementById('success-modal').classList.remove('open');
    toggleCart();
}

// Local Storage Functions
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// ===== NEW FEATURES =====

// Search Functionality
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (event.key === 'Enter') {
            performSearch();
        }
    }, 300);
}

async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        displayProducts(products);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/products/search/${encodeURIComponent(query)}`);
        const results = await response.json();
        displayProducts(results);
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Wishlist Functionality
let userWishlist = [];

async function loadWishlist() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/api/wishlist/${currentUser.id}`);
        userWishlist = await response.json();
        updateWishlistButtons();
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

async function toggleWishlist(productId) {
    if (!currentUser) return;
    
    const isInWishlist = userWishlist.some(item => item.id === productId);
    
    if (isInWishlist) {
        // Remove from wishlist
        try {
            await fetch(`${API_URL}/api/wishlist/${currentUser.id}/${productId}`, {
                method: 'DELETE'
            });
            await loadWishlist();
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            alert('Failed to remove from wishlist');
        }
    } else {
        // Add to wishlist
        try {
            const response = await fetch(`${API_URL}/api/wishlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: productId
                })
            });
            
            if (response.ok) {
                await loadWishlist();
            }
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            alert('Failed to add to wishlist');
        }
    }
}

function updateWishlistButtons() {
    userWishlist.forEach(item => {
        const btn = document.getElementById(`wishlist-btn-${item.id}`);
        if (btn) {
            btn.classList.add('active');
        }
    });
}

async function showWishlist() {
    const modal = document.getElementById('wishlist-modal');
    const container = document.getElementById('wishlist-items');
    
    try {
        const response = await fetch(`${API_URL}/api/wishlist/${currentUser.id}`);
        const wishlistItems = await response.json();
        
        if (wishlistItems.length === 0) {
            container.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
        } else {
            container.innerHTML = '';
            wishlistItems.forEach(product => {
                const item = document.createElement('div');
                item.className = 'wishlist-item';
                item.innerHTML = `
                    <img src="${product.image}" alt="${product.name}" class="wishlist-item-image">
                    <div class="wishlist-item-info">
                        <div class="wishlist-item-name">${product.name}</div>
                        <div class="wishlist-item-price">$${product.price.toFixed(2)}</div>
                        <div class="wishlist-item-actions">
                            <button class="move-to-cart-btn" onclick="moveToCart(${product.id})">
                                Add to Cart
                            </button>
                            <button class="remove-wishlist-btn" onclick="removeFromWishlistModal(${product.id})">
                                Remove
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        }
        
        modal.classList.add('open');
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

function closeWishlist() {
    document.getElementById('wishlist-modal').classList.remove('open');
}

async function moveToCart(productId) {
    addToCart(productId);
    await toggleWishlist(productId);
    showWishlist(); // Refresh wishlist display
}

async function removeFromWishlistModal(productId) {
    await toggleWishlist(productId);
    showWishlist(); // Refresh wishlist display
}

// Orders History
async function showOrders() {
    const modal = document.getElementById('orders-modal');
    const container = document.getElementById('orders-content');
    
    try {
        const response = await fetch(`${API_URL}/api/orders/user/${currentUser.id}`);
        const orders = await response.json();
        
        if (orders.length === 0) {
            container.innerHTML = '<div class="orders-empty">You haven\'t placed any orders yet</div>';
        } else {
            container.innerHTML = '';
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                
                const orderDate = new Date(order.created_at).toLocaleDateString();
                
                let itemsHTML = '';
                order.items.forEach(item => {
                    const product = products.find(p => p.id === item.product_id);
                    if (product) {
                        itemsHTML += `
                            <div class="order-item">
                                <span>${product.name} x ${item.quantity}</span>
                                <span>$${(product.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `;
                    }
                });
                
                orderCard.innerHTML = `
                    <div class="order-header">
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-status ${order.status.toLowerCase()}">${order.status}</div>
                    </div>
                    <div class="order-items">
                        ${itemsHTML}
                    </div>
                    <div class="order-footer">
                        <div class="order-date">Placed on ${orderDate}</div>
                        <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                    </div>
                    <div style="margin-top: 0.75rem; color: var(--text-light); font-size: 0.9rem;">
                        Payment: ${order.payment_method}
                    </div>
                `;
                
                container.appendChild(orderCard);
            });
        }
        
        modal.classList.add('open');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function closeOrders() {
    document.getElementById('orders-modal').classList.remove('open');
}

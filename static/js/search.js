document.addEventListener("DOMContentLoaded", function () {
  const categorySelect = document.getElementById("category-select");
  const searchInput = document.querySelector("#search-form input");
  const productList = document.getElementById("product-list");
  const cartContainer = document.getElementById("cart-items");

  // Create success message div and append it directly below the header
  const successMessage = document.createElement("div");
  successMessage.className = "success-message";
  successMessage.style.padding = "10px 15px";
  successMessage.style.backgroundColor = "green";
  successMessage.style.color = "white";
  successMessage.style.borderRadius = "5px";
  successMessage.style.textAlign = "center";
  successMessage.style.marginTop = "10px";
  successMessage.style.display = "none";

  const header = document.querySelector("header");
  if (header) {
    header.parentNode.insertBefore(successMessage, header.nextSibling);
  }

  if (!categorySelect || !searchInput || !productList || !cartContainer) {
    console.error("Error: Elements not found in DOM.");
    return;
  }

  function fetchProducts(category = "", searchQuery = "") {
    let url = "/api/products";
    let params = new URLSearchParams();

    if (category) params.append("category", category);
    if (searchQuery) params.append("search", searchQuery);

    if (params.toString()) {
      url += "?" + params.toString();
    }

    fetch(url)
      .then(response => response.json())
      .then(products => {
        productList.innerHTML = "";

        if (products.length === 0) {
          productList.innerHTML = "<p class='text-center'>No products found.</p>";
          return;
        }

        products.forEach(product => {
          const productHTML = generateProductHTML(product);
          productList.innerHTML += productHTML;
        });

        attachEventListeners(products);
      })
      .catch(error => console.error("Error fetching products:", error));
  }

  function generateProductHTML(product) {
    const productPrice = product.price ? product.price.toFixed(2) : "0.00";
    const productImage = product.image_path || "../static/images/default-product.png";
    const productStock = product.stock || 0;
    const taxApplicable = product.tax_applicable || false;

    return `
      <div class="col">
        <div class="product-item">
          <span class="badge bg-success position-absolute m-3">-30%</span>
          <a href="#" class="btn-wishlist">
            <svg width="24" height="24"><use xlink:href="#heart"></use></svg>
          </a>
          <figure>
            <a href="#" title="${product.name}">
              <img src="${productImage}" class="tab-image" alt="${product.name}">
            </a>
          </figure>
          <h3>${product.name}</h3>
          <span class="qty">Stock: ${productStock} Units</span>
          <span class="rating">
            <svg width="24" height="24" class="text-primary"><use xlink:href="#star-solid"></use></svg> 4.5
          </span>
          <span class="price">$${productPrice}</span>
          <div class="d-flex align-items-center justify-content-between">
            <div class="input-group product-qty">
              <span class="input-group-btn">
                <button type="button" class="quantity-left-minus btn btn-danger btn-number" data-type="minus" data-product-id="${product.id}">
                  <svg width="16" height="16"><use xlink:href="#minus"></use></svg>
                </button>
              </span>
              <input type="text" class="form-control input-number quantity-input" value="1" data-product-id="${product.id}">
              <span class="input-group-btn">
                <button type="button" class="quantity-right-plus btn btn-success btn-number" data-type="plus" data-product-id="${product.id}">
                  <svg width="16" height="16"><use xlink:href="#plus"></use></svg>
                </button>
              </span>
            </div>
            <a href="#" class="nav-link btn-add-to-cart" data-product-id="${product.id}" data-is-tax-applicable="${taxApplicable}" data-stock="${productStock}">
              Add to Cart 🛒
            </a>
          </div>
        </div>
      </div>
    `;
  }

  function attachEventListeners(products) {
    document.querySelectorAll(".btn-add-to-cart").forEach(button => {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        const productId = this.dataset.productId;
        const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        const quantity = parseInt(quantityInput.value);
        const isTaxApplicable = this.dataset.isTaxApplicable === "true";
        const availableStock = parseInt(this.dataset.stock);

        const product = products.find(product => product.id === parseInt(productId));
        if (!product || quantity > availableStock) {
          showErrorMessage("Not enough stock available. Please reduce the quantity.");
          return;
        }

        let productPrice = parseFloat(product.price);
        if (isTaxApplicable) {
          productPrice *= 1.05; // Apply 5% tax if GST is applicable
        }

        addToCart(productId, quantity, productPrice, product.name);
      });
    });

    document.querySelectorAll(".quantity-right-plus").forEach(button => {
      button.addEventListener("click", function () {
        const productId = this.dataset.productId;
        const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        quantityInput.value = (parseInt(quantityInput.value) || 1) + 1;
      });
    });

    document.querySelectorAll(".quantity-left-minus").forEach(button => {
      button.addEventListener("click", function () {
        const productId = this.dataset.productId;
        const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        let currentValue = parseInt(quantityInput.value) || 1;
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
        }
      });
    });
  }

  function addToCart(productId, quantity, price, productName) {
    const isTaxApplicable = event.target.dataset.isTaxApplicable === "true"; // Use event.target instead of this
    
    // Apply 5% GST if applicable
    if (isTaxApplicable) {
      price *= 1.05;  // Add 5% GST
    }
  
    fetch("/add-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity, price })  // Send the price after GST
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateCartSidebar();  // Update the cart sidebar after adding the item
          showSuccessMessage(`${productName} added to cart!`);
        } else {
          showErrorMessage("Failed to add item to cart. Please try again.");
        }
      })
      .catch(error => {
        console.error("Error adding to cart:", error);
        showErrorMessage("An error occurred while adding to the cart.");
      });
  }
  
  
  
  function updateCartSidebar() {
    fetch("/cart")
      .then(response => response.json())
      .then(cartItems => {
        cartContainer.innerHTML = "";
        let totalAmount = 0;  // Initialize total amount
  
        if (cartItems.length === 0) {
          cartContainer.innerHTML = "<p class='text-center'>Your cart is empty.</p>";
          document.getElementById("cart-total").textContent = "$0.00";  // Update total to $0
          return;
        }
  
        cartItems.forEach(item => {
          let itemTotalPrice = item.total_price;
  
          // Apply GST again if applicable
          if (item.is_tax_applicable) {
            itemTotalPrice *= 1.05;  // Add 5% GST again if tax is applicable
          }
  
          cartContainer.innerHTML += `
            <div class="cart-item d-flex justify-content-between align-items-center border-bottom py-2">
              <div><h6>${item.name}</h6><p>${item.quantity} x $${item.price.toFixed(2)}</p></div>
              <strong>$${itemTotalPrice.toFixed(2)}</strong>
            </div>
          `;
          totalAmount += itemTotalPrice;  // Add to total amount
        });
  
        // Apply GST to the total amount
        totalAmount *= 1.05; // Add 5% GST to the total
  
        // Update total amount in the cart sidebar
        document.getElementById("cart-total").textContent = `$${totalAmount.toFixed(2)}`;
      });
  }
  
  
  
  

  function showSuccessMessage(message) {
    successMessage.innerText = message;
    successMessage.style.backgroundColor = "green"; // Reset to green
    successMessage.style.display = "block";

    setTimeout(() => {
        successMessage.style.display = "none";
    }, 3000);
}

  function showErrorMessage(message) {
    successMessage.innerText = message;
    successMessage.style.backgroundColor = "red"; // Set error background
    successMessage.style.display = "block";

    setTimeout(() => {
        successMessage.style.display = "none";
    }, 3000);
}

  // Initial fetch of products
  fetchProducts();

  // Auto-update cart every 1 second
  setInterval(updateCartSidebar, 1000);

  // Event listeners for category selection and search
  categorySelect.addEventListener("change", () => fetchProducts(categorySelect.value, searchInput.value.trim()));
  searchInput.addEventListener("input", () => fetchProducts(categorySelect.value, searchInput.value.trim()));
});

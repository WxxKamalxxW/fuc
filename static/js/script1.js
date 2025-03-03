document.addEventListener("DOMContentLoaded", function () {
  fetch("/api/products")
    .then(response => response.json())
    .then(products => {
      console.log(products); // Log products to check the data
      const productList = document.getElementById("product-list");
      if (!productList) {
        console.error("Error: #product-list not found in DOM.");
        return;
      }
      productList.innerHTML = ""; // Clear previous content

      products.forEach(product => {
        const productPrice = typeof product.price === "number" ? product.price.toFixed(2) : "0.00";
        const productImage = product.image_path || "../static/images/default-product.png";
        const productStock = product.stock || 0; // Ensure stock is available

        const productHTML = `
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
              <span class="qty">Stock: ${productStock || 0}</span> <!-- Fallback if stock is undefined -->
              <span class="rating">
                <svg width="24" height="24" class="text-primary"><use xlink:href="#star-solid"></use></svg> 4.5
              </span>
              <span class="price">$${productPrice}</span>
              <div class="d-flex align-items-center justify-content-between">
                <div class="input-group product-qty">
                  <span class="input-group-btn">
                    <button type="button" class="quantity-left-minus btn btn-danger btn-number" data-id="${product.id}" data-type="minus">
                      <svg width="16" height="16"><use xlink:href="#minus"></use></svg>
                    </button>
                  </span>
                  <input type="text" class="form-control input-number quantity-input" value="1" data-id="${product.id}" data-stock="${productStock}" readonly>
                  <span class="input-group-btn">
                    <button type="button" class="quantity-right-plus btn btn-success btn-number" data-id="${product.id}" data-type="plus">
                      <svg width="16" height="16"><use xlink:href="#plus"></use></svg>
                    </button>
                  </span>
                </div>
                <a href="#" class="nav-link add-to-cart" data-id="${product.id}">Add to Cart <iconify-icon icon="uil:shopping-cart"></iconify-icon></a>
              </div>
            </div>
          </div>
        `;

        console.log(productHTML); // Log the HTML to check the structure
        productList.innerHTML += productHTML;
      });

      // Maintain row structure (max 5 per row)
      while (productList.children.length % 5 !== 0) {
        productList.innerHTML += `<div class="col"></div>`;
      }

      // Attach event listeners for quantity buttons
      document.querySelectorAll(".quantity-left-minus, .quantity-right-plus").forEach(button => {
        button.addEventListener("click", function () {
          const buttonType = this.getAttribute("data-type");
          const productId = this.getAttribute("data-id");
          const input = document.querySelector(`.quantity-input[data-id="${productId}"]`);
          const maxStock = parseInt(input.getAttribute("data-stock"), 10);
          let currentValue = parseInt(input.value, 10);

          if (buttonType === "plus" && currentValue < maxStock) {
            input.value = currentValue + 1;
          } else if (buttonType === "minus" && currentValue > 1) {
            input.value = currentValue - 1;
          }

          // Disable buttons based on conditions
          const minusButton = document.querySelector(`.quantity-left-minus[data-id="${productId}"]`);
          const plusButton = document.querySelector(`.quantity-right-plus[data-id="${productId}"]`);
          minusButton.disabled = input.value <= 1;
          plusButton.disabled = input.value >= maxStock;
        });
      });

      // Attach event listener for Add to Cart
      document.querySelectorAll(".add-to-cart").forEach(button => {
        button.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-id");
          const input = document.querySelector(`.quantity-input[data-id="${productId}"]`);
          const quantity = parseInt(input.value, 10);
          const maxStock = parseInt(input.getAttribute("data-stock"), 10);

          if (quantity > maxStock) {
            alert("Cannot add more than available stock!");
            return;
          }

          console.log(`Product ID: ${productId}, Quantity: ${quantity}`);
          // TODO: Send this data to your backend for further processing
        });
      });
    })
    .catch(error => console.error("Error fetching products:", error));
});

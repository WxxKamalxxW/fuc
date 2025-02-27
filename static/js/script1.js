document.addEventListener("DOMContentLoaded", function () {
  fetch("/api/products")
    .then(response => response.json())
    .then(products => {
      const productList = document.getElementById("product-list");
      if (!productList) {
        console.error("Error: #product-list not found in DOM.");
        return;
      }
      productList.innerHTML = ""; // Clear previous content

      products.forEach(product => {
        const productPrice = typeof product.price === "number" ? product.price.toFixed(2) : "0.00";
        const productImage = product.image_path || "../static/images/default-product.png";

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
              <span class="qty">1 Unit</span>
              <span class="rating">
                <svg width="24" height="24" class="text-primary"><use xlink:href="#star-solid"></use></svg> 4.5
              </span>
              <span class="price">$${productPrice}</span>
              <div class="d-flex align-items-center justify-content-between">
                <div class="input-group product-qty">
                  <span class="input-group-btn">
                    <button type="button" class="quantity-left-minus btn btn-danger btn-number" data-type="minus">
                      <svg width="16" height="16"><use xlink:href="#minus"></use></svg>
                    </button>
                  </span>
                  <input type="text" class="form-control input-number quantity-input" value="1">
                  <span class="input-group-btn">
                    <button type="button" class="quantity-right-plus btn btn-success btn-number" data-type="plus">
                      <svg width="16" height="16"><use xlink:href="#plus"></use></svg>
                    </button>
                  </span>
                </div>
                <a href="#" class="nav-link">Add to Cart <iconify-icon icon="uil:shopping-cart"></iconify-icon></a>
              </div>
            </div>
          </div>
        `;
        productList.innerHTML += productHTML;
      });

      // ✅ Maintain row structure (max 5 per row)
      while (productList.children.length % 5 !== 0) {
        productList.innerHTML += `<div class="col"></div>`; // Adds empty placeholders
      }
    })
    .catch(error => console.error("Error fetching products:", error));
});
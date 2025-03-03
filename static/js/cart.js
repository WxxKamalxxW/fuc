document.addEventListener("DOMContentLoaded", function () {
    const cartContainer = document.getElementById("cart-items");
    const cartCountElement = document.getElementById("cart-count"); 
    const cartTotalAmountElement = document.getElementById("cart-total-amount"); // Add reference for total amount

    const successMessage = document.createElement("div");
    successMessage.className = "success-message";
    successMessage.style.padding = "10px 15px";
    successMessage.style.color = "white";
    successMessage.style.borderRadius = "5px";
    successMessage.style.textAlign = "center";
    successMessage.style.marginTop = "10px";  
    successMessage.style.display = "none";
  
    const header = document.querySelector("header");
    if (header) {
        header.parentNode.insertBefore(successMessage, header.nextSibling);
    }
  
    if (!cartContainer || !cartTotalAmountElement) {
        console.error("Error: Cart container or total amount element not found in DOM.");
        return;
    }

    let cart = [];

    function attachEventListeners(products) {
        document.querySelectorAll(".btn-add-to-cart").forEach(button => {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                const productId = this.dataset.productId;
                const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                let quantity = parseInt(quantityInput.value);
                const isTaxApplicable = this.dataset.isTaxApplicable === "true";
                let availableStock = parseInt(this.dataset.stock);
    
                const product = products.find(product => product.id === parseInt(productId));
                if (!product || quantity > availableStock) {
                    showErrorMessage("Not enough stock available. Please reduce the quantity.");
                    return;
                }

                // Decrease the available stock by the quantity added to cart
                availableStock -= quantity;
                this.dataset.stock = availableStock;
    
                let productPrice = parseFloat(product.price);
                if (isTaxApplicable) {
                    productPrice *= 1.05; // Apply 5% tax if GST is applicable
                }
    
                fetch("/add-to-cart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: quantity,
                        price: productPrice
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        addToCart(productId, quantity, productPrice, product.name); // Add to cart function
                        showSuccessMessage(`${product.name} added to cart!`);
                        updateStockDisplay(); 
                    } else {
                        showErrorMessage("Failed to add product to cart.");
                    }
                })
                .catch(() => {
                    showErrorMessage("An error occurred. Please try again.");
                });
            });
        });
    }

    function addToCart(productId, quantity, price, productName) {
        const existingProduct = cart.find(item => item.productId === productId);
        if (existingProduct) {
            existingProduct.quantity += quantity; // Update the quantity of the existing product in the cart
            existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
        } else {
            cart.push({
                productId,
                quantity,
                price,
                totalPrice: quantity * price,
                productName
            });
        }
        updateCart(); // Update cart with the new item
    }

    function updateCart() {
        let totalAmount = 0;
        cartContainer.innerHTML = ""; // Clear current cart content

        if (cart.length === 0) {
            cartContainer.innerHTML = "<p class='text-center'>Your cart is empty.</p>";
            cartCountElement.textContent = "0";
            cartTotalAmountElement.textContent = "$0.00"; // Set total to $0 if the cart is empty
            return;
        }

        cart.forEach(item => {
            cartContainer.innerHTML += `
                <div class="cart-item d-flex justify-content-between align-items-center border-bottom py-2">
                    <div><h6>${item.productName}</h6><p>${item.quantity} x $${item.price.toFixed(2)}</p></div>
                    <strong>$${item.totalPrice.toFixed(2)}</strong>
                </div>
            `;
            totalAmount += item.totalPrice; // Add each item's total price to the totalAmount
        });

        cartCountElement.textContent = cart.reduce((total, item) => total + item.quantity, 0); // Update cart count
        cartTotalAmountElement.textContent = `$${totalAmount.toFixed(2)}`; // Update the total amount in the cart
    }

    function updateStockDisplay() {
        document.querySelectorAll('.btn-add-to-cart').forEach(button => {
            const productId = button.dataset.productId;
            const stock = parseInt(button.dataset.stock);
            const stockDisplay = document.querySelector(`.stock-display[data-product-id="${productId}"]`);
            
            if (stockDisplay) {
                stockDisplay.textContent = `Stock: ${stock}`;
            }

            // Disable the button if stock reaches 0
            if (stock === 0) {
                button.disabled = true;
            } else {
                button.disabled = false;
            }
        });
    }

    function showSuccessMessage(message) {
        successMessage.innerText = message;
        successMessage.style.backgroundColor = "green"; // Success message in green
        successMessage.style.display = "block";

        setTimeout(() => {
            successMessage.style.display = "none";
        }, 3000);
    }

    function showErrorMessage(message) {
        successMessage.innerText = message;
        successMessage.style.backgroundColor = "red"; // Error message in red
        successMessage.style.display = "block";

        setTimeout(() => {
            successMessage.style.display = "none";
        }, 3000);
    }

    // Initial cart load
    updateCart(); 

    // Attach event listeners for add-to-cart buttons
    attachEventListeners([]);
});

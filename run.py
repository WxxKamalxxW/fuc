from flask import Flask, jsonify, render_template, request
from flask_mysqldb import MySQL

app = Flask(__name__, static_folder="static", template_folder="templates")

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'kamal'
app.config['MYSQL_DB'] = 'login'
mysql = MySQL(app)

# Enable CORS for frontend communication
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Serve frontend
@app.route("/")
def home():
    return render_template("index.html")

# Fetch categories
@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT name FROM categories")
        categories = cur.fetchall()
        cur.close()
        return jsonify([{"name": row[0]} for row in categories])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Fetch products with category and search filtering
@app.route("/api/products", methods=["GET"])
def get_products():
    category_name = request.args.get("category", "")
    search_query = request.args.get("search", "")
    user_id = request.args.get("user_id")

    try:
        cur = mysql.connection.cursor()

        query = """
        SELECT p.id, p.name, 
               COALESCE(cp.price, p.default_price) AS price, 
               p.image_path, p.stock
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN customer_prices cp ON p.id = cp.product_id AND cp.user_id = %s
        WHERE (%s = '' OR c.name = %s)
        AND (%s = '' OR p.name LIKE CONCAT('%%', %s, '%%'))
        """
        cur.execute(query, (user_id, category_name, category_name, search_query, search_query))

        products = cur.fetchall()
        cur.close()

        return jsonify([
            {
                "id": row[0],
                "name": row[1],
                "price": float(row[2]) if row[2] is not None else 0.0,
                "image_path": row[3] if row[3] else "../static/images/default-product.png",
                "stock": int(row[4]) if row[4] is not None else 0
            }
            for row in products
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add product to cart
@app.route("/add-to-cart", methods=["POST"])
def add_to_cart():
    try:
        data = request.get_json()
        print(f"Received data: {data}")  # Add this line to see the data coming in
        user_id = data.get("user_id", 1)
        product_id = data.get("product_id")
        quantity = data.get("quantity")

        if not all([user_id, product_id, quantity]):
            return jsonify({"error": "Missing required fields"}), 400

        cur = mysql.connection.cursor()

        # Check stock availability
        cur.execute("SELECT stock FROM products WHERE id = %s", (product_id,))
        product_data = cur.fetchone()
        if not product_data or product_data[0] < quantity:
            return jsonify({"error": "Insufficient stock"}), 400

        # Get customer-specific price
        cur.execute("SELECT COALESCE(cp.price, p.default_price) FROM products p LEFT JOIN customer_prices cp ON p.id = cp.product_id AND cp.user_id = %s WHERE p.id = %s", (user_id, product_id))
        price_data = cur.fetchone()
        price = price_data[0] if price_data else 0.0

        # Check if product is already in cart
        cur.execute("SELECT quantity FROM cart WHERE product_id = %s AND user_id = %s", (product_id, user_id))
        cart_item = cur.fetchone()

        if cart_item:
            cur.execute("UPDATE cart SET quantity = quantity + %s WHERE product_id = %s AND user_id = %s",
                        (quantity, product_id, user_id))
        else:
            cur.execute("INSERT INTO cart (user_id, product_id, quantity) VALUES (%s, %s, %s)",
                        (user_id, product_id, quantity))

        # Deduct stock from products
        cur.execute("UPDATE products SET stock = stock - %s WHERE id = %s", (quantity, product_id))

        mysql.connection.commit()
        cur.close()

        return jsonify({"success": True, "message": "Product added to cart!"}), 200
    except Exception as e:
        print(f"Error: {str(e)}")  # Log the error
        return jsonify({"error": str(e)}), 500


# Fetch user's cart
@app.route("/cart", methods=["GET"])
def get_cart():
    try:
        user_id = request.args.get("user_id", 1)
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT c.cart_id, p.name, c.quantity, 
                   COALESCE(cp.price, p.default_price) AS price, 
                   (c.quantity * COALESCE(cp.price, p.default_price)) AS total_price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN customer_prices cp ON p.id = cp.product_id AND cp.user_id = %s
            WHERE c.user_id = %s
        """, (user_id, user_id))

        cart_items = cur.fetchall()
        cur.close()

        return jsonify([
            {
                "cart_id": row[0],
                "name": row[1],
                "quantity": row[2],
                "price": float(row[3]),
                "total_price": float(row[4])
            }
            for row in cart_items
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Place order
@app.route("/place-order", methods=["POST"])
def place_order():
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        cur = mysql.connection.cursor()

        # Calculate total price
        cur.execute("""
            SELECT SUM(c.quantity * COALESCE(cp.price, p.default_price))
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN customer_prices cp ON p.id = cp.product_id AND cp.user_id = %s
            WHERE c.user_id = %s
        """, (user_id, user_id))
        total_price = cur.fetchone()[0]

        if total_price is None:
            return jsonify({"error": "Cart is empty"}), 400

        # Insert into orders
        cur.execute("INSERT INTO orders (user_id, total_price) VALUES (%s, %s)", (user_id, total_price))
        order_id = cur.lastrowid

        # Move cart items to order_items
        cur.execute("""
            INSERT INTO order_items (order_id, product_id, quantity, price_at_time)
            SELECT %s, c.product_id, c.quantity, COALESCE(cp.price, p.default_price)
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN customer_prices cp ON p.id = cp.product_id AND cp.user_id = %s
            WHERE c.user_id = %s
        """, (order_id, user_id, user_id))

        # Clear cart
        cur.execute("DELETE FROM cart WHERE user_id = %s", (user_id,))

        mysql.connection.commit()
        cur.close()

        return jsonify({"success": True, "message": "Order placed successfully!", "order_id": order_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8000)

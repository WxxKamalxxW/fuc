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

# Fetch all categories
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

# Fetch products (filtered by category and search query if provided)
@app.route("/api/products", methods=["GET"])
def get_products():
    category_name = request.args.get("category", "")
    search_query = request.args.get("search", "")

    try:
        cur = mysql.connection.cursor()

        query = """
        SELECT p.id, p.name, p.default_price, p.image_path 
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE (%s = '' OR c.name = %s)
        AND (%s = '' OR p.name LIKE CONCAT('%%', %s, '%%'))
        """
        cur.execute(query, (category_name, category_name, search_query, search_query))

        products = cur.fetchall()
        cur.close()

        product_list = [
            {
                "id": row[0],
                "name": row[1],
                "price": float(row[2]) if row[2] is not None else 0.0,
                "image_path": row[3] if row[3] else "../static/images/default-product.png"
            }
            for row in products
        ]

        return jsonify(product_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8000)

-- Create tables for food_ordering database in SQLite3

-- Table: category
CREATE TABLE category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: menu
CREATE TABLE menu (
    menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES category (category_id)
);

-- Table: customer
CREATE TABLE customer (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    address TEXT,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: orders
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
);

-- Table: order_detail
CREATE TABLE order_detail (
    order_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    subtotal REAL NOT NULL,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (order_id),
    FOREIGN KEY (menu_id) REFERENCES menu (menu_id)
);

-- Table: payment
CREATE TABLE payment (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (order_id)
);

-- Insert some sample categories
INSERT INTO category (name, description) VALUES
    ('Makanan Berat', 'Menu makanan utama dan mengenyangkan'),
    ('Minuman', 'Berbagai jenis minuman segar'),
    ('Dessert', 'Makanan pencuci mulut dan camilan manis');

-- Insert some sample menu items
INSERT INTO menu (category_id, name, description, price, image_url) VALUES
    (1, 'Nasi Goreng', 'Nasi goreng spesial dengan telur dan ayam', 25000, 'nasigoreng.jpg'),
    (1, 'Mie Goreng', 'Mie goreng dengan sayuran dan bakso', 22000, 'miegoreng.jpg'),
    (2, 'Es Teh', 'Teh manis dingin', 8000, 'esteh.jpg'),
    (2, 'Jus Jeruk', 'Jus jeruk segar', 12000, 'jusjeruk.jpg'),
    (3, 'Es Krim', 'Es krim vanilla dengan topping coklat', 15000, 'eskrim.jpg'),
    (3, 'Pudding', 'Pudding coklat dengan saus vanilla', 13000, 'pudding.jpg');
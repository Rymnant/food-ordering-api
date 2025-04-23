# Food Ordering RESTful API with SQLite3

This project implements a RESTful API for a food ordering system using Node.js, Express, and SQLite3 as the database.

## Database Structure

The database contains the following tables:
- category: Stores food categories
- menu: Stores menu items
- customer: Stores customer information
- orders: Stores order information
- order_detail: Stores the details of items in an order
- payment: Stores payment information

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on port 6900 by default (http://localhost:6900).

## API Endpoints

### Menu Endpoints

1. **Get All Menus**
   - Method: GET
   - URL: `/menus`
   - Query Parameters:
     - `category_id` (optional): Filter menus by category
   - Example: `GET /menus` or `GET /menus?category_id=1`

2. **Get Menu Details**
   - Method: GET
   - URL: `/menus/{menu_id}`
   - Example: `GET /menus/1`

### Customer Endpoints

3. **Register New Customer**
   - Method: POST
   - URL: `/customers`
   - Body:
     ```json
     {
       "name": "John Doe",
       "email": "john@example.com",
       "phone": "081234567890",
       "address": "Jl. Contoh No. 123"
     }
     ```

4. **Get Customer Details**
   - Method: GET
   - URL: `/customers/{customer_id}`
   - Example: `GET /customers/1`

### Order Endpoints

5. **Create New Order**
   - Method: POST
   - URL: `/orders`
   - Body:
     ```json
     {
       "customer_id": 1
     }
     ```

6. **Get Customer Orders**
   - Method: GET
   - URL: `/orders?customer_id={customer_id}`
   - Example: `GET /orders?customer_id=1`

7. **Get Order Details**
   - Method: GET
   - URL: `/orders/{order_id}`
   - Example: `GET /orders/1`

8. **Add Item to Order**
   - Method: POST
   - URL: `/order_details`
   - Body:
     ```json
     {
       "order_id": 1,
       "menu_id": 2,
       "quantity": 3
     }
     ```

### Payment Endpoints

9. **Create Payment**
   - Method: POST
   - URL: `/payments`
   - Body:
     ```json
     {
       "order_id": 1,
       "amount": 75000,
       "payment_method": "cash"
     }
     ```

10. **Get Payment Details**
    - Method: GET
    - URL: `/payments/{order_id}`
    - Example: `GET /payments/1`

### Additional Endpoints

11. **Get All Categories**
    - Method: GET
    - URL: `/categories`
    - Example: `GET /categories`

## Example Usage Flow

1. Get all menu items: `GET /menus`
2. Register a new customer: `POST /customers`
3. Create a new order: `POST /orders`
4. Add items to the order: `POST /order_details`
5. Create a payment for the order: `POST /payments`
6. Check the order status: `GET /orders/{order_id}`

## Notes

- The database is automatically initialized with sample data when the server starts for the first time.
- All tables include a `last_update` timestamp that is automatically updated when records are modified.
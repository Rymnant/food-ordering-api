# Food Ordering RESTful API with SQLite3

This project implements a RESTful API for a food ordering system using Node.js, Express, and SQLite3 as the database with JWT authentication and HATEOAS support.

## Features

- 🔐 JWT Authentication (Customer & Admin)
- 👤 Role-based Access Control
- 📱 RESTful API with HATEOAS links
- ⚡ Redis-like in-memory caching
- 🔒 Password hashing with bcryptjs
- 📊 Admin dashboard with statistics
- 🛡️ Input validation and error handling

## Database Structure

The database contains the following tables:
- **category**: Stores food categories
- **menu**: Stores menu items with categories
- **customer**: Stores customer information with authentication
- **admin**: Stores admin users with roles
- **orders**: Stores order information with status tracking
- **order_detail**: Stores the details of items in an order
- **payment**: Stores payment information

## Setup Instructions

1. **Install dependencies:**
```bash
cd src
npm install
```

2. **Environment setup (optional):**
Create a `.env` file in the `src` directory:
```env
JWT_SECRET=your-super-secret-jwt-key-2025
JWT_EXPIRES_IN=24h
PORT=6900
```

3. **Start the server:**
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on port 6900 by default (http://localhost:6900).

## Default Admin Account

- **Username**: `admin`
- **Email**: `admin@foodordering.com`
- **Password**: `admin123`

## API Endpoints

### Health Check

- **Health Check**
  - Method: GET
  - URL: `/health`
  - Description: Check API status and get available endpoints

### Authentication Endpoints

1. **Customer Register**
   - Method: POST
   - URL: `/auth/customer/register`
   - Body:
     ```json
     {
       "name": "John Doe",
       "email": "john@example.com",
       "phone": "081234567890",
       "address": "Jl. Contoh No. 123",
       "password": "password123"
     }
     ```

2. **Customer Login**
   - Method: POST
   - URL: `/auth/customer/login`
   - Body:
     ```json
     {
       "email": "john@example.com",
       "password": "password123"
     }
     ```

3. **Admin Login**
   - Method: POST
   - URL: `/auth/admin/login`
   - Body:
     ```json
     {
       "username": "admin",
       "password": "admin123"
     }
     ```

4. **Get Profile** (Protected)
   - Method: GET
   - URL: `/auth/customer/profile` or `/auth/admin/profile`
   - Headers: `Authorization: Bearer <token>`

5. **Verify Token** (Protected)
   - Method: GET
   - URL: `/auth/verify`
   - Headers: `Authorization: Bearer <token>`

6. **Logout** (Protected)
   - Method: POST
   - URL: `/auth/logout`
   - Headers: `Authorization: Bearer <token>`

### Public Endpoints

7. **Get All Categories**
   - Method: GET
   - URL: `/categories`
   - Description: Get all food categories (cached for 10 minutes)

8. **Get All Menus**
   - Method: GET
   - URL: `/menus`
   - Query Parameters:
     - `category_id` (optional): Filter menus by category
   - Description: Get all menu items (cached for 5 minutes)

9. **Get Menu Details**
   - Method: GET
   - URL: `/menus/{menu_id}`
   - Example: `GET /menus/1`
   - Description: Get specific menu item details

### Protected Customer Endpoints

10. **Get Customer Details** (Protected)
    - Method: GET
    - URL: `/customers/{customer_id}`
    - Headers: `Authorization: Bearer <token>`
    - Description: Customers can only access their own data

11. **Get Customer Orders** (Protected)
    - Method: GET
    - URL: `/orders?customer_id={customer_id}`
    - Headers: `Authorization: Bearer <token>`
    - Description: Get orders for authenticated customer

12. **Create New Order** (Customer Only)
    - Method: POST
    - URL: `/orders`
    - Headers: `Authorization: Bearer <token>`
    - Description: Create empty order for authenticated customer

13. **Get Order Details** (Protected)
    - Method: GET
    - URL: `/orders/{order_id}`
    - Headers: `Authorization: Bearer <token>`
    - Description: Get order details with items

14. **Add Item to Order** (Customer Only)
    - Method: POST
    - URL: `/order_details`
    - Headers: `Authorization: Bearer <token>`
    - Body:
      ```json
      {
        "order_id": 1,
        "menu_id": 2,
        "quantity": 3
      }
      ```

15. **Create Payment** (Customer Only)
    - Method: POST
    - URL: `/payments`
    - Headers: `Authorization: Bearer <token>`
    - Body:
      ```json
      {
        "order_id": 1,
        "payment_method": "cash"
      }
      ```

16. **Get Payment Details** (Protected)
    - Method: GET
    - URL: `/payments/{order_id}`
    - Headers: `Authorization: Bearer <token>`

### Admin Endpoints

17. **Admin Dashboard** (Admin Only)
    - Method: GET
    - URL: `/admin/dashboard`
    - Headers: `Authorization: Bearer <admin_token>`
    - Description: Get dashboard statistics

18. **Get All Customers** (Admin Only)
    - Method: GET
    - URL: `/admin/customers`
    - Headers: `Authorization: Bearer <admin_token>`

19. **Get All Orders** (Admin Only)
    - Method: GET
    - URL: `/admin/orders`
    - Headers: `Authorization: Bearer <admin_token>`
    - Query Parameters:
      - `status` (optional): Filter by order status
      - `limit` (optional): Limit results (default: 50)
      - `offset` (optional): Offset for pagination (default: 0)

20. **Update Order Status** (Admin Only)
    - Method: PATCH
    - URL: `/admin/orders/{order_id}/status`
    - Headers: `Authorization: Bearer <admin_token>`
    - Body:
      ```json
      {
        "status": "completed"
      }
      ```
    - Valid statuses: `pending`, `processing`, `completed`, `cancelled`

21. **Clear Cache** (Admin Only)
    - Method: DELETE
    - URL: `/admin/cache`
    - Headers: `Authorization: Bearer <admin_token>`
    - Query Parameters:
      - `pattern` (optional): Clear specific cache pattern

## Authentication Flow

### For Customers:
1. Register: `POST /auth/customer/register`
2. Login: `POST /auth/customer/login` (returns JWT token)
3. Use token in `Authorization: Bearer <token>` header for protected endpoints

### For Admins:
1. Login: `POST /auth/admin/login` (use default admin account)
2. Use token in `Authorization: Bearer <token>` header for admin endpoints

## Example Usage Flow

### Customer Journey:
1. Register: `POST /auth/customer/register`
2. Login: `GET /auth/customer/login`
3. Browse menus: `GET /menus`
4. Create order: `POST /orders` (with token)
5. Add items: `POST /order_details` (with token)
6. Make payment: `POST /payments` (with token)
7. Check order: `GET /orders/{order_id}` (with token)

### Admin Journey:
1. Login: `POST /auth/admin/login`
2. View dashboard: `GET /admin/dashboard` (with token)
3. View orders: `GET /admin/orders` (with token)
4. Update order status: `PATCH /admin/orders/{order_id}/status` (with token)

## Response Format

All responses follow this structure:
```json
{
  "success": true,
  "message": "Optional message",
  "data": {
    // Response data with HATEOAS links
    "_links": {
      "self": "http://localhost:6900/resource",
      "related": "http://localhost:6900/related-resource"
    }
  },
  "count": 10 // For list responses
}
```

## Error Handling

Error responses follow this structure:
```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Security Features

- 🔐 JWT tokens with expiration
- 🛡️ Password hashing with bcryptjs
- 🔒 Role-based access control
- 👤 Resource ownership validation
- 🚫 Input validation and sanitization

## Caching

- Categories cached for 10 minutes
- Menus cached for 5 minutes
- Cache automatically cleared when data is modified
- Admin can manually clear cache

## Notes

- The database is automatically initialized with sample data when the server starts for the first time
- All tables include `last_update` timestamp that is automatically updated
- JWT tokens expire in 24 hours by default
- HATEOAS links are included in responses for better API discoverability
- Passwords must be at least 6 characters long
- Email addresses must be unique for customers and admins
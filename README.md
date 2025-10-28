# Home Food Marketplace

A multi-vendor food marketplace platform that combines Amazon-style buyer experience with eBay-style seller management. This platform allows users to browse and order home-cooked meals from local cooks, with a unique multi-seller cart system that automatically splits orders by cook.

## Features

### User Roles
- **Foodie (Buyer)**: Browse, search, and order home-cooked meals
- **Cook (Seller)**: List products, manage orders, and interact with customers
- **Admin**: Manage users, products, orders, and platform settings
- **Super Admin**: Full platform control with ability to create other admins

### Key Features
1. **Unified Account System**: Single account for both buying and selling
2. **Multi-Seller Cart**: Automatically splits orders by cook
3. **Real-time Order Tracking**: Status updates from order received to delivered
4. **Favorites System**: Save favorite dishes and cooks
5. **Bilingual Support**: English and Arabic with automatic text direction
6. **Photo Validation**: Ensures high-quality product images
7. **Smart Sale Control**: Scheduled sales with admin oversight

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- Socket.IO for real-time updates

### Frontend
- **Mobile App (Foodie)**: React Native
- **Cook Dashboard**: React with Material-UI
- **Admin Panel**: React with Material-UI

## Project Structure

```
marketplace/
├── server/              # Backend API
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── config/          # Configuration files
│   └── utils/           # Utility functions
├── client/
│   ├── mobile/          # Foodie mobile app (React Native)
│   └── web/             # Cook dashboard (React)
├── admin/               # Admin panel (React)
└── docs/                # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/become-cook` - Upgrade to cook role

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/switch-view` - Switch between Foodie/Cook view

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (cook only)
- `PUT /api/products/:id` - Update product (cook only)
- `DELETE /api/products/:id` - Delete product (cook only)

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/sub-order/:id/status` - Update sub-order status (cook only)
- `POST /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/:id/sub-order/:subId/cancel` - Cancel sub-order

### Cart
- `GET /api/cart` - Get cart contents
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Favorites
- `GET /api/favorites` - Get user favorites
- `GET /api/favorites/products` - Get favorite products
- `GET /api/favorites/cooks` - Get favorite cooks
- `POST /api/favorites/product` - Toggle favorite product
- `POST /api/favorites/cook` - Toggle favorite cook

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/products` - Get all products
- `GET /api/admin/products/:id` - Get product by ID
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category
- `GET /api/admin/orders` - Get all orders

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install mobile app dependencies:
   ```bash
   cd client/mobile
   npm install
   ```

4. Install cook dashboard dependencies:
   ```bash
   cd client/web
   npm install
   ```

5. Install admin panel dependencies:
   ```bash
   cd admin
   npm install
   ```

6. Create a `.env` file in the server directory with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/marketplace
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d
   ```

7. Start the backend server:
   ```bash
   cd server
   npm start
   ```

8. Start the mobile app:
   ```bash
   cd client/mobile
   npm start
   ```

9. Start the cook dashboard:
   ```bash
   cd client/web
   npm start
   ```

10. Start the admin panel:
    ```bash
    cd admin
    npm start
    ```

## Development

### Backend
The backend is built with Node.js and Express.js, using MongoDB as the database. Key features include:

- JWT-based authentication
- Role-based access control
- Multi-seller order splitting
- Real-time updates with Socket.IO
- Comprehensive API validation

### Mobile App
The Foodie mobile app is built with React Native, providing a native experience on both iOS and Android. Features include:

- Product browsing and search
- Multi-seller cart system
- Order tracking
- Favorites management
- User profile management

### Cook Dashboard
The Cook dashboard is a web application built with React and Material-UI. Features include:

- Product management
- Order management
- Customer analytics
- Profile settings

### Admin Panel
The Admin panel is a web application built with React and Material-UI. Features include:

- User management
- Product management
- Order management
- Category management
- Platform analytics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or support, please contact the development team.
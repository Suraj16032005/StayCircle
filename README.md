# StayCircle – Private Stay Listing Review Platform

StayCircle is a full-stack stay listing and review platform built using Node.js, Express.js, MongoDB, and EJS.  
The platform allows users to create, manage, review, and explore property listings with secure authentication and image upload support.

---

## Features

- User Authentication & Authorization
- Create, Edit, and Delete Listings
- Add and Manage Reviews
- Secure Access Control using Passport.js
- Image Upload using Cloudinary & Multer
- RESTful Routing Architecture
- MVC-Based Project Structure
- Middleware-Based Validation
- Responsive UI using EJS Templates

---

## Tech Stack

### Frontend
- EJS
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Other Tools & Libraries
- Passport.js
- Cloudinary
- Multer
- Express Session

---

## Database Collections

- User
- Listing
- Review

The application uses relational mapping between collections for efficient data retrieval and CRUD operations.

---

## Folder Structure

```bash
StayCircle/
│
├── controller/
├── models/
├── routes/
├── views/
├── public/
├── utils/
├── init/
│
├── cloudConfig.js
├── index.js
└── README.md
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Suraj16032005/StayCircle.git
```

### 2. Navigate to Project Directory

```bash
cd StayCircle
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create a `.env` File

Add the following environment variables:

```env
MONGO_URI=your_mongodb_connection
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_key
CLOUDINARY_SECRET=your_secret
SECRET=session_secret
```

### 5. Run the Application

```bash
npm start
```

---

## Author

Suraj16032005

---

## License

This project is licensed under the MIT License.

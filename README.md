# 🌟 ARC Application - Full-Stack Booking System

A **full-stack web application** for managing bookings.
It comes with a **React frontend** for a smooth user experience and a **Node.js + Express backend** connected to a **MySQL database** for secure data persistence and business logic.

---

## ✨ Features

✅ **User Authentication** – Secure login & session handling
✅ **Dashboard** – Central hub for user info & actions
✅ **Booking Management** – Create, view, update, and manage bookings
✅ **Booking Form** – Intuitive form for new bookings
✅ **Ledger** – Track booking & transaction history
✅ **Admin Panel** – Manage users, bookings, and system data

---

## 🛠️ Tech Stack

**Frontend**: React, React Router, Axios
**Backend**: Node.js, Express.js
**Database**: MySQL
**Styling**: CSS

---

## 📦 Prerequisites

Make sure you have installed:

* [Node.js](https://nodejs.org/) (includes npm)
* [MySQL](https://www.mysql.com/downloads/)

---

## 🚀 Getting Started

Follow these steps to run the project locally:

### 1️⃣ Clone the Repository

```bash
git clone <your-repository-url>
cd ARC-APPLICATION
```

---

### 2️⃣ Backend Setup

📂 Navigate to server:

```bash
cd server
```

📦 Install dependencies:

```bash
npm install
```

🗄️ Set up MySQL database:

1. Ensure your MySQL server is running.
2. Create a new database.
3. Run the schema file:

   ```bash
   mysql -u your_username -p your_database_name < db.sql
   ```

⚙️ Configure environment variables → create a `.env` file inside `/server` with:

```ini
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_DATABASE=your_database_name
```

▶️ Start backend server:

```bash
npm start
```

Runs on **[http://localhost:5000](http://localhost:5000)** by default (check `server.js`).

---

### 3️⃣ Frontend Setup

📂 Navigate to client:

```bash
cd client
```

📦 Install dependencies:

```bash
npm install
```

▶️ Start React app:

```bash
npm start
```

Runs on **[http://localhost:3000](http://localhost:3000)**.

---

## 📜 Available Scripts

### 🔹 Server (`/server`)

* `npm start` → Run server in production mode
* `npm run dev` → Run server in dev mode with **nodemon**

### 🔹 Client (`/client`)

* `npm start` → Run React app in dev mode
* `npm test` → Run tests
* `npm run build` → Build React app for production

---

## 🔗 API Endpoints

The backend exposes these APIs, all prefixed with `/api`. See `server/routes/api.js` for full details.

### Auth
*   `POST /login` → Authenticate a user.

### Sports Management
*   `GET /sports` → Get a list of all sports.
*   `POST /sports` → Add a new sport.
*   `PUT /sports/:id` → Update a sport's price.
*   `DELETE /sports/:id` → Delete a sport.

### Court Management
*   `GET /courts` → Get a list of all courts and their status.
*   `POST /courts` → Add a new court.
*   `PUT /courts/:id/status` → Update a court's status (e.g., "Under Maintenance").
*   `DELETE /courts/:id` → Delete a court.

### Booking Management
*   `GET /courts/availability` → Check available courts for a given date/time.
*   `GET /bookings` → Get bookings for a specific date.
*   `POST /bookings` → Create a new booking.
*   `GET /bookings/all` → Get a complete list of all bookings (for the ledger).

---

## 🎯 Project Structure

```
ARC-APPLICATION/
│── client/         # React frontend
│── server/         # Node.js + Express backend
│   ├── routes/     # API routes
│   ├── models/     # DB models
│   ├── db.sql      # Database schema
│   └── .env        # Environment variables
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repo and submit a PR.

---

## 📜 License

This project is licensed under the **MIT License**.

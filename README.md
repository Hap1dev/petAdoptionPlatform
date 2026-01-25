# PetHouse

PetHouse is a full-stack web application designed to connect pets in shelters with loving adoptive families. It provides tools for shelter staff to efficiently manage their adoptable animals and for potential adopters to easily discover and express interest in new companions.

## Features

- **User Authentication:** Secure user registration and login system with role-based access (Adopter or Shelter Staff).
- **JWT-based Sessions:** Uses JSON Web Tokens (JWT) for managing user sessions.
- **Password Hashing:** Passwords are securely hashed using `bcrypt`.
- **Input Validation:** All user inputs are validated using `zod` to ensure data integrity.
- **Pet Listings:** Shelter staff can create, manage, and delete pet listings, including uploading pet images.
- **Browse and Adopt:** Adopters can browse all available pets and express their interest in them.
- **Shelter Dashboard:** A dedicated dashboard for shelter staff to view their listings and see which adopters are interested in their pets.
- **Robust Error Handling:** The application handles duplicate actions (e.g., expressing interest twice) and database constraints gracefully.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Frontend:** EJS (Embedded JavaScript templates), HTML5, CSS3, Bootstrap
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **Validation:** Zod
- **File Uploads:** Multer

## Project Structure

The project is organized into a modular structure for better maintainability and scalability.

```
/
├─── public/            # Static assets (CSS, images)
├─── routes/            # Route definitions
│    ├─── app.js        # Main application routes
│    └─── auth.js       # Authentication routes (signup, signin, logout)
├─── views/             # EJS templates
│    ├─── partials/     # Reusable template partials (header, footer)
│    └─── ...           # Page templates
├─── .env               # Environment variables (not committed)
├─── authMiddleware.js  # JWT authentication middleware
├─── db.js              # Database connection setup
├─── index.js           # Main application entry point
├─── package.json
└─── queries.sql        # Database schema setup queries
```

## Setup and Installation

Follow these steps to get the project running locally.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/)

### 2. Clone the Repository

```bash
git clone <repository-url>
cd pethouse
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Set up the Database

1.  Make sure your PostgreSQL server is running.
2.  Create a new database for the project.
3.  Execute the queries in the `queries.sql` file to set up the necessary tables and constraints.

### 5. Configure Environment Variables

Create a `.env` file in the root of the project and add the following environment variables:

```
# The connection string for your PostgreSQL database
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>

# A secret key for signing JWTs
JWT_SECRET=your_super_secret_jwt_key

# The port for the server to run on
PORT=3000
```

Replace the placeholder values with your actual configuration.

## Available Scripts

-   **To start the server:**
    ```bash
    npm start
    ```
-   **To start the server in development mode (with nodemon for automatic restarts):**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`.

## License

This project is licensed under the MIT License.
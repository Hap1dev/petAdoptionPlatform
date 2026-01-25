import pkg from 'pg';
import dotenv from "dotenv";

dotenv.config();

let config = {
  connectionString: process.env.DATABASE_URL
};

if(process.env.NODE_ENV==="production") {
  config.ssl = { rejectUnauthorized: false };
}

const db = new pkg.Pool(config);

export default db;
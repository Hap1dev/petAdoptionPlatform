import express from "express";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import dotenv from "dotenv";
import ejs from 'ejs';
import { dirname } from "path";
import { fileURLToPath } from "url";

import authRoutes from './routes/auth.js';
import appRoutes from './routes/app.js';
import { softAuthenticate } from './softAuthMiddleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json());
app.use(softAuthenticate);
app.set('view engine', 'ejs');
app.set('views', './views');

// Use routes
app.use(authRoutes);
app.use(appRoutes);

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

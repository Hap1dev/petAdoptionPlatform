import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const saltRounds = 10;

const signupSchema = z.object({
  firstname: z.string().min(1, { message: "First name is required" }),
  lastname: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  role: z.enum(['shelterstaff', 'adopter'], { message: "Invalid role selected" })
});

const signinSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

router.post("/signup", async (req, res) => {
  try {
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      const formattedErrors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(formattedErrors)[0]?.[0];
      const error = firstError || "Invalid input. Please check your data.";
      return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }

    const { firstname, lastname, email, password, role } = validation.data;

    const checkUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (checkUser.rows.length > 0) {
      return res.redirect("/?error=Email+already+exists.+Please+try+another+one.");
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    await db.query(
      "INSERT INTO users (firstname, lastname, email, password, role) VALUES ($1, $2, $3, $4, $5)",
      [firstname, lastname, email, passwordHash, role]
    );
    res.redirect("/signin");
  } catch (error) {
    console.error("Error creating user:", error);
    res.redirect("/?error=Internal+Server+Error");
  }
});


router.post("/signin", async (req, res) => {
  try {
    const validation = signinSchema.safeParse(req.body);
    if (!validation.success) {
      const formattedErrors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(formattedErrors)[0]?.[0];
      const error = firstError || "Invalid input. Please check your data.";
      return res.redirect(`/signin?error=${encodeURIComponent(error)}`);
    }
    const { email, password } = validation.data;

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.redirect("/signin?error=Invalid+credentials");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.redirect("/signin?error=Invalid+credentials");
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    const role = user.role;

    switch (role) {
      case "adopter":
        res.redirect("/adopter");
        break;
      case "shelterstaff":
        res.redirect("/shelterstaff");
        break;
      default:
        return res.redirect("/signin?error=Unauthorized+role");
    }
  } catch (error) {
    console.error("Error signing in:", error);
    res.redirect("/signin?error=Internal+Server+Error");
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/signin');
});

export default router;

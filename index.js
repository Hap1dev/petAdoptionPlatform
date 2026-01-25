import express from "express";
import pkg from "pg";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import ejs from 'ejs';
import fs from "fs";
import multer from "multer";
import dotenv from "dotenv";
import { z } from 'zod';
import bcrypt from 'bcrypt';

const app = express();
const port = process.env.PORT;
const saltRounds = 10;

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
let config = {
  connectionString: process.env.DATABASE_URL
};

if(process.env.NODE_ENV==="production")
  config.ssl = { rejectUnauthorized: false };

const db = new pkg.Pool(config);
const upload = multer({ storage: multer.memoryStorage() });

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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(express.json());
app.set('view engine', 'ejs');

app.get("/", (req, res) => {
  res.render("index", { error: req.query.error });
});

app.get("/signin", (req, res) => {
	res.render("signin", { error: req.query.error });
});

app.post("/signup", async (req, res) => {
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


app.post("/signin", async (req, res) => {
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

    req.session.email = email;
    req.session.user = { id: user.id };

    console.log(req.session);

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

app.post('/postpet', upload.single('image'), async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const animal = req.body.animal;
    const breed = req.body.breed;
    const state = req.body.state;
    const city = req.body.city;
    const street = req.body.street;
    const pincode = req.body.pincode;

    if (!userId || !animal || !breed || !state || !city || !street || !pincode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const imageData = req.file ? req.file.buffer : null;

    await db.query(
      `INSERT INTO shelterstaff (uid, animal, breed, state, city, street, pincode, image) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, animal, breed, state, city, street, pincode, imageData]
    );

    res.redirect('/shelterstaff');
  } catch (error) {
    console.error('Error posting pet information:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get("/shelterstaff", async (req, res) => {
  try {
    const uid = req.session.user?.id;
    
    if (!uid) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    const result = await db.query("SELECT * FROM shelterstaff WHERE uid = $1", [uid]);
    const pets = result.rows;

    res.render("shelterstaff.ejs", {
      pets: pets
    });
  } catch (error) {
    console.error("Error getting data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/adopter", async (req, res) => {
  console.log(req.session);
  try {
    const result = await db.query("SELECT * FROM shelterstaff");
    const pets = result.rows;

    res.render("adopter.ejs", {
      pets: pets,
      message: req.query.message,
      messageType: req.query.messageType
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/interested", async (req, res) => {
	const uid = req.session.user?.id;
  if (!uid) {
    return res.redirect("/signin?error=You+must+be+logged+in+to+show+interest.");
  }
	const pid = req.body.pet;
	try{
        const check = await db.query("SELECT * FROM interested WHERE uid = $1 AND pid = $2", [uid, pid]);
        if (check.rows.length > 0) {
            return res.redirect("/adopter?message=You have already shown interest in this pet.&messageType=error");
        }

		const result = await db.query("INSERT INTO interested(uid, pid) VALUES($1, $2)", [uid, pid]);
		res.redirect("/adopter?message=Your interest has been recorded successfully!&messageType=success");
	}catch(error){
		console.error("Error making request:", error);
    	res.redirect("/adopter?message=An error occurred. Please try again.&messageType=error");
	}
});

app.get("/stats", async (req, res) => {
	const uid = req.session.user?.id;
	try{
		const result = await db.query("SELECT firstname, lastname, animal, breed, email FROM interested AS i INNER JOIN users AS u ON i.uid = u.id INNER JOIN shelterstaff AS s ON i.pid = s.id WHERE s.uid = $1", [uid]);
		const data = result.rows;
		res.render("stats.ejs", {
			data: data
		});
	}catch(error){
		console.error("Error making request:", error);
    	res.status(500).json({ error: "Internal Server Error" });
	}

});

app.post("/deletepet/:id", async (req, res) => {
  const petId = req.params.id;
  try{
    await db.query("DELETE FROM shelterstaff WHERE id = $1", [petId]);
    res.redirect("/shelterstaff");
  }catch(error){
    console.error("Error making request: ", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

app.listen(port, () => {
  console.log("Server running on port: " + port);
});
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

const app = express();
const port = process.env.PORT;

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new pkg.Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }
});
const upload = multer({ storage: multer.memoryStorage() });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/signin", (req, res) => {
	res.sendFile(__dirname + "/signin.html");
});

app.post("/signup", async (req, res) => {
  try {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.role;

    if (!firstname || !lastname || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await db.connect();
    try {
      await client.query(
        "INSERT INTO users (firstname, lastname, email, password, role) VALUES ($1, $2, $3, $4, $5)",
        [firstname, lastname, email, password, role]
      );
      res.sendFile(__dirname + "/signin.html");
    } finally {
      await client.release();
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.post("/signin", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    // Validate input (optional)
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await db.connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      const user = result.rows[0];

      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.email = email;
      req.session.user = { id: user.id };

      console.log(req.session);

      const role = user.role;

      let rolePage, rolePageConfig;
      switch (role) {
        case "adopter":
          res.redirect("/adopter");
          break;
        case "shelterstaff":
          res.redirect("/shelterstaff");
          break;
        default:
          return res.status(403).json({ error: "Unauthorized role" });
      }
    } finally {
      await client.release();
    }

   	

  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/postpet', upload.single('image'), async (req, res) => {
  const client = await db.connect();
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

    await client.query(
      `INSERT INTO shelterstaff (uid, animal, breed, state, city, street, pincode, image) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, animal, breed, state, city, street, pincode, imageData]
    );

    res.redirect('/shelterstaff');
  } catch (error) {
    console.error('Error posting pet information:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release(); // Ensure the client is released
  }
});



app.get("/shelterstaff", async (req, res) => {
  try {
    const uid = req.session.user?.id;
    
    if (!uid) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    const client = await db.connect();
    try {
      const result = await client.query("SELECT * FROM shelterstaff WHERE uid = $1", [uid]);
      const pets = result.rows;

      res.render("shelterstaff.ejs", {
        pets: pets
      });
    } finally {
      await client.release();
    }
  } catch (error) {
    console.error("Error getting data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/adopter", async (req, res) => {
  const client = await db.connect();
  try {
    const result = await client.query("SELECT * FROM shelterstaff");
    const pets = result.rows;

    res.render("adopter.ejs", {
      pets: pets
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.release();
  }
});

app.post("/interested", async (req, res) => {
	const uid = req.session.user?.id;
	const pid = req.body.pet;
	const client = await db.connect();
	try{
		const result = await client.query("INSERT INTO interested(uid, pid) VALUES($1, $2)", [uid, pid]);
		res.redirect("/adopter");
	}catch(error){
		console.error("Error making request:", error);
    	res.status(500).json({ error: "Internal Server Error" });
	}finally{
		await client.release();
	}
});

app.get("/stats", async (req, res) => {
	const uid = req.session.user?.id;
	const client = await db.connect();
	try{
		const result = await client.query("SELECT firstname, lastname, animal, breed, email FROM interested AS i INNER JOIN users AS u ON i.uid = u.id INNER JOIN shelterstaff AS s ON i.pid = s.id WHERE s.uid = $1", [uid]);
		const data = result.rows;
		res.render("stats.ejs", {
			data: data
		});
	}catch(error){
		console.error("Error making request:", error);
    	res.status(500).json({ error: "Internal Server Error" });
	}finally{
		await client.release();
	}

});

app.post("/deletepet/:id", async (req, res) => {
  const petId = req.params.id;
  const client = await db.connect();
  try{
    await client.query("DELETE FROM shelterstaff WHERE id = $1", [petId]);
    res.redirect("/shelterstaff");
  }catch(error){
    console.error("Error making request: ", error);
    res.status(500).json({error: "Internal Server Error"});
  }finally{
    await client.release();
  }
});

app.listen(port, () => {
  console.log("Server running on port: " + port);
});
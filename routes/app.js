import express from 'express';
import db from '../db.js';
import authenticateToken from '../authMiddleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.get("/", (req, res) => {
  res.render("index", { error: req.query.error, user: req.user });
});

router.get("/signin", (req, res) => {
	res.render("signin", { error: req.query.error, user: req.user });
});

router.post('/postpet', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
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



router.get("/shelterstaff", authenticateToken, async (req, res) => {
  try {
    const uid = req.user.id;
    
    if (!uid) {
      return res.status(400).json({ error: "User not authenticated" });
    }

    const result = await db.query("SELECT * FROM shelterstaff WHERE uid = $1", [uid]);
    const pets = result.rows;

    res.render("shelterstaff.ejs", {
      pets: pets,
      user: req.user
    });
  } catch (error) {
    console.error("Error getting data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/adopter", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM shelterstaff");
    const pets = result.rows;

    res.render("adopter.ejs", {
      pets: pets,
      message: req.query.message,
      messageType: req.query.messageType,
      user: req.user
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/interested", authenticateToken, async (req, res) => {
	const uid = req.user.id;
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

router.get("/stats", authenticateToken, async (req, res) => {
	const uid = req.user.id;
	try{
		const result = await db.query("SELECT firstname, lastname, animal, breed, email FROM interested AS i INNER JOIN users AS u ON i.uid = u.id INNER JOIN shelterstaff AS s ON i.pid = s.id WHERE s.uid = $1", [uid]);
		const data = result.rows;
		res.render("stats.ejs", {
			data: data,
      user: req.user
		});
	}catch(error){
		console.error("Error making request:", error);
    	res.status(500).json({ error: "Internal Server Error" });
	}

});

router.post("/deletepet/:id", authenticateToken, async (req, res) => {
  const petId = req.params.id;
  try{
    await db.query("DELETE FROM shelterstaff WHERE id = $1", [petId]);
    res.redirect("/shelterstaff");
  }catch(error){
    console.error("Error making request: ", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});


export default router;

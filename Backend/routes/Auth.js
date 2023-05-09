const router = require("express").Router();
const conn = require("../db/dbConnection");
const { body, validationResult } = require("express-validator");
const authorize = require("../middleware/authorize");
const util = require("util");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Login Form
router.post(
  "/login",

  body("email").isEmail().withMessage("Please Enter a Valid Email!"),
  body("password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) characters."),
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn); // Transform Query mysql --> promis to use [ await, async ]
      const user = await query("select * from users where email = ?", [
        req.body.email,
      ]);
      if (user.length == 0) {
        res.status(404).json({
          errors: [
            {
              msg: "email or password not found!",
            },
          ],
        });
        return;
      }

      // 3- COMPARE HASHED PASSWORD
      const checkPassword = await bcrypt.compare(
        req.body.password,
        user[0].password
      );
      if (checkPassword) {
        // 4- UPDATE USER STATUS TO "ACTIVE" [ 0 --> in-active, 1 --> active ]
        await query("UPDATE users SET status = 1 WHERE id = ?", [user[0].id]);

        // Return updated user object
        const updatedUser = await query("select * from users where id = ?", [
          user[0].id,
        ]);
        delete updatedUser[0].password;
        res.status(200).json(updatedUser);
      } else {
        res.status(401).json({
          error: "email or password not found!",
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Registeration Form
router.post(
  "/register",
  body("phone")
    .isMobilePhone()
    .withMessage("Please Enter a Valid Phone Number!"),
  body("email").isEmail().withMessage("Please Enter a Valid Email!"),
  body("name")
    .isString()
    .withMessage("Please Enter a Valid Name!")
    .isLength({ min: 10, max: 20 })
    .withMessage("name should be between (10-20) characters."),
  body("password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) characters."),
  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF EMAIL EXISTS
      const query = util.promisify(conn.query).bind(conn); // Transform Query mysql --> promis to use [ await, async ]
      const checkEmialExists = await query(
        "select * from users where email = ?",
        [req.body.email]
      );
      if (checkEmialExists.length > 0) {
        res.status(400).json({
          errors: [
            {
              msg: "email is already exists!",
            },
          ],
        });
      }

      // 3- PREPARE OBJECT USER TO ---> SAVE
      const userData = {
        name: req.body.name,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password, 10),
        phone: req.body.phone,
        token: crypto.randomBytes(16).toString("hex"),
      };

      // 4- INSERT USER INTO DB
      await query("insert into users set ?", userData);
      delete userData.password;
      res.status(200).json(userData);
    } catch (err) {
      res.status(500).json({ err: err });
    }
  }
);

//Logout
router.post("/logout", async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn); // Transform Query mysql --> promis to use [ await, async ]
    const checkTokenExists = await query(
      "select * from users where token = ?",
      [req.headers.token]
    );
    if (checkTokenExists.length > 0) {
      const userId = checkTokenExists[0].id;
      await query("update users set token = ?, status = ? where id = ?", [
        req.headers.token,
        0,
        userId,
      ]);
      res.status(200).json({ message: "Logout successful" });
    } else {
      res.status(400).json({ message: "Invalid token" });
    }
  } catch (err) {
    res.status(500).json({ err: err });
  }
});

module.exports = router;

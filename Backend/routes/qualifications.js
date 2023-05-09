const router = require("express").Router();
const conn = require("../db/dbConnection");
const authorized = require("../middleware/authorize");
const admin = require("../middleware/admin");
const { body, validationResult } = require("express-validator");
const util = require("util");

// ADMIN CREATE Qualifications [ Admin ]
router.post(
  "/create",
  admin,
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Please provide a description"),

  async (req, res) => {
    // 1- VALIDATE THE REQUEST
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2- INSERT A NEW QUALIFICATION
    const { description } = req.body;
    try {
      const query = util.promisify(conn.query).bind(conn);
      const result = await query(
        "INSERT INTO qualifications (description) VALUES (?)",
        [description]
      );
      const newQualificationId = result.insertId;
      res
        .status(201)
        .json({ id: newQualificationId, description: description });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

// ADMIN UPDATE Qualifications [ Admin ]
router.put("/update/:id", admin, async (req, res) => {
  try {
    const { description } = req.body;
    const { id } = req.params;
    if (!description) {
      return res.status(400).json({ msg: "Please provide a description" });
    }
    const query = util.promisify(conn.query).bind(conn);
    await query("UPDATE qualifications SET description = ? WHERE id = ?", [
      description,
      id,
    ]);
    res.status(200).json({ msg: "Qualification updated successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
});

// ADMIN DELETE Qualifications [ Admin ]
router.delete("/delete/:id", admin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = util.promisify(conn.query).bind(conn);
    await query("DELETE FROM qualifications WHERE id = ?", [id]);
    res.status(200).json({ msg: "Qualification deleted successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
});

// ADMIN READ ALL Qualifications [ Admin ]
router.get("/all", async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const qualifications = await query("SELECT * FROM qualifications");
    res.status(200).json(qualifications);
  } catch (error) {
    res.status(500).json(error);
  }
});

// ADMIN READ SPECIFIC Qualification [ Admin ]
router.get("/:id", admin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = util.promisify(conn.query).bind(conn);
    const qualification = await query(
      `SELECT * FROM qualifications WHERE id = ${id}`
    );
    if (qualification.length === 0) {
      res.status(404).json({ message: "Qualification not found" });
    } else {
      res.status(200).json(qualification[0]);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;

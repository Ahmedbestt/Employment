const router = require("express").Router();
const conn = require("../db/dbConnection");
const authorized = require("../middleware/authorize");
const admin = require("../middleware/admin");
const { body, validationResult } = require("express-validator");
const util = require("util");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { formatDate } = require("../utils");

/* ========================================== CRUD Applicants =============================== */

// CREATE APPLICANT [ Admin ]
router.post(
  "/create",
  admin,
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
      const checkEmailExists = await query(
        "select * from users where email = ?",
        [req.body.email]
      );
      if (checkEmailExists.length > 0) {
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

// UPDATE APPLICANT [ Admin ]
router.put(
  "/update/:id",
  admin,
  body("email").isString().withMessage("Please Enter a Valid Email!"),
  body("name")
    .isString()
    .withMessage("Please Enter a Valid Name!")
    .isLength({ min: 10, max: 20 })
    .withMessage("name should be between (10-20) characters."),
  body("phone")
    .isMobilePhone()
    .withMessage("Please Enter a Valid Phone Number!"),
  body("password")
    .isLength({ min: 8, max: 12 })
    .withMessage("password should be between (8-12) characters."),

  async (req, res) => {
    try {
      // 1- VALIDATION REQUEST
      const query = util.promisify(conn.query).bind(conn);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      //2- CHECK IF APPLICANT EXISTS OR NOT
      const user = await query(
        "select * from users where id = ? AND type = 0",
        [req.params.id]
      );

      if (!user[0]) {
        res.status(404).json({ msg: "Applicant not found !" });
      }

      //3- Prepare user object
      const userObj = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: await bcrypt.hash(req.body.password, 10),
      };

      //4- Update user object in db
      await query("update users set ? where id = ?", [userObj, user[0].id]);
      res.status(200).json({
        /* msg: req.body, */
        msg: "Applicant Updated Successfully !",
      });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

// DELETE APPLICANT [ Admin ]
router.delete("/delete/:id", admin, async (req, res) => {
  try {
    //1- CHECK IF APPLICANT  EXISTS OR NOT
    const query = util.promisify(conn.query).bind(conn);
    const user = await query("select * from users where id = ? AND type = 0", [
      req.params.id,
    ]);

    if (!user[0]) {
      res.status(404).json({ msg: "Applicant not found !" });
    }

    //2- Delete user object in db
    await query("delete from users where id = ?", [user[0].id]);
    res.status(200).json({
      /* msg: req.body, */
      msg: "Applicant Deleted Successfully !",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

//READ ALL APPLICANTS [ Admin ]
router.get("/all", admin, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const users = await query("select * from users where type = 0");
    delete users[0].password;
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(error);
  }
});

// READ SPECIFIC APPLICANT [ Admin ]
router.get("/:id", admin, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const applicant = await query(
      "SELECT * FROM users WHERE id = ? and type = 0",
      [req.params.id]
    );
    delete applicant[0].password;
    res.status(200).json(applicant[0]);
  } catch (error) {
    res.status(500).json(error);
  }
});

/* ========================================== CRUD Requests =============================== */

// SHOW APPLICANT REQUESTS HISTORY FOR ALL JOBS [ Admin ]
router.get("/requests/history", admin, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const requests = await query(`
      SELECT
      user_requests.id,
        users.name,
        jobs.position,
        user_requests.requested_time,
        user_requests.status
      FROM user_requests
      INNER JOIN users ON user_requests.user_id = users.id
      INNER JOIN jobs ON user_requests.job_id = jobs.id
      ORDER BY user_requests.requested_time DESC
    `);

    const formattedRequests = requests.map((requests) => {
      return {
        ...requests,
        requested_time: formatDate(requests.requested_time),
      };
    });

    res.status(200).json({
      requests: formattedRequests,
      msg: "Applicant Requests History Retrieved Successfully!",
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

// [ UPDATE ] UPDATE USER REQUEST STATUS [ Accepted , Declined ] [ Admin ]
router.put("/requests/:id", admin, async (req, res) => {
  try {
    // 1- CHECK IF USER REQUEST EXISTS OR NOT
    const query = util.promisify(conn.query).bind(conn);
    const userRequest = await query(
      "SELECT * FROM user_requests WHERE id = ?",
      [req.params.id]
    );

    if (!userRequest[0]) {
      res.status(404).json({ msg: "User request not found!" });
      return;
    }

    // 2- UPDATE STATUS OF USER REQUEST
    if (req.body.status === "Accepted" || req.body.status === "Declined") {
      // [ UPDATE ] CHECK IF NEW STATUS IS DIFFERENT FROM CURRENT STATUS
      if (req.body.status === userRequest[0].status) {
        res.status(400).json({
          msg: "User request status is already " + req.body.status + "!",
        });
        return;
      }
      // [ UPDATE ] CHECK IF MAX CANDIDATE NUMBER HAS BEEN REACHED BEFORE ACCEPTING NEW REQUESTS
      if (req.body.status === "Accepted") {
        const job = await query("SELECT * FROM jobs WHERE id = ?", [
          userRequest[0].job_id,
        ]);
        if (job.length > 0 && job[0].max_candidate_number === 0) {
          res.status(400).json({
            msg: "Maximum number of candidates has already been reached for this job. Cannot accept more requests!",
          });
          return;
        }
      }
      const updatedUserRequest = {
        status: req.body.status,
      };
      await query("UPDATE user_requests SET ? WHERE id = ?", [
        updatedUserRequest,
        req.params.id,
      ]);

      // 3- IF STATUS IS ACCEPTED, CHECK IF MAX CANDIDATE NUMBER HAS BEEN REACHED
      if (req.body.status === "Accepted") {
        const job = await query("SELECT * FROM jobs WHERE id = ?", [
          userRequest[0].job_id,
        ]);
        if (job.length > 0 && job[0].max_candidate_number > 0) {
          // 4- DECREMENT THE MAX CANDIDATE NUMBER FOR THE JOB
          await query(
            "UPDATE jobs SET max_candidate_number = max_candidate_number - 1 WHERE id = ?",
            [userRequest[0].job_id]
          );
          const updatedJob = await query("SELECT * FROM jobs WHERE id = ?", [
            userRequest[0].job_id,
          ]);
          if (
            updatedJob.length > 0 &&
            updatedJob[0].max_candidate_number === 0
          ) {
            // 5- IF MAX CANDIDATE NUMBER HAS BEEN REACHED, UPDATE STATUS OF ALL PENDING REQUESTS TO DECLINED
            await query(
              "UPDATE user_requests SET status = 'Declined' WHERE status = 'Pending' AND job_id = ?",
              [userRequest[0].job_id]
            );
            res.status(200).json({
              msg: "Maximum number of candidates has been reached for this job. All pending requests have been declined.",
            });
            return;
          }
        } else {
          // 6- IF MAX CANDIDATE NUMBER HAS BEEN REACHED, UPDATE STATUS OF ALL PENDING REQUESTS TO DECLINED
          await query(
            "UPDATE user_requests SET status = 'Declined' WHERE status = 'Pending' AND job_id = ?",
            [userRequest[0].job_id]
          );
          res.status(200).json({
            msg: "Maximum number of candidates has been reached for this job. All pending requests have been declined.",
          });
          return;
        }
      }

      res.status(200).json({
        msg: "User request status updated successfully!",
      });
    } else {
      res.status(400).json({ msg: "Invalid status value!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// [ GET ] GET ALL USER REQUESTS [ Admin ]
router.get("/", admin, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const sql = `
    SELECT user_requests.id, users.name, users.email, jobs.position, user_requests.status, DATE_FORMAT(user_requests.requested_time, "%Y-%m-%d %H:%i:%s") AS requested_time_formatted, user_requests.user_id
    FROM user_requests
    JOIN users ON user_requests.user_id = users.id
    JOIN jobs ON user_requests.job_id = jobs.id
    ORDER BY user_requests.requested_time DESC
    
    `;
    const allRequests = await query(sql);

    if (allRequests.length === 0) {
      return res.status(404).json({ message: "No requests found" });
    }

    res
      .status(200)
      .json(
        allRequests.map((request) => ({ ...request, requestId: request.id }))
      );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// [ GET ] GET USER REQUEST BY USER ID [ Admin ]
router.get("/user/:id", admin, async (req, res) => {
  try {
    const userId = req.params.id;
    const query = util.promisify(conn.query).bind(conn);
    const sql = `
      SELECT users.name, users.email, jobs.position, user_requests.status
      FROM user_requests
      JOIN users ON user_requests.user_id = users.id
      JOIN jobs ON user_requests.job_id = jobs.id
      WHERE user_requests.user_id = ${userId}
    `;
    const requests = await query(sql);

    if (requests.length === 0) {
      return res.status(404).json({ message: "No requests found" });
    }

    res.status(200).json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

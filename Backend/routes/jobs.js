const router = require("express").Router();
const conn = require("../db/dbConnection");
const authorized = require("../middleware/authorize");
const admin = require("../middleware/admin");
const { body, validationResult } = require("express-validator");
const util = require("util");
const { formatDate } = require("../utils");

// =========================== ADMIN CRUD JOBS ======================================= //

// ADMIN CREATE JOB [ Admin ]
router.post(
  "/create",
  admin,
  body("position")
    .isString()
    .withMessage("Please enter a valid job position.")
    .isLength({ min: 10 })
    .withMessage("Job position should be at least 10 characters long"),
  body("description")
    .isString()
    .withMessage("Please enter a valid job description!")
    .isLength({ min: 20 })
    .withMessage("Job description should be at least 20 characters long."),
  body("offer")
    .isDecimal({ decimal_digits: "1,2" })
    .withMessage("Please enter a valid job offer with up to 2 decimal places.")
    .isLength({ min: 1 })
    .withMessage("Please enter a valid job offer."),
  body("max_candidate_number")
    .isInt({ min: 1 })
    .withMessage("Maximum candidate number for a job should be at least 10."),
  body("qualifications")
    .isArray({ min: 1 })
    .withMessage("Please select at least one qualification.")
    .custom((qualifications) => {
      // Set have unique values
      if (new Set(qualifications).size !== qualifications.length) {
        throw new Error("Duplicate qualifications are not allowed.");
      }
      return true;
    })
    .custom(async (qualifications) => {
      const query = util.promisify(conn.query).bind(conn);
      const existingQualifications = await query(
        "SELECT id FROM qualifications WHERE id IN (?)",
        [qualifications]
      );

      return existingQualifications.length === qualifications.length;
    })
    .withMessage("One or more invalid qualifications selected."),

  async (req, res) => {
    try {
      // 1- VALIDATE THE REQUEST
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- PREPARE JOB OBJECT
      const job = {
        position: req.body.position,
        description: req.body.description,
        offer: req.body.offer,
        max_candidate_number: req.body.max_candidate_number,
      };

      // 3- INSERT JOB RECORD INTO DB
      const query = util.promisify(conn.query).bind(conn);
      const result = await query("INSERT INTO jobs SET ?", job);
      const jobId = result.insertId;

      // 4- INSERT JOB-QUALIFICATIONS RECORDS INTO DB
      const jobQualifications = req.body.qualifications.map(
        (qualificationId) => {
          return [jobId, qualificationId];
        }
      );
      await query(
        "INSERT INTO job_qualifications (job_id, qualification_id) VALUES ?",
        [jobQualifications]
      );

      res.status(200).json({
        msg: "Job Created Successfully!",
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ errors: [{ msg: "Internal server error" }] });
    }
  }
);

// ADMIN UPDATE JOB [ Admin ]
router.put(
  "/update/:id",
  admin,
  body("position")
    .isString()
    .withMessage("Please enter a valid job position.")
    .isLength({ min: 10 })
    .withMessage("Job position name should be at least 10 characters."),
  body("description")
    .isString()
    .withMessage("Please enter a valid description!")
    .isLength({ min: 20 })
    .withMessage("Job description should be at least 20 characters."),
  body("offer")
    .isDecimal({ decimal_digits: "1,2" })
    .withMessage("Please enter a valid job offer with up to 2 decimal places.")
    .isLength({ min: 1 })
    .withMessage("Please enter a valid job offer."),
  body("max_candidate_number")
    .isInt({ min: 1 })
    .withMessage("Max candidate number for a job should be at least 10."),
  body("qualifications")
    .isArray({ min: 1 })
    .withMessage("Please select at least one qualification.")
    .custom((qualifications) => {
      if (new Set(qualifications).size !== qualifications.length) {
        throw new Error("Duplicate qualifications are not allowed.");
      }
      return true;
    })
    .custom(async (qualifications) => {
      const query = util.promisify(conn.query).bind(conn);
      const existingQualifications = await query(
        "SELECT id FROM qualifications WHERE id IN (?)",
        [qualifications]
      );

      return existingQualifications.length === qualifications.length;
    })
    .withMessage("One or more invalid qualifications selected."),

  async (req, res) => {
    try {
      // 1- VALIDATE THE REQUEST
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 2- CHECK IF JOB EXISTS OR NOT
      const query = util.promisify(conn.query).bind(conn);
      const job = await query("SELECT * FROM jobs WHERE id = ?", [
        req.params.id,
      ]);

      if (!job[0]) {
        return res.status(404).json({ msg: "Job not found!" });
      }

      // 3- PREPARE JOB OBJECT
      const jobObj = {
        position: req.body.position,
        description: req.body.description,
        offer: req.body.offer,
        max_candidate_number: req.body.max_candidate_number,
      };

      // 4- UPDATE JOB OBJECT IN DB
      await query("UPDATE jobs SET ? WHERE id = ?", [jobObj, job[0].id]);

      // 5- UPDATE JOB-QUALIFICATIONS RECORDS IN DB
      const qualifications = req.body.qualifications || [];
      await query("DELETE FROM job_qualifications WHERE job_id = ?", [
        job[0].id,
      ]);
      const jobQualifications = qualifications.map((qualificationId) => {
        return [job[0].id, qualificationId];
      });
      await query(
        "INSERT INTO job_qualifications (job_id, qualification_id) VALUES ?",
        [jobQualifications]
      );

      res.status(200).json({
        msg: "Job updated successfully!",
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ errors: [{ msg: "Internal server error" }] });
    }
  }
);

// ADMIN DELETE JOB [ Admin ]
router.delete("/delete/:id", admin, async (req, res) => {
  try {
    //1- CHECK IF JOB EXISTS OR NOT
    const query = util.promisify(conn.query).bind(conn);
    const job = await query("SELECT * FROM jobs WHERE id = ?", [req.params.id]);

    if (!job[0]) {
      res.status(404).json({ msg: "Job not found!" });
      return;
    }

    //2- DELETE JOB OBJECT IN DB
    await query("DELETE FROM jobs WHERE id = ?", [job[0].id]);

    res.status(200).json({
      msg: "Job deleted successfully!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// ADMIN READ ALL JOBS [ ADMIN ]
router.get("/all", admin, async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    const jobs = await query(
      "SELECT j.*, q.description AS qualification FROM jobs j LEFT JOIN job_qualifications jq ON j.id = jq.job_id LEFT JOIN qualifications q ON jq.qualification_id = q.id"
    );
    const jobsWithQualifications = jobs.reduce((acc, job) => {
      const existingJob = acc.find((j) => j.id === job.id);
      if (existingJob) {
        existingJob.qualifications.push(job.qualification);
      } else {
        acc.push({
          id: job.id,
          position: job.position,
          description: job.description,
          offer: job.offer,
          max_candidate_number: job.max_candidate_number,
          qualifications: job.qualification ? [job.qualification] : [],
        });
      }
      return acc;
    }, []);
    res.status(200).json({ jobs: jobsWithQualifications });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// ADMIN READ SPECIFIC Job [ Admin ]
router.get("/:id", authorized, async (req, res) => {
  try {
    const { id } = req.params;
    const query = util.promisify(conn.query).bind(conn);
    const job = await query(
      `SELECT j.*, q.description AS qualification
       FROM jobs j
       LEFT JOIN job_qualifications jq ON j.id = jq.job_id
       LEFT JOIN qualifications q ON jq.qualification_id = q.id
       WHERE j.id = ${id}`
    );
    if (job.length === 0) {
      res.status(404).json({ message: "Job not found" });
    } else {
      // Create an object containing the job details and qualifications
      const jobWithQualifications = {
        id: job[0].id,
        position: job[0].position,
        description: job[0].description,
        offer: job[0].offer,
        max_candidate_number: job[0].max_candidate_number,
        qualifications: job.map((j) => j.qualification),
      };
      res.status(200).json(jobWithQualifications);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

// =========================== USER VIEW, FILTER AND SEARCH ============================= //

// USER VIEW AND FILTER JOBS
router.get("/", async (req, res) => {
  try {
    const query = util.promisify(conn.query).bind(conn);
    let jobs = await query(
      "SELECT j.*, q.description AS qualification FROM jobs j LEFT JOIN job_qualifications jq ON j.id = jq.job_id LEFT JOIN qualifications q ON jq.qualification_id = q.id"
    );

    // Filter by job position
    if (req.query.position) {
      jobs = jobs.filter((job) =>
        job.position.toLowerCase().includes(req.query.position.toLowerCase())
      );
    }

    // Filter by job offer
    if (req.query.offer) {
      jobs = jobs.filter((job) => job.offer >= req.query.offer);
    }

    // Filter by qualification
    if (req.query.qualification) {
      jobs = jobs.filter((job) =>
        job.qualifications.some(
          (qualification) =>
            qualification.toLowerCase() ===
            req.query.qualification.toLowerCase()
        )
      );
    }

    const jobsWithQualifications = jobs.reduce((acc, job) => {
      const existingJob = acc.find((j) => j.id === job.id);
      if (existingJob) {
        existingJob.qualifications.push(job.qualification);
      } else {
        acc.push({
          id: job.id,
          position: job.position,
          description: job.description,
          offer: job.offer,
          max_candidate_number: job.max_candidate_number,
          qualifications: job.qualification ? [job.qualification] : [],
        });
      }
      return acc;
    }, []);
    res.status(200).json({ jobs: jobsWithQualifications });
  } catch (error) {
    console.log(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// USER SEARCH JOB AND SAVE SEARCH HISTORY
router.get("/search/:id", authorized, async (req, res) => {
  try {
    // 1- CHECK IF USER EXISTS OR NOT
    const query = util.promisify(conn.query).bind(conn);
    const user = await query("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (!user[0]) {
      res.status(404).json({ msg: "User not found !" });
      return;
    }

    // 2- SEARCH FOR JOBS
    const search_text = req.query.search; // get the search keyword from the user
    const jobs = await query(
      `
      SELECT j.*, GROUP_CONCAT(q.description) AS qualifications_description
      FROM jobs j 
      JOIN job_qualifications jq ON j.id = jq.job_id
      JOIN qualifications q ON jq.qualification_id = q.id
      WHERE j.position LIKE ?
      OR j.offer LIKE ?
      OR CAST(j.max_candidate_number AS CHAR) LIKE ?
      GROUP BY j.id`,
      [`%${search_text}%`, `%${search_text}%`, `%${search_text}%`]
    );

    // 3- SAVE SEARCH HISTORY
    if (search_text && jobs.length > 0) {
      const jobIds = jobs.map((job) => job.id);
      const currentTime = new Date();
      const searchHistory = {
        user_id: user[0].id,
        job_id: jobIds.join(","),
        search_text: search_text,
        search_time: currentTime,
      };
      await query("INSERT INTO user_search_history SET ?", searchHistory);
    }

    if (jobs.length === 0) {
      res.status(404).json({ msg: "No search results found" });
    } else {
      // Modify the jobs array to remove the qualifications_description field and add the qualifications field as an array of individual descriptions
      const modifiedJobs = jobs.map((job) => {
        const { qualifications_description, ...rest } = job;
        const qualifications = qualifications_description.split(",");
        return { ...rest, qualifications };
      });
      res.status(200).json({
        jobs: modifiedJobs,
        search: search_text,
        msg: "Search Completed Successfully !",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// RETRIEVE SEARCH HISTORY FOR THE USER [ USER CAN SEE HIS SEARCH HISTORY]
router.get("/search_history/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;
    const query = util.promisify(conn.query).bind(conn);
    const searchHistory = await query(
      `
       SELECT search_text, search_time
       FROM user_search_history
       WHERE user_id = ?
       ORDER BY search_time DESC
       `,
      [userId]
    );
    const formattedSearchHistory = searchHistory.map((history) => ({
      search_text: history.search_text,
      search_time: formatDate(history.search_time),
    }));
    res.status(200).json({
      search_history: formattedSearchHistory,
      msg: "Search history retrieved successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// =================================== USER REQUESTS ============================================= //

// USER SEND REQUEST TO JOB [ User ]
router.post("/apply/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const jobId = req.body.job_id;

    // 1. Check if user exists
    const user = await util.promisify(conn.query).bind(conn)(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );
    if (!user[0]) {
      res.status(404).json({ msg: "User not found!" });
      return;
    }

    // 2. Check if job exists and has available slots
    const job = await util.promisify(conn.query).bind(conn)(
      `
      SELECT *
      FROM jobs
      WHERE id = ? 
        AND max_candidate_number > (
          SELECT COUNT(*) FROM user_requests WHERE job_id = ? AND status = 'accepted'
        )
      `,
      [jobId, jobId]
    );
    if (!job[0]) {
      res.status(404).json({
        msg: "Job not found or maximum number of candidates has been reached!",
      });
      return;
    }

    // 3. Check if user has already applied for this job
    const existingRequest = await util.promisify(conn.query).bind(conn)(
      "SELECT * FROM user_requests WHERE user_id = ? AND job_id = ?",
      [userId, jobId]
    );
    if (existingRequest.length > 0) {
      res.status(400).json({ msg: "You have already applied for this job!" });
      return;
    }

    // 4. Insert job request into user_requests table with 'pending' status and request time
    const insertRequest = await util.promisify(conn.query).bind(conn)(
      "INSERT INTO user_requests (user_id, job_id, status, requested_time) VALUES (?, ?, ?, NOW())",
      [userId, jobId, "pending"]
    );

    res.status(200).json({ msg: "Job request sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// SEE  USER STATUS OF APPLIED JOB by job_id
router.get("/status/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const jobId = req.query.jobId;

    // Retrieve the job application status for the given user and job
    const status = await util.promisify(conn.query).bind(conn)(
      "SELECT status FROM user_requests WHERE user_id = ? AND job_id = ?",
      [userId, jobId]
    );

    if (status.length === 0) {
      res
        .status(404)
        .json({ msg: "No job application found for this user and job" });
      return;
    }

    res.status(200).json({ jobId: jobId, status: status[0].status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

// SEE  USER STATUS OF ALL APPLIED JOB
router.get("/status/all/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Retrieve the job application statuses for the given user
    const query = `
      SELECT j.position, ur.status, ur.requested_time, ur.job_id 
      FROM jobs j 
      INNER JOIN user_requests ur ON j.id = ur.job_id 
      WHERE ur.user_id = ?`;
    const result = await util.promisify(conn.query).bind(conn)(query, [userId]);

    if (result.length === 0) {
      res.status(404).json({ msg: "No job applications found for this user" });
      return;
    }

    const jobApplications = result.map(
      ({ position, status, requested_time, job_id }) => {
        return {
          jobId: job_id,
          position,
          status,
          requested_time: formatDate(requested_time),
        };
      }
    );

    res.status(200).json({ jobApplications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: [{ msg: "Internal server error" }] });
  }
});

module.exports = router;

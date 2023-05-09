// ================ INIYIALIZE EXPRESS APP ================ //
const express = require("express");
const app = express();

// ================ GLOBAL MIDDLEWARE ================ //
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // TO ACCESS URL FORM ENCODED
app.use(express.static("public"));
const cors = require("cors");
app.use(cors()); // ALLOW HTTP REQUESTS LOCAL HOSTS

// ================ REQUIRED MODULE ================ //
const auth = require("./routes/Auth");
const jobs = require("./routes/jobs");
const applicants = require("./routes/applicants");
const qualifications = require("./routes/qualifications");

// ================ RUN THE APP ================ //
app.listen(4000, "localhost", () => {
  console.log("Server is Running on Port 4000");
});

// ================ API ROUTES [ END POINTS ] ================ //
app.use("/auth", auth);
app.use("/jobs", jobs);
app.use("/applicants", applicants);
app.use("/qualifications", qualifications);

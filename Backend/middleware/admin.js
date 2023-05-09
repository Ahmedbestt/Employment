const conn = require("../db/dbConnection");
const util = require("util");

const admin = async (req, res, next) => {
  const query = util.promisify(conn.query).bind(conn); // Transform Query mysql --> promis to use [ await, async ]
  const { token } = req.headers;
  const admin = await query("select * from users where token = ?", [token]);
  if (admin[0] && admin[0].type == "1") {
    next();
  } else {
    res
      .status(403)
      .json({ msg: "You are not Authorized to access this route !" });
  }
};

module.exports = admin;

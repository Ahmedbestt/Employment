const conn = require("../db/dbConnection");
const util = require("util");

const authorized = async (req, res, next) => {
  const query = util.promisify(conn.query).bind(conn); // Transform Query mysql --> promis to use [ await, async ]
  const { token } = req.headers;
  const user = await query("select * from users where token = ?", [token]);
  if (user[0]) {
    next();
  } else {
    res
      .status(403)
      .json({ msg: "You are not Authorized to access this route !" });
  }
};

module.exports = authorized;

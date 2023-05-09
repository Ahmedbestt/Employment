// Setting up a connection to a MySQL database
const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "employment-db",
  port: "3306",
});

connection.connect((err) => {
  if (err) throw err;
  console.log("DB CONNECTED SUCCESSFULLY!");
});

module.exports = connection;

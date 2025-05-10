// To hash password, security feature
// can be add an input to replace the static "password"

const bcrypt = require("bcrypt");
bcrypt.hash("password", 10).then(console.log);

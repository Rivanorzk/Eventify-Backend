import bcrypt from "bcrypt"

const password = "vano1234"

bcrypt.hash(password, 10).then(console.log)
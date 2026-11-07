import bcrypt from "bcrypt"

const password = "Nahwan1946"

bcrypt.hash(password, 10).then(console.log)
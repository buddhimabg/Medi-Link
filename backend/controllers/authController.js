const User = require('../models/user');
const bcrypt = require('bcryptjs');

const registerPatient = async (req, res) => {
  try {
    const { name, email, password, gender, city, dob } = req.body;

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Scramble password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to database
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      gender,
      city,
      dob,
      role: 'patient'
    });

    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Keep your existing loginUser logic here!
const loginUser = async (req, res) => {
   // ... your login code ...
};

module.exports = { registerPatient, loginUser };
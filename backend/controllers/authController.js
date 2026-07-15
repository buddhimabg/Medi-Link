const User = require('../models/user');
const bcrypt = require('bcryptjs');

const registerPatient = async (req, res) => {
  try {
    const { name, email, password, mobile, gender, city, dob } = req.body;
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
      mobile,
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

// loginUser logic
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    //Find the user in the database by their email
    const user = await User.findOne({ email });
    
    if (!user) {
       
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    // 2. Compare the typed password with the scrambled password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
       
      return res.status(400).json({ message: "Invalid password. Please try again." });
    }

    
     
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      gender: user.gender,
      city: user.city,
      dob: user.dob,
      role: user.role,
      message: "Login successful!"
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};


const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

     
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const googleUser = await googleResponse.json();

    if (!googleUser.email) {
      return res.status(400).json({ message: "Google authentication failed." });
    }

    // 2. Check if this user already exists in our database
    let user = await User.findOne({ email: googleUser.email });

    if (user) {
      // USER EXISTS: Log them in!
      return res.status(200).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        city: user.city,
        dob: user.dob,
        role: user.role,
        message: "Logged in with Google successfully"
      });
    } else {
      // NEW USER: Create an account for them automatically
      // Generate a random 16-character password since they are using Google
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        password: hashedPassword,
         
        mobile: "Not Provided",
        gender: "Not Provided",
        city: "Not Provided",
        dob: new Date("2000-01-01"),  
      });

      return res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        gender: user.gender,
        city: user.city,
        dob: user.dob,
        role: user.role,
        message: "Google account registered successfully"
      });
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ message: "Server error during Google authentication" });
  }
};
module.exports = { registerPatient, loginUser,googleLogin };
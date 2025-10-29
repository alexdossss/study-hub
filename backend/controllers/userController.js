import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// 🔑 Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// 🧩 @desc    Register new user
// @route     POST /api/users/register
// @access    Public
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, birthday, bio } = req.body;

    if (!username || !email || !password || !birthday)
      return res.status(400).json({ message: "Required fields are missing" });

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser)
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });

    const user = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      birthday,
      bio: bio || "",
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        birthday: user.birthday,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧩 @desc    Authenticate user & get token
// @route     POST /api/users/login
// @access    Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        message: "Login successful",
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
        },
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🧩 @desc    Get user profile
// @route     GET /api/users/profile
// @access    Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      res.json({
        message: "Profile fetched successfully",
        user,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

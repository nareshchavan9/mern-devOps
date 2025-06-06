const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, voterID, password, age } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { voterID }] });
    
    if (user) {
      return res.status(400).json({ 
        message: 'User with this email or voter ID already exists' 
      });
    }
    
    // Create new user
    user = new User({
      fullName,
      email,
      voterID,
      password,
      age,
      isVerified:true
    });
    
    await user.save();
    
    // TODO: In a production environment, send verification email here
    
    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { voterID, password } = req.body;
    
    // Find user
    const user = await User.findOne({ voterID });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deleted' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.isVerified && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }
    
    // Generate JWT token with role information
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        voterID: user.voterID 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Return user data with role information
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        voterID: user.voterID,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, email, phone, age, voterID } = req.body;
    
    // Input validation
    if (age && (age < 18 || age > 120)) {
      return res.status(400).json({ message: 'Age must be between 18 and 120' });
    }

    if (phone && !/^\+?[1-9]\d{9,14}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }
    
    // Check if email or voterID already exists for another user
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: req.user.id } },
        { $or: [{ email }, { voterID }] }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email or Voter ID is already in use by another user' 
      });
    }
    
    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          fullName,
          email,
          phone,
          age,
          voterID
        }
      },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// Get all registered voters (Admin only)
router.get('/voters', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ageRange } = req.query;
    let query = { role: 'voter', isActive: true };

    // Add age range filter if specified
    if (ageRange) {
      switch (ageRange) {
        case '18-60':
          query.age = { $gte: 18, $lte: 60 };
          break;
        case '61+':
          query.age = { $gte: 61 };
          break;
        // If no valid range specified, return all voters
      }
    }

    const voters = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    // Get total counts for each age range
    const stats = {
      total: await User.countDocuments({ role: 'voter', isActive: true }),
      age18To60: await User.countDocuments({ 
        role: 'voter', 
        isActive: true,
        age: { $gte: 18, $lte: 60 }
      }),
      age61Plus: await User.countDocuments({ 
        role: 'voter', 
        isActive: true,
        age: { $gte: 61 }
      })
    };
    
    res.json({
      voters,
      stats
    });
  } catch (error) {
    console.error('Error fetching voters:', error);
    res.status(500).json({ message: 'Server error while fetching voters' });
  }
});

//Deactivate own account (for voters)
router.post('/deactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user and update isActive status
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Account has been Deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during account deletion' 
    });
  }
});

// router.delete('/delete', authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const user = await User.findByIdAndDelete(userId);
//     if (!user) {
//       return res.status(404).json({ 
//         success: false,
//         message: 'User not found' 
//       });
//     }
//     res.json({ 
//       success: true,
//       message: 'Account deleted successfully'
//     });
//   } catch (error) {
//     console.error('Account deletion error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during account deletion' 
//     });
//   }
// })

// Admin: Deactivate voter
router.post('/voters/:id/deactivate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const voterId = req.params.id;
    
    // Check if user exists and is a voter
    const voter = await User.findById(voterId);
    
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    
    if (voter.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }
    
    // Deactivate the voter
    voter.isActive = false;
    await voter.save();
    
    res.json({ message: 'Voter deleted successfully' });
  } catch (error) {
    console.error('Voter deactivation error:', error);
    res.status(500).json({ message: 'Server error during voter delete' });
  }
});

module.exports = router;

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Election = require('./models/Election');

// MongoDB connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-ballot';

// Sample admin data
const adminUsers = [
  {
    fullName: 'Admin User',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    voterID: 'ADMIN001',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    age: 35,
    isVerified: true,
    isActive: true,
    role: 'admin'
  },
  {
    fullName: 'Second Admin',
    email: 'admin2@example.com',
    voterID: 'ADMIN002',
    password: 'admin456',
    age: 30,
    isVerified: true,
    isActive: true,
    role: 'admin'
  }
];

// Sample voter data
const sampleUsers = [
  {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    voterID: 'VOT123456',
    password: 'password123',
    age: 25,
    isVerified: true,
    isActive: true,
    role: 'voter'
  },
  {
    fullName: 'Jane Smith',
    email: 'jane.smith@example.com',
    voterID: 'VOT654321',
    password: 'password123',
    age: 45,
    isVerified: true,
    isActive: true,
    role: 'voter'
  },
  {
    fullName: 'Robert Wilson',
    email: 'robert.wilson@example.com',
    voterID: 'VOT789012',
    password: 'password123',
    age: 65,
    isVerified: true,
    isActive: true,
    role: 'voter'
  }
];

// Sample election data (no createdBy yet)
const sampleElections = [
  {
    title: 'City Mayor Election 2025',
    description: 'Vote for the next mayor of your city for the term 2025-2029.',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-06-03'),
    status: 'upcoming',
    candidates: [
      {
        name: 'Jane Smith',
        party: 'Progressive Party',
        bio: 'Current city council member with 8 years of experience.'
      },
      {
        name: 'Michael Johnson',
        party: 'Civic Alliance',
        bio: 'Business owner and community advocate.'
      },
      {
        name: 'Patricia Williams',
        party: 'Unity Coalition',
        bio: 'Former school principal and nonprofit director.'
      }
    ]
  },
  {
    title: 'Community Board Election',
    description: 'Select representatives for the community board.',
    startDate: new Date('2025-05-15'),
    endDate: new Date('2025-05-18'),
    status: 'active',
    candidates: [
      {
        name: 'Robert Chen',
        party: 'Independent',
        bio: 'Local business owner and longtime resident.'
      },
      {
        name: 'Sarah Johnson',
        party: 'Community First',
        bio: 'Social worker with experience in community organizing.'
      },
      {
        name: 'David Patel',
        party: 'Neighborhood Alliance',
        bio: 'Urban planner and volunteer.'
      }
    ]
  },
  {
    title: 'School District Budget Vote',
    description: 'Vote on the proposed school district budget for 2025-2026.',
    startDate: new Date('2025-05-01'),
    endDate: new Date('2025-05-10'),
    status: 'completed',
    candidates: [
      {
        name: 'Approve Budget',
        party: 'Budget Plan A',
        bio: 'Approve with 3% funding increase and new tech initiatives.'
      },
      {
        name: 'Reject Budget',
        party: 'Budget Plan B',
        bio: 'Reject and revise with current spending levels.'
      }
    ]
  }
];

// Function to hash passwords
async function hashPasswords(users) {
  const hashedUsers = [];
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    hashedUsers.push({ ...user, password: hashedPassword });
  }
  return hashedUsers;
}

// Seed function
async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('Using MongoDB URI:', process.env.MONGODB_URI);
    // Clear previous data
    await User.deleteMany({});
    await Election.deleteMany({});
    console.log('Cleared existing data');

    // Create and save admin users with hashed passwords
    const hashedAdmins = await hashPasswords(adminUsers);
    const createdAdmins = await User.insertMany(hashedAdmins);
    console.log('Created admin users');

    // Create and save sample voters
    const hashedVoters = await hashPasswords(sampleUsers);
    await User.insertMany(hashedVoters);
    console.log('Created sample users');

    // Add createdBy (first admin's _id) to each election
    const electionsWithCreator = sampleElections.map(election => ({
      ...election,
      createdBy: createdAdmins[0]._id
    }));

    // Insert elections
    await Election.insertMany(electionsWithCreator);
    console.log('Created sample elections');

    // Summary stats
    const stats = {
      voters61Plus: await User.countDocuments({ role: 'voter', age: { $gte: 61 } }),
      admins: await User.countDocuments({ role: 'admin' }),
      elections: await Election.countDocuments()
    };

    console.log('\nDatabase Summary:');
    console.log('----------------');
    console.log(`Voters (61+): ${stats.voters61Plus}`);
    console.log(`Admins: ${stats.admins}`);
    console.log(`Elections: ${stats.elections}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run seed function
seedDatabase();

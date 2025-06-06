const request = require('supertest');
const app = require('../server'); // Adjust if your express app is exported elsewhere
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Auth API', () => {
  beforeAll(async () => {
    // Connect to a test database
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        voterID: 'VOT123456',
        password: 'password123',
        age: 25
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/Registration successful/i);
  });

  it('should not register with duplicate email', async () => {
    await User.create({
      fullName: 'Test User',
      email: 'test@example.com',
      voterID: 'VOT123456',
      password: 'password123',
      age: 25
    });
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        email: 'test@example.com',
        voterID: 'VOT654321',
        password: 'password123',
        age: 25
      });
    expect(res.statusCode).toBe(400);
  });
});

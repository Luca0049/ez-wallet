import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require("bcryptjs")
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
  const dbName = "testingDatabaseAuth";
  const url = `${process.env.MONGO_URI}/${dbName}`;

  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

//necessary setup to ensure that each test can insert the data it needs
beforeEach(async () => {
  await User.deleteMany({})
})

// tokens
const adminAccessTokenValid = jwt.sign({
  email: "admin@email.com",
  //id: existingUser.id, The id field is not required in any check, so it can be omitted
  username: "admin",
  role: "Admin"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const testerAccessTokenValid = jwt.sign({
  email: "user1@email.com",
  username: "user1",
  role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
const testerAccessTokenExpired = jwt.sign({
  email: "user1@email.com",
  username: "user1",
  role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })

describe('register', () => {
  test('Returns a 400 error if the email in the request body identifies an already existing user', async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/register") //Route to call
      .send({username: "user2", email: "user1@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "this email is already been used");
  });

  test('Returns a 400 error if the username in the request body identifies an already existing user', async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/register") //Route to call
      .send({username: "user1", email: "user2@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "this username is already been used");
  });

  test('Returns 200 successful insertion', async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/register") //Route to call
      .send({username: "user2", email: "user2@email.com", password: "securePass"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("message", "User added successfully");
  });
});

describe("registerAdmin", () => { 
  test('Returns a 400 error if the email in the request body identifies an already existing user', async () => {
    await User.insertMany([{
      username: "admin1",
      email: "admin1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/admin") //Route to call
      .send({username: "admin2", email: "admin1@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "this email is already been used for an Admin");
  });

  test('Returns a 400 error if the username in the request body identifies an already existing user', async () => {
    await User.insertMany([{
      username: "admin1",
      email: "admin1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/admin") //Route to call
      .send({username: "admin1", email: "admin2@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "this username is already been used for an Admin");
  });

  test('Returns 200 successful insertion', async () => {
    await User.insertMany([{
      username: "admin1",
      email: "admin1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/admin") //Route to call
      .send({username: "admin2", email: "admin2@email.com", password: "securePass"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("message", "Admin added successfully");
  });
})

describe('login', () => { 
  test('Returns a 400 error if the email in the request body does not identify a user in the database', async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/login") //Route to call
      .send({email: "user2@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "please you need to register");
  });

  test('Returns a 400 error if the supplied password does not match with the one in the database', async () => {
    const hashedPassword = await bcrypt.hash("tester", 12);
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: hashedPassword,
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/login") //Route to call
      .send({email: "user1@email.com", password: "securePass"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "wrong credentials");
  });

  test('Returns 200, successful login', async () => {
    const hashedPassword = await bcrypt.hash("tester", 12);
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: hashedPassword,
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .post("/api/login") //Route to call
      .send({email: "user1@email.com", password: "tester"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("accessToken");
    expect(response.body.data).toHaveProperty("refreshToken");
  });
});

describe('logout', () => { 
  test(`Returns a 400 error if the refresh token in the request's cookies does not represent a user in the database`, async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .get("/api/logout") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`) //Setting cookies in the request
      .send({});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found with the provided Refresh Token");
  });

  test(`Returns a 401 error if the user has not simple authorization`, async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenEmpty
    }]);

    const response = await request(app)
      .get("/api/logout") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenEmpty}; refreshToken=${testerAccessTokenEmpty}`) //Setting cookies in the request
      .send({});

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error");
  });

  test(`Returns 200, logout successfully`, async () => {
    await User.insertMany([{
      username: "user1",
      email: "user1@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .get("/api/logout") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("message", "User logged out");
  });
});

import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import { transactions, categories } from '../models/model';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

import jwt from 'jsonwebtoken';

/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */
dotenv.config();
beforeAll(async () => {
  //jest.setTimeout(60000);
  const dbName = "testingDatabaseController";
    const url = `${process.env.MONGO_URI}/${dbName}`;

    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

});

/**
 * After all test cases have been executed the database is deleted.
 * This is done so that subsequent executions of the test suite start with an empty database.
 */
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

/* Tokens */
const adminAccessTokenValid = jwt.sign({
  email: "admin@email.com",
  //id: existingUser.id, The id field is not required in any check, so it can be omitted
  username: "admin",
  role: "Admin"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const testerAccessTokenValid = jwt.sign({
  email: "tester@test.com",
  username: "tester",
  role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
const testerAccessTokenExpired = jwt.sign({
  email: "tester@test.com",
  username: "tester",
  role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })

describe("getUsers", () => {
  /**
   * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
   */
  beforeEach(async () => {
    await User.deleteMany({})
  })

  test('Returns a 401 error if called by an authenticated user who is not an admin', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .get("/api/users") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error");
  });

  test('Returns 200, empty array', async () => {
    const response = await request(app)
      .get("/api/users") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data", []);
  });

  test('Returns 200, array with users', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);
    const response = await request(app)
      .get("/api/users") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => { 
      expect(member).toEqual( 
        expect.objectContaining({username: expect.any(String), email: expect.any(String), role: expect.any(String)})
      )
    });
  });
  
})

describe("getUser", () => {
  /**
   * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
   */
  beforeEach(async () => {
    await User.deleteMany({})
  })

  test('Returns a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter (authType = User) nor an admin (authType = Admin)', async () => {
    const user = "notTester";

    const response = await request(app)
      .get('/api/users/' + user) //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error");
  });

  test('Auth as User, Returns a 400 error if the username passed as the route parameter does not represent a user in the database', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "user",
      email: "user@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const user = "tester";
    const response = await request(app)
      .get('/api/users/' + user) //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");
  });

  test('Auth as Admin, Returns a 400 error if the username passed as the route parameter does not represent a user in the database', async () => {
    await User.insertMany([{
      username: "admin1",
      email: "admin1@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const user = "admin";
    const response = await request(app)
      .get('/api/users/' + user) //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");
  });

  test('Auth as User, Returns 200, user find successfully', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const user = "tester";
    const response = await request(app)
      .get('/api/users/' + user) //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.objectContaining({username: "tester", email: "tester@test.com", role: "Regular"}));
  });

  test("Auth as Admin, Returns 200, user find successfully", async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const user = "admin";
    const response = await request(app)
      .get('/api/users/' + user) //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send();

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.objectContaining({username: "admin", email: "admin@email.com", role: "Admin"}));
  });
})

describe("createGroup", () => {
  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })
  test('Returns a 400 error if the group name passed in the request body represents an already existing group in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "There is already an existing group with the same name");
  });

  test('Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "All the memberEmails either do not exist or are already in a group");
  });
  
  test('Returns a 400 error if the user who calls the API is already in a group', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester",
                email: "tester@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User who calls the API is already in a group");
  });

  test('Returns a 400 error if at least one of the member emails is not in a valid email format', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.redemail.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  test('Returns a 400 error if at least one of the member emails is an empty string', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", ""]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  test('Returns a 401 error if called by a user who is not authenticated (authType = Simple)', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]});

    expect(response.status).toBe(401)
  });

  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]});

    expect(response.status).toBe(200)
  });

  test('Return 200 for correct behaviour V2', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      email: "admin@email.com",
      //id: existingUser.id, The id field is not required in any check, so it can be omitted
      username: "admin",
      role: "Admin",
      password: "admin",
      refreshToken: adminAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester",
                email: "tester@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])

    const response = await request(app)
      .post("/api/groups") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: "testGroup2", memberEmails: ["mario.red@email.com", "luigi.red@email.com", "tester@test.com"]});

    expect(response.status).toBe(200)
  });

  
})

describe("getGroups", () => {

  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })
  test('Returns a 401 error if called by a user who is not authenticated (authType = Simple)', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    
    const response = await request(app)
      .get("/api/groups/" ) //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`) //Setting cookies in the request
      

    expect(response.status).toBe(401)
  });

  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .get("/api/groups") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      

    expect(response.status).toBe(200)
  });
 })

describe("getGroup", () => {

  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })
  test('Returns a 401 error if called by a user who is not authenticated (authType = Simple)', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .get("/api/groups/" + name) //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`) //Setting cookies in the request
      

    expect(response.status).toBe(401)
  });

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroupNotInDB"
    const response = await request(app)
      .get("/api/groups/" + name) //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty("error", "The group does not exist");
      
  });

  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .get("/api/groups/" + name) //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      

    expect(response.status).toBe(200)
  });
  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenExpired
    }]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                email: "admin@email.com",
                //id: existingUser.id, The id field is not required in any check, so it can be omitted
                username: "admin",
                role: "Admin"
            },{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .get("/api/groups/" + name) //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      

    expect(response.status).toBe(200)
  });
 })


describe("addToGroup", () => {

  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })
  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroupNotInDB"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The group does not exist");
  });

  test('Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "All the emails either do not exist or are already in a group");
  });

  test('Returns a 400 error if at least one of the member emails is not in a valid email format', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.redemail.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  test('Returns a 400 error if at least one of the member emails is an empty string', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com",""]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  // authType = Group non implemented yet
  test('Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/add', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(401)
    
  });

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/insert`', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/insert") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(401)
    
  });

  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/insert") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(200)
    
    
  });

  test('Return 200 for correct behaviour V2', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                email: "admin@email.com",
                //id: existingUser.id, The id field is not required in any check, so it can be omitted
                username: "admin",
                role: "Admin",
      },{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/insert") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(200)
    
    
  });

  
 })

describe("removeFromGroup", () => {

  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })
  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroupNotInDB"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The group does not exist");
  });

  test('Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            },{
            username: "mario",
            email: "mario.red@email.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
          }]  
   
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "All the emails either do not exist or are not in the group");
  });

  test('Returns a 400 error if at least one of the member emails is not in a valid email format', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            },{
              username: "mario",
              email: "mario.red@email.com",
              password: "tester",
              refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.redemail.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  test('Returns a 400 error if at least one of the member emails is an empty string', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
      }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/add") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com",""]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "At least one of the member emails is not in a valid email format");
  });

  test('Returns a 400 error if the group contains only one member before deleting any user', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The group contains only one member");
  });

  test('Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/add', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
    name: "testGroup",
    members: [{
      email: "admin@email.com",
      //id: existingUser.id, The id field is not required in any check, so it can be omitted
      username: "admin",
      role: "Admin"
      },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
      }]  
  }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(401)
    
  });

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/insert`', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
          },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
        }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(401)
    
  });


  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
        username: "mario",
        email: "mario.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
          username: "luigi",
          email: "luigi.red@email.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com"]});

    expect(response.status).toBe(200)
    
    
  });

  test('Return 200 for correct behaviour V2 (for testing all lines)', async () => {
    await User.insertMany([{
      username: "tester2",
      email: "tester2@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
        username: "mario",
        email: "mario.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
          username: "luigi",
          email: "luigi.red@email.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com", "tester2@test.com"]});

    expect(response.status).toBe(200)
    
    
  });

  test('Return 200 for correct behaviour V3 (for testing all lines)', async () => {
    await User.insertMany([{
      username: "tester2",
      email: "tester2@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      email: "admin@email.com",
      //id: existingUser.id, The id field is not required in any check, so it can be omitted
      username: "admin",
      role: "Admin"
      },{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
        username: "mario",
        email: "mario.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
        },{
          username: "luigi",
          email: "luigi.red@email.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .patch("/api/groups/" + name + "/pull") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name, emails: ["mario.red@email.com","luigi.red@email.com", "tester2@test.com"]});

    expect(response.status).toBe(200)
    
    
  });
 })

describe("deleteUser", () => {
  /**
   * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
   */
  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
  })

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)', async () => {
    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({email: "tester@test.com"});

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", "Unauthorized");
  });

  test('Returns a 400 error if the email passed in the request body does not represent a user in the database', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({email: "user@test.com"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");
  });

  test('Returns a 400 error if the email passed in the request body represents an admin', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({email: "admin@email.com"});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Email passed in the request body represents an admin");
  });

  test('Returns 200, user not in a group, no transactions', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);

    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({email: "tester@test.com"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("deletedTransactions", 0);
    expect(response.body.data).toHaveProperty("deletedFromGroup", false);
  });

  test('Returns 200, user in group, user is the only member in the group, no transactions', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);
    await Group.insertMany([{
      name: "group1",
      members: [{email:"tester@test.com"}]
    }]);
    // console.log( await Group.find({}))

    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({email: "tester@test.com"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("deletedTransactions", 0);
    expect(response.body.data).toHaveProperty("deletedFromGroup", true);

    // console.log(await Group.find({}))
  });

  test('Returns 200, user in group, user is NOT the only member in the group, no transactions', async () => {
    await User.insertMany([{
      username: "admin",
      email: "admin@email.com",
      password: "admin",
      role: "Admin",
      refreshToken: adminAccessTokenValid
    },{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }]);
    await Group.insertMany([{
      name: "group1",
      members: [{email:"tester@test.com"}, {email: "admin@email.com"}]
    }]);
    // console.log( await Group.find({}))

    const response = await request(app)
      .delete('/api/users') //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({email: "tester@test.com"});

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("deletedTransactions", 0);
    expect(response.body.data).toHaveProperty("deletedFromGroup", true);

    // console.log(await Group.find({}))
  });
})

describe("deleteGroup", () => {
  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })

  test('Returns a 400 error if the name passed in the request body is an empty string', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = " "
    const response = await request(app)
      .delete("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The group name passed in the request body is an empty string");
  });

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    },
    { 
      username: "luigi",
      email: "luigi.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

    await Group.insertMany([{
      name: "testGroup",
      members: [{
                username: "tester2",
                email: "tester2@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }]  
     }])
    let name = "testGroupNotInDB"
    const response = await request(app)
      .delete("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The group does not exist");
  });

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
          },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
        }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .delete("/api/groups") //Route to call
      .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) //Setting cookies in the request
      .send({name: name});

    expect(response.status).toBe(401)
    
  });

  test('Return 200 for correct behaviour', async () => {
    await User.insertMany([{
      username: "tester",
      email: "tester@test.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
    }
  ]);

  await Group.insertMany([{
      name: "testGroup",
      members: [{
        username: "tester2",
        email: "tester2@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
          },{
      username: "mario",
      email: "mario.red@email.com",
      password: "tester",
      refreshToken: testerAccessTokenValid
        }]  
    }])
    let name = "testGroup"
    const response = await request(app)
      .delete("/api/groups") //Route to call
      .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) //Setting cookies in the request
      .send({name: name});

    expect(response.status).toBe(200)
    
  });


 })

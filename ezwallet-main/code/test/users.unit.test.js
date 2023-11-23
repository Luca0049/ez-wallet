import {User, Group} from '../models/User.js'
import { verifyAuth, emailFromToken } from '../controllers/utils.js';
import request from 'supertest';
import { app } from '../app';
import * as myUsers from '../controllers/users.js';
const bcrypt = require("bcryptjs")

/* --Gabriele-- */
import { getUsers, getUser, deleteUser, getGroupByUserEmail} from '../controllers/users.js'
// jest.mock('../controllers/users.js');
// jest.mock('../controllers/users.js', () => ({
//   getGroupByUserEmail: jest.fn()
// }));
/* ------------ */

jest.mock("bcryptjs")
jest.mock("jsonwebtoken")
jest.mock("../models/User.js")
jest.mock("../models/model.js")
/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock("../models/User.js")

jest.mock('../controllers/utils.js', () => ({
  verifyAuth: jest.fn(),
  emailFromToken: jest.fn()
}));


/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks()
  
});



describe("getUsers", () => {
  test("Returns a 401 error if called by an authenticated user who is not an admin", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      url: "/api/logout"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await getUsers(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  })

  test("Returns 200, empty array", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      url: "/api/logout"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUserList = [];
    User.find.mockResolvedValueOnce(mockUserList);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUsers(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [],
      refreshedTokenMessage: "message"
    }));
  })

  test("Returns 200, array with users", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      url: "/api/logout"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUserList = [{username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"}, {username: "user2", email: "user2@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"}];
    User.find.mockResolvedValueOnce(mockUserList);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUsers(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining(mockUserList),
      refreshedTokenMessage: "message"
    }));
  })

  test("Returns 500, throw an error", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      url: "/api/logout"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUserList = [];
    User.find.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUsers(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
})

describe("getUser", () => {
  test("Returns a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter (authType = User) nor an admin (authType = Admin)", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "user1"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String)
    }));
  });

  test("Auth as User, Returns a 400 error if the username passed as the route parameter does not represent a user in the database", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "user1"},
      url: "/api/users/user1"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    User.findOne.mockResolvedValueOnce(null);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "User not found"
    }));
  });

  test("Auth as Admin, Returns a 400 error if the username passed as the route parameter does not represent a user in the database", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "user1"},
      url: "/api/users/user1"
    }
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "Authorized" }
    })
    User.findOne.mockResolvedValueOnce(null);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "User not found"
    }));
  });

  test("Auth as User, Returns 200, user find successfully", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "user1"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUser = {username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
    User.findOne.mockResolvedValueOnce(mockUser);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        username: "user1",
        email: "user1@email",
        role: "Regular"
      }),
      refreshedTokenMessage: "message"
    }));
  });

  test("Auth as Admin, Returns 200, user find successfully", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "admin1"},
      url: "/api/users"
    }
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUser = {username: "admin1", email: "admin1@email", password: "securePass", refreshToken: "refreshToken", role: "Admin"};
    User.findOne.mockResolvedValueOnce(mockUser);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        username: "admin1",
        email: "admin1@email",
        role: "Admin"
      }),
      refreshedTokenMessage: "message"
    }));
  });

  test("Auth as Admin, Return 500, throw an error", async () => {
    const mockReq = {
      cookies: {refreshToken: "refreshToken"},
      params: {username: "admin1"},
      url: "/api/users"
    }
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockUser = {username: "admin1", email: "admin1@email", password: "securePass", refreshToken: "refreshToken", role: "Admin"};
    User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "message"
      }
    }

    await getUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
})

// describe("getGroupName", () => {
//   test("Returns a name", async () => {
    

//     const email = 'example@example.com';
//     const groupName = 'Test Group';

//     // Mock the Group.findOne method to return a specific group
//     const mockGroup = {
//       name: groupName,
//     };
//     Group.findOne.mockResolvedValue(mockGroup);

//     // Call the function being tested
//     const result = await myUsers.getGroupName(email);

//     // Check the expected result
//     expect(result).toBe(groupName);
//   });


// })

describe("createGroup", () => {
  test('Returns a 400 error if the request body does not contain the name of the group', async ()=> {
    const mockReq = {
      body: {
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test('Returns a 400 error if the group name passed in the request body is an empty string', async ()=> {
    const mockReq = {
      body: {
          name: " ",
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "The group name passed in the request body is an empty string"
    }));
    
  })

  test('Returns a 400 error if the request body does not contain the emails', async ()=> {
    const mockReq = {
      body: {
          name: "test"
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test('Returns a 400 error if the request body does contain empty string instad of the name ', async ()=> {
    const mockReq = {
      body: {
          name: "",
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test('Returns a 400 error if the User who calls the API is already in a group ', async ()=> {
    const mockReq = {
      body: {
          name: "test",
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser = {
      name: "test",
      role: "Admin"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })
    User.findOne.mockImplementationOnce(() => {
      return "some"
    })

    Group.findOne.mockImplementationOnce(() => {
      return true
    })
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
  })
  
   //TEST NON FUNZIONANTE    
  /*test('Returns a 400 if there is already an existing group with the same name', async () => {
    // Mock necessary functions and models

    const mockReq = {
      body: {
          name: "test",
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }
    
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "authorized" }
    })

    User.findOne.mockImplementationOnce(() => {
      return mockUser3
    })
    

    emailFromToken.mockImplementationOnce(() => {
      return "test1@example.com"
    })

    
    
    await jest.spyOn(myUsers, "isInGroup").mockResolvedValue(false);
    Group.findOne.mockResolvedValueOnce(mockGroup)
    
    await myUsers.createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "There is already an existing group with the same name"
    }))
    
  });*/

  test('Returns 500, throw an error', async () => {
    const mockReq = {
      body: {
          name: "test",
          memberEmails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/api/groups"
    }
    const mockUser = {username: "user1", email: "user1@email", password: "securePass", role: "Regular"};
    
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "authorized" }
    })
    
    User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.createGroup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
  
 })


describe("getGroups", () => {
  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)',async () => {
    const mockReq = {
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })

    await myUsers.getGroups(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)
  });

  test('Returns 500, throw an error', async () => {
    const mockReq = {
    }    
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "authorized" }
    })
    
    Group.find.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.getGroups(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
})

describe("getGroup", () => {

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database ', async ()=> {
    const mockReq = {
      params: {
          name: "test",
          
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "api/groups/:name"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })
    Group.findOne.mockImplementation(() => {
      return null
    })
    await myUsers.getGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test('Returns a 401 error if called by an authenticated user who is neither part of the group (authType = Group) nor an admin (authType = Admin)',async () => {
    const mockReq = {
      params: {
          name: "test",
          
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "api/groups/:name"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }

    Group.findOne.mockImplementation(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })

    await myUsers.getGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)

  })

  test('Returns 500, throw an error', async () => {
    const mockReq = {
      params: {
          name: "test",
          
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "api/groups/:name"
    }
    const mockUser = {username: "user1", email: "user1@email", password: "securePass", role: "Regular"};
    
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "authorized" }
    })
    
    Group.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.getGroup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
})

describe("addToGroup", () => {
  test('Returns a 400 error if the request body does not contain the emails of the group', async ()=> {
    const mockReq = {
      params:{
        name: "test"
      },
      body: {
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/add"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.addToGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the request body does not contain the name of the group', async ()=> {
    const mockReq = {
      params: {

      },
      body: {
          emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/add"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.addToGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/add"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    Group.findOne.mockImplementation(() => {
      return null
    })

    await myUsers.addToGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "The group does not exist"
    }))

  })

  //TEST NON FUNZIONANTE: la isInGroup fa ritornare a caso la funzione su expect
  /*test('Returns a 400 error if at least one of the member emails is not in a valid email format', async ()=> {
    const mockReq = {
      params: {
        name: "italia",
      },
      body: {
        emails: ['test4@example.com', 'test5example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/add"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }

    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }

    Group.findOne.mockImplementationOnce(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })
    
    User.findOne.mockImplementationOnce(() => {
      return mockUser3
    })
    
    await jest.spyOn(myUsers, "isInGroup").mockResolvedValue(true);
    
    await myUsers.addToGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "At least one of the member emails is not in a valid email format"
    }))

  })*/

  test('Returns 500, throw an error', async () => {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
          
          emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/add"
    }   
    verifyAuth.mockImplementationOnce(() => {
      return { authorized: true, cause: "authorized" }
    })
    
    Group.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.addToGroup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  
 })

describe("removeFromGroup", () => { 
  test('Returns a 400 error if the request body does not contain the emails of the group', async ()=> {
    const mockReq = {
      params:{
        name: "test"
      },
      body: {
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the request body does not contain the name of the group', async ()=> {
    const mockReq = {
      params: {

      },
      body: {
          emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    Group.findOne.mockImplementation(() => {
      return null
    })

    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "The group does not exist"
    }))

  })

  test('Returns a 400 error if the group contains only one member before deleting any user', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

   /* const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
*/
    const mockGroup = {
      name: "test",
      members: [mockUser1]
    }

    Group.findOne.mockImplementation(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })

    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "The group contains only one member"
    }))

  })

  test('Returns a 400 error if at least one of the emails is not in a valid email format', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }

    Group.findOne.mockImplementationOnce(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })

    User.findOne.mockImplementationOnce(() => {
      return mockUser3
    })

    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "At least one of the member emails is not in a valid email format"
    }))

  })

  test('Returns a 400 error if at least one of the emails is an empty string', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }

    Group.findOne.mockImplementationOnce(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })

    User.findOne.mockImplementationOnce(() => {
      return mockUser3
    })

    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "At least one of the member emails is not in a valid email format"
    }))

  })

  /*
  test('Returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database', async ()=> {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }

    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }

    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }

    Group.findOne.mockImplementationOnce(() => {
      return mockGroup
    })

    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "authorized" }
    })

    User.findOne.mockImplementationOnce((query) => {
      
    })
    User.findOne.mockImplementationOnce(() => {
      return mockUser2
    }) 

    jest.spyOn(User, 'findOne').mockImplementation((query) => {
      if (JSON.stringify(query) === JSON.stringify({ email: 'test1@example.com' })) {
        return mockUser3
      } else if (JSON.stringify(query) === JSON.stringify({ email: 'test2@example.com' })) {
        return mockUser2
      }
    });

    
    await myUsers.removeFromGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalled();

  })*/

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`', async ()=> {

  const mockReq = {
    params: {
      name: "test",
    },
    body: {
      emails: ['test1@example.com', 'test2@example.com']
    },
    cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
    url: "/groups/:name/remove"
  }

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
        refreshedTokenMessage: ""
    }
  }

  const mockUser1 = {
    name: "test1",
    email: "test1@user.it"
  }

  const mockUser2 = { 
    name: "test2",
    email: "test2@usert.it"
  }

  const mockUser3 = { 
    name: "test3",
    email: "test3@usert.it"
  }
  const mockGroup = {
    name: "test",
    members: [mockUser1, mockUser2]
  }

  Group.findOne.mockImplementationOnce(() => {
    return mockGroup
  })

  verifyAuth.mockImplementation(() => {
    return { authorized: false, cause: "Unauthorized" }
  })

  User.findOne.mockImplementationOnce(() => {
    return mockUser3
  })

  await myUsers.removeFromGroup(mockReq, mockRes)

  expect(mockRes.status).toHaveBeenCalledWith(401)
  

  })

  test('Returns 500, throw an error', async () => {
    const mockReq = {
      params: {
        name: "test",
      },
      body: {
        emails: ['test1@example.com', 'test2@example.com']
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/:name/remove"
    }  
    
    
    Group.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.removeFromGroup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

})

describe("deleteUser", () => {
  test("Returns a 400 error if the request body does not contain all the necessary attributes", async () => {
    const mockReq = {
      body: {},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "email is missing from the parameters"
    }));
  });

  test("Returns a 400 error if the email passed in the request body is an empty string", async () => {
    const mockReq = {
      body: {email: "     "},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "email is an empty string"
    }));
  });

  test("Returns a 400 error if the email passed in the request body is not in correct email format", async () => {
    const mockReq = {
      body: {email: "user1.com"},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Invalid email format"
    }));
  });

  test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
    const mockReq = {
      body: {email: "user1@email.com"},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Unauthorized"
    }));
  });

  test("Returns a 400 error if the email passed in the request body does not represent a user in the database", async () => {
    const mockReq = {
      body: {email: "user1@email.com"},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    User.findOne.mockResolvedValueOnce(null);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "User not found"
    }));
  });

  test("Returns a 400 error if the email passed in the request body represents an admin", async () => {
    const mockReq = {
      body: {email: "admin1@email.com"},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockAdmin = {username: "admin1", email: "admin1@email.com", password: "securePass", refreshToken: "refreshToken", role: "Admin"};
    User.findOne.mockResolvedValueOnce(mockAdmin);
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Email passed in the request body represents an admin"
    }));
  });

  // test("Returns 200, user not in a group", async () => {
  //   const mockReq = {
  //     body: {email: "user1@email.com"},
  //     cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
  //     url: "/api/users"
  //   }
  //   verifyAuth.mockImplementation(() => {
  //     return { authorized: true, cause: "Authorized" }
  //   })
  //   const mockUser = {username: "user1", email: "user1@email.com", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
  //   User.findOne.mockResolvedValueOnce(mockUser);
  //   // getGroupByUserEmail.mockImplementation(() => {
  //   //   return null;
  //   // })
  //   // getGroupByUserEmail.mockResolvedValueOnce(null);
  //   User.deleteOne.mockResolvedValueOnce({deletedCount: 1});
  //   transactions.deleteMany.mockResolvedValueOnce(5);
  //   const mockRes = {
  //     status: jest.fn().mockReturnThis(),
  //     json: jest.fn(),
  //     locals: {
  //       refreshedTokenMessage: "message"
  //     }
  //   }

  //   await deleteUser(mockReq, mockRes);

  //   expect(mockRes.status).toHaveBeenCalledWith(200);
  //   expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
  //     data: expect.objectContaining({
  //       deletedTransactions: 1,
  //       transactionsNumber: 5
  //     }),
  //     refreshedTokenMessage: "message"
  //   }));
  // });

  test("Returns 500, throw an error", async () => {
    const mockReq = {
      body: {email: "admin1@email.com"},
      cookies: {refreshToken: "refreshToken", accessToken: "accessToken"},
      url: "/api/users"
    }
    verifyAuth.mockImplementation(() => {
      return { authorized: true, cause: "Authorized" }
    })
    const mockAdmin = {username: "admin1", email: "admin1@email.com", password: "securePass", refreshToken: "refreshToken", role: "Admin"};
    User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await deleteUser(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
})

describe("deleteGroup", () => { 

  test('Returns a 400 error if the request body does not contain the name of the group', async ()=> {
    const mockReq = {
      params: {

      },
      body: {
          
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.deleteGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the name passed in the request body is an empty string', async ()=> {
    const mockReq = {
      params: {

      },
      body: {
          name: ""
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
        
    await myUsers.deleteGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: "Request body does not contain all the necessary attributes"
    }))
  })

  test('Returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async ()=> {
    const mockReq = {
      params: {
        
      },
      body: {
        name: 'test'
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups"
    }

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }

    Group.findOne.mockImplementation(() => {
      return null
    })

    await myUsers.deleteGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    

  })

  test('Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`', async ()=> {

    const mockReq = {
      params: {
        
      },
      body: {
        name: "test"
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups"
    }
  
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
          refreshedTokenMessage: ""
      }
    }
  
    const mockUser1 = {
      name: "test1",
      email: "test1@user.it"
    }
  
    const mockUser2 = { 
      name: "test2",
      email: "test2@usert.it"
    }
  
    const mockUser3 = { 
      name: "test3",
      email: "test3@usert.it"
    }
    const mockGroup = {
      name: "test",
      members: [mockUser1, mockUser2]
    }
  
    Group.findOne.mockImplementationOnce(() => {
      return mockGroup
    })
  
    verifyAuth.mockImplementation(() => {
      return { authorized: false, cause: "Unauthorized" }
    })
  
    await myUsers.deleteGroup(mockReq, mockRes)
  
    expect(mockRes.status).toHaveBeenCalledWith(401)
    
  
  })

  test('Returns 500, throw an error', async () => {
    const mockReq = {
      params: {
        
      },
      body: {
        name: "test"
      },
      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
      url: "/groups"
    }
    
    
    Group.findOne.mockRejectedValueOnce(new Error("An error occurred"));
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }

    await myUsers.deleteGroup(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    
  });
})
import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken'; //const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

jest.mock("bcryptjs")
jest.mock('../models/User.js');

import { register, registerAdmin, login, logout } from '../controllers/auth.js';
import { verifyAuth } from '../controllers/utils.js';

//Ensures that each test can define its specific mock functions without worrying about what was done by the tests before
beforeEach(() => {
    User.findOne.mockClear();
    User.prototype.save.mockClear();
    jest.clearAllMocks();
})

//Necessary step to ensure that the functions in utils.js can be mocked correctly
jest.mock('../controllers/utils.js', () => ({
    verifyAuth: jest.fn(),
}))

// const User = require('../models/User.js');
// jest.mock('../models/user');
// const saveMock = jest.fn().mockResolvedValue(true);
// User.mockImplementation(() => {
//     return {
//         save: saveMock,
//     };
// });

describe('register', () => { 
    test('Returns a 400 error if the request body does not contain username', async () => {
        const mockReq = {
            body: {email: "user1@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the request body does not contain email', async () => {
        const mockReq = {
            body: {username: "user1", password: "securePass"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the request body does not contain password', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1@email.com"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the username is an empty string', async () => {
        const mockReq = {
            body: {username: "    ", email: "user1@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the email is an empty string', async () => {
        const mockReq = {
            body: {username: "user", email: "   ", password: "securePass"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the password is an empty string', async () => {
        const mockReq = {
            body: {username: "", email: "user1@email.com", password: "  "},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the email in the request body is not in a valid email format', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1@email", password: "securePass"},
            url: "/api/register"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Invalid email format"
        }))
    });

    test('Returns a 400 error if the email in the request body identifies an already existing user', async () => {
        const mockReq = {
            body: {username: "user2", email: "user1@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockUser = {username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
        User.findOne.mockResolvedValueOnce(mockUser);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "this email is already been used"
        }))
    });

    test('Returns a 400 error if the username in the request body identifies an already existing user', async () => {
        const mockReq = {
            body: {username: "user1", email: "user2@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockUser = {username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
        User.findOne.mockResolvedValueOnce();
        User.findOne.mockResolvedValueOnce(mockUser);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "this username is already been used"
        }))
    });

    test('Returns 200 successful insertion', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockHashedPassword = "ad4fhg8jfd9htdhc";
        User.findOne.mockResolvedValueOnce();
        User.findOne.mockResolvedValueOnce();
        bcrypt.hash.mockResolvedValueOnce(mockHashedPassword);
        User.create.mockResolvedValueOnce()
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                message: "User added successfully"
            })
        }))
    });

    test('Returns 500 throw an error', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1@email.com", password: "securePass"},
            url: "/api/register"
        }
        const mockHashedPassword = "ad4fhg8jfd9htdhc";
        User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await register(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
    });
});

describe("registerAdmin", () => { 
    test('Returns a 400 error if the request body does not contain username', async () => {
        const mockReq = {
            body: {email: "admin1@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the request body does not contain email', async () => {
        const mockReq = {
            body: {username: "admin1", password: "securePass"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the request body does not contain password', async () => {
        const mockReq = {
            body: {username: "admin1", email: "admin1@email.com"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the username is an empty string', async () => {
        const mockReq = {
            body: {username: "  ", email: "admin1@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the email is an empty string', async () => {
        const mockReq = {
            body: {username: "admin1", email: "   ", password: "securePass"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the password is an empty string', async () => {
        const mockReq = {
            body: {username: "", email: "admin1@email.com", password: "   "},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the email in the request body is not in a valid email format', async () => {
        const mockReq = {
            body: {username: "admin1", email: "admin1email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Invalid email format"
        }))
    });

    test('Returns a 400 error if the email in the request body identifies an already existing user', async () => {
        const mockReq = {
            body: {username: "admin2", email: "admin1@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockUser = {username: "admin1", email: "admin1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
        User.findOne.mockResolvedValueOnce(mockUser);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "this email is already been used for an Admin"
        }))
    });

    test('Returns a 400 error if the username in the request body identifies an already existing admin', async () => {
        const mockReq = {
            body: {username: "admin1", email: "admin2@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockUser = {username: "admin1", email: "admin1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
        User.findOne.mockResolvedValueOnce();
        User.findOne.mockResolvedValueOnce(mockUser);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "this username is already been used for an Admin"
        }))
    });

    test('Returns 200 successful insertion', async () => {
        const mockReq = {
            body: {username: "admin1", email: "admin1@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockHashedPassword = "ad4fhg8jfd9htdhc";
        User.findOne.mockResolvedValueOnce();
        User.findOne.mockResolvedValueOnce();
        bcrypt.hash.mockResolvedValueOnce(mockHashedPassword);
        User.create.mockResolvedValueOnce()
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                message: "Admin added successfully"
            })
        }))
    });

    test('Returns 500, throw an error', async () => {
        const mockReq = {
            body: {username: "admin1", email: "admin1@email.com", password: "securePass"},
            url: "/api/admin"
        }
        const mockHashedPassword = "ad4fhg8jfd9htdhc";
        User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await registerAdmin(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
    });
})

describe('login', () => { 
    test('Returns a 400 error if the request body does not contain email', async () => {
        const mockReq = {
            body: {password: "securePass"},
            url: "/api/login"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the request body does not contain password', async () => {
        const mockReq = {
            body: {email: "user1@email.com"},
            url: "/api/login"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Missing params"
        }))
    });

    test('Returns a 400 error if the email is an empty string', async () => {
        const mockReq = {
            body: {email: "  ", password: "securePass"},
            url: "/api/login"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the password is an empty string', async () => {
        const mockReq = {
            body: {email: "user1@email.com", password: "  "},
            url: "/api/login"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Empty String Insercted"
        }))
    });

    test('Returns a 400 error if the email in the request body is not in a valid email format', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1email.com", password: "securePass"},
            url: "/api/login"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Invalid email format"
        }))
    });

    test('Returns a 400 error if the email in the request body does not identify a user in the database', async () => {
        const mockReq = {
            body: {username: "user1", email: "user1@email.com", password: "securePass"},
            url: "/api/login"
        }
        User.findOne.mockResolvedValueOnce();
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "please you need to register"
        }))
    });

    test('Returns a 400 error if the supplied password does not match with the one in the database', async () => {
        const mockReq = {
            body: {email: "user1@email.com", password: "securePass"},
            url: "/api/login"
        }
        const mockUser = {username: "user1", email: "user1@email", password: "securePass", role: "Regular"};
        User.findOne.mockResolvedValueOnce(mockUser);
        bcrypt.compare.mockResolvedValueOnce(false);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "wrong credentials"
        }))
    });

    // test('Returns 200 successful login', async () => {
    //     const mockReq = {
    //         body: {email: "user1@email.com", password: "securePass"},
    //         url: "/api/login"
    //     }
    //     const mockUser = {id:"1234", username: "user1", email: "user1@email", password: "securePass", role: "Regular"};
    //     User.findOne.mockResolvedValueOnce(mockUser);
    //     bcrypt.compare.mockResolvedValueOnce(true);
    //     jwt.sign.mockResolvedValueOnce("accessToken");
    //     jwt.sign.mockResolvedValueOnce("refreshToken");
    //     // mockUser.save.mockResolvedValueOnce();
    //     // jest.spyOn(User.prototype, "save").mockImplementation(() => Promise.resolve(true));
    //     // jest.replaceProperty(existingUser, 'save', true);
        
    //     const mockRes = {
    //         status: jest.fn().mockReturnThis(),
    //         json: jest.fn(),
    //         cookie: jest.fn()
    //     }

    //     await login(mockReq, mockRes);

    //     expect(mockRes.status).toHaveBeenCalledWith(200);
    //     expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
    //         data: expect.objectContaining({
    //             accessToken: expect.any(String),
    //             refreshToken: expect.any(String)
    //         })
    //     }))
    // });

    test('Returns 500, throw an error', async () => {
        const mockReq = {
            body: {email: "user1@email.com", password: "securePass"},
            url: "/api/login"
        }
        const mockUser = {username: "user1", email: "user1@email", password: "securePass", role: "Regular"};
        User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await login(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
    });
});

describe('logout', () => { 
    test('Returns a 400 error if the request does not have a refresh token in the cookies', async () => {
        const mockReq = {
            cookies: {},
            url: "/api/logout"
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await logout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "Refresh Token not found in cookies"
        }))
    });

    test(`Returns a 400 error if the refresh token in the request's cookies does not represent a user in the database`, async () => {
        const mockReq = {
            cookies: {refreshToken: "refreshToken"},
            url: "/api/logout"
        }
        User.findOne.mockResolvedValueOnce(null);
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await logout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: "User not found with the provided Refresh Token"
        }))
    });

    test('Returns a 401 error if the user has not simple authorization', async () => {
        const mockReq = {
            cookies: {refreshToken: "refreshToken"},
            url: "/api/logout"
        }
        const mockUser = {username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
        User.findOne.mockResolvedValueOnce(mockUser);
        verifyAuth.mockImplementation(() => {
            return { authorized: false, cause: "Unauthorized" }
        })
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await logout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    // test('Returns 200 logout successfully', async () => {
    //     const mockReq = {
    //         cookies: {refreshToken: "refreshToken"},
    //         url: "/api/logout"
    //     }
    //     const mockUser = {username: "user1", email: "user1@email", password: "securePass", refreshToken: "refreshToken", role: "Regular"};
    //     User.findOne.mockResolvedValueOnce(mockUser);
    //     verifyAuth.mockImplementation(() => {
    //         return { authorized: true, cause: "Authorized" }
    //     })
    //     User.prototype.save.mockResolvedValueOnce();
    //     const mockRes = {
    //         status: jest.fn().mockReturnThis(),
    //         json: jest.fn(),
    //         cookie: jest.fn()
    //     }

    //     await logout(mockReq, mockRes);

    //     expect(mockRes.status).toHaveBeenCalledWith(200);
    //     expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
    //         data: expect.objectContaining({
    //             message: "User logged out"
    //         })
    //     }));
    // });

    test(`Returns 500, throw an error`, async () => {
        const mockReq = {
            cookies: {refreshToken: "refreshToken"},
            url: "/api/logout"
        }
        User.findOne.mockRejectedValueOnce(new Error("An error occurred"));
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        }

        await logout(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
    });
});

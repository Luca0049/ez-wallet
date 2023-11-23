import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from '../controllers/utils';
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");

jest.mock("bcryptjs")
jest.mock("jsonwebtoken")
jest.mock("../models/User.js")
jest.mock("../models/model.js")

beforeEach(() => {
    jest.clearAllMocks()
})

describe("handleDateFilterParams", () => { 
  test(`Returns the value of date that depends on the query parameters of dates`, () => {
    const req = { query: { date: "2023-04-21" } }
    const res = handleDateFilterParams(req)
    const parsedData = new Date(req.query.date)
    parsedData.setHours(0,0,0,0)
    res.date.$gte.setHours(0,0,0,0)
    res.date.$lte.setHours(0,0,0,0)
    
    expect(res).toHaveProperty("date")
    expect(res.date).toHaveProperty("$gte")
    expect(res.date).toHaveProperty("$lte")
    
  })
  test(`Throws an error if an invalid format is given in the query`, () => {
    const req1 = { query: { date: "21-2023-10" } }
    expect(() => handleDateFilterParams(req1)).toThrow()
  })
  test(`Returns the correct value of date  that depends on the query parameters `, () => {
    const req = { query: { from: "2023-04-21" } }
    const res = handleDateFilterParams(req)
    
    const parsedData = new Date(req.query.from)
    parsedData.setHours(0,0,0,0)
    res.date.$gte.setHours(0,0,0,0)
    
    expect(res).toHaveProperty("date")
    expect(res.date).toHaveProperty("$gte")
    expect(res.date.$gte.getTime()).toEqual(parsedData.getTime())
  })
  test(`Throws an error if an incorrect date format is detected`, () => {
    const req1 = { query: { from: "21-2023-10" } }
    expect(() => handleDateFilterParams(req1)).toThrow()
  })
  test(`Throws an error if date and from are present in the query (invalid combination)`, () => {
    const req = { query: { from: "2023-04-21", date: "2023-04-21"} }
    expect(() => handleDateFilterParams(req)).toThrow()
  })
  test(`Throws an error if date and upTo are present in the query (invalid combination)`, () => {
    const req = { query: { upTo: "2023-04-21", date: "2023-04-21"} }
    expect(() => handleDateFilterParams(req)).toThrow()
})
})

describe("verifyAuth", () => { 
 
    test('Returns a 400 error if the cookies doesnt have the access token', async ()=> {
        const mockReq = {
          params: {
    
          },
          body: {
              
          },
          cookies: {refreshToken: "adminRefreshTokenValid" }, 
          url: "/groups/groups"
        }
    
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          locals: {
              refreshedTokenMessage: ""
          }
        }
            
      const info = {};

      const result = await verifyAuth(mockReq, mockRes, info);

      expect(result).toEqual({ authorized: false, cause: "Unauthorized" });
    })
    
    test('Returns a 400 error if the cookies doesnt have the refresh token', async ()=> {
        const mockReq = {
          params: {
    
          },
          body: {
              
          },
          cookies: { accessToken: "adminAccessTokenValid" }, 
          url: "/groups/groups"
        }
    
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          locals: {
              refreshedTokenMessage: ""
          }
        }
            
        await verifyAuth(mockReq, mockRes)
    
        const info = {};

        const result = await verifyAuth(mockReq, mockRes, info);

        expect(result).toEqual({ authorized: false, cause: "Unauthorized" });
    })

    test('Returns authorized false if access token is missing information', async ()=> {
      
      
      const mockReq = {
        params: {},
        body: {},
        cookies:  {
          accessToken: "testAccessToken",
          refreshToken: "testRefreshToken"
        }, 
        url: "/groups/groups"
      }
  
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            refreshedTokenMessage: ""
        }
      }
      jwt.verify.mockImplementation(() => {
        return { email: "testEmail@example.it", role: "testRole" }
      })
          
  
      const info = {};

      const result = verifyAuth(mockReq, mockRes, info);

      expect(result).toEqual({ authorized: false, cause: "Token is missing information" });
    })

    test('Returns authorized false if Mismatched users', async ()=> {
      
      
      const mockReq = {
        params: {},
        body: {},
        cookies:  {
          accessToken: "testAccessToken",
          refreshToken: "testRefreshToken"
        }, 
        url: "/groups/groups"
      }
  
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            refreshedTokenMessage: ""
        }
      }
      jwt.verify.mockImplementationOnce(() => {
        return {username: "test1", email: "testEmail@example.it", role: "testRole" }
      })
      jwt.verify.mockImplementationOnce(() => {
        return {username: "test2", email: "testEmail@example.it", role: "testRole" }
      })
          
  
      const info = {};

      const result = verifyAuth(mockReq, mockRes, info);

      expect(result).toEqual({ authorized: false, cause: "Mismatched users" });
    })

    test("correct response, case User", () => {
        
      const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
      const res = {
        locals: {
          refreshedTokenMessage: ""
        }
      }

      const decodedAccessToken = {
          email: "tester@test.com",
          username: "tester",
          role: "Regular"
      }
      
      jwt.verify.mockReturnValue(decodedAccessToken)
      const response = verifyAuth(req, res, { authType: "User", username: "tester" })
      
      expect(Object.values(response).includes(true)).toBe(true)
    })

    test("correct response, case Admin", () => {
        
      const req = { cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminAccessTokenValid" } }
      const res = {
        locals: {
          refreshedTokenMessage: ""
        }
      }

      const decodedAccessToken = {
          email: "admin@test.com",
          username: "admin",
          role: "Admin"
      }
      
      jwt.verify.mockReturnValue(decodedAccessToken)
      const response = verifyAuth(req, res, { authType: "Admin"})
      
      expect(Object.values(response).includes(true)).toBe(true)
    })

    test("correct response, case Admin", () => {
        
      const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
      const res = {
        locals: {
          refreshedTokenMessage: ""
        }
      }

      const decodedAccessToken = {
          email: "tester@test.com",
          username: "tester",
          role: "Regular"
      }
      
      jwt.verify.mockReturnValue(decodedAccessToken)
      const response = verifyAuth(req, res, { authType: "Group", emails: ["tester@test.com"]})
      
      expect(Object.values(response).includes(true)).toBe(true)
    })

    test("AccessToken expired and correct refresh token", () => {
        
      const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
      

      const cookieMock = (name, value, options) => {
          res.cookieArgs = { name, value, options };
      }
      const res = {
          cookie: cookieMock,
          locals: {
              refreshedTokenMessage: ""
          },
      }
      jwt.verify.mockImplementationOnce((token, secret) => {
          const error = new Error('TokenExpiredError')
          error.name = 'TokenExpiredError'
          throw error
      })
      
      const decodedRefreshToken = {
          username:"tester",
          email: "tester@test.com",
          role: "Regular"
      }
      jwt.verify.mockReturnValueOnce(decodedRefreshToken)
      jwt.sign.mockReturnValue("refreshedAccessToken")
      const response = verifyAuth(req, res, { authType: "Simple"})
  
      expect(Object.values(response).includes(true)).toBe(true)
      expect(res.cookieArgs).toEqual({
          name: 'accessToken', //The cookie arguments must have the name set to "accessToken" (value updated)
          value: expect.any(String), //The actual value is unpredictable (jwt string), so it must exist
          options: { //The same options as during creation
              httpOnly: true,
              path: '/api',
              maxAge: 60 * 60 * 1000,
              sameSite: 'none',
              secure: true,
          },
      })
      //The response object must have a field that contains the message, with the name being either "message" or "refreshedTokenMessage"
      const message = res.locals.refreshedTokenMessage ? true : res.locals.message ? true : false
      expect(message).toBe(true)
  })

})

describe("handleAmountFilterParams", () => { 
  test(`The value of amount depends on the query parameters both Max and Min`, () => {
    const req = { query: { max: "200", min: "20" } }
    const res = handleAmountFilterParams(req)
    
    expect(res).toHaveProperty("amount")
    expect(res.amount).toHaveProperty("$gte")
    expect(res.amount).toHaveProperty("$lte")
    
  })
  test(`Throws an error if the value of any of the two query parameters is not a numerical value. Max && Min`, () => {
    const req1 = { query: { max: "2000", min: "ciao" } }
    expect(() => handleAmountFilterParams(req1)).toThrow()
  })
  test(`The value of amount depends on the query parameters of max`, () => {
    const req = { query: { max: "2000" } }
    const res = handleAmountFilterParams(req)
    
    expect(res).toHaveProperty("amount")
    expect(res.amount).toHaveProperty("$lte")
    
  })
  test(`The value of amount depends on the query parameters of min`, () => {
    const req = { query: { min: "20" } }
    const res = handleAmountFilterParams(req)
    
    expect(res).toHaveProperty("amount")
    expect(res.amount).toHaveProperty("$gte")
   
  })
})

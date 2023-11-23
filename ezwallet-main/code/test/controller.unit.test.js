import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { verifyAuth } from '../controllers/utils';
import { User } from '../models/User'
import { createTransaction, createCategory, updateCategory, deleteCategory, getCategories, deleteTransaction, deleteTransactions } from '../controllers/controller';
import { getAllTransactions } from '../controllers/controller';

const bcrypt = require("bcryptjs")

jest.mock("bcryptjs")
jest.mock("jsonwebtoken")
jest.mock("../models/User.js")
jest.mock("../models/model.js");



beforeEach(() => {
  categories.find.mockClear();
  categories.prototype.save.mockClear();
  transactions.find.mockClear();
  transactions.deleteOne.mockClear();
  transactions.aggregate.mockClear();
  transactions.prototype.save.mockClear();
  jest.clearAllMocks();
});


jest.mock('../controllers/utils.js', () => ({
    verifyAuth: jest.fn(),
}))


describe("createCategory", () => { 
    
    test('Should create a new category and return the saved data', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { type: 'investment', color: 'green' };
        categories.prototype.save.mockResolvedValue(mockCategory);

        const mockReq = {
            body: {
                type: "investment",
                color: "green"
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }
        
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await createCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockCategory,
                refreshedTokenMessage: expect.any(String)
        }))
    });

    test("Should return a 401 error if called by a user who is not an Admin", async () => {
      
        verifyAuth.mockImplementation(() => {return {authorized: false, cause: "Unauthorized"}});        
        const response = await request(app)
          .post("/api/categories")
        
        expect(response.status).toBe(401)
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });

    test('Should return a 400 error if the request body does not contain the color attribute', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { type: 'investment'};
        
        const response = await request(app)
        .post('/api/categories')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockCategory);


        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });

    test('Should return a 400 error if the request body does not contain the type attribute', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { color: '#fcbe44'};
        
        const response = await request(app)
        .post('/api/categories')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockCategory);


        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });

    test('Should return a 400 error if the color attribute is an empty string', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { type: 'investment', color: '' };
        
        const response = await request(app)
        .post('/api/categories')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockCategory);


        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });

    test('Should return a 400 error if the type attribute is an empty string', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { type: '', color: '#fcbe44' };
        
        const response = await request(app)
        .post('/api/categories')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockCategory);


        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });

    test('Should return a 400 error if the type of category passed in the request body represents an already existing category in the database', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockCategory = { type: 'investment', color: 'green' };

        categories.findOne.mockResolvedValue({ type: 'investment', color: 'green' });
      
        const response = await request(app)
        .post('/api/categories')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockCategory);

        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});

    });
})

describe("updateCategory", () => { 

    test("Should update an existing category", async () => {
        const mockCategory = { type: "food", color: "red"}
        //the category we want to modify is actually present in the database
        categories.count.mockResolvedValueOnce(1)
        //the new type specified for the category to update is not already present in the database
        categories.count.mockResolvedValueOnce(0)
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        //simulation of a scenario with 3 updated transactions
        const updatedMockTransaction = {modifiedCount: 3}
        const updatedMockCategory = {modifiedCount: 1}
        
        transactions.updateMany.mockResolvedValue(updatedMockTransaction);
        categories.findOneAndUpdate.mockResolvedValue(updatedMockCategory);
        
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "food",
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
            url: "/api/categories/food" 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                message: expect.any(String),
                count: 3
            })
        }))
    })

    test("Should return a 401 error if called by a user who is not an Admin", async () => {
        const mockCategory = { type: "food", color: "red" }
        verifyAuth.mockImplementation(() => { return { authorized: false, cause: "Unauthorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "food",
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokenInvalid", refreshToken: "adminRefreshTokenInvalid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the request body does not contain the type attribute", async () => {
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "food",
            },
            cookies: { accessToken: "adminAccessTokenInvalid", refreshToken: "adminRefreshTokenInvalid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the request body does not contain the color attribute", async () => {
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokeValid", refreshToken: "adminRefreshTokenValid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the type attribute is an empty string", async () => {
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "",
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the color attribute is an empty string", async () => {
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "food",
                color: ""
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the type of category passed as a route parameter does not represent a category in the database", async () => {
        categories.count.mockResolvedValue(0);
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "unkwown" },
            body: {
                type: "food",
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    test("Should return a 400 error if the type of category passed in the request body as the new type represents an already existing category in the database", async () => {
        categories.count.mockResolvedValueOnce(0);
        categories.count.mockResolvedValueOnce(1);
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            params: { type: "food" },
            body: {
                type: "income",
                color: "red"
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })

    
})

describe("deleteCategory", () => { 
    
    test('Should delete an existing category (case N > T)', async() => {
        const mockCategoriesNotDelete = [{type: 'food', color: 'red', createdAt: new Date("2021/11/03")}];
        const updatedTransactions = {modifiedCount: 1};
        const updatedMockCategories = [{ type: 'food', color: 'red' }];
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        //scenario in which there are 2 categories in the database
        categories.countDocuments.mockResolvedValueOnce(2);
        //scenario in which there is 1 category to delete
        categories.count.mockResolvedValueOnce(1);
        categories.find.mockResolvedValueOnce(mockCategoriesNotDelete);
        transactions.updateMany.mockResolvedValueOnce(updatedTransactions);
        categories.deleteMany.mockResolvedValueOnce(updatedMockCategories);

        const mockReq = {
            body: {
                types: ["investment"]
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            data: expect.objectContaining({
                message: expect.any(String),
                count: 1
            }), refreshedTokenMessage: expect.any(String)
        }                 
        ))
    });

    test('Should delete an existing category (case N === T, , all transaction type set to the oldest category)', async() => {
        const mockCategoriesNotDelete = [{type: 'food', color: 'red', createdAt: new Date("2021/11/03")}];
        const updatedTransactions = {modifiedCount: 2};
        const updatedMockCategories = [{ type: 'food', color: 'red' }];
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        //scenario in which there are 2 categories in the database
        categories.countDocuments.mockResolvedValueOnce(2);
        //scenario in which there are 2 categories to delete
        categories.count.mockResolvedValueOnce(1);
        categories.find.mockResolvedValueOnce(mockCategoriesNotDelete);
        transactions.updateMany.mockResolvedValueOnce(updatedTransactions);
        categories.deleteMany.mockResolvedValueOnce(updatedMockCategories);

        const mockReq = {
            body: {
                types: ["investment", "food"]
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            data: expect.objectContaining({
                message: expect.any(String),
                count: 2
            }), refreshedTokenMessage: expect.any(String)
        }                 
        ))
    });

    test('Should return a 400 error if the request body does not contain all the necessary attributes', async() => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        const mockReq = {
            body: {
                types: undefined
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            error: expect.any(String)
        }                 
        ))
    });

    test('Should return a 400 error if called when there is only one category in the database', async() => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        categories.countDocuments.mockResolvedValueOnce(1);
        const mockReq = {
            body: {
                types: ["food", "investment"]
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            error: expect.any(String)
        }                 
        ))
    });

    test('Should return a 400 error if at least one of the types in the array is an empty string', async() => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        categories.countDocuments.mockResolvedValueOnce(2);
        const mockReq = {
            body: {
                types: ["food", ""]
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            error: expect.any(String)
        }                 
        ))
    });

    test('Should return a 400 error if at least one of the types in the array does not represent a category in the database', async() => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        categories.countDocuments.mockResolvedValueOnce(2);
        categories.count.mockResolvedValueOnce(0);
        const mockReq = {
            body: {
                types: ["invalid_category", "food"]
            },
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining( {
            error: expect.any(String)
        }                 
        ))
    });

    test("Should return a 401 error if called by a user who is not an Admin", async () => {
        verifyAuth.mockImplementation(() => { return { authorized: false, cause: "Unauthorized" }})
        
        const mockReq = {
            body: {
                types: ["investment"]
            },
            cookies: { accessToken: "adminAccessTokenInvalid", refreshToken: "adminRefreshTokenInvalid" },
        }

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }))
    })
})

describe("getCategories", () => { 

    test('Should return all categories', async () => {
        const mockCategories = [{ type: 'investment', color: '#fcbe44' }, { type: 'expense', color: '#d9534f' },];
        
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});
        jest.spyOn(categories, "find").mockImplementation(() => mockCategories)
 
        const mockReq = {
            cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
        }
        
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: ""
            }
        }

        await getCategories(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: mockCategories,
                refreshedTokenMessage: expect.any(String)
        }))

      });

    test("Should return a 401 error if accessed without authorization", async () => {
        verifyAuth.mockImplementation(() => {return {authorized: false, cause: "Unauthorized"}});
        
        const response = await request(app)
          .get("/api/categories")
    
        expect(response.status).toBe(401)
    })
});



describe("createTransaction", () => { 


    test('Should create a new transaction and return the saved data', async () => {    //done, but rewrite with mockRes/mockReq
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});

        const mockTransaction = { username: 'Mario', amount: 100, type: 'food'/*, date: '2023-05-19T00:00:00'*/ };
        User.count.mockResolvedValueOnce(1);
        User.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(1);
        transactions.prototype.save.mockResolvedValue(mockTransaction);
        
      
        let response = await request(app)
          .post('/api/users/Mario/transactions')
          .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
          .send(mockTransaction)

      expect(response.status).toBe(200);
      expect(response.body).toEqual({data: mockTransaction}) //intesi
    });

    test('Should return a 400 error if the username attribute is an empty string', async () => { //done, but rewrite with mockRes/mockReq
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});

        const mockTransaction = { username: '', amount: 100, type: "food", date: "2023-05-19T00:00:00" }
        User.count.mockResolvedValueOnce(0);
        User.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(1);
        transactions.prototype.save.mockResolvedValue(mockTransaction);

        const response = await request(app)
        .post('/api/users/Mario/transactions') 
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockTransaction);
        console.log(response.status)
        console.log(response.text)

        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});
    });

    test('Should return a 400 error if the type attribute is an empty string', async () => {//done but rewrite with mockRes/mockReq
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});

        const mockTransaction = { username: "Mario", type: "", amount: 100, date: "2023-05-19T00:00:00" }
        User.count.mockResolvedValueOnce(1);
        User.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(0);
        transactions.prototype.save.mockResolvedValue(mockTransaction);

        const response = await request(app)
        .post('/api/users/Mario/transactions')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockTransaction);

        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});
    });

    test('Should return a 400 error if the amount attribute is an empty string', async () => {//done but rewrite with mockRes/mockReq
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});

        const mockTransaction = { username: "Mario",type: "food", amount: "", date: "2023-05-19T00:00:00" }
        User.count.mockResolvedValueOnce(1);
        User.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(1);
        transactions.prototype.save.mockResolvedValue(mockTransaction);

        
        const response = await request(app)
        .post('/api/users/Mario/transactions')
        .set('Cookie', 'accessToken=validAccessToken;refreshToken=validRefreshToken')
        .send(mockTransaction);

        expect(response.status).toBe(400);
        expect(JSON.parse(response.text)).toEqual({error: expect.any(String)});
    });
    
    test('Should return a 400 error if the username in the body is not equal to the one in the route', async () => { //done
      User.count.mockResolvedValueOnce(1);
      User.count.mockResolvedValueOnce(1);
      categories.count.mockResolvedValue(1);  
      
      const mockReq = {
          body:     {   username: "Mario", type: "food", amount: 100},
          params:   {   username: "Not_Mario" },
          cookies:  {   accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        };
    
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          locals: {  refreshedTokenMessage: "" }
        };

        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
    
        await createTransaction(mockReq, mockRes);
    
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({error: expect.any(String) }))
      }); //done
    
    test("Should return a 400 error if the username passed in the request body does not represent a user in the database", async () => {
        User.count.mockResolvedValueOnce(0);
        User.count.mockResolvedValueOnce(1); 
        categories.count.mockResolvedValueOnce(1);
        verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})
        const mockReq = {
            body:    {   username: "Not_existing",  amount: 100,  type: "food"},
            params:  {   username: "NaN" },
            cookies: {   accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: { refreshedTokenMessage: "" }
        }
        await createTransaction(mockReq, mockRes);     

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({error: expect.any(String) }))
    }); //done

    test('Should return a 400 error if the amount passed in the request body cannot be parsed as a floating value', async () => {
        verifyAuth.mockImplementation(() => {return {authorized: true, cause: "Authorized"}});

        const mockReq = {
            body:    {   username: "Mario",  amount: "invalid",  type: "food"},
            params:  {   username: "Mario" },
            cookies: {   accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }, 
        }
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: { refreshedTokenMessage: "" }
        }
        User.count.mockResolvedValueOnce(1);
        User.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(1);


        await createTransaction(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({error: expect.any(String) }))
    }); //done

    
    test("Should return a 401 error if called by a user who is not an Admin", async () => {
        const mockReq = {
              body:    {   username: "Mario",  amount: 100,  type: "food"},
              params:  {   username: "Mario" },
              cookies: {   accessToken: "adminAccessTokenInvalid", refreshToken: "adminRefreshTokenInvalid" }, 
          }
          const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn(),
              locals: { refreshedTokenMessage: "" }
          }
          User.count.mockResolvedValueOnce(0);
          User.count.mockResolvedValueOnce(0);
          categories.count.mockResolvedValue(0);    
          verifyAuth.mockImplementation(() => {return {authorized: false, cause: "Unauthorized"}});    


          await createTransaction(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(401);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String)  }));

    }); //done

})

describe("deleteTransaction", () => { 

  test("should return a 400 error if _id in the request body is undefined", async () => {
    const mockReq = {
      params: {
        username: 'currentUser',
      },
      body: { _id: undefined  },
      url: "/users/currentUser/transactions",

      cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "",
      }
    };

  
      
      User.count.mockResolvedValueOnce(1);
      transactions.findOne.mockResolvedValueOnce(0);
      transactions.deleteOne.mockResolvedValueOnce(0);


      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})  

      await deleteTransaction(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    });

    test("should return a 400 error if _id in the request body is an empty string", async () => {
      const mockReq = {
        params: {
          username: 'currentUser',
        },
        body: { _id: "" },
        url: "/users/currentUser/transactions",

        cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
      };
  
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
          refreshedTokenMessage: "",
        }
      };

      User.count.mockResolvedValueOnce(1);
      transactions.findOne.mockResolvedValueOnce(0);
      transactions.deleteOne.mockResolvedValueOnce(0);


      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})  

      await deleteTransaction(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    }); //done


    test('should return a 400 error if the username in the route parameter does not represent a user in the database', async () => {
      const mockReq = {
        params: {
          username: 'nonexistentUser',
        },
        body: {
          _id: 'transactionId',
        },
        url: "/users/currentUser/transactions",

        cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
          refreshedTokenMessage: "",
        }
      };
      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }}) 

      User.count.mockResolvedValueOnce(0);
      transactions.findOne.mockResolvedValueOnce({ username: 'currentUser' });
      transactions.deleteOne.mockResolvedValueOnce({});


      await deleteTransaction(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    }); //done


    test('should return a 400 error if the _id in the request body does not represent a transaction in the database', async () => {
      const mockReq = {
        params: {
          username: 'currentUser',
        },
        body: {
          _id: 'notExistingTransaction',
        },
        url: "/users/currentUser/transactions",
        cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }
      };

      const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
          locals: {
            refreshedTokenMessage: "",
          }
        };
      
      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})  

      User.count.mockResolvedValueOnce(1);
      transactions.findOne.mockResolvedValueOnce(0);
      transactions.deleteOne.mockResolvedValueOnce(0);

      await deleteTransaction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    });  //rivedere il coice



    test("should return a 400 error if the _id in the request body represents a transaction made by a different user than the one in the route", async () => {
      const mockReq = {
          params: {
            username: 'currentUser',
          },
          url: "/users/currentUser/transactions",

          body: {
            _id: 'transactionId',
          },

          cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
              refreshedTokenMessage: "",
            }
          };
      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }})  
      User.count.mockResolvedValueOnce(1);
      transactions.findOne.mockResolvedValueOnce({ username: 'notTheRightUser' });

      await deleteTransaction(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
    }); //done
  

    test("should find the right transaction and delete it (User)", async () => {
      
      const mockReq = {
        params: {
          username: 'currentUser',
        },
        url: "/users/currentUser/transactions",
        body: {
          _id: 'transactionId',
        },
        cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" }
      };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: '',
      },
    };
    
    const mockTransactionToDelete = {
      _id: 'transactionId',
    };

      

      verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" }}) 
  
      User.count.mockResolvedValueOnce(1);
      transactions.findOne.mockResolvedValueOnce({ username: 'currentUser' });
      transactions.deleteOne.mockResolvedValueOnce({});
    
      await deleteTransaction(mockReq, mockRes);
    
      expect(User.count).toHaveBeenCalledWith({ username: 'currentUser' });
      expect(transactions.findOne).toHaveBeenCalledWith({ _id: 'transactionId' }, { username: 1, _id: 0 });
      expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: 'transactionId' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: { message: 'Transaction deleted' },
        refreshedTokenMessage: '',
      });
    }); //done





}) //done

describe("deleteTransactions", () => {   

test('should find and delete transactions in the database based on _ids', async () => {
  const mockReq = {
    body: { _ids: ['id1', 'id2', 'id3'] },
    cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
      refreshedTokenMessage: "",
    }
  };

  verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" } })

  transactions.count.mockResolvedValueOnce(3);
  transactions.findOne.mockResolvedValueOnce({ _id: 'id1' });
  transactions.deleteOne.mockResolvedValueOnce({ _id: 'id1' });
  transactions.findOne.mockResolvedValueOnce({ _id: 'id2' });
  transactions.deleteOne.mockResolvedValueOnce({ _id: 'id2' });
  transactions.findOne.mockResolvedValueOnce({ _id: 'id3' });
  transactions.deleteOne.mockResolvedValueOnce({ _id: 'id3' });

  await deleteTransactions(mockReq, mockRes);

  expect(transactions.count).toHaveBeenCalledTimes(3);
  expect(transactions.count).toHaveBeenCalledWith({ _id: 'id1' });
  expect(transactions.count).toHaveBeenCalledWith({ _id: 'id2' });
  expect(transactions.count).toHaveBeenCalledWith({ _id: 'id3' });
  expect(transactions.deleteOne).toHaveBeenCalledTimes(3);
  expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: 'id1' });
  expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: 'id2' });
  expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: 'id3' });

  expect(mockRes.status).toHaveBeenCalledWith(200);
  expect(mockRes.json).toHaveBeenCalledWith({
    data: { message: 'Transactions deleted' },
    refreshedTokenMessage: ""   //res.locals.refreshedTokenMessage
  });
});




test("should return a 400 error if an _id in the request body is empty", async () => {
  const mockReq = {
    body: { _ids: ['id1', '', 'id3'] },
    cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
      refreshedTokenMessage: "",
    }
  };
  verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" } })

  transactions.count.mockResolvedValueOnce(2);
  transactions.count.mockResolvedValueOnce(0);

  await deleteTransactions(mockReq, mockRes);
  expect(mockRes.status).toHaveBeenCalledWith(400);
  expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
}); //done


test("should return a 400 error if an _id in the request body does not represent a transaction in the database", async () => {
  const mockReq = {
    body: { _ids: ['id1', 'not_existing', 'id3'] },
    cookies: { accessToken: "adminAccessTokenValid", refreshToken: "adminRefreshTokenValid" },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
      refreshedTokenMessage: "",
    }
  };

  verifyAuth.mockImplementation(() => { return { authorized: true, cause: "Authorized" } })

  transactions.count.mockResolvedValueOnce(2);
  transactions.count.mockResolvedValueOnce(0);

  await deleteTransactions(mockReq, mockRes);
  expect(mockRes.status).toHaveBeenCalledWith(400);
  expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
}); //done


test("Should return a 401 error if called by a user who is not an Admin", async () => {
  verifyAuth.mockImplementation(() => { return { authorized: false, cause: "Unauthorized" } })

  const mockReq = {
    body: { _ids: ['id1', 'id2'] },
    cookies: { accessToken: "adminAccessTokenInvalid", refreshToken: "adminRefreshTokenInvalid" },
  }

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
      refreshedTokenMessage: ""
    }
  }
  await deleteTransactions(mockReq, mockRes)

  expect(mockRes.status).toHaveBeenCalledWith(401)
  expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.any(String)
  }))
})  





}) //done

describe("getAllTransactions", () => {
    test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
        const mockReq = {
          cookies: {refreshToken: "refreshToken"}
        }
        verifyAuth.mockImplementation(() => {
          return { authorized: false, cause: "Unauthorized" }
        })
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }
    
        await getAllTransactions(mockReq, mockRes);
    
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.any(String)
        }));
      })
});
describe("getAllTransactions", () => {
    test("Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
        const mockReq = {
          cookies: {refreshToken: "refreshToken"}
        }
        verifyAuth.mockImplementation(() => {
          return { authorized: false, cause: "Unauthorized" }
        })
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }
    
        await getAllTransactions(mockReq, mockRes);
    
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.any(String)
        }));
      })
});
import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';

dotenv.config();

beforeAll(async () => {
    const dbName = "testingDatabaseController";
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

beforeEach(async () => {
    await categories.deleteMany({})
    await transactions.deleteMany({})
    await User.deleteMany({})
    await Group.deleteMany({})
})

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

const marioAccessTokenValid = jwt.sign({
    email: "mario@test.com",
    username: "mario",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const testerAccessTokenExpired = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })

describe("createCategory", () => { 
    
    test("Should create a new category", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "health", color: "red" })
        
        //console.log(response.body)
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("type", "health")
        expect(response.body.data).toHaveProperty("color", "red")
        //expect(response.body).toHaveProperty("refreshedTokenMessage")
    })

    test("Should return a 400 error if the type of category passed in the request body represents an already existing category in the database", async () => {
        await categories.create({
            type: "investment",
            color: "green"
        })
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "investment", color: "green" })
        
        //console.log(response.body)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the color parameter is an empty string", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "investment", color: "" })
        
        //console.log(response.body)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the type parameter is an empty string", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "", color: "green" })
        
        //console.log(response.body)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the request body does not contain the color attribute", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "investment" })
        
        //console.log(response.body)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the request body does not contain the type attribute", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ color: "green"})
        
        //console.log(response.body)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 401 error if called by an authenticated user who is not an Admin", async () => {
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ type: "investment", color: "green" })
        
        //console.log(response.body)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

})

describe("updateCategory", () => {

    test("Should update an existing category", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "food",
            amount: 100
        }])
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "health", color: "red" })

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count", 2)

    })

    test("Should return a 401 error if called by a user who is not an Admin", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ type: "food", color: "green" })

        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the type of the new category is the same as one that exists already and that category is not the requested one", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "health", color: "green" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the request body does not contain the type attribute", async () => {
        
        await categories.create({
            type: "food",
            color: "red"
        })
        
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ color: "red" })

        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the request body does not contain the color attribute", async () => {
        
        await categories.create({
            type: "food",
            color: "red"
        })
        
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "health" })

        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the type attribute is an empty string", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "", color: "red" })

        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the color attribute is an empty string", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        
        const response = await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "health", color: "" })

        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the type of category passed as a route parameter does not represent a category in the database", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        
        await User.create({
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        })
        
        const response = await request(app)
            .patch("/api/categories/invalid")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "food", color: "red" })

        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })
})

describe("deleteCategory", () => { 
    test("Should delete an existing category (case N > T)", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }, {
            type: "subscription",
            color: "blue"
        }]
        )
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }, {
            username: "tester",
            type: "subscription",
            amount: 10
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["investment"] })

        //console.log(response.body)    
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count", 1)

    })

    test("Should delete an existing category (case N === T, all transactions type set to the oldest category)", async () => {
        
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])

        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["investment", "food"] })

        //console.log(response.body)    
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count", 1)
    
    })

    test("Should return a 400 error if called when there is only one category in the database", async () => {
        await categories.create({
            type: "food",
            color: "red",
        })

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["investment"] })

        //console.log(response.body)    
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if the request body does not contain all the necessary attributes", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: undefined })

        //console.log(response.body)    
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if at least one of the types in the array is an empty string", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])

        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["food", ""] })

        //console.log(response.body)    
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 400 error if at least one of the types in the array does not represent a category in the database", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["food", "invalid category"] })

        //console.log(response.body)    
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Should return a 401 error if called by a user who is not an Admin", async () => {
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "investment",
            amount: 100
        }])
        
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ types: ["food"] })

        //console.log(response.body)    
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

})

describe("getCategories", () => { 
    
    test("Should return all the existing categories", async () => {
        
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

        //console.log(response.body)    
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("data", [{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        //expect(response.body).toHaveProperty("refreshedTokenMessage")
    })

    test("Should return a 401 error if called by a user who is not authenticated", async () => {
        
        await categories.insertMany([{
            type: "food",
            color: "red",
        }, {
            type: "investment",
            color: "green",
        }])
        
        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenExpired}; refreshToken=${testerAccessTokenExpired}`)

        //console.log(response.body)    
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })
})



describe("createTransaction", () => { 


    test("Should create a new transaction(user)", async () => { //done, but I don't feel safe
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "food" });

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("username", "tester")
        expect(response.body.data).toHaveProperty("amount", 100)
        expect(response.body.data).toHaveProperty("type", "food")
        //expect(response.body).toHaveProperty("refreshedTokenMessage")

    })


    test("Should create a new transaction(admin)", async () => { //done 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", amount: 100, type: "food" });

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("username", "admin")
        expect(response.body.data).toHaveProperty("amount", 100)
        expect(response.body.data).toHaveProperty("type", "food")
        //expect(response.body).toHaveProperty("refreshedTokenMessage")

    })

    test("Should return a 400 error if the type attribute is an empty string", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");
    })

    test("Should return a 400 error if the type attribute is an empty string(admin)", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", amount: 100, type: "" });

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");    
    })

    test("Should return a 400 error if the username attribute is an empty string", async () => { //done
        await  categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await  User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "", amount: 100, type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");
        //done();
    })
  
    test("Should return a 400 error if the username attribute is an empty string(admin)", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "", amount: 100, type: "food" });

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");    
    })

    test("Should return a 400 error if the amount attribute is an empty string", async () => {  
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: "", type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");
        //done();
    })

    test("Should return a 400 error if the amount attribute is invalid", async () => {  
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: "notNumber", type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Invalid amount");
        //done();
    })

    test("Should return a 400 error if the amount attribute is an empty string(admin)", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await  User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", amount: "", type: "food" });

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("error", "Body parameters cannot be empty");    
    })

    test("Should return a 400 error if the amount attribute is invalid (admin)", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await  User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", amount: "notNumber", type: "food" });

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("error", "Invalid amount");    
    })
    
    test("Should return a 400 error if the type attribute is undefined", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })

    test("Should return a 400 error if the username attribute is undefined", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ amount: 100, type: "food"});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })


    test("Should return a 400 error if the amount attribute is undefined", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", type: "food"});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })//testToUpload


    test("Should return a 400 error if the type attribute is undefined", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", amount: 100});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })//testToUpload


    test("Should return a 400 error if the username attribute is undefined", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ amount: 100, type: "food"});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })//testToUpload


    test("Should return a 400 error if the amount attribute is undefined(admin)", async () => { //done
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "admin", type: "food"});

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Missing attributes in the body request");
    })//testToUpload


    test("Should return a 400 error if the type of category passed in the request body does not represent a category in the database", async () => { 
        await  categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "notValid" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Category not found");
        //done();
    }) //done


    test("Should return a 400 error if the type of category passed in the request body does not represent a category in the database(admin)", async () => { //done, but I don't feel safe
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
        {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "notValid" });

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty("error", "Category not found");    
    }) 


    test("Should return a 400 error if the username passed in the request body is not equal to the one passed as a route parameter", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, 
        {
            username: "Mario",
            email: "mario@email.com",
            password: "mario",
            refreshToken: testerAccessTokenValid,
        }, 
        {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    
    ])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "Mario", amount: 100, type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "Body username != Route username");
        //done();
    }) //done


    test("Should return a 401 error if the authenticated user is different than the one in the route", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
            {
                username: "tester",
                email: "tester@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }, {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            }    
    ])
        
        const response = await request(app)
            .post("/api/users/mario/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "mario", amount: 100, type: "food" });

        expect(response.status).toBe(401)
        expect(response.body).toHaveProperty("error", expect.any(String));
        //done();
    }) //done:testToUpload



    test("Should return a 400 error if the username passed in the request body does not represent a user in the database", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, 
        {
            username: "Mario",
            email: "mario@email.com",
            password: "mario",
            refreshToken: testerAccessTokenValid,
        }, 
        {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    
    ])
        
        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "Attilio", amount: 100, type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "User (body) not found");
        //done();
    }) //done

    test("Should return a 400 error if the username passed in the request body does not represent a user in the database(admin)", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, 
        {
            username: "Mario",
            email: "mario@email.com",
            password: "mario",
            refreshToken: testerAccessTokenValid,
        }, 
        {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    
    ])
        
        const response = await request(app)
            .post("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ username: "Attilio", amount: 100, type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "User (body) not found");
        //done();
    }) //done

    test("Should return a 400 error if the username passed passed as a route parameter does not represent a user in the database", async () => { 
        await categories.insertMany([{
            type: "food",
            color: "red"
        }, {
            type: "health",
            color: "blue"
        }])

        await User.insertMany([
            {
                username: "tester",
                email: "tester@test.com",
                password: "tester",
                refreshToken: testerAccessTokenValid
            }, {
                username: "admin",
                email: "admin@email.com",
                password: "admin",
                refreshToken: adminAccessTokenValid,
                role: "Admin"
            }    
    ])
        
        const response = await request(app)
            .post("/api/users/mario/transactions")
            .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`)
            .send({ username: "mario", amount: 100, type: "food" });

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error", "User (route) not found");
        //done();
    }) //ok

})


describe("getAllTransactions", () => { 

test("Should return all the existing transactions", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 500,
        type: "investment",
        date: "2023-04-19T00:00:00",
    }])

    const response = await request(app)
        .get("/api/transactions")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));
    expect(response.body.data[0]).toHaveProperty("_id", expect.any(String))
    expect(response.body.data[0]).toHaveProperty("username", "mario")
    expect(response.body.data[0]).toHaveProperty("amount", 100)
    expect(response.body.data[0]).toHaveProperty("type", "food")
    expect(response.body.data[0]).toHaveProperty("date", expect.any(String))
    expect(response.body.data[0]).toHaveProperty("color", "red")
    expect(response.body.data[1]).toHaveProperty("_id", expect.any(String))
    expect(response.body.data[1]).toHaveProperty("username", "tester")
    expect(response.body.data[1]).toHaveProperty("amount", 500)
    expect(response.body.data[1]).toHaveProperty("type", "investment")
    expect(response.body.data[1]).toHaveProperty("date", expect.any(String))
    expect(response.body.data[1]).toHaveProperty("color", "green")
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
})

test('Returns a 401 error if called by an authenticated user who is not an admin', async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 500,
        type: "investment",
        date: "2023-04-19T00:00:00",
    }])
    
    const response = await request(app)
    .get("/api/transactions")
    .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error");
  });

})


describe("getTransactionsByUser", () => { 


test("Should return all the existing transactions(user - only his)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/users/tester/transactions")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(200)

    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: "tester", type: expect.any(String), amount: expect.any(Number), date: expect.any(String), color: expect.any(String) })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done

test("Should return all the existing transactions with param(user - only his)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/users/tester/transactions")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(200)

    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: "tester", type: expect.any(String), amount: expect.any(Number), date: expect.any(String), color: expect.any(String) })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done

test("Should return all the existing transactions(admin - only his)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/users/mario")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) 
        .send()
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: expect.any(String), type: expect.any(String), amount: expect.any(Number), date: expect.any(String), color: expect.any(String) })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done

test("Should return a 400 error if the username passed as a route parameter does not represent a user in the database(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    

    
    await User.insertMany([
        {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    ])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/users/mario")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");    
}) //done; testToUpload

test("Should return a 400 error if the username passed as a route parameter does not represent a user in the database(admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    

    
    await User.insertMany([
        {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    ])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/users/mario/transactions")
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");    
}) //done: testToUpload




test("Should return a 400 error if the username passed as a route parameter does not represent a user in the database(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    

    
    await User.insertMany([
        {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }, {
            username: "admin",
            email: "admin@email.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }    ])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/users/mario/transactions")
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");    
}) //done

test("Should return a 401 error if if called by an authenticated user who is not the same user as the one in the route (authType = User) (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: marioAccessTokenValid
    },
    {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/users/tester/transactions")
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));    
}) //done

test("Should return a 401 error if if called by by an authenticated user who is not an admin (authType = Admin) (admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/users/Mario")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 
        .send()

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));    
}) //done

})


describe("getTransactionsByUserByCategory", () => { 

test("Should return all the transactions of a specific category (user - only his)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/users/tester/transactions/category/"   +catToSearch )
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 

    expect(response.status).toBe(200)

    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: "tester", type: "food", amount: expect.any(Number), date: expect.any(String), color: "red" })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done!

test("Should return all the transactions of a specific category (admin - any user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: testerAccessTokenValid
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/transactions/users/mario/category/"   +catToSearch )
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) 

    expect(response.status).toBe(200)

    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: "mario", type: "food", amount: expect.any(Number), date: expect.any(String), color: "red" })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done!

test("Should return a 400 error if the username passed as a route parameter does not represent a user in the database (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/users/mario/transactions/category/"   +catToSearch )
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`) 

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");
}) //done

test("Should return a 400 error if the username passed as a route parameter does not represent a user in the database (admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/transactions/users/mario/category/"   +catToSearch )
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) 

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found");
}) //done

test("Should return a 400 error if the category passed as a route parameter does not represent a category in the database (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "notCategory"
    const response = await request(app)
        .get("/api/users/tester/transactions/category/"   +catToSearch )
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Category not found");
}) //done

test("Should return a 400 error if the category passed as a route parameter does not represent a category in the database (admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "notCategory"
    const response = await request(app)
        .get("/api/transactions/users/tester/category/"   +catToSearch )
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`) 

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Category not found");
}) //done

test("Should return a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: marioAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/users/mario/transactions/category/"   +catToSearch )
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));
}) //done

test("Should return a 401 error if called by an authenticated user who is not an admin (authType = Admin) (authType = User) (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: marioAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "tester",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    let catToSearch = "food"
    const response = await request(app)
        .get("/api/transactions/users/tester/category/"   +catToSearch )
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`) 

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));
}) //done

})


describe("getTransactionsByGroup", () => { 

test("group -> transactions (user - only his group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario.@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/testGroup/transactions")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario.red@email.com","luigi.red@email.com"]});

//Setting cookies in the request
  

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: expect.stringMatching(/^(mario|tester)$/), type: expect.any(String), amount: expect.any(Number), date: expect.any(String), color: expect.any(String) })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) // DONEEEEEE

test("should return a 400 error if the group name passed as a route parameter does not represent a group in the database(user)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario.@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/notGroup/transactions")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario.red@email.com","luigi.red@email.com"]});      

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Group not found" )
}) //done

test("get transactions by group (admin) ", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }
])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "luigi",
          email: "luigi@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      },{
        name: "otherGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
      }
    ])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/groups/testGroup")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

//Setting cookies in the request
  

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));
    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: expect.stringMatching(/^(luigi|tester)$/), type: expect.any(String), amount: expect.any(Number), date: expect.any(String), color: expect.any(String) })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) // DONEEEEEE

test("should return a 400 error if the group name passed as a route parameter does not represent a group in the database(admin)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi.red@email.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },{
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario.@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/groups/notGroup")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Group not found" )
}) //done

test("should return a 401 error if called by an authenticated user who is not part of the group (user)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: marioAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "tester",
          email: "tester@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "luigi",
            email: "luigi@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/testGroup/transactions")
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario@test.com","tester@test.com"]});      

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String))
}) //done

test("should return a 401 error if called by an authenticated user who is not an admin (admin)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: marioAccessTokenValid
      },
      { 
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },{
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    } ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "tester",
          email: "tester@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "luigi",
            email: "luigi@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/transactions/groups/testGroup")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});      

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String))
}) //done

})  


describe("getTransactionsByGroupByCategory", () => { 

test("Should return the transactions made by the group of the user, filtered by category (user - only his group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/testGroup/transactions/category/investment")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario@test.com","tester@test"]});
  
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));

    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: expect.stringMatching(/^(mario|tester)$/), amount: expect.any(Number), type: "investment", date: expect.any(String), color: "green" })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done

test("Should return the transactions made by the group of the selected user, filtered by category (admin - any group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])

    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "luigi",
          email: "luigi@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      },{
        name: "otherGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
      } ])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    }   ])

    const response = await request(app)
        .get("/api/transactions/groups/testGroup/category/food")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

//Setting cookies in the request
  

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("data", expect.any(Array));

    response.body.data.forEach(member => {
        expect(member).toEqual(
            expect.objectContaining({ username: expect.stringMatching(/^(luigi|tester)$/), amount: expect.any(Number), type: "food", date: expect.any(String), color: "red" })
        )
    });
    //expect(response.body).toHaveProperty("refreshedTokenMessage")
}) //done

test("Should return a 400 error if the group name passed as a route parameter does not represent a group in the database (user - only his group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/notGroup/transactions/category/investment")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario@test.com","tester@test"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Group not found");
}) //done

test("Should return a 400 error if the group name passed as a route parameter does not represent a group in the database (admin - any group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])

    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "luigi",
          email: "luigi@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      },{
        name: "otherGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
      } ])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    }   ])

    const response = await request(app)
        .get("/api/transactions/groups/notGroup/category/food")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Group not found");
}) //done

test("Should return a 400 error if the category passed as a route parameter does not represent a category in the database (user - only his group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/testGroup/transactions/category/notCategory")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["mario@test.com","tester@test"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Category not found");
}) //done

test("Should return a 400 error if the category passed as a route parameter does not represent a category in the database (admin - any group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])

    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "luigi",
          email: "luigi@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      },{
        name: "otherGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
      } ])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    }   ])

    const response = await request(app)
        .get("/api/transactions/groups/testGroup/category/notCategory")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Category not found");
}) //done

test("Should return a 401 error if called by an authenticated user who is not part of the group (authType = Group) (user - only his group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "tester",
          email: "tester@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "luigi",
            email: "luigi@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      }])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    } ])

    const response = await request(app)
        .get("/api/groups/testGroup/transactions/category/food")
        .set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test"]});

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));
}) //done

test("Should return a 401 error if called by an authenticated user who is not an admin (authType = Admin) (admin - any group)", async () => {

    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])

    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario.@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "luigi",
        email: "luigi@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    },  {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }  ])


    await Group.insertMany([{
        name: "testGroup",
        members: [{
          username: "luigi",
          email: "luigi@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          },{
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
            }]  
      },{
        name: "otherGroup",
        members: [{
          username: "mario",
          email: "mario@test.com",
          password: "tester",
          refreshToken: testerAccessTokenValid
          }]  
      } ])


    await transactions.insertMany([{
        username: "mario",
        amount: 100,
        type: "food",
        date: "2023-05-19T00:00:00",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
        date: "2023-05-19T00:00:00",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
        date: "2023-04-19T00:00:00",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
        date: "2023-04-18T00:00:00",
    }   ])

    const response = await request(app)
        .get("/api/transactions/groups/testGroup/category/food")
        .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        .send({name: "testGroup", emails: ["luigi@test.com","tester@test.com"]});

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String));
}) //done

})  


describe("deleteTransaction", () => { 

test("Should delete an existing transaction, given id (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();


    
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send({ _id: createdID }) //Definition of the request body

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("message", expect.any(String))
}) //done

test("Should delete an existing transaction, given id (admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();

    
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({ _id: createdID }) //Definition of the request body

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("message", expect.any(String))
}) //done

test("Should return 400 error if the request body does not contain all the necessary attributes (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();
    
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send() //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Missing body parameters" )
}) //done

test("Should return 400 error if the request body does not contain all the necessary attributes (Admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();
    
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send() //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Missing body parameters" )
}) //done

test("Should return 400 error if the `_id` in the request body is an empty string(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    
    await transactions.create(testTransaction);
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send({_id: ""}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The index cannot be an empty string" )
})//done 

test("Should return 400 error if the `_id` in the request body is an empty string, given id (admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();
    
    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({_id: ""}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The index cannot be an empty string" )
})//done 

test("Should return 400 error if the username passed as a route parameter does not represent a user in the database(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);

    const testTransaction = {
        username: "mario",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();
    
    const response = await request(app)
    .delete("/api/users/mario/transactions").set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`)
    .send({ _id: createdID }) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found" )
}) //done

test("Should return 400 error if the username passed as a route parameter does not represent a user in the database(admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);

    const testTransaction = {
        username: "mario",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const createdID = createdTransaction._id.toString();
    
    const response = await request(app)
    .delete("/api/users/mario/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({ _id: createdID }) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "User not found" )
}) //done

test("Should return 400 error if the `_id` in the request body does not represent a transaction in the database(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    const testTransactions = [{  
        username: "tester",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }]
    const createdTransactions = await transactions.insertMany(testTransactions);

    //start procedure to obtain a fake Id, corresponding to the one of a previously deleted transaction
    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const toDeleteId = createdTransaction._id.toString();
    await transactions.deleteOne({ _id: toDeleteId })

    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send({_id: toDeleteId}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Transaction not found" )
}) //done

test("Should return 400 error if the `_id` in the request body does not represent a transaction in the database(admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    const testTransactions = [{  
        username: "tester",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }]
    const createdTransactions = await transactions.insertMany(testTransactions);

    //start procedure to obtain a fake Id, corresponding to the one of a previously deleted transaction
    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const toDeleteId = createdTransaction._id.toString();
    await transactions.deleteOne({ _id: toDeleteId })
    

    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({_id: toDeleteId}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Transaction not found" )
})//done

test("Should return 400 error if the `_id` in the request body represents a transaction made by a different user than the one in the route(user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    const testTransactions = [{  
        username: "tester",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }]
    const createdTransactions = await transactions.insertMany(testTransactions);

    const testTransaction = {
        username: "mario",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const searchId = createdTransaction._id.toString();

    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send({_id: searchId}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The user who made the transaction is different than the one in the route" )
}) //done

test("Should return 400 error if the `_id` in the request body represents a transaction made by a different user than the one in the route(admin)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    const testTransactions = [{  
        username: "tester",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }]
    const createdTransactions = await transactions.insertMany(testTransactions);

    const testTransaction = {
        username: "mario",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const searchId = createdTransaction._id.toString();

    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({_id: searchId}) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "The user who made the transaction is different than the one in the route" )
}) //done

test("Should return a 401 error if called by an authenticated user who is not the same user as the one in the route (user)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "mario",
        email: "mario@test.com",
        password: "mario",
        refreshToken: marioAccessTokenValid
    },
    {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])

    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const searchId = createdTransaction._id.toString();
    

    const response = await request(app)
    .delete("/api/users/tester/transactions").set("Cookie", `accessToken=${marioAccessTokenValid}; refreshToken=${marioAccessTokenValid}`)
    .send({_id: searchId}) //Definition of the request body

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String))
}) //done
})


describe("deleteTransactions", () => { 


test("Should delete multiple transaction, given id (admin only)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])


    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);
    const createdIDs = createdTransactions.map((transaction) => transaction._id.toString());

    
    const response = await request(app)
    .delete("/api/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({ _ids: createdIDs }) //Definition of the request body

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveProperty("message", expect.any(String))
}) //done

test("Should return a 400 error if the request body does not contain all the necessary attributes (admin only)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])


    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);
    const createdIDs = createdTransactions.map((transaction) => transaction._id.toString());

    
    const response = await request(app)
    .delete("/api/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send( ) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Missing parameters in the body")
}) //done

test("Should return a 400 error if at least one of the ids in the array is an empty string (admin only)", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])


    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);
    const createdIDs = createdTransactions.map((transaction) => transaction._id.toString());
    const createdIDsWithEmpty = createdIDs.map((id) => id + '');
    createdIDsWithEmpty.unshift('');
    
    const response = await request(app)
    .delete("/api/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({ _ids: createdIDsWithEmpty } ) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Empty string ID found")
}) //done 

test("Should return a 400 error if at least one of the does not represent a transaction in the database", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])
    
    //start procedure to create a fake Id, corresponding to a deleted transaction
    const testTransaction = {
        username: "tester",
        type: "investment",
        amount: 100
    }
    const createdTransaction = await transactions.create(testTransaction);
    const toDeleteId = createdTransaction._id.toString();

    //end


    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }]

    const createdTransactions = await transactions.insertMany(testTransactions);
    const createdIDs = createdTransactions.map((transaction) => transaction._id.toString());
    await transactions.deleteOne({ _id: toDeleteId })


    const createdIDsWithWrong = createdIDs.map((id) => id + toDeleteId);
    createdIDsWithWrong.unshift(toDeleteId);
    
    const response = await request(app)
    .delete("/api/transactions").set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
    .send({ _ids: createdIDsWithWrong } ) //Definition of the request body

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty("error", "Non existing transaction found")
}) //done

test("Should return a 401 error delete if called by an authenticated user who is not an admin", async () => {
    await categories.insertMany([{
        type: "food",
        color: "red",
    }, {
        type: "investment",
        color: "green",
    }])
    await User.insertMany([{
        username: "tester",
        email: "tester@test.com",
        password: "tester",
        refreshToken: testerAccessTokenValid
    }, {
        username: "admin",
        email: "admin@email.com",
        password: "admin",
        refreshToken: adminAccessTokenValid,
        role: "Admin"
    }])


    const testTransactions = [{
        username: "mario",
        amount: 100,
        type: "food",
    }, {
        username: "mario",
        amount: 500,
        type: "investment",
    }, {
        username: "luigi",
        amount: 70,
        type: "food",
    }, {
        username: "tester",
        amount: 800,
        type: "investment",
    } ]

    const createdTransactions = await transactions.insertMany(testTransactions);
    const createdIDs = createdTransactions.map((transaction) => transaction._id.toString());

    
    const response = await request(app)
    .delete("/api/transactions").set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
    .send({ _ids: createdIDs }) //Definition of the request body

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty("error", expect.any(String))
}) //done

}) 
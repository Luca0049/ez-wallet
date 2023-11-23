import { categories, transactions } from "../models/model.js";
import { Group, User } from "../models/User.js";
import { handleDateFilterParams, handleAmountFilterParams, verifyAuth } from "./utils.js";



/**
- Request Parameters: None
- Request Body Content: An object having attributes `type` and `color`
  - Example: `{type: "food", color: "red"}`
- Response `data` Content: An object having attributes `type` and `color`
  - Example: `res.status(200).json({data: {type: "food", color: "red"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the type of category passed in the request body represents an already existing category in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const createCategory = async (req, res) => {
    //autorizzazione
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            const { type, color } = req.body;
            //start checks
            if (type === undefined || color === undefined) {
                return res.status(400).json({ error: "Request body does not contain all the necessary attributes" });
            }
            if (type.trim() === '') {
                return res.status(400).json({ error: "The type value is invalid" });
            }
            if (color.trim() === '') {
                return res.status(400).json({ error: "The color value is invalid" });
            }
            const existingCategory = await categories.findOne({ type: type })
            if (existingCategory) {
                return res.status(400).json({ error: "A category with that type is already present in the database" });
            }
            //end checks

            const newCategory = new categories({ type, color });
            await newCategory.save();
            res.status(200).json({
                data: {
                    type: type,
                    color: color
                },
                refreshedTokenMessage: res.locals.refreshedTokenMessage
            })
        }
        else res.status(401).json({ error: adminAuth.cause })

    } catch (error) {
        res.status(500).json({ error: "generic error" })
    }
}

/**
- Request Parameters: A string equal to the `type` of the category that must be edited
  - Example: `api/categories/food`
- Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Example: `{type: "Food", color: "yellow"}`
- Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Example: `res.status(200).json({data: {message: "Category edited successfully", count: 2}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- In case any of the following errors apply then the category is not updated, and transactions are not changed
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the type of category passed as a route parameter does not represent a category in the database
- Returns a 400 error if the type of category passed in the request body as the new type represents an already existing category in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const updateCategory = async (req, res) => {

    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            //start checks
            const { type, color } = req.body;
            if (type === undefined || color === undefined) {
                //console.log("1");
                return res.status(400).json({ error: "Request body does not contain all the necessary attributes" });
            }
            if (type.trim() === '') {
                //console.log("2");
                return res.status(400).json({ error: "The updated value of type is invalid" });
            }
            if (color.trim() === '') {
                //console.log("3")
                return res.status(400).json({ error: "The updated value of color is invalid" });
            }
            const typeRoute = req.params.type;
            const typeRouteCount = await categories.count({ type: typeRoute });
            //console.log(typeRouteCount)
            if (typeRouteCount === 0) {
                //console.log("4")
                return res.status(400).json({ error: "The category to update is not present in the database" });
            }

            const typeCount = await categories.count({ type: type });
            if (typeCount > 0) {
                //console.log("5");
                return res.status(400).json({ error: "A category with that type is already present in the database" });
            }

            //end checks
            const updateTransaction = await transactions.updateMany(
                { category: typeRoute },
                { $set: { type: type } }
            );
            const modifiedTransactionCount = updateTransaction.modifiedCount === undefined ? 0 : updateTransaction.modifiedCount;  // Check if result exists and consider it as modified if it does, and consider it equal to 0 and not unefined if it does not
            await categories.findOneAndUpdate({ type: typeRoute }, { type: type, color: color }, { returnOriginal: false });
            //response data content
            res.status(200).json({ data: { message: "Category updated successfully", count: modifiedTransactionCount }, refreshedTokenMessage: res.locals.refreshedTokenMessage })

        } else res.status(401).json({ error: adminAuth.cause })

    } catch (error) {
        res.status(500).json({ error: "generic error" })
    }
}

/**
- Request Parameters: None
- Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Example: `{types: ["health"]}`
- Response `data` Content: An object with an attribute `message` that confirms successful deletion and an attribute `count` that specifies the number of transactions that have had their category type changed
  - Example: `res.status(200).json({data: {message: "Categories deleted", count: 1}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Given N = categories in the database and T = categories to delete:
  - If N > T then all transactions with a category to delete must have their category set to the oldest category that is not in T
  - If N = T then the oldest created category cannot be deleted and all transactions must have their category set to that category
- In case any of the following errors apply then no category is deleted
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if called when there is only one category in the database
- Returns a 400 error if at least one of the types in the array is an empty string
- Returns a 400 error if at least one of the types in the array does not represent a category in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */

export const deleteCategory = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            const categoriesToRemove = req.body.types;
            if (categoriesToRemove === undefined) {
                return res.status(400).json({ error: "Request body does not contain all the necessary attributes - not an array" })
            }
            const N = await categories.countDocuments();
            if (N === 1) {
                return res.status(400).json({ error: "There is only one category in the database" })
            }
            let T = categoriesToRemove.length;

            if (T === 0) {
                return res.status(400).json({ error: "Request body does not contain all the necessary attributes - empty array" })
            }
            for (let i = 0; i < T; i++) {  
                if (categoriesToRemove[i].trim() === '') {
                    return res.status(400).json({ error: "Request body does not contain all the necessary attributes - Empty string in types" })
                }
            }
            for (let i = 0; i < T; i++) {
                const catCount = await categories.count({ type: categoriesToRemove[i] });
                if (catCount === 0) {
                    return res.status(400).json({ error: "Category not found" });
                }
            }

            let modifiedTransactions = -1; //inizializzato a -1 in modo da capire se non viene aggiornato dalle funzioni
            if (N === T) {
                let oldestEntry = await categories.find();
                oldestEntry = [...oldestEntry.sort((a, b) => b.createdAt - a.createdAt)];
                const typeChange = oldestEntry[0].type;
                let numbers = await transactions.updateMany({ type: { $ne: typeChange } }, { $set: { type: typeChange } }); //cambio tutte le transactions che non abbiano già il dato type
                modifiedTransactions = numbers.modifiedCount;
                await categories.deleteMany({ type: { $ne: typeChange } });
            }
            if (N > T) {
                let oldestEntry = await categories.find({ type: { $nin: categoriesToRemove } });
                console.log(`BEFORE: ${oldestEntry}`)
                oldestEntry = [...oldestEntry.sort((a, b) => b.createdAt - a.createdAt)];
                console.log(`AFTER: ${oldestEntry}`)
                const typeChange = oldestEntry[0].type;
                let numbers = await transactions.updateMany({ type: { $in: categoriesToRemove } }, { $set: { type: typeChange } }); //cambio tutte le transactions che non abbiano già il dato type
                modifiedTransactions = numbers.modifiedCount;
                await categories.deleteMany({ type: { $in: categoriesToRemove } });
            }
            /*
            not required
            if (N < T) {
                //console.log("N < T");
                return res.status(400).json({ error: "Too many arguments" }); // additional check: potrebbero esserci più categorie da cancellare che cancellabi
            }
            */
            res.status(200).json({
                data: {
                    message: "Categories deleted",
                    count: modifiedTransactions
                },
                refreshedTokenMessage: res.locals.refreshedTokenMessage
            });
        } else res.status(401).json({ error: adminAuth.cause })
    } catch (error) {
        res.status(500).json({ error: "Generic error" })
    }
}

/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Example: `res.status(200).json({data: [{type: "food", color: "red"}, {type: "health", color: "green"}], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by a user who is not authenticated (authType = Simple)
 */
export const getCategories = async (req, res) => {
    try {
        const simpleAuth = verifyAuth(req, res, { authType: "Simple" });
        if (simpleAuth.authorized) {
            const categoriesArray = await categories.find();
            const resultArray = categoriesArray.map(item => ({
                type: item.type,
                color: item.color
            }));
            return res.status(200).json({
                data: resultArray,
                refreshedTokenMessage: res.locals.refreshedTokenMessage
            })
        } else res.status(401).json({ error: simpleAuth.cause })

    } catch (error) {
        res.status(500).json({ error: "Internal server error" }) //check error message
    }
}

/**
 *  - Request Parameters: A string equal to the `username` of the involved user
        - Example: `/api/users/Mario/transactions`
    - Request Body Content: An object having attributes `username`, `type` and `amount`
        - Example: `{username: "Mario", amount: 100, type: "food"}`
    - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
        - Example: `res.status(200).json({data: {username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
    - Returns a 400 error if the request body does not contain all the necessary attributes    
    - Returns a 400 error if at least one of the parameters in the request body is an empty string
    - Returns a 400 error if the type of category passed in the request body does not represent a category in the database
    - Returns a 400 error if the username passed in the request body is not equal to the one passed as a route parameter
    - Returns a 400 error if the username passed in the request body does not represent a user in the database
    - Returns a 400 error if the username passed as a route parameter does not represent a user in the database
    - Returns a 400 error if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)
    - Returns a 401 error if called by an authenticated user who is not the same user as the one in the route parameter (authType = User)
 */

export const createTransaction = async (req, res) => {
    try {
        const { username, amount, type } = req.body;
        const usernameRoute = req.params.username;
        const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
        if (userAuth.authorized) {
            if (username === undefined || amount === undefined || type === undefined) {
                return res.status(400).json({ error: "Missing attributes in the body request" });
            }

            if (username.trim() === "" || amount === "" || type.trim() === "") {
                return res.status(400).json({ error: "Body parameters cannot be empty" });
            }

            const userCountRoute = await User.count({ username: usernameRoute })
            if (userCountRoute === 0) {
                return res.status(400).json({ error: "User (route) not found" });
            }

            const userCountBody = await User.count({ username: username })
            if (userCountBody === 0) {
                return res.status(400).json({ error: "User (body) not found" });
            }


            const categoryCount = await categories.count({ type: type })
            if (categoryCount === 0) {
                return res.status(400).json({ error: "Category not found" });
            }
            if (username !== usernameRoute) {
                return res.status(400).json({ error: "Body username != Route username" });
            }

            if (isNaN(parseFloat(amount))) {
                return res.status(400).json({ error: "Invalid amount" });
            }
            const new_transactions = new transactions({ username, amount, type });
            new_transactions.save()
                .then(data => res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage }))
                .catch(err => { throw err })
        }
        else  
            res.status(401).json({ error: userAuth.cause });
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
    
/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"}, {username: "Luigi", amount: 20, type: "food", date: "2023-05-19T10:00:00", color: "red"} ], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)

 */
export const getAllTransactions = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            transactions.aggregate([
                {
                    $lookup: {
                        from: "categories",
                        localField: "type",
                        foreignField: "type",
                        as: "categories_info"
                    }
                },
                { $unwind: "$categories_info" }
            ]).then((result) => {
                let data = result.map(v => Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
                res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
            }).catch(error => { throw (error) })
        }
        else {
            res.status(401).json({ error: adminAuth.cause })
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
- Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario/transactions` (user route)
  - Example: `/api/transactions/users/Mario` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`
- Can be filtered by date and amount if the necessary query parameters are present and if the route is `/api/users/:username/transactions`
 */
export const getTransactionsByUser = async (req, res) => {
    try {
        //Distinction between route accessed by Admins or Regular users for functions that can be called by both
        //and different behaviors and access rights
        const username = req.params.username;
        const userCount = await User.count({ username: username })
        if (req.url.indexOf("/transactions/users/") >= 0) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })
            if (adminAuth.authorized) {
                if (userCount === 0) {
                    return res.status(400).json({ error: "User not found" });
                }
                transactions.aggregate([
                    {
                        $lookup: {
                            from: "categories",
                            localField: "type",
                            foreignField: "type",
                            as: "categories_info"
                        }
                    },
                    {
                        $unwind: "$categories_info"
                    },
                    {
                        $match: { username: username }
                    }
                ])
                    .then((result) => {
                        let data = result.map(v => Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
                        res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
                    }).catch(error => { throw (error) })
            }
            else {
                res.status(401).json({ error: adminAuth.cause })
            }
        }
        else {
            const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username })
            if (userAuth.authorized) {
                if (userCount === 0) {
                    return res.status(400).json({ error: "User not found" });
                }
                transactions.aggregate([
                    {
                        $lookup: {
                            from: "categories",
                            localField: "type",
                            foreignField: "type",
                            as: "categories_info"
                        }
                    },
                    {
                        $unwind: "$categories_info"
                    },
                    {
                        $match: {
                            $and: [
                                { username: username },
                                handleAmountFilterParams(req),
                                handleDateFilterParams(req)
                            ]
                        }
                    }
                ])
                    .then((result) => {
                        let data = result.map(v => Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
                        res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
                    })
                    .catch(error => { throw (error) })
            }
            else {
                res.status(401).json({ error: userAuth.cause })
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
- The behavior defined below applies only for the specified route
- Request Parameters: A string equal to the `username` of the involved user, a string equal to the requested `category`
  - Example: `/api/users/Mario/transactions/category/food` (user route)
  - Example: `/api/transactions/users/Mario/category/food` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 400 error if the category passed as a route parameter does not represent a category in the database
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions/category/:category`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username/category/:category`
 */
export const getTransactionsByUserByCategory = async (req, res) => {
    try {
        const username = req.params.username;
        const type = req.params.category;
        const userCount = await User.count({ username: username })
        if (req.url.indexOf("/transactions/users/") >= 0) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })
            if (adminAuth.authorized) {
                if (userCount === 0) {
                    return res.status(400).json({ error: "User not found" });
                }
                const categoryCount = await categories.count({ type: type })
                if (categoryCount === 0) {
                    return res.status(400).json({ error: "Category not found" });
                }
                transactions.aggregate([
                    {
                        $lookup: {
                            from: "categories",
                            localField: "type",
                            foreignField: "type",
                            as: "categories_info"
                        }
                    },
                    {
                        $unwind: "$categories_info"
                    },
                    {
                        $match: {
                            $and: [
                                { username: username },
                                { type: type }
                            ]
                        }
                    }
                ])
                    .then((result) => {
                        let data = result.map(v => Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
                        res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
                    }).catch(error => { throw (error) })
            }
            else {
                res.status(401).json({ error: adminAuth.cause })
            }
        }
        else {
            const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username }) 
            if (userAuth.authorized) {
                if (userCount === 0) {
                    return res.status(400).json({ error: "User not found" });
                }
                const categoryCount = await categories.count({ type: type })
                if (categoryCount === 0) {
                    return res.status(400).json({ error: "Category not found" });
                }
                transactions.aggregate([
                    {
                        $lookup: {
                            from: "categories",
                            localField: "type",
                            foreignField: "type",
                            as: "categories_info"
                        }
                    },
                    {
                        $unwind: "$categories_info"
                    },
                    {
                        $match: {
                            $and: [
                                { username: username },
                                { type: type },
                                handleAmountFilterParams(req),
                                handleDateFilterParams(req)
                            ]
                        }
                    }
                ])
                    .then((result) => {
                        let data = result.map(v => Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
                        res.json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
                    }).catch(error => { throw (error) })


            }
            else {
                res.status(401).json({ error: userAuth.cause })
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
 - Request Parameters: A string equal to the `name` of the requested group
  - Example: `/api/groups/Family/transactions` (user route)
  - Example: `/api/transactions/groups/Family` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"}, {username: "Luigi", amount: 20, type: "food", date: "2023-05-19T10:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
- Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `/api/groups/:name/transactions`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/groups/:name`
 */
export const getTransactionsByGroup = async (req, res) => {
    try {
        const groupName = req.params.name;
        const groupCount = await Group.count({ name: groupName })
        if (groupCount === 0) {
            return res.status(400).json({ error: "Group not found" });
        }
        let groupEmails = await Group.findOne({ name: groupName }, { 'members.email': 1 });
        groupEmails = groupEmails.members.map(x => x.email);
        if (req.url.indexOf("/transactions/groups/") >= 0) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })
            if (adminAuth.authorized) {
                let groupMembers = [];
                for (const email of groupEmails) {
                    let user = await User.findOne({ email: email }, { username: 1, _id: 0 });
                    groupMembers.push(user.username);
                }
                let groupTransactions = [];
                for (const user of groupMembers) {
                    let memberTransactions = await transactions.aggregate([
                        {
                            $lookup: {
                                from: "categories",
                                localField: "type",
                                foreignField: "type",
                                as: "categories_info"
                            }
                        },
                        {
                            $unwind: "$categories_info"
                        },
                        {
                            $match: { username: user }
                        }
                    ]);
                    memberTransactions = memberTransactions.map(v => groupTransactions.push(Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date })));
                }
                res.json({ data: groupTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
            }
            else {
                res.status(401).json({ error: adminAuth.cause })
            }
        }
        else {
            const groupAuth = verifyAuth(req, res, { authType: "Group", emails: groupEmails })
            if (groupAuth.authorized) {
                let groupMembers = [];
                for (const email of groupEmails) {
                    let user = await User.findOne({ email: email }, { username: 1, _id: 0 });
                    groupMembers.push(user.username);
                }
                let groupTransactions = [];
                for (const user of groupMembers) {
                    let memberTransactions = await transactions.aggregate([
                        {
                            $lookup: {
                                from: "categories",
                                localField: "type",
                                foreignField: "type",
                                as: "categories_info"
                            }
                        },
                        {
                            $unwind: "$categories_info"
                        },
                        {
                            $match: { username: user }
                        }
                    ]);
                    memberTransactions = memberTransactions.map(v => groupTransactions.push(Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date })));
                }
                res.json({ data: groupTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
            }
            else {
                res.status(401).json({ error: groupAuth.cause })
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
- Request Parameters: A string equal to the `name` of the requested group, a string equal to the requested `category`
  - Example: `/api/groups/Family/transactions/category/food` (user route)
  - Example: `/api/transactions/groups/Family/category/food` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Luigi", amount: 20, type: "food", date: "2023-05-19T10:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
- Returns a 400 error if the category passed as a route parameter does not represent a category in the database
- Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `/api/groups/:name/transactions/category/:category`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/groups/:name/category/:category`
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
    try {
        const groupName = req.params.name;
        const type = req.params.category;
        const categoryCount = await categories.count({ type: type })
        const groupCount = await Group.count({ name: groupName })
        if (groupCount === 0) {
            return res.status(400).json({ error: "Group not found" });
        }
        let groupEmails = await Group.findOne({ name: groupName }, { 'members.email': 1 });
        groupEmails = groupEmails.members.map(x => x.email);
        if (req.url.indexOf("/transactions/groups/") >= 0) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })
            if (adminAuth.authorized) {
                if (categoryCount === 0) {
                    return res.status(400).json({ error: "Category not found" });
                }
                let groupMembers = [];
                for (const email of groupEmails) {
                    let user = await User.findOne({ email: email }, { username: 1, _id: 0 });
                    groupMembers.push(user.username);
                }
                let groupTransactions = [];
                for (const user of groupMembers) {
                    let memberTransactions = await transactions.aggregate([
                        {
                            $lookup: {
                                from: "categories",
                                localField: "type",
                                foreignField: "type",
                                as: "categories_info"
                            }
                        },
                        {
                            $unwind: "$categories_info"
                        },
                        {
                            $match: {
                                $and: [{ username: user }, { type: type }]
                            }
                        }
                    ]);
                    memberTransactions = memberTransactions.map(v => groupTransactions.push(Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date })));
                }
                res.json({ data: groupTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
            }
            else {
                res.status(401).json({ error: adminAuth.cause })
            }
        }
        else {
            const groupAuth = verifyAuth(req, res, { authType: "Group", emails: groupEmails })
            if (groupAuth.authorized) {
                if (categoryCount === 0) {
                    return res.status(400).json({ error: "Category not found" });
                }
                let groupMembers = [];
                for (const email of groupEmails) {
                    let user = await User.findOne({ email: email }, { username: 1, _id: 0 });
                    groupMembers.push(user.username);
                }
                let groupTransactions = [];
                for (const user of groupMembers) {
                    let memberTransactions = await transactions.aggregate([
                        {
                            $lookup: {
                                from: "categories",
                                localField: "type",
                                foreignField: "type",
                                as: "categories_info"
                            }
                        },
                        {
                            $unwind: "$categories_info"
                        },
                        {
                            $match: {
                                $and: [{ username: user }, { type: type }]
                            }
                        }
                    ]);
                    memberTransactions = memberTransactions.map(v => groupTransactions.push(Object.assign({}, { _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date })));
                }
                res.json({ data: groupTransactions, refreshedTokenMessage: res.locals.refreshedTokenMessage });
            }
            else {
                res.status(401).json({ error: groupAuth.cause })
            }
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
- Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario/transactions`
- Request Body Content: The `_id` of the transaction to be deleted
  - Example: `{_id: "6hjkohgfc8nvu786"}`
- Response `data` Content: A string indicating successful deletion of the transaction
  - Example: `res.status(200).json({data: {message: "Transaction deleted"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if the `_id` in the request body is an empty string
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 400 error if the `_id` in the request body does not represent a transaction in the database
- Returns a 400 error if the `_id` in the request body represents a transaction made by a different user than the one in the route
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User)
 */
export const deleteTransaction = async (req, res) => {

    try {
       const username = req.params.username;
       const index = req.body._id;
       const userCount = await User.count({ username: username })
       const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
       if (userAuth.authorized) {
           if (index === undefined) {
               return res.status(400).json({ error: "Missing body parameters" });
           }
           if (index === "") {
               return res.status(400).json({ error: "The index cannot be an empty string" });
           }
           if (userCount === 0) {
               return res.status(400).json({ error: "User not found" });
           }
           let transUser = await transactions.findOne({ _id: index }, { username: 1, _id: 0 });
           if (transUser === null) {
               return res.status(400).json({ error: "Transaction not found" });
           }
           transUser = transUser.username;
           if (username !== transUser) {
               return res.status(400).json({ error: "The user who made the transaction is different than the one in the route" });
           }
           let data = await transactions.deleteOne({ _id: index });
           res.status(200).json({ data: { message: "Transaction deleted" }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
       }
       else {
           const adminAuth = verifyAuth(req, res, { authType: "Admin" })
           if (adminAuth.authorized) {
               if (index === undefined) {
                   return res.status(400).json({ error: "Missing body parameters" });
               }
               if (index === "") {
                   return res.status(400).json({ error: "The index cannot be an empty string" });
               }
               if (userCount === 0) {
                   return res.status(400).json({ error: "User not found" });
               }
               let transUser = await transactions.findOne({ _id: index }, { username: 1, _id: 0 });
               if (transUser === null) {
                   return res.status(400).json({ error: "Transaction not found" });
               }
               transUser = transUser.username; //aggiunto
               if (username !== transUser) {
                   return res.status(400).json({ error: "The user who made the transaction is different than the one in the route" });
               }
               let data = await transactions.deleteOne({ _id: index });
               res.status(200).json({ data: { message: "Transaction deleted" }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
           }
           else {
               res.status(401).json({ error: adminAuth.cause })
           }
       }
   } catch (error) {
       res.status(500).json({ error: error.message })
   }
}


/**
- Request Parameters: None
- Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Example: `{_ids: ["6hjkohgfc8nvu786"]}`
- Response `data` Content: A message confirming successful deletion
  - Example: `res.status(200).json({data: {message: "Transactions deleted"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- In case any of the following errors apply then no transaction is deleted
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the ids in the array is an empty string
- Returns a 400 error if at least one of the ids in the array does not represent a transaction in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const deleteTransactions = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            const indices = req.body._ids;
            if (indices === undefined) {
                return res.status(400).json({ error: "Missing parameters in the body" });
            }
            for (let index of indices) {

                if (index === "") {
                    return res.status(400).json({ error: "Empty string ID found" });
                }
                let transCount = await transactions.count({ _id: index });
                if (transCount === 0)
                    return res.status(400).json({ error: "Non existing transaction found" });
            }
            for (let index of indices) {
                let data = await transactions.deleteOne({ _id: index });
            }
            return res.status(200).json({ data: { message: "Transactions deleted" }, refreshedTokenMessage: res.locals.refreshedTokenMessage });
        }
        else {
            res.status(401).json({ error: adminAuth.cause });
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

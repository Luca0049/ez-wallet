import { group } from "console";
import { Group, User } from "../models/User.js";
import { transactions } from "../models/model.js";
import { verifyAuth, emailFromToken } from "./utils.js";

/**
  - Request Parameters: None
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
    - Example: `res.status(200).json({data: [{username: "Mario", email: "mario.red@email.com", role: "Regular"}, {username: "Luigi", email: "luigi.red@email.com", role: "Regular"}, {username: "admin", email: "admin@email.com", role: "Regular"} ], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const getUsers = async (req, res) => {
    
    try {
      const adminAuth = verifyAuth(req, res, { authType: "Admin" })
      if(adminAuth.authorized){
        //Admin auth successful
        const users = await User.find();
        res.status(200).json({data: users, refreshedTokenMessage: res.locals.refreshedTokenMessage});
      }else{
        res.status(401).json({ error: adminAuth.cause})
      }
      
    } catch (error) {
        res.status(500).json(error.message);
    }
}

/**
  - Request Parameters: A string equal to the `username` of the involved user
    - Example: `/api/users/Mario`
  - Request Body Content: None
  - Response `data` Content: An object having attributes `username`, `email` and `role`.
    - Example: `res.status(200).json({data: {username: "Mario", email: "mario.red@email.com", role: "Regular"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - Returns a 400 error if the username passed as the route parameter does not represent a user in the database
  - Returns a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter (authType = User) nor an admin (authType = Admin)
  */

export const getUser = async (req, res) => {

  try {
    const { username } = req.params

    const userAuth = verifyAuth(req, res, { authType: "User", username: username })
    if (userAuth.authorized) {
      
      const user = await User.findOne({ username: username })
      if (!user) return res.status(400).json({ error: "User not found" })
      
      res.status(200).json({data: user, refreshedTokenMessage: res.locals.refreshedTokenMessage});

    } else {
      const adminAuth = verifyAuth(req, res, { authType: "Admin" })
      if (adminAuth.authorized) {
        const user = await User.findOne({ username: username})
        if (!user) return res.status(400).json({ error: "User not found" })
        
        res.status(200).json({data: user, refreshedTokenMessage: res.locals.refreshedTokenMessage})

      } else {
        res.status(401).json({ error: adminAuth.cause})
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}


/**
 * isInGroup
   -input: email of a user
   -output: if the user is inside a group true else false
 */
export async function isInGroup(email) {
  const userAlreadyInGroup = await Group.findOne({members: {$elemMatch: {email: email}}});
  if(userAlreadyInGroup)  return true
  else                    return false
}

export async function getGroupByUserEmail(email) {
  const group = await Group.findOne({members: {$elemMatch: {email: email}}});
  return group
}

/**
 * validateEmail
 */
export function validateEmail(email) {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
}


/**
 * Create a new group
  - Request Parameters: None
  - Request request body Content: An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
    - Example: `{name: "Family", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]}`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
    - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}, membersNotFound: [], alreadyInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - If the user who calls the API does not have their email in the list of emails then their email is added to the list of members
  - Returns a 400 error if the request body does not contain all the necessary attributes
  - Returns a 400 error if the group name passed in the request body is an empty string
  - Returns a 400 error if the group name passed in the request body represents an already existing group in the database
  - Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database
  - Returns a 400 error if the user who calls the API is already in a group
  - Returns a 400 error if at least one of the member emails is not in a valid email format
  - Returns a 400 error if at least one of the member emails is an empty string
  - Returns a 401 error if called by a user who is not authenticated (authType = Simple)
 */
export const createGroup = async (req, res) => {
    try {
      let groupName = req.body.name; const memberEmails = req.body.memberEmails;
      if(!groupName || !memberEmails) return res.status(400).json({ error: "Request body does not contain all the necessary attributes" });

      groupName = groupName.trim();
      if(!groupName) return res.status(400).json({ error: "The group name passed in the request body is an empty string" });

      const simpleAuth = verifyAuth(req, res, {authType: "Simple"});
      if(simpleAuth.authorized){
        let members = []; let alreadyInGroup = []; let membersNotFound = [];

        const userCreator = await User.findOne({ email: emailFromToken(req) });
        //console.log(userCreator);
        let email = userCreator.email;
        let boolIsInGroup = await isInGroup(userCreator.email)
        if(boolIsInGroup === true){
          return res.status(400).json({ error: "User who calls the API is already in a group" });
        
        }

        const existingGroup = await Group.findOne({ name: groupName });
        
        if(existingGroup) return res.status(400).json({ error: "There is already an existing group with the same name" });
        
        for(let email of memberEmails) {
          if(!validateEmail(email)) return res.status(400).json({ error: "At least one of the member emails is not in a valid email format" });

          const user = await User.findOne({ email: email });
          if(!user)
            membersNotFound.push(email);
          else if(await isInGroup(email))
            alreadyInGroup.push(email);
          else {
            if(email !== userCreator.email)
              members.push({email, user});
          }
        }

        if(!members.length) return res.status(400).json({ error: "All the memberEmails either do not exist or are already in a group" });
        else {
          members.push({email: userCreator.email, user: userCreator});
          await Group.create({name: groupName, members: members});
          members = members.map(member => { return {email: member.email} });
          return res.status(200).json({data: {group: {name: groupName, members: members}, membersNotFound: membersNotFound, alreadyInGroup: alreadyInGroup}, refreshedTokenMessage: res.locals.refreshedTokenMessage});
        }
      }
      else {
        return res.status(401).json({ error: simpleAuth.cause})
      }
    }
    catch (err) {
      return res.status(500).json({error: err.message})
    }
}

/**
 * Return all the groups
  - Request Parameters: None
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group and an array for the `members` of the group
    - Example: `res.status(200).json({data: [{name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
  - Optional behavior:
    - empty array is returned if there are no groups
 */
export const getGroups = async (req, res) => {
  try {
    const adminAuth = verifyAuth(req, res, { authType: "Admin" })
    if (adminAuth.authorized) {
      let groups = await Group.find();

      // let groups1 = [];
      // for(let group of groups) {
      //   let m = group.members;
      //   m = m.map(member => {return {email: member.email} });
      //   console.log(m);
      //   groups1.push({name: group.name, members: m});
      // }
      // console.log(groups);

      return res.status(200).json({ data: groups });
    }
    else {
      return res.status(401).json({ error: adminAuth.cause});
    }
  } 
  catch (err) {
    return res.status(500).json({error: err.message})
  }
}

/**
 * Return information of a specific group
  - Request Parameters: A string equal to the `name` of the requested group
    - Example: `/api/groups/Family`
  - Request Body Content: None
  - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the `members` of the group
    - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
  - Returns a 401 error if called by an authenticated user who is neither part of the group (authType = Group) nor an admin (authType = Admin)
 */
export const getGroup = async (req, res) => {      
  try {
    const groupName = req.params.name;
    const group = await Group.findOne({ name: groupName });
    if(!group) return res.status(400).json({ error: "The group does not exist" });

    const groupEmails = group.members.map(member => member.email);
    const groupAuth = verifyAuth(req, res, {authType: "Group", emails: groupEmails});
    if (groupAuth.authorized) 
      res.status(200).json({ data: {group} })
    else {
      const adminAuth = verifyAuth(req, res, { authType: "Admin" })
      if (adminAuth.authorized) 
        res.status(200).json({ data: {group} });
      else 
        res.status(401).json({ error: adminAuth.cause});
    }
  }
  catch (error) {
    res.status(500).json({ error: error.message })
  }
}

/**
 * Add new members to a group
  - Request Parameters: A string equal to the `name` of the group
    - Example: `api/groups/Family/add` (user route)
    - Example: `api/groups/Family/insert` (admin route)
  - Request Body Content: An array of strings containing the `emails` of the members to add to the group
    - Example: `{emails: ["pietro.blue@email.com"]}`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group, this array must include the new members as well as the old ones), an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
    - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}, {email: "pietro.blue@email.com"}]}, membersNotFound: [], alreadyInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - In case any of the following errors apply then no user is added to the group
  v- Returns a 400 error if the request body does not contain all the necessary attributes
  v- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
  - Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database
  - Returns a 400 error if at least one of the member emails is not in a valid email format
  - Returns a 400 error if at least one of the member emails is an empty string
  - Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/add`
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/insert`
 */
export const addToGroup = async (req, res) => {
  try {
    const groupName = req.params.name; const emailsToAdd = req.body.emails;
    if(!groupName || !emailsToAdd) return res.status(400).json({ error: "Request body does not contain all the necessary attributes" });
    
    const group = await Group.findOne({ name: groupName });
    
    if(!group) return res.status(400).json({ error: "The group does not exist" });
    
    let groupEmails = group.members.map(member => member.email);
    
    const groupAuth = verifyAuth(req, res, {authType: "Group", emails: groupEmails});
    
    if(groupAuth.authorized)
      addToGroupMain(res, group, groupEmails, emailsToAdd);
    else {
      const adminAuth = verifyAuth(req, res, { authType: "Admin" });
      if(adminAuth.authorized)
        addToGroupMain(res, group, groupEmails, emailsToAdd);
      else
        return res.status(401).json({ error: adminAuth.cause});
    }
  }
  catch (err) {
    return res.status(500).json({error: err.message})
  }
}

async function addToGroupMain(res, group, groupEmails, emails)
{
  let membersToAdd = []; let alreadyInGroup = []; let membersNotFound = [];
  
  for(let email of emails){
    if(!validateEmail(email)){
      return res.status(400).json({ error: "At least one of the member emails is not in a valid email format" });
    } 
    const user = await User.findOne({ email: email });
    
    if(!user){
      membersNotFound.push(email);
    }else{
      let boolIsInGroup = await isInGroup(email)
      if(boolIsInGroup == true){
        alreadyInGroup.push(email);
      }else {
        membersToAdd.push({email, user});
        groupEmails.push(email);
      }
    
    }
  }

  if(!membersToAdd.length)
    return res.status(400).json({ error: "All the emails either do not exist or are already in a group" });
  else {
    await Group.updateOne( 
      {name: group.name}, 
      {$push: {
        members: {$each: membersToAdd}
      }}
    );
    groupEmails = groupEmails.map(email => { return {email: email} });
    return res.status(200).json({data: {group: {name: group.name, members: groupEmails}, membersNotFound: membersNotFound, alreadyInGroup: alreadyInGroup}, refreshedTokenMessage: res.locals.refreshedTokenMessage});
  }
}

/**
 * Remove members from a group
  - Request Parameters: A string equal to the `name` of the group
    - Example: `api/groups/Family/remove` (user route)
    - Example: `api/groups/Family/pull` (admin route)
  - Request Body Content: An array of strings containing the `emails` of the members to remove from the group
    - Example: `{emails: ["pietro.blue@email.com"]}`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group, this array must include only the remaining members), an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
    - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}, membersNotFound: [], notInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - In case any of the following errors apply then no user is removed from the group
  v- Returns a 400 error if the request body does not contain all the necessary attributes
  v- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
  - Returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database
  v- Returns a 400 error if at least one of the emails is not in a valid email format
  v- Returns a 400 error if at least one of the emails is an empty string
  v- Returns a 400 error if the group contains only one member before deleting any user
  - Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/remove`
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`
 */
export const removeFromGroup = async (req, res) => {
  try {
    
    const groupName = req.params.name; const emailsToRemove = req.body.emails;
    if(!groupName || !emailsToRemove) return res.status(400).json({ error: "Request body does not contain all the necessary attributes" }); 
    
    const group = await Group.findOne({ name: groupName });
    if(!group) return res.status(400).json({ error: "The group does not exist" });

    let groupEmails = group.members.map(member => member.email);
    const groupAuth = verifyAuth(req, res, {authType: "Group", emails: groupEmails});
    if(groupAuth.authorized){
      removeFromGroupMain(res, group, groupEmails, emailsToRemove);
      return res;
    }
      
    else {
      const adminAuth = verifyAuth(req, res, { authType: "Admin" });
      if(adminAuth.authorized)
        removeFromGroupMain(res, group, groupEmails, emailsToRemove);
      else
        return res.status(401).json({ error: adminAuth.cause});
    }
  }
  catch (err) {
    return res.status(500).json({error: err.message})
  }
}

async function removeFromGroupMain(res, group, groupEmails, emails)
{
  let membersToRemove = []; let notInGroup = []; let membersNotFound = [];
  if(group.members.length === 1) return res.status(400).json({ error: "The group contains only one member" });
  
  for(let email of emails) {
    if(!validateEmail(email)) return res.status(400).json({ error: "At least one of the member emails is not in a valid email format" });

    const user = await User.findOne({ email: email });
    if(!user)
      membersNotFound.push(email);
    else if( !groupEmails.includes(email) )
      notInGroup.push(email);
    else
      membersToRemove.push(email);
  }

  if(!membersToRemove.length)
    return res.status(400).json({ error: "All the emails either do not exist or are not in the group" });
  else {
    if(group.members.length === membersToRemove.length) // slack, caso in cui si eliminano tutti gli appartenenti a un gruppo
      membersToRemove = membersToRemove.filter( email => email !== groupEmails[0]);
    await Group.updateOne(
      {name: group.name},
      {$pull:{
        members:{ 
          email: {$in: membersToRemove}
        }
      }}
    );
    groupEmails = groupEmails.filter(email => {
      if(membersToRemove.includes(email)) return false
      else return true
    });
    groupEmails = groupEmails.map(email => { return {email: email} });
    return res.status(200).json({data: {group: {name: group.name, members: groupEmails}, membersNotFound: membersNotFound, notInGroup: notInGroup}, refreshedTokenMessage: res.locals.refreshedTokenMessage});
  }
}

/**
  - Request Parameters: None
  - Request Body Content: A string equal to the `email` of the user to be deleted
    - Example: `{email: "luigi.red@email.com"}`
  - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and an attribute that specifies whether the user was also `deletedFromGroup` or not
    - Example: `res.status(200).json({data: {deletedTransactions: 1, deletedFromGroup: true}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  - If the user is the last user of a group then the group is deleted as well
  - Returns a 400 error if the request body does not contain all the necessary attributes
  - Returns a 400 error if the email passed in the request body is an empty string
  - Returns a 400 error if the email passed in the request body is not in correct email format
  - Returns a 400 error if the email passed in the request body does not represent a user in the database
  - Returns a 400 error if the email passed in the request body represents an admin
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
    export const deleteUser = async (req, res) => {
      try {
        let { email } = req.body;
        const cookies = req.cookies;

        if(email == null)
          return res.status(400).json({error: "email is missing from the parameters"})

        email = email.trim();
        if(email == "")
          return res.status(400).json({error: "email is an empty string"})

        if(!validateEmail(email))
          return res.status(400).json({ error: "Invalid email format" });
          
        /* only admin can call this function */
        const adminAuth = verifyAuth(req, res, { authType: "Admin" });
        if (!adminAuth.authorized) {
          return res.status(401).json({ error: "Unauthorized" });
        }
    
        const user = await User.findOne({ email: email });
        
        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }

        if(user.role === "Admin")
          return res.status(400).json({ error: "Email passed in the request body represents an admin" });
        
        
        // Check the presence in a group
        let boolDeleteFromGroup = false;
        const group = await getGroupByUserEmail(email);
        if(group) {
          //console.log("1group")
          if(group.members.length === 1)  // if user is the last one in the group
            await group.deleteOne();
          else {                          // if the user is not the last one in the group
            await Group.updateOne(
              {name: group.name},
              {$pull:{
                members:{ 
                  email: email
                }
              }}
            );
          }

          boolDeleteFromGroup = true;
        }

        //Delete transactions
        let transactionsNumber = await transactions.deleteMany({ username: user.username });
        
        // Check the result
        const result = await user.deleteOne();
        
        return  res.status(200).json({data: {deletedTransactions: transactionsNumber.deletedCount, deletedFromGroup: boolDeleteFromGroup}, refreshedTokenMessage: res.locals.refreshedTokenMessage});
      } catch (err) {
        res.status(500).json(err.message);
      }
    };
    

/**
 * Delete a group
  - Request Parameters: None
  - Request Body Content: A string equal to the `name` of the group to be deleted
    - Example: `{name: "Family"}`
  - Response `data` Content: A message confirming successful deletion
    - Example: `res.status(200).json({data: {message: "Group deleted successfully"} , refreshedTokenMessage: res.locals.refreshedTokenMessage})`
  v- Returns a 400 error if the request body does not contain all the necessary attributes
  v- Returns a 400 error if the name passed in the request body is an empty string
  v- Returns a 400 error if the name passed in the request body does not represent a group in the database
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const deleteGroup = async (req, res) => {
  try {
    let groupName = req.body.name;
    if(!groupName) return res.status(400).json({ error: "Request body does not contain all the necessary attributes" });

    groupName = groupName.trim();
    if(!groupName) return res.status(400).json({ error: "The group name passed in the request body is an empty string" });

    const group = await Group.findOne({ name: groupName });
    if(!group) return res.status(400).json({ error: "The group does not exist" });

    const adminAuth = verifyAuth(req, res, { authType: "Admin" });
    if(adminAuth.authorized) {
      await group.deleteOne();
      return res.status(200).json({data: {message: "Group deleted successfully"} , refreshedTokenMessage: res.locals.refreshedTokenMessage});
    }
    else
      return res.status(401).json({ error: adminAuth.cause});
  }
  catch (err) {
        res.status(500).json({error: err.message})
  }
}
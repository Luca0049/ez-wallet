import jwt from 'jsonwebtoken'

/**
    - Returns an object with a `date` attribute used for filtering mongoDB's `aggregate` queries
    - The value of `date` is an object that depends on the query parameters:
    - If the query parameters include `from` then it must include a `$gte` attribute that specifies the starting date as a `Date` object in the format **YYYY-MM-DDTHH:mm:ss**
        - Example: `/api/users/Mario/transactions?from=2023-04-30` => `{date: {$gte: 2023-04-30T00:00:00.000Z}}`
    - If the query parameters include `upTo` then it must include a `$lte` attribute that specifies the ending date as a `Date` object in the format **YYYY-MM-DDTHH:mm:ss**
        - Example: `/api/users/Mario/transactions?upTo=2023-05-10` => `{date: {$lte: 2023-05-10T23:59:59.000Z}}`
    - If both `from` and `upTo` are present then both `$gte` and `$lte` must be included
    - If `date` is present then it must include both `$gte` and `$lte` attributes, these two attributes must specify the same date as a `Date` object in the format **YYYY-MM-DDTHH:mm:ss**
        - Example: `/api/users/Mario/transactions?date=2023-05-10` => `{date: {$gte: 2023-05-10T00:00:00.000Z, $lte: 2023-05-10T23:59:59.000Z}}`
    - If there is no query parameter then it returns an empty object
        - Example: `/api/users/Mario/transactions` => `{}`
    - Throws an error if `date` is present in the query parameter together with at least one of `from` or `upTo`
    - Throws an error if the value of any of the three query parameters is not a string that represents a date in the format **YYYY-MM-DD**
    */
export const handleDateFilterParams = (req) => {
    let dateStart = req.query.date;
    let dateEnd = req.query.date;
    let from = req.query.from;
    let upTo = req.query.upTo;
    if((dateStart !== undefined && !validateDate(dateStart)) || (from !== undefined && !validateDate(from)) || (upTo !== undefined && !validateDate(upTo))) {
        throw new Error("Wrong date format");
    }
    
    
    if(dateStart !== undefined && (from !== undefined || upTo !== undefined)) {
        throw new Error("Error in the query parameters");
    }
    if(dateStart !== undefined) {   
        dateStart = new Date(`${dateStart}T00:00:00.000Z`);
        dateEnd = new Date(`${dateEnd}T23:59:59.999Z`);
    }
    if(from !== undefined) { 
        from = new Date(`${from}T00:00:00.000Z`);
    }
    if(upTo !== undefined) { 
        upTo = new Date(`${upTo}T23:59:59.999Z`);
    };
    if(dateStart !== undefined && (from === undefined || upTo === undefined)) {
        return {date: {$gte: dateStart, $lte: dateEnd}};    
    }
    else if(dateStart === undefined && from === undefined && upTo !== undefined) {
        return {date: {$lte: upTo}};    
    }
    else if(dateStart === undefined && from !== undefined && upTo === undefined) {
        return {date: {$gte: from}};    
    }
    else if(dateStart === undefined && from !== undefined && upTo !== undefined) {
        return {date: {$gte: from, $lte: upTo}}; 
    }
    else {
        return {};
    }
    

}

export function validateDate(dateString) {
    let regex = /^\d{4}-\d{2}-\d{2}$/;
  
    if (!regex.test(dateString)) {
      return false; 
    }
  
    let parts = dateString.split("-");
    let year = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let day = parseInt(parts[2]);
  
    /* il controllo sui numeri è gia nella regex
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return false; 
    }*/
  
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false; 
    }
  
    let date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return false; 
    }
  
    return true;
  }
  
  

/**
 * Handle possible authentication modes depending on `authType`
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid
 */
export const verifyAuth = (req, res, info) => {
    const cookie = req.cookies
    if (!cookie.accessToken || !cookie.refreshToken) {
        //console.log("TOKEN ERROR");
        return { authorized: false, cause: "Unauthorized" };
    }

    try {
        const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
        const decodedRefreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY);
        if (!decodedAccessToken.username || !decodedAccessToken.email || !decodedAccessToken.role) {
            return { authorized: false, cause: "Token is missing information" }
        }
        if (!decodedRefreshToken.username || !decodedRefreshToken.email || !decodedRefreshToken.role) {
            return { authorized: false, cause: "Token is missing information" }
        }
        if (decodedAccessToken.username !== decodedRefreshToken.username || decodedAccessToken.email !== decodedRefreshToken.email || decodedAccessToken.role !== decodedRefreshToken.role) {
            return { authorized: false, cause: "Mismatched users" };
        }

        // res.locals.refreshedTokenMessage= "No refreshedTokenMessage";
        return authByRole(info, decodedAccessToken);
   } catch (err) {
        if (err.name === "TokenExpiredError") {
            try {
                const refreshToken = jwt.verify(cookie.refreshToken, process.env.ACCESS_KEY)
                const newAccessToken = jwt.sign({
                    username: refreshToken.username,
                    email: refreshToken.email,
                    id: refreshToken.id,
                    role: refreshToken.role
                }, process.env.ACCESS_KEY, { expiresIn: '1h' })
                res.cookie('accessToken', newAccessToken, { httpOnly: true, path: '/api', maxAge: 60 * 60 * 1000, sameSite: 'none', secure: true })

                res.locals.refreshedTokenMessage= 'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls'
                const decodednewAccessToken = jwt.verify(newAccessToken, process.env.ACCESS_KEY);
                return authByRole(info, decodednewAccessToken);
            } catch (err) {
                if (err.name === "TokenExpiredError") {
                    return { authorized: false, cause: "Perform login again" }
                } else {
                    return { authorized: false, cause: err.name }
                }
            }
        } else {
            return { authorized: false, cause: err.name };
        }
    }
}

function authByRole(info, accessToken)
{
    switch(info.authType){
        case "Simple":
            return { authorized: true, cause: "Authorized" };
        case "User":
            if( (accessToken.role === "Regular" || accessToken.role === "Admin") && accessToken.username === info.username ) return { authorized: true, cause: "Authorized" };
            else return { authorized: false, cause: "Unauthorized: not a User" };
        case "Admin":
            if(accessToken.role === "Admin") return { authorized: true, cause: "Authorized" };
            else return { authorized: false, cause: "Unauthorized: not an Admin" };
        case "Group":
            const existingUserInGroup = info.emails.includes(accessToken.email);
            if(existingUserInGroup) return { authorized: true, cause: "Authorized" };
            else return { authorized: false, cause: "Unauthorized: not inside Group" };
        default:
            return { authorized: false, cause: "Unknown info authType" };
    }
}

export function emailFromToken(req) {
    const cookie = req.cookies;
    const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
    return decodedAccessToken.email;
}

/**
    - Returns an object with an `amount` attribute used for filtering mongoDB's `aggregate` queries
    - The value of `amount` is an object that depends on the query parameters:
    - If the query parameters include `min` then it must include a `$gte` attribute that is an integer equal to `min`
        - Example: `/api/users/Mario/transactions?min=10` => `{amount: {$gte: 10} }
    - If the query parameters include `min` then it must include a `$lte` attribute that is an integer equal to `max`
        - Example: `/api/users/Mario/transactions?min=50` => `{amount: {$lte: 50} }
    - If both `min` and `max` are present then both `$gte` and `$lte` must be included
    - Throws an error if the value of any of the two query parameters is not a numerical value
 */
export const handleAmountFilterParams = (req) => {
    let min = req.query.min;
    let max = req.query.max;
if((min !== undefined && isNaN(parseFloat(min))) || (max !== undefined && isNaN(parseFloat(max)))) {
        throw new Error("Non numerical values");
    }
    if(min !== undefined){
        min = parseFloat(min);  //fatto
    }
    if(max !== undefined){
        max = parseFloat(max);  //fatto
    }
    if(min === undefined && max !== undefined) {
        return {amount: {$lte: max}};
    }
    else if(max === undefined && min !== undefined) {
        return {amount: {$gte: min}};
    }
    else if(min !== undefined && max != undefined) {
        return {amount: {$gte: min, $lte: max}};    //arrivo qui
    }
    else {
        return {};
    }
}

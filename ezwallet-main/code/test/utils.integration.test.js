import request from 'supertest';
import { app } from '../app';
import { categories } from '../models/model';
import { transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
//import "jest-extended"
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams, handleAmountFilterParams, validateDate } from '../controllers/utils';

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

//necessary setup to ensure that each test can insert the data it needs
beforeEach(async () => {
    await categories.deleteMany({})
    await transactions.deleteMany({})
    await User.deleteMany({})
    await Group.deleteMany({})
})

/**
 * Alternate way to create the necessary tokens for authentication without using the website
 */
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

describe("utils.js", () => {
    describe("verifyAuth", () => {

        test('should return unauthorized object when accessToken is missing', () => {
            const req = {
              cookies: {
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
          
            const result = verifyAuth(req);
          
            expect(result).toEqual({ authorized: false, cause: 'Unauthorized' });
        });

        test('should return unauthorized object when refreshToken is missing', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
          
            const result = verifyAuth(req);
          
            expect(result).toEqual({ authorized: false, cause: 'Unauthorized' });
        });

        test('should return unauthorized object when accessToken is missing information', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: '', email: 'tester1@example.com', role: 'user' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester1', email: 'tester1@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
          
            const result = verifyAuth(req);
          
            expect(result).toEqual({ authorized: false, cause: 'Token is missing information' });
        });

        test('should return unauthorized object when refreshToken is missing information', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester1', email: 'tester1@example.com', role: 'user' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: '', email: 'tester1@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
          
            const result = verifyAuth(req);
          
            expect(result).toEqual({ authorized: false, cause: 'Token is missing information' });
          });

        test('should return unauthorized object when tokens have mismatched users', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester1', email: 'tester1@example.com', role: 'user' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester2', email: 'tester2@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
          
            const result = verifyAuth(req);
          
            expect(result).toEqual({ authorized: false, cause: 'Mismatched users' });
        });

        test('should return authorized if the authType is Simple', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Simple"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: true, cause: 'Authorized' });
        });

        test('should return Unauthorized if the authType is User and the are mismatched username', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'Regular' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'Regular' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "User",
                username: "notTester"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: false, cause: 'Unauthorized: not a User' });
        });

        test('should return authorized if the authType is User and the token is correct', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'Regular' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'Regular' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "User",
                username: "tester"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: true, cause: 'Authorized' });
        });

        test('should return Unauthorized if the authType is Admin and the role is Regular', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Regular' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Regular' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Admin",
                username: "admin"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: false, cause: 'Unauthorized: not an Admin' });
        });

        test('should return authorized if the authType is Admin and the token is correct', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Admin",
                username: "admin"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: true, cause: 'Authorized' });
        });

        test('should return Unauthorized if the authType is Group and the access token doesnt belong to the info email', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Group",
                username: "admin",
                emails: ["tester1@example.com","tester2@example.com"]
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: false, cause: 'Unauthorized: not inside Group' });
        });

        test('should return authorized if the authType is Group and the token is correct', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Group",
                username: "admin",
                emails: ["tester1@example.com","admin@example.com"]
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: true, cause: 'Authorized' });
        });

        test('should return Unauthorized if the authType is unknown', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };

            const info = {
                authType: "Unknown",
                username: "admin",
                emails: ["tester1@example.com","admin@example.com"]
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: false, cause: 'Unknown info authType' });
        });

        test('if a token expires, try to regenerate a new token and if the refresh token is also expires retun Unauthorized', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '0s' }),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '0s' })
              }
            };
            const res = {
                locals: {
                    refreshedTokenMessage: ""
                }
            };
            const info = {
                authType: "Simple"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: false, cause: 'Perform login again' });
        }); 

        test('if a token expires, regenerate a new token from the refresh token and continue the check', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '0s' }),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '1y' })
              }
            };
            const res = {
                locals: {
                  refreshedTokenMessage: ""
                },
                cookie: jest.fn()
            };
            
            const info = {
                authType: "Simple"
            }
          
            const result = verifyAuth(req, res, info);
          
            expect(result).toEqual({ authorized: true, cause: 'Authorized' });
        });

        test('if a generic error raises while regerating the refresh token, return that error', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '0s' }),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY, { expiresIn: '1y' })
              }
            };
            const res = {
                locals: {
                  refreshedTokenMessage: ""
                },
                cookie: jest.fn()
            };
            
          
            const result = verifyAuth(req, res);
          
            expect(result).toEqual({ authorized: false, cause: 'TypeError' });
        });

        test('if a generic error is raised, return that error', () => {
            const req = {
              cookies: {
                accessToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY),
                refreshToken: jwt.sign({ username: 'tester', email: 'tester@example.com', role: 'user' }, process.env.ACCESS_KEY)
              }
            };
            const res = {
                locals: {
                  refreshedTokenMessage: ""
                },
                cookie: jest.fn()
            };
          
            const result = verifyAuth(req, res);
          
            // metto typerror ma in realta è generico
            expect(result).toEqual({ authorized: false, cause: "TypeError" });
        });
        
        
    })

    describe("handleDateFilterParams", () => { 
        test('should throw an error for wrong date format', () => {
            const req = {
              query: {
                date: 'invalid-date-format'
              }
            };
          
            expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Wrong date format');
          });

          test('should throw an error for error in query parameters', () => {
            const req = {
              query: {
                date: '2023-06-08',
                //fromTo: missing
                upTo: '2011-01-01'
              }
            };
          
            expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');
          });

          test('Case in which from and upTo are undefined', () => {
            const req = {
              query: {
                date: '2023-06-08',
                from: undefined,
                upTo: undefined
              }
            };
            let dateStart = '2023-06-08';
            let dateEnd = '2023-06-08';
            let dateStartToRet = new Date(`${dateStart}T00:00:00.000Z`);
            let dateEndToRet = new Date(`${dateEnd}T23:59:59.999Z`); 
            let result = handleDateFilterParams(req);
            expect(result).toEqual({
                date: {
                  $gte: dateStartToRet,
                  $lte: dateEndToRet
                }
              });
          
            /*expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');*/
          });

          test('Case in which date is undefined from and upTo are both not undefined ', () => {
            const req = {
              query: {
                date: undefined,
                from: '2022-01-01',
                upTo: '2011-01-01'
              }
            };
            const upTo = '2011-01-01';
            const from = '2022-01-01';
            const upToRet = new Date(`${upTo}T23:59:59.999Z`);
            const fromToRet = new Date(`${from}T00:00:00.000Z`);
             
            let result = handleDateFilterParams(req);
            expect(result).toEqual({
                date: {
                  $gte: fromToRet,
                  $lte: upToRet
                }
              });
          
            /*expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');*/
          });
          
          test('Case in which date and from are undefined but upTo is defined ', () => {
            const req = {
              query: {
                date: undefined,
                from: undefined,
                upTo: '2011-01-01'
              }
            };
            const upTo = '2011-01-01';
            const upToRet = new Date(`${upTo}T23:59:59.999Z`);
             
            let result = handleDateFilterParams(req);
            expect(result).toEqual({
                date: {
                  $lte: upToRet
                }
              });
          
            /*expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');*/
          });

          test('Case in which date and upTo are undefined but from is defined ', () => {
            const req = {
              query: {
                date: undefined,
                from: '2022-01-01',
                upTo: undefined
              }
            };
            const from = '2022-01-01';
            const fromToRet = new Date(`${from}T00:00:00.000Z`);
             
            let result = handleDateFilterParams(req);
            expect(result).toEqual({
                date: {
                  $gte: fromToRet,
                 
                }
              });
          
            /*expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');*/
          });

          test('Case in which all params are undefined', () => {
            const req = {
              query: {
                date: undefined,
                from: undefined,
                upTo: undefined
              }
            };
            let dateStart = '2023-06-08';
            let dateEnd = '2023-06-08';
            let dateStartToRet = new Date(`${dateStart}T00:00:00.000Z`);
            let dateEndToRet = new Date(`${dateEnd}T23:59:59.999Z`); 
            let result = handleDateFilterParams(req);
            expect(result).toEqual({ });

            /*expect(() => {
              handleDateFilterParams(req);
            }).toThrow('Error in the query parameters');*/
          });
    })

    describe("handleAmountFilterParams", () => { 
        test('should throw an error for Non numerical values', () => {
            const req = {
              query: {
                min: 'invalid-min-format',
                max: 'invalid-max-format'
              }
            };
          
            expect(() => {
              handleAmountFilterParams(req);
            }).toThrow('Non numerical values');
        });

        test('Case in which both min and max are defined', () => {
            const req = {
              query: {
                min: 3.4,
                max: 10.3
              }
            };
            const minToRet = parseFloat(3.4);
            const maxToRet = parseFloat(10.3);
            let result = handleAmountFilterParams(req);
            expect(result).toEqual({
                amount: {
                    $gte: minToRet,
                    $lte: maxToRet
                }
                
            });
        });

        test('Case in which max is defined and min is undefined', () => {
            const req = {
              query: {
                min: undefined,
                max: 10.3
              }
            };
            const maxToRet = parseFloat(10.3);
            let result = handleAmountFilterParams(req);
            expect(result).toEqual({
                amount: {
                    $lte: maxToRet
                }
                
            });
        });

        test('Case in which min is defined and max is undefined', () => {
            const req = {
              query: {
                min: 3.4,
                max: undefined
              }
            };
            const minToRet = parseFloat(3.4);
            let result = handleAmountFilterParams(req);
            expect(result).toEqual({
                amount: {
                    $gte: minToRet
                }
                
            });
        });

        test('Case in which both min and max are defined', () => {
          const req = {
            query: {
              min: undefined,
              max: undefined
            }
          };
          
          let result = handleAmountFilterParams(req);
          expect(result).toEqual({  });
      });
    })

    describe("validateDate", () => {
      test('should return true for valid date string', () => {
        const validDateString = '2023-06-08';
      
        const result = validateDate(validDateString);
      
        expect(result).toBe(true);
      });

      test('should return false for non valid date string', () => {
        const validDateString = '20230608';
      
        const result = validateDate(validDateString);
      
        expect(result).toBe(false);
      });

      test('should return false for non valid date with an non-existing day', () => {
        const validDateString = '2023-40-99';
      
        const result = validateDate(validDateString);
      
        expect(result).toBe(false);
      });
    })
})

// i test della validateDate sono fuori dal describe perchè è una funzione








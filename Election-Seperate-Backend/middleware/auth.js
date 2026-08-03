const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const electionUser = require("../models/election-user");

// Requires a valid JWT (issued by /login -> /verify) on every request.
// Accepts the token from the Authorization header ("Bearer <token>") or
// the "token" cookie set at verification time.
const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
  const token = bearerToken || req.cookies?.token;

  if (!token) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await electionUser.findById(decoded.id);

  if (!user) {
    return next(new ErrorHander("Please login to access this resource", 401));
  }

  req.user = user;
  next();
});

// Role check based on the authenticated user attached by isAuthenticatedUser
// (as opposed to authorizeRolesElection below, which trusts req.query.mobile
// and so must not be used on its own).
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorHander(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403,
        ),
      );
    }
    next();
  };
};
exports.isAuthenticatedUser = isAuthenticatedUser;
exports.authorizeRoles = authorizeRoles;

const authorizeRolesElection = (...allowedRoles) => {
  return async (req, res, next) => {
    const { mobile } = req.query;
    try {

      console.log("userr", mobile);
      const user = await electionUser.findOne({ mobile: parseInt(mobile) });

      if (!user) {
        throw new ErrorHander('User not found', 404);
      }

      // Check if the user's role is allowed for the route
      console.log("user role", user.role);
      if (!allowedRoles.includes(user.role)) {
        throw new ErrorHander(`Role: ${user.role} is not allowed to access this resource`, 403);
      }

      // Attach the user to the request object for further use if needed
      req.user = user;

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      next(error); // Pass any errors to the global error handler
    }
  };
};
exports.authorizeRolesElection = authorizeRolesElection;

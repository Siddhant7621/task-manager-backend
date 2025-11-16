"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
const requireAuth = (req, res, next) => {
    try {
        const header = req.headers["authorization"];
        if (!header)
            return res.status(401).json({ message: "No token" });
        const parts = header.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer")
            return res.status(401).json({ message: "Invalid token format" });
        const token = parts[1];
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = { userId: payload.userId };
        return next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.requireAuth = requireAuth;

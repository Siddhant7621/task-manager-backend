"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../prisma"));
const jwt_1 = require("../utils/jwt");
const express_validator_1 = require("express-validator");
const crypto_1 = __importDefault(require("crypto"));
const SALT_ROUNDS = 10;
const register = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const { email, password, name } = req.body;
    try {
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ message: "User already exists" });
        const hashed = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await prisma_1.default.user.create({
            data: { email, password: hashed, name }
        });
        const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id });
        const refreshToken = (0, jwt_1.signRefreshToken)({ userId: user.id });
        // store hashed refresh token
        const tokenHash = crypto_1.default.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
        await prisma_1.default.refreshToken.create({
            data: { tokenHash, userId: user.id, expiresAt }
        });
        // set httpOnly cookie
        res.cookie("jid", refreshToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d")
        });
        return res.status(201).json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    try {
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(400).json({ message: "Invalid credentials" });
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match)
            return res.status(400).json({ message: "Invalid credentials" });
        const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id });
        const refreshToken = (0, jwt_1.signRefreshToken)({ userId: user.id });
        const tokenHash = crypto_1.default.createHash("sha256").update(refreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
        await prisma_1.default.refreshToken.create({ data: { tokenHash, userId: user.id, expiresAt } });
        res.cookie("jid", refreshToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d")
        });
        return res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const token = req.cookies?.jid ?? req.body.refreshToken;
        if (!token)
            return res.status(401).json({ message: "No refresh token" });
        // verify jwt
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        const userId = payload.userId;
        // check stored token
        const cryptoHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const stored = await prisma_1.default.refreshToken.findFirst({
            where: { tokenHash: cryptoHash, userId, expiresAt: { gte: new Date() } }
        });
        if (!stored)
            return res.status(401).json({ message: "Invalid refresh token" });
        // issue new tokens
        const accessToken = (0, jwt_1.signAccessToken)({ userId });
        const newRefreshToken = (0, jwt_1.signRefreshToken)({ userId });
        // replace stored token (simple approach: delete old create new)
        await prisma_1.default.refreshToken.deleteMany({ where: { tokenHash: cryptoHash, userId } });
        const newHash = crypto_1.default.createHash("sha256").update(newRefreshToken).digest("hex");
        const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
        await prisma_1.default.refreshToken.create({ data: { tokenHash: newHash, userId, expiresAt } });
        res.cookie("jid", newRefreshToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d")
        });
        return res.json({ accessToken });
    }
    catch (err) {
        console.error(err);
        return res.status(401).json({ message: "Invalid refresh token" });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const token = req.cookies?.jid ?? req.body.refreshToken;
        if (token) {
            const cryptoHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
            await prisma_1.default.refreshToken.deleteMany({ where: { tokenHash: cryptoHash } });
        }
        res.clearCookie("jid");
        return res.json({ message: "Logged out" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.logout = logout;
// helpers
function parseExpiry(exp) {
    // support formats like "7d", "15m" etc.
    const num = parseInt(exp.slice(0, -1), 10);
    const unit = exp.slice(-1);
    switch (unit) {
        case "d":
            return num * 24 * 60 * 60 * 1000;
        case "h":
            return num * 60 * 60 * 1000;
        case "m":
            return num * 60 * 1000;
        default:
            return 7 * 24 * 60 * 60 * 1000;
    }
}
function parseCookieMaxAge(exp) {
    return parseExpiry(exp);
}

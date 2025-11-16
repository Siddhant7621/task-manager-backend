import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { validationResult } from "express-validator";
import crypto from "crypto";

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, password: hashed, name }
    });

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    // store hashed refresh token
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));

    await prisma.refreshToken.create({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));

    await prisma.refreshToken.create({ data: { tokenHash, userId: user.id, expiresAt } });

    res.cookie("jid", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d")
    });

    return res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.jid ?? req.body.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    // verify jwt
    const payload: any = verifyRefreshToken(token) as any;
    const userId = payload.userId as string;

    // check stored token
    const cryptoHash = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash: cryptoHash, userId, expiresAt: { gte: new Date() } }
    });

    if (!stored) return res.status(401).json({ message: "Invalid refresh token" });

    // issue new tokens
    const accessToken = signAccessToken({ userId });
    const newRefreshToken = signRefreshToken({ userId });

    // replace stored token (simple approach: delete old create new)
    await prisma.refreshToken.deleteMany({ where: { tokenHash: cryptoHash, userId } });

    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + parseExpiry(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"));
    await prisma.refreshToken.create({ data: { tokenHash: newHash, userId, expiresAt } });

    res.cookie("jid", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: parseCookieMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d")
    });

    return res.json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.jid ?? req.body.refreshToken;
    if (token) {
      const cryptoHash = crypto.createHash("sha256").update(token).digest("hex");
      await prisma.refreshToken.deleteMany({ where: { tokenHash: cryptoHash } });
    }
    res.clearCookie("jid");
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// helpers
function parseExpiry(exp: string) {
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
function parseCookieMaxAge(exp: string) {
  return parseExpiry(exp);
}

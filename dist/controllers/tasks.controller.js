"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskStats = exports.toggleTask = exports.deleteTask = exports.updateTask = exports.getTask = exports.getTasks = exports.createTask = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const express_validator_1 = require("express-validator");
const createTask = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const { title, description, dueDate } = req.body;
    const userId = req.user.userId;
    try {
        const task = await prisma_1.default.task.create({
            data: { title, description, dueDate: dueDate ? new Date(dueDate) : undefined, userId }
        });
        return res.status(201).json(task);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    const userId = req.user.userId;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10)));
    const page = Math.max(1, Number(req.query.page ?? 1));
    const status = req.query.status;
    const search = req.query.search;
    try {
        const where = { userId };
        if (status)
            where.status = status;
        if (search)
            where.title = { contains: search, mode: "insensitive" };
        const [total, tasks, stats] = await Promise.all([
            prisma_1.default.task.count({ where }),
            prisma_1.default.task.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma_1.default.task.groupBy({
                by: ["status"],
                _count: { status: true },
                where: { userId }, // count all tasks of user, NOT paginated
            })
        ]);
        // Convert groupBy result into usable structure
        const statusCount = {
            COMPLETED: 0,
            IN_PROGRESS: 0,
            OPEN: 0,
        };
        stats.forEach((s) => {
            statusCount[s.status] = s._count.status;
        });
        return res.json({
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                // 👇 Stats here!
                stats: {
                    total,
                    completed: statusCount.COMPLETED,
                    inProgress: statusCount.IN_PROGRESS,
                    open: statusCount.OPEN,
                }
            },
            data: tasks
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getTasks = getTasks;
const getTask = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const task = await prisma_1.default.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId)
            return res.status(404).json({ message: "Not found" });
        return res.json(task);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getTask = getTask;
const updateTask = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    try {
        const existing = await prisma_1.default.task.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId)
            return res.status(404).json({ message: "Not found" });
        const updated = await prisma_1.default.task.update({
            where: { id },
            data: { title, description, status, dueDate: dueDate ? new Date(dueDate) : undefined }
        });
        return res.json(updated);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const existing = await prisma_1.default.task.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId)
            return res.status(404).json({ message: "Not found" });
        await prisma_1.default.task.delete({ where: { id } });
        return res.json({ message: "Deleted" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.deleteTask = deleteTask;
const toggleTask = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    try {
        const task = await prisma_1.default.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId)
            return res.status(404).json({ message: "Not found" });
        const newStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
        const updated = await prisma_1.default.task.update({ where: { id }, data: { status: newStatus } });
        return res.json(updated);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.toggleTask = toggleTask;
// GET /tasks/stats
const getTaskStats = async (req, res) => {
    const userId = req.user.userId;
    try {
        const total = await prisma_1.default.task.count({
            where: { userId }
        });
        const completed = await prisma_1.default.task.count({
            where: { userId, status: "COMPLETED" }
        });
        const inProgress = await prisma_1.default.task.count({
            where: { userId, status: "IN_PROGRESS" }
        });
        const open = await prisma_1.default.task.count({
            where: { userId, status: "OPEN" }
        });
        return res.status(200).json({
            total,
            completed,
            inProgress,
            open,
        });
    }
    catch (error) {
        console.error("Task stats error:", error);
        return res.status(500).json({ message: "Failed to fetch stats" });
    }
};
exports.getTaskStats = getTaskStats;

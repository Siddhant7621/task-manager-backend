import { Request, Response } from "express";
import prisma from "../prisma";
import { validationResult } from "express-validator";

export const createTask = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, dueDate } = req.body;
  const userId = (req as any).user.userId;
  try {
    const task = await prisma.task.create({
      data: { title, description, dueDate: dueDate ? new Date(dueDate) : undefined, userId }
    });
    return res.status(201).json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 10)));
  const page = Math.max(1, Number(req.query.page ?? 1));
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  try {
    const where: any = { userId };
    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [total, tasks, stats] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.task.groupBy({
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

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getTask = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) return res.status(404).json({ message: "Not found" });
    return res.json(task);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = (req as any).user.userId;
  const { id } = req.params;
  const { title, description, status, dueDate } = req.body;
  try {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    const updated = await prisma.task.update({
      where: { id },
      data: { title, description, status, dueDate: dueDate ? new Date(dueDate) : undefined }
    });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  try {
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    await prisma.task.delete({ where: { id } });
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const toggleTask = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) return res.status(404).json({ message: "Not found" });

    const newStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    const updated = await prisma.task.update({ where: { id }, data: { status: newStatus } });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /tasks/stats
export const getTaskStats = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    const total = await prisma.task.count({
      where: { userId }
    });

    const completed = await prisma.task.count({
      where: { userId, status: "COMPLETED" }
    });

    const inProgress = await prisma.task.count({
      where: { userId, status: "IN_PROGRESS" }
    });

    const open = await prisma.task.count({
      where: { userId, status: "OPEN" }
    });

    return res.status(200).json({
      total,
      completed,
      inProgress,
      open,
    });

  } catch (error: any) {
    console.error("Task stats error:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};


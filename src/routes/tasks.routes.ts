import express from "express";
import { body, param } from "express-validator";
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  toggleTask,
  getTaskStats
} from "../controllers/tasks.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

router.use(requireAuth);

router.get("/", getTasks);

router.post(
  "/",
  [body("title").isString().isLength({ min: 1 })],
  createTask
);

router.get("/:id", [param("id").isUUID()], getTask);

router.patch(
  "/:id",
  [
    param("id").isUUID(),
    body("title").optional().isString(),
    body("description").optional().isString(),
    body("status").optional().isIn(["OPEN", "IN_PROGRESS", "COMPLETED"]),
    body("dueDate").optional().isISO8601()
  ],
  updateTask
);

router.delete("/:id", [param("id").isUUID()], deleteTask);

router.post("/:id/toggle", [param("id").isUUID()], toggleTask);

router.get("/stats", getTaskStats);

export default router;

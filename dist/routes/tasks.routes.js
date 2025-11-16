"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const tasks_controller_1 = require("../controllers/tasks.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.requireAuth);
router.get("/", tasks_controller_1.getTasks);
router.post("/", [(0, express_validator_1.body)("title").isString().isLength({ min: 1 })], tasks_controller_1.createTask);
router.get("/:id", [(0, express_validator_1.param)("id").isUUID()], tasks_controller_1.getTask);
router.patch("/:id", [
    (0, express_validator_1.param)("id").isUUID(),
    (0, express_validator_1.body)("title").optional().isString(),
    (0, express_validator_1.body)("description").optional().isString(),
    (0, express_validator_1.body)("status").optional().isIn(["OPEN", "IN_PROGRESS", "COMPLETED"]),
    (0, express_validator_1.body)("dueDate").optional().isISO8601()
], tasks_controller_1.updateTask);
router.delete("/:id", [(0, express_validator_1.param)("id").isUUID()], tasks_controller_1.deleteTask);
router.post("/:id/toggle", [(0, express_validator_1.param)("id").isUUID()], tasks_controller_1.toggleTask);
router.get("/stats", tasks_controller_1.getTaskStats);
exports.default = router;

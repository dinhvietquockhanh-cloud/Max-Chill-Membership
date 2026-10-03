import { Router, type IRouter } from "express";
import dashboardRouter from "./dashboard";
import healthRouter from "./health";
import membersRouter from "./members";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(dashboardRouter);

export default router;

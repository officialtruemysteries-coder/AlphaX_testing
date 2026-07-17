import { Router, type IRouter } from "express";
import healthRouter from "./health";
import onlineRouter from "./online";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onlineRouter);

export default router;

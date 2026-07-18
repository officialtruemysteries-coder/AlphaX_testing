import { Router, type IRouter } from "express";
import healthRouter   from "./health";
import onlineRouter   from "./online";
import playersRouter  from "./players";
import usernamesRouter from "./usernames";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onlineRouter);
router.use(playersRouter);
router.use(usernamesRouter);

export default router;

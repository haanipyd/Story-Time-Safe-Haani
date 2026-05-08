import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storiesRouter from "./stories";
import adminRouter from "./admin";
import authRouter from "./auth";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storiesRouter);
router.use(adminRouter);
router.use(authRouter);
router.use(subscriptionsRouter);

export default router;

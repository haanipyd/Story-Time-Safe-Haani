import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storiesRouter from "./stories";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storiesRouter);
router.use(adminRouter);

export default router;

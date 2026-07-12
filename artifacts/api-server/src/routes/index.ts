import { Router, type IRouter } from "express";
import healthRouter from "./health";
import privacyRouter from "./privacy";
import deleteAccountRouter from "./delete-account";
import storiesRouter from "./stories";
import adminRouter from "./admin";
import authRouter from "./auth";
import subscriptionsRouter from "./subscriptions";
import childrenRouter from "./children";
import listeningRouter from "./listening";
import dashboardRouter from "./dashboard";
import pushRouter from "./push";
import webhooksRouter from "./webhooks";
import usersRouter from "./users";
import flashcardsRouter from "./flashcards";
import interactiveStoriesRouter from "./interactive-stories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(privacyRouter);
router.use(deleteAccountRouter);
router.use(authRouter);
router.use(storiesRouter);
router.use(flashcardsRouter);
router.use(interactiveStoriesRouter);
router.use(childrenRouter);
router.use(listeningRouter);
router.use(dashboardRouter);
router.use(pushRouter);
router.use(webhooksRouter);
router.use(subscriptionsRouter);
router.use(usersRouter);
router.use(adminRouter);

export default router;

import { Router } from "express";
import { signupHandler, signinHandler, signoutHandler } from "../../controllers/auth.controller";

const router = Router();

router.post('/signup', signupHandler);
router.post('/signin', signinHandler);
router.post('/signout', signoutHandler);

export default router;
import "express";
import { SecurityContext } from "../auth/authRequest.interface";
import { ExpressUser } from "./user";

declare module "express" {
    interface Request {
      user?: ExpressUser
      securityContext?: SecurityContext 
    }  
}
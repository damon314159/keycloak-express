import SessionData from "express-session";

declare module "express-session" {
  interface SessionData {
    passport?: {
      user: {
        roles: string[];
      };
    };
  }
}

export { SessionData };

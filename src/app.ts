import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createError, { HttpError } from "http-errors";
import express, { Application, NextFunction, Request, Response } from "express";
import expressSession from "express-session";
import createMemoryStore from "memorystore";
import cookieParser from "cookie-parser";
import logger from "morgan";
import passport from "passport";
import { Issuer, Strategy, TokenSet, UserinfoResponse } from "openid-client";
import nunjucks from "nunjucks";

import routes from "./routes/routes.js";

const app: Application = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// view engine setup
app.set("view engine", "njk");
app.set("views", resolve(__dirname, "./views"));
nunjucks.configure(app.get("views"), {
  autoescape: true,
  express: app,
});

// Keycloak
const keycloakIssuer = await Issuer.discover(process.env.KC_URI ?? ".env-null");

const client = new keycloakIssuer.Client({
  client_id: process.env.KC_REALM ?? ".env-null",
  client_secret: process.env.KC_SECRET,
  redirect_uris: [process.env.REDIRECT_URI ?? ".env-null"],
  post_logout_redirect_uris: [process.env.LOGOUT_REDIRECT_URI ?? ".env-null"],
  response_types: ["code"],
});

if (process.env.NODE_ENV === "development") {
  app.use(logger("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(resolve(__dirname, "./public")));

// Express sessions
const MemoryStore = createMemoryStore(expressSession);
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET ?? ".env-null",
    resave: false,
    saveUninitialized: true,
    // Expire every 24hrs
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// This creates the strategy
passport.use(
  "oidc",
  new Strategy(
    { client },
    (
      tokenSet: TokenSet,
      userinfo: UserinfoResponse<{
        resource_access?: {
          [s: string]: { roles: string[] };
        };
      }>,
      done: (err: any, user?: Express.User) => void
    ) => {
      return done(null, {
        roles:
          userinfo.resource_access?.[process.env.KC_REALM ?? ".env-null"]
            ?.roles,
        ...tokenSet.claims(),
      });
    }
  )
);

passport.serializeUser(
  (user: Express.User, done: (err: any, user?: Express.User) => void) => {
    done(null, user);
  }
);

passport.deserializeUser(
  (user: Express.User, done: (err: any, user?: Express.User) => void) => {
    done(null, user);
  }
);

// Callback - routes to protected
app.get("/auth/callback", (req, res, next) => {
  passport.authenticate("oidc", {
    successRedirect: "/",
    failureRedirect: "/failure",
  })(req, res, next);
});

// Middleware to check whether user is authenticated
const checkAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/callback");
};

// start logout request
app.get("/logout", (req, res) => {
  res.redirect(client.endSessionUrl());
});

// logout callback
app.get("/logout/callback", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Routes
app.use("/", routes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;

import createError from "http-errors";
import express from "express";
import nunjucks from "nunjucks";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import sassMiddleware from "node-sass-middleware";
import expressSession from "express-session";
import { Issuer, Strategy } from "openid-client";
import passport from "passport";

import routes from "./routes/routes.js";

const app = express();

// view engine setup
app.set("views", `${process.cwd()}/views`);
app.set("view engine", "njk");
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

// Keycloak
const keycloakIssuer = await Issuer.discover(
  "http://localhost:8080/realms/keycloak-express"
);

const client = new keycloakIssuer.Client({
  client_id: "keycloak-express",
  client_secret: process.env.kc_secret,
  redirect_uris: ["http://localhost:3000/auth/callback"],
  post_logout_redirect_uris: ["http://localhost:3000/logout/callback"],
  response_types: ["code"],
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  sassMiddleware({
    src: `${process.cwd()}/public`,
    dest: `${process.cwd()}/public`,
    indentedSyntax: false, // true = .sass and false = .scss
    sourceMap: true,
  })
);
app.use(express.static(`${process.cwd()}/public`));

// Express sessions
app.use(
  expressSession({
    secret: process.env.session_secret,
    resave: false,
    saveUninitialized: true,
    store: new expressSession.MemoryStore(),
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// This creates the strategy
passport.use(
  "oidc",
  new Strategy({ client }, (tokenSet, userinfo, done) => {
    return done(null, tokenSet.claims());
  })
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Callback - routes to protected
app.get("/auth/callback", (req, res, next) => {
  passport.authenticate("oidc", {
    successRedirect: "/",
    failureRedirect: "/failure",
  })(req, res, next);
});

// Middleware to check whether user is authenticated
const checkAuthenticated = (req, res, next) => {
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
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;

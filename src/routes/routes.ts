import express from "express";

const router = express.Router();

/* GET home page. */
router.get("/", (req, res, next) => {
  res.render("index", { title: "KC-EXP" });
});

router.get("/service1", (req, res, next) => {
  const userRoles = req.session.passport?.user?.roles;
  res.render("service1", {
    title: "ServiceName",
    isAuthed: req.isAuthenticated(),
    isLowAccess: userRoles && userRoles.includes("low-access"),
    isHighAccess: userRoles && userRoles.includes("high-access"),
  });
});

export default router;

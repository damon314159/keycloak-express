import express from "express";
const router = express.Router();

/* GET home page. */
router.get("/", (req, res, next) => {
  res.render("index", { title: "Express" });
});

router.get("/service1", (req, res, next) => {
  res.render("service1", {
    title: "ServiceName",
    isAuthed: req.isAuthenticated(),
  });
});

export default router;

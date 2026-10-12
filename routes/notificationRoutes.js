const express = require("express");
const Notification = require("../models/Notification");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();
const allowedRoles = ["admin", "student", "college", "collegeAdmin", "faculty", "company", "companyGuide"];
router.use(protect, authorize(...allowedRoles));

router.get("/", async (req, res) => {
  try {
    const filter = { recipientId: req.user.id, recipientRole: req.user.role };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ ...filter, read: false }),
    ]);
    res.json({ status: "success", notifications, unreadCount });
  } catch (error) { res.status(500).json({ status: "error", message: "Failed to load notifications" }); }
});

router.put("/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user.id, recipientRole: req.user.role, read: false }, { $set: { read: true } });
    res.json({ status: "success", message: "Notifications marked as read" });
  } catch (error) { res.status(500).json({ status: "error", message: "Failed to update notifications" }); }
});

router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id, recipientRole: req.user.role }, { $set: { read: true } }, { new: true }
    );
    if (!notification) return res.status(404).json({ status: "error", message: "Notification not found" });
    res.json({ status: "success", notification });
  } catch (error) { res.status(500).json({ status: "error", message: "Failed to update notification" }); }
});
module.exports = router;

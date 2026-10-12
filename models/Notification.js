const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  recipientRole: { type: String, required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  relatedEntityId: { type: String, default: null },
  target: { type: String, default: "overview" },
  read: { type: Boolean, default: false },
  eventKey: { type: String, required: true },
}, { timestamps: true });

notificationSchema.index({ recipientRole: 1, recipientId: 1, eventKey: 1 }, { unique: true });
module.exports = mongoose.model("Notification", notificationSchema);

const mongoose = require('mongoose');

const aiStatusSchema = new mongoose.Schema({
  camera_id: {
    type: String,
    required: true,
  },
  blur: {
    type: Boolean,
    default: false,
  },
  blackview: {
    type: Boolean,
    default: false,
  },
  brightness: {
    type: Boolean,
    default: false,
  },
  camera_angle: {
    type: Number,
    default: 0,
  },
  BlackAndWhite: {
    type: Boolean,
    default: false,
  },
  overall_status: {
    type: String,
    default: "OK",
  },
  bit_rate_bps: {
    type: Number,
    default: 0,
  },
  video_format: {
    type: String,
    default: "h264",
  },
  audio_format: {
    type: String,
    default: "aac",
  },
  fps: {
    type: Number,
    default: 0,
  },
  stream_details_status: {
    type: String,
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// The AI analysis service (installerapp :8446 /analyze-camera) writes its
// results to the `aistatus` collection of its own database, not the app's
// DB_URI database. AI_STATUS_DB_NAME names that database (same cluster).
// Without it, the app's own database is used, as before.
let model = null;
function getAiStatusModel() {
  if (model) return model;
  const dbName = process.env.AI_STATUS_DB_NAME;
  const conn = dbName
    ? mongoose.connection.useDb(dbName, { useCache: true })
    : mongoose.connection;
  model = conn.model('AiStatus', aiStatusSchema, 'aistatus');
  return model;
}

module.exports = { getAiStatusModel };

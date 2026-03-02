const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
   deviceId: {
    type: String,
    required: true,
   },
   assignedDid: {
      type: String,
   },
   assignedBy: {
      type: String
   },
   personName:{
    type: String,
   },
   personMobile:{
    type: Number,
    maxlength: 10,
    required: true,
   },
   location: {
    type: String,
   },
   // realLocation:{
   //    type: String
   // },
   latitude:{
      type: String
   },
   longitude: {
      type: String
   },
   assemblyName: {
      type: String
   },
   psNo: {
      type: mongoose.Schema.Types.Mixed
   },
   district: {
      type: String
   },
   state: {
      type: String
   },
   installed_status: {
    type: Number
   },
   live: {
      type: Number
   },
   flvUrl: {
      type: String,
   },
   lastSeen: {
      type: String,
   },
   status: {
      type: String,
   },
   remarks: {
    type: String,
   },
   date: {
    type: String
   },
   time: {
      type: String
   },
    isEdited: { 
        type: Number,
        default: 0 
    }
});

const EleCamera = mongoose.model('election-camera', cameraSchema);

module.exports = EleCamera;  

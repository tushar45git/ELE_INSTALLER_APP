const express = require('express');
const adiancerouter = express.Router();
const {isAuthenticatedUser, authorizeRoles, authorizeRolesElection} = require('../middleware/auth');
const multer = require('multer');

// Multer Config for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { uploadCameraPhoto, searchDevices, setIsEdited,getCameraStatus,getCameraById, getLocation, updateCamera, signin, verifyOtp, createCamera, getCameraByDid, getCamerasbyAssignedBy, getCamerasbyNumber, assignCamera, addData, getAcdetails, updateAssemblyNames, updateDistrict, convertDistrictToUpperCase, getDistrictdetails, updateStr, getdetails, getsetting, setsetting, getStateData, getDashboardDetails, updateUser, getPsDetails, getPsLocation, getDistrictData, getAssemblyData, getCameraByLocation, attendance, getLatLongFsv, getFlvLatDid, getFullDid, getLatLongPolling, removeEleCamera, trackLiveLatLong, getElectionUser, getLatLongPhaseOne, getCameraByDidInfo, getElectionUserChart, getElectionCameraChart, rebootCamera, getRebootCamera, getAssemblyByNumber, getCamerasbyDid, getElectionUserPage, getBiharReport, getBiharReportUser, getSixDistrictDataBihar } = require('../controllers/electionController');

adiancerouter.route('/cameras').get( getCameraById );
adiancerouter.route('/getLocation').get( getLocation );
adiancerouter.route('/camera/:id').put( updateCamera );
adiancerouter.route('/login').post( signin );
adiancerouter.route('/verify').post( verifyOtp );
adiancerouter.route('/create').post( createCamera );
adiancerouter.route('/getcamerabydid').get( getCameraByDid );
adiancerouter.route('/searchDevices').get( searchDevices );
adiancerouter.route('/upload-photo').post( upload.single('photo'), uploadCameraPhoto );
adiancerouter.route('/getCamerasByAssignedBy').get(authorizeRolesElection('district'),getCamerasbyAssignedBy );
adiancerouter.route('/getCamerasByNumber').get( getCamerasbyNumber );
adiancerouter.route('/assignCamera').post( assignCamera );
adiancerouter.route('/addData').post( addData );
adiancerouter.route('/getDistrictdetails').get( getDistrictdetails );
adiancerouter.route('/getAcdetails').get( getAcdetails );
adiancerouter.route('/updateAssemblyNames').get( updateAssemblyNames );
adiancerouter.route('/updateDistrict').get( updateDistrict );
adiancerouter.route('/convertDistrictToUpperCase').get( convertDistrictToUpperCase );
adiancerouter.route('/getPsdetails').get( getPsDetails );
adiancerouter.route('/getPsLocation').get( getPsLocation );
adiancerouter.route('/updateStr').get( updateStr );
// adiancerouter.route('/getdetails').post( getdetails );

adiancerouter.route('/camera/:deviceId/edit').put(setIsEdited);
// settings
adiancerouter.route('/getsetting').post( getsetting );
adiancerouter.route('/setsetting').post( setsetting );
adiancerouter.route('/rebootCamera').post( rebootCamera );
adiancerouter.route('/getDashboardDetails').get( getDashboardDetails );
adiancerouter.route('/getStateData').get( getStateData );
adiancerouter.route('/getDistrictData').get( getDistrictData );
adiancerouter.route('/getAssemblyData').get( getAssemblyData );
adiancerouter.route('/updateUser').put( updateUser );
adiancerouter.route('/getCameraByLocation').get( getCameraByLocation );
adiancerouter.route('/attendance').post( attendance );
adiancerouter.route('/updateAssemblyNames').get( updateAssemblyNames );
adiancerouter.route('/getLatLongFsv').get( getLatLongFsv );
adiancerouter.route('/getLatLongPhaseOne').get( getLatLongPhaseOne );
adiancerouter.route('/getFlvLatDid').get( getFlvLatDid );
adiancerouter.route('/getFullDid').get( getFullDid );
adiancerouter.route('/getLatLongPolling').get( getLatLongPolling );
adiancerouter.route('/removeEleCamera').delete( removeEleCamera );
adiancerouter.route('/trackLiveLatLong').post( trackLiveLatLong );
adiancerouter.route('/getElectionUser').get( getElectionUser );
adiancerouter.route('/getCameraByDidInfo').get( getCameraByDidInfo );
adiancerouter.route('/getElectionUserChart').get( getElectionUserChart );
adiancerouter.route('/getElectionCameraChart').get( getElectionCameraChart );
adiancerouter.route('/getRebootCamera').get( getRebootCamera );
adiancerouter.route('/getAssemblyByNumber').get( getAssemblyByNumber );
adiancerouter.route('/getCamerasbyDid').get( getCamerasbyDid );
adiancerouter.route('/getElectionUserPage').get( getElectionUserPage );
adiancerouter.route('/getBiharReport').get( getBiharReport );
adiancerouter.route('/getBiharReportUser').get( getBiharReportUser );
adiancerouter.route('/getSixDistrictDataBihar').get( getSixDistrictDataBihar );

//AI Model Status
adiancerouter.route('/status').get( getCameraStatus );
// adiancerouter.route('/getSingleUser').get( getSingleUser );
// adiancerouter.route('/getUsers').get( getUsers );


module.exports = adiancerouter;

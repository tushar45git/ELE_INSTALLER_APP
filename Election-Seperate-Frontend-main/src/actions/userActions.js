import axios from 'axios';

// const baseURL = 'http://192.168.29.33:7073/election';
// const baseURL = 'https://seahorse-app-2-3o2pf.ondigitalocean.app/election';
// const baseURL = 'http://192.168.29.123:7073/election';
const baseURL = 'http://localhost:8080/election';

const instance = axios.create({
  baseURL: baseURL
});

export const setIsEdited = async (deviceId) => {
  try {
    const response = await instance.put(`/camera/${deviceId}/edit`); // New api to update edited status
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message || 'An error occurred while setting isEdited' };
  }
};
export const getCameraStatus = async (deviceId) => {
  try {
    // Use the axios instance and pass the camera_id as a query param
    const response = await instance.get('/status', {
      params: { camera_id: deviceId } // This adds ?camera_id=VSPL-123297-JABFD automatically
    });

    console.log("getCameraStatus response", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching camera status:", error);
    return { success: false, message: error.message || "Failed to fetch camera status" };
  }
};


export const getCamera = async (mobile) => {

  try {
    console.log(mobile);
    const params = { personMobile: mobile };
    const response = await instance.get('/cameras', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getAssemblyByNumber = async (mobile) => {

  try {
    console.log(mobile);
    const params = { personMobile: mobile };
    const response = await instance.get('/getAssemblyByNumber', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getRebootCamera = async (page, search) => {

  try {
    console.log(page, search);
    const params = { page: page, search: search };
    const response = await instance.get('/getRebootCamera', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("getrebootcamera", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const rebootCamera = async (deviceId) => {

  try {
    console.log("recamfaction", deviceId);
    // const params = { deviceId: deviceId };
    const response = await instance.post('/rebootCamera', {
      deviceId: deviceId
    });

    // console.log("getcameras",response.data.data);
    console.log("getrebootcamera", deviceId);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getAiData = async (page, district, assembly, psNo, location, HC) => {
  console.log(district, assembly)
  try {
    // const params = { deviceId: deviceId };
    const response = await axios.post('https://ai-analytics-election-igrgh.ondigitalocean.app/api/get-ai-data', {
      modelname: 'Crowd',
      pageNumber: page,
      district: district,
      assembly: assembly,
      psNo: psNo,
      location: location,
      HC: HC,
    });

    // console.log("getcameras",response.data.data);
    console.log("getaidata", response);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const sendQueryToBackend = async (input) => {
  try {
    console.log(input)
    // Make a POST request to the backend API with the user query
    const response = await axios.post('http://192.168.29.212:443/query', { query: input });

    // Return the bot response from the backend
    return response.data.agent;
  } catch (error) {
    // Handle error if API call fails
    console.error('Error fetching response:', error);
    throw error; // Re-throw the error for the caller to handle
  }
};

export const chatHistory = async () => {
  try {
    console.log("surekha");
    // Make a GET request to the backend API with the user query
    const response = await axios.get('http://192.168.29.212:443/export')

    // Return the response from the backend
    console.log(response)
    return response.data;
  } catch (error) {
    // Handle error if API call fails
    console.error('Error fetching response:', error);
    throw error; // Re-throw the error for the caller to handle
  }
};

export const getSetting = async (deviceId, prourl) => {

  try {
    console.log("params", deviceId, prourl);

    const response = instance.post('/getsetting', {
      deviceId: deviceId,
      prourl: `tcp://${prourl}`
    });

    // console.log("getcameras",response.data.data);

    return response;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const setSetting = async (prourl, appSettings) => {

  try {
    console.log("params", prourl, appSettings);

    const response = instance.post('/setsetting', {
      prourl: `tcp://${prourl}`,
      appSettings: appSettings
    });

    // console.log("getcameras",response.data.data);

    return response;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getDistrictDetails = async (state) => {
  try {
    console.log(state);
    const params = { state: "GOA" };
    const response = await instance.get('/getDistrictDetails', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};
export const getAcdetails = async (state, district) => {
  try {
    console.log(state);
    const params = { state: state, district: district };
    const response = await instance.get('/getAcdetails', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};
export const getPsDetails = async (state, district, assembly) => {
  try {
    console.log(state);
    const params = { state: state, district: district, assemblyName: assembly };
    const response = await instance.get('/getPsDetails', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getPsLocation = async (state, district, assembly, psNo) => {
  try {
    console.log(state);
    const params = { state: state, district: district, assemblyName: assembly, psNo: psNo };
    const response = await instance.get('/getPsLocation', {
      params: params
    });

    // console.log("getcameras",response.data.data);
    console.log("params", params);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCameraByDid = async (mobile) => {
  const token = localStorage.getItem('mobile');
  try {
    console.log(mobile);
    const params = { deviceId: mobile };
    const response = await instance.get('/getcamerabydid', {
      params: params
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCamerasByDid = async (mobile) => {
  const token = localStorage.getItem('mobile');
  try {
    console.log(mobile);
    const params = { deviceId: mobile };
    const response = await instance.get('/getCamerasbyDid', {
      params: params
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCameraByDidInfo = async (mobile) => {
  const token = localStorage.getItem('mobile');
  try {
    console.log(mobile);
    const params = { deviceId: mobile };
    const response = await instance.get('/getcamerabydidInfo', {
      params: params
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export async function updateCamera(deviceId, installed_status) /* type, */ {
  const token = localStorage.getItem('mobile');
  try {
    const response = await instance.put(`/camera/${deviceId}`, {
      live: installed_status,
    },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Add any other headers if needed
        }
      }
    );
    console.log("hello", response);
    return response;
  } catch (error) {
    throw error;
  }
}

export const login = async (name, mobile) => {
  try {
    console.log(name, mobile);

    const response = await instance.post('/login', {
      name: name,
      mobile: mobile,
    });

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const trackLiveLatLong = async (name, mobile, lat, long, date, time, state, formatted_address, formatted_address1, formatted_address2) => {
  try {
    const response = await instance.post('/trackLiveLatLong', {
      personName: name,
      personMobile: mobile,
      latitude: lat,
      longitude: long,
      date: date,
      time: time,
      state: state,
      formatted_address: formatted_address,
      formatted_address1: formatted_address1,
      formatted_address2: formatted_address2
    });

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const verifyOtp = async (mobile, otp) => {
  try {
    console.log(mobile, otp);

    const response = await instance.post('/verify', {
      mobile: mobile,
      otp: otp,
    });

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const installCamera = async (deviceId, name, mobile, assemblyName, psNumber, state, district, excelLocation, latitude, longitude, installed_status, status ,date, time, remarks) => {
  try {

    const response = await instance.post('/create', {
      deviceId: deviceId,
      personName: name,
      personMobile: mobile,
      assemblyName: assemblyName,
      psNo: psNumber,
      state: state,
      district: district,
      location: excelLocation,
      latitude: latitude,
      longitude: longitude,
      installed_status: installed_status,
      date: date,
      time: time,
      remarks: remarks,
      status : status
    });

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export async function removeEleCamera(cameraId) {
  const token = localStorage.getItem('token');
  try {
    const params = { deviceId: cameraId };
    const response = await instance.delete(`/removeEleCamera`,
      {
        params: params
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Add any other headers if needed
        }
      });
    return response;
  } catch (error) {
    throw error;
  }
}

export const assignCamera = async (number, personMobile, deviceIds) => {
  try {
    console.log("om", number, personMobile, deviceIds);

    const response = await instance.post('/assignCamera', {
      number: number,
      personMobile: personMobile,
      deviceIds: deviceIds,
    });

    console.log("check it ", response);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const addData = async (number, personMobile, location, deviceIds) => {
  try {
    console.log("om", number, personMobile, location, deviceIds);

    const response = await instance.post('/addData', {
      number: number,
      personMobile: personMobile,
      location: location,
      deviceIds: deviceIds,
    });

    console.log("check it ", response);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCamerasByAssignedBy = async (mobile, currentPage) => {
  const token = localStorage.getItem('mobile');
  try {
    console.log(mobile);
    const params = { mobile: mobile, page: currentPage };
    const response = await instance.get('/getCamerasByAssignedBy', {
      params: params
    },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Add any other headers if needed
        }
      });

    console.log("getcameras", response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCamerasByNumber = async (mobile) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    const params = { personMobile: mobile };
    const response = await instance.get('/getCamerasByNumber', {
      params: params
    },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          // Add any other headers if needed
        }
      });

    console.log("getcameras", response);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getLatLongFsv = async (mobile, currentPage) => {
  // const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { mobile: mobile, page: currentPage };
    const response = await instance.get('/getLatLongFsv', {
      // params: params
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getLatLongPolling = async () => {
  // const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { state: state };
    const response = await instance.get('/getLatLongPolling', {
      // params: params
    });

    console.log("getcameras", response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getLatLongPhaseOne = async (state) => {
  // const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    const params = { state: state };
    const response = await instance.get('/getLatLongPhaseOne', {
      params: params
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getElectionUser = async (date, time) => {
  try {
    // console.log(mobile);
    // const params = { date: date, time: time };
    const response = await instance.get('/getElectionUser', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getElectionUserPage = async (page, search, state) => {
  try {
    console.log('ladiesandmen', state);
    const params = { page, search, state };
    const response = await instance.get('/getElectionUserPage', {
      params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getBiharReport = async () => {
  try {
    // console.log('ladiesandmen',state);
    // const params = { page, search, state };
    const response = await instance.get('/getBiharReport', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getSixDistrictDataBihar = async () => {
  try {
    // console.log('ladiesandmen',state);
    // const params = { page, search, state };
    const response = await instance.get('/getSixDistrictDataBihar', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getBiharReportUser = async (Madhubani) => {
  try {
    // console.log('ladiesandmen',state);
    const params = { formatted_address: Madhubani };
    const response = await instance.get('/getBiharReportUser', {
      params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getAiMap = async (date, time) => {
  try {
    // console.log(mobile);
    // const params = { date: date, time: time };
    const response = await axios.get('http://192.168.29.151:3000/api/get-goa-data', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getElectionUserChart = async (date, time) => {
  try {
    // console.log(mobile);
    // const params = { date: date, time: time };
    const response = await instance.get('/getElectionUserChart', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};
export const getElectionCameraChart = async (date, time) => {
  try {
    // console.log(mobile);
    // const params = { date: date, time: time };
    const response = await instance.get('/getElectionCameraChart', {
      // params: params
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getFlvLatDid = async (deviceId) => {
  // const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    const params = { deviceId: deviceId };
    const response = await instance.get(`/getFlvLatDid`, {
      params: params
    });

    console.log("getflvlatdid", response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getFullDid = async (deviceId) => {
  // const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    const params = { deviceId: deviceId };
    const response = await instance.get(`/getFullDid`, {
      params: params
    });

    console.log("getFullDid", response.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

// Dashboard Details

export const getDashboardDetails = async (mobile) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { deviceId: mobile };
    const response = await instance.get('/getDashboardDetails', {
      // params: params
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getStateData = async (state) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { deviceId: mobile };
    const response = await instance.get(`/getStateData?state=${state}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getDistrictData = async (state, district) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { deviceId: mobile };
    const response = await instance.get(`/getDistrictData?state=${state}&district=${district}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getAssemblyData = async (state, district, assemblyName) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { deviceId: mobile };
    const response = await instance.get(`/getAssemblyData?state=${state}&district=${district}&assemblyName=${assemblyName}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const getCameraByLocation = async (location) => {
  const token = localStorage.getItem('mobile');
  try {
    // console.log(mobile);
    // const params = { deviceId: mobile };
    const response = await instance.get(`/getCameraByLocation?location=${location}`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Add any other headers if needed
      }
    });

    // console.log("getcameras",response.data.data);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};

export const importAttendance = async (date, time, name, mobile, latitude, longitude) => {
  try {
    // console.log("om",number, personMobile, location, deviceIds);

    const response = await instance.post('/attendance', {
      presentDate: date,
      presentTime: time,
      name: name,
      mobile: mobile,
      latitude: latitude,
      longitude: longitude
    });

    console.log("check it ", response);

    return response.data;
  } catch (error) {
    console.error(error);
    // Handle errors, and include an error message in the response
    return { success: false, message: error.message || 'An error occurred during login.' };
  }
};



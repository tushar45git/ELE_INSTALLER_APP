import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import logo from "./images/logo/cam.png";
import Delete from "./images/logo/deleteicon.png";
import Trash from "./images/logo/Trash.png";
import { FiList, FiPlus, FiMap, FiHome, FiHash, FiMapPin, FiGlobe, FiEdit } from "react-icons/fi";
import * as FileSaver from "file-saver";
import { FaFileExcel, FaSearch } from "react-icons/fa";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from '@capacitor/filesystem';
import "./auto-installer.css";
import {
  Badge,
  Button,
  Container,
  Flex,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
  Tooltip,
  Checkbox,
  border, // Import Checkbox from Chakra UI
  Box,
  Image,
  Grid,
  Center,
  Collapse,
  Heading,
  HStack,
  VStack,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  List,
  ListItem,
  Divider,
} from "@chakra-ui/react";
import { ToastContainer, toast } from "react-toastify";
import {
  getAcdetails,
  getCamera,
  getCameraByDid,
  getCamerasByNumber,
  getDistrictDetails,
  getFullDid,
  getSetting,
  installCamera,
  removeEleCamera,
  setSetting,
  trackLiveLatLong,
  updateCamera,
  getCameraStatus,
   setIsEdited 
} from "../actions/userActions"; // Import the new action
import { MdDelete, MdEdit, MdVisibility } from "react-icons/md";
import withAuth from "./withAuth";
// import { ReactFlvPlayer } from 'react-flv-player';
import videojs from "video.js";
import "video.js/dist/video-js.css";
import ReactPlayer from "react-player";
import QRCodeScanner from "./QrCodeScanner";
import TawkToWidget from "./tawkto";
import { LuFlipHorizontal2, LuFlipVertical2, LuChevronDown, LuChevronUp } from "react-icons/lu";
import Autosuggest from "react-autosuggest";
import { IoIosRefresh } from "react-icons/io";
import { FaExclamationTriangle } from "react-icons/fa";
import { Link } from "react-router-dom";
//import { FaSortAlphaDown, FaSortAlphaUp } from "react-icons/fa"; // Import sorting icons
// import sortIcon from "./images/logo/sort.png"; // Import the image
import line from "./images/logo/line.png";
import expand from "./images/logo/expand.png";

const AutoInstaller = () => {
  // State
  const [expandedCameraId, setExpandedCameraId] = useState(null);

  const handleToggleExpand = (id) => {
    setExpandedCameraId((prevId) => (prevId === id ? null : id));
  };
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [boothNo, setBoothNo] = useState("");
  const [excelLocation, setExcelLocation] = useState(" ");
  const [state, setState] = useState(" ");
  const [stateu, setStateu] = useState(" ");
  const [punjab, setPunjab] = useState(" ");
  const [tripura, setTripura] = useState(" ");
  const [isEditing, setIsEditing] = useState(false); // NEW: Editing state
  const [prourl, setProurl] = useState("");

  // NEW STATE VARIABLES
  const [cameraStatus, setCameraStatus] = useState(null);
  const [blurChecked, setBlurChecked] = useState(false);
  const [blackviewChecked, setBlackviewChecked] = useState(false);
  const [brightnessChecked, setBrightnessChecked] = useState(false);
  const [blackAndWhiteChecked, setBlackAndWhiteChecked] = useState(false);
  const [cameraAngleAcceptable, setCameraAngleAcceptable] = useState(true);
  const [hasClickedCameraDidInfo, setHasClickedCameraDidInfo] = useState(false); // Track button click
  const [searchDeviceId, setSearchDeviceId] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingCameraDetails, setIsFetchingCameraDetails] = useState(false); // New state for fetching status

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState(null);
  // useRef to hold the interval ID
  const toastInterval = useRef(null);

  // useRef to hold the interval ID for camera status polling
  const cameraStatusInterval = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 5; // Adjust as needed
  const [cameraa, setCameraa] = useState([]); // Keep cameraa as state
  // const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
  const totalCameras = cameraa.length;
  const totalPages = Math.ceil(totalCameras / camerasPerPage); // Calculate the number of pages

    const openDeleteModal = (cameraId) => {
    setCameraToDelete(cameraId);
    setIsDeleteModalOpen(true);
  };

    // Function to close the confirmation modal
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCameraToDelete(null); // Clear the camera ID
  };

  useEffect(() => {
    camera();
    did();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          setLatie(latitude);
          setLongie(longitude);

          setLocation({ latitude, longitude });

          try {
            const responsee = await axios.get(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyBNBVfpAQqikexY-8J0QDyBR4bWKiKe`
            );
            setAddress(responsee.data.results[0].formatted_address);
            setStateu(
              responsee.data.plus_code.compound_code.split(",")[1].toUpperCase()
            );
          } catch (error) {
            console.error("Error fetching address:", error.message);
          }
        },
        (error) => {
          console.error("Error getting location:", error.message);
        }
      );
    } else {
      console.error("Geolocation is not supported by your browser.");
    }

    return () => {
      console.log(
        "AutoInstaller component unmounting OR deviceId changed. Clearing intervals."
      );
      clearInterval(toastInterval.current);
      clearInterval(cameraStatusInterval.current);
    };
  }, [deviceId]);
   const handleBackClick = () => {
    setShowAdditionalInputs(false);
    // Optionally clear any form fields or camera data here if needed
    setDeviceId(""); // Reset DeviceID
    setFlvUrl(""); // Reset video URL
    setCameraStatus(null); // Reset camera status
    setHasClickedCameraDidInfo(false); // Reset this state when adding new device
    clearInterval(cameraStatusInterval.current);
    clearInterval(toastInterval.current);
  };
  const handleGetData = async (deviceId, setting) => {
    const response = await getCameraByDid(deviceId);
    const getset = await getSetting(deviceId, response.flvUrl.prourl);

    let modifiedData = {
      ...getset.data,
      appSettings: {
        ...getset.data.appSettings,
        imageCfg: {
          ...getset.data.appSettings.imageCfg,
          [setting]: getset.data.appSettings.imageCfg[setting] === 1 ? 0 : 1,
        },
      },
    };

    console.log("Modified data:", modifiedData);

    const setSet = await setSetting(
      response.flvUrl.prourl,
      modifiedData.appSettings
    );
  };
  const filteredCameras = [...cameraa].sort((a, b) => {
    // If searchDeviceId is empty, keep normal order
    if (!searchDeviceId) return 0;

    const aMatch = a.deviceId.includes(searchDeviceId);
    const bMatch = b.deviceId.includes(searchDeviceId);

    // Put matching records at the top
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // Handle search input change with suggestions
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchDeviceId(value);
    setCurrentPage(1); // Reset to first page when search changes
    
    if (value.trim().length > 0) {
      // Filter cameras that match the search
      const suggestions = cameraa
        .filter(camera => 
          camera.deviceId.toLowerCase().includes(value.toLowerCase())
        )
        .map(camera => camera.deviceId)
        .slice(0, 5); // Limit to 5 suggestions
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (deviceId) => {
    setSearchDeviceId(deviceId);
    setShowSuggestions(false);
    setCurrentPage(1); // Reset to first page
    toast.success(`Showing results for: ${deviceId}`);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (searchDeviceId.trim()) {
      setShowSuggestions(false);
      setCurrentPage(1); // Reset to first page
      const matchCount = filteredCameras.length;
      if (matchCount > 0) {
        toast.success(`Found ${matchCount} camera${matchCount !== 1 ? 's' : ''} matching "${searchDeviceId}"`);
      } else {
        toast.warning(`No cameras found matching "${searchDeviceId}"`);
      }
    } else {
      toast.info("Please enter a device ID to search");
    }
  };

const handleAddInputs = async () => {
  if (!deviceId) {
    toast.error("Please enter a Device ID first");
    return;
  }

  setShowAdditionalInputs(true);
  setHasClickedCameraDidInfo(true);
  clearInterval(cameraStatusInterval.current);
  clearInterval(toastInterval.current);

  setIsFetchingCameraDetails(true);

  try {
    const response = await getCameraByDid(deviceId);

    if (!response?.flvUrl?.url2 || !response.success) {
      toast.error("Device ID is not available. Please check and try again.");
      setIsFetchingCameraDetails(false);
      return;
    }

    setFlvUrl(response.flvUrl.url2);

    if (response.data.state === "PUNJAB") {
      toast.error("State is PUNJAB. Refreshing the page...");
      setTimeout(() => {
        window.location.reload();
      }, 100);
      setIsFetchingCameraDetails(false);
      return;
    }

    const fetchedState = response.data.state;
    const fetchedAssemblyName = response.data.assemblyName;
    const fetchedPsNumber = response.data.psNo;
    const fetchedDistrict = response.data.district;
    const fetchedExcelLocation = response.data.location;

    setState(fetchedState);
    setAssemblyName(fetchedAssemblyName);
    setPsNumber(fetchedPsNumber);
    setDistrict(fetchedDistrict);
    setExcelLocation(fetchedExcelLocation);

    sendUrlToExternalApi(response.flvUrl.url2);
    startCameraStatusPolling(deviceId);

    // **Wait for State to Update (Important!)**
    await new Promise((resolve) => setTimeout(resolve, 100)); // Adjust time as needed

    // **Call the Submission Logic Directly:**
    try {
      let latitude = location.latitude;
      let longitude = location.longitude;

      const currentTime = new Date();
      const formattedDate = currentTime.toLocaleDateString("en-GB");
      const formattedTime = currentTime.toLocaleTimeString("en-US", {
        hour12: false,
      });

      let installed_status = 1;
      let status = "RUNNING";

      const installResponse = await installCamera(
        deviceId,
        namee,
        mobilee,
        fetchedAssemblyName,
        fetchedPsNumber,
        fetchedState,
        fetchedDistrict,
        fetchedExcelLocation,
        latitude,
        longitude,
        installed_status,
        status,
        formattedDate,
        formattedTime,
      );

      console.log("response of installCamera", installResponse);
      camera(); // Update the camera list

      // **Crucially, DO NOT clear the form or hide it.**
      // setState("");
      // setDistrict("");
      // setAssemblyName("");
      // setPsNumber("");
      // setExcelLocation("");
      // setShowAdditionalInputs(false);  //<---REMOVE THIS
      setIsEditing(false);

      // Call the new API endpoint to update isEdited
      if (isEditing) {
        await setIsEdited(deviceId); // Call the new API function
      }

    } catch (error) {
      console.error(error);
    }

  } catch (error) {
    console.error("Error in handleAddInputs:", error);
    // Handle errors appropriately (e.g., display an error message)
  } finally {
    setIsFetchingCameraDetails(false);
  }
};
const downloadReport = async () => {
  const exportData = cameraa.map((camera) => ({
    "Device ID": camera.deviceId,
    District: camera.district,
    "Assembly Name": camera.assemblyName,
    "PS No.": camera.psNo,
    Location: camera.location,
    "Last Seen": camera.lastSeen,
    Status: camera.status,
    "Is Edited": camera.isEdited,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Camera Report");

  // Detect if running inside Capacitor native app
  const isNative = window.Capacitor?.isNativePlatform?.();

  if (isNative) {
    // ✅ Native mobile: Save file in app's Documents directory
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    try {
      const result = await Filesystem.writeFile({
        path: 'camera_report.xlsx',
        data: wbout,
        directory: Directory.Documents,
      });
      console.log('✅ Excel report saved to:', result.uri);
      alert('Camera report saved successfully on your device >> Go to files >> Documents');
    } catch (error) {
      console.error('❌ Error saving Excel file:', error);
      alert('Failed to save report.');
    }
  } else {
    // 🌐 Web browser: trigger normal file download
    XLSX.writeFile(wb, 'camera_report.xlsx');
  }
};
  const startCameraStatusPolling = (deviceId) => {
    setCameraStatus(undefined); // Set to undefined when polling starts
    fetchCameraStatus(deviceId);

    cameraStatusInterval.current = setInterval(() => {
      fetchCameraStatus(deviceId);
    }, 15000);
  };

  const fetchCameraStatus = async (deviceId) => {
    const toastStyle = {
      fontSize: "12px", // Smaller font
      padding: "8px 12px", // Reduced padding
      height: "3%",
      width: "80%",
    };
    try {
      const status = await getCameraStatus(deviceId);

      if (status.success === false) {
        console.log("Api status false");
        setCameraStatus(null);
        setIsFetchingCameraDetails(false);
        return;
      } else {
        console.log("Api status true");
        setCameraStatus(status);
        setBlurChecked(status.blur);
        setBlackviewChecked(status.blackview);
        setBrightnessChecked(status.brightness);
        setBlackAndWhiteChecked(status.BlackAndWhite);
        const cameraAngle = Math.abs(status.camera_angle);
        setCameraAngleAcceptable(cameraAngle <= 15);
        setIsFetchingCameraDetails(false);

  //       if (cameraAngle > 15) {
  //         if (!toastInterval.current) {
  //           toastInterval.current = setInterval(() => {
  //             toast.warn(
  //               "Try to adjust the angle of camera. The angle of camera should be in range of 0-15 degree",
  //               {
  //                 position: "top-right",
  //                 autoClose: 5000,
  //                 hideProgressBar: false,
  //                 closeOnClick: true,
  //                 pauseOnHover: true,
  //                 draggable: true,
  //                 style: toastStyle, // Apply inline styles here
  //               }
  //             );
  //           }, 9000);
  //         }
  //       } else {
  //         clearInterval(toastInterval.current);
  //         toastInterval.current = null;
  //       }
  //     }

  //     if (status.blur) {
  //       toast.warn("Camera is blur, try to fix it!", {
  //         position: "top-right",
  //         autoClose: 5000,
  //         hideProgressBar: false,
  //         closeOnClick: true,
  //         pauseOnHover: true,
  //         draggable: true,
  //       });
  //     }
  //     if (status.blackview) {
  //       toast.warn("Camera having black view, try to fix it!", {
  //         position: "top-right",
  //         autoClose: 5000,
  //         hideProgressBar: false,
  //         closeOnClick: true,
  //         pauseOnHover: true,
  //         draggable: true,
  //       });
  //     }
  //     if (!status.brightness) {
  //       toast.warn("Check the brightness of the camera!", {
  //         position: "top-right",
  //         autoClose: 5000,
  //         hideProgressBar: false,
  //         closeOnClick: true,
  //         pauseOnHover: true,
  //         draggable: true,
  //       });
  //     }
  //     if (status.BlackAndWhite) {
  //       toast.warn("Camera is black and white!", {
  //         position: "top-right",
  //         autoClose: 5000,
  //         hideProgressBar: false,
  //         closeOnClick: true,
  //         pauseOnHover: true,
  //         draggable: true,
  //       });
   }
    } catch (error) {
      console.error("Error fetching camera status:", error);
      setIsFetchingCameraDetails(false);
    }
  };

  const sendUrlToExternalApi = async (url2) => {
    try {
      let rtmpUrl = url2.replace("https", "rtmp");

      const url = new URL(rtmpUrl);
      const hostname = url.hostname;

      if (!hostname.includes(":")) {
        rtmpUrl = rtmpUrl.replace(hostname, `${hostname}:80`);
      }

      rtmpUrl = rtmpUrl.replace(".flv", "");

      console.log("Transformed URL:", rtmpUrl);

      const postData = { rtmp: rtmpUrl };
      console.log("My data is", postData);

      const response = await axios.post(
        "https://installerapp.vmukti.com:8443/analyze-camera",
        postData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("External API Response:", response.data);
      toast.success("Successfully Fetched Camera Status", {
        position: "top-right",
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error("Error sending URL to external API:", error);
    }
  };

  const refresh = () => {
    window.location.reload();
  };

   const handleDeleteClickConfirmed = async () => {
    try {
      // Only proceed if a camera ID is actually stored
      if (cameraToDelete) {
        console.log("Deleting camera with ID:", cameraToDelete);
        const response = await removeEleCamera(cameraToDelete);
        camera(); // Refresh camera list
      }
    } catch (error) {
      console.error("Error deleting camera:", error);
      // Handle error (e.g., display an error message to the user)
    } finally {
      closeDeleteModal(); // Close the modal after deletion (or error)
    }
  };

  const [latie, setLatie] = useState("");
  const [longie, setLongie] = useState("");
  const namee = localStorage.getItem("name");
  const mobilee = localStorage.getItem("mobile");
  const handleSubmit = async () => {
    try {
      let latitude = location.latitude;
      let longitude = location.longitude;

      const currentTime = new Date();
      const formattedDate = currentTime.toLocaleDateString("en-GB");
      const formattedTime = currentTime.toLocaleTimeString("en-US", {
        hour12: false,
      });

      let installed_status = 1;
      let status = "RUNNING";

      console.log(
        "Submitted:",
        deviceId,
        namee,
        mobilee,
        assemblyName,
        psNumber,
        state,
        district,
        excelLocation,
        latitude,
        longitude,
        installed_status,
        status,
      );
      const response = await installCamera(
        deviceId,
        namee,
        mobilee,
        assemblyName,
        psNumber,
        state,
        district,
        excelLocation,
        latitude,
        longitude,
        installed_status,
        status,
        formattedDate,
        formattedTime,      );

      console.log("response of submit", response);
      camera();
      setState("");
      setDistrict("");
      setAssemblyName("");
      setPsNumber("");
      setExcelLocation("");
      setShowAdditionalInputs(false);
      setIsEditing(false);

      // Call the new API endpoint to update isEdited
      if (isEditing) {
        await setIsEdited(deviceId); // Call the new API function
      }

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    trackData();
  }, [namee, mobilee, latie, longie]);

  const trackData = async () => {
    try {
      let latitude = location.latitude;
      let longitude = location.longitude;
      const currentTime = new Date();
      const formattedDate = currentTime.toLocaleDateString("en-GB");
      const formattedTime = currentTime.toLocaleTimeString("en-US", {
        hour12: false,
      });
      const responsee = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyBNBVfpAQqikexY-8J0QDyBR4bWKiKe`
      );

      const statename = responsee.data.plus_code.compound_code
        .split(", ")[1]
        .toUpperCase();
      const formatted_address = responsee.data.results[6].formatted_address;
      const formatted_address1 = responsee.data.results[7].formatted_address;
      const formatted_address2 = responsee.data.results[8].formatted_address;
      console.log("lala", responsee.data);
      const result = await trackLiveLatLong(
        namee,
        mobilee,
        latitude,
        longitude,
        formattedDate,
        formattedTime,
        statename,
        formatted_address,
        formatted_address1,
        formatted_address2
      );
    } catch (error) {
      console.error("Error tracking data:", error);
    }
  };

  const [editableCameraID, setEditableCameraID] = useState(null);

  const [live, setLive] = useState(0);

  const handleEditClick = (itemId) => {
    console.log(itemId);
    setEditableCameraID(itemId);
  };

  const handleUpdateClick = async (id) => {
    try {
      console.log("getId", id);
      console.log("live:", live);
      const response = await updateCamera(id, live);
      console.log("Consignment updated successfully:", response.data);
      setEditableCameraID(0);
      camera();
    } catch (error) {
      console.error("Error updating consignment:", error);
    }
  };

  const [didList, setDidList] = useState([]);
  const did = async () => {
    try {
      const mobile = localStorage.getItem("mobile");
      const result = await getCamerasByNumber(mobile);
      setDidList(result.data);
    } catch (error) {
    } finally {
    }
  };

 const camera = async () => {
    try {
      const mobile = localStorage.getItem("mobile");
      const result = await getCamera(mobile);
      console.log("Data from API:", result.data); // Add this line
      console.log("cameras data", result.data);

      // Initial sort when data is fetched
      const sortedData = [...result.data].sort((a, b) =>
        a.deviceId.localeCompare(b.deviceId)
      );

      setCameraa(sortedData);
      setCurrentPage(1); // Reset to first page when camera data updates
    } catch (error) {
    } finally {
    }
  };

  const [showAdditionalInputs, setShowAdditionalInputs] = useState(false);

  const handleAddNewDeviceClick = () => {
    setShowAdditionalInputs(true); // Show the inputs
    setHasClickedCameraDidInfo(false); // Reset this state when adding new device
    setCameraStatus(null); // Reset camera status
    setDeviceId(""); // Reset device ID
    setFlvUrl(""); // Reset video URL
  };
  const [assemblyName, setAssemblyName] = useState("");
  const [flvUrl, setFlvUrl] = useState("");
  const [psNumber, setPsNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [realLocation, setRealLocation] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const [deviceWidth, setDeviceWidth] = useState(window.innerWidth);

  const handleResize = () => {
    setDeviceWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const isMobileDevice = deviceWidth < 450;
  const handleScanSuccess = (text) => {
    setDeviceId(text);
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const handleViewCamera = (camera) => {
    setSelectedCamera(camera);
    setShowModal(true);
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
   const autosuggestRef = useRef(null);

   const handleInputChange = async (event, { newValue, method }) => {
    setDeviceId(newValue);

    if (method === 'type') {
      const numericValue = newValue.replace(/\D/g, '');

      if (numericValue.length === 6) {
        setIsLoading(true);
        try {
          const response = await getFullDid(numericValue);
          const results = response.streamnames || [];
          if (results.length === 0) {
            setSuggestions([{ isNoResult: true }]);
          } else {
            setSuggestions(results);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }
  };

  const handleSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
    if (suggestion && suggestion.isNoResult) {
        return;
    }
    setDeviceId(suggestionValue);
    setSuggestions([]); // Clear suggestions after selection
    if (autosuggestRef.current) {
        autosuggestRef.current.input.blur();
    }
  };

  const getSuggestionValue = (suggestion) => {
    if (suggestion && suggestion.isNoResult) {
      return deviceId;
    }
    return suggestion;
  };

  const renderSuggestion = (suggestion) => {
    if (suggestion && suggestion.isNoResult) {
      return (
        <div style={{ padding: '10px', color: 'gray', fontStyle: 'italic', fontSize: '14px' }}>
          No devices found with this ID
        </div>
      );
    }
    return <div>{suggestion}</div>;
  };

  const inputProps = {
    placeholder: 'Enter Device ID',
    value: deviceId,
    onChange: handleInputChange,
    style: {
      width: '240px',
      height: '35px',
      padding: '10px 14px',
      borderRadius: '8px',
      background: '#fff',
      boxShadow: 'inset 0 1px 2.4px rgba(0, 0, 0, 0.25)',
      color: 'black',
      fontFamily: "'Wix Madefor Text'",
      fontSize: '12px',
      fontStyle: 'normal',
      fontWeight: 400,
      lineHeight: 'normal',
    },
  };

  const BlinkingWarningIcon = () => {
    return (
      <FaExclamationTriangle
        color="orange"
        style={{
          animation: "blink-animation 1s steps(5, start) infinite",
        }}
      />
    );
  };

  //Css
  const customCSS = `
@keyframes blink-animation {
    to {
        visibility: hidden;
    }
}

.blink {
    visibility: visible;
    animation: blink-animation 1s steps(5, start) infinite;
}
`;

  // Pagination functions
  const handleClick = (page) => {
    setCurrentPage(page);
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Calculate the start and end index for the current page
  // Use filteredCameras for pagination instead of all cameras
  const totalFilteredCameras = filteredCameras.length;
  const totalFilteredPages = Math.ceil(totalFilteredCameras / camerasPerPage);
  const startIndex = (currentPage - 1) * camerasPerPage;
  const endIndex = Math.min(startIndex + camerasPerPage, totalFilteredCameras);

  // Get the cameras to display on the current page (from filtered results)
  const camerasOnPage = filteredCameras.slice(startIndex, endIndex);

  // Sorting function
  // const handleSort = () => {
  //   const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
  //   setSortOrder(newSortOrder);

  //   const sortedData = [...cameraa].sort((a, b) => {
  //     const psNoA = a.psNo; // Access PS No. directly
  //     const psNoB = b.psNo;

  //     if (newSortOrder === "asc") {
  //       return psNoA - psNoB; // Sort numerically ascending
  //     } else {
  //       return psNoB - psNoA; // Sort numerically descending
  //     }
  //   });

  //   setCameraa(sortedData);
  //   setCurrentPage(1);
  // };
  const HorizontalLine = () => (
    <Box width="100%" height="2px" background="#3F77A5" mb={2} />
  );

  return (
    <div className="main-wrapper">
      <style>{customCSS}</style>
      <ToastContainer />
      <div style={{ position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", right: "20px", zIndex: 1000 }}>
        <TawkToWidget />
      </div>

      <Box className="animate-fade-in">
        {!location ? (
          <VStack minH="60vh" justify="center" spacing={4}>
            <Box p={8} bg="white" borderRadius="2xl" boxShadow="xl" textAlign="center">
              <Text fontSize="lg" fontWeight="600" color="red.500">
                Location Access Required
              </Text>
              <Text color="gray.600" mt={2}>
                To access the election installer portal, please enable GPS/Location services.
              </Text>
            </Box>
          </VStack>
        ) : (
          <>
            <header className="page-header">
              <div className="title-group">
                <HStack spacing={3} mb={1}>
                  <Heading as="h1" size="xl">Election Installer</Heading>
                  <div className="header-status-badge">
                    <Box w="6px" h="6px" borderRadius="full" bg="primary.500" mr={2} className="blink-warning" style={{ animationDuration: '1s' }} />
                    Secure Live
                  </div>
                </HStack>
                <Text color="gray.500" fontSize="md" fontWeight="500">
                  Professional camera management & real-time monitoring system
                </Text>
              </div>
              <Stack direction={{ base: "column", sm: "row" }} spacing={4} w={{ base: "full", sm: "auto" }}>
                {!showAdditionalInputs && (
                  <>
                    {cameraa.length > 0 && (
                      <Button
                        className="btn-secondary"
                        onClick={downloadReport}
                        leftIcon={<FaFileExcel />}
                        w={{ base: "full", sm: "auto" }}
                      >
                        Export Excel
                      </Button>
                    )}
                    <Button
                      className="btn-premium"
                      onClick={handleAddNewDeviceClick}
                      leftIcon={<FiPlus />}
                      w={{ base: "full", sm: "auto" }}
                    >
                      Add New Device
                    </Button>
                  </>
                )}
              </Stack>
            </header>

            {!showAdditionalInputs ? (
              /* List View */
              <>
                {/* Search Section - Professional & Minimalist */}
                <Box className="search-section" mb={8}>
                  <Box position="relative">
                    <InputGroup size="lg">
                      <InputLeftElement pointerEvents="none" height="100%" pl={2}>
                        <FaSearch color="var(--gray-400)" />
                      </InputLeftElement>
                      <Input
                        className="custom-input input-with-icon"
                        value={searchDeviceId}
                        onChange={handleSearchChange}
                        onFocus={() => searchDeviceId && setShowSuggestions(searchSuggestions.length > 0)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Filter by Device ID..."
                        fontSize="md"
                        _placeholder={{ color: "gray.400" }}
                      />
                      <InputRightElement height="100%" pr={1}>
                        {searchDeviceId && (
                          <IconButton
                            h="2rem"
                            w="2rem"
                            minW="2rem"
                            size="sm"
                            icon={<Text fontSize="lg">×</Text>}
                            onClick={() => {
                              setSearchDeviceId("");
                              setShowSuggestions(false);
                              setCurrentPage(1);
                              toast.info("Search cleared");
                            }}
                            aria-label="Clear search"
                            variant="ghost"
                            color="gray.400"
                            _hover={{ bg: "red.50", color: "red.600" }}
                          />
                        )}
                      </InputRightElement>
                    </InputGroup>
                    
                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        right={0}
                        zIndex={10}
                        mt={2}
                        bg="white"
                        borderRadius="lg"
                        boxShadow="xl"
                        border="1px solid"
                        borderColor="gray.200"
                        maxH="300px"
                        overflowY="auto"
                      >
                        <List spacing={0}>
                          {searchSuggestions.map((suggestion, index) => (
                            <ListItem
                              key={index}
                              px={4}
                              py={3}
                              cursor="pointer"
                              transition="all 0.2s"
                              borderBottom={index < searchSuggestions.length - 1 ? "1px solid" : "none"}
                              borderColor="gray.100"
                              _hover={{
                                bg: "blue.50",
                                color: "blue.700",
                              }}
                              onClick={() => handleSuggestionClick(suggestion)}
                              display="flex"
                              alignItems="center"
                              gap={2}
                            >
                              <FaSearch size={14} color="gray" />
                              <Text fontWeight="500" fontSize="sm">
                                {suggestion}
                              </Text>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Device List Section */}
                <div className="glass-card list-section">
                  <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
                    <VStack align="flex-start" spacing={1}>
                      <Heading size="md" color="blue.900">
                        Installation Directory
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        {searchDeviceId ? (
                          <>
                            Found <Text as="span" fontWeight="700" color="blue.600">{totalFilteredCameras}</Text> matching cameras
                          </>
                        ) : (
                          <>{cameraa.length} total active devices</>
                        )}
                      </Text>
                    </VStack>
                    <HStack spacing={3} align="center">
                      <IconButton
                        size="sm"
                        icon={<IoIosRefresh size="20px" />}
                        onClick={refresh}
                        aria-label="Refresh list"
                        className="btn-secondary"
                        isRound
                        bg="white"
                        transition="all 0.4s ease"
                        _hover={{ 
                          transform: "rotate(180deg)",
                          bg: "gray.100",
                          boxShadow: "md"
                        }}
                      />
                    </HStack>
                  </Flex>

                <Box display={{ base: "none", md: "block" }} className="table-container">
                  <Table variant="simple" className="premium-table">
                    <Thead>
                      <Tr>
                        <Th>District</Th>
                        <Th>PS No.</Th>
                        <Th>Device ID</Th>
                        <Th>Assembly Name</Th>
                        <Th>Location</Th>
                        <Th textAlign="right">Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {camerasOnPage.map((camera) => (
                        <Tr key={camera.deviceId}>
                          <Td data-label="District">{camera.district}</Td>
                          <Td data-label="PS No."><b>{camera.psNo}</b></Td>
                          <Td data-label="Device ID">{camera.deviceId}</Td>
                          <Td data-label="Assembly Name">{camera.assemblyName}</Td>
                          <Td data-label="Location">{camera.location}</Td>
                          <Td data-label="Actions" textAlign={{ base: "left", md: "right" }}>
                            <HStack justify={{ base: "flex-start", md: "flex-end" }} spacing={2}>
                              <IconButton
                                size="sm"
                                icon={<MdVisibility color="#3182ce" />}
                                onClick={() => handleViewCamera(camera)}
                                aria-label="View Feed"
                                variant="ghost"
                                _hover={{ bg: "blue.50" }}
                              />
                              <IconButton
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                icon={<MdDelete color="#e53e3e" />}
                                onClick={() => openDeleteModal(camera.deviceId)}
                                aria-label="Delete"
                                _hover={{ bg: "red.50" }}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                      {filteredCameras.length === 0 && (
                        <Tr>
                          <Td colSpan={6} textAlign="center" py={10}>
                            <VStack spacing={2}>
                              <Text fontWeight="600">No cameras found</Text>
                              <Button size="sm" onClick={handleAddNewDeviceClick}>Add your first device</Button>
                            </VStack>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>

                {/* Mobile Card View */}
                <Box display={{ base: "block", md: "none" }}>
                  {camerasOnPage.map((camera) => (
                    <Box 
                      key={camera.deviceId} 
                      mb={4} 
                      p={4} 
                      bg="white" 
                      rounded="xl" 
                      shadow="sm" 
                      border="1px solid" 
                      borderColor="gray.200"
                    >
                      <Flex justify="space-between" align="center" onClick={() => handleToggleExpand(camera.deviceId)}>
                        <Text fontWeight="bold" fontSize="md" color="blue.800">
                          {camera.deviceId}
                        </Text>
                         <IconButton
                            icon={expandedCameraId === camera.deviceId ? <LuChevronUp /> : <LuChevronDown />}
                            variant="ghost"
                            size="sm"
                            aria-label="Toggle details"
                            isRound
                          />
                      </Flex>

                      <Collapse in={expandedCameraId === camera.deviceId} animateOpacity>
                        <VStack align="stretch" spacing={3} mt={3}>
                          <Divider borderColor="gray.100" />
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">District</Text>
                            <Text fontSize="sm" fontWeight="medium">{camera.district}</Text>
                          </HStack>
                          
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">PS No</Text>
                            <Text fontSize="sm" fontWeight="semibold">{camera.psNo}</Text>
                          </HStack>

                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Assembly</Text>
                            <Text fontSize="sm" fontWeight="medium">{camera.assemblyName}</Text>
                          </HStack>

                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Location</Text>
                            <Text fontSize="sm" textAlign="right" maxW="60%">{camera.location}</Text>
                          </HStack>
                          <Box pt={2}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={2} textTransform="uppercase">Actions</Text>
                            <HStack spacing={2}>
                              <Button 
                                size="sm" 
                                leftIcon={<MdVisibility color="#3182ce" />} 
                                onClick={(e) => { e.stopPropagation(); handleViewCamera(camera); }} 
                                colorScheme="blue" 
                                variant="outline" 
                                flex={1}
                                _hover={{ bg: "blue.50" }}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                leftIcon={<MdDelete color="#e53e3e" />} 
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(camera.deviceId); }} 
                                colorScheme="red" 
                                variant="outline" 
                                flex={1}
                                _hover={{ bg: "red.50" }}
                              >
                                Delete
                              </Button>
                            </HStack>
                          </Box>
                        </VStack>
                      </Collapse>
                    </Box>
                  ))}
                  
                  {filteredCameras.length === 0 && (
                     <Box textAlign="center" py={10}>
                        <VStack spacing={2}>
                          <Text fontWeight="600">No cameras found</Text>
                          <Button size="sm" onClick={handleAddNewDeviceClick}>Add your first device</Button>
                        </VStack>
                      </Box>
                  )}
                </Box>

                <Flex justify="center" mt={8}>
                  <Stack direction={{ base: "column", sm: "row" }} spacing={4} align="center">
                    <Button
                      className="btn-secondary"
                      size="sm"
                      onClick={() => handleClick(currentPage - 1)}
                      isDisabled={currentPage === 1}
                      w={{ base: "full", sm: "auto" }}
                    >
                      Previous
                    </Button>
                    <VStack spacing={0}>
                      <Text fontSize="sm" fontWeight="700" color="gray.600">
                        Page {currentPage} of {totalFilteredPages || 1}
                      </Text>
                      {searchDeviceId && (
                        <Text fontSize="xs" color="gray.500">
                          {totalFilteredCameras} result{totalFilteredCameras !== 1 ? 's' : ''} found
                        </Text>
                      )}
                    </VStack>
                    <Button
                      className="btn-secondary"
                      size="sm"
                      onClick={() => handleClick(currentPage + 1)}
                      isDisabled={currentPage === totalFilteredPages || totalFilteredPages === 0}
                      w={{ base: "full", sm: "auto" }}
                    >
                      Next
                    </Button>
                  </Stack>
                </Flex>
              </div>
              </>
            ) : (
              /* Add New / Detail View */
              <Box>
                <div className="glass-card">
                  <VStack spacing={6} align="stretch">
                    <Flex justify="space-between" align="center">
                      <Heading size="md" color="blue.900">Device Configuration</Heading>
                      <Button className="btn-secondary" size="sm" onClick={handleBackClick}>
                        Return to List
                      </Button>
                    </Flex>

                    {!hasClickedCameraDidInfo && (
                      <VStack spacing={6} py={4}>
                        {isMobileDevice && (
                          <Box w="full" p={4} bg="blue.50" borderRadius="xl" border="1px dashed" borderColor="blue.200">
                            <VStack spacing={3}>
                              <QRCodeScanner onScanSuccess={handleScanSuccess} />
                              <Text fontSize="xs" color="blue.600" fontWeight="700">SCAN QR CODE</Text>
                            </VStack>
                          </Box>
                        )}

                        <Box w="full">
                          <Text className="custom-label">Input Device ID Manually</Text>
                          <Autosuggest
                            ref={autosuggestRef}
                            suggestions={suggestions}
                            onSuggestionsFetchRequested={({ value, reason }) => {
                              if (reason === 'input-changed') {
                                handleInputChange(null, { newValue: value, method: 'type' });
                              }
                            }}
                            onSuggestionsClearRequested={() => setSuggestions([])}
                            getSuggestionValue={getSuggestionValue}
                            renderSuggestion={renderSuggestion}
                            inputProps={{
                              ...inputProps,
                              className: 'custom-input'
                            }}
                            onSuggestionSelected={handleSuggestionSelected}
                          />
                        </Box>

                        <Button
                          className="btn-premium"
                          w="full"
                          height="56px"
                          onClick={handleAddInputs}
                          isLoading={isFetchingCameraDetails}
                          loadingText="Validating Device..."
                        >
                          Initialize Device Connection
                        </Button>
                      </VStack>
                    )}
                  </VStack>
                </div>

                {hasClickedCameraDidInfo && (
                  <VStack spacing={6} align="stretch" className="animate-fade-in">
                    {/* Live Preview Section */}
                    {flvUrl && (
                      <div>
                        <Heading className="section-title">Live Installation Feed</Heading>
                        <div className="video-wrapper">
                          <ReactPlayer
                            url={flvUrl}
                            playing={true}
                            controls={true}
                            width="100%"
                            height="100%"
                          />
                        </div>
                      </div>
                    )}

                    <VStack spacing={{ base: 4, md: 8 }} align="stretch">
                      {/* Technical Analysis */}
                      <div className="glass-card" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
                        <Heading className="section-title" textAlign={{ base: "center", md: "left" }}>AI Technical Status Analysis</Heading>
                        {isFetchingCameraDetails ? (
                          <VStack py={{ base: 6, md: 10 }} spacing={4}>
                            <div className="loading-spinner"></div>
                            <Text fontWeight="600" color="blue.600" fontSize={{ base: "sm", md: "md" }}>Analyzing Stream Quality...</Text>
                          </VStack>
                        ) : cameraStatus ? (
                          <VStack spacing={{ base: 3, md: 5 }} align="stretch">
                            {/* Camera Angle */}
                            <Box p={{ base: 3, md: 4 }} bg={cameraAngleAcceptable ? "green.50" : "red.50"} borderRadius="xl" border="2px solid" borderColor={cameraAngleAcceptable ? "green.200" : "red.200"}>
                              <HStack justify="space-between" align="center">
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="xs" color="gray.600" fontWeight="700" textTransform="uppercase">Camera Angle</Text>
                                  <Text fontWeight="800" fontSize={{ base: "xl", md: "2xl" }} color={cameraAngleAcceptable ? "green.700" : "red.700"}>
                                    {Math.abs(cameraStatus.camera_angle)}°
                                  </Text>
                                </VStack>
                                <Box>
                                  {cameraAngleAcceptable ? (
                                    <Box w={{ base: "32px", md: "40px" }} h={{ base: "32px", md: "40px" }} borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center">
                                      <Text color="white" fontSize={{ base: "xl", md: "2xl" }}>✓</Text>
                                    </Box>
                                  ) : (
                                    <Box w={{ base: "32px", md: "40px" }} h={{ base: "32px", md: "40px" }} borderRadius="full" bg="orange.500" display="flex" alignItems="center" justifyContent="center" className="blink-warning">
                                      <FaExclamationTriangle color="white" size={16} />
                                    </Box>
                                  )}
                                </Box>
                              </HStack>
                            </Box>
                            
                            {/* Other Parameters Grid */}
                            <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(2, 1fr)" }} gap={{ base: 2, md: 4 }}>
                              {/* Blur */}
                              <Box p={{ base: 2, md: 4 }} bg="white" border="2px solid" borderColor="gray.100" borderRadius="lg" shadow="sm">
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize={{ base: "9px", md: "xs" }} color="gray.600" fontWeight="700" textTransform="uppercase">Blur</Text>
                                  {!blurChecked ? (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center">
                                      <Text color="white" fontSize={{ base: "xs", md: "sm" }}>✓</Text>
                                    </Box>
                                  ) : (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="orange.500" display="flex" alignItems="center" justifyContent="center" className="blink-warning">
                                      <FaExclamationTriangle color="white" size={10} />
                                    </Box>
                                  )}
                                </HStack>
                              </Box>

                              {/* Blackview */}
                              <Box p={{ base: 2, md: 4 }} bg="white" border="2px solid" borderColor="gray.100" borderRadius="lg" shadow="sm">
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize={{ base: "9px", md: "xs" }} color="gray.600" fontWeight="700" textTransform="uppercase">Blackview</Text>
                                  {!blackviewChecked ? (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center">
                                      <Text color="white" fontSize={{ base: "xs", md: "sm" }}>✓</Text>
                                    </Box>
                                  ) : (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="orange.500" display="flex" alignItems="center" justifyContent="center" className="blink-warning">
                                      <FaExclamationTriangle color="white" size={10} />
                                    </Box>
                                  )}
                                </HStack>
                              </Box>

                              {/* Brightness */}
                              <Box p={{ base: 2, md: 4 }} bg="white" border="2px solid" borderColor="gray.100" borderRadius="lg" shadow="sm">
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize={{ base: "9px", md: "xs" }} color="gray.600" fontWeight="700" textTransform="uppercase">Brightness</Text>
                                  {brightnessChecked ? (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center">
                                      <Text color="white" fontSize={{ base: "xs", md: "sm" }}>✓</Text>
                                    </Box>
                                  ) : (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="orange.500" display="flex" alignItems="center" justifyContent="center" className="blink-warning">
                                      <FaExclamationTriangle color="white" size={10} />
                                    </Box>
                                  )}
                                </HStack>
                              </Box>

                              {/* BlackAndWhite */}
                              <Box p={{ base: 2, md: 4 }} bg="white" border="2px solid" borderColor="gray.100" borderRadius="lg" shadow="sm">
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize={{ base: "9px", md: "xs" }} color="gray.600" fontWeight="700" textTransform="uppercase">B&W</Text>
                                  {!blackAndWhiteChecked ? (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="green.500" display="flex" alignItems="center" justifyContent="center">
                                      <Text color="white" fontSize={{ base: "xs", md: "sm" }}>✓</Text>
                                    </Box>
                                  ) : (
                                    <Box w={{ base: "18px", md: "24px" }} h={{ base: "18px", md: "24px" }} borderRadius="full" bg="orange.500" display="flex" alignItems="center" justifyContent="center" className="blink-warning">
                                      <FaExclamationTriangle color="white" size={10} />
                                    </Box>
                                  )}
                                </HStack>
                              </Box>
                            </Grid>
                          </VStack>
                        ) : (
                          <VStack py={{ base: 6, md: 10 }} bg="orange.50" borderRadius="xl" border="1px dashed" borderColor="orange.200">
                            <Text color="orange.800" fontWeight="800" fontSize={{ base: "sm", md: "md" }}>Connection Interrupted</Text>
                            <Text fontSize="xs" color="orange.600" textAlign="center" px={4}>We couldn't retrieve AI analytics. Please check device status.</Text>
                          </VStack>
                        )}
                      </div>

                      {/* Location Data Form - Professional SaaS Redesign */}
                      <div className="glass-card site-details-card" style={{ padding: '24px' }}>
                        <Heading className="section-title">
                          Installation Site Details
                        </Heading>
                        <VStack spacing={4} align="stretch" className="site-details-field-group">
                          {/* State Field */}
                          <div className="form-group" style={{ marginBottom: '0' }}>
                            <Text className="custom-label">State</Text>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <FiGlobe className="site-details-input-icon" />
                              </InputLeftElement>
                              <Input className="custom-input input-with-icon" value={state} isReadOnly size="md" />
                            </InputGroup>
                          </div>
                          
                          {/* District Field */}
                          <div className="form-group" style={{ marginBottom: '0' }}>
                            <Text className="custom-label">District Name</Text>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <FiMap className="site-details-input-icon" />
                              </InputLeftElement>
                              <Input className="custom-input input-with-icon" value={district} onChange={(e) => setDistrict(e.target.value)} isReadOnly={!isEditing} size="md" />
                            </InputGroup>
                          </div>

                          {/* Assembly Field */}
                          <div className="form-group" style={{ marginBottom: '0' }}>
                            <Text className="custom-label">Assembly Name</Text>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <FiHome className="site-details-input-icon" />
                              </InputLeftElement>
                              <Input className="custom-input input-with-icon" value={assemblyName} onChange={(e) => setAssemblyName(e.target.value)} isReadOnly={!isEditing} size="md" />
                            </InputGroup>
                          </div>
                          
                          {/* PS No & Location Info - Using simple stack for mobile thumb comfort */}
                          <div className="form-group" style={{ marginBottom: '0' }}>
                            <Text className="custom-label">PS No.</Text>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <FiHash className="site-details-input-icon" />
                              </InputLeftElement>
                              <Input className="custom-input input-with-icon" value={psNumber} onChange={(e) => setPsNumber(e.target.value)} isReadOnly={!isEditing} fontWeight="800" size="md" />
                            </InputGroup>
                          </div>

                          <div className="form-group" style={{ marginBottom: '0' }}>
                            <Text className="custom-label">Location Info</Text>
                            <InputGroup>
                              <InputLeftElement pointerEvents="none">
                                <FiMapPin className="site-details-input-icon" />
                              </InputLeftElement>
                              <Input className="custom-input input-with-icon" value={excelLocation} onChange={(e) => setExcelLocation(e.target.value)} isReadOnly={!isEditing} placeholder="e.g., Room 102, 1st Floor" size="md" />
                            </InputGroup>
                          </div>
                        </VStack>
                      </div>

                      <Stack direction={{ base: "column", sm: "row" }} spacing={{ base: 3, md: 4 }} pt={{ base: 4, md: 6 }}>
                        <Button
                          className="btn-secondary"
                          w="full"
                          onClick={() => setIsEditing(!isEditing)}
                          leftIcon={isEditing ? <FiPlus /> : <FiEdit />}
                        >
                          {isEditing ? 'Cancel Edit' : 'Edit Details'}
                        </Button>
                        {isEditing && (
                          <Button 
                            colorScheme="blue" 
                            className="btn-premium"
                            w="full" 
                            onClick={handleSubmit}
                          >
                            Save Changes
                          </Button>
                        )}
                      </Stack>
                    </VStack>
                  </VStack>
                )}
              </Box>
            )}
          </>
        )}



      {/* Shared Modals */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} isCentered>
        <ModalOverlay backdropFilter="blur(5px)" />
        <ModalContent borderRadius="xl" overflow="hidden">
          <ModalHeader textAlign="center" pt={8} color="red.700">Confirm Deletion</ModalHeader>
          <ModalBody textAlign="center" py={6}>
            <Center mb={6}>
              <Box p={4} bg="red.50" borderRadius="full">
                <Image src={Trash} alt="Delete" boxSize="64px" />
              </Box>
            </Center>
            <Text fontWeight="600" fontSize="lg">Are you absolutely sure?</Text>
            <Text color="gray.500" mt={2}>
              This will permanently remove the device <b>{cameraToDelete}</b> from the database.
            </Text>
          </ModalBody>
          <ModalFooter justifyContent="center" gap={4} pb={8}>
            <Button className="btn-secondary" onClick={closeDeleteModal} px={8}>Stay Back</Button>
            <Button colorScheme="red" onClick={handleDeleteClickConfirmed} px={8} boxShadow="lg">Confirm Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showModal} onClose={handleCloseModal} size={{ base: "sm", md: "xl" }} isCentered>
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent borderRadius="2xl" overflow="hidden" maxW={{ base: "95vw", md: "800px" }} mx={{ base: 2, md: 0 }}>
          <ModalHeader 
            bg="green.200" 
            color="white" 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center"
            px={{ base: 4, md: 6 }}
            py={{ base: 3, md: 4 }}
            fontSize={{ base: "md", md: "lg" }}
          >
            <Text isTruncated maxW={{ base: "100%", md: "full" }}>
              Live Feed: {selectedCamera?.deviceId}
            </Text>
            <ModalCloseButton color="white" position="static" m={0} />
          </ModalHeader>
          <ModalBody p={0} bg="black">
            {selectedCamera && (
              <div style={{ aspectRatio: '16/9', width: '100%' }}>
                <ReactPlayer
                  url={selectedCamera.flvUrl}
                  playing={true}
                  controls={true}
                  width="100%"
                  height="100%"
                />
              </div>
            )}
          </ModalBody>
          <ModalFooter 
            bg="gray.50" 
            flexDirection={{ base: "column", sm: "row" }} 
            justifyContent="center" 
            alignItems="center"
            gap={{ base: 3, sm: 6 }}
            py={4}
          >
          </ModalFooter>
        </ModalContent>
      </Modal>
        </Box>
      </div>
  );
};

export default withAuth(AutoInstaller);

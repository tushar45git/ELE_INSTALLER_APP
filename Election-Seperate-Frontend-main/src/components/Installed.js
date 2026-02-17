import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
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
} from '@chakra-ui/react';
import { ToastContainer, toast } from 'react-toastify';
import { addData, assignCamera, getCamera, getCameraByDid, getCamerasByAssignedBy, getDashboardDetails, getFlvLatDid, getLatLongFsv, getLatLongPolling, getSetting, installCamera, setSetting, updateCamera } from '../actions/userActions';
import { MdAdd, MdDelete, MdEdit, MdTableRows, MdVisibility } from "react-icons/md";
import withAuth from './withAuth';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import ReactPlayer from 'react-player';
import * as XLSX from 'xlsx';
import DrawerButton from './Drawer';
import { LuFlipHorizontal2, LuFlipVertical2 } from 'react-icons/lu';
import VideoModal from './modal/VideoModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Link } from 'react-router-dom';

const Installed = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [boothNo, setBoothNo] = useState('');
  const [state, setState] = useState('');
  const [excelLocation, setExcelLocation] = useState(' ');

  const [selectedDate, setSelectedDate] = useState(null);
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const [stateData, setStateData] = useState([]);
  const [totalCameras, setTotalCameras] = useState([]);
  const [installedCameras, setInstalledCameras] = useState([]);
  const [liveCameras, setLiveCameras] = useState([]);
  const [offlineCameras, setOfflineCameras] = useState([]);
  const dashboard = async () => {   // currentPage in () after async
    //   currentPage = null ? 1 : currentPage;
    try {
      const mobile = localStorage.getItem('mobile');
      const result = await getDashboardDetails();
      // console.log("sureshot",result)
      console.log("result", result)
      setTotalCameras(result.data.totalCameras);
      setInstalledCameras(result.data.installedCameras);
      setLiveCameras(result.data.totalLiveCamera);
      setOfflineCameras(result.data.totalOfflineCamera);
      setStateData(result.data.dataByState);
      console.log("setState", result.data.dataByState)
      // setTotalPages(result.pagination.totalPages)

    } catch (error) {
      toast.warning('This is a warning message.');
      // Handle error
      // alert("rekjha");
    }
    finally {

    }
  };

  useEffect(() => {
    dashboard();   //currentPage
  }, []);

  const [currentPage, setcurrentPage] = useState(1);
  const [cameraa, setCameraa] = useState([]);
  const camera = async (currentPage) => {
    currentPage = null ? 1 : currentPage;
    try {
      const mobile = localStorage.getItem('mobile');
      const result = await getLatLongPolling(state);
      // console.log("sureshot",result)
      setCameraa(result.data)
      // setTotalPages(result.pagination.totalPages)

    } catch (error) {
      toast.warning('This is a warning message.');
      // Handle error
      // alert("rekjha");
    }
    finally {

    }
  };

  const handleStateChange = async () => {
    camera();
  }

  useEffect(() => {
    camera(currentPage);

    // toast.success('Welcome', {
    //   position: 'top-right',
    //   autoClose: 1500, // 5 seconds
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    // });

    // Check if Geolocation is supported by the browser

  }, []); // Empty dependency array to run the effect only once

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };


  {/* <WorldMap /> */ }

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlvUrl, setSelectedFlvUrl] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // const openModal = async (deviceId, status, state, district, location) => {

  //   const result = await getFlvLatDid(deviceId);
  //   // console.log("sureshot",result)
  //   console.log("getflvlatfront",result.flvUrl.url2)
  //   // setTotalPages(result.pagination.totalPages)

  //   setSelectedDeviceId(deviceId);
  //   setSelectedFlvUrl(result.flvUrl.url2);
  //   setSelectedStatus(status);
  //   setSelectedState(state);
  //   setSelectedDistrict(district);
  //   setSelectedLocation(location);
  //   setModalOpen(true);
  // };

  const openModal = async (deviceId, status, state, district, location) => {
    try {
      const result = await getFlvLatDid(deviceId);
      console.log("getflvlatfront", result.flvUrl.url2);

      setSelectedDeviceId(deviceId);
      setSelectedFlvUrl(result.flvUrl.url2);
      setSelectedStatus(status);
      setSelectedState(state);
      setSelectedDistrict(district);
      setSelectedLocation(location);
      setModalOpen(true);
    } catch (error) {
      console.error("An error occurred while fetching data:", error);
      // Optionally, you can show a toast or handle the error in any other way
      toast.warning('Camera is Offline', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };


  const closeModal = () => {
    setSelectedDeviceId(null);
    setSelectedFlvUrl(null);
    setModalOpen(false);
  };

  const [hoveredDeviceId, setHoveredDeviceId] = useState(null);

  const handleMarkerMouseOver = (deviceId) => {
    setHoveredDeviceId(deviceId);
  };

  const handleMarkerMouseOut = () => {
    setHoveredDeviceId(null);
  };

  useEffect(() => {
    const initMap = () => {
      const map = new window.google.maps.Map(document.getElementById('map'), {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5
      });

      cameraa.forEach(point => {
        const latitude = parseFloat(point.latitude);
        const longitude = parseFloat(point.longitude);
        const position = { lat: latitude, lng: longitude };

        const markerIcon = {
          url: point.status === 'RUNNING' ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          // url: point.status = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32) // Adjust the size as needed
        };

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          icon: markerIcon
        });

        const infowindow = new window.google.maps.InfoWindow({
          content: `<div>DeviceId: ${point.deviceId},<br/>Name: ${point.personName},<br/>Mobile: ${point.personMobile}</div>`
        });

        marker.addListener('click', function () {
          console.log('Marker status:', openModal(point.deviceId, point.status, point.state, point.district, point.location));
        });

        marker.addListener('mouseover', () => {
          infowindow.open(map, marker);
        });

        marker.addListener('mouseout', () => {
          infowindow.close();
        });
      });
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD2CF3PlGBd0tQhusHwX3ngfPaad0pmJ_Q&callback=initMap`;
      script.defer = true;
      script.async = true;

      script.onerror = () => {
        console.error('Error loading Google Maps API script');
      };
      document.head.appendChild(script);
    }
  }, [cameraa]);



  return (
    <Container 
      maxW="full" 
      px={{ base: '4', sm: '8' }} 
      pt={{ base: '4', md: '8' }} 
      pb="max(4rem, env(safe-area-inset-bottom))" 
      style={{ margin: "0px" }}
    >
      <ToastContainer />

      <Box borderWidth="1px" borderRadius="lg" p="4" display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(1, 1fr)' }} gridGap="2">

        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Total</Text>
          <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {totalCameras}
          </Box>
        </Box>
      </Box>
      <Box borderWidth="1px" borderRadius="lg" p="4" display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }} gridGap="2" mt={8}>

        {stateData.map((state, index) => (
          // <Box key={index} stateData={state}>{state.state}</Box>
          <Box borderWidth="1px" borderRadius="lg" key={index} display='flex' flexWrap='wrap' flexDirection='column' alignItems='center' justifyContent='center'>
            {/* <Text fontWeight="bold" mb="2">{state.state}</Text> */}
            <Link to={`/state/${state.state}`}>
              <Text fontWeight="bold" cursor="pointer">{state.state}</Text>
            </Link>
            <Box display='flex' w='100%' alignItems='center' justifyContent='center'>
              <Box bg='rgba(35,106,141,0.8)' p={1} m={1} w='20%' color='white' display='flex' alignItems='center' justifyContent='center'>
                {state.totalCameras}
              </Box>
              <Box bg='#db7a39' p={1} m={1} w='20%' color='white' display='flex' alignItems='center' justifyContent='center'>
                {state.installedCameras}
              </Box>
              <Box bg='#68B187' p={1} m={1} w='20%' color='white' display='flex' alignItems='center' justifyContent='center'>
                {state.totalLiveCamera}
              </Box>
              <Box bg='#D54D4D' p={1} m={1} w='20%' color='white' display='flex' alignItems='center' justifyContent='center'>
                {state.totalOfflineCamera}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* <div>
        <label>Select Date:</label>
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          dateFormat="dd/MM/yyyy" // Adjust the date format as needed
          placeholderText="Select Date"
        />
      </div> */}
      <div style={{ display: "flex", flexWrap: "nowrap", alignItems: "center" }}>
        <Text style={{ width: "120px" }}>Select <br />State</Text>
        <Select value={state} placeholder="Select State" onChange={(e) => setState(e.target.value)}>
          <option value="PUNJAB">PUNJAB</option>
          <option value="KARNATAKA">KARNATAKA</option>
          <option value="TRIPURA">TRIPURA</option>
          <option value="UTTARAKHAND">UTTARAKHAND</option>
          <option value="MP">MP</option>
          <option value="BIHAR">BIHAR</option>
          <option value="NAGALAND">NAGALAND</option>
          <option value="MEGHALAYA">MEGHALAYA</option>
        </Select>
        <Button onClick={handleStateChange}>Submit</Button>
      </div>

      {/* {hoveredDeviceId && <p>Hovered Device ID: {hoveredDeviceId}</p>} */}

      <VideoModal isOpen={modalOpen} deviceId={selectedDeviceId} state={selectedState} district={selectedDistrict} location={selectedLocation} status={selectedStatus} flvUrl={selectedFlvUrl} onClose={closeModal} />

      {/* <WorldMap /> */}

      <div id="map" style={{ height: '50vh', width: '100%' }}></div>

      {/* Main content */}

    </Container>
  );
};

export default withAuth(Installed);

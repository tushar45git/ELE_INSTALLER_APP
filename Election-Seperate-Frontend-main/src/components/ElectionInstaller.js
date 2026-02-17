import React, { useEffect, useRef, useState } from 'react';
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
import { addData, assignCamera, getCamera, getCameraByDid, getCamerasByAssignedBy, getElectionCameraChart, getElectionUser, getElectionUserChart, getFlvLatDid, getLatLongFsv, getLatLongPolling, getSetting, installCamera, setSetting, updateCamera } from '../actions/userActions';
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
import Chart from 'chart.js/auto';


const ElectionInstaller = () => {

  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);

  const [one, setOne] = useState('');
  const [two, settwo] = useState('');
  const [three, setthree] = useState('');
  const [four, setfour] = useState('');
  const [five, setfive] = useState('');
  const [six, setsix] = useState('');
  const [seven, setseven] = useState('');
  const [eight, seteight] = useState('');
  const [nine, setnine] = useState('');
  const [ten, setten] = useState('');
  const [eleven, seteleven] = useState('');
  const [twelve, settwelve] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getElectionUserChart();
        setLastHour(result.currentHour)
        console.log('chart', result)
        console.log('one', result.oneHours);
        console.log('one1', one);
        const labels = [result.currentHours, result.oneHours, result.twoHours, result.threeHours, result.fourHours, result.fiveHours, result.sixHours, result.sevenHours, result.eightHours, result.nineHours, result.tenHours, result.elevenHours].reverse();
        const data = Object.values(result).filter(value => typeof value === 'number').reverse();;
        const sum = data.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
        console.log('Sum of numbers:', data);
        console.log('Sum of numbers:', sum);
        setChartData({
          labels: labels,
          datasets: [
            {
              label: 'Number of Users',
              data: data,
              fill: false,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }
          ]
        });

        Chart.register({
          id: 'category',
          defaults: {
            category: true
          }
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (chartData) {
      const ctx = chartRef.current.getContext('2d');

      // Check if there's an existing chart instance and destroy it
      if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
      }

      // Create a new chart instance
      chartRef.current.chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          scales: {
            x: {
              type: 'category',
              title: {
                display: true,
                text: 'Hours'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Number of Users'
              }
            }
          }
        }
      });
    }
  }, [chartData]);

  const [secondChartData, setSecondChartData] = useState(null);
  const secondChartRef = useRef(null);

  useEffect(() => {
    const fetchSecondChartData = async () => {
      try {
        // Fetch data for the second chart
        const result = await getElectionCameraChart();
        console.log("camera chart", result);
        // Process the result and set the chart data
        const labels = [result.currentHours, result.oneHours, result.twoHours, result.threeHours, result.fourHours, result.fiveHours, result.sixHours, result.sevenHours, result.eightHours, result.nineHours, result.tenHours, result.elevenHours].reverse();
        const data = Object.values(result).filter(value => typeof value === 'number').reverse();;
        setSecondChartData({
          labels: labels,
          datasets: [
            {
              label: 'Number of Installed Camera',
              data: data,
              fill: false,
              borderColor: 'rgb(192, 75, 75)',
              tension: 0.1
            }
          ]
        });
      } catch (error) {
        console.error('Error fetching second chart data:', error);
      }
    };

    fetchSecondChartData();
  }, []);

  useEffect(() => {
    if (secondChartData) {
      const ctx = secondChartRef.current.getContext('2d');

      // Check if there's an existing chart instance and destroy it
      if (secondChartRef.current.chart) {
        secondChartRef.current.chart.destroy();
      }

      // Create a new chart instance for the second chart
      secondChartRef.current.chart = new Chart(ctx, {
        type: 'line',
        data: secondChartData,
        options: {
          scales: {
            x: {
              type: 'category',
              title: {
                display: true,
                text: 'Hours'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Installed Camera'
              }
            }
          }
        }
      });
    }
  }, [secondChartData]);

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


  const [currentPage, setcurrentPage] = useState(1);
  const [cameraa, setCameraa] = useState([]);
  const [totalcount, setTotalcount] = useState('');
  const [karnataka, setKarnataka] = useState('');
  const [lastHour, setLastHour] = useState('');
  const [bihar, setBihar] = useState('');
  const [tripura, setTripura] = useState('');
  const [goa, setGoa] = useState('');
  const [mp, setMP] = useState('');
  const [gujarat, setGujarat] = useState('');
  const [punjab, setPunjab] = useState('');
  const [Telangana, setTelangana] = useState('');
  const camera = async (currentPage) => {
    currentPage = null ? 1 : currentPage;
    try {
      const mobile = localStorage.getItem('mobile');
      const result = await getElectionUser();
      console.log("sureshot", result)
      setCameraa(result.data)
      setTotalcount(result.total)
      setKarnataka(result.KARNATAKA)
      setBihar(result.BIHAR)
      setTripura(result.TRIPURA)
      setGoa(result.GOA)
      // setLastHour(result.lastHour)
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

  // const openModal = async (deviceId, status, state, district, location) => {
  //   try {
  //     const result = await getFlvLatDid(deviceId);
  //     console.log("getflvlatfront", result.flvUrl.url2);

  //     setSelectedDeviceId(deviceId);
  //     setSelectedFlvUrl(result.flvUrl.url2);
  //     setSelectedStatus(status);
  //     setSelectedState(state);
  //     setSelectedDistrict(district);
  //     setSelectedLocation(location);
  //     setModalOpen(true);
  //   } catch (error) {
  //     console.error("An error occurred while fetching data:", error);
  //     // Optionally, you can show a toast or handle the error in any other way
  //     toast.warning('Camera is Offline', {
  //       position: 'top-right',
  //       autoClose: 5000,
  //       hideProgressBar: false,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //     });
  //   }
  // };


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
          // url: point.status === 'RUNNING' ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          url: point.status = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32) // Adjust the size as needed
        };

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          icon: markerIcon
        });

        const infowindow = new window.google.maps.InfoWindow({
          content: `<div>Name: ${point.name},<br/>Mob: ${point.mobile},<br/>Date: ${point.date},<br/>Time: ${point.time},<br/>Installed: ${point.totalCounts}</div>`
        });

        marker.addListener('click', function () {
          infowindow.open(map, marker);
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

      <Box borderWidth="1px" borderRadius="lg" p="4" display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }} gridGap="2">
        {/* <Box></Box> */}
        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Total User</Text>
          <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {totalcount}
          </Box>
        </Box>


        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Last 1 Hour</Text>
          <Box bg='#db7a39' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {lastHour}
          </Box>
        </Box>

        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Karnataka</Text>
          <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {karnataka}
          </Box>
        </Box>

        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Bihar</Text>
          <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {bihar}
          </Box>
        </Box>

        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
          <Text fontWeight="bold" mb="2">Goa</Text>
          <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
            {goa}
          </Box>
        </Box>

        {/* <Box ></Box> */}


      </Box>

      <Container maxW="full" px={{ base: '0', sm: '8' }} p={4} style={{ margin: "0px" }}>
        <Box borderWidth="1px" borderRadius="lg" p="4">
          <Text fontWeight="bold" mb="2" display='flex'>Number of Users & Cameras Live per Hour</Text>
          <div style={{ width: '50%', height: '50%', display: 'flex', flexDirection: { base: 'column', md: 'row', sm: 'column' } }}> {/* Adjust the width and height as needed */}
            <canvas
              ref={chartRef}
              width="400"  // Set the width of the canvas element
              height="200" // Set the height of the canvas element
            />
            <canvas
              ref={secondChartRef}
              width="400"
              height="200"
            />
          </div>
          <div style={{ width: '50%', height: '50%' }}> {/* Adjust the width and height as needed */}
          </div>
        </Box>
      </Container>
      {/* <VideoModal isOpen={modalOpen} deviceId={selectedDeviceId} state={selectedState} district={selectedDistrict} location={selectedLocation} status={selectedStatus} flvUrl={selectedFlvUrl} onClose={closeModal} /> */}
      <div id="map" style={{ height: '60vh', width: '100%' }}></div>

      {/* Main content */}

    </Container>
  );
};

export default withAuth(ElectionInstaller);

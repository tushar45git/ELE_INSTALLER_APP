import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
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
import { addData, assignCamera, getCamera, getCameraByDid, getCamerasByAssignedBy, getSetting, installCamera, setSetting, updateCamera } from '../actions/userActions';
import { MdAdd, MdDelete, MdEdit, MdTableRows, MdVisibility } from "react-icons/md";
import withAuth from './withAuth';
// import { ReactFlvPlayer } from 'react-flv-player';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import ReactPlayer from 'react-player';
import * as XLSX from 'xlsx';
import DrawerButton from './Drawer';
import { LuFlipHorizontal2, LuFlipVertical2 } from 'react-icons/lu';
import VideoModal from './modal/VideoModal';
// import WorldMap from './WorldMap';

const Head = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [boothNo, setBoothNo] = useState('');
  const [excelLocation, setExcelLocation] = useState(' ');

  const handleAddInputs = async () => {
    setShowAdditionalInputs(true);
    const response = await getCameraByDid(deviceId);
    console.log("response", response);
    setAssemblyName(response.data.AssemblyName);
    setPsNumber(response.data.PSNumber);
    setDistrict(response.data.district);
    setExcelLocation(response.data.location);
  };

  //   const handleSubmit = async () => {
  //     // Handle the submit logic here
  //     try {
  //       const namee = localStorage.getItem('name');
  //       const mobilee = localStorage.getItem('mobile');
  //       console.log('Submitted:', namee, mobilee, deviceId, boothNo, address);
  //       let latitude = location.latitude;
  //       let longitude = location.longitude;
  //       let locationn = latitude + ',' + longitude;
  //       const response = await installCamera(deviceId, namee, mobilee, address, boothNo, assemblyName, psNumber, district, excelLocation, locationn);
  //     } catch (error) {
  //       console.error(error);
  //     }
  //   };

  const [editableCameraID, setEditableCameraID] = useState(null);
  const [installed, setInstalled] = useState('0');

  const handleEditClick = (itemId) => {
    console.log(itemId)
    setEditableCameraID(itemId);
  };

  const handleUpdateClick = async (id) => {
    try {
      console.log("getId", id)
      const response = await updateCamera(id, installed);
      console.log('Consignment updated successfully:', response.data);
      window.location.reload();
    } catch (error) {
      console.error('Error updating consignment:', error);
      // Handle error if the update request fails
    }
  };

  const [currentPage, setcurrentPage] = useState(1);
  const [cameraa, setCameraa] = useState([]);
  const camera = async (currentPage) => {
    currentPage = null ? 1 : currentPage;
    try {
      const mobile = localStorage.getItem('mobile');
      const result = await getCamerasByAssignedBy(mobile, currentPage);
      // console.log("sureshot",result)
      setCameraa(result.data)
      setTotalPages(result.pagination.totalPages)

    } catch (error) {
      toast.warning('This is a warning message.');
      // Handle error
      // alert("rekjha");
    }
    finally {

    }
  };
  // useEffect(() => {
  //   allBox();
  // }, []);

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

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Get latitude and longitude from the position object
          const { latitude, longitude } = position.coords;

          // const latitude = 23.0282826;
          // const longitude = 72.5398852;

          // Set the location in state
          setLocation({ latitude, longitude });

          // Fetch the city and state using OpenCage Geocoding API
          try {
            // This part is incomplete; you need to provide the API endpoint and parameters
            const response = await axios.get(
              // Provide your API endpoint and parameters here
              `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=6da09e29dbc54d859e03bca9a9737461`
            );

            const responsee = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=zaSyBNBVfpAQqikexY-8J0QDyBR4bWKiKe`);
            setAddress(responsee.data.results[0].formatted_address)
            console.log("su ke yogi", responsee.data)

            if (response.data.results && response.data.results.length > 0) {
              const city = response.data.results[0].components.suburb;
              const state = response.data.results[0].components.state;
              const district = response.data.results[0].components.state_district;
              // setAddress(`${city}, ${district}, ${state}`);
              console.log("locationnnnnnn", response.data.results)
            }
          } catch (error) {
            console.error('Error fetching address:', error.message);
          }
        },
        (error) => {
          console.error('Error getting location:', error.message);
        }
      );
    } else {
      console.error('Geolocation is not supported by your browser.');
    }
  }, []); // Empty dependency array to run the effect only once

  const [loadingNext, setLoadingNext] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [prevButtonDisabled, setPrevButtonDisabled] = useState(false);
  const [nextButtonDisabled, setNextButtonDisabled] = useState(false);
  const [totalPages, setTotalPages] = useState();

  const handleNextClick = async () => {

    const nextPage = currentPage + 1;
    setLoadingNext(true); // Show loading spinner
    try {
      await camera(nextPage);
      setcurrentPage(nextPage);
      console.log(currentPage);

    } finally {
      setLoadingNext(false); // Hide loading spinner
    }

  };
  const handlePrevClick = async () => {

    const PrevPage = currentPage - 1;
    setLoadingPrev(true); // Show loading spinner
    try {
      await camera(PrevPage);
      setcurrentPage(PrevPage);
    } finally {
      setLoadingPrev(false); // Hide loading spinner
    }

  };

  useState(() => {
    setPrevButtonDisabled(currentPage === 1);
    setNextButtonDisabled(currentPage === totalPages);
    // fetchCameraList(currentPage);
  }, [currentPage, totalPages]);


  const [showAdditionalInputs, setShowAdditionalInputs] = useState(false);
  const [assemblyName, setAssemblyName] = useState('');
  const [psNumber, setPsNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [realLocation, setRealLocation] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  //   new code
  const [deviceIds, setDeviceIds] = useState(['']);

  const handleDeviceIdChange = (index, event) => {
    const values = [...deviceIds];
    values[index] = event.target.value;
    setDeviceIds(values);
  };

  const handleAddDeviceId = () => {
    setDeviceIds([...deviceIds, '']);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const storedMob = localStorage.getItem('mobile');
    let latitude = location.latitude;
    let longitude = location.longitude;
    let locationn = latitude + ',' + longitude;
    const formData = {
      number: mob,
      personMobile: storedMob,
      location: locationn,
      deviceIds: deviceIds.filter(id => id.trim() !== '') // Filter out empty device IDs
    };

    try {
      const response = await assignCamera(formData.number, formData.personMobile, formData.deviceIds);
      console.log('Response from assignCamera API:', response);
      event.preventDefault();
      camera();
      setMob('');
      setDeviceIds(['']);
      // Handle the response as needed
    } catch (error) {
      console.error('Error while calling assignCamera API:', error);
      // Handle errors
    }
  };
  const handleSubmitt = async (event) => {
    event.preventDefault();
    const storedMob = localStorage.getItem('mobile');
    let latitude = location.latitude;
    let longitude = location.longitude;
    let locationn = latitude + ',' + longitude;
    const formData = {
      number: mob,
      personMobile: storedMob,
      location: locationn,
      deviceIds: deviceIds.filter(id => id.trim() !== '') // Filter out empty device IDs
    };

    try {
      const response = await addData(formData.number, formData.personMobile, formData.location, excelData);
      console.log("exceldata from submit click", excelData, response);
      console.log('Response from assignCamera API:', formData.number, formData.personMobile, formData.location, formData.deviceIds);
      console.log('Response from assignCamera API:', formData.number, formData.personMobile, formData.location, formData.deviceIds);
      event.preventDefault();

      camera(currentPage);
      // camera();
      // Handle the response as needed
    } catch (error) {
      console.error('Error while calling assignCamera API:', error);
      // Handle errors
    }
  };

  const [mob, setMob] = useState('');

  const [excelData, setExcelData] = useState(null);


  const handleUpload = async (e) => {
    const file = e.target.files[0];

    if (file) {
      try {
        const data = await readFile(file);
        processExcelData(data);
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
  };

  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsBinaryString(file);
    });
  };

  const processExcelData = (data) => {
    const workbook = XLSX.read(data, { type: 'binary' });
    let jsonData = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 0 });

      // Flatten the arrays and exclude the header row
      jsonData = jsonData.concat(sheetData.slice(0).flat());
      setExcelData(jsonData);
      console.log("suleman", jsonData);
    });

    // console.log("jsondata",jsonData);
  };

  const [isVisible, setIsVisible] = useState(false);
  const [isManually, setIsManually] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  const toggleManually = () => {
    setIsManually(!isManually);
  };

  const [showModal, setShowModal] = useState(false);

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const [selectedCamera, setSelectedCamera] = useState(null);
  const handleViewCamera = (camera) => {
    setSelectedCamera(camera);
    setShowModal(true);
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
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

    const setSet = await setSetting(response.flvUrl.prourl, modifiedData.appSettings);
  }




  {/* <WorldMap /> */ }

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFlvUrl, setSelectedFlvUrl] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  const openModal = (deviceId, flvUrl, status) => {
    setSelectedDeviceId(deviceId);
    setSelectedFlvUrl(flvUrl);
    setSelectedStatus(status);
    setModalOpen(true);
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

      cameraa?.forEach(point => {
        const latitude = parseFloat(point.latitude);
        const longitude = parseFloat(point.longitude);
        const position = { lat: latitude, lng: longitude };

        const markerIcon = {
          url: point.status === 'RUNNING' ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32) // Adjust the size as needed
        };

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          icon: markerIcon
        });

        const infowindow = new window.google.maps.InfoWindow({
          content: `<div>Device ID: ${point.deviceId}</div>`
        });

        marker.addListener('click', function () {
          console.log('Marker status:', openModal(point.deviceId, point.flvUrl, point.status));
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBNBVfpAQqikexY-8J0QDyBR4bWKiKe&callback=initMap`;
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

      {/* {hoveredDeviceId && <p>Hovered Device ID: {hoveredDeviceId}</p>} */}

      <VideoModal isOpen={modalOpen} deviceId={selectedDeviceId} status={selectedStatus} flvUrl={selectedFlvUrl} onClose={closeModal} />

      {/* <WorldMap /> */}

      <div id="map" style={{ height: '400px', width: '100%' }}></div>

      {/* Main content */}
      {location && (
        <div style={{ width: "100%" }}>

          <div>


            <div style={{ margin: "30px 0" }}>
              <Button onClick={toggleVisibility} mr={2} >Assign cameras using Excel</Button>
              {isVisible && (
                <div sx={{ display: "flex", flexDirection: "row", margin: "15px 0" }}>
                  <input type="file" accept=".xls, .xlsx" onChange={handleUpload} />
                  <Button type="submit" onClick={handleSubmitt}>Submit</Button>
                </div>
              )}

              <Button onClick={toggleManually} mr={2}>Assign Camera Manually</Button>
            </div>


            {isManually && (
              <form onSubmit={handleSubmit}>
                <Input
                  value={mob}
                  onChange={(e) => setMob(e.target.value)}
                  placeholder="Mobile Number"
                />
                {deviceIds?.map((deviceId, index) => (
                  <>
                    <div key={index} style={{ display: 'flex' }}>

                      <Input
                        value={deviceId}
                        onChange={(e) => handleDeviceIdChange(index, e)}
                        placeholder="Device ID"
                      />
                      {index === deviceIds.length - 1 && (
                        <Button backgroundColor='black' color='white' onClick={handleAddDeviceId}><MdAdd /></Button>
                      )}
                    </div>
                  </>
                ))}

                <Button type="submit">Submit</Button>
              </form>
            )}

          </div>


          <br />
          <TableContainer w={'full'} sx={{ marginBottom: "4%" }}>
            <Table variant='striped' colorScheme='grey' borderWidth="1px" borderColor="gray.200">
              <TableCaption>Camera Added</TableCaption>
              <Thead>
                <Tr>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Sr.No.</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Assignee Name</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Assignee Number</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Device ID</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Installed</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Assembly Name</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>District</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>PsNo</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Last Seen</Th>
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Video Feed</Th>
                  {/* <Th>Name</Th> */}
                  {/* <Th>Mobile</Th> */}
                  <Th borderRight="1px" borderColor="gray.300" bgColor='black' color='white'>Edit/Delete</Th>
                  {/* <Th isNumeric>multiply by</Th> */}
                </Tr>
              </Thead>
              <Tbody>
                {cameraa?.map((camera, index) => (
                  <Tr key={camera.id} bg={index % 2 === 0 ? 'gray.100' : 'white'}>
                    <Td borderRight="1px" borderColor="gray.300">{index + 1}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.personName}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.personMobile}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.deviceId}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.status === "RUNNING" ? (
                      <span>🟢</span>
                    ) : (
                      <span>🔴</span>
                    )}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.assemblyName}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.district}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.psNo}</Td>
                    <Td borderRight="1px" borderColor="gray.300">{camera.lastSeen}</Td>
                    {/* <Td>{camera.installed}</Td> */}
                    {/* {editableCameraID === camera.id ? (
                      <Select value={installed}
                        onChange={(e) => setInstalled(e.target.value)}>
                        <option value="1">🟢</option>
                        <option value="0">🔴</option>
                      </Select>
                    ) : (
                      <Td>
                        {camera.status === "RUNNING" ? (
                          <span>🟢</span>
                        ) : (
                          <span>🔴</span>
                        )}
                      </Td>
                    )} */}


                    <Td borderRight="1px" borderColor="gray.300"> <IconButton
                      marginLeft={2}
                      marginRight={2}
                      onClick={() => handleViewCamera(camera)}
                      colorScheme="blue"
                      style={{ padding: 0, transform: 'scale(0.8)' }}
                      aria-label="View details"
                    >
                      <MdVisibility />
                    </IconButton> </Td>
                    {/* <Td>{camera.mobile}</Td> */}
                    <Td borderRight="1px" borderColor="gray.300">
                      {editableCameraID === camera.id ? (
                        <Button onClick={() => handleUpdateClick(camera.deviceId)} colorScheme="green">
                          Update
                        </Button>
                      ) : (
                        <>
                          <div style={{ display: "flex" }}>
                            <IconButton
                              marginLeft={2}
                              marginRight={2}
                              onClick={() => handleEditClick(camera.id)}
                              colorScheme="blue"
                              style={{ padding: 0, transform: 'scale(0.8)' }}
                            >
                              <MdEdit />
                            </IconButton>

                            {/* <Button onClick={() => handleUpload(box.ConsignmentNo)}>
                              UPL
                            </Button> */}

                            <Button
                              // onClick={() => handleDeleteClick(box._id)}
                              colorScheme="red"
                              style={{ padding: 0 }}
                            >
                              <MdDelete style={{ color: "rgb(200,0,0)" }} />
                            </Button>
                            {/* <Button
                              onClick={() => handleUpload(box.ConsignmentNo)}
                              colorScheme="red"
                              style={{ padding: 0 }}
                            >
                              <ExportOutlined style={{ color: "rgb(200,0,0)" }} />
                            </Button> */}
                          </div>
                        </>
                      )}
                    </Td>
                    {/* <Td>{camera.cameraCount}</Td> */}
                    {/* <Td>{new Date(camera.date).toLocaleString(undefined, { timeZone: 'UTC' })}</Td> */}
                    {/* <Td>
                    <Button
                      // variant='contained'
                      onClick={() => handleButtonClick(box.boxName)}
                    >
                      <VisibilityIcon />
                    </Button>
                  </Td> */}
                  </Tr>
                ))}
                {/* <Tr>
                  <Td>inches</Td>
                  <Td>millimetres (mm)</Td>
                  <Td isNumeric>25.4</Td>
                </Tr> */}

              </Tbody>
              {/* <Tfoot>
                <Tr>
                  <Th>To convert</Th>
                  <Th>into</Th>
                  <Th isNumeric>multiply by</Th>
                </Tr>
              </Tfoot> */}
            </Table>
          </TableContainer>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {/* {currentPage}/{totalPages} */}
            <Button sx={{ marginRight: '5px' }} hidden={currentPage === 1} onClick={handlePrevClick} startIcon={<MdAdd />} >
              {loadingPrev ? <CircularProgress isIndeterminate size={10} /> : 'Prev'}
            </Button>
            <Button hidden={currentPage === totalPages} onClick={handleNextClick} startIcon={<MdAdd />} >
              {loadingNext ? <CircularProgress isIndeterminate size={10} /> : 'Next'}
            </Button>
          </div>

          <Modal isOpen={showModal} onClose={handleCloseModal}>
            <ModalOverlay />
            <ModalContent>
              {/* <ModalHeader>View Camera</ModalHeader> */}
              <ModalCloseButton />
              <ModalBody>
                {selectedCamera && (
                  <>
                    <ModalHeader>{selectedCamera.deviceId}</ModalHeader>
                    <ReactPlayer
                      url={selectedCamera.flvUrl}
                      playing={true}
                      controls={true}
                      width="100%"
                      height="400px"
                    />
                    <Flex justifyContent="space-between" mt={4} mb={4}>
                      <Button colorScheme="blue" mt={4} onClick={() => handleGetData(selectedCamera.deviceId, 'flip')}>
                        Flip &nbsp;<LuFlipVertical2 />
                      </Button>
                      <Button colorScheme="blue" mt={4} onClick={() => handleGetData(selectedCamera.deviceId, 'mirror')}>
                        Mirror &nbsp;<LuFlipHorizontal2 />
                      </Button>
                    </Flex>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="blue" mr={3} onClick={handleCloseModal}>
                  Close
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* <div style={{ display: "flex", flexWrap: "wrap" }}>
            {cameraa.map((camera) => (
              <>
                <div style={{ display: "flex", flexDirection: "column", margin: "20px" }}>
                  <h1>{camera.deviceId}</h1>
                  <ReactPlayer
                    url={camera.flvUrl}
                    playing={false}
                    controls={true}
                    width="200px"
                    height="200px"
                  />
                </div>
              </>
            ))}
          </div> */}

          {/* <Text>
            Latitude: {location.latitude}, Longitude: {location.longitude}
          </Text> */}
        </div>

      )}
    </Container>
  );
};

export default withAuth(Head);

import React, { useEffect, useState } from 'react';
import { Box, Button, CardFooter, CardHeader, Container, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay, Text } from '@chakra-ui/react';
import { MdAdd, MdTableRows } from "react-icons/md";
import Header from './Header';
import { getDashboardDetails } from '../actions/userActions';
import { ToastContainer, toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import withAuth from './withAuth';

const Dashboard = ({ drawerContent }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // const [currentPage, setcurrentPage] = useState(1);



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

    return (
        <>
            <Container 
                maxW="full" 
                px={{ base: '4', sm: '8' }} 
                pt={{ base: '4', md: '8' }} 
                pb="max(4rem, env(safe-area-inset-bottom))" 
                style={{ margin: "0px" }}
            >
                <ToastContainer />
                <Box borderWidth="1px" borderRadius="lg" p="4" display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(6, 1fr)' }} gridGap="2">
                    <Box></Box>
                    <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
                        <Text fontWeight="bold" mb="2">Total</Text>
                        <Box bg='rgba(35,106,141,0.8)' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
                            {totalCameras}
                        </Box>
                    </Box>


                    <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
                        <Text fontWeight="bold" mb="2">Installed</Text>
                        <Box bg='#db7a39' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
                            {installedCameras}
                        </Box>
                    </Box>

                    <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
                        <Text fontWeight="bold" mb="2">Live</Text>
                        <Box bg='#68B187' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
                            {liveCameras}
                        </Box>
                    </Box>

                    <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
                        <Text fontWeight="bold" mb="2">Offline</Text>
                        <Box bg='#D54D4D' w='100%' p={2} color='white' display='flex' alignItems='center' justifyContent='center'>
                            {offlineCameras}
                        </Box>
                    </Box>

                    <Box ></Box>


                </Box>

                <Box borderWidth="1px" borderRadius="lg" p="4" display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }} gridGap="2" mt={8}>

                    {stateData.map((state, index) => (
                        // <Box key={index} stateData={state}>{state.state}</Box>
                        <Box  borderWidth="1px" borderRadius="lg" key={index} display='flex' flexWrap='wrap' flexDirection='column' alignItems='center' justifyContent='center'>
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

            </Container>
        </>
    );
};

export default withAuth(Dashboard);

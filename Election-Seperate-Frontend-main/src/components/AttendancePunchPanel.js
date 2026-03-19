import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    VStack,
    HStack,
    Text,
    Image,
    useToast,
    Spinner,
    Badge,
    Card,
    CardBody,
    Divider
} from '@chakra-ui/react';
import { MdCamera, MdLocationOn, MdAccessTime } from 'react-icons/md';
import axios from 'axios';

const AttendancePunchPanel = ({ onSuccess, onClose }) => {
    const [todayStatus, setTodayStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [location, setLocation] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const toast = useToast();

    const userId = localStorage.getItem('mobile');
    const userName = localStorage.getItem('name');

    useEffect(() => {
        console.log('AttendancePunchPanel mounted');
        
        fetchTodayStatus();
        getLocation();
        
        // Cleanup on unmount
        return () => {
            console.log('AttendancePunchPanel unmounting - cleaning up camera');
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const fetchTodayStatus = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/attendance/today-status?userId=${userId}`
            );
            setTodayStatus(response.data.data);
        } catch (error) {
            console.error('Error fetching status:', error);
        } finally {
            setCheckingStatus(false);
        }
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    toast({
                        title: 'Location Error',
                        description: 'Please enable location services',
                        status: 'error',
                        duration: 3000,
                        position: 'top'
                    });
                }
            );
        }
    };

    const startCamera = async () => {
        try {
            console.log('Starting camera preview...');
            setCapturing(true);
            
            // Stop any existing streams first
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            console.log('Camera stream obtained');
            console.log('videoRef.current exists:', !!videoRef.current);
            
            if (videoRef.current) {
                console.log('Video element found, assigning stream');
                videoRef.current.srcObject = stream;
                console.log('Stream assigned to video element');
                
                // Try to play immediately
                try {
                    await videoRef.current.play();
                    console.log('Video playing successfully');
                } catch (playError) {
                    console.log('Play error, waiting for metadata...', playError);
                    // If play fails, wait for metadata
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('Metadata timeout')), 5000);
                        videoRef.current.onloadedmetadata = () => {
                            clearTimeout(timeout);
                            console.log('Metadata loaded');
                            videoRef.current.play()
                                .then(() => {
                                    console.log('Video playing after metadata');
                                    resolve();
                                })
                                .catch(reject);
                        };
                    });
                }
                
                // Set camera active
                setCameraActive(true);
                console.log('Camera active set to true - state should update now');
                
                // Force a small delay to ensure state updates
                setTimeout(() => {
                    console.log('Camera active state after delay:', cameraActive);
                }, 100);
                
                toast({
                    title: 'Camera Ready',
                    description: 'Click "Capture Photo" when ready',
                    status: 'info',
                    duration: 2000,
                    position: 'top'
                });
            }
        } catch (error) {
            console.error('Camera error:', error);
            setCameraActive(false);
            
            // Stop any streams on error
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            
            toast({
                title: 'Camera Error',
                description: error.name === 'NotAllowedError' 
                    ? 'Camera permission denied. Please allow camera access.' 
                    : `Unable to access camera: ${error.message}`,
                status: 'error',
                duration: 5000,
                position: 'top'
            });
        } finally {
            setCapturing(false);
        }
    };

    const takePhoto = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!video || !canvas) {
            toast({
                title: 'Error',
                description: 'Camera not ready',
                status: 'error',
                duration: 2000,
                position: 'top'
            });
            return;
        }

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            toast({
                title: 'Please Wait',
                description: 'Camera is loading...',
                status: 'warning',
                duration: 2000,
                position: 'top'
            });
            return;
        }

        console.log('Taking photo...');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                setPhoto(blob);
                console.log('Photo captured, size:', blob.size);
                
                toast({
                    title: 'Photo Captured',
                    description: 'Photo captured successfully. You can retake or punch in.',
                    status: 'success',
                    duration: 3000,
                    position: 'top'
                });
            }
        }, 'image/jpeg', 0.95);
    };

    const retakePhoto = () => {
        console.log('Retaking photo...');
        setPhoto(null);
        
        // Camera is still active, just clear the photo
        // User can capture again without reopening camera
        
        toast({
            title: 'Ready to Capture',
            description: 'Click "Capture Photo" to take a new photo',
            status: 'info',
            duration: 2000,
            position: 'top'
        });
    };

    const handlePunchIn = async () => {
        if (!location) {
            toast({
                title: 'Location Required',
                description: 'Please enable location',
                status: 'warning',
                duration: 3000,
                position: 'top'
            });
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('userName', userName);
        formData.append('userMobile', userId);
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
        
        // Only append photo if it exists
        if (photo) {
            console.log('Photo exists, size:', photo.size);
            formData.append('photo', photo, 'punch-in.jpg');
        } else {
            console.log('No photo captured');
        }

        try {
            console.log('Sending punch-in request...');
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/attendance/punch-in`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            console.log('Punch-in response:', response.data);

            // Don't show toast here - parent component will show it via onSuccess
            setPhoto(null);
            setCameraActive(false);
            fetchTodayStatus();
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error('Punch-in error:', error);
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Something went wrong',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePunchOut = async () => {
        if (!location) {
            toast({
                title: 'Location Required',
                description: 'Please enable location',
                status: 'warning',
                duration: 3000,
                position: 'top'
            });
            return;
        }

        setLoading(true);

        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
        
        // Only append photo if it exists
        if (photo) {
            formData.append('photo', photo, 'punch-out.jpg');
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/attendance/punch-out`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            // Don't show toast here - parent component will show it via onSuccess
            setPhoto(null);
            setCameraActive(false);
            fetchTodayStatus();
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Something went wrong',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
        } finally {
            setLoading(false);
        }
    };

    if (checkingStatus) {
        return (
            <Box display="flex" justifyContent="center" p={10}>
                <Spinner size="xl" color="purple.500" />
            </Box>
        );
    }

    const isPunchedIn = todayStatus?.status === 'punched-in';
    const isPunchedOut = todayStatus?.status === 'punched-out';

    return (
        <VStack spacing={6}>
            {/* Today's Status */}
            {todayStatus && (
                <Card w="100%" bg={isPunchedOut ? 'green.50' : 'blue.50'}>
                    <CardBody>
                        <VStack align="start" spacing={2}>
                            <HStack>
                                <Badge colorScheme={isPunchedOut ? 'green' : 'blue'} fontSize="md">
                                    {todayStatus.status.toUpperCase()}
                                </Badge>
                            </HStack>
                            <HStack>
                                <MdAccessTime />
                                <Text fontSize="sm">
                                    Punch In: {new Date(todayStatus.punchInTime).toLocaleString()}
                                </Text>
                            </HStack>
                            {todayStatus.punchOutTime && (
                                <>
                                    <HStack>
                                        <MdAccessTime />
                                        <Text fontSize="sm">
                                            Punch Out: {new Date(todayStatus.punchOutTime).toLocaleString()}
                                        </Text>
                                    </HStack>
                                    <Text fontSize="sm" fontWeight="bold" color="green.600">
                                        Work Duration: {todayStatus.workDuration} minutes
                                    </Text>
                                </>
                            )}
                        </VStack>
                    </CardBody>
                </Card>
            )}

            {/* Location Status */}
            <HStack w="100%" justify="center" p={3} bg={location ? 'green.100' : 'red.100'} borderRadius="md">
                <MdLocationOn />
                <Text fontSize="sm">
                    {location
                        ? `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : 'Location not available'}
                </Text>
            </HStack>

            {/* Camera Section */}
            {!isPunchedOut && (
                <Box w="100%" p={4}>
                    <VStack spacing={4}>
                        {/* Debug info */}
                        
                        
                        {/* Video element - always rendered but hidden when not active */}
                        <Box w="100%" maxW="500px">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    minHeight: '300px',
                                    borderRadius: '8px',
                                    border: '3px solid #48BB78',
                                    backgroundColor: '#000',
                                    display: cameraActive && !photo ? 'block' : 'none'
                                }}
                            />
                            {/* Show captured photo if exists */}
                            {photo && cameraActive && (
                                <Image
                                    src={URL.createObjectURL(photo)}
                                    w="100%"
                                    borderRadius="8px"
                                    border="3px solid #48BB78"
                                    alt="Captured attendance photo"
                                />
                            )}
                        </Box>

                        {/* Camera Buttons */}
                        <VStack spacing={3} w="100%" maxW="500px">
                            {/* Show "Open Camera" button initially */}
                            {!cameraActive && (
                                <Button
                                    onClick={startCamera}
                                    colorScheme="blue"
                                    leftIcon={<MdCamera />}
                                    w="100%"
                                    size="lg"
                                    isLoading={capturing}
                                    loadingText="Opening Camera..."
                                    cursor="pointer"
                                    _hover={{ transform: 'scale(1.02)' }}
                                    _active={{ transform: 'scale(0.98)' }}
                                >
                                    Open Camera
                                </Button>
                            )}

                            {/* Show "Capture Photo" and "Retake Photo" when camera is active */}
                            {cameraActive && (
                                <HStack spacing={3} w="100%">
                                    <Button
                                        onClick={takePhoto}
                                        colorScheme="green"
                                        leftIcon={<MdCamera />}
                                        flex={1}
                                        size="lg"
                                        cursor="pointer"
                                        _hover={{ transform: 'scale(1.02)' }}
                                        _active={{ transform: 'scale(0.98)' }}
                                    >
                                        Capture Photo
                                    </Button>
                                    <Button
                                        onClick={retakePhoto}
                                        colorScheme="orange"
                                        flex={1}
                                        size="lg"
                                        isDisabled={loading}
                                        cursor="pointer"
                                        _hover={{ transform: 'scale(1.02)' }}
                                        _active={{ transform: 'scale(0.98)' }}
                                    >
                                        Retake Photo
                                    </Button>
                                </HStack>
                            )}
                        </VStack>
                    </VStack>
                </Box>
            )}

            <Divider />

            {/* Hidden canvas for photo capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Action Buttons */}
            {!isPunchedOut && (
                <VStack w="100%" spacing={3}>
                    {!isPunchedIn ? (
                        <Button
                            onClick={handlePunchIn}
                            colorScheme="green"
                            isLoading={loading}
                            size="lg"
                            w="100%"
                            isDisabled={!location}
                        >
                            Punch In
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePunchOut}
                            colorScheme="red"
                            isLoading={loading}
                            size="lg"
                            w="100%"
                        >
                            Punch Out
                        </Button>
                    )}
                </VStack>
            )}

            {isPunchedOut && (
                <Text color="green.600" fontWeight="bold" fontSize="lg" textAlign="center">
                    You have completed your attendance for today!
                </Text>
            )}
        </VStack>
    );
};

export default AttendancePunchPanel;

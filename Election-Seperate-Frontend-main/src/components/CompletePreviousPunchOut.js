import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    ModalFooter,
    Button,
    VStack,
    Text,
    Input,
    FormControl,
    FormLabel,
    useToast,
    Badge,
    Box,
    Divider,
    Image,
    HStack
} from '@chakra-ui/react';
import { MdWarning, MdCamera, MdRefresh } from 'react-icons/md';
import axios from 'axios';
import './CompletePreviousPunchOut.css';

/**
 * CompletePreviousPunchOut Component
 * 
 * Mobile Responsiveness Features:
 * - Full-screen modal on mobile devices (max-width: 480px)
 * - Responsive datetime picker that prevents calendar overflow
 * - Proper touch targets (min 44px) for accessibility
 * - Prevents horizontal scrolling on mobile
 * - Camera integration with mobile-optimized controls
 * - Stacked button layout on small screens
 * - Viewport-constrained calendar popup positioning
 */
const CompletePreviousPunchOut = ({ isOpen, onClose, onSuccess }) => {
    const [incompleteRecords, setIncompleteRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [punchOutTime, setPunchOutTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState(null);
    const [photo, setPhoto] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const toast = useToast();
    const userId = localStorage.getItem('mobile');

    // Format date to "12 March 2026" format
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    useEffect(() => {
        if (isOpen) {
            fetchIncompleteRecords();
            getLocation();
            
            // Add mobile viewport constraint for datetime picker
            const addMobileConstraints = () => {
                const style = document.createElement('style');
                style.id = 'mobile-datetime-constraints';
                style.textContent = `
                    @media (max-width: 480px) {
                        /* Force any calendar popup to stay within viewport */
                        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                            position: relative !important;
                        }
                        
                        /* Ensure modal and all children respect viewport */
                        .complete-punchout-modal,
                        .complete-punchout-modal * {
                            max-width: 100vw !important;
                            overflow-x: hidden !important;
                        }
                        
                        /* Additional constraint for webkit calendar popups */
                        .complete-punchout-modal .datetime-picker-input {
                            /* Prevent calendar from expanding beyond container */
                            contain: layout style paint !important;
                        }
                    }
                `;
                
                if (!document.getElementById('mobile-datetime-constraints')) {
                    document.head.appendChild(style);
                }
            };
            
            addMobileConstraints();
        } else {
            // Clean up styles when modal closes
            const existingStyle = document.getElementById('mobile-datetime-constraints');
            if (existingStyle) {
                existingStyle.remove();
            }
        }
        
        // Cleanup camera on unmount
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            
            // Clean up styles
            const existingStyle = document.getElementById('mobile-datetime-constraints');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, [isOpen]);

    const getLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });
                },
                (error) => {
                    console.error('Location error:', error);
                    toast({
                        title: 'Location Error',
                        description: 'Unable to get location. Punch-out will be saved without location.',
                        status: 'warning',
                        duration: 3000,
                        position: 'top'
                    });
                }
            );
        }
    };

    const startCamera = async () => {
        try {
            console.log('Starting camera...');
            console.log('videoRef.current:', videoRef.current);
            setCapturing(true);
            
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });

            console.log('Got camera stream:', stream);

            // Wait a bit for the ref to be available
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (videoRef.current) {
                console.log('Setting stream to video element');
                videoRef.current.srcObject = stream;
                setCameraActive(true);
                console.log('Camera activated successfully');
                
                // Wait for video to be ready
                setTimeout(() => {
                    toast({
                        title: 'Camera Ready',
                        description: 'Click "Capture Photo" when ready',
                        status: 'info',
                        duration: 2000,
                        position: 'top'
                    });
                }, 100);
            } else {
                console.error('videoRef.current is null!');
                stream.getTracks().forEach(track => track.stop());
                throw new Error('Video element not available');
            }
        } catch (error) {
            console.error('Camera error:', error);
            setCameraActive(false);
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

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                setPhoto(blob);
                toast({
                    title: 'Photo Captured',
                    description: 'Photo captured successfully',
                    status: 'success',
                    duration: 2000,
                    position: 'top'
                });
            }
        }, 'image/jpeg', 0.95);
    };

    const retakePhoto = () => {
        setPhoto(null);
        toast({
            title: 'Ready to Capture',
            description: 'Click "Capture Photo" to take a new photo',
            status: 'info',
            duration: 2000,
            position: 'top'
        });
    };

    const fetchIncompleteRecords = async () => {
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/attendance/incomplete-punch-ins?userId=${userId}`
            );
            setIncompleteRecords(response.data.data);
        } catch (error) {
            console.error('Error fetching incomplete records:', error);
        }
    };

    const handleSelectRecord = (record) => {
        setSelectedRecord(record);
        // Set default punch-out time to end of that day (11:59 PM)
        const defaultTime = `${record.date}T23:59`;
        setPunchOutTime(defaultTime);
    };

    const handleDateTimeChange = (e) => {
        setPunchOutTime(e.target.value);
        
        // On mobile, ensure the input stays within bounds after interaction
        if (window.innerWidth <= 480) {
            setTimeout(() => {
                const input = e.target;
                if (input) {
                    // Ensure input is still within viewport
                    input.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }, 100);
        }
    };

    const handleComplete = async () => {
        if (!selectedRecord) {
            toast({
                title: 'Error',
                description: 'Please select a record',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
            return;
        }

        if (!punchOutTime) {
            toast({
                title: 'Time Required',
                description: 'Please enter the punch-out time',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
            return;
        }

        if (!photo) {
            toast({
                title: 'Photo Required',
                description: 'Please capture a photo before completing punch-out',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('attendanceId', selectedRecord._id);
            // Use manually entered time for punch-out
            formData.append('punchOutTime', new Date(punchOutTime).toISOString());
            
            // Add location if available
            if (location) {
                formData.append('latitude', location.latitude);
                formData.append('longitude', location.longitude);
            }

            // Add photo (required)
            formData.append('photo', photo, 'late-punch-out.jpg');

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/attendance/complete-previous-punchout`,
                formData
            );

            toast({
                title: 'Success',
                description: 'Previous day punch-out completed successfully',
                status: 'success',
                duration: 3000,
                position: 'top'
            });

            setSelectedRecord(null);
            setPunchOutTime('');
            setPhoto(null);
            setCameraActive(false);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            fetchIncompleteRecords();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to complete punch-out',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size={{ base: "full", md: "lg" }} 
            scrollBehavior="inside"
            motionPreset="slideInBottom"
            className="complete-punchout-modal"
        >
            <ModalOverlay />
            <ModalContent 
                mx={{ base: 0, md: 4 }}
                my={{ base: 0, md: 4 }}
                maxH={{ base: "100vh", md: "90vh" }}
                borderRadius={{ base: 0, md: "lg" }}
                overflow="hidden"
                position="relative"
                sx={{
                    // Ensure modal content stays within viewport
                    '@media (max-width: 768px)': {
                        width: '100vw',
                        height: '100vh',
                        margin: 0,
                        borderRadius: 0,
                        '& .chakra-modal__body': {
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            padding: '16px'
                        }
                    }
                }}
            >
                <ModalHeader>Complete Previous Day Punch-Out</ModalHeader>
                <ModalCloseButton />
                <ModalBody 
                    overflowX="hidden" 
                    overflowY="auto"
                    px={{ base: 4, md: 6 }}
                    py={{ base: 4, md: 6 }}
                >
                    <Box 
                        w="100%" 
                        maxW="100%" 
                        overflow="hidden"
                        sx={{
                            // Prevent any child elements from overflowing
                            '& *': {
                                maxWidth: '100% !important',
                                boxSizing: 'border-box'
                            }
                        }}
                    >
                        <VStack spacing={4} align="stretch" w="100%">
                        {incompleteRecords.length === 0 ? (
                            <Text color="gray.500" textAlign="center" py={4}>
                                No incomplete punch-ins found
                            </Text>
                        ) : (
                            <>
                                <Box>
                                    <Text fontWeight="bold" mb={2} color="orange.600">
                                        <MdWarning style={{ display: 'inline', marginRight: '8px' }} />
                                        You have {incompleteRecords.length} incomplete punch-in(s)
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                        Select a record below to complete the punch-out
                                    </Text>
                                </Box>

                                <Divider />

                                {incompleteRecords.map((record) => (
                                    <Box
                                        key={record._id}
                                        p={3}
                                        borderWidth="1px"
                                        borderRadius="md"
                                        cursor="pointer"
                                        bg={selectedRecord?._id === record._id ? 'purple.50' : 'white'}
                                        borderColor={selectedRecord?._id === record._id ? 'purple.500' : 'gray.200'}
                                        onClick={() => handleSelectRecord(record)}
                                        _hover={{ bg: 'gray.50' }}
                                        className="record-item"
                                    >
                                        <Text fontWeight="bold" className="record-date">
                                            Date: {formatDate(record.date)}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600" className="record-time">
                                            Punch In: {new Date(record.punchInTime).toLocaleString()}
                                        </Text>
                                        <Badge colorScheme="orange" mt={1} className="record-badge">Incomplete</Badge>
                                    </Box>
                                ))}

                                        {selectedRecord && (
                                            <>
                                                <Divider />

                                                <Box p={2} bg="green.50" borderRadius="md" className="location-info">
                                                    <Text fontSize="sm" color="green.700">
                                                        📍 Location: {location 
                                                            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` 
                                                            : 'Getting location...'}
                                                    </Text>
                                                    
                                                </Box>

                                                <FormControl className="mobile-form-control">
                                                    <FormLabel fontWeight="bold" color="purple.600" className="mobile-form-label">
                                                        Punch-Out Date & Time *
                                                    </FormLabel>
                                                    <Box className="datetime-picker-container mobile-datetime-wrapper">
                                                        <Input
                                                            type="datetime-local"
                                                            value={punchOutTime}
                                                            onChange={handleDateTimeChange}
                                                            max={new Date().toISOString().slice(0, 16)}
                                                            size="lg"
                                                            borderColor="purple.300"
                                                            _focus={{ borderColor: "purple.500", boxShadow: "0 0 0 1px #805AD5" }}
                                                            className="datetime-picker-input"
                                                        />
                                                    </Box>
                                                    <Text fontSize="xs" color="gray.500" mt={1} className="mobile-help-text">
                                                        Enter the actual time you left on {formatDate(selectedRecord.date)}
                                                    </Text>
                                                </FormControl>

                                                <Box className="camera-section">
                                                    {console.log('Camera states:', { cameraActive, photo, capturing })}
                                                    
                                                    {/* Always render video element but hide when not active */}
                                                    <video
                                                        ref={videoRef}
                                                        autoPlay
                                                        playsInline
                                                        className="camera-video"
                                                        style={{ 
                                                            width: '100%', 
                                                            display: cameraActive && !photo ? 'block' : 'none',
                                                            border: cameraActive ? '3px solid #48BB78' : 'none',
                                                            borderRadius: '8px',
                                                            backgroundColor: 'black'
                                                        }}
                                                    />
                                                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                                                    
                                                    {!cameraActive && !photo && (
                                                        <Button
                                                            leftIcon={<MdCamera />}
                                                            colorScheme="blue"
                                                            onClick={startCamera}
                                                            isLoading={capturing}
                                                            width="100%"
                                                            size="lg"
                                                        >
                                                            {capturing ? 'Starting Camera...' : 'Start Camera'}
                                                        </Button>
                                                    )}

                                                    {cameraActive && !photo && (
                                                        <VStack spacing={3} mt={3}>
                                                            <Text color="green.600" fontWeight="bold">Camera is active!</Text>
                                                            <Box className="camera-buttons">
                                                                <Button
                                                                    leftIcon={<MdCamera />}
                                                                    colorScheme="green"
                                                                    onClick={takePhoto}
                                                                    size="lg"
                                                                >
                                                                    Capture Photo
                                                                </Button>
                                                            </Box>
                                                        </VStack>
                                                    )}

                                                    {photo && (
                                                        <VStack spacing={3}>
                                                            <Box
                                                                borderWidth="3px"
                                                                borderColor="green.400"
                                                                borderRadius="lg"
                                                                overflow="hidden"
                                                                width="100%"
                                                                className="photo-preview"
                                                            >
                                                                <Image
                                                                    src={URL.createObjectURL(photo)}
                                                                    alt="Captured"
                                                                    width="100%"
                                                                />
                                                            </Box>
                                                            <Box className="button-group">
                                                                <Button
                                                                    leftIcon={<MdCamera />}
                                                                    colorScheme="gray"
                                                                    variant="outline"
                                                                    onClick={retakePhoto}
                                                                    size="lg"
                                                                >
                                                                    Retake Photo
                                                                </Button>
                                                                <Button
                                                                    colorScheme="purple"
                                                                    onClick={handleComplete}
                                                                    isLoading={loading}
                                                                    isDisabled={!punchOutTime}
                                                                    size="lg"
                                                                >
                                                                    Punch Out
                                                                </Button>
                                                            </Box>
                                                        </VStack>
                                                    )}
                                                </Box>
                                            </>
                                        )}
                            </>
                        )}
                        </VStack>
                    </Box>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default CompletePreviousPunchOut;

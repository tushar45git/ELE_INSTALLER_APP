import React, { useState } from 'react';
import {
    Box,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    VStack,
    Heading,
    useToast,
    HStack,
    Flex
} from '@chakra-ui/react';
import { MdAccessTime, MdHistory } from 'react-icons/md';
import AttendancePunchPanel from './AttendancePunchPanel';
import AttendanceTable from './AttendanceTable';
import CompletePreviousPunchOut from './CompletePreviousPunchOut';
import './auto-installer.css';

const AttendanceManagement = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isPreviousOpen, onOpen: onPreviousOpen, onClose: onPreviousClose } = useDisclosure();
    const [refreshKey, setRefreshKey] = useState(0);
    const toast = useToast();

    const handlePunchSuccess = () => {
        setRefreshKey(prev => prev + 1);
        toast({
            title: 'Success',
            description: 'Attendance recorded successfully',
            status: 'success',
            duration: 3000,
            position: 'top'
        });
    };

    return (
        <div className="main-wrapper">
            <Box className="animate-fade-in">
                <Box mb={4} />
                <Flex 
                    justifyContent="space-between" 
                    alignItems={{ base: "flex-start", md: "center" }} 
                    mb={5} 
                    flexDirection={{ base: 'column', md: 'row' }}
                    gap={3}
                >
                    <Heading size={{ base: "md", md: "lg" }} color="purple.600">
                        Attendance Management
                    </Heading>
                    <Flex 
                        gap={3} 
                        w={{ base: '100%', md: 'auto' }}
                        flexDirection={{ base: 'column', sm: 'row' }}
                    >
                        <Button
                            leftIcon={<MdHistory />}
                            colorScheme="orange"
                            variant="outline"
                            onClick={onPreviousOpen}
                            flex={{ base: 1, md: 'initial' }}
                            size={{ base: "lg", md: "md" }}
                            fontWeight="semibold"
                            borderRadius="md"
                            minH="48px"
                            px={6}
                        >
                            Complete Previous Day
                        </Button>
                        <Button
                            leftIcon={<MdAccessTime />}
                            colorScheme="purple"
                            onClick={onOpen}
                            flex={{ base: 1, md: 'initial' }}
                            size={{ base: "lg", md: "md" }}
                            fontWeight="semibold"
                            borderRadius="md"
                            minH="48px"
                            px={6}
                        >
                            Add Attendance
                        </Button>
                    </Flex>
                </Flex>

                <AttendanceTable key={refreshKey} />
            </Box>

            {/* Add Attendance Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Mark Attendance</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <AttendancePunchPanel 
                            onSuccess={handlePunchSuccess}
                            onClose={onClose}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Complete Previous Day Modal */}
            <CompletePreviousPunchOut
                isOpen={isPreviousOpen}
                onClose={onPreviousClose}
                onSuccess={handlePunchSuccess}
            />
        </div>
    );
};

export default AttendanceManagement;

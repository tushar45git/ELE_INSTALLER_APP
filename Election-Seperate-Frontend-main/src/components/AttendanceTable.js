import React, { useState, useEffect } from 'react';
import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    Text,
    Badge,
    Image,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    HStack,
    Button,
    Select,
    Input,
    VStack,
    IconButton,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Flex,
    Menu,
    MenuButton,
    MenuList,
    MenuItem
} from '@chakra-ui/react';
import { MdChevronLeft, MdChevronRight, MdDelete, MdExpandMore } from 'react-icons/md';
import axios from 'axios';

const AttendanceTable = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedPhotoType, setSelectedPhotoType] = useState('');
    const [currentRecord, setCurrentRecord] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const cancelRef = React.useRef();
    const toast = useToast();
    
    // Pagination and filters
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [filters, setFilters] = useState({
        userId: '',
        startDate: '',
        endDate: '',
        status: '',
        sortBy: 'date',
        sortOrder: 'desc'
    });

    const userRole = localStorage.getItem('role');
    const currentUserId = localStorage.getItem('mobile');

    useEffect(() => {
        fetchAttendance();
    }, [currentPage, filters]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: 10,
                ...filters
            };

            // If not admin, only show own attendance
            if (userRole !== 'admin' && userRole !== 'master') {
                params.userId = currentUserId;
            }

            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/attendance/list`,
                { params }
            );

            setAttendance(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const openPhotoModal = (photoUrl, photoType = '', record = null) => {
        setSelectedPhoto(photoUrl);
        setSelectedPhotoType(photoType);
        setCurrentRecord(record);
        onOpen();
    };

    const formatDuration = (record) => {
        // If workDuration is already a formatted string, return it directly
        if (record.workDuration && typeof record.workDuration === 'string') {
            return record.workDuration;
        }
        
        // Otherwise calculate from timestamps
        if (record.punchOutTime) {
            const diffMs = new Date(record.punchOutTime) - new Date(record.punchInTime);
            const diffMinutes = Math.round(diffMs / (1000 * 60)); // Convert to minutes and round
            
            if (diffMinutes < 60) {
                return `${diffMinutes} min`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                
                if (minutes === 0) {
                    return `${hours} hr`;
                } else {
                    return `${hours} hr ${minutes} min`;
                }
            }
        }
        
        return '-';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleSearch = () => {
        setFilters(prev => ({ ...prev, userId: searchInput }));
        setCurrentPage(1);
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        onDeleteOpen();
    };

    const handleDeleteConfirm = async () => {
        try {
            await axios.delete(
                `${process.env.REACT_APP_API_URL}/api/attendance/delete/${deleteId}`
            );

            toast({
                title: 'Deleted',
                description: 'Attendance record deleted successfully',
                status: 'success',
                duration: 3000,
                position: 'top'
            });

            onDeleteClose();
            fetchAttendance();
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete',
                status: 'error',
                duration: 3000,
                position: 'top'
            });
        }
    };

    if (loading && attendance.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="400px">
                <Spinner size="xl" color="purple.500" />
            </Box>
        );
    }

    return (
        <Box>
            {/* Filters */}
            <Box mb={6}>
                {/* Search Bar - Admin/Master only */}
                {(userRole === 'admin' || userRole === 'master') && (
                    <Box mb={4}>
                        <Flex gap={3} w="100%">
                            <Input
                                placeholder="Search by User Name or Phone Number"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyPress={handleSearchKeyPress}
                                flex={1}
                                bg="white"
                                borderRadius="lg"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                                h="44px"
                            />
                            <Button
                                colorScheme="purple"
                                onClick={handleSearch}
                                px={6}
                                h="44px"
                                borderRadius="lg"
                                fontWeight="semibold"
                            >
                                Search
                            </Button>
                        </Flex>
                    </Box>
                )}
                
                {/* Desktop Filters */}
                <Box display={{ base: 'none', md: 'block' }}>
                    <Flex gap={4} flexWrap="wrap" alignItems="flex-end">
                        <Box>
                            <Text mb={1} fontSize="sm" fontWeight="medium">Start Date</Text>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                maxW="200px"
                                bg="white"
                                borderRadius="md"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                            />
                        </Box>
                        <Box>
                            <Text mb={1} fontSize="sm" fontWeight="medium">End Date</Text>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                maxW="200px"
                                bg="white"
                                borderRadius="md"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                            />
                        </Box>
                        <Box>
                            <Text mb={1} fontSize="sm" fontWeight="medium">Status</Text>
                            <Select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                maxW="200px"
                                bg="white"
                                borderRadius="md"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                            >
                                <option value="">All Status</option>
                                <option value="punched-in">Punched In</option>
                                <option value="punched-out">Punched Out</option>
                            </Select>
                        </Box>
                        <Box>
                            <Text mb={1} fontSize="sm" fontWeight="medium">Sort</Text>
                            <Select
                                value={filters.sortOrder}
                                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                                maxW="150px"
                                bg="white"
                                borderRadius="md"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </Select>
                        </Box>
                    </Flex>
                </Box>

                {/* Mobile Filters - Two-column grid layout */}
                <Box display={{ base: 'block', md: 'none' }} w="100%">
                    {/* Row 1: Start Date and End Date */}
                    <Flex gap={3} mb={3} w="100%">
                        <Box flex="1">
                            <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.700">Start Date</Text>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                bg="white"
                                borderRadius="lg"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                                fontSize="sm"
                                h="44px"
                                w="100%"
                            />
                        </Box>
                        <Box flex="1">
                            <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.700">End Date</Text>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                bg="white"
                                borderRadius="lg"
                                border="2px"
                                borderColor="gray.200"
                                _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #9f7aea" }}
                                _hover={{ borderColor: "gray.300" }}
                                fontSize="sm"
                                h="44px"
                                w="100%"
                            />
                        </Box>
                    </Flex>

                    {/* Row 2: Status and Sort */}
                    <Flex gap={3} mb={4} w="100%">
                        <Box flex="1">
                            <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.700">Status</Text>
                            <Menu>
                                <MenuButton
                                    as={Button}
                                    rightIcon={<MdExpandMore />}
                                    bg="white"
                                    borderRadius="lg"
                                    border="2px"
                                    borderColor="gray.200"
                                    _hover={{ borderColor: "gray.300" }}
                                    _active={{ borderColor: "purple.400" }}
                                    fontSize="sm"
                                    h="44px"
                                    w="100%"
                                    textAlign="left"
                                    fontWeight="normal"
                                    justifyContent="space-between"
                                    px={3}
                                    color="gray.700"
                                >
                                    {filters.status === 'punched-in' ? 'Punched In' : 
                                     filters.status === 'punched-out' ? 'Punched Out' : 'All Status'}
                                </MenuButton>
                                <MenuList
                                    bg="white"
                                    border="1px solid"
                                    borderColor="gray.200"
                                    borderRadius="lg"
                                    boxShadow="lg"
                                    zIndex={1000}
                                    minW="150px"
                                >
                                    <MenuItem 
                                        onClick={() => handleFilterChange('status', '')}
                                        fontSize="sm"
                                        _hover={{ bg: "purple.50" }}
                                        _focus={{ bg: "purple.50" }}
                                    >
                                        All Status
                                    </MenuItem>
                                    <MenuItem 
                                        onClick={() => handleFilterChange('status', 'punched-in')}
                                        fontSize="sm"
                                        _hover={{ bg: "purple.50" }}
                                        _focus={{ bg: "purple.50" }}
                                    >
                                        Punched In
                                    </MenuItem>
                                    <MenuItem 
                                        onClick={() => handleFilterChange('status', 'punched-out')}
                                        fontSize="sm"
                                        _hover={{ bg: "purple.50" }}
                                        _focus={{ bg: "purple.50" }}
                                    >
                                        Punched Out
                                    </MenuItem>
                                </MenuList>
                            </Menu>
                        </Box>
                        <Box flex="1">
                            <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.700">Sort</Text>
                            <Menu>
                                <MenuButton
                                    as={Button}
                                    rightIcon={<MdExpandMore />}
                                    bg="white"
                                    borderRadius="lg"
                                    border="2px"
                                    borderColor="gray.200"
                                    _hover={{ borderColor: "gray.300" }}
                                    _active={{ borderColor: "purple.400" }}
                                    fontSize="sm"
                                    h="44px"
                                    w="100%"
                                    textAlign="left"
                                    fontWeight="normal"
                                    justifyContent="space-between"
                                    px={3}
                                    color="gray.700"
                                >
                                    {filters.sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                                </MenuButton>
                                <MenuList
                                    bg="white"
                                    border="1px solid"
                                    borderColor="gray.200"
                                    borderRadius="lg"
                                    boxShadow="lg"
                                    zIndex={1000}
                                    minW="150px"
                                >
                                    <MenuItem 
                                        onClick={() => handleFilterChange('sortOrder', 'desc')}
                                        fontSize="sm"
                                        _hover={{ bg: "purple.50" }}
                                        _focus={{ bg: "purple.50" }}
                                    >
                                        Newest First
                                    </MenuItem>
                                    <MenuItem 
                                        onClick={() => handleFilterChange('sortOrder', 'asc')}
                                        fontSize="sm"
                                        _hover={{ bg: "purple.50" }}
                                        _focus={{ bg: "purple.50" }}
                                    >
                                        Oldest First
                                    </MenuItem>
                                </MenuList>
                            </Menu>
                        </Box>
                    </Flex>
                </Box>
            </Box>

            {/* Table and Mobile Cards */}
            {attendance.length === 0 ? (
                <Text textAlign="center" color="gray.500" fontSize="lg" py={10}>
                    No attendance records found
                </Text>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <Box overflowX="auto" display={{ base: 'none', lg: 'block' }}>
                        <Table variant="simple" size="sm">
                            <Thead bg="purple.100">
                                <Tr>
                                    <Th>User</Th>
                                    <Th>Date</Th>
                                    <Th>Punch In</Th>
                                    <Th>Punch Out</Th>
                                    <Th>In Location</Th>
                                    <Th>Out Location</Th>
                                    <Th>Duration</Th>
                                    <Th>Photo</Th>
                                    <Th>Status</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {attendance.map((record) => (
                                    <Tr key={record._id}>
                                        <Td>
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="bold" fontSize="sm">
                                                    {record.userName || 'N/A'}
                                                </Text>
                                                <Text fontSize="xs" color="gray.500">
                                                    {record.userId}
                                                </Text>
                                            </VStack>
                                        </Td>
                                        <Td>{formatDate(record.date)}</Td>
                                        <Td>{formatTime(record.punchInTime)}</Td>
                                        <Td>{formatTime(record.punchOutTime)}</Td>
                                        <Td fontSize="xs">
                                            {record.punchInLatitude?.toFixed(4)}, {record.punchInLongitude?.toFixed(4)}
                                        </Td>
                                        <Td fontSize="xs">
                                            {record.punchOutLatitude
                                                ? `${record.punchOutLatitude.toFixed(4)}, ${record.punchOutLongitude.toFixed(4)}`
                                                : '-'}
                                        </Td>
                                        <Td>
                                            {formatDuration(record)}
                                        </Td>
                                        <Td>
                                            <VStack spacing={1}>
                                                {record.punchInPhotoUrl && (
                                                    <Text
                                                        color="blue.500"
                                                        cursor="pointer"
                                                        fontSize="sm"
                                                        onClick={() => openPhotoModal(record.punchInPhotoUrl, 'Punch In', record)}
                                                        _hover={{ textDecoration: 'underline' }}
                                                    >
                                                        In Photo
                                                    </Text>
                                                )}
                                                {record.punchOutPhotoUrl && (
                                                    <Text
                                                        color="green.500"
                                                        cursor="pointer"
                                                        fontSize="sm"
                                                        onClick={() => openPhotoModal(record.punchOutPhotoUrl, 'Punch Out', record)}
                                                        _hover={{ textDecoration: 'underline' }}
                                                    >
                                                        Out Photo
                                                    </Text>
                                                )}
                                                {!record.punchInPhotoUrl && !record.punchOutPhotoUrl && '-'}
                                            </VStack>
                                        </Td>
                                        <Td>
                                            <Badge
                                                colorScheme={record.status === 'punched-out' ? 'green' : 'blue'}
                                            >
                                                {record.status}
                                            </Badge>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>

                    {/* Mobile Card View */}
                    <Box display={{ base: 'block', lg: 'none' }}>
                        {attendance.map((record) => (
                            <Box
                                key={record._id}
                                bg="white"
                                border="1px"
                                borderColor="gray.200"
                                borderRadius="md"
                                p={4}
                                mb={3}
                                shadow="sm"
                            >
                                <Flex justifyContent="space-between" alignItems="flex-start" mb={3}>
                                    <Box>
                                        <Text fontSize="lg" fontWeight="bold" color="purple.600">
                                            {record.userName || 'N/A'}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {record.userId} • {formatDate(record.date)}
                                        </Text>
                                    </Box>
                                    <Badge
                                        colorScheme={record.status === 'punched-out' ? 'green' : 'blue'}
                                        px={3}
                                        py={1}
                                        borderRadius="full"
                                        fontSize="xs"
                                        fontWeight="bold"
                                    >
                                        {record.status}
                                    </Badge>
                                </Flex>
                                
                                <Box>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.600">Punch In:</Text>
                                        <Text fontSize="sm" fontWeight="medium">{formatTime(record.punchInTime)}</Text>
                                    </Flex>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.600">Punch Out:</Text>
                                        <Text fontSize="sm" fontWeight="medium">{formatTime(record.punchOutTime)}</Text>
                                    </Flex>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.600">Duration:</Text>
                                        <Text fontSize="sm" fontWeight="medium">{formatDuration(record)}</Text>
                                    </Flex>
                                    {(record.punchInPhotoUrl || record.punchOutPhotoUrl) && (
                                        <Flex justifyContent="space-between" alignItems="center">
                                            <Text fontSize="sm" color="gray.600">Photos:</Text>
                                            <Flex gap={3} alignItems="center">
                                                {record.punchInPhotoUrl && (
                                                    <Box textAlign="center">
                                                        <Text
                                                            color="blue.500"
                                                            cursor="pointer"
                                                            fontSize="sm"
                                                            fontWeight="medium"
                                                            onClick={() => openPhotoModal(record.punchInPhotoUrl, 'Punch In', record)}
                                                            _hover={{ textDecoration: 'underline' }}
                                                            bg="blue.50"
                                                            px={2}
                                                            py={1}
                                                            borderRadius="md"
                                                            border="1px solid"
                                                            borderColor="blue.200"
                                                        >
                                                            Punch In
                                                        </Text>
                                                    </Box>
                                                )}
                                                {record.punchOutPhotoUrl && (
                                                    <Box textAlign="center">
                                                        <Text
                                                            color="green.500"
                                                            cursor="pointer"
                                                            fontSize="sm"
                                                            fontWeight="medium"
                                                            onClick={() => openPhotoModal(record.punchOutPhotoUrl, 'Punch Out', record)}
                                                            _hover={{ textDecoration: 'underline' }}
                                                            bg="green.50"
                                                            px={2}
                                                            py={1}
                                                            borderRadius="md"
                                                            border="1px solid"
                                                            borderColor="green.200"
                                                        >
                                                            Punch Out
                                                        </Text>
                                                    </Box>
                                                )}
                                                {!record.punchInPhotoUrl && !record.punchOutPhotoUrl && (
                                                    <Text fontSize="sm" color="gray.400">No photos</Text>
                                                )}
                                            </Flex>
                                        </Flex>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>

                    {/* Pagination */}
                    <Flex justify="center" mt={6} gap={4} flexWrap="wrap">
                        <Button
                            leftIcon={<MdChevronLeft />}
                            onClick={() => handlePageChange(currentPage - 1)}
                            isDisabled={currentPage === 1}
                            size="sm"
                            colorScheme="purple"
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Text alignSelf="center" fontSize="sm" color="gray.600">
                            Page {currentPage} of {totalPages}
                        </Text>
                        <Button
                            rightIcon={<MdChevronRight />}
                            onClick={() => handlePageChange(currentPage + 1)}
                            isDisabled={currentPage === totalPages}
                            size="sm"
                            colorScheme="purple"
                            variant="outline"
                        >
                            Next
                        </Button>
                    </Flex>
                </>
            )}

            {/* Enhanced Photo Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <Flex justifyContent="space-between" alignItems="center">
                            <Text>{selectedPhotoType} Photo</Text>
                            {currentRecord && currentRecord.punchInPhotoUrl && currentRecord.punchOutPhotoUrl && (
                                <Flex gap={2}>
                                    <Button
                                        size="sm"
                                        colorScheme="blue"
                                        variant={selectedPhotoType === 'Punch In' ? 'solid' : 'outline'}
                                        onClick={() => {
                                            setSelectedPhoto(currentRecord.punchInPhotoUrl);
                                            setSelectedPhotoType('Punch In');
                                        }}
                                    >
                                        Punch In
                                    </Button>
                                    <Button
                                        size="sm"
                                        colorScheme="green"
                                        variant={selectedPhotoType === 'Punch Out' ? 'solid' : 'outline'}
                                        onClick={() => {
                                            setSelectedPhoto(currentRecord.punchOutPhotoUrl);
                                            setSelectedPhotoType('Punch Out');
                                        }}
                                    >
                                        Punch Out
                                    </Button>
                                </Flex>
                            )}
                        </Flex>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {selectedPhoto && (
                            <Box>
                                <Image src={selectedPhoto} w="100%" borderRadius="md" />
                                {currentRecord && (
                                    <Box mt={3} p={3} bg="gray.50" borderRadius="md">
                                        <Text fontSize="sm" fontWeight="bold" mb={1}>
                                            {currentRecord.userName || 'N/A'} - {formatDate(currentRecord.date)}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {selectedPhotoType === 'Punch In' 
                                                ? `Punch In: ${formatTime(currentRecord.punchInTime)}`
                                                : `Punch Out: ${formatTime(currentRecord.punchOutTime)}`
                                            }
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteOpen}
                leastDestructiveRef={cancelRef}
                onClose={onDeleteClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Attendance
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onDeleteClose}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
};

export default AttendanceTable;

import React, { useState } from 'react';
import { Box, Button, Drawer, DrawerBody, DrawerCloseButton, IconButton, Menu, MenuButton, MenuItem, MenuList, useBreakpointValue, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay, Flex, Icon, Text, VStack } from '@chakra-ui/react';
import { MdAccountCircle, MdAdd, MdBuild, MdDashboard, MdTableRows } from "react-icons/md";
import { useNavigate, useLocation } from 'react-router-dom';
import logo1 from './images/logo/logo1.png';

const DrawerButton = ({ drawerContent }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const role = localStorage.getItem('role');

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    const navigate = useNavigate();

    const handleRedirect = (path) => {
    if (location.pathname === path) {
        window.location.reload();
    } else {
        navigate(path);
    }
    toggleDrawer();
};

    const location = useLocation();

    const fontSize = useBreakpointValue({ base: '0.5rem', md: 'large', lg: 'xx-large' });

    // Define menu items based on the user's role
    let menuItems = [
        // { path: "/dashboard", label: "Dashboard", icon: MdDashboard },
    ];

    if (role === "admin") {
        menuItems.push(
            { path: "/dashboard", label: "Dashboard", icon: MdDashboard },
            { path: "/head", label: "District Manager", icon: MdAccountCircle },
            { path: "/installer", label: "Installer", icon: MdBuild },
            { path: "/autoinstaller", label: "Auto Installer", icon: MdBuild },
            { path: "/eleuser", label: "User Analytics", icon: MdBuild },
        );
    } else if (role === "district") {
        menuItems.push(
            { path: "/head", label: "District Manager", icon: MdAccountCircle },
            { path: "/installer", label: "Installer", icon: MdBuild },
            { path: "/autoinstaller", label: "Auto Installer", icon: MdBuild }
        );
    } else if (role === "installer" || role === "autoinstaller" || role === "punjabInstaller") {
        menuItems.push(
            { path: "/autoinstaller", label: "Auto Installer", icon: MdBuild }
        );
    } else if (role === "checkpost") {
        menuItems.push(
            { path: "/attendance", label: "Attendance", icon: MdAccountCircle }
        );
    }
    else {
        // Fallback for other roles
        menuItems.push(
            { path: "/autoinstaller", label: "Auto Installer", icon: MdBuild },
        );
    }

    return (
        <>
            {location.pathname === '/eci' || location.pathname === '/' ? (
                <div>
                    <Menu>
                        <MenuButton fontSize={fontSize} as={IconButton} aria-label="Profile" backgroundColor='#fff'><img width='80%' src={logo1} /></MenuButton>
                        <MenuList>
                            {/* Display name and mobile */}
                            <MenuItem>
                                <Button variant="outline"><img width='10%' src={logo1} />VMUKTI ELECTION APP</Button> {/* Add your button here */}
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </div>
            ) : (
                <div>
                    <Button onClick={toggleDrawer} zIndex="999">
                        <MdTableRows />
                    </Button>
                    <Drawer placement="left" onClose={toggleDrawer} isOpen={isDrawerOpen}>
                        <DrawerOverlay backdropFilter="blur(4px)" />
                        <DrawerContent 
                            borderTopRightRadius="2xl" 
                            borderBottomRightRadius="2xl"
                            pt="env(safe-area-inset-top)"
                        >
                            <DrawerCloseButton 
                                top="calc(10px + env(safe-area-inset-top))" 
                                zIndex="1001"
                            />
                            <DrawerHeader 
                                display='flex' 
                                alignItems='center' 
                                gap={3}
                                borderBottomWidth="1px"
                                borderBottomColor="gray.100"
                                py={6}
                            >
                                <img 
                                    style={{ objectFit: 'contain' }} 
                                    width='32px' 
                                    src='./logo.png' 
                                    alt="Logo"
                                />
                                <Text fontWeight="800" fontSize="lg" color="blue.800">VMUKTI - ELE</Text>
                            </DrawerHeader>
                            <DrawerBody pt={6}>
                                <VStack spacing={6} align="start">
                                    {menuItems.map((item, index) => (
                                        <Flex 
                                            key={index} 
                                            onClick={() => handleRedirect(item.path)} 
                                            w="full"
                                            p={3}
                                            borderRadius="xl"
                                            alignItems="center" 
                                            cursor="pointer"
                                            transition="all 0.2s"
                                            _hover={{ bg: "blue.50", color: "blue.600" }}
                                            _active={{ bg: "blue.100" }}
                                            gap={4}
                                        >
                                            <Box 
                                                p={2} 
                                                borderRadius="lg" 
                                                bg={location.pathname === item.path ? "blue.600" : "gray.100"}
                                                color={location.pathname === item.path ? "white" : "gray.600"}
                                            >
                                                <Icon as={item.icon} boxSize={5} /> 
                                            </Box>
                                            <Text 
                                                fontWeight={location.pathname === item.path ? "700" : "600"}
                                                color={location.pathname === item.path ? "blue.700" : "gray.700"}
                                                fontSize="md"
                                            >
                                                {item.label}
                                            </Text>
                                        </Flex>
                                    ))}
                                </VStack>
                            </DrawerBody>
                            <DrawerFooter>
                                {/* Footer content goes here */}
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </div>
            )}
        </>
    );
};

export default DrawerButton;
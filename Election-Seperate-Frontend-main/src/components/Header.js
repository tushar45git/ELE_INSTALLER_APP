import { Avatar, Button, DrawerContent, Heading, IconButton, Menu, MenuButton, MenuItem, MenuList, Stack, Text, useBreakpointValue } from '@chakra-ui/react';
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import DrawerButton from './Drawer';
import { MdAccountCircle } from 'react-icons/md';
import logo from './images/logo/Vmuktilogo.png';
import logo1 from './images/logo/logo1.png';
import ecilogo from './images/logo/eci.png';

const Header = () => {
    const navigate = useNavigate();
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const name = localStorage.getItem('name');
    const mobile = localStorage.getItem('mobile');
    const handleSignOut = async () => {
        try {
            localStorage.removeItem('name');
            localStorage.removeItem('mobile');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('role');
            navigate('/')
        } catch (error) {
            throw error;
        }
    }
    // const flexDirection = useBreakpointValue({ base: 'column', md: 'row' });
    const fontSize = useBreakpointValue({ base: '0.5rem', md: 'large', lg: 'xx-large' });

    const location = useLocation();

    const isMobile = useBreakpointValue({ base: true, md: false });

    return (
        <div style={{ marginTop: "10%" }}>
            {location.pathname === '/eci' ?
                <div>
                    <Stack pl={4} pr={4} justifyContent="space-between" sx={{ display: "flex", flexDirection: "row", alignItems: 'center' }}>
                        <DrawerButton display='flex' alignItems='center' drawerContent={<DrawerContent />} />

                        <Heading fontSize={fontSize} display='flex' justifyContent='center' alignItems='center'><img width='10%' src={ecilogo} />&nbsp; Election Commission of India</Heading>
                        {/* <Button onClick={handleSignOut} alignSelf="flex-end">Logout</Button> */}
                        <Stack direction="row" alignItems="center">
                            {/* <Menu>
                                <MenuButton fontSize={fontSize} as={IconButton} aria-label="Profile" backgroundColor='#fff'><img width='80%' src={logo1} /></MenuButton>
                                <MenuList>
                                    <MenuItem>
                                    <Button  variant="outline"><img width='10%' src={logo1} />VMUKTI ELECTION APP</Button> 
                                    </MenuItem>
                                </MenuList>
                            </Menu> */}
                            <Menu>
                                <MenuButton background="#3F77A5" fontSize={fontSize} as={IconButton} icon={<MdAccountCircle />} aria-label="Profile" variant="outline" />
                                <MenuList>
                                    {/* Display name and mobile */}
                                    <MenuItem>
                                        <Avatar size="sm" name={name} mr="2" />
                                        <Stack spacing="0">
                                            <Text fontWeight="bold">{name}</Text>
                                            <Text fontSize="sm">{mobile}</Text>
                                        </Stack>
                                    </MenuItem>
                                    <MenuItem onClick={handleSignOut}>
                                        <Button variant="link" color='red'>Logout</Button>
                                    </MenuItem>
                                </MenuList>
                            </Menu>
                        </Stack>
                        {/* {isLoggedIn && <Button onClick={handleSignOut} display='flex' alignItems='center'>Logout</Button>} */}
                    </Stack>
                </div>

                :

                <div>
                    <Stack pl={4} pr={4} justifyContent="space-between" sx={{ display: "flex", flexDirection: "row", alignItems: 'center' }}>
                        <DrawerButton display='flex' alignItems='center' drawerContent={<DrawerContent />} />

                        <Heading fontSize={fontSize} display='flex' justifyContent='center' alignItems='center'><img width=" 96.152px"
height= "24.919px" src={logo} />&nbsp;</Heading>
                        {/* <Button onClick={handleSignOut} alignSelf="flex-end">Logout</Button> */}
                        <Menu>
                            <MenuButton as={IconButton} icon={<MdAccountCircle />} aria-label="Profile" variant="outline" />
                            <MenuList>
                                {/* Display name and mobile */}
                                <MenuItem>
                                    <Avatar size="sm" name={name} mr="2" />
                                    <Stack spacing="0">
                                        <Text fontWeight="bold">{name}</Text>
                                        <Text fontSize="sm">{mobile}</Text>
                                    </Stack>
                                </MenuItem>
                                <MenuItem onClick={handleSignOut}>
                                    <Button background='white' variant="link" color='red'>Logout</Button>
                                </MenuItem>
                            </MenuList>
                        </Menu>
                        {/* {isLoggedIn && <Button onClick={handleSignOut} display='flex' alignItems='center'>Logout</Button>} */}
                    </Stack>
                </div>
            }

        </div>
    )
}

export default Header

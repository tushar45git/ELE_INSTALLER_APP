import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  Stack,
  VStack,
  Image,
  useToast,
  Fade,
  ScaleFade,
  Divider,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { login, verifyOtp } from "../actions/userActions";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from './images/logo/Vmuktilogo.png';

const Login = () => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [mobileForOtp, setMobileForOtp] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocationEnabled(true);
    } else {
      toast({
        title: "Location Error",
        description: "Please enable location to use this application.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }

    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRole = localStorage.getItem("role");

    if (isLoggedIn) {
      if (userRole === "district") {
        navigate("/head");
      } else {
        navigate("/autoinstaller");
      }
    }
  }, []);

  const handleMobileChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 10) {
      setMobile(value);
    }
  };

  const handleSendOtp = async () => {
    if (!name || mobile.length < 10) {
      toast({
        title: "Invalid Input",
        description: "Please enter your name and a valid 10-digit mobile number.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      setMobileForOtp(mobile);
      const response = await login(name, mobile);
      if (response && response.success !== false) {
        setOtpSent(true);
        setResendDisabled(true);
        setResendTimer(30);
        toast({
          title: "OTP Sent",
          description: "An OTP has been sent to your mobile number.",
          status: "success",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to send OTP.",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      toast({
        title: "Incomplete OTP",
        description: "Please enter the full 6-digit OTP.",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOtp(mobile, otpString);
      if (response && response.success) {
        localStorage.setItem("name", name);
        localStorage.setItem("mobile", mobile);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);

        toast({
          title: "Success",
          description: "Login successful!",
          status: "success",
          duration: 2000,
        });

        if (response.role === "district") {
          navigate("/head");
        } else if (response.role === "checkpost") {
          navigate("/attendance");
        } else if (response.role === "punjabInstaller") {
          navigate("/punjabInstaller");
        } else {
          navigate("/autoinstaller");
        }
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid OTP or Mobile Number.",
          status: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgGradient="linear(to-br, #f0f4f8, #d9e2ec)"
      position="relative"
      overflow="hidden"
      p={4}
    >
      {/* Decorative Elements */}
      <Box
        position="absolute"
        top="-10%"
        right="-10%"
        w="400px"
        h="400px"
        bg="blue.100"
        filter="blur(100px)"
        borderRadius="full"
        opacity="0.6"
      />
      <Box
        position="absolute"
        bottom="-10%"
        left="-10%"
        w="400px"
        h="400px"
        bg="blue.200"
        filter="blur(100px)"
        borderRadius="full"
        opacity="0.6"
      />

      <Container maxW={{ base: "95%", sm: "450px" }} zIndex={1} px={0}>
        <ScaleFade initialScale={0.9} in={true}>
          <VStack
            spacing={{ base: 6, md: 8 }}
            bg="rgba(255, 255, 255, 0.85)"
            backdropFilter="blur(20px)"
            p={{ base: 6, sm: 8, md: 10 }}
            borderRadius={{ base: "2xl", md: "3xl" }}
            boxShadow="2xl"
            border="1px solid rgba(255, 255, 255, 0.4)"
            textAlign="center"
            w="full"
          >
            <VStack spacing={3}>
              <Image src={logo} h={{ base: "40px", md: "50px" }} mb={2} alt="VMukti Logo" />
              <Heading as="h1" size={{ base: "md", md: "lg" }} color="gray.800" fontWeight="800" letterSpacing="-0.5px">
                Election Installer Portal
              </Heading>
              <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
                Securely access your account to proceed
              </Text>
            </VStack>

            {!otpSent ? (
              <VStack spacing={5} w="full">
                <FormControl isRequired>
                  <FormLabel fontWeight="700" color="gray.700" fontSize="sm">Full Name</FormLabel>
                  <Input
                    placeholder="Enter your name"
                    bg="white"
                    size="md"
                    borderRadius="xl"
                    boxShadow="sm"
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px #3182ce" }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="700" color="gray.700" fontSize="sm">Mobile Number</FormLabel>
                  <InputGroup size="md">
                    <InputLeftAddon borderLeftRadius="xl" bg="gray.100" color="gray.600" fontWeight="600" >
                      +91
                    </InputLeftAddon>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      bg="white"
                      size="md"
                      borderRightRadius="xl"
                      boxShadow="sm"
                      _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px #3182ce" }}
                      value={mobile}
                      onChange={handleMobileChange}
                    />
                  </InputGroup>
                </FormControl>

                <Button
                  w="full"
                  className="btn-premium"
                  sx={{
                    backgroundColor: "#4f46e5 !important",
                    color: "white !important",
                    _hover: {
                      backgroundColor: "#4338ca !important",
                      transform: "translateY(-2px)",
                      boxShadow: "xl",
                    },
                    _active: {
                      backgroundColor: "#3730a3 !important",
                      transform: "translateY(0)",
                    }
                  }}
                  size="lg"
                  height={{ base: "50px", md: "56px" }}
                  borderRadius="xl"
                  fontSize="md"
                  fontWeight="bold"
                  boxShadow="lg"
                  top={5}
                  onClick={handleSendOtp}
                  isLoading={isLoading}
                  isDisabled={!locationEnabled}
                >
                  Get Verification Code
                </Button>
                
                {!locationEnabled && (
                  <Text color="red.500" fontSize="xs" fontWeight="600">
                    * Please enable location to continue
                  </Text>
                )}
              </VStack>
            ) : (
              <Fade in={otpSent} style={{ width: '100%' }}>
                <VStack spacing={6} w="full">
                  <VStack spacing={1}>
                    <Text fontWeight="800" fontSize={{ base: "lg", md: "xl" }} color="gray.800">Verify Identity</Text>
                    <Text color="gray.600" fontSize="sm">
                      Enter the 6-digit code sent to
                    </Text>
                    <Text fontWeight="800" color="blue.600">+91 - {mobile}</Text>
                  </VStack>

                  <HStack spacing={{ base: 1, sm: 2 }} justify="center" w="full">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        w={{ base: "40px", sm: "45px", md: "50px" }}
                        h={{ base: "50px", sm: "56px" }}
                        textAlign="center"
                        fontSize={{ base: "xl", md: "2xl" }}
                        fontWeight="800"
                        bg="white"
                        borderRadius="lg"
                        border="2px solid"
                        borderColor="gray.200"
                        _focus={{ borderColor: "blue.400", bg: "blue.50", boxShadow: "none" }}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        maxLength={1}
                        type="tel"
                        p={0}
                      />
                    ))}
                  </HStack>

                  <Button
                    w="full"
                    className="btn-premium"
                    sx={{
                      backgroundColor: "#4f46e5 !important",
                      color: "white !important",
                      _hover: {
                        backgroundColor: "#4338ca !important",
                        transform: "translateY(-2px)",
                        boxShadow: "xl",
                      },
                      _active: {
                        backgroundColor: "#3730a3 !important",
                        transform: "translateY(0)",
                      }
                    }}
                    size="lg"
                    height={{ base: "50px", md: "56px" }}
                    borderRadius="xl"
                    fontSize="md"
                    fontWeight="bold"
                    boxShadow="lg"
                    onClick={handleSignIn}
                    isLoading={isLoading}
                  >
                    Verify & Sign In
                  </Button>

                  <HStack justify="center" pt={2} flexWrap="wrap">
                    <Text fontSize="sm" color="gray.600">Didn't receive the code?</Text>
                    <Button
                      variant="link"
                      colorScheme="blue"
                      fontSize="sm"
                      isDisabled={resendDisabled}
                      onClick={handleSendOtp}
                      fontWeight="700"
                    >
                      {resendDisabled ? `Resend in ${resendTimer}s` : "Resend Now"}
                    </Button>
                  </HStack>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    color="gray.500"
                    onClick={() => setOtpSent(false)}
                    _hover={{ bg: "transparent", color: "blue.500" }}
                  >
                    Back to Login
                  </Button>
                </VStack>
              </Fade>
            )}

            <VStack spacing={3} pt={4} w="full">
              <Divider borderColor="gray.300" />
              <Text fontSize="xs" color="gray.400" fontWeight="600">
                &copy; {new Date().getFullYear()} VMukti Solutions. All rights reserved.
              </Text>
            </VStack>
          </VStack>
        </ScaleFade>
      </Container>
      <ToastContainer position="top-right" />
    </Box>
  );
};

export default Login;

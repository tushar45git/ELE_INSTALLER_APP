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
  Select,
  useColorModeValue,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { login, verifyOtp } from "../actions/userActions";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "./images/logo/Vmuktilogo.png";
import ThemeToggle from "./ThemeToggle";

const Login = () => {
  // Theme-aware colors (light / dark)
  const pageBg = useColorModeValue(
    "linear(to-br, #f0f4f8, #d9e2ec)",
    "linear(to-br, #0d1117, #010409)",
  );
  const cardBg = useColorModeValue("rgba(255,255,255,0.85)", "rgba(22,27,34,0.92)");
  const cardBorder = useColorModeValue(
    "1px solid rgba(255,255,255,0.4)",
    "1px solid #30363d",
  );
  const blobColor = useColorModeValue("blue.100", "blue.900");
  const blobColor2 = useColorModeValue("blue.200", "purple.900");
  const headingColor = useColorModeValue("gray.800", "gray.100");
  const subColor = useColorModeValue("gray.600", "gray.400");
  const labelColor = useColorModeValue("gray.700", "gray.300");
  const inputBg = useColorModeValue("white", "#0d1117");
  const addonBg = useColorModeValue("gray.100", "#21262d");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [mobileForOtp, setMobileForOtp] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [selectedState, setSelectedState] = useState("Bihar");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const stateData = {
    "Bihar": {
      phase1: ["PATNA"],
    },
  };

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
        description:
          "Please enter your name and a valid 10-digit mobile number.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedState || !selectedDistrict || !phase) {
      toast({
        title: "Selection Required",
        description: "Please select both State and District before proceeding.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      setMobileForOtp(mobile);
      const response = await login(name, mobile, phase);
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
      const response = await verifyOtp(mobile, otpString, phase);
      if (response && response.success) {
        localStorage.setItem("name", name);
        localStorage.setItem("mobile", mobile);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", response.token);
        localStorage.setItem("role", response.role);
        localStorage.setItem("phase", response.phase || phase); //added the phase to local storage
        localStorage.setItem("state", selectedState); // persist selected state (e.g. Bihar)

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
      bgGradient={pageBg}
      position="relative"
      overflow="hidden"
      p={4}
      pt="max(1rem, env(safe-area-inset-top))"
      pb="max(1rem, env(safe-area-inset-bottom))"
    >
      {/* Theme toggle */}
      <ThemeToggle
        position="absolute"
        top="max(1rem, env(safe-area-inset-top))"
        right={4}
        zIndex={2}
      />
      {/* Decorative Elements */}
      <Box
        position="absolute"
        top="-10%"
        right="-10%"
        w="400px"
        h="400px"
        bg={blobColor}
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
        bg={blobColor2}
        filter="blur(100px)"
        borderRadius="full"
        opacity="0.6"
      />

      <Container maxW={{ base: "95%", sm: "450px" }} zIndex={1} px={0}>
        <ScaleFade initialScale={0.9} in={true}>
          <VStack
            spacing={{ base: 6, md: 8 }}
            bg={cardBg}
            backdropFilter="blur(20px)"
            p={{ base: 6, sm: 8, md: 10 }}
            borderRadius={{ base: "2xl", md: "3xl" }}
            boxShadow="2xl"
            border={cardBorder}
            textAlign="center"
            w="full"
          >
            <VStack spacing={3}>
              <Image
                src={logo}
                h={{ base: "40px", md: "50px" }}
                mb={2}
                alt="VMukti Logo"
              />
              <Heading
                as="h1"
                size={{ base: "md", md: "lg" }}
                color={headingColor}
                fontWeight="800"
                letterSpacing="-0.5px"
              >
                Election Installer App
              </Heading>
              <Text color={subColor} fontSize={{ base: "sm", md: "md" }}>
                Securely access your account to proceed
              </Text>
            </VStack>

            {!otpSent ? (
              <VStack spacing={5} w="full">
                <FormControl isRequired>
                  <FormLabel fontWeight="700" color={labelColor} fontSize="sm">
                    Full Name
                  </FormLabel>
                  <Input
                    placeholder="Enter your name"
                    bg={inputBg}
                    size="md"
                    borderRadius="xl"
                    boxShadow="sm"
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px #3182ce",
                    }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="700" color={labelColor} fontSize="sm">
                    Mobile Number
                  </FormLabel>
                  <InputGroup size="md">
                    <InputLeftAddon
                      borderLeftRadius="xl"
                      bg={addonBg}
                      color={subColor}
                      fontWeight="600"
                    >
                      +91
                    </InputLeftAddon>
                    <Input
                      type="tel"
                      placeholder="Enter mobile number"
                      bg={inputBg}
                      size="md"
                      borderRightRadius="xl"
                      boxShadow="sm"
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px #3182ce",
                      }}
                      value={mobile}
                      onChange={handleMobileChange}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="700" color={labelColor} fontSize="sm">
                    Select State
                  </FormLabel>
                  <Select
                    placeholder="Choose State"
                    bg={inputBg}
                    size="md"
                    borderRadius="xl"
                    boxShadow="sm"
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px #3182ce",
                    }}
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistrict("");
                      setPhase("");
                    }}
                  >
                    {Object.keys(stateData).map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {selectedState && (
                  <FormControl isRequired>
                    <FormLabel fontWeight="700" color={labelColor} fontSize="sm">
                      Select District
                    </FormLabel>
                    <Select
                      placeholder="Choose District"
                      bg={inputBg}
                      size="md"
                      borderRadius="xl"
                      boxShadow="sm"
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px #3182ce",
                      }}
                      value={selectedDistrict}
                      onChange={(e) => {
                        const district = e.target.value;
                        setSelectedDistrict(district);
                        // Find the phase for the selected district
                        const statePhases = stateData[selectedState];
                        for (const p in statePhases) {
                          if (statePhases[p].includes(district)) {
                            setPhase(p);
                            break;
                          }
                        }
                      }}
                    >
                      {Object.entries(stateData[selectedState]).flatMap(
                        ([p, districts]) =>
                          districts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          )),
                      )}
                    </Select>
                  </FormControl>
                )}

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
                    },
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
                  isDisabled={
                    !locationEnabled || !selectedState || !selectedDistrict
                  }
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
              <Fade in={otpSent} style={{ width: "100%" }}>
                <VStack spacing={6} w="full">
                  <VStack spacing={1}>
                    <Text
                      fontWeight="800"
                      fontSize={{ base: "lg", md: "xl" }}
                      color={headingColor}
                    >
                      Verify Identity
                    </Text>
                    <Text color={subColor} fontSize="sm">
                      Enter the 6-digit code sent to
                    </Text>
                    <Text fontWeight="800" color="blue.600">
                      +91 - {mobile}
                    </Text>
                  </VStack>

                  <HStack
                    spacing={{ base: 1, sm: 2 }}
                    justify="center"
                    w="full"
                  >
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        w={{ base: "40px", sm: "45px", md: "50px" }}
                        h={{ base: "50px", sm: "56px" }}
                        textAlign="center"
                        fontSize={{ base: "xl", md: "2xl" }}
                        fontWeight="800"
                        bg={inputBg}
                        borderRadius="lg"
                        border="2px solid"
                        borderColor="gray.200"
                        _focus={{
                          borderColor: "blue.400",
                          bg: "blue.50",
                          boxShadow: "none",
                        }}
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
                      },
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
                    <Text fontSize="sm" color={subColor}>
                      Didn't receive the code?
                    </Text>
                    <Button
                      variant="link"
                      colorScheme="blue"
                      fontSize="sm"
                      isDisabled={resendDisabled}
                      onClick={handleSendOtp}
                      fontWeight="700"
                    >
                      {resendDisabled
                        ? `Resend in ${resendTimer}s`
                        : "Resend Now"}
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
                &copy; {new Date().getFullYear()} VMukti Solutions. All rights
                reserved.
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

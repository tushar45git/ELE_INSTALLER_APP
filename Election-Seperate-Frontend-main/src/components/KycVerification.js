import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputLeftElement,
  Icon,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
  Badge,
  Spinner,
  Image,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  MdCreditCard,
  MdVerifiedUser,
  MdPhone,
  MdDirectionsCar,
  MdUploadFile,
  MdCheckCircle,
  MdHourglassEmpty,
  MdRefresh,
  MdCloudUpload,
  MdClose,
} from "react-icons/md";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;
const OTP_RESEND_SECONDS = 30;

// ─── Step Progress Bar ────────────────────────────────────────────────────────
const StepBar = ({ step }) => {
  const steps = ["Details", "OTP / Upload", "Result"];
  const stepIndex =
    { form: 0, otp: 1, upload: 1, verified: 2, pending: 2 }[step] ?? 0;
  return (
    <HStack justify="center" mt={4} spacing={0} align="center">
      {steps.map((label, i) => {
        const isActive = i <= stepIndex;
        return (
          <React.Fragment key={label}>
            <VStack spacing={1} align="center" minW="64px">
              <Box
                w={9}
                h={9}
                borderRadius="full"
                bg={isActive ? "white" : "blue.400"}
                border="2px solid"
                borderColor={isActive ? "white" : "blue.300"}
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow={
                  isActive ? "0 0 0 3px rgba(255,255,255,0.3)" : "none"
                }
              >
                <Text
                  fontSize="sm"
                  color={isActive ? "blue.600" : "blue.200"}
                  fontWeight="bold"
                >
                  {i + 1}
                </Text>
              </Box>
              <Text
                fontSize="xs"
                color={isActive ? "white !important" : "blue.300"}
                fontWeight={isActive ? "semibold" : "normal"}
                whiteSpace="nowrap"
              >
                {label}
              </Text>
            </VStack>
            {i < 2 && (
              <Box
                flex={1}
                h="2px"
                bg={i < stepIndex ? "white" : "blue.400"}
                mx={1}
                mb={4}
                borderRadius="full"
              />
            )}
          </React.Fragment>
        );
      })}
    </HStack>
  );
};

// ─── OTP Input ────────────────────────────────────────────────────────────────
const OtpInput = ({ otp, onChange, onKeyDown, refs }) => (
  <HStack justify="center" spacing={3} mt={2}>
    {otp.map((digit, i) => (
      <Input
        key={i}
        ref={(el) => (refs.current[i] = el)}
        value={digit}
        onChange={(e) => onChange(i, e.target.value)}
        onKeyDown={(e) => onKeyDown(i, e)}
        maxLength={1}
        textAlign="center"
        fontSize="xl"
        fontWeight="bold"
        w="48px"
        h="52px"
        borderRadius="lg"
        focusBorderColor="blue.500"
        borderWidth={2}
        color="blue.700"
        px={0}
      />
    ))}
  </HStack>
);

// ─── Drag & Drop Upload Box ───────────────────────────────────────────────────
const DropZone = ({ label, file, onFile, onClear }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const preview =
    file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

  return (
    <FormControl>
      <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
        {label}
      </FormLabel>
      {!file ? (
        <Box
          border="2px dashed"
          borderColor={dragging ? "blue.400" : "gray.300"}
          borderRadius="lg"
          p={5}
          textAlign="center"
          cursor="pointer"
          bg={dragging ? "blue.50" : "gray.50"}
          transition="all 0.2s"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Icon as={MdCloudUpload} boxSize={8} color="blue.400" mb={2} />
          <Text fontSize="sm" color="gray.500">
            Drag & drop or{" "}
            <Text as="span" color="blue.500" fontWeight="semibold">
              browse
            </Text>
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            JPG, PNG, PDF accepted
          </Text>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            style={{ display: "none" }}
            onChange={(e) => onFile(e.target.files[0])}
          />
        </Box>
      ) : (
        <Box
          borderRadius="lg"
          border="1px solid"
          borderColor="green.300"
          bg="green.50"
          p={3}
          position="relative"
        >
          {preview ? (
            <Image
              src={preview}
              alt="preview"
              maxH="120px"
              borderRadius="md"
              mx="auto"
              objectFit="contain"
            />
          ) : (
            <HStack>
              <Icon as={MdUploadFile} color="green.500" />
              <Text fontSize="sm" color="green.700" isTruncated>
                {file.name}
              </Text>
            </HStack>
          )}
          <Text fontSize="xs" color="green.600" mt={1} textAlign="center">
            ✓ {file.name}
          </Text>
          <Button
            size="xs"
            position="absolute"
            top={1}
            right={1}
            colorScheme="red"
            variant="ghost"
            borderRadius="full"
            onClick={onClear}
          >
            <Icon as={MdClose} />
          </Button>
        </Box>
      )}
    </FormControl>
  );
};

// ─── Method Selector ──────────────────────────────────────────────────────────
const methods = [
  {
    id: "aadhaar",
    label: "Aadhaar Card",
    icon: MdVerifiedUser,
    disabled: false,
  },
  { id: "pan", label: "PAN Card", icon: MdCreditCard, disabled: false },
  { id: "dl", label: "Driving Licence", icon: MdDirectionsCar, disabled: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
const KycVerification = () => {
  const contactNumber = localStorage.getItem("mobile") || "";
  const [method, setMethod] = useState("aadhaar");
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState({});
  const [rejectedReason, setRejectedReason] = useState("");

  // Aadhaar
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // Resend timer
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  // PAN
  const [panNumber, setPanNumber] = useState("");
  const [panName, setPanName] = useState("");

  // DL
  const [dlNumber, setDlNumber] = useState("");
  const [dob, setDob] = useState("");

  // Upload fallback
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // Check existing KYC on mount
  useEffect(() => {
    if (!contactNumber) return;
    axios
      .get(`${API}/api/kyc/status?contactNumber=${contactNumber}`)
      .then((r) => {
        const data = r.data?.data;
        if (!data) return;
        if (data.isVerified) {
          if (data.kycType) setMethod(data.kycType);
          if (data.panNumber) setPanNumber(data.panNumber);
          if (data.aadhaarNumber) setAadhaar(data.aadhaarNumber);
          if (data.drivingLicenceNumber) setDlNumber(data.drivingLicenceNumber);
          setStep("verified");
          return;
        }
        if (data.rejectedReason) setRejectedReason(data.rejectedReason);
        if (data.verificationMethod === "document") {
          setStep("pending");
          return;
        }
        if (data.aadhaarNumber) setAadhaar(data.aadhaarNumber);
        if (data.panNumber) setPanNumber(data.panNumber);
        if (data.drivingLicenceNumber) setDlNumber(data.drivingLicenceNumber);
        if (data.kycType) setMethod(data.kycType);
      })
      .catch(() => {});
  }, [contactNumber]);

  // Countdown timer for resend
  const startResendTimer = () => {
    setResendTimer(OTP_RESEND_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const resetAll = () => {
    setStep("form");
    setAlert(null);
    setErrors({});
    setAadhaar("");
    setOtp(["", "", "", "", "", ""]);
    setPanNumber("");
    setPanName("");
    setDlNumber("");
    setDob("");
    setFrontImage(null);
    setBackImage(null);
    setResendTimer(0);
    clearInterval(timerRef.current);
  };

  const showAlert = (type, message) => setAlert({ type, message });

  // ── OTP helpers ────────────────────────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      otpRefs.current[i - 1]?.focus();
  };

  // ── Aadhaar: Generate OTP ──────────────────────────────────────────────────
  const handleAadhaarSendOtp = async () => {
    const errs = {};
    if (!/^\d{12}$/.test(aadhaar))
      errs.aadhaar = "Enter a valid 12-digit Aadhaar number";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setAlert(null);
    try {
      const res = await axios.post(`${API}/api/kyc/aadhaar/send-otp`, {
        aadhaar,
        contactNumber,
      });
      if (res.data.alreadyVerified) {
        setStep("verified");
        return;
      }
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      startResendTimer();
      showAlert("success", "OTP sent to your Aadhaar-linked mobile number");
    } catch (e) {
      const status = e.response?.status;
      const errData = e.response?.data;
      // 504/502/503 from Nginx, or no response at all (network error)
      const isGatewayOrNetworkError =
        !e.response || status === 504 || status === 502 || status === 503;
      if (isGatewayOrNetworkError || errData?.serviceUnavailable) {
        // Auto-redirect to document fallback when OTP service is down
        setStep("upload");
        showAlert(
          "warning",
          errData?.message ||
            "Aadhaar OTP service is currently unavailable (server timeout). Please verify using documents instead.",
        );
      } else {
        showAlert("error", errData?.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Aadhaar: Resend OTP ────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setLoading(true);
    setAlert(null);
    try {
      await axios.post(`${API}/api/kyc/aadhaar/send-otp`, {
        aadhaar,
        contactNumber,
      });
      setOtp(["", "", "", "", "", ""]);
      startResendTimer();
      showAlert("success", "OTP resent successfully");
    } catch (e) {
      const status = e.response?.status;
      const errData = e.response?.data;
      const isGatewayOrNetworkError =
        !e.response || status === 504 || status === 502 || status === 503;
      if (isGatewayOrNetworkError || errData?.serviceUnavailable) {
        setStep("upload");
        showAlert(
          "warning",
          errData?.message ||
            "Aadhaar OTP service is currently unavailable (server timeout). Please verify using documents instead.",
        );
      } else {
        showAlert("error", errData?.message || "Failed to resend OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Aadhaar: Verify OTP ────────────────────────────────────────────────────
  const handleAadhaarVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length !== 6) {
      showAlert("error", "Enter the complete 6-digit OTP");
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      // Only send otp + contactNumber — backend fetches ref_id from DB
      await axios.post(`${API}/api/kyc/aadhaar/verify-otp`, {
        otp: otpVal,
        contactNumber,
      });
      setStep("verified");
    } catch (e) {
      showAlert(
        "error",
        e.response?.data?.message || "OTP verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── PAN Verify ─────────────────────────────────────────────────────────────
  const handlePanVerify = async () => {
    const errs = {};
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber))
      errs.panNumber = "Enter valid PAN (e.g. ABCDE1234F)";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setAlert(null);
    try {
      await axios.post(`${API}/api/kyc/pan/verify`, {
        panNumber,
        contactNumber,
      });
      setStep("verified");
    } catch (e) {
      showAlert(
        "error",
        e.response?.data?.message || "PAN verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── DL Verify ──────────────────────────────────────────────────────────────
  const handleDlVerify = async () => {
    const errs = {};
    if (!dlNumber.trim()) errs.dlNumber = "Licence number is required";
    if (!dob) errs.dob = "Date of birth is required";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setAlert(null);
    try {
      await axios.post(`${API}/api/kyc/dl/verify`, {
        licenceNumber: dlNumber,
        dob,
        contactNumber,
      });
      setStep("verified");
    } catch (e) {
      showAlert("error", e.response?.data?.message || "DL verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Upload Documents ───────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!frontImage && !backImage) {
      showAlert("error", "Upload at least one document image");
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const fd = new FormData();
      fd.append("contactNumber", contactNumber);
      if (frontImage) fd.append("frontImage", frontImage);
      if (backImage) fd.append("backImage", backImage);
      await axios.post(`${API}/api/kyc/upload-documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep("pending");
    } catch (e) {
      showAlert("error", e.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const subtitles = {
    aadhaar: "Aadhaar-based Identity Verification",
    pan: "PAN Card Verification",
    dl: "Driving Licence Verification",
  };

  return (
    <Box
      bg="gray.50"
      minH="calc(100vh - 60px)"
      display="flex"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="center"
      p={{ base: 3, md: 6 }}
      pt={{ base: 10, md: 20 }}
    >
      <Box
        bg="white"
        borderRadius="2xl"
        boxShadow="0 8px 40px rgba(0,0,0,0.10)"
        w="100%"
        maxW={{ base: "100%", sm: "480px" }}
        overflow="hidden"
        mb={15}
      >
        {/* Header */}
        <Box
          bg="blue.600"
          px={{ base: 5, md: 8 }}
          py={{ base: 5, md: 6 }}
          textAlign="center"
        >
          <Icon as={MdVerifiedUser} color="white" boxSize={10} mb={2} />
          <Text color="white !important" fontSize="xl" fontWeight="bold">
            KYC Verification
          </Text>
          <Text color="white !important" fontSize="sm" mt={1}>
            {subtitles[method]}
          </Text>
          <StepBar step={step} />
        </Box>

        <Box px={{ base: 5, md: 8 }} py={{ base: 6, md: 7 }}>
          {/* Method Selector — only on form step */}
          {step === "form" && (
            <HStack spacing={2} mb={6}>
              {methods.map((m) => (
                <Button
                  key={m.id}
                  flex={1}
                  size="sm"
                  leftIcon={<Icon as={m.icon} />}
                  colorScheme={method === m.id ? "blue" : "gray"}
                  variant={method === m.id ? "solid" : "outline"}
                  onClick={() => {
                    setMethod(m.id);
                    resetAll();
                  }}
                  isDisabled={m.disabled}
                  fontSize="xs"
                  px={2}
                >
                  {m.label}
                </Button>
              ))}
            </HStack>
          )}

          {/* Alert */}
          {alert && (
            <Alert status={alert.type} borderRadius="lg" mb={5} fontSize="sm">
              <AlertIcon />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Rejection notice */}
          {rejectedReason && step === "form" && (
            <Alert status="error" borderRadius="lg" mb={5} fontSize="sm">
              <AlertIcon />
              <AlertDescription>
                Your previous submission was rejected: {rejectedReason}. Please
                re-submit.
              </AlertDescription>
            </Alert>
          )}

          {/* ── AADHAAR: Step 1 — Form ── */}
          {method === "aadhaar" && step === "form" && (
            <VStack spacing={5}>
              {/* <FormControl>
                                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">Contact Number</FormLabel>
                                <InputGroup>
                                    <InputLeftElement pointerEvents="none"><Icon as={MdPhone} color="blue.400" /></InputLeftElement>
                                    <Input value={contactNumber} isDisabled borderRadius="lg" bg="gray.50" />
                                </InputGroup>
                            </FormControl> */}

              <FormControl isInvalid={!!errors.aadhaar}>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                  Aadhaar Number
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdCreditCard} color="blue.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Enter 12-digit Aadhaar number"
                    value={aadhaar}
                    onChange={(e) =>
                      setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))
                    }
                    focusBorderColor="blue.500"
                    borderRadius="lg"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.aadhaar}</FormErrorMessage>
              </FormControl>

              <Button
                colorScheme="blue"
                w="100%"
                size="lg"
                borderRadius="lg"
                onClick={handleAadhaarSendOtp}
                isDisabled={loading || aadhaar.length !== 12}
                mt={2}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Sending OTP...
                  </>
                ) : (
                  "Generate OTP"
                )}
              </Button>
            </VStack>
          )}

          {/* ── AADHAAR: Step 2 — OTP ── */}
          {method === "aadhaar" && step === "otp" && (
            <VStack spacing={5}>
              <Divider />

              <FormControl>
                <FormLabel
                  fontSize="sm"
                  fontWeight="semibold"
                  color="gray.700"
                  textAlign="center"
                >
                  Enter 6-digit OTP
                </FormLabel>
                <OtpInput
                  otp={otp}
                  onChange={handleOtpChange}
                  onKeyDown={handleOtpKeyDown}
                  refs={otpRefs}
                />
              </FormControl>

              <Button
                colorScheme="blue"
                w="100%"
                size="lg"
                borderRadius="lg"
                onClick={handleAadhaarVerifyOtp}
                isDisabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              {/* Resend OTP */}
              <HStack w="100%" justify="center">
                <Button
                  variant="outline"
                  colorScheme="blue"
                  size="sm"
                  leftIcon={<Icon as={MdRefresh} />}
                  onClick={handleResendOtp}
                  isDisabled={loading || resendTimer > 0}
                >
                  {resendTimer > 0
                    ? `Resend OTP (${resendTimer}s)`
                    : "Resend OTP"}
                </Button>
              </HStack>

              <Divider />

              {/* Fallback to documents */}
              <Box
                w="100%"
                textAlign="center"
                bg="orange.50"
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor="orange.200"
              >
                <Text fontSize="xs" color="gray.500" mb={2}>
                  Didn't receive OTP?
                </Text>
                <Button
                  variant="solid"
                  colorScheme="orange"
                  size="sm"
                  leftIcon={<Icon as={MdUploadFile} />}
                  onClick={() => {
                    setAlert(null);
                    setStep("upload");
                  }}
                >
                  Verify using Documents
                </Button>
              </Box>

              <Button
                variant="ghost"
                size="sm"
                color="blue.500"
                onClick={resetAll}
              >
                ← Change Aadhaar Details
              </Button>
            </VStack>
          )}

          {/* ── AADHAAR: Step 2 — Document Upload (Fallback) ── */}
          {method === "aadhaar" && step === "upload" && (
            <VStack spacing={5}>
              <Box textAlign="center">
                <Icon as={MdUploadFile} color="orange.400" boxSize={8} />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Upload Aadhaar front & back for manual verification
                </Text>
              </Box>
              <Divider />

              <SimpleGrid columns={1} spacing={4} w="100%">
                <DropZone
                  label="Front Image"
                  file={frontImage}
                  onFile={setFrontImage}
                  onClear={() => setFrontImage(null)}
                />
                <DropZone
                  label="Back Image"
                  file={backImage}
                  onFile={setBackImage}
                  onClear={() => setBackImage(null)}
                />
              </SimpleGrid>

              <Button
                colorScheme="orange"
                w="100%"
                size="lg"
                borderRadius="lg"
                leftIcon={<Icon as={MdUploadFile} />}
                onClick={handleUpload}
                isDisabled={loading || (!frontImage && !backImage)}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Uploading...
                  </>
                ) : (
                  "Upload Documents"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                color="blue.500"
                onClick={() => {
                  setAlert(null);
                  setStep("otp");
                }}
              >
                ← Back to OTP
              </Button>
            </VStack>
          )}

          {/* ── PAN FLOW ── */}
          {method === "pan" && step === "form" && (
            <VStack spacing={5}>
              <FormControl isInvalid={!!errors.panNumber}>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                  PAN Number
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdCreditCard} color="blue.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) =>
                      setPanNumber(e.target.value.toUpperCase().slice(0, 10))
                    }
                    focusBorderColor="blue.500"
                    borderRadius="lg"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.panNumber}</FormErrorMessage>
              </FormControl>
              <Button
                colorScheme="blue"
                w="100%"
                size="lg"
                borderRadius="lg"
                onClick={handlePanVerify}
                isDisabled={loading}
                mt={2}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Verifying...
                  </>
                ) : (
                  "Verify PAN"
                )}
              </Button>
            </VStack>
          )}

          {/* ── DL FLOW ── */}
          {method === "dl" && step === "form" && (
            <VStack spacing={5}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                  Contact Number
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdPhone} color="blue.400" />
                  </InputLeftElement>
                  <Input
                    value={contactNumber}
                    isDisabled
                    borderRadius="lg"
                    bg="gray.50"
                  />
                </InputGroup>
              </FormControl>
              <FormControl isInvalid={!!errors.dlNumber}>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                  Licence Number
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdDirectionsCar} color="blue.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Enter driving licence number"
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value.toUpperCase())}
                    focusBorderColor="blue.500"
                    borderRadius="lg"
                  />
                </InputGroup>
                <FormErrorMessage>{errors.dlNumber}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.dob}>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700">
                  Date of Birth
                </FormLabel>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  focusBorderColor="blue.500"
                  borderRadius="lg"
                />
                <FormErrorMessage>{errors.dob}</FormErrorMessage>
              </FormControl>
              <Button
                colorScheme="blue"
                w="100%"
                size="lg"
                borderRadius="lg"
                onClick={handleDlVerify}
                isDisabled={loading}
                mt={2}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" mr={2} />
                    Verifying...
                  </>
                ) : (
                  "Verify Licence"
                )}
              </Button>
            </VStack>
          )}

          {/* ── VERIFIED STATE ── */}
          {step === "verified" && (
            <VStack spacing={5} textAlign="center" py={4}>
              <Box
                w={20}
                h={20}
                borderRadius="full"
                bg="green.50"
                border="3px solid"
                borderColor="green.400"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
              >
                <Icon as={MdCheckCircle} color="green.500" boxSize={10} />
              </Box>
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                KYC Verified Successfully
              </Text>
              <Text fontSize="sm" color="gray.500">
                Your identity has been verified via{" "}
                {methods.find((m) => m.id === method)?.label}.
              </Text>

              <Box
                bg="gray.50"
                borderRadius="lg"
                p={4}
                w="100%"
                textAlign="left"
              >
                {method === "aadhaar" && (
                  <HStack>
                    <Text fontSize="sm" color="gray.500" w="130px">
                      Aadhaar:
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      XXXX XXXX {aadhaar.slice(-4)}
                    </Text>
                  </HStack>
                )}
                {method === "pan" && (
                  <HStack>
                    <Text fontSize="sm" color="gray.500" w="130px">
                      PAN:
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      XXXXXX{panNumber.slice(-4)}
                    </Text>
                  </HStack>
                )}
                {method === "dl" && (
                  <HStack>
                    <Text fontSize="sm" color="gray.500" w="130px">
                      Licence No:
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {dlNumber}
                    </Text>
                  </HStack>
                )}
              </Box>

              <Badge
                colorScheme="green"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
              >
                ✓ Verified
              </Badge>
            </VStack>
          )}

          {/* ── PENDING STATE (document upload submitted) ── */}
          {step === "pending" && (
            <VStack spacing={5} textAlign="center" py={4}>
              <Box
                w={20}
                h={20}
                borderRadius="full"
                bg="orange.50"
                border="3px solid"
                borderColor="orange.400"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
              >
                <Icon as={MdHourglassEmpty} color="orange.400" boxSize={10} />
              </Box>
              <Text fontSize="xl" fontWeight="bold" color="orange.500">
                Verification Pending
              </Text>
              <Text fontSize="sm" color="gray.500" px={2}>
                Your documents have been submitted and are awaiting admin
                review. You'll be notified once verified.
              </Text>

              <Box
                bg="orange.50"
                borderRadius="lg"
                p={4}
                w="100%"
                textAlign="left"
                border="1px solid"
                borderColor="orange.200"
              >
                <HStack mb={2}>
                  <Text fontSize="sm" color="gray.500" w="130px">
                    Contact:
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {contactNumber}
                  </Text>
                </HStack>
                <HStack>
                  <Text fontSize="sm" color="gray.500" w="130px">
                    Method:
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    Document Upload
                  </Text>
                </HStack>
              </Box>

              <Badge
                colorScheme="orange"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
              >
                ⏳ Pending Verification
              </Badge>
            </VStack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default KycVerification;

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Select,
} from "@chakra-ui/react";
import { MdCheckCircle, MdCancel, MdImage } from "react-icons/md";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const AdminKycPanel = () => {
  const [kycList, setKycList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchKyc = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/kyc/admin/list?status=${filter}`);
      setKycList(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, [filter]);

  const handleAction = async (id, action, reason = "") => {
    try {
      await axios.put(`${API}/api/kyc/admin/${id}`, { action, reason });
      fetchKyc();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || "Action failed");
    }
  };

  const openRejectModal = (kyc) => {
    setSelectedKyc(kyc);
    setRejectReason("");
    onOpen();
  };

  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            KYC Admin Panel
          </Text>
          <Select
            w="200px"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="">All</option>
          </Select>
        </HStack>

        {loading ? (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" />
          </Box>
        ) : kycList.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No KYC records found
          </Alert>
        ) : (
          <Box bg="white" borderRadius="lg" overflow="hidden" boxShadow="sm">
            <Table variant="simple">
              <Thead bg="gray.100">
                <Tr>
                  <Th>Contact</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Documents</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {kycList.map((kyc) => (
                  <Tr key={kyc._id}>
                    <Td>{kyc.contactNumber}</Td>
                    <Td>{kyc.name || "-"}</Td>
                    <Td>
                      <Badge colorScheme="blue">
                        {kyc.kycType?.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={kyc.isVerified ? "green" : "orange"}>
                        {kyc.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        {kyc.documents?.frontImage && (
                          <Button
                            size="xs"
                            colorScheme="blue"
                            leftIcon={<MdImage />}
                            onClick={() =>
                              window.open(kyc.documents.frontImage, "_blank")
                            }
                          >
                            Front
                          </Button>
                        )}
                        {kyc.documents?.backImage && (
                          <Button
                            size="xs"
                            colorScheme="blue"
                            leftIcon={<MdImage />}
                            onClick={() =>
                              window.open(kyc.documents.backImage, "_blank")
                            }
                          >
                            Back
                          </Button>
                        )}
                        {!kyc.documents?.frontImage &&
                          !kyc.documents?.backImage &&
                          "-"}
                      </HStack>
                    </Td>
                    <Td>
                      {kyc.isVerified && (
                        <Text fontSize="sm" color="green.600">
                          ✓ Approved
                        </Text>
                      )}
                      {!kyc.isVerified &&
                        (kyc.verificationMethod === "document" ||
                          kyc.documents?.frontImage ||
                          kyc.documents?.backImage) && (
                          <HStack spacing={2}>
                            <Button
                              size="sm"
                              colorScheme="green"
                              leftIcon={<MdCheckCircle />}
                              onClick={() => handleAction(kyc._id, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              leftIcon={<MdCancel />}
                              onClick={() => openRejectModal(kyc)}
                            >
                              Reject
                            </Button>
                          </HStack>
                        )}
                      {!kyc.isVerified &&
                        kyc.verificationMethod !== "document" &&
                        !kyc.documents?.frontImage &&
                        !kyc.documents?.backImage && (
                          <Text fontSize="sm" color="gray.400">
                            —
                          </Text>
                        )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>

      {/* Reject Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reject KYC</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" mb={3}>
              Provide a reason for rejection:
            </Text>
            <Textarea
              placeholder="e.g. Document not clear, mismatch in details"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() =>
                handleAction(selectedKyc._id, "reject", rejectReason)
              }
            >
              Reject
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminKycPanel;

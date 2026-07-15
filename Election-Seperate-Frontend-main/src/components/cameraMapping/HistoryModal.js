import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Center,
  Text,
  TableContainer,
} from "@chakra-ui/react";
import { getCameraMappingHistory } from "../../actions/cameraMappingActions";

const ACTION_COLORS = { INSERT: "green", UPDATE: "blue", DELETE: "red" };

/** Read-only audit trail for a single booth mapping. */
export default function HistoryModal({ isOpen, onClose, booth }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !booth?.id) return;
    (async () => {
      setLoading(true);
      const res = await getCameraMappingHistory(booth.id);
      setRows(res.success ? res.data : []);
      setLoading(false);
    })();
  }, [isOpen, booth]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Mapping History{booth?.streamname ? ` — ${booth.streamname}` : ""}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <Center py={10}><Spinner /></Center>
          ) : rows.length === 0 ? (
            <Center py={10}><Text color="gray.500">No history found.</Text></Center>
          ) : (
            <TableContainer>
              <Table size="sm" variant="striped">
                <Thead>
                  <Tr>
                    <Th>Action</Th>
                    <Th>Camera</Th>
                    <Th>District</Th>
                    <Th>Assembly</Th>
                    <Th>PS</Th>
                    <Th>Location</Th>
                    <Th>Type</Th>
                    <Th>Updated By</Th>
                    <Th>Updated Date</Th>
                    <Th>IP</Th>
                    <Th>Active</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td>
                        <Badge colorScheme={ACTION_COLORS[r.Action] || "gray"}>
                          {r.Action}
                        </Badge>
                      </Td>
                      <Td>{r.streamname}</Td>
                      <Td>{r.district}</Td>
                      <Td>{r.acname}</Td>
                      <Td>{r.PSNum}</Td>
                      <Td>{r.location}</Td>
                      <Td>{r.cameralocationtype}</Td>
                      <Td>{r.updatedBy}</Td>
                      <Td>{r.updatedDate ? new Date(r.updatedDate).toLocaleString() : ""}</Td>
                      <Td>{r.IPAddress}</Td>
                      <Td>{r.isdelete ? "—" : "✓"}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

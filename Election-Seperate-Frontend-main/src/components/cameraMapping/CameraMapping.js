import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Flex,
  Heading,
  HStack,
  Button,
  Input,
  Select,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Spinner,
  Center,
  Text,
  VStack,
  useDisclosure,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import {
  MdSearch,
  MdRefresh,
  MdAdd,
  MdFileDownload,
  MdMoreVert,
  MdEdit,
  MdDelete,
  MdHistory,
  MdSwapHoriz,
  MdArrowUpward,
  MdArrowDownward,
  MdVideocam,
} from "react-icons/md";
import * as XLSX from "xlsx";
import {
  listCameraMappings,
  getCameraMapping,
  deleteCameraMapping,
  swapCameraMapping,
} from "../../actions/cameraMappingActions";
import CameraMappingFormModal from "./CameraMappingFormModal";
import HistoryModal from "./HistoryModal";

const PAGE_SIZES = [10, 25, 50, 100];
const EXPORT_CAP = 5000; // safety cap for client-side Excel export

const COLUMNS = [
  { key: "cameraName", label: "Camera Name" },
  { key: "district", label: "District" },
  { key: "assembly", label: "Assembly" },
  { key: "psNumber", label: "PS Number" },
  { key: "location", label: "Location" },
  { key: "cameraType", label: "Camera Type" },
  { key: "operator", label: "Operator" },
  { key: "updatedBy", label: "Updated By" },
  { key: "updatedDate", label: "Updated Date" },
];

export default function CameraMapping() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Search-driven only: nothing is shown until the user searches.
  const [searchInput, setSearchInput] = useState(""); // what's in the box
  const [search, setSearch] = useState(""); // applied (debounced) term
  const [sortBy, setSortBy] = useState("updatedDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const hasQuery = search.trim().length > 0;

  // Modals / dialogs
  const formModal = useDisclosure();
  const historyModal = useDisclosure();
  const deleteDialog = useDisclosure();
  const swapDialog = useDisclosure();
  const [selected, setSelected] = useState(null); // row for edit/history/delete
  const [swapInfo, setSwapInfo] = useState(null); // { message, id1, boothId, payload }
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef();
  const searchDebounce = useRef(null);

  // ── data fetching (only when there is a search term) ─────────────────────
  const fetchData = useCallback(async () => {
    if (!search.trim()) {
      setRows([]);
      setPagination({ page: 1, limit, total: 0, totalPages: 0 });
      return;
    }
    setLoading(true);
    const res = await listCameraMappings({
      page,
      limit,
      search: search.trim(),
      sortBy,
      sortOrder,
    });
    if (res.success === false) {
      toast({ title: res.message || "Failed to load", status: "error" });
      setRows([]);
    } else {
      setRows(res.data || []);
      setPagination(res.pagination || { page, limit, total: 0, totalPages: 0 });
    }
    setLoading(false);
  }, [page, limit, search, sortBy, sortOrder, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── handlers ────────────────────────────────────────────────────────────
  const onSearchChange = (value) => {
    setSearchInput(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    setSortBy("updatedDate");
    setSortOrder("desc");
  };

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const openAdd = () => { setSelected(null); formModal.onOpen(); };

  const openEdit = async (row) => {
    // Fetch full record (operator fields etc.) before editing.
    const res = await getCameraMapping(row.id);
    setSelected(res.success !== false ? res.data : row);
    formModal.onOpen();
  };

  const openHistory = (row) => { setSelected(row); historyModal.onOpen(); };
  const openDelete = (row) => { setSelected(row); deleteDialog.onOpen(); };

  const confirmDelete = async () => {
    setBusy(true);
    const res = await deleteCameraMapping(selected.id);
    setBusy(false);
    deleteDialog.onClose();
    if (res.success === false) {
      toast({ title: res.message || "Delete failed", status: "error" });
    } else {
      toast({ title: res.message || "Deleted", status: "success" });
      fetchData();
    }
  };

  // FormModal reports a DupDID duplicate -> open swap confirmation.
  const handleDuplicate = (info) => {
    setSwapInfo(info);
    formModal.onClose();
    swapDialog.onOpen();
  };

  const confirmSwap = async () => {
    setBusy(true);
    const res = await swapCameraMapping({
      id: swapInfo.boothId,
      id1: swapInfo.id1,
      ...swapInfo.payload,
    });
    setBusy(false);
    swapDialog.onClose();
    if (res.success === false || res.status === false) {
      toast({ title: res.message || "Swap failed", status: "error" });
    } else {
      toast({ title: res.message || "Swapped", status: "success" });
      setSwapInfo(null);
      fetchData();
    }
  };

  const exportToExcel = async () => {
    if (!hasQuery) {
      toast({ title: "Search first, then export the results", status: "warning" });
      return;
    }
    toast({ title: "Preparing export…", status: "info", duration: 2000 });
    const all = [];
    let p = 1;
    const step = 100;
    // Page through the searched result set up to a safety cap.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await listCameraMappings({
        page: p, limit: step, search: search.trim(), sortBy, sortOrder,
      });
      if (res.success === false) break;
      all.push(...(res.data || []));
      if (all.length >= (res.pagination?.total || 0) || all.length >= EXPORT_CAP) break;
      p += 1;
    }
    if (all.length === 0) {
      toast({ title: "Nothing to export", status: "warning" });
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(
      all.map((r) => ({
        "Camera Name": r.streamname,
        District: r.district,
        Assembly: r.acname,
        "Assembly Code": r.accode,
        "PS Number": r.PSNum,
        Location: r.location,
        "Camera Type": r.cameralocationtype,
        Operator: r.operatorName,
        "Operator Number": r.operatorNumber,
        "Updated By": r.updatedBy,
        "Updated Date": r.updatedDate ? new Date(r.updatedDate).toLocaleString() : "",
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "CameraMapping");
    XLSX.writeFile(wb, `camera-mapping-${Date.now()}.xlsx`);
    toast({
      title: `Exported ${all.length} record(s)${all.length >= EXPORT_CAP ? " (capped)" : ""}`,
      status: "success",
    });
  };

  const SortIcon = ({ colKey }) =>
    sortBy === colKey ? (
      <Icon as={sortOrder === "asc" ? MdArrowUpward : MdArrowDownward} ml={1} boxSize={3.5} />
    ) : null;

  return (
    <Box p={{ base: 3, md: 6 }} bg="gray.50" _dark={{ bg: "gray.900" }} minH="100vh">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={5} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" bgGradient="linear(to-r, blue.500, cyan.500)" bgClip="text">
            Camera Mapping
          </Heading>
          <Text color="gray.500" fontSize="sm">
            Search a camera to view and manage its booth mapping
          </Text>
        </Box>
        <HStack>
          <Button leftIcon={<MdFileDownload />} variant="outline" colorScheme="green"
            onClick={exportToExcel} isDisabled={!hasQuery}>
            Export
          </Button>
          <Button leftIcon={<MdAdd />} colorScheme="blue" onClick={openAdd}>
            Add Mapping
          </Button>
        </HStack>
      </Flex>

      {/* Toolbar — single search bar only */}
      <Box bg="white" _dark={{ bg: "gray.800" }} p={4} borderRadius="xl" boxShadow="sm" mb={4}>
        <Flex gap={3} wrap="wrap" align="center">
          <InputGroup maxW="420px">
            <InputLeftElement pointerEvents="none"><MdSearch color="gray" /></InputLeftElement>
            <Input
              placeholder="Search camera by name, location, operator, district…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
          </InputGroup>
          <Tooltip label="Clear search">
            <Button variant="ghost" onClick={clearSearch} isDisabled={!searchInput && !search}>
              Clear
            </Button>
          </Tooltip>
          <Tooltip label="Refresh results">
            <IconButton aria-label="Refresh" icon={<MdRefresh />} variant="ghost"
              onClick={fetchData} isDisabled={!hasQuery} />
          </Tooltip>
        </Flex>
      </Box>

      {/* Results */}
      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" boxShadow="sm" overflow="hidden">
        {!hasQuery && !loading ? (
          // Idle prompt — no full list is ever shown up front.
          <Center py={20}>
            <VStack spacing={3} color="gray.400">
              <Icon as={MdVideocam} boxSize={12} />
              <Text fontSize="lg" fontWeight="600">Search for a camera to begin</Text>
              <Text fontSize="sm">
                Start typing a camera name, location or operator above to view its mapping and actions.
              </Text>
            </VStack>
          </Center>
        ) : (
          <>
            <TableContainer>
              <Table size="sm">
                <Thead bg="gray.100" _dark={{ bg: "gray.700" }}>
                  <Tr>
                    {COLUMNS.map((c) => (
                      <Th key={c.key} cursor="pointer" onClick={() => toggleSort(c.key)} userSelect="none" whiteSpace="nowrap">
                        <Flex align="center">{c.label}<SortIcon colKey={c.key} /></Flex>
                      </Th>
                    ))}
                    <Th textAlign="center">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    <Tr><Td colSpan={COLUMNS.length + 1}><Center py={10}><Spinner size="lg" /></Center></Td></Tr>
                  ) : rows.length === 0 ? (
                    <Tr><Td colSpan={COLUMNS.length + 1}><Center py={10}><Text color="gray.500">No cameras match “{search}”.</Text></Center></Td></Tr>
                  ) : (
                    rows.map((r) => (
                      <Tr key={r.id} _hover={{ bg: "gray.50", _dark: { bg: "gray.700" } }}>
                        <Td fontWeight="600">{r.streamname}</Td>
                        <Td>{r.district}</Td>
                        <Td>{r.acname}</Td>
                        <Td>{r.PSNum}</Td>
                        <Td>{r.location}</Td>
                        <Td>
                          <Badge colorScheme={r.cameralocationtype === "Outside" ? "orange" : "green"}>
                            {r.cameralocationtype}
                          </Badge>
                        </Td>
                        <Td>{r.operatorName}</Td>
                        <Td>{r.updatedBy}</Td>
                        <Td whiteSpace="nowrap">{r.updatedDate ? new Date(r.updatedDate).toLocaleDateString() : ""}</Td>
                        <Td textAlign="center">
                          <Menu>
                            <MenuButton as={IconButton} icon={<MdMoreVert />} variant="ghost" size="sm" aria-label="Actions" />
                            <MenuList>
                              <MenuItem icon={<MdEdit />} onClick={() => openEdit(r)}>Edit</MenuItem>
                              <MenuItem icon={<MdHistory />} onClick={() => openHistory(r)}>View History</MenuItem>
                              <MenuItem icon={<MdDelete />} color="red.500" onClick={() => openDelete(r)}>Delete</MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>

            {/* Pagination (only meaningful with results) */}
            {rows.length > 0 && (
              <Flex justify="space-between" align="center" p={4} wrap="wrap" gap={3}>
                <HStack>
                  <Text fontSize="sm" color="gray.500">Rows per page</Text>
                  <Select size="sm" w="80px" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                    {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Text fontSize="sm" color="gray.500">{pagination.total} result(s)</Text>
                </HStack>
                <HStack>
                  <Text fontSize="sm" color="gray.500">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </Text>
                  <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={pagination.page <= 1}>Prev</Button>
                  <Button size="sm" onClick={() => setPage((p) => p + 1)} isDisabled={pagination.page >= pagination.totalPages}>Next</Button>
                </HStack>
              </Flex>
            )}
          </>
        )}
      </Box>

      {/* Add / Edit form */}
      <CameraMappingFormModal
        isOpen={formModal.isOpen}
        onClose={formModal.onClose}
        initialData={selected}
        onSaved={() => { formModal.onClose(); fetchData(); }}
        onDuplicate={handleDuplicate}
      />

      {/* History */}
      <HistoryModal isOpen={historyModal.isOpen} onClose={historyModal.onClose} booth={selected} />

      {/* Delete confirmation */}
      <AlertDialog isOpen={deleteDialog.isOpen} leastDestructiveRef={cancelRef} onClose={deleteDialog.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete Mapping</AlertDialogHeader>
            <AlertDialogBody>
              Delete the mapping for camera <b>{selected?.streamname}</b> at <b>{selected?.location}</b>?
              This is a soft delete and preserves history.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={deleteDialog.onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDelete} isLoading={busy}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Swap confirmation (triggered on DupDID) */}
      <AlertDialog isOpen={swapDialog.isOpen} leastDestructiveRef={cancelRef} onClose={swapDialog.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Swap Camera</AlertDialogHeader>
            <AlertDialogBody>
              <Text mb={2}>{swapInfo?.message}</Text>
              <Text fontWeight="600">This camera is already mapped. Do you want to swap?</Text>
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={cancelRef} onClick={swapDialog.onClose}>Cancel</Button>
              <Button colorScheme="orange" leftIcon={<MdSwapHoriz />} onClick={confirmSwap} isLoading={busy}>
                Swap
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

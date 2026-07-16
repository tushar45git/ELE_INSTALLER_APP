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
  SimpleGrid,
  Divider,
  useBreakpointValue,
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
  // Phones/small tablets get a card layout; large screens get the full table.
  const useCards = useBreakpointValue({ base: true, lg: false });

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

  // Label/value pair used inside the mobile cards.
  const CardField = ({ label, value }) => (
    <Box minW={0}>
      <Text fontSize="xs" color="gray.400" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Box fontWeight="500" isTruncated>{value === "" || value == null ? "—" : value}</Box>
    </Box>
  );

  const rowActions = (r) => (
    <Menu>
      <MenuButton as={IconButton} icon={<MdMoreVert />} variant="ghost" size="sm" aria-label="Actions" />
      <MenuList>
        <MenuItem icon={<MdEdit />} onClick={() => openEdit(r)}>Edit</MenuItem>
        <MenuItem icon={<MdHistory />} onClick={() => openHistory(r)}>View History</MenuItem>
        <MenuItem icon={<MdDelete />} color="red.500" onClick={() => openDelete(r)}>Delete</MenuItem>
      </MenuList>
    </Menu>
  );

  const typeBadge = (t) => (
    <Badge colorScheme={t === "Outside" ? "orange" : "green"}>{t}</Badge>
  );

  return (
    <Box p={{ base: 3, md: 6 }} bg="gray.50" _dark={{ bg: "gray.900" }} minH="100vh">
      {/* Header */}
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        mb={5}
        gap={3}
      >
        <Box>
          <Heading size={{ base: "md", md: "lg" }} bgGradient="linear(to-r, blue.500, cyan.500)" bgClip="text">
            Camera Mapping
          </Heading>
          <Text color="gray.500" fontSize="sm">
            Search a camera to view and manage its booth mapping
          </Text>
        </Box>
        <HStack spacing={3} w={{ base: "100%", md: "auto" }}>
          <Button leftIcon={<MdFileDownload />} variant="outline" colorScheme="green"
            onClick={exportToExcel} isDisabled={!hasQuery} flex={{ base: 1, md: "none" }}>
            Export
          </Button>
          <Button leftIcon={<MdAdd />} colorScheme="blue" onClick={openAdd}
            flex={{ base: 1, md: "none" }}>
            Add Mapping
          </Button>
        </HStack>
      </Flex>

      {/* Toolbar — single search bar only */}
      <Box bg="white" _dark={{ bg: "gray.800" }} p={{ base: 3, md: 4 }} borderRadius="xl" boxShadow="sm" mb={4}>
        <Flex gap={3} wrap="wrap" align="center">
          <InputGroup flex={{ base: "1 1 100%", md: "0 1 420px" }}>
            <InputLeftElement pointerEvents="none"><MdSearch color="gray" /></InputLeftElement>
            <Input
              placeholder="Search camera by name, location, operator…"
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

        {/* Sort controls (cards can't sort by header tap) — mobile only */}
        {useCards && hasQuery && (
          <Flex gap={2} mt={3} align="center">
            <Text fontSize="sm" color="gray.500" flexShrink={0}>Sort by</Text>
            <Select
              size="sm"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </Select>
            <Tooltip label={sortOrder === "asc" ? "Ascending" : "Descending"}>
              <IconButton
                aria-label="Toggle sort order"
                size="sm"
                variant="outline"
                icon={sortOrder === "asc" ? <MdArrowUpward /> : <MdArrowDownward />}
                onClick={() => { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); setPage(1); }}
              />
            </Tooltip>
          </Flex>
        )}
      </Box>

      {/* Results */}
      <Box bg="white" _dark={{ bg: "gray.800" }} borderRadius="xl" boxShadow="sm" overflow="hidden">
        {!hasQuery && !loading ? (
          // Idle prompt — no full list is ever shown up front.
          <Center py={{ base: 12, md: 20 }} px={4}>
            <VStack spacing={3} color="gray.400" textAlign="center">
              <Icon as={MdVideocam} boxSize={{ base: 10, md: 12 }} />
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="600">Search for a camera to begin</Text>
              <Text fontSize="sm">
                Start typing a camera name, location or operator above to view its mapping and actions.
              </Text>
            </VStack>
          </Center>
        ) : loading ? (
          <Center py={12}><Spinner size="lg" /></Center>
        ) : rows.length === 0 ? (
          <Center py={12} px={4}>
            <Text color="gray.500" textAlign="center">No cameras match “{search}”.</Text>
          </Center>
        ) : (
          <>
            {useCards ? (
              /* ── Mobile: card list ── */
              <VStack spacing={3} align="stretch" p={3}>
                {rows.map((r) => (
                  <Box
                    key={r.id}
                    borderWidth="1px"
                    borderColor="gray.200"
                    _dark={{ borderColor: "gray.700" }}
                    borderRadius="lg"
                    p={4}
                  >
                    <Flex justify="space-between" align="flex-start" gap={2}>
                      <Box minW={0}>
                        <Text fontWeight="700" isTruncated>{r.streamname}</Text>
                        <Text fontSize="sm" color="gray.500" isTruncated>
                          {r.district} · {r.acname}
                        </Text>
                      </Box>
                      {rowActions(r)}
                    </Flex>
                    <Divider my={3} />
                    <SimpleGrid columns={2} spacingX={4} spacingY={3}>
                      <CardField label="PS Number" value={r.PSNum} />
                      <CardField label="Camera Type" value={typeBadge(r.cameralocationtype)} />
                      <CardField label="Location" value={r.location} />
                      <CardField label="Operator" value={r.operatorName} />
                      <CardField label="Updated By" value={r.updatedBy} />
                      <CardField
                        label="Updated"
                        value={r.updatedDate ? new Date(r.updatedDate).toLocaleDateString() : ""}
                      />
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            ) : (
              /* ── Desktop: full table ── */
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
                    {rows.map((r) => (
                      <Tr key={r.id} _hover={{ bg: "gray.50", _dark: { bg: "gray.700" } }}>
                        <Td fontWeight="600">{r.streamname}</Td>
                        <Td>{r.district}</Td>
                        <Td>{r.acname}</Td>
                        <Td>{r.PSNum}</Td>
                        <Td>{r.location}</Td>
                        <Td>{typeBadge(r.cameralocationtype)}</Td>
                        <Td>{r.operatorName}</Td>
                        <Td>{r.updatedBy}</Td>
                        <Td whiteSpace="nowrap">{r.updatedDate ? new Date(r.updatedDate).toLocaleDateString() : ""}</Td>
                        <Td textAlign="center">{rowActions(r)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}

            {/* Pagination */}
            <Flex
              direction={{ base: "column", sm: "row" }}
              justify="space-between"
              align={{ base: "stretch", sm: "center" }}
              p={4}
              gap={3}
            >
              <HStack justify={{ base: "space-between", sm: "flex-start" }}>
                <Text fontSize="sm" color="gray.500">Rows per page</Text>
                <Select size="sm" w="80px" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">{pagination.total} result(s)</Text>
              </HStack>
              <HStack justify={{ base: "space-between", sm: "flex-end" }}>
                <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </Text>
                <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={pagination.page <= 1}>Prev</Button>
                <Button size="sm" onClick={() => setPage((p) => p + 1)} isDisabled={pagination.page >= pagination.totalPages}>Next</Button>
              </HStack>
            </Flex>
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

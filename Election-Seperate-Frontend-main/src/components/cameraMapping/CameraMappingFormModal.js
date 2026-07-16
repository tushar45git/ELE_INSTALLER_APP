import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  SimpleGrid,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  Box,
  List,
  ListItem,
  Text,
  InputGroup,
  InputRightElement,
  Spinner,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { MdKeyboardArrowDown } from "react-icons/md";
import {
  createCameraMapping,
  updateCameraMapping,
  searchCameras,
  getFormSuggestions,
  getLocationForPs,
} from "../../actions/cameraMappingActions";

const CAMERA_LOCATION_TYPES = ["Inside", "Outside"];

/**
 * A dropdown-combobox that works reliably in the mobile WebView (native
 * <datalist> does not). Shows a filterable list of `options` on focus / typing
 * yet still allows free-text entry for brand-new values.
 *
 * options: [{ value, label?, sub? }]
 */
function ComboField({ value, onChange, options, placeholder, isInvalid }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const q = String(value || "").toLowerCase();
  const filtered = options
    .filter(
      (o) =>
        String(o.value).toLowerCase().includes(q) ||
        String(o.label || "").toLowerCase().includes(q) ||
        String(o.sub || "").toLowerCase().includes(q),
    )
    .slice(0, 50);

  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
  };

  return (
    <Box position="relative" ref={wrapRef}>
      <InputGroup>
        <Input
          value={value}
          placeholder={placeholder}
          isInvalid={isInvalid}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <InputRightElement>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Show options"
            tabIndex={-1}
            icon={<MdKeyboardArrowDown />}
            onClick={() => setOpen((o) => !o)}
          />
        </InputRightElement>
      </InputGroup>
      {open && filtered.length > 0 && (
        <List
          position="absolute"
          zIndex={30}
          bg="white"
          _dark={{ bg: "gray.700" }}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          w="100%"
          maxH="220px"
          overflowY="auto"
          boxShadow="lg"
          mt={1}
        >
          {filtered.map((o) => (
            <ListItem
              key={`${o.value}-${o.label || ""}`}
              px={3}
              py={2}
              cursor="pointer"
              _hover={{ bg: "blue.50", _dark: { bg: "gray.600" } }}
              onClick={() => pick(o)}
            >
              <Text fontWeight="500">{o.label || o.value}</Text>
              {o.sub ? (
                <Text fontSize="xs" color="gray.500">{o.sub}</Text>
              ) : null}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

// Defaults pre-filled when ADDING a new mapping (editing keeps the record's values).
const DEFAULT_ADD_DISTRICT = "PATNA";
const DEFAULT_ADD_ACCODE = "182";
const DEFAULT_ADD_ACNAME = "182-Bankipur";

const EMPTY = {
  streamId: "",
  streamName: "",
  district: "",
  accode: "",
  acname: "",
  psNum: "",
  location: "",
  cameraLocationType: "Inside",
  operatorName: "",
  operatorNumber: "",
  operatorDesignation: "",
  longitude: "",
  latitude: "",
};

/**
 * Add / Edit Camera Mapping form.
 *
 * On save, a business duplicate (DupDID while editing) is NOT an error — the
 * parent is notified via onDuplicate() so it can raise the swap dialog. An
 * AddExist duplicate (while adding) is surfaced inline as a blocking error.
 */
export default function CameraMappingFormModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
  onDuplicate,
  lockCamera = false, // when true, the camera is fixed (e.g. AutoInstaller flow)
  detectLocationSwap = false, // AutoInstaller: detect an occupied location slot
  onLocationConflict, // called with the LocSwap prompt when a slot is occupied
}) {
  const toast = useToast();
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Camera combobox state
  const [cameraQuery, setCameraQuery] = useState("");
  const [cameraOptions, setCameraOptions] = useState([]);
  const [searchingCameras, setSearchingCameras] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const debounceRef = useRef(null);

  // Field autocomplete suggestions (cascading: district -> assembly -> PS)
  const [suggest, setSuggest] = useState({
    districts: [],
    assemblies: [],
    psNumbers: [],
  });
  const suggestDebounce = useRef(null);
  const locationDebounce = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const base = initialData
      ? {
          streamId: initialData.streamid ?? "",
          streamName: initialData.streamname ?? "",
          district: initialData.district ?? "",
          accode: initialData.accode ?? "",
          acname: initialData.acname ?? "",
          psNum: initialData.PSNum ?? "",
          location: initialData.location ?? "",
          cameraLocationType: initialData.cameralocationtype ?? "Inside",
          operatorName: initialData.operatorName ?? "",
          operatorNumber: initialData.operatorNumber ?? "",
          operatorDesignation: initialData.operatorDesignation ?? "",
          longitude: initialData.longitude ?? "",
          latitude: initialData.latitude ?? "",
        }
      : { ...EMPTY };

    // Adding a new mapping (no booth id) -> default District/Assembly.
    if (!initialData?.id) {
      if (!base.district) base.district = DEFAULT_ADD_DISTRICT;
      if (!base.accode) {
        base.accode = DEFAULT_ADD_ACCODE;
        if (!base.acname) base.acname = DEFAULT_ADD_ACNAME;
      }
    }

    setForm(base);
    setCameraQuery(initialData?.streamname ?? "");
    setErrors({});
    setShowOptions(false);
  }, [isOpen, initialData]);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  // Fetch cascading suggestions (debounced) whenever the modal opens or the
  // district / assembly selection changes.
  useEffect(() => {
    if (!isOpen) return;
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    suggestDebounce.current = setTimeout(async () => {
      const res = await getFormSuggestions(form.district, form.acname);
      if (res.success !== false) {
        setSuggest({
          districts: res.districts || [],
          assemblies: res.assemblies || [],
          psNumbers: res.psNumbers || [],
        });
      }
    }, 250);
    return () => clearTimeout(suggestDebounce.current);
  }, [isOpen, form.district, form.acname]);

  // Req 3: auto-fill Location for the chosen (assembly, PS number) so the
  // location stays consistent with the rest of that booth and avoids conflicts.
  useEffect(() => {
    if (!isOpen) return;
    const acname = form.acname?.trim();
    const psNum = form.psNum?.trim();
    if (!acname || !psNum) return;
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    locationDebounce.current = setTimeout(async () => {
      const res = await getLocationForPs(acname, psNum);
      if (res.success !== false && res.location) {
        setForm((prev) =>
          prev.location === res.location
            ? prev
            : { ...prev, location: res.location },
        );
      }
    }, 350);
    return () => clearTimeout(locationDebounce.current);
  }, [isOpen, form.acname, form.psNum]);

  // Clearing the PS number clears the auto-filled location too (no stale value).
  const onPsNumChange = (value) => {
    setField("psNum", value);
    if (!value.trim()) setField("location", "");
  };

  // Assembly code <-> name are paired in the DB; selecting one fills the other.
  const onAssemblyNameChange = (value) => {
    setField("acname", value);
    const match = suggest.assemblies.find((a) => a.acname === value);
    if (match && match.accode) setField("accode", match.accode);
  };
  const onAssemblyCodeChange = (value) => {
    setField("accode", value);
    const match = suggest.assemblies.find((a) => String(a.accode) === value);
    if (match && match.acname) setField("acname", match.acname);
  };

  // Debounced camera search
  const runCameraSearch = useCallback((term) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchingCameras(true);
      const res = await searchCameras(term, 25);
      setCameraOptions(res.success ? res.data : []);
      setSearchingCameras(false);
      setShowOptions(true);
    }, 300);
  }, []);

  const onCameraInput = (value) => {
    setCameraQuery(value);
    setField("streamId", ""); // force re-selection until a real option is picked
    runCameraSearch(value);
  };

  const pickCamera = (opt) => {
    setField("streamId", opt.id);
    setField("streamName", opt.streamname);
    setCameraQuery(opt.streamname);
    setShowOptions(false);
  };

  const validate = () => {
    const e = {};
    if (!form.streamId) e.streamId = "Select a valid camera";
    if (!form.district.trim()) e.district = "District is required";
    if (!form.accode.trim()) e.accode = "Assembly Code is required";
    if (!form.acname.trim()) e.acname = "Assembly Name is required";
    if (!form.location.trim()) e.location = "Location is required";
    if (!form.cameraLocationType) e.cameraLocationType = "Camera type is required";
    if (form.longitude !== "" && isNaN(Number(form.longitude)))
      e.longitude = "Longitude must be a number";
    if (form.latitude !== "" && isNaN(Number(form.latitude)))
      e.latitude = "Latitude must be a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    streamId: Number(form.streamId),
    district: form.district.trim(),
    accode: form.accode.trim(),
    acname: form.acname.trim(),
    psNum: form.psNum.trim(),
    location: form.location.trim(),
    cameraLocationType: form.cameraLocationType,
    operatorName: form.operatorName.trim(),
    operatorNumber: form.operatorNumber.trim(),
    operatorDesignation: form.operatorDesignation.trim(),
    longitude: form.longitude === "" ? 0 : Number(form.longitude),
    latitude: form.latitude === "" ? 0 : Number(form.latitude),
  });

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = buildPayload();
    // AutoInstaller edit: ask the server to flag an occupied location slot.
    const updatePayload =
      detectLocationSwap ? { ...payload, detectLocationSwap: true } : payload;
    const res = isEdit
      ? await updateCameraMapping(initialData.id, updatePayload)
      : await createCameraMapping(payload);
    setSaving(false);

    if (res.success === false) {
      toast({ title: res.message || "Save failed", status: "error", duration: 4000 });
      return;
    }

    // Business branches (HTTP 200, status:false)
    if (res.status === false) {
      if (res.error === "DupDID") {
        // Map Camera page: camera already mapped elsewhere -> offer swap.
        onDuplicate?.({ ...res, payload, boothId: initialData.id });
        return;
      }
      if (res.error === "LocSwap") {
        // AutoInstaller: target location slot occupied -> offer camera swap.
        onLocationConflict?.({ ...res, payload, currentBoothId: initialData.id });
        return;
      }
      // AddExist (or any other) — blocking error while adding.
      toast({ title: res.message, status: "warning", duration: 6000, isClosable: true });
      return;
    }

    toast({ title: res.message || "Saved", status: "success", duration: 3000 });
    onSaved?.({
      ...payload,
      streamName: form.streamName,
      boothId: isEdit ? initialData.id : res.boothId,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "sm", md: "3xl" }}
      scrollBehavior="inside"
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        mx={{ base: 4, md: 6 }}
        my={{ base: 6, md: 8 }}
        maxH={{ base: "85vh", md: "85vh" }}
        borderRadius="xl"
      >
        <ModalHeader>{isEdit ? "Edit Camera Mapping" : "Add Camera Mapping"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {/* Camera combobox spans both columns */}
            <FormControl isInvalid={!!errors.streamId} gridColumn={{ md: "span 2" }}>
              <FormLabel>Camera (Stream)</FormLabel>
              {lockCamera ? (
                <Input value={cameraQuery} isReadOnly isDisabled
                  title="Camera is fixed for this installation" />
              ) : (
              <Box position="relative">
                <InputGroup>
                  <Input
                    placeholder="Search camera by stream name or device id"
                    value={cameraQuery}
                    onChange={(e) => onCameraInput(e.target.value)}
                    onFocus={() => cameraOptions.length && setShowOptions(true)}
                    autoComplete="off"
                  />
                  {searchingCameras && (
                    <InputRightElement>
                      <Spinner size="sm" />
                    </InputRightElement>
                  )}
                </InputGroup>
                {showOptions && cameraOptions.length > 0 && (
                  <List
                    position="absolute"
                    zIndex={20}
                    bg="white"
                    _dark={{ bg: "gray.700" }}
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    w="100%"
                    maxH="220px"
                    overflowY="auto"
                    boxShadow="lg"
                    mt={1}
                  >
                    {cameraOptions.map((opt) => (
                      <ListItem
                        key={opt.id}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "blue.50", _dark: { bg: "gray.600" } }}
                        onClick={() => pickCamera(opt)}
                      >
                        <Text fontWeight="600">{opt.streamname}</Text>
                        <Text fontSize="xs" color="gray.500">{opt.deviceid}</Text>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
              )}
              <FormErrorMessage>{errors.streamId}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.district} isRequired>
              <FormLabel>District</FormLabel>
              <ComboField
                value={form.district}
                onChange={(v) => setField("district", v)}
                options={suggest.districts.map((d) => ({ value: d }))}
                placeholder="Select or type a district"
                isInvalid={!!errors.district}
              />
              <FormErrorMessage>{errors.district}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.accode} isRequired>
              <FormLabel>Assembly Code</FormLabel>
              <ComboField
                value={form.accode}
                onChange={onAssemblyCodeChange}
                options={suggest.assemblies.map((a) => ({
                  value: String(a.accode),
                  sub: a.acname,
                }))}
                placeholder="Select or type an assembly code"
                isInvalid={!!errors.accode}
              />
              <FormErrorMessage>{errors.accode}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.acname} isRequired>
              <FormLabel>Assembly Name</FormLabel>
              <ComboField
                value={form.acname}
                onChange={onAssemblyNameChange}
                options={suggest.assemblies.map((a) => ({
                  value: a.acname,
                  sub: `Code ${a.accode}`,
                }))}
                placeholder="Select or type an assembly name"
                isInvalid={!!errors.acname}
              />
              <FormErrorMessage>{errors.acname}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>PS Number</FormLabel>
              <ComboField
                value={form.psNum}
                onChange={onPsNumChange}
                options={suggest.psNumbers.map((p) => ({ value: p }))}
                placeholder="Select or type a PS number"
              />
            </FormControl>

            <FormControl isInvalid={!!errors.location} isRequired>
              <FormLabel>Location</FormLabel>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} />
              <FormErrorMessage>{errors.location}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.cameraLocationType} isRequired>
              <FormLabel>Camera Location Type</FormLabel>
              <Select
                value={form.cameraLocationType}
                onChange={(e) => setField("cameraLocationType", e.target.value)}
              >
                {CAMERA_LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <FormErrorMessage>{errors.cameraLocationType}</FormErrorMessage>
            </FormControl>

            {/* Operator (name/number/designation) and Longitude/Latitude are
                hidden from the form — the backend defaults them (operator ->
                NA / 1234567890, lat/long -> 0). Re-add the FormControls here to
                collect them again. */}
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={3} flexDirection={{ base: "column-reverse", sm: "row" }}>
          <Button
            variant="ghost"
            onClick={onClose}
            isDisabled={saving}
            w={{ base: "100%", sm: "auto" }}
          >
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            className="btn-premium"
            onClick={handleSubmit}
            isLoading={saving}
            w={{ base: "100%", sm: "auto" }}
          >
            {isEdit ? "Update Mapping" : "Create Mapping"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

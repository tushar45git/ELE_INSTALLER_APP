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
  useToast,
} from "@chakra-ui/react";
import {
  createCameraMapping,
  updateCameraMapping,
  searchCameras,
  getFormSuggestions,
} from "../../actions/cameraMappingActions";

const CAMERA_LOCATION_TYPES = ["Inside", "Outside"];

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

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
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
      });
      setCameraQuery(initialData.streamname ?? "");
    } else {
      setForm(EMPTY);
      setCameraQuery("");
    }
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
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
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
              <Input
                list="cm-districts"
                value={form.district}
                onChange={(e) => setField("district", e.target.value)}
              />
              <datalist id="cm-districts">
                {suggest.districts.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <FormErrorMessage>{errors.district}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.accode} isRequired>
              <FormLabel>Assembly Code</FormLabel>
              <Input
                list="cm-accodes"
                value={form.accode}
                onChange={(e) => onAssemblyCodeChange(e.target.value)}
              />
              <datalist id="cm-accodes">
                {suggest.assemblies.map((a) => (
                  <option key={`${a.accode}-${a.acname}`} value={a.accode}>
                    {a.acname}
                  </option>
                ))}
              </datalist>
              <FormErrorMessage>{errors.accode}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.acname} isRequired>
              <FormLabel>Assembly Name</FormLabel>
              <Input
                list="cm-acnames"
                value={form.acname}
                onChange={(e) => onAssemblyNameChange(e.target.value)}
              />
              <datalist id="cm-acnames">
                {suggest.assemblies.map((a) => (
                  <option key={`${a.acname}-${a.accode}`} value={a.acname} />
                ))}
              </datalist>
              <FormErrorMessage>{errors.acname}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>PS Number</FormLabel>
              <Input
                list="cm-psnumbers"
                value={form.psNum}
                onChange={(e) => setField("psNum", e.target.value)}
              />
              <datalist id="cm-psnumbers">
                {suggest.psNumbers.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
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

            <FormControl>
              <FormLabel>Operator Name</FormLabel>
              <Input value={form.operatorName} onChange={(e) => setField("operatorName", e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Operator Number</FormLabel>
              <Input value={form.operatorNumber} onChange={(e) => setField("operatorNumber", e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Operator Designation</FormLabel>
              <Input value={form.operatorDesignation} onChange={(e) => setField("operatorDesignation", e.target.value)} />
            </FormControl>

            <FormControl isInvalid={!!errors.longitude}>
              <FormLabel>Longitude</FormLabel>
              <Input value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} />
              <FormErrorMessage>{errors.longitude}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.latitude}>
              <FormLabel>Latitude</FormLabel>
              <Input value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} />
              <FormErrorMessage>{errors.latitude}</FormErrorMessage>
            </FormControl>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={saving}>
            {isEdit ? "Update Mapping" : "Create Mapping"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

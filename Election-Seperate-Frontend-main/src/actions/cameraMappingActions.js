import axios from "axios";

/**
 * Camera Mapping API client.
 *
 * The shared REACT_APP_API_URL already ends in `/election`; the new module is
 * mounted at `/election/api/camera-mapping`, so we extend that base here.
 */
const baseURL = `${process.env.REACT_APP_API_URL}/api/camera-mapping`;

const api = axios.create({ baseURL });

/** The acting user recorded in audit columns (updatedBy / addedBy). */
export const getActingUser = () =>
  localStorage.getItem("name") || localStorage.getItem("mobile") || "app-user";

const withUser = (payload = {}) => ({ ...payload, userName: getActingUser() });

// Normalise axios errors into the same shape the API returns on success.
const fail = (error) => ({
  success: false,
  message:
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.message ||
    error.message ||
    "Request failed",
  errors: error.response?.data?.errors || [],
});

/** Paginated / filtered / sorted list. */
export const listCameraMappings = async (params = {}) => {
  try {
    const { data } = await api.get("/", { params });
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const getCameraMapping = async (id) => {
  try {
    const { data } = await api.get(`/${id}`);
    return data;
  } catch (error) {
    return fail(error);
  }
};

/** Resolve a device id / stream name to its SQL mapping (for AutoInstaller). */
export const getCameraMappingByStream = async (deviceId) => {
  try {
    const { data } = await api.get("/by-stream", { params: { deviceId } });
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const getCameraMappingHistory = async (id) => {
  try {
    const { data } = await api.get(`/${id}/history`);
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const getFilterMeta = async (district = "") => {
  try {
    const { data } = await api.get("/meta/filters", { params: { district } });
    return data;
  } catch (error) {
    return fail(error);
  }
};

/** Cascading autocomplete suggestions for the mapping form fields. */
export const getFormSuggestions = async (district = "", acname = "") => {
  try {
    const { data } = await api.get("/meta/suggestions", {
      params: { district, acname },
    });
    return data;
  } catch (error) {
    return fail(error);
  }
};

/** Canonical location for an (assembly, PS number) pair (auto-fills Location). */
export const getLocationForPs = async (acname, psNum) => {
  try {
    const { data } = await api.get("/meta/location", {
      params: { acname, psNum },
    });
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const searchCameras = async (term = "", limit = 25) => {
  try {
    const { data } = await api.get("/meta/cameras", { params: { term, limit } });
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const createCameraMapping = async (payload) => {
  try {
    const { data } = await api.post("/", withUser(payload));
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const updateCameraMapping = async (id, payload) => {
  try {
    const { data } = await api.put(`/${id}`, withUser(payload));
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const deleteCameraMapping = async (id) => {
  try {
    const { data } = await api.delete(`/${id}`, { data: withUser() });
    return data;
  } catch (error) {
    return fail(error);
  }
};

export const swapCameraMapping = async (payload) => {
  try {
    const { data } = await api.post("/swap", withUser(payload));
    return data;
  } catch (error) {
    return fail(error);
  }
};

/** Location-based swap (AutoInstaller): swap cameras between two booths. */
export const swapCameraByLocation = async (payload) => {
  try {
    const { data } = await api.post("/swap-location", withUser(payload));
    return data;
  } catch (error) {
    return fail(error);
  }
};

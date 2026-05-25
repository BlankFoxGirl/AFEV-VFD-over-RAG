import axios from "axios";

const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
});

export async function fetchFacts(documentId) {
  const params = documentId ? { documentId } : {};
  const { data } = await apiClient.get("/api/facts", { params });
  return data.facts;
}

export default apiClient;

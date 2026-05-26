import axios from "axios";

const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
});

export async function fetchFacts(documentId) {
  const params = documentId ? { documentId } : {};
  const { data } = await apiClient.get("/api/facts", { params });
  return data.facts;
}

export async function verifyFact(text) {
  const { data } = await apiClient.post("/api/verify", { text });
  return data;
}

export async function uploadDocument(fileName, content) {
  const { data } = await apiClient.post("/api/upload", { fileName, content });
  return data;
}

export async function addVerifiedFact(text) {
  const { data } = await apiClient.post("/api/verified-facts", { text });
  return data;
}

export async function fetchVerifiedFactDetail(factText) {
  const { data } = await apiClient.get("/api/facts/verified-detail", {
    params: { text: factText },
  });
  return data;
}

export async function deleteFact(id) {
  await apiClient.delete(`/api/facts/${id}`);
}

export async function deleteVerifiedFact(text) {
  await apiClient.delete("/api/verified-facts", { data: { text } });
}

export default apiClient;

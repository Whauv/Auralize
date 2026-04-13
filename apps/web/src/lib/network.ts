import { API_BASE_URL } from "./constants";

export function createFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export async function postFile<T>(path: string, file: File): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    body: createFormData(file),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, payload: Record<string, string>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

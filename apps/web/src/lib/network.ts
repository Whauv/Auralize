import { API_BASE_URL } from "./constants";

function buildNetworkErrorMessage(path: string): string {
  if (API_BASE_URL.includes("<your-backend-domain>")) {
    return "VITE_API_BASE_URL is still a placeholder. Set it to your deployed backend URL, then redeploy frontend.";
  }

  return [
    `Couldn't reach the API at ${API_BASE_URL}.`,
    "Check that the backend is deployed and healthy, CORS allows your frontend domain, and VITE_API_BASE_URL matches the backend URL exactly.",
    `Request path: /api${path}`,
  ].join(" ");
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      const requestPath = input.startsWith(`${API_BASE_URL}/api`)
        ? input.slice(`${API_BASE_URL}/api`.length)
        : input;
      throw new Error(buildNetworkErrorMessage(requestPath));
    }
    throw error;
  }
}

export function createFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export async function postFile<T>(path: string, file: File): Promise<T> {
  const response = await request(`${API_BASE_URL}/api${path}`, {
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
  const response = await request(`${API_BASE_URL}/api${path}`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? `Request to ${path} failed.`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, payload: Record<string, string>): Promise<T> {
  const response = await request(`${API_BASE_URL}/api${path}`, {
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

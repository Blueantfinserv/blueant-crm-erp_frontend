import { SecureStorageService } from '../services/SecureStorageService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://blueant-crm-erp.up.railway.app/api';

export type UploadDocumentAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: Blob | null;
};

type DocumentResponse = {
  id?: number;
  fileName?: string;
};

type WrappedDocumentResponse = {
  success?: boolean;
  message?: string;
  data?: DocumentResponse;
};

export const documentApi = {
  upload: async (asset: UploadDocumentAsset) => {
    const token = await SecureStorageService.getToken();
    if (!token) throw new Error('Authentication token is unavailable.');

    const fileName = asset.fileName?.trim() || `visiting-card-${Date.now()}.jpg`;
    const mimeType = asset.mimeType?.trim() || 'image/jpeg';
    const formData = new FormData();
    if (asset.file) {
      formData.append('file', asset.file, fileName);
    } else {
      formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/v1/documents`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } catch {
      throw new Error('Visiting card upload failed. Please check your internet connection.');
    }

    const payload = await response.json().catch(() => null) as DocumentResponse | WrappedDocumentResponse | null;
    let document: DocumentResponse | null = null;
    if (payload) {
      document = 'data' in payload ? payload.data ?? null : payload as DocumentResponse;
    }
    if (!response.ok || !document?.id) {
      const message = payload && 'message' in payload ? payload.message : null;
      throw new Error(message || `Visiting card upload failed (${response.status}).`);
    }

    return `/api/v1/documents/${document.id}/download`;
  },
};

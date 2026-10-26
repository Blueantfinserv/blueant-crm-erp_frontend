import { Platform } from 'react-native';
import { fetchClientDocument, type ClientDocument } from '../api/clientDocuments';

const documentFileName = (document: ClientDocument) => {
  const referenceName = document.documentReference?.split(/[?#]/)[0].split(/[\\/]/).pop() ?? '';
  const extension = referenceName.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  const name = document.documentName?.trim() || referenceName || 'Document';
  const fileName = extension && !name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
    ? `${name}.${extension}` : name;
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/^\.+/, '') || 'Document';
};

export const downloadClientDocument = async (clientCode: string, document: ClientDocument) => {
  const response = await fetchClientDocument(clientCode, document);
  const fileName = documentFileName(document);
  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); }
    } finally {
      // Let the browser start the download before releasing its blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
    return;
  }
  const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, `${Date.now()}-${fileName}`);
  file.create();
  file.write(new Uint8Array(await response.arrayBuffer()));
  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Open ${fileName}`,
    mimeType: response.headers.get('Content-Type')?.split(';')[0] || undefined,
  });
};

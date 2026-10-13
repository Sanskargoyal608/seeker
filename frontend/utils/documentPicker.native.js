import * as DocumentPicker from 'expo-document-picker';
export const pickDocument = () => DocumentPicker.getDocumentAsync({ type: '*/*' });

export const pickDocument = () => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        resolve({ type: 'success', assets: [{ uri: URL.createObjectURL(file), name: file.name, size: file.size, file }] });
      } else {
        resolve({ type: 'cancel' });
      }
    };
    input.click();
  });
};

function resizeImage(file, maxSize = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxSize;
      canvas.height = maxSize;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(maxSize / img.width, maxSize / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (maxSize - w) / 2, (maxSize - h) / 2, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), file.type, 0.9);
    };
    img.src = url;
  });
}

export const uploadMemberAvatar = async (memberId, file, token) => {
  const resized = await resizeImage(file);
  const formData = new FormData();
  formData.append('file', resized, file.name);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`/api/members/${memberId}/avatar`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!response.ok) {
    let message = 'Falha ao enviar foto';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = (await response.text()) || message;
    }
    throw new Error(message);
  }
  return response.json();
};

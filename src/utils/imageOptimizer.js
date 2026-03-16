/**
 * Compactação de imagens client-side antes do upload ao Supabase Storage.
 * Usa Canvas API nativa (zero dependências externas).
 *
 * Fluxo: File → redimensiona (max 800px) → converte para WebP → comprime até ≤ 200KB
 */

const MAX_DIMENSION = 800;     // Largura ou altura máxima em pixels
const MAX_SIZE_BYTES = 200_000; // 200 KB
const INITIAL_QUALITY = 0.85;  // Qualidade inicial WebP (0-1)
const MIN_QUALITY = 0.3;       // Qualidade mínima antes de desistir

/**
 * Carrega um File de imagem em um HTMLImageElement.
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Falha ao carregar imagem')); };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calcula as dimensões finais mantendo a proporção,
 * limitando o maior lado a MAX_DIMENSION.
 */
function calcDimensions(width, height) {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) return { width, height };

  const ratio = width / height;
  if (width > height) {
    return { width: MAX_DIMENSION, height: Math.round(MAX_DIMENSION / ratio) };
  }
  return { width: Math.round(MAX_DIMENSION * ratio), height: MAX_DIMENSION };
}

/**
 * Desenha a imagem redimensionada em um canvas e exporta como WebP Blob.
 * Reduz a qualidade iterativamente até atingir o tamanho alvo.
 */
function canvasToWebPBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
  });
}

/**
 * Otimiza uma imagem para upload.
 *
 * @param {File} file - Arquivo de imagem original (qualquer formato suportado pelo browser)
 * @returns {Promise<File>} - File WebP otimizado (≤ 200KB, max 800px), pronto para supabase.storage.upload()
 *
 * @example
 * const optimized = await optimizeImage(inputFile);
 * await supabase.storage.from('task-evidence').upload(path, optimized, {
 *   cacheControl: '5184000', // 2 meses
 *   upsert: false,
 * });
 */
export async function optimizeImage(file) {
  // 1. Carrega a imagem no browser
  const img = await loadImage(file);

  // 2. Redimensiona mantendo proporção (max 800px no maior lado)
  const { width, height } = calcDimensions(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // 3. Converte para WebP com compressão progressiva até ≤ 200KB
  let quality = INITIAL_QUALITY;
  let blob = await canvasToWebPBlob(canvas, quality);

  while (blob.size > MAX_SIZE_BYTES && quality > MIN_QUALITY) {
    quality -= 0.05;
    blob = await canvasToWebPBlob(canvas, quality);
  }

  // 4. Retorna como File com nome e tipo corretos para o Supabase
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

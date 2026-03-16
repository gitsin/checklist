import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeImage } from '../imageOptimizer';

// ─── Mock Canvas & Image ────────────────────────────────────────────

let mockBlobSize = 150_000; // Default: under 200KB limit

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn((callback, type, quality) => {
    // Simulate smaller blob with lower quality
    const size = quality < 0.5 ? mockBlobSize * 0.5 : mockBlobSize;
    const blob = new Blob(['x'.repeat(size)], { type: 'image/webp' });
    callback(blob);
  }),
};

vi.stubGlobal('document', {
  ...document,
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') return mockCanvas;
    return document.createElement(tag);
  }),
});

// Mock Image with configurable dimensions
let mockImgWidth = 1200;
let mockImgHeight = 900;

class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  set src(_url) {
    this.naturalWidth = mockImgWidth;
    this.naturalHeight = mockImgHeight;
    setTimeout(() => this.onload?.(), 0);
  }
}
vi.stubGlobal('Image', MockImage);
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

function makeFile(name = 'photo.jpg', size = 500_000) {
  return new File(['x'.repeat(size)], name, { type: 'image/jpeg' });
}

describe('optimizeImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlobSize = 150_000;
    mockImgWidth = 1200;
    mockImgHeight = 900;
  });

  it('retorna um File com extensão .webp e tipo image/webp', async () => {
    const result = await optimizeImage(makeFile('foto.jpg'));
    expect(result.name).toBe('foto.webp');
    expect(result.type).toBe('image/webp');
  });

  it('redimensiona imagem larga para max 800px de largura', async () => {
    mockImgWidth = 1600;
    mockImgHeight = 1200;
    await optimizeImage(makeFile());

    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600); // mantém proporção 4:3
  });

  it('redimensiona imagem alta para max 800px de altura', async () => {
    mockImgWidth = 600;
    mockImgHeight = 1200;
    await optimizeImage(makeFile());

    expect(mockCanvas.width).toBe(400); // mantém proporção
    expect(mockCanvas.height).toBe(800);
  });

  it('não redimensiona se já menor que 800px', async () => {
    mockImgWidth = 640;
    mockImgHeight = 480;
    await optimizeImage(makeFile());

    expect(mockCanvas.width).toBe(640);
    expect(mockCanvas.height).toBe(480);
  });

  it('resultado é menor que 200KB quando blob já está no alvo', async () => {
    mockBlobSize = 100_000;
    const result = await optimizeImage(makeFile());
    expect(result.size).toBeLessThanOrEqual(200_000);
  });

  it('reduz qualidade iterativamente quando blob excede 200KB', async () => {
    mockBlobSize = 300_000; // Starts over limit
    await optimizeImage(makeFile());

    // toBlob should be called more than once (iterative compression)
    expect(mockCanvas.toBlob.mock.calls.length).toBeGreaterThan(1);
  });

  it('preserva o nome base do arquivo original', async () => {
    const result = await optimizeImage(makeFile('IMG_20260316_camera.png'));
    expect(result.name).toBe('IMG_20260316_camera.webp');
  });
});

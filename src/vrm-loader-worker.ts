// Web Worker for parsing VRM file data
self.addEventListener('message', async (event) => {
  const { arrayBuffer } = event.data;
  
  try {
    // Parse the array buffer to extract basic info
    // This is a lightweight operation to get file structure
    const dataView = new DataView(arrayBuffer);
    const decoder = new TextDecoder();
    
    // Check for glTF magic number
    const magic = dataView.getUint32(0, true);
    const isGLB = magic === 0x46546C67; // 'glTF'
    
    let fileSize = arrayBuffer.byteLength;
    let textureCount = 0;
    let meshCount = 0;
    
    // Quick scan for textures and meshes in GLB
    if (isGLB) {
      let offset = 12; // Skip header
      while (offset < arrayBuffer.byteLength - 8) {
        const chunkLength = dataView.getUint32(offset, true);
        const chunkType = dataView.getUint32(offset + 4, true);
        
        if (chunkType === 0x4E4F534A) { // JSON
          const jsonData = decoder.decode(new Uint8Array(arrayBuffer, offset + 8, Math.min(chunkLength, 1000)));
          textureCount = (jsonData.match(/"images"/g) || []).length;
          meshCount = (jsonData.match(/"meshes"/g) || []).length;
          break;
        }
        
        offset += 8 + chunkLength;
      }
    }
    
    // Send back preliminary info
    self.postMessage({
      success: true,
      preliminary: {
        fileSize,
        estimatedTextures: textureCount,
        estimatedMeshes: meshCount,
        isGLB
      }
    });
    
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});
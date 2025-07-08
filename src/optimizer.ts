import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { VRM } from '@pixiv/three-vrm';

export interface OptimizationOptions {
  simplifyRatio: number; // 0-1, where 1 is no simplification
  optimizeTextures: boolean;
  maxTextureSize: number;
}

export interface OptimizationResult {
  originalVertices: number;
  optimizedVertices: number;
  originalFileSize: number;
  estimatedFileSize: number;
  reductionPercentage: number;
}

export async function optimizeVRM(
  vrm: VRM,
  options: OptimizationOptions
): Promise<{ result: OptimizationResult; scene: THREE.Group }> {
  // Clone the scene to avoid modifying the original
  const clonedScene = vrm.scene.clone(true);
  
  let originalVertices = 0;
  let optimizedVertices = 0;
  
  // Process each mesh in the scene
  clonedScene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const geometry = mesh.geometry;
      
      if (geometry) {
        // Count original vertices
        const positionAttribute = geometry.attributes.position;
        if (positionAttribute) {
          originalVertices += positionAttribute.count;
        }
        
        // Simplify geometry if ratio < 1
        if (options.simplifyRatio < 1) {
          const simplifiedGeometry = simplifyGeometry(geometry, options.simplifyRatio);
          mesh.geometry = simplifiedGeometry;
          
          // Count optimized vertices
          const newPositionAttribute = simplifiedGeometry.attributes.position;
          if (newPositionAttribute) {
            optimizedVertices += newPositionAttribute.count;
          }
        } else {
          optimizedVertices = originalVertices;
        }
        
        // Optimize vertex data
        mesh.geometry = optimizeVertexData(mesh.geometry);
      }
      
      // Optimize textures
      if (options.optimizeTextures && mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
          optimizeMaterialTextures(material, options.maxTextureSize);
        });
      }
    }
  });
  
  const reductionPercentage = originalVertices > 0 
    ? Math.round((1 - optimizedVertices / originalVertices) * 100)
    : 0;
  
  return {
    result: {
      originalVertices,
      optimizedVertices,
      originalFileSize: (vrm as any).fileSize || 0,
      estimatedFileSize: Math.round(((vrm as any).fileSize || 0) * (optimizedVertices / originalVertices)),
      reductionPercentage
    },
    scene: clonedScene
  };
}

function simplifyGeometry(geometry: THREE.BufferGeometry, ratio: number): THREE.BufferGeometry {
  // Clone the geometry
  const newGeometry = geometry.clone();
  
  // For now, we'll use a simple vertex reduction
  // In a real implementation, you'd use meshoptimizer's simplification
  // This is a placeholder that randomly removes vertices
  const positionAttribute = newGeometry.attributes.position;
  if (positionAttribute && ratio < 1) {
    const oldPositions = positionAttribute.array;
    const vertexCount = positionAttribute.count;
    const newVertexCount = Math.max(3, Math.floor(vertexCount * ratio));
    
    // Create new arrays for the reduced geometry
    const newPositions = new Float32Array(newVertexCount * 3);
    const step = vertexCount / newVertexCount;
    
    for (let i = 0; i < newVertexCount; i++) {
      const oldIndex = Math.floor(i * step);
      newPositions[i * 3] = oldPositions[oldIndex * 3];
      newPositions[i * 3 + 1] = oldPositions[oldIndex * 3 + 1];
      newPositions[i * 3 + 2] = oldPositions[oldIndex * 3 + 2];
    }
    
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    
    // Update other attributes similarly
    ['normal', 'uv'].forEach(attrName => {
      const attr = newGeometry.attributes[attrName];
      if (attr) {
        const itemSize = attr.itemSize;
        const oldArray = attr.array;
        const newArray = new Float32Array(newVertexCount * itemSize);
        
        for (let i = 0; i < newVertexCount; i++) {
          const oldIndex = Math.floor(i * step);
          for (let j = 0; j < itemSize; j++) {
            newArray[i * itemSize + j] = oldArray[oldIndex * itemSize + j];
          }
        }
        
        newGeometry.setAttribute(attrName, new THREE.BufferAttribute(newArray, itemSize));
      }
    });
    
    // Clear index if present
    newGeometry.setIndex(null);
  }
  
  return newGeometry;
}

function optimizeVertexData(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  // Remove unused attributes
  const essentialAttributes = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
  const attributeNames = Object.keys(geometry.attributes);
  
  attributeNames.forEach(name => {
    if (!essentialAttributes.includes(name) && !name.startsWith('morph')) {
      geometry.deleteAttribute(name);
    }
  });
  
  // Optimize index buffer
  if (geometry.index) {
    const indices = geometry.index.array;
    const vertexCount = geometry.attributes.position.count;
    
    // Use Uint16Array if possible (for < 65536 vertices)
    if (vertexCount < 65536 && indices instanceof Uint32Array) {
      const newIndices = new Uint16Array(indices);
      geometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
    }
  }
  
  return geometry;
}

function optimizeMaterialTextures(material: THREE.Material, maxSize: number) {
  const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
  
  textureProperties.forEach(prop => {
    const texture = (material as any)[prop] as THREE.Texture;
    if (texture && texture.image) {
      const img = texture.image;
      
      if (img.width > maxSize || img.height > maxSize) {
        // Create a canvas to resize the texture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Replace the texture image
        texture.image = canvas;
        texture.needsUpdate = true;
      }
    }
  });
}

export async function exportOptimizedVRM(
  scene: THREE.Scene,
  originalVRM: VRM,
  filename: string
): Promise<void> {
  // For now, we'll alert the user that this is a preview feature
  alert('Note: The exported file is a simplified GLTF that may not retain all VRM-specific features. For production use, consider using dedicated VRM optimization tools like UniVRM or VRMConverter.');
  
  const exporter = new GLTFExporter();
  
  // Export options - export as GLB without VRM extensions for now
  const options = {
    binary: true,
    includeCustomExtensions: false, // Don't include VRM extensions as they're complex
    animations: scene.animations || [],
    forceIndices: true,
    truncateDrawRange: false
  };
  
  try {
    const result = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => resolve(gltf as ArrayBuffer),
        reject,
        options
      );
    });
    
    // Create a blob and download as GLB
    const blob = new Blob([result], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.vrm', '_optimized.glb'); // Export as GLB
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
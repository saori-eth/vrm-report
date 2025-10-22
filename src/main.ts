import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { initUI } from './ui';
import { loadAnim, resetVRM, storeInitialVRMState } from './vrm';
import { inject } from '@vercel/analytics';

inject();

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentVRM: VRM | null = null;
let placeholderMesh: THREE.Mesh | null = null;
let particles: THREE.Points | null = null;
let floor: THREE.Mesh | null = null;
let loadingSpinner: THREE.Group | null = null;
let clock: THREE.Clock;
let mixer: THREE.AnimationMixer | null = null;
let currentAction: THREE.AnimationAction | null = null;

function initThreeJS() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1f);
  scene.fog = new THREE.Fog(0x0a0a1f, 5, 20);
  
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 3);
  
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(2, 3, 2);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 10;
  directionalLight.shadow.camera.left = -3;
  directionalLight.shadow.camera.right = 3;
  directionalLight.shadow.camera.top = 3;
  directionalLight.shadow.camera.bottom = -3;
  directionalLight.shadow.bias = -0.0005;
  directionalLight.shadow.normalBias = 0.02;
  scene.add(directionalLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-2, 1, -2);
  scene.add(fillLight);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.maxDistance = 10;
  controls.minDistance = 1;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.update();
  
  clock = new THREE.Clock();
  
  addPlaceholder();
  addFloor();
  addParticles();
  
  window.addEventListener('resize', onWindowResize);
  
  animate();
}

function addPlaceholder() {
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const material = new THREE.MeshPhongMaterial({
    color: 0x4a5568,
    emissive: 0x2d3748,
    emissiveIntensity: 0.2
  });
  placeholderMesh = new THREE.Mesh(geometry, material);
  placeholderMesh.position.y = 1;
  placeholderMesh.castShadow = true;
  scene.add(placeholderMesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function addFloor() {
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    transparent: true,
    opacity: 0.8,
    roughness: 0.8,
    metalness: 0.2
  });
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);
  
  const gridHelper = new THREE.GridHelper(20, 20, 0x4a5568, 0x2a2a3e);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function addParticles() {
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = Math.random() * 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    sizes[i] = Math.random() * 0.05 + 0.02;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.05,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  if (placeholderMesh) {
    placeholderMesh.rotation.x += 0.01;
    placeholderMesh.rotation.y += 0.01;
  }
  
  if (loadingSpinner) {
    loadingSpinner.rotation.y += 0.02;
    loadingSpinner.children.forEach((ring, index) => {
      ring.rotation.z += 0.01 * (index + 1);
      ring.rotation.y += 0.005 * (index + 1);
    });
  }
  
  if (particles) {
    particles.rotation.y += 0.0002;
    const positions = particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  if (currentVRM) {
    currentVRM.update(deltaTime);
  }
  
  if (mixer) {
    mixer.update(deltaTime);
  }
  
  controls.update();
  renderer.render(scene, camera);
}

function createLoadingSpinner() {
  loadingSpinner = new THREE.Group();
  
  // Create rings
  const ringGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
  const material1 = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
  const material2 = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
  const material3 = new THREE.MeshBasicMaterial({ color: 0x93bbfc });
  
  const ring1 = new THREE.Mesh(ringGeometry, material1);
  const ring2 = new THREE.Mesh(ringGeometry, material2);
  const ring3 = new THREE.Mesh(ringGeometry, material3);
  
  ring2.rotation.x = Math.PI / 3;
  ring3.rotation.x = -Math.PI / 3;
  
  loadingSpinner.add(ring1);
  loadingSpinner.add(ring2);
  loadingSpinner.add(ring3);
  
  loadingSpinner.position.y = 1;
  scene.add(loadingSpinner);
}

function removeLoadingSpinner() {
  if (loadingSpinner) {
    scene.remove(loadingSpinner);
    loadingSpinner.children.forEach(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const material = (child as THREE.Mesh).material as THREE.Material;
        material.dispose();
      }
    });
    loadingSpinner = null;
  }
}

// Progressive loading with minimal blocking
async function cleanupPreviousVRM() {
  if (!currentVRM) return;
  
  // Stop and cleanup animations
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    if (currentVRM) {
      mixer.uncacheRoot(currentVRM.scene);
    }
    mixer = null;
  }
  
  // Notify UI that animation state is reset when loading new VRM
  window.dispatchEvent(new CustomEvent('animationChanged', { detail: 'T-Pose' }));
  
  const objectsToDispose: any[] = [];
  currentVRM.scene.traverse((obj) => {
    if ((obj as any).geometry || (obj as any).material) {
      objectsToDispose.push(obj);
    }
  });
  
  scene.remove(currentVRM.scene);
  
  // Dispose in chunks
  const chunkSize = 10;
  for (let i = 0; i < objectsToDispose.length; i += chunkSize) {
    const chunk = objectsToDispose.slice(i, i + chunkSize);
    
    // Process chunk in next frame
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        chunk.forEach(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        resolve(undefined);
      });
    });
  }
  
  currentVRM = null;
}

export async function loadVRM(file: File) {
  // Show loading spinner
  if (placeholderMesh) {
    scene.remove(placeholderMesh);
    placeholderMesh = null;
  }
  createLoadingSpinner();
  
  // Start cleanup in parallel if needed
  const cleanupPromise = cleanupPreviousVRM();
  
  // Read file in chunks to avoid blocking
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: file.type });
  const url = URL.createObjectURL(blob);
  
  // Store file size for stats
  const fileSize = file.size;
  
  // Create loader
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  
  // Set up texture loading to be non-blocking
  const loadingManager = new THREE.LoadingManager();
  let texturesLoaded = 0;
  let totalTextures = 0;
  
  loadingManager.onStart = () => {
    totalTextures++;
  };
  
  loadingManager.onLoad = () => {
    texturesLoaded++;
  };
  
  loader.manager = loadingManager;
  
  try {
    // Wait for cleanup to finish
    await cleanupPromise;
    
    // Load GLTF with progressive texture loading
    await new Promise<void>((resolve, reject) => {
      loader.load(
        url,
        async (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          currentVRM = vrm;
          
          // Store file size on the VRM object
          (currentVRM as any).fileSize = fileSize;
          
          // Store initial bone transforms for T-pose reset
          storeInitialVRMState(currentVRM);
          
          // Add to scene immediately but invisible
          vrm.scene.visible = false;
          scene.add(vrm.scene);
          
          // Rotate VRM to face forward
          vrm.scene.rotation.y = Math.PI;
          
          // Process materials and shadows in chunks
          const objects: THREE.Object3D[] = [];
          vrm.scene.traverse((obj) => objects.push(obj));
          
          const chunkSize = 5;
          for (let i = 0; i < objects.length; i += chunkSize) {
            await new Promise(resolve => {
              requestAnimationFrame(() => {
                const chunk = objects.slice(i, i + chunkSize);
                chunk.forEach(obj => {
                  obj.castShadow = true;
                  obj.receiveShadow = true;
                });
                resolve(undefined);
              });
            });
          }
          
          // Extract stats while still loading
          const stats = extractVRMStats(vrm);
          
          // Make visible and remove spinner in same frame
          requestAnimationFrame(() => {
            vrm.scene.visible = true;
            removeLoadingSpinner();
            window.dispatchEvent(new CustomEvent('avatarLoaded', { detail: stats }));
            URL.revokeObjectURL(url);
            resolve();
          });
        },
        // Progress callback
        (xhr) => {
          // Keep animation running during load
        },
        (error) => {
          reject(error);
        }
      );
    });
    
  } catch (error) {
    console.error('Error loading VRM:', error);
    removeLoadingSpinner();
    addPlaceholder();
    alert('Failed to load VRM file. Please ensure it\'s a valid VRM file.');
    URL.revokeObjectURL(url);
  }
}

function extractVRMStats(vrm: VRM) {
  const stats: any = {
    meta: {},
    meshes: {},
    materials: {},
    textures: {},
    humanoid: {},
    expressions: {},
    firstPerson: {},
    performance: {}
  };
  
  if (vrm.meta) {
    const meta = vrm.meta as any;
    stats.meta = {
      name: meta.name || 'Unknown',
      version: meta.version || meta.metaVersion || 'Unknown',
      authors: meta.authors || (meta.author ? [meta.author] : []),
      copyrightInformation: meta.copyrightInformation || meta.copyright || '',
      contactInformation: meta.contactInformation || meta.contactInformation || '',
      reference: meta.references || meta.reference || [],
      thirdPartyLicenses: meta.thirdPartyLicenses || meta.otherLicenseUrl || '',
      thumbnailImage: meta.thumbnailImage || null,
      licenseUrl: meta.licenseUrl || meta.otherLicenseUrl || '',
      avatarPermission: meta.avatarPermission || meta.allowedUserName || 'Unknown',
      allowExcessivelyViolentUsage: meta.allowExcessivelyViolentUsage !== undefined ? meta.allowExcessivelyViolentUsage : meta.violentUsage !== 'Disallow',
      allowExcessivelySexualUsage: meta.allowExcessivelySexualUsage !== undefined ? meta.allowExcessivelySexualUsage : meta.sexualUsage !== 'Disallow',
      commercialUsage: meta.commercialUsage || meta.commercialUsage || 'Unknown',
      allowPoliticalOrReligiousUsage: meta.allowPoliticalOrReligiousUsage !== undefined ? meta.allowPoliticalOrReligiousUsage : true,
      allowAntisocialOrHateUsage: meta.allowAntisocialOrHateUsage !== undefined ? meta.allowAntisocialOrHateUsage : false,
      creditNotation: meta.creditNotation || 'Unknown',
      allowRedistribution: meta.allowRedistribution !== undefined ? meta.allowRedistribution : false,
      modification: meta.modification || 'Unknown',
      otherLicenseUrl: meta.otherLicenseUrl || ''
    };
  }
  
  let totalVertices = 0;
  let totalFaces = 0;
  let meshCount = 0;
  const textureMap = new Map<THREE.Texture, { type: string, size: string, texture?: THREE.Texture }>();
  const materialMap = new Map<THREE.Material, { name: string, type: string }>();
  const meshList: { name: string, vertices: number, faces: number }[] = [];
  
  vrm.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      meshCount++;
      
      let vertices = 0;
      let faces = 0;
      
      if (mesh.geometry) {
        const positionAttribute = mesh.geometry.attributes.position;
        if (positionAttribute) {
          vertices = positionAttribute.count;
          totalVertices += vertices;
        }
        
        if (mesh.geometry.index) {
          faces = mesh.geometry.index.count / 3;
          totalFaces += faces;
        } else if (positionAttribute) {
          faces = positionAttribute.count / 3;
          totalFaces += faces;
        }
      }
      
      meshList.push({
        name: mesh.name || `Mesh_${meshCount}`,
        vertices,
        faces: Math.floor(faces)
      });
      
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          if (!materialMap.has(mat)) {
            materialMap.set(mat, {
              name: mat.name || 'Unnamed',
              type: mat.type
            });
          }
          
          const checkTexture = (texture: THREE.Texture | null, type: string) => {
            if (texture && !textureMap.has(texture)) {
              const img = (texture as any).image;
              let sizeStr = 'Unknown';
              if (img) {
                if (img.width && img.height) {
                  sizeStr = `${img.width}x${img.height}`;
                } else if (img.naturalWidth && img.naturalHeight) {
                  sizeStr = `${img.naturalWidth}x${img.naturalHeight}`;
                }
              }
              textureMap.set(texture, { type, size: sizeStr, texture });
            }
          };
          
          checkTexture((mat as any).map, 'Diffuse');
          checkTexture((mat as any).normalMap, 'Normal');
          checkTexture((mat as any).emissiveMap, 'Emissive');
          checkTexture((mat as any).roughnessMap, 'Roughness');
          checkTexture((mat as any).metalnessMap, 'Metalness');
          checkTexture((mat as any).aoMap, 'AO');
        });
      }
    }
  });
  
  stats.meshes = {
    count: meshCount,
    totalVertices,
    totalFaces,
    list: meshList
  };
  
  stats.materials = {
    count: materialMap.size,
    list: Array.from(materialMap.values())
  };
  
  stats.textures = {
    count: textureMap.size,
    list: Array.from(textureMap.values())
  };
  
  if (vrm.humanoid) {
    stats.humanoid = {
      bonesCount: Object.keys(vrm.humanoid.humanBones).length
    };
  }
  
  // Calculate performance stats
  let totalTextureMemory = 0;
  let totalGeometryMemory = 0;
  let drawCalls = 0;
  const uniqueMaterials = new Set<THREE.Material>();
  const renderedMeshes: THREE.Mesh[] = [];
  
  vrm.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.visible) {
        renderedMeshes.push(mesh);
        
        // Count draw calls (one per material per mesh)
        if (Array.isArray(mesh.material)) {
          drawCalls += mesh.material.length;
          mesh.material.forEach(mat => uniqueMaterials.add(mat));
        } else if (mesh.material) {
          drawCalls += 1;
          uniqueMaterials.add(mesh.material);
        }
        
        // Estimate geometry memory
        if (mesh.geometry) {
          const geo = mesh.geometry;
          let geoMemory = 0;
          
          // Position attribute (3 floats per vertex)
          if (geo.attributes.position) {
            geoMemory += geo.attributes.position.count * 3 * 4; // 4 bytes per float
          }
          
          // Normal attribute (3 floats per vertex)
          if (geo.attributes.normal) {
            geoMemory += geo.attributes.normal.count * 3 * 4;
          }
          
          // UV attribute (2 floats per vertex)
          if (geo.attributes.uv) {
            geoMemory += geo.attributes.uv.count * 2 * 4;
          }
          
          // Index buffer
          if (geo.index) {
            geoMemory += geo.index.count * 2; // 2 bytes per index (assuming Uint16)
          }
          
          totalGeometryMemory += geoMemory;
        }
      }
    }
  });
  
  // Calculate texture memory
  textureMap.forEach((info, texture) => {
    const img = (texture as any).image;
    if (img && img.width && img.height) {
      // Assume RGBA format (4 bytes per pixel)
      const textureMemory = img.width * img.height * 4;
      totalTextureMemory += textureMemory;
      
      // Add mipmap memory (approximately 33% more)
      if (texture.generateMipmaps) {
        totalTextureMemory += Math.floor(textureMemory * 0.33);
      }
    }
  });
  
  // File size (estimated from the original file)
  const fileSize = (currentVRM as any).fileSize || 0;
  
  stats.performance = {
    drawCalls,
    textureMemory: totalTextureMemory,
    geometryMemory: totalGeometryMemory,
    estimatedVRAM: totalTextureMemory + totalGeometryMemory,
    fileSize: fileSize
  };
  
  if (vrm.expressionManager) {
    stats.expressions = {
      count: vrm.expressionManager.expressions.length,
      names: vrm.expressionManager.expressions.map(exp => exp.expressionName)
    };
  }
  
  if (vrm.firstPerson) {
    stats.firstPerson = {
      configured: true
    };
  }
  
  return stats;
}

function updateVRMExpression(name: string, value: number) {
  if (currentVRM && currentVRM.expressionManager) {
    const expression = currentVRM.expressionManager.getExpression(name);
    if (expression) {
      expression.weight = value;
    }
  }
}

async function playAnimation(animationName: string) {
  if (!currentVRM) {
    console.warn('No VRM loaded, cannot play animation');
    return;
  }
  
  try {
    // Handle T-Pose first (no animation loading needed)
    if (animationName === 'T-Pose') {
      // Stop current animation
      if (currentAction) {
        currentAction.stop();
        currentAction = null;
      }
      
      // Clean up previous mixer
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(currentVRM.scene);
        mixer = null;
      }
      
      resetVRM(currentVRM);
      window.dispatchEvent(new CustomEvent('animationChanged', { detail: 'T-Pose' }));
      return;
    }
    
    // For other animations, load and apply
    console.log(`Loading animation: ${animationName}`);
    
    // Load animation first (before stopping current animation to prevent state corruption)
    const animationUrl = `/${animationName.toLowerCase()}.fbx`;
    const clip = await loadAnim(animationUrl, currentVRM);
    
    console.log(`Successfully loaded animation clip: ${clip.name}, duration: ${clip.duration}`);
    
    // Now stop current animation and create new mixer
    if (currentAction) {
      currentAction.stop();
      currentAction = null;
    }
    
    // Clean up previous mixer properly
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(currentVRM.scene);
      mixer = null;
    }
    
    // Create new mixer
    mixer = new THREE.AnimationMixer(currentVRM.scene);
    
    // Create and play action
    currentAction = mixer.clipAction(clip);
    currentAction.setLoop(THREE.LoopRepeat, Infinity);
    currentAction.play();
    
    console.log(`Animation ${animationName} started successfully`);
    window.dispatchEvent(new CustomEvent('animationChanged', { detail: animationName }));
  } catch (error) {
    console.error(`Failed to load animation ${animationName}:`, error);
    console.error('Error details:', error);
    
    // Fallback to T-pose on error
    try {
      if (currentAction) {
        currentAction.stop();
        currentAction = null;
      }
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(currentVRM.scene);
        mixer = null;
      }
      resetVRM(currentVRM);
      window.dispatchEvent(new CustomEvent('animationChanged', { detail: 'T-Pose' }));
    } catch (resetError) {
      console.error('Failed to reset to T-pose:', resetError);
    }
    
    window.dispatchEvent(new CustomEvent('animationError', { detail: `Failed to load ${animationName} animation: ${error instanceof Error ? error.message : 'Unknown error'}` }));
  }
}

function stopAnimation() {
  if (currentAction) {
    currentAction.stop();
    currentAction = null;
  }
  if (mixer) {
    mixer.stopAllAction();
    if (currentVRM) {
      mixer.uncacheRoot(currentVRM.scene);
    }
    mixer = null;
  }
  if (currentVRM) {
    resetVRM(currentVRM);
  }
  window.dispatchEvent(new CustomEvent('animationChanged', { detail: 'T-Pose' }));
}

initThreeJS();
initUI(updateVRMExpression, playAnimation);
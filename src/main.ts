import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { initUI } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentVRM: VRM | null = null;
let placeholderMesh: THREE.Mesh | null = null;
let particles: THREE.Points | null = null;
let floor: THREE.Mesh | null = null;
let loadingSpinner: THREE.Group | null = null;

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  const ambientLight = new THREE.AmbientLight(0x4a5568, 1.2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
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
  scene.add(directionalLight);
  
  const fillLight = new THREE.DirectionalLight(0x9bb2ff, 0.5);
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
    currentVRM.update(1 / 60);
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

export async function loadVRM(file: File) {
  // Show loading spinner
  if (placeholderMesh) {
    scene.remove(placeholderMesh);
    placeholderMesh = null;
  }
  createLoadingSpinner();
  
  // Load VRM asynchronously
  setTimeout(async () => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    
    const url = URL.createObjectURL(file);
    
    try {
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm as VRM;
      
      // Remove loading spinner
      removeLoadingSpinner();
      
      if (currentVRM) {
        scene.remove(currentVRM.scene);
        currentVRM.scene.traverse((obj) => {
          if ((obj as any).geometry) (obj as any).geometry.dispose();
          if ((obj as any).material) {
            if (Array.isArray((obj as any).material)) {
              (obj as any).material.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              (obj as any).material.dispose();
            }
          }
        });
      }
      
      currentVRM = vrm;
      scene.add(vrm.scene);
      
      // Rotate VRM to face forward
      vrm.scene.rotation.y = Math.PI;
      
      vrm.scene.traverse((obj) => {
        obj.castShadow = true;
        obj.receiveShadow = true;
      });
      
      const stats = extractVRMStats(vrm);
      
      window.dispatchEvent(new CustomEvent('avatarLoaded', { detail: stats }));
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error loading VRM:', error);
      removeLoadingSpinner();
      // Show placeholder again on error
      addPlaceholder();
      alert('Failed to load VRM file. Please ensure it\'s a valid VRM file.');
    }
  }, 10); // Small delay to ensure UI updates
}

function extractVRMStats(vrm: VRM) {
  const stats: any = {
    meta: {},
    meshes: {},
    materials: {},
    textures: {},
    humanoid: {},
    expressions: {},
    firstPerson: {}
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
  const textureSet = new Set<THREE.Texture>();
  const materialSet = new Set<THREE.Material>();
  
  vrm.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      meshCount++;
      
      if (mesh.geometry) {
        const positionAttribute = mesh.geometry.attributes.position;
        if (positionAttribute) {
          totalVertices += positionAttribute.count;
        }
        
        if (mesh.geometry.index) {
          totalFaces += mesh.geometry.index.count / 3;
        } else if (positionAttribute) {
          totalFaces += positionAttribute.count / 3;
        }
      }
      
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          materialSet.add(mat);
          
          if ((mat as any).map) textureSet.add((mat as any).map);
          if ((mat as any).normalMap) textureSet.add((mat as any).normalMap);
          if ((mat as any).emissiveMap) textureSet.add((mat as any).emissiveMap);
          if ((mat as any).roughnessMap) textureSet.add((mat as any).roughnessMap);
          if ((mat as any).metalnessMap) textureSet.add((mat as any).metalnessMap);
        });
      }
    }
  });
  
  stats.meshes = {
    count: meshCount,
    totalVertices,
    totalFaces
  };
  
  stats.materials = {
    count: materialSet.size
  };
  
  stats.textures = {
    count: textureSet.size
  };
  
  if (vrm.humanoid) {
    stats.humanoid = {
      bonesCount: Object.keys(vrm.humanoid.humanBones).length
    };
  }
  
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

initThreeJS();
initUI();
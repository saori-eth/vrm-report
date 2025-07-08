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

function initThreeJS() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
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
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 2, 3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  scene.add(directionalLight);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1, 0);
  controls.update();
  
  addPlaceholder();
  
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

function animate() {
  requestAnimationFrame(animate);
  
  if (placeholderMesh) {
    placeholderMesh.rotation.x += 0.01;
    placeholderMesh.rotation.y += 0.01;
  }
  
  if (currentVRM) {
    currentVRM.update(1 / 60);
  }
  
  controls.update();
  renderer.render(scene, camera);
}

export async function loadVRM(file: File) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  
  const url = URL.createObjectURL(file);
  
  try {
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    
    if (placeholderMesh) {
      scene.remove(placeholderMesh);
      placeholderMesh = null;
    }
    
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
    
    vrm.scene.traverse((obj) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    
    const stats = extractVRMStats(vrm);
    
    window.dispatchEvent(new CustomEvent('avatarLoaded', { detail: stats }));
    
  } catch (error) {
    console.error('Error loading VRM:', error);
    alert('Failed to load VRM file. Please ensure it\'s a valid VRM file.');
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
    firstPerson: {}
  };
  
  if (vrm.meta) {
    stats.meta = {
      name: vrm.meta.name || 'Unknown',
      version: vrm.meta.version || 'Unknown',
      authors: vrm.meta.authors || [],
      copyrightInformation: vrm.meta.copyrightInformation || '',
      contactInformation: vrm.meta.contactInformation || '',
      reference: vrm.meta.references || [],
      thirdPartyLicenses: vrm.meta.thirdPartyLicenses || '',
      thumbnailImage: vrm.meta.thumbnailImage || null,
      licenseUrl: vrm.meta.licenseUrl || '',
      avatarPermission: vrm.meta.avatarPermission || 'Unknown',
      allowExcessivelyViolentUsage: vrm.meta.allowExcessivelyViolentUsage || false,
      allowExcessivelySexualUsage: vrm.meta.allowExcessivelySexualUsage || false,
      commercialUsage: vrm.meta.commercialUsage || 'Unknown',
      allowPoliticalOrReligiousUsage: vrm.meta.allowPoliticalOrReligiousUsage || false,
      allowAntisocialOrHateUsage: vrm.meta.allowAntisocialOrHateUsage || false,
      creditNotation: vrm.meta.creditNotation || 'Unknown',
      allowRedistribution: vrm.meta.allowRedistribution || false,
      modification: vrm.meta.modification || 'Unknown',
      otherLicenseUrl: vrm.meta.otherLicenseUrl || ''
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
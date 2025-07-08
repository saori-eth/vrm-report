import { loadVRM } from './main';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function initUI() {
  const uploadPrompt = document.getElementById('uploadPrompt')!;
  const uploadButton = document.getElementById('uploadButton')!;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const statsPanel = document.getElementById('statsPanel')!;
  const statsContent = document.getElementById('statsContent')!;
  const closeStats = document.getElementById('closeStats')!;
  const showStatsButton = document.getElementById('showStatsButton')!;
  const dropOverlay = document.getElementById('dropOverlay')!;
  
  // Desktop drag and drop
  if (!isTouchDevice) {
    let dragCounter = 0;
    
    document.body.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        dropOverlay.classList.add('active');
      }
    });
    
    document.body.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
      }
    });
    
    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.remove('active');
      
      const files = Array.from(e.dataTransfer?.files || []);
      const vrmFile = files.find(file => file.name.toLowerCase().endsWith('.vrm'));
      
      if (vrmFile) {
        handleFileUpload(vrmFile);
      } else {
        alert('Please drop a valid VRM file');
      }
    });
  }
  
  // Mobile file upload
  if (uploadButton) {
    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.name.toLowerCase().endsWith('.vrm')) {
      handleFileUpload(file);
    } else if (file) {
      alert('Please select a valid VRM file');
    }
  });
  
  closeStats.addEventListener('click', () => {
    statsPanel.classList.remove('visible');
    showStatsButton.classList.add('visible');
  });
  
  showStatsButton.addEventListener('click', () => {
    statsPanel.classList.add('visible');
    showStatsButton.classList.remove('visible');
  });
  
  window.addEventListener('avatarLoaded', (e: any) => {
    uploadPrompt.classList.add('hidden');
    statsPanel.classList.add('visible');
    showStatsButton.classList.add('visible');
    displayStats(e.detail);
  });
}

function handleFileUpload(file: File) {
  if (file.size > 100 * 1024 * 1024) {
    alert('File size exceeds 100MB limit');
    return;
  }
  
  loadVRM(file);
}

function displayStats(stats: any) {
  const statsContent = document.getElementById('statsContent')!;
  statsContent.innerHTML = '';
  
  const sections = [
    {
      title: 'Model Stats',
      data: {
        meshCount: stats.meshes.count,
        totalVertices: stats.meshes.totalVertices,
        totalFaces: stats.meshes.totalFaces,
        materialCount: stats.materials.count,
        textureCount: stats.textures.count,
        humanoidBones: stats.humanoid.bonesCount
      },
      fields: [
        { key: 'meshCount', label: 'Mesh Count' },
        { key: 'totalVertices', label: 'Total Vertices', format: (v: any) => v.toLocaleString() },
        { key: 'totalFaces', label: 'Total Faces', format: (v: any) => v.toLocaleString() },
        { key: 'materialCount', label: 'Material Count' },
        { key: 'textureCount', label: 'Texture Count' },
        { key: 'humanoidBones', label: 'Humanoid Bones' }
      ]
    },
    {
      title: 'Metadata',
      data: stats.meta,
      fields: [
        { key: 'name', label: 'Name' },
        { key: 'version', label: 'Version' },
        { key: 'authors', label: 'Authors', format: (v: any) => Array.isArray(v) ? v.join(', ') : v },
        { key: 'copyrightInformation', label: 'Copyright' },
        { key: 'contactInformation', label: 'Contact' },
        { key: 'licenseUrl', label: 'License URL' }
      ]
    },
    {
      title: 'Usage Permissions',
      data: stats.meta,
      fields: [
        { key: 'avatarPermission', label: 'Avatar Permission' },
        { key: 'commercialUsage', label: 'Commercial Usage' },
        { key: 'allowExcessivelyViolentUsage', label: 'Violent Usage', format: (v: any) => v ? 'Allowed' : 'Not Allowed' },
        { key: 'allowExcessivelySexualUsage', label: 'Sexual Usage', format: (v: any) => v ? 'Allowed' : 'Not Allowed' },
        { key: 'allowPoliticalOrReligiousUsage', label: 'Political/Religious', format: (v: any) => v ? 'Allowed' : 'Not Allowed' },
        { key: 'allowAntisocialOrHateUsage', label: 'Antisocial/Hate', format: (v: any) => v ? 'Allowed' : 'Not Allowed' },
        { key: 'creditNotation', label: 'Credit Notation' },
        { key: 'allowRedistribution', label: 'Redistribution', format: (v: any) => v ? 'Allowed' : 'Not Allowed' },
        { key: 'modification', label: 'Modification' }
      ]
    },
    {
      title: 'Expressions',
      data: stats.expressions,
      fields: [
        { key: 'count', label: 'Expression Count' },
        { key: 'names', label: 'Available Expressions', format: (v: any) => Array.isArray(v) ? v.join(', ') : 'None' }
      ]
    }
  ];
  
  sections.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'stat-section';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = section.title;
    sectionEl.appendChild(titleEl);
    
    const fieldsEl = document.createElement('div');
    fieldsEl.className = 'stat-fields';
    
    section.fields.forEach(field => {
      const value = section.data[field.key];
      if (value !== undefined && value !== null && value !== '') {
        const fieldEl = document.createElement('div');
        fieldEl.className = 'stat-field';
        
        const labelEl = document.createElement('span');
        labelEl.className = 'stat-label';
        labelEl.textContent = field.label + ':';
        
        const valueEl = document.createElement('span');
        valueEl.className = 'stat-value';
        valueEl.textContent = field.format ? field.format(value) : String(value);
        
        fieldEl.appendChild(labelEl);
        fieldEl.appendChild(valueEl);
        fieldsEl.appendChild(fieldEl);
      }
    });
    
    sectionEl.appendChild(fieldsEl);
    statsContent.appendChild(sectionEl);
  });
}


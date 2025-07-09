import { loadVRM } from './main';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let updateExpressionCallback: ((name: string, value: number) => void) | null = null;

export function initUI(onUpdateExpression?: (name: string, value: number) => void) {
  if (onUpdateExpression) {
    updateExpressionCallback = onUpdateExpression;
  }
  
  const uploadPrompt = document.getElementById('uploadPrompt')!;
  const uploadButton = document.getElementById('uploadButton')!;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const statsPanel = document.getElementById('statsPanel')!;
  const statsContent = document.getElementById('statsContent')!;
  const closeStats = document.getElementById('closeStats')!;
  const showStatsButton = document.getElementById('showStatsButton')!;
  const dropOverlay = document.getElementById('dropOverlay')!;
  const loadNewButton = document.getElementById('loadNewButton')!;
  
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
  
  // Load new button for mobile
  loadNewButton.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
      if (file && file.name.toLowerCase().endsWith('.vrm')) {
      handleFileUpload(file);
      // Reset file input so the same file can be selected again
      (e.target as HTMLInputElement).value = '';
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
    loadNewButton.classList.add('visible');
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderExpressions(data: any): string {
  if (!data || !data.names || data.names.length === 0) {
    return '<div class="no-expressions">No expressions found</div>';
  }
  
  const maxInitialItems = 3;
  let html = '<div class="items-container expression-controls">';
  
  data.names.forEach((name: string, index: number) => {
    const hiddenClass = index >= maxInitialItems ? 'hidden-item' : '';
    html += `
      <div class="expression-item ${hiddenClass}" style="${index >= maxInitialItems ? 'display: none;' : ''}">
        <label class="expression-label">${name}</label>
        <input 
          type="range" 
          class="expression-slider" 
          min="0" 
          max="1" 
          step="0.01" 
          value="0" 
          data-expression-name="${name}"
        />
        <span class="expression-value">0.00</span>
      </div>
    `;
  });
  
  html += '</div>';
  
  if (data.names.length > maxInitialItems) {
    html += `
      <button class="see-more-btn expression-see-more">See ${data.names.length - maxInitialItems} more</button>
      <button class="see-more-btn expression-see-less" style="display: none;">See less</button>
    `;
  }
  
  // Attach event listeners after rendering
  setTimeout(() => attachExpressionListeners(), 0);
  
  return html;
}

function attachExpressionListeners() {
  // Attach listeners to sliders
  const sliders = document.querySelectorAll('.expression-slider');
  sliders.forEach(slider => {
    const input = slider as HTMLInputElement;
    const valueDisplay = input.nextElementSibling as HTMLSpanElement;
    
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      const expressionName = target.getAttribute('data-expression-name');
      
      // Update value display
      valueDisplay.textContent = value.toFixed(2);
      
      // Call the callback if available
      if (expressionName && updateExpressionCallback) {
        updateExpressionCallback(expressionName, value);
      }
    });
  });
  
  // Attach listeners to see more/less buttons
  const seeMoreBtn = document.querySelector('.expression-see-more') as HTMLButtonElement;
  const seeLessBtn = document.querySelector('.expression-see-less') as HTMLButtonElement;
  const container = document.querySelector('.expression-controls') as HTMLElement;
  
  if (seeMoreBtn && seeLessBtn && container) {
    seeMoreBtn.addEventListener('click', () => {
      const hiddenItems = container.querySelectorAll('.hidden-item');
      hiddenItems.forEach(item => {
        item.classList.remove('hidden-item');
        (item as HTMLElement).style.display = '';
      });
      seeMoreBtn.style.display = 'none';
      seeLessBtn.style.display = 'block';
    });
    
    seeLessBtn.addEventListener('click', () => {
      const items = container.querySelectorAll('.expression-item');
      items.forEach((item, index) => {
        if (index >= 3) {
          item.classList.add('hidden-item');
          (item as HTMLElement).style.display = 'none';
        }
      });
      seeLessBtn.style.display = 'none';
      seeMoreBtn.style.display = 'block';
    });
  }
}

function attachTextureListeners() {
  const textureHeaders = document.querySelectorAll('.texture-header');
  
  textureHeaders.forEach(header => {
    const toggleBtn = header.querySelector('.texture-toggle-btn') as HTMLButtonElement;
    const textureItem = header.closest('.texture-item') as HTMLElement;
    const textureId = header.getAttribute('data-texture-id');
    const preview = document.getElementById(textureId!) as HTMLElement;
    const canvas = preview?.querySelector('.texture-canvas') as HTMLCanvasElement;
    const downloadBtn = preview?.querySelector('.texture-download-btn') as HTMLButtonElement;
    
    if (!toggleBtn || !preview || !canvas) return;
    
    toggleBtn.addEventListener('click', () => {
      const isOpen = preview.style.display !== 'none';
      
      if (!isOpen) {
        preview.style.display = 'block';
        textureItem.classList.add('expanded');
        
        // Render texture if not already rendered
        if (!canvas.getAttribute('data-rendered')) {
          const textureData = (textureItem as any).textureData;
          if (textureData && textureData.texture) {
            renderTextureToCanvas(textureData.texture, canvas);
            canvas.setAttribute('data-rendered', 'true');
          }
        }
      } else {
        preview.style.display = 'none';
        textureItem.classList.remove('expanded');
      }
      
      // Rotate arrow
      toggleBtn.classList.toggle('rotated');
    });
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const textureData = (textureItem as any).textureData;
        if (textureData && canvas.getAttribute('data-rendered')) {
          downloadCanvasAsImage(canvas, `${textureData.type}_texture.png`);
        }
      });
    }
  });
}

function renderTextureToCanvas(texture: any, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const image = texture.image;
  if (!image) return;
  
  // Set canvas size to match image aspect ratio
  const maxSize = 256;
  let width = image.width || image.naturalWidth;
  let height = image.height || image.naturalHeight;
  
  if (width > height) {
    if (width > maxSize) {
      height = (height / width) * maxSize;
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw checkerboard background for transparency
  const checkerSize = 10;
  for (let y = 0; y < height; y += checkerSize) {
    for (let x = 0; x < width; x += checkerSize) {
      ctx.fillStyle = ((x / checkerSize + y / checkerSize) % 2 === 0) ? '#e0e0e0' : '#ffffff';
      ctx.fillRect(x, y, checkerSize, checkerSize);
    }
  }
  
  // Draw the texture
  try {
    ctx.drawImage(image, 0, 0, width, height);
  } catch (e) {
    console.error('Failed to render texture:', e);
    ctx.fillStyle = '#ff0000';
    ctx.font = '14px Arial';
    ctx.fillText('Failed to render', 10, height / 2);
  }
}

function downloadCanvasAsImage(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
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
        humanoidBones: stats.humanoid.bonesCount,
        drawCalls: stats.performance.drawCalls,
        fileSize: stats.performance.fileSize,
        textureMemory: stats.performance.textureMemory,
        geometryMemory: stats.performance.geometryMemory,
        estimatedVRAM: stats.performance.estimatedVRAM
      },
      fields: [
        { key: 'meshCount', label: 'Mesh Count' },
        { key: 'totalVertices', label: 'Total Vertices', format: (v: any) => v.toLocaleString() },
        { key: 'totalFaces', label: 'Total Faces', format: (v: any) => v.toLocaleString() },
        { key: 'materialCount', label: 'Material Count' },
        { key: 'textureCount', label: 'Texture Count' },
        { key: 'humanoidBones', label: 'Humanoid Bones' },
        { key: 'drawCalls', label: 'Draw Calls' },
        { key: 'fileSize', label: 'Disk Usage', format: (v: any) => formatBytes(v) },
        { key: 'textureMemory', label: 'Texture Memory', format: (v: any) => formatBytes(v) },
        { key: 'geometryMemory', label: 'Geometry Memory', format: (v: any) => formatBytes(v) },
        { key: 'estimatedVRAM', label: 'Est. VRAM Usage', format: (v: any) => formatBytes(v) }
      ]
    },
    {
      title: 'Meshes',
      data: { meshes: stats.meshes.list },
      fields: [],
      custom: true
    },
    {
      title: 'Materials',
      data: { materials: stats.materials.list },
      fields: [],
      custom: true
    },
    {
      title: 'Textures',
      data: { textures: stats.textures.list },
      fields: [],
      custom: true
    },
    {
      title: 'Expressions',
      data: stats.expressions,
      fields: [],
      render: (data: any) => renderExpressions(data)
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
  ];
  
  sections.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'stat-section';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = section.title;
    sectionEl.appendChild(titleEl);
    
    const fieldsEl = document.createElement('div');
    fieldsEl.className = 'stat-fields';
    
    if ((section as any).render) {
      // Custom render function
      fieldsEl.innerHTML = (section as any).render(section.data);
    } else if ((section as any).custom) {
      // Custom rendering for detailed lists
      const maxInitialItems = 3;
      
      if (section.data.meshes) {
        const meshList = section.data.meshes as any[];
        if (meshList.length > 0) {
          const itemsContainer = document.createElement('div');
          itemsContainer.className = 'items-container';
          
          meshList.forEach((mesh: any, index: number) => {
            const meshEl = document.createElement('div');
            meshEl.className = 'detail-item';
            if (index >= maxInitialItems) {
              meshEl.classList.add('hidden-item');
            }
            meshEl.innerHTML = `
              <div class="detail-name">${mesh.name}</div>
              <div class="detail-info">Vertices: ${mesh.vertices.toLocaleString()}, Faces: ${mesh.faces.toLocaleString()}</div>
            `;
            itemsContainer.appendChild(meshEl);
          });
          
          fieldsEl.appendChild(itemsContainer);
          
          if (meshList.length > maxInitialItems) {
            const seeMoreBtn = document.createElement('button');
            seeMoreBtn.className = 'see-more-btn';
            seeMoreBtn.textContent = `See ${meshList.length - maxInitialItems} more`;
            
            const seeLessBtn = document.createElement('button');
            seeLessBtn.className = 'see-more-btn';
            seeLessBtn.textContent = 'See less';
            seeLessBtn.style.display = 'none';
            
            seeMoreBtn.addEventListener('click', () => {
              const hiddenItems = itemsContainer.querySelectorAll('.hidden-item');
              hiddenItems.forEach(item => item.classList.remove('hidden-item'));
              seeMoreBtn.style.display = 'none';
              seeLessBtn.style.display = 'block';
            });
            
            seeLessBtn.addEventListener('click', () => {
              meshList.forEach((mesh: any, index: number) => {
                if (index >= maxInitialItems) {
                  const item = itemsContainer.children[index] as HTMLElement;
                  item.classList.add('hidden-item');
                }
              });
              seeLessBtn.style.display = 'none';
              seeMoreBtn.style.display = 'block';
            });
            
            fieldsEl.appendChild(seeMoreBtn);
            fieldsEl.appendChild(seeLessBtn);
          }
        } else {
          fieldsEl.textContent = 'No meshes found';
        }
      } else if (section.data.materials) {
        const materialList = section.data.materials as any[];
        if (materialList.length > 0) {
          const itemsContainer = document.createElement('div');
          itemsContainer.className = 'items-container';
          
          materialList.forEach((mat: any, index: number) => {
            const matEl = document.createElement('div');
            matEl.className = 'detail-item';
            if (index >= maxInitialItems) {
              matEl.classList.add('hidden-item');
            }
            matEl.innerHTML = `
              <div class="detail-name">${mat.name}</div>
              <div class="detail-info">Type: ${mat.type}</div>
            `;
            itemsContainer.appendChild(matEl);
          });
          
          fieldsEl.appendChild(itemsContainer);
          
          if (materialList.length > maxInitialItems) {
            const seeMoreBtn = document.createElement('button');
            seeMoreBtn.className = 'see-more-btn';
            seeMoreBtn.textContent = `See ${materialList.length - maxInitialItems} more`;
            
            const seeLessBtn = document.createElement('button');
            seeLessBtn.className = 'see-more-btn';
            seeLessBtn.textContent = 'See less';
            seeLessBtn.style.display = 'none';
            
            seeMoreBtn.addEventListener('click', () => {
              const hiddenItems = itemsContainer.querySelectorAll('.hidden-item');
              hiddenItems.forEach(item => item.classList.remove('hidden-item'));
              seeMoreBtn.style.display = 'none';
              seeLessBtn.style.display = 'block';
            });
            
            seeLessBtn.addEventListener('click', () => {
              materialList.forEach((mat: any, index: number) => {
                if (index >= maxInitialItems) {
                  const item = itemsContainer.children[index] as HTMLElement;
                  item.classList.add('hidden-item');
                }
              });
              seeLessBtn.style.display = 'none';
              seeMoreBtn.style.display = 'block';
            });
            
            fieldsEl.appendChild(seeMoreBtn);
            fieldsEl.appendChild(seeLessBtn);
          }
        } else {
          fieldsEl.textContent = 'No materials found';
        }
      } else if (section.data.textures) {
        const textureList = section.data.textures as any[];
        if (textureList.length > 0) {
          const itemsContainer = document.createElement('div');
          itemsContainer.className = 'items-container texture-container';
          
          textureList.forEach((tex: any, index: number) => {
            const texEl = document.createElement('div');
            texEl.className = 'detail-item texture-item';
            if (index >= maxInitialItems) {
              texEl.classList.add('hidden-item');
            }
            
            const textureId = `texture-${index}`;
            texEl.innerHTML = `
              <div class="texture-header" data-texture-id="${textureId}">
                <div class="texture-info">
                  <div class="detail-name">${tex.type} Map</div>
                  <div class="detail-info">Size: ${tex.size}</div>
                </div>
                <button class="texture-toggle-btn" aria-label="Toggle preview">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
              <div class="texture-preview" id="${textureId}" style="display: none;">
                <canvas class="texture-canvas" width="256" height="256"></canvas>
                <button class="texture-download-btn">Download</button>
              </div>
            `;
            
            // Store texture data on the element
            (texEl as any).textureData = tex;
            
            itemsContainer.appendChild(texEl);
          });
          
          fieldsEl.appendChild(itemsContainer);
          
          // Attach texture interaction listeners
          setTimeout(() => attachTextureListeners(), 0);
          
          if (textureList.length > maxInitialItems) {
            const seeMoreBtn = document.createElement('button');
            seeMoreBtn.className = 'see-more-btn';
            seeMoreBtn.textContent = `See ${textureList.length - maxInitialItems} more`;
            
            const seeLessBtn = document.createElement('button');
            seeLessBtn.className = 'see-more-btn';
            seeLessBtn.textContent = 'See less';
            seeLessBtn.style.display = 'none';
            
            seeMoreBtn.addEventListener('click', () => {
              const hiddenItems = itemsContainer.querySelectorAll('.hidden-item');
              hiddenItems.forEach(item => item.classList.remove('hidden-item'));
              seeMoreBtn.style.display = 'none';
              seeLessBtn.style.display = 'block';
            });
            
            seeLessBtn.addEventListener('click', () => {
              textureList.forEach((tex: any, index: number) => {
                if (index >= maxInitialItems) {
                  const item = itemsContainer.children[index] as HTMLElement;
                  item.classList.add('hidden-item');
                  // Also close any open previews
                  const preview = item.querySelector('.texture-preview') as HTMLElement;
                  if (preview) {
                    preview.style.display = 'none';
                  }
                }
              });
              seeLessBtn.style.display = 'none';
              seeMoreBtn.style.display = 'block';
            });
            
            fieldsEl.appendChild(seeMoreBtn);
            fieldsEl.appendChild(seeLessBtn);
          }
        } else {
          fieldsEl.textContent = 'No textures found';
        }
      }
    } else {
      // Regular field rendering
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
    }
    
    sectionEl.appendChild(fieldsEl);
    statsContent.appendChild(sectionEl);
  });
}


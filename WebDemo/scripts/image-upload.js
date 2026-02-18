(function () {
  'use strict';

  var DB_NAME = 'shopThat_imageDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'state';
  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  var IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  var ZIP_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'];

  // ─── Upload modal elements ───
  var modal = document.getElementById('uploadModal');
  var openBtn = document.getElementById('uploadImagesBtn');
  var closeBtn = document.getElementById('uploadModalClose');
  var cancelBtn = document.getElementById('uploadCancelBtn');
  var confirmBtn = document.getElementById('uploadConfirmBtn');
  var dropzone = document.getElementById('uploadDropzone');
  var fileInput = document.getElementById('uploadFileInput');
  var previewPanel = document.getElementById('uploadPreview');
  var previewGrid = document.getElementById('previewGrid');
  var previewCount = document.getElementById('previewCount');
  var previewClearBtn = document.getElementById('previewClearBtn');
  var progressWrap = document.getElementById('uploadProgress');
  var progressFill = document.getElementById('uploadProgressFill');
  var progressText = document.getElementById('uploadProgressText');

  // ─── Gallery elements ───
  var gallerySection = document.getElementById('uploadedGallery');
  var galleryGrid = document.getElementById('galleryGrid');
  var uploadedCountEl = document.getElementById('uploadedCount');
  var clearGalleryBtn = document.getElementById('clearGalleryBtn');
  var totalImagesEl = document.getElementById('dbTotalImages');
  var overviewImagesEl = document.getElementById('overviewImagesUploaded');
  var selectAllCheckbox = document.getElementById('selectAllCheckbox');
  var bulkActionBar = document.getElementById('bulkActionBar');
  var bulkSelectionCount = document.getElementById('bulkSelectionCount');
  var moveToFolderBtn = document.getElementById('moveToFolderBtn');
  var deselectAllBtn = document.getElementById('deselectAllBtn');

  // ─── Breadcrumb ───
  var breadcrumbNav = document.getElementById('galleryBreadcrumb');

  // ─── Folder modal ───
  var folderModal = document.getElementById('folderModal');
  var folderModalClose = document.getElementById('folderModalClose');
  var existingFoldersList = document.getElementById('existingFoldersList');
  var newFolderInput = document.getElementById('newFolderInput');
  var createFolderBtn = document.getElementById('createFolderBtn');

  // ─── Lightbox ───
  var lightbox = document.getElementById('imageLightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');

  // ─── State ───
  var stagedFiles = [];
  var galleryImages = [];
  var folders = [];
  var selectedIds = new Set();
  var currentFolder = null;
  var lightboxList = [];
  var lightboxIndex = 0;
  var nextId = 1;

  // ─── Persistence (IndexedDB) ───

  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function saveState() {
    openDB().then(function (db) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      store.put(galleryImages, 'galleryImages');
      store.put(folders, 'folders');
      store.put(nextId, 'nextId');
    }).catch(function (e) {
      console.warn('Could not save to IndexedDB:', e);
    });
  }

  function loadState() {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var imgReq = store.get('galleryImages');
        var fldReq = store.get('folders');
        var idReq = store.get('nextId');

        tx.oncomplete = function () {
          if (imgReq.result && Array.isArray(imgReq.result)) {
            galleryImages = imgReq.result;
          }
          if (fldReq.result && Array.isArray(fldReq.result)) {
            folders = fldReq.result;
          }
          if (idReq.result) {
            nextId = idReq.result;
          }
          resolve();
        };
        tx.onerror = function () { resolve(); };
      });
    }).catch(function (e) {
      console.warn('Could not load from IndexedDB:', e);
    });
  }

  function genId() { return nextId++; }

  // ─── Metrics ───

  function updateMetrics() {
    var count = galleryImages.length;
    if (totalImagesEl) totalImagesEl.textContent = count.toLocaleString();
    if (overviewImagesEl) overviewImagesEl.textContent = count.toLocaleString();
  }

  // ─── File helpers ───

  function isImageFile(file) {
    if (IMAGE_TYPES.includes(file.type)) return true;
    var name = file.name.toLowerCase();
    return IMAGE_EXTENSIONS.some(function (ext) { return name.endsWith(ext); });
  }

  function isZipFile(file) {
    if (ZIP_TYPES.includes(file.type)) return true;
    return file.name.toLowerCase().endsWith('.zip');
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }

  async function extractImagesFromZip(file) {
    var zip = await JSZip.loadAsync(file);
    var images = [];
    var entries = [];

    zip.forEach(function (path, entry) {
      if (entry.dir) return;
      var lower = path.toLowerCase();
      if (lower.startsWith('__macosx')) return;
      if (IMAGE_EXTENSIONS.some(function (ext) { return lower.endsWith(ext); })) {
        entries.push({ path: path, entry: entry });
      }
    });

    for (var i = 0; i < entries.length; i++) {
      var item = entries[i];
      var blob = await item.entry.async('blob');
      var name = item.path.split('/').pop();
      var ext = name.split('.').pop().toLowerCase();
      var mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
      var mime = mimeMap[ext] || 'image/jpeg';
      images.push(new File([blob], name, { type: mime }));
    }

    return images;
  }

  // ─── Upload processing ───

  async function processFiles(files) {
    showProgress('Processing files...');
    var allImages = [];
    var zipCount = 0;
    var total = files.length;

    for (var i = 0; i < total; i++) {
      var file = files[i];
      setProgress(((i / total) * 70), 'Processing ' + file.name + '...');

      if (isZipFile(file)) {
        zipCount++;
        try {
          var extracted = await extractImagesFromZip(file);
          allImages = allImages.concat(extracted);
        } catch (e) {
          console.error('Failed to extract zip:', e);
        }
      } else if (isImageFile(file)) {
        allImages.push(file);
      }
    }

    setProgress(80, 'Generating previews...');

    for (var j = 0; j < allImages.length; j++) {
      var dataUrl = await readFileAsDataURL(allImages[j]);
      stagedFiles.push({ file: allImages[j], dataUrl: dataUrl });
      setProgress(80 + ((j / allImages.length) * 20), 'Preview ' + (j + 1) + ' of ' + allImages.length);
    }

    hideProgress();
    renderPreviews();

    if (zipCount > 0) {
      var imgCount = allImages.length;
      progressText.textContent = 'Extracted ' + imgCount + ' image' + (imgCount !== 1 ? 's' : '') + ' from ' + zipCount + ' zip file' + (zipCount > 1 ? 's' : '');
      progressWrap.style.display = 'block';
      progressFill.style.width = '100%';
    }
  }

  function showProgress(text) {
    progressWrap.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = text || 'Processing...';
  }

  function setProgress(pct, text) {
    progressFill.style.width = Math.min(pct, 100) + '%';
    if (text) progressText.textContent = text;
  }

  function hideProgress() {
    progressFill.style.width = '100%';
    setTimeout(function () {
      progressWrap.style.display = 'none';
      progressFill.style.width = '0%';
    }, 400);
  }

  // ─── Upload preview ───

  function renderPreviews() {
    previewGrid.innerHTML = '';
    if (stagedFiles.length === 0) {
      previewPanel.style.display = 'none';
      confirmBtn.disabled = true;
      return;
    }
    previewPanel.style.display = 'block';
    confirmBtn.disabled = false;
    previewCount.textContent = stagedFiles.length + ' image' + (stagedFiles.length !== 1 ? 's' : '') + ' ready';

    stagedFiles.forEach(function (item, idx) {
      var div = document.createElement('div');
      div.className = 'upload-preview__item';
      var img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = item.file.name;
      var removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '\u00d7';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', function () {
        stagedFiles.splice(idx, 1);
        renderPreviews();
      });
      div.appendChild(img);
      div.appendChild(removeBtn);
      previewGrid.appendChild(div);
    });
  }

  function addToGallery() {
    stagedFiles.forEach(function (item) {
      galleryImages.push({ id: genId(), name: item.file.name, dataUrl: item.dataUrl, folder: null });
    });
    stagedFiles = [];
    renderPreviews();
    closeUploadModal();
    saveState();
    renderGallery();
  }

  // ─── Upload modal controls ───

  function openUploadModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeUploadModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    stagedFiles = [];
    renderPreviews();
    progressWrap.style.display = 'none';
  }

  // ─── Gallery rendering ───

  function getVisibleImages() {
    return galleryImages.filter(function (img) { return img.folder === currentFolder; });
  }

  function renderGallery() {
    galleryGrid.innerHTML = '';
    selectedIds.clear();
    updateBulkBar();
    updateMetrics();

    if (galleryImages.length === 0) {
      gallerySection.style.display = 'none';
      return;
    }

    gallerySection.style.display = 'block';

    renderBreadcrumb();

    var visibleImages = getVisibleImages();

    if (currentFolder === null) {
      uploadedCountEl.textContent = '(' + galleryImages.length + ' images, ' + folders.length + ' folder' + (folders.length !== 1 ? 's' : '') + ')';
      folders.forEach(function (folder) {
        var count = galleryImages.filter(function (img) { return img.folder === folder.id; }).length;
        galleryGrid.appendChild(createFolderCard(folder, count));
      });
    } else {
      uploadedCountEl.textContent = '(' + visibleImages.length + ' image' + (visibleImages.length !== 1 ? 's' : '') + ')';
    }

    visibleImages.forEach(function (item) {
      galleryGrid.appendChild(createImageCard(item));
    });

    selectAllCheckbox.checked = false;
  }

  function createFolderCard(folder, count) {
    var card = document.createElement('div');
    card.className = 'upload-gallery__folder';
    card.title = folder.name;

    card.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';

    var label = document.createElement('div');
    label.className = 'folder-label';
    label.textContent = folder.name;

    var countEl = document.createElement('div');
    countEl.className = 'folder-count';
    countEl.textContent = count + ' image' + (count !== 1 ? 's' : '');

    card.appendChild(label);
    card.appendChild(countEl);

    card.addEventListener('click', function () {
      currentFolder = folder.id;
      renderGallery();
    });

    return card;
  }

  function createImageCard(item) {
    var card = document.createElement('div');
    card.className = 'upload-gallery__card';
    card.dataset.imageId = item.id;

    if (selectedIds.has(item.id)) card.classList.add('is-selected');

    var selectDot = document.createElement('div');
    selectDot.className = 'gallery-select';
    selectDot.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    var img = document.createElement('img');
    img.src = item.dataUrl;
    img.alt = item.name;
    img.loading = 'lazy';

    var nameEl = document.createElement('div');
    nameEl.className = 'gallery-name';
    nameEl.textContent = item.name;
    nameEl.title = item.name;

    var removeBtn = document.createElement('button');
    removeBtn.className = 'gallery-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      galleryImages = galleryImages.filter(function (g) { return g.id !== item.id; });
      selectedIds.delete(item.id);
      saveState();
      renderGallery();
    });

    card.appendChild(selectDot);
    card.appendChild(img);
    card.appendChild(nameEl);
    card.appendChild(removeBtn);

    card.addEventListener('click', function (e) {
      if (e.target === removeBtn) return;

      if (e.shiftKey || e.ctrlKey || e.metaKey || selectedIds.size > 0) {
        toggleSelection(item.id, card);
        return;
      }

      openLightbox(item);
    });

    return card;
  }

  // ─── Selection ───

  function toggleSelection(id, card) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      if (card) card.classList.remove('is-selected');
    } else {
      selectedIds.add(id);
      if (card) card.classList.add('is-selected');
    }
    updateBulkBar();
    updateSelectAllCheckbox();
  }

  function updateBulkBar() {
    if (selectedIds.size > 0) {
      bulkActionBar.style.display = 'flex';
      bulkSelectionCount.textContent = selectedIds.size + ' image' + (selectedIds.size !== 1 ? 's' : '') + ' selected';
    } else {
      bulkActionBar.style.display = 'none';
    }
  }

  function updateSelectAllCheckbox() {
    var visible = getVisibleImages();
    if (visible.length === 0) {
      selectAllCheckbox.checked = false;
      return;
    }
    selectAllCheckbox.checked = visible.every(function (img) { return selectedIds.has(img.id); });
  }

  function selectAllVisible() {
    getVisibleImages().forEach(function (img) { selectedIds.add(img.id); });
    refreshSelectionUI();
  }

  function deselectAll() {
    selectedIds.clear();
    refreshSelectionUI();
  }

  function refreshSelectionUI() {
    galleryGrid.querySelectorAll('.upload-gallery__card').forEach(function (card) {
      var id = parseInt(card.dataset.imageId, 10);
      card.classList.toggle('is-selected', selectedIds.has(id));
    });
    updateBulkBar();
    updateSelectAllCheckbox();
  }

  // ─── Breadcrumb navigation ───

  function renderBreadcrumb() {
    breadcrumbNav.innerHTML = '';

    var rootBtn = document.createElement('button');
    rootBtn.className = 'gallery-breadcrumb__item' + (currentFolder === null ? ' is-active' : '');
    rootBtn.textContent = 'All Images';
    rootBtn.addEventListener('click', function () {
      currentFolder = null;
      renderGallery();
    });
    breadcrumbNav.appendChild(rootBtn);

    if (currentFolder !== null) {
      var folder = folders.find(function (f) { return f.id === currentFolder; });
      if (folder) {
        var sep = document.createElement('span');
        sep.className = 'gallery-breadcrumb__sep';
        sep.textContent = '/';
        breadcrumbNav.appendChild(sep);

        var folderBtn = document.createElement('button');
        folderBtn.className = 'gallery-breadcrumb__item is-active';
        folderBtn.textContent = folder.name;
        breadcrumbNav.appendChild(folderBtn);
      }
    }
  }

  // ─── Folder dialog ───

  function openFolderModal() {
    folderModal.style.display = 'flex';
    newFolderInput.value = '';
    renderExistingFolders();
    newFolderInput.focus();
  }

  function closeFolderModal() {
    folderModal.style.display = 'none';
  }

  function renderExistingFolders() {
    existingFoldersList.innerHTML = '';
    if (folders.length === 0) return;

    folders.forEach(function (folder) {
      var item = document.createElement('div');
      item.className = 'folder-list__item';
      item.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
      var span = document.createElement('span');
      span.textContent = folder.name;
      item.appendChild(span);

      item.addEventListener('click', function () {
        moveSelectedToFolder(folder.id);
        closeFolderModal();
      });

      existingFoldersList.appendChild(item);
    });
  }

  function createFolderAndMove() {
    var name = newFolderInput.value.trim();
    if (!name) return;

    var existing = folders.find(function (f) { return f.name.toLowerCase() === name.toLowerCase(); });
    var folderId;

    if (existing) {
      folderId = existing.id;
    } else {
      folderId = genId();
      folders.push({ id: folderId, name: name });
    }

    moveSelectedToFolder(folderId);
    closeFolderModal();
  }

  function moveSelectedToFolder(folderId) {
    galleryImages.forEach(function (img) {
      if (selectedIds.has(img.id)) {
        img.folder = folderId;
      }
    });
    selectedIds.clear();
    saveState();
    renderGallery();
  }

  // ─── Lightbox ───

  function openLightbox(item) {
    lightboxList = getVisibleImages();
    lightboxIndex = lightboxList.findIndex(function (img) { return img.id === item.id; });
    if (lightboxIndex < 0) lightboxIndex = 0;
    showLightboxImage();
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  function showLightboxImage() {
    var item = lightboxList[lightboxIndex];
    lightboxImg.src = item.dataUrl;
    lightboxImg.alt = item.name;
    lightboxCaption.textContent = item.name + '  (' + (lightboxIndex + 1) + ' of ' + lightboxList.length + ')';
    lightboxPrev.style.visibility = lightboxIndex > 0 ? 'visible' : 'hidden';
    lightboxNext.style.visibility = lightboxIndex < lightboxList.length - 1 ? 'visible' : 'hidden';
  }

  function lightboxGoNext() {
    if (lightboxIndex < lightboxList.length - 1) {
      lightboxIndex++;
      showLightboxImage();
    }
  }

  function lightboxGoPrev() {
    if (lightboxIndex > 0) {
      lightboxIndex--;
      showLightboxImage();
    }
  }

  // ─── Event listeners: Upload modal ───

  openBtn.addEventListener('click', openUploadModal);
  closeBtn.addEventListener('click', closeUploadModal);
  cancelBtn.addEventListener('click', closeUploadModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeUploadModal();
  });

  dropzone.addEventListener('click', function () { fileInput.click(); });

  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  });

  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    if (e.dataTransfer.files.length) processFiles(Array.from(e.dataTransfer.files));
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) {
      processFiles(Array.from(fileInput.files));
      fileInput.value = '';
    }
  });

  previewClearBtn.addEventListener('click', function () {
    stagedFiles = [];
    renderPreviews();
    progressWrap.style.display = 'none';
  });

  var confirmBtnDefaultHTML = confirmBtn.innerHTML;

  function setConfirmLoading(loading) {
    if (loading) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="btn-spinner"></span> Uploading\u2026';
    } else {
      confirmBtn.innerHTML = confirmBtnDefaultHTML;
      confirmBtn.disabled = false;
    }
  }

  confirmBtn.addEventListener('click', function () {
    if (stagedFiles.length === 0) return;
    setConfirmLoading(true);
    showProgress('Uploading to database...');
    var total = stagedFiles.length;
    var i = 0;
    function tick() {
      i++;
      setProgress((i / total) * 100, 'Uploading ' + i + ' of ' + total + '...');
      if (i >= total) {
        setTimeout(function () {
          hideProgress();
          setConfirmLoading(false);
          addToGallery();
        }, 300);
      } else {
        setTimeout(tick, 40 + Math.random() * 60);
      }
    }
    tick();
  });

  // ─── Event listeners: Gallery ───

  clearGalleryBtn.addEventListener('click', function () {
    galleryImages = [];
    folders = [];
    currentFolder = null;
    selectedIds.clear();
    saveState();
    renderGallery();
  });

  selectAllCheckbox.addEventListener('change', function () {
    if (selectAllCheckbox.checked) {
      selectAllVisible();
    } else {
      deselectAll();
    }
  });

  deselectAllBtn.addEventListener('click', function () {
    deselectAll();
    selectAllCheckbox.checked = false;
  });

  moveToFolderBtn.addEventListener('click', openFolderModal);

  // ─── Event listeners: Folder modal ───

  folderModalClose.addEventListener('click', closeFolderModal);
  folderModal.addEventListener('click', function (e) {
    if (e.target === folderModal) closeFolderModal();
  });
  createFolderBtn.addEventListener('click', createFolderAndMove);
  newFolderInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') createFolderAndMove();
  });

  // ─── Event listeners: Lightbox ───

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', lightboxGoPrev);
  lightboxNext.addEventListener('click', lightboxGoNext);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lightbox.style.display === 'flex') { closeLightbox(); return; }
      if (folderModal.style.display === 'flex') { closeFolderModal(); return; }
      if (modal.style.display === 'flex') { closeUploadModal(); return; }
    }
    if (lightbox.style.display === 'flex') {
      if (e.key === 'ArrowRight') lightboxGoNext();
      if (e.key === 'ArrowLeft') lightboxGoPrev();
    }
  });

  // ─── Init: load persisted state and render ───
  loadState().then(function () {
    renderGallery();
  });

})();

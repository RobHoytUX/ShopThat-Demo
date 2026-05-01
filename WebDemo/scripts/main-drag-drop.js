(function () {
  'use strict';

  function readStoredArray(key) {
    if (window.ShopThatStorage) return window.ShopThatStorage.readArray(key);
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      localStorage.removeItem(key);
      return [];
    }
  }

  function saveArray(key, value) {
    if (window.ShopThatStorage) {
      window.ShopThatStorage.write(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  window.currentDraggedProduct = null;

  function createSuccessToast() {
    const successToast = document.createElement('div');
    successToast.className = 'drop-success-toast';
    successToast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="10"/>
      </svg>
      <span>Product added successfully!</span>
    `;
    document.body.appendChild(successToast);
    return successToast;
  }

  function saveProductToCollections(productData) {
    const productId = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const imageSrc = productData.src || productData.image;

    const droppedProducts = readStoredArray('droppedProducts');
    if (!droppedProducts.find(p => p.title === productData.title)) {
      const nycLat = 40.7128 + (Math.random() - 0.5) * 0.05;
      const nycLng = -74.0060 + (Math.random() - 0.5) * 0.05;
      droppedProducts.push({
        id: productId,
        image: imageSrc,
        src: imageSrc,
        title: productData.title,
        model: productData.model || '',
        price: productData.price || '',
        lat: nycLat,
        lng: nycLng,
        addedAt: new Date().toISOString()
      });
      saveArray('droppedProducts', droppedProducts);
    }

    const galleryImages = readStoredArray('galleryImages');
    if (!galleryImages.find(g => g.src === imageSrc)) {
      galleryImages.push({
        src: imageSrc,
        image: imageSrc,
        title: productData.title,
        productData: {
          title: productData.title,
          model: productData.model,
          price: productData.price
        },
        addedAt: new Date().toISOString()
      });
      saveArray('galleryImages', galleryImages);
    }

    const wishlistProducts = readStoredArray('wishlistProducts');
    if (!wishlistProducts.find(w => w.id === productId || w.title === productData.title)) {
      wishlistProducts.push({
        id: productId,
        image: imageSrc,
        src: imageSrc,
        title: productData.title,
        model: productData.model || '',
        price: productData.price || '',
        addedAt: new Date().toISOString()
      });
      saveArray('wishlistProducts', wishlistProducts);
    }
  }

  function productDataFromDrop(event) {
    let productData = window.currentDraggedProduct;
    if (productData && productData.src) {
      return productData;
    }

    const productDataStr = event.dataTransfer.getData('application/json');
    const imageSrc = event.dataTransfer.getData('text/plain');
    if (productDataStr) {
      try {
        return JSON.parse(productDataStr);
      } catch (error) {
        return { src: imageSrc, title: 'Product' };
      }
    }
    return imageSrc ? { src: imageSrc, title: 'Product' } : null;
  }

  function appendDroppedProductCard(productData) {
    const chatMode = document.querySelector('.chatbot-wrapper')?.getAttribute('data-chatbot-view') === 'chat';
    if (chatMode) return;

    const productCard = document.createElement('div');
    productCard.className = 'chatbot-product-card';
    productCard.innerHTML = `
      <img class="chatbot-product-card-image" src="${productData.src}" alt="${productData.title || 'Product'}" />
      <div class="chatbot-product-card-info">
        <div class="chatbot-product-card-title">${productData.title || 'Product'}</div>
        ${productData.model ? `<div class="chatbot-product-card-model">${productData.model}</div>` : ''}
        ${productData.price ? `<div class="chatbot-product-card-price">${productData.price}</div>` : ''}
        <a class="chatbot-product-card-link" href="https://us.louisvuitton.com/eng-us/search/${encodeURIComponent(productData.title || 'LV')}" target="_blank" rel="noopener noreferrer">
          View on LV Store
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;
    const messagesContainer = document.querySelector('.chatbot-messages');
    if (messagesContainer) {
      messagesContainer.appendChild(productCard);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function initDragAndDrop() {
    const successToast = createSuccessToast();

    function showSuccessToast(message) {
      successToast.querySelector('span').textContent = message;
      successToast.classList.add('is-visible');
      setTimeout(() => {
        successToast.classList.remove('is-visible');
      }, 2500);
    }

    document.querySelectorAll('.product-card').forEach(productCard => {
      const img = productCard.querySelector('.product-card__image img');
      if (!img) return;

      const link = productCard.querySelector('a');
      if (link) {
        link.setAttribute('draggable', 'false');
      }

      productCard.setAttribute('draggable', 'true');

      productCard.addEventListener('dragstart', (event) => {
        const titleEl = productCard.querySelector('.product-card__title');
        const priceEl = productCard.querySelector('.product-card__price');
        const productTitle = titleEl?.textContent?.trim() || img.alt || 'Product';
        const productPrice = priceEl?.textContent?.trim() || '';
        const imageSrc = img.src;

        window.currentDraggedProduct = {
          src: imageSrc,
          title: productTitle,
          model: '',
          price: productPrice
        };

        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', imageSrc);
        event.dataTransfer.setData('application/json', JSON.stringify(window.currentDraggedProduct));
        event.dataTransfer.setDragImage(img, 50, 50);
        productCard.classList.add('is-dragging');

        const dropZone = document.querySelector('.chatbot-drop-zone');
        if (dropZone) {
          dropZone.classList.add('is-active');
        }
      });

      productCard.addEventListener('dragend', () => {
        productCard.classList.remove('is-dragging');
        setTimeout(() => {
          window.currentDraggedProduct = null;
        }, 100);

        const dropZone = document.querySelector('.chatbot-drop-zone');
        if (dropZone) {
          dropZone.classList.remove('is-active', 'is-over');
        }
      });
    });

    const dropZone = document.querySelector('.chatbot-drop-zone');
    const chatbotBox = document.querySelector('.chatbot-box');
    if (chatbotBox) {
      chatbotBox.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      });

      chatbotBox.addEventListener('dragenter', (event) => {
        event.preventDefault();
        if (dropZone) {
          dropZone.classList.add('is-active', 'is-over');
        }
      });

      chatbotBox.addEventListener('dragleave', (event) => {
        if (!chatbotBox.contains(event.relatedTarget) && dropZone) {
          dropZone.classList.remove('is-over');
        }
      });

      chatbotBox.addEventListener('drop', (event) => {
        event.preventDefault();
        if (dropZone) {
          dropZone.classList.remove('is-active', 'is-over');
        }

        const productData = productDataFromDrop(event);
        window.currentDraggedProduct = null;
        if (!productData || !productData.src) return;

        saveProductToCollections(productData);
        if (typeof window.addProductToGallery === 'function') {
          window.addProductToGallery(productData.src, productData);
        }
        appendDroppedProductCard(productData);
        showSuccessToast(`${productData.title || 'Product'} added to collections!`);

        window.dispatchEvent(new StorageEvent('storage', {
          key: 'galleryImages',
          newValue: localStorage.getItem('galleryImages')
        }));
      });
    }

    const galleryWrapper = document.querySelector('.image-gallery-wrapper');
    if (galleryWrapper) {
      galleryWrapper.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        galleryWrapper.style.transform = 'translateY(-4px) scale(1.02)';
        galleryWrapper.style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)';
      });

      galleryWrapper.addEventListener('dragleave', () => {
        galleryWrapper.style.transform = '';
        galleryWrapper.style.boxShadow = '';
      });

      galleryWrapper.addEventListener('drop', (event) => {
        event.preventDefault();
        galleryWrapper.style.transform = '';
        galleryWrapper.style.boxShadow = '';

        const imageSrc = event.dataTransfer.getData('text/plain');
        const productData = productDataFromDrop(event) || { title: 'Product' };
        if (imageSrc && typeof window.addProductToGallery === 'function') {
          window.addProductToGallery(imageSrc, productData);
        }
      });
    }
  }

  window.saveProductToCollections = saveProductToCollections;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragAndDrop, { once: true });
  } else {
    initDragAndDrop();
  }
}());

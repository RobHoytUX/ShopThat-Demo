(function (global) {
  'use strict';

  const kusamaProducts = [
    { title: 'LV X YK KEEPALL 25', model: 'M46406', price: '$2,980.00' },
    { title: 'LV X YK SAC PLAT', model: 'M46404', price: '$3,800.00' },
    { title: 'LV X YK MINI SOFT TRUNK', model: 'M81936', price: '$4,000.00' },
    { title: 'LV X YK KEEPALL 55', model: 'M46401', price: '$3,650.00' },
    { title: 'LV X YK NEVERFULL MM', model: 'M46402', price: '$2,750.00' },
    { title: 'LV X YK SPEEDY 25', model: 'M46403', price: '$2,900.00' },
    { title: 'LV X YK COSMETIC POUCH', model: 'M46407', price: '$1,890.00' },
    { title: 'LV X YK BACKPACK', model: 'M46408', price: '$3,950.00' }
  ];

  function productInfoFromImage(imgSrc) {
    const filename = String(imgSrc || '').split('/').pop().split('?')[0];
    const numberMatch = filename.match(/\d+/);
    const productNum = numberMatch ? parseInt(numberMatch[0], 10) : Math.floor(Math.random() * 9) + 1;
    const selectedProduct = kusamaProducts[productNum % kusamaProducts.length];

    return {
      id: Date.now() + Math.random(),
      image: imgSrc,
      title: selectedProduct.title,
      price: selectedProduct.price,
      model: selectedProduct.model,
      location: { lat: 48.8566 + (Math.random() - 0.5) * 0.02, lng: 2.3522 + (Math.random() - 0.5) * 0.02 }
    };
  }

  global.ShopThatMainProductData = {
    productInfoFromImage,
    products: kusamaProducts
  };
})(typeof window !== 'undefined' ? window : this);

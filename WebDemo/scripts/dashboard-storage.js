(function (global) {
  'use strict';

  function readArray(key) {
    if (global.ShopThatStorage) return global.ShopThatStorage.readArray(key);
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      localStorage.removeItem(key);
      return [];
    }
  }

  function readObject(key) {
    if (global.ShopThatStorage) return global.ShopThatStorage.readObject(key);
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      localStorage.removeItem(key);
      return {};
    }
  }

  global.ShopThatDashboardStorage = {
    readArray,
    readObject
  };
})(typeof window !== 'undefined' ? window : this);

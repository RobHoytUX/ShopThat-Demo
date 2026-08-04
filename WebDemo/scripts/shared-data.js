/* Shared Data Management System for Keywords Integration */
(function() {
  // Storage keys
  const STORAGE_KEYS = {
    keywords: 'st_keywords_v1',
    connections: 'st_connections_v1',
    disabledKeywords: 'st_disabled_keywords_v1',
    chatAnalytics: 'st_chat_analytics_v1',
    keywordUsage: 'st_keyword_usage_v1',
    sessions: 'st_chat_sessions_v1',
    chatHandoff: 'st_chat_handoff_v1'
  };
  const DB_NAME = 'shopthat-client-store';
  const DB_VERSION = 1;
  const STORE_NAME = 'records';

  let dbPromise = null;

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB unavailable for ShopThat storage sync', request.error);
        resolve(null);
      };
    });

    return dbPromise;
  }

  async function syncToIndexedDb(key, value) {
    const db = await openDatabase();
    if (!db) return;

    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, value, updatedAt: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => {
        console.warn('Unable to sync value to IndexedDB', key, tx.error);
        resolve();
      };
    });
  }

  async function removeFromIndexedDb(key) {
    const db = await openDatabase();
    if (!db) return;

    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = resolve;
      tx.onerror = () => {
        console.warn('Unable to remove value from IndexedDB', key, tx.error);
        resolve();
      };
    });
  }

  async function readFromIndexedDb(key) {
    const db = await openDatabase();
    if (!db) return undefined;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : undefined);
      request.onerror = () => {
        console.warn('Unable to read value from IndexedDB', key, request.error);
        resolve(undefined);
      };
    });
  }

  async function bootstrapStorageSync() {
    await Promise.all(Object.values(STORAGE_KEYS).map(async (key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          await syncToIndexedDb(key, JSON.parse(raw));
        } catch (error) {
          console.warn('Skipping invalid localStorage value during storage sync', key, error);
        }
        return;
      }

      const indexedValue = await readFromIndexedDb(key);
      if (indexedValue !== undefined) {
        try {
          localStorage.setItem(key, JSON.stringify(indexedValue));
        } catch (error) {
          console.warn('Unable to hydrate localStorage from IndexedDB', key, error);
        }
      }
    }));
  }

  function safeRead(key, fallback, validator) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback();

      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        throw new Error('Stored value failed validation');
      }
      syncToIndexedDb(key, parsed);
      return parsed;
    } catch (error) {
      console.warn('Resetting invalid localStorage value for', key, error);
      localStorage.removeItem(key);
      removeFromIndexedDb(key);
      return fallback();
    }
  }

  function safeWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      syncToIndexedDb(key, value);
      return true;
    } catch (error) {
      console.warn('Unable to save localStorage value for', key, error);
      return false;
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
      removeFromIndexedDb(key);
    } catch (error) {
      console.warn('Unable to remove localStorage value for', key, error);
    }
  }

  const asArray = value => Array.isArray(value);
  const asObject = value => value && typeof value === 'object' && !Array.isArray(value);

  window.ShopThatStorage = {
    readArray(key) {
      return safeRead(key, () => [], asArray);
    },
    readObject(key) {
      return safeRead(key, () => ({}), asObject);
    },
    write: safeWrite,
    remove: safeRemove
  };

  // Shared data management
  window.ShopThatData = {
    normalizeKeywordName(name) {
      return String(name || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    },

    // Keywords management
    getKeywords() {
      return window.ShopThatStorage.readArray(STORAGE_KEYS.keywords);
    },

    saveKeywords(keywords) {
      window.ShopThatStorage.write(STORAGE_KEYS.keywords, keywords);
      this.notifyChange('keywords', keywords);
    },

    addKeyword(keyword) {
      const keywords = this.getKeywords();
      const exists = keywords.find(k => k.name.toLowerCase() === keyword.name.toLowerCase());
      if (!exists) {
        keywords.push({
          id: keyword.name,
          name: keyword.name,
          value: keyword.value || 50,
          group: keyword.group || 1,
          uses: 0,
          cost: keyword.cost || 0,
          totalCost: keyword.cost || 0,
          lastUsed: null,
          created: new Date().toISOString()
        });
        this.saveKeywords(keywords);
        return true;
      }
      return false;
    },

    removeKeyword(keywordName) {
      const keywords = this.getKeywords();
      const connections = this.getConnections();
      
      // Remove keyword
      const updatedKeywords = keywords.filter(k => k.name !== keywordName);
      
      // Remove connections involving this keyword
      const updatedConnections = connections.filter(c => 
        c.source !== keywordName && c.target !== keywordName
      );
      
      this.saveKeywords(updatedKeywords);
      this.saveConnections(updatedConnections);
    },

    getDisabledKeywords() {
      return window.ShopThatStorage.readArray(STORAGE_KEYS.disabledKeywords)
        .map(k => String(k || '').trim())
        .filter(Boolean);
    },

    saveDisabledKeywords(keywords) {
      const seen = new Set();
      const normalized = (Array.isArray(keywords) ? keywords : [])
        .map(k => String(k || '').trim())
        .filter(Boolean)
        .filter(k => {
          const key = this.normalizeKeywordName(k);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      window.ShopThatStorage.write(STORAGE_KEYS.disabledKeywords, normalized);
      this.notifyChange('disabledKeywords', normalized);
      window.dispatchEvent(new CustomEvent('shopthat-disabled-keywords-changed', {
        detail: normalized
      }));
    },

    setKeywordDisabled(keywordName, disabled) {
      const list = this.getDisabledKeywords();
      const target = this.normalizeKeywordName(keywordName);
      if (!target) return;
      const next = list.filter(k => this.normalizeKeywordName(k) !== target);
      if (disabled) next.push(String(keywordName).trim());
      this.saveDisabledKeywords(next);
    },

    isKeywordDisabled(keywordName) {
      const target = this.normalizeKeywordName(keywordName);
      if (!target) return false;
      return this.getDisabledKeywords()
        .some(k => this.normalizeKeywordName(k) === target);
    },

    findDisabledKeywordInText(text) {
      const raw = String(text || '');
      const normalizedText = this.normalizeKeywordName(raw);
      if (!normalizedText) return '';
      const disabled = this.getDisabledKeywords();
      return disabled.find(keyword => {
        const normalizedKeyword = this.normalizeKeywordName(keyword);
        if (!normalizedKeyword || normalizedKeyword.length < 2) return false;
        const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const phraseRegex = new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)', 'i');
        return phraseRegex.test(normalizedText);
      }) || '';
    },

    isTextBlockedByDisabledKeyword(text) {
      return !!this.findDisabledKeywordInText(text);
    },

    // Connections management
    getConnections() {
      return window.ShopThatStorage.readArray(STORAGE_KEYS.connections);
    },

    saveConnections(connections) {
      window.ShopThatStorage.write(STORAGE_KEYS.connections, connections);
      this.notifyChange('connections', connections);
    },

    addConnection(source, target) {
      const connections = this.getConnections();
      const exists = connections.find(c => 
        (c.source === source && c.target === target) ||
        (c.source === target && c.target === source)
      );
      
      if (!exists) {
        connections.push({ source, target });
        this.saveConnections(connections);
        return true;
      }
      return false;
    },

    // Chat analytics management
    getChatAnalytics() {
      return window.ShopThatStorage.readObject(STORAGE_KEYS.chatAnalytics);
    },

    saveChatAnalytics(analytics) {
      window.ShopThatStorage.write(STORAGE_KEYS.chatAnalytics, analytics);
      this.notifyChange('chatAnalytics', analytics);
    },

    // Keyword usage tracking
    trackKeywordUsage(keywordName, context = 'chat') {
      const keywords = this.getKeywords();
      const usage = this.getKeywordUsage();
      const now = new Date().toISOString();
      
      // Update keyword usage count and cost
      const keyword = keywords.find(k => k.name === keywordName);
      if (keyword) {
        keyword.uses = (keyword.uses || 0) + 1;
        keyword.cost = (keyword.uses * 0.25).toFixed(2);
        keyword.lastUsed = now;
        this.saveKeywords(keywords);
      }
      
      // Track usage event
      if (!usage[keywordName]) {
        usage[keywordName] = [];
      }
      usage[keywordName].push({
        timestamp: now,
        context: context,
        cost: 0.25
      });
      
      window.ShopThatStorage.write(STORAGE_KEYS.keywordUsage, usage);
      this.updateChatAnalytics();
    },

    getKeywordUsage() {
      return window.ShopThatStorage.readObject(STORAGE_KEYS.keywordUsage);
    },

    // Chat session tracking
    startChatSession() {
      const sessions = this.getChatSessions();
      const sessionId = 'session_' + Date.now();
      sessions.push({
        id: sessionId,
        startTime: new Date().toISOString(),
        endTime: null,
        messages: [],
        keywordsUsed: [],
        totalCost: 0
      });
      this.saveChatSessions(sessions);
      return sessionId;
    },

    addChatMessage(sessionId, message, sender, keywordsUsed = []) {
      const sessions = this.getChatSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.messages.push({
          timestamp: new Date().toISOString(),
          message,
          sender,
          keywordsUsed
        });
        
        // Track keywords used in this message
        keywordsUsed.forEach(keyword => {
          if (!session.keywordsUsed.includes(keyword)) {
            session.keywordsUsed.push(keyword);
          }
          this.trackKeywordUsage(keyword, 'chat');
        });
        
        session.totalCost = session.keywordsUsed.length * 0.25;
        this.saveChatSessions(sessions);
      }
    },

    endChatSession(sessionId) {
      const sessions = this.getChatSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        session.endTime = new Date().toISOString();
        this.saveChatSessions(sessions);
      }
    },

    getChatSessions() {
      return window.ShopThatStorage.readArray(STORAGE_KEYS.sessions);
    },

    saveChatSessions(sessions) {
      window.ShopThatStorage.write(STORAGE_KEYS.sessions, sessions);
    },

    // Chat handoff: lets one page hand its in-progress conversation to the
    // next page so the receiving chat panel can mirror it instead of starting
    // from an empty transcript.
    setChatHandoff(handoff) {
      window.ShopThatStorage.write(STORAGE_KEYS.chatHandoff, {
        keyword: String(handoff && handoff.keyword || ''),
        messages: Array.isArray(handoff && handoff.messages) ? handoff.messages : [],
        createdAt: new Date().toISOString()
      });
    },

    getChatHandoff() {
      const stored = window.ShopThatStorage.readObject(STORAGE_KEYS.chatHandoff);
      if (!stored || !Array.isArray(stored.messages) || stored.messages.length === 0) return null;
      return stored;
    },

    clearChatHandoff() {
      window.ShopThatStorage.remove(STORAGE_KEYS.chatHandoff);
    },

    // Analytics calculations
    updateChatAnalytics() {
      const keywords = this.getKeywords();
      const usage = this.getKeywordUsage();
      const sessions = this.getChatSessions();
      
      const analytics = {
        totalKeywords: keywords.length,
        totalUses: keywords.reduce((sum, k) => sum + (k.uses || 0), 0),
        totalCost: keywords.reduce((sum, k) => sum + parseFloat(k.cost || 0), 0),
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => !s.endTime).length,
        avgSessionLength: this.calculateAvgSessionLength(sessions),
        topKeywords: keywords
          .sort((a, b) => (b.uses || 0) - (a.uses || 0))
          .slice(0, 5)
          .map(k => ({ name: k.name, uses: k.uses || 0, cost: k.cost || 0 })),
        lastUpdated: new Date().toISOString()
      };
      
      this.saveChatAnalytics(analytics);
      return analytics;
    },

    calculateAvgSessionLength(sessions) {
      const completedSessions = sessions.filter(s => s.endTime);
      if (completedSessions.length === 0) return 0;
      
      const totalDuration = completedSessions.reduce((sum, session) => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        return sum + (end - start);
      }, 0);
      
      return Math.round(totalDuration / completedSessions.length / 1000); // seconds
    },

    // Event system for cross-page communication
    listeners: {},

    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },

    off(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    },

    notifyChange(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => {
          try {
            callback(data);
          } catch (e) {
            console.error('Error in event listener:', e);
          }
        });
      }
    },

    // Utility functions
    extractKeywordsFromText(text) {
      const keywords = this.getKeywords();
      const foundKeywords = [];
      
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.name}\\b`, 'gi');
        if (regex.test(text)) {
          foundKeywords.push(keyword.name);
        }
      });
      
      return foundKeywords;
    },

    // Clear existing data and reinitialize
    clearData() {
      Object.values(STORAGE_KEYS).forEach(window.ShopThatStorage.remove);
    },

    // Initialize with default data if empty
    initialize() {
      const keywords = this.getKeywords();
      // Force reinitialize with new data - remove this condition to always reset
      if (keywords.length === 0 || !keywords.find(k => k.name === 'The Plaza')) {
        // Clear existing data first
        this.clearData();
        // Initialize with restaurant keyword data
        const defaultKeywords = [
          // ============================================
          // THE MODERN RESTAURANT KEYWORDS
          // ============================================
          // Group 1 - Top Level (Most Connected) - Core concepts
          { name: 'The Modern', value: 95, group: 1, cost: 25000 },
          { name: 'Two Michelin Stars', value: 90, group: 1, cost: 20000 },
          { name: 'MoMA Museum', value: 85, group: 1, cost: 15000 },
          
          // Group 2 - Connected to Top Level - Dining experiences & venues
          { name: 'The Modern (Dining Room)', value: 82, group: 2, cost: 12000 },
          { name: 'The Bar Room', value: 75, group: 2, cost: 8000 },
          { name: 'The Kitchen Table', value: 68, group: 2, cost: 5000 },
          { name: 'Sculpture Garden', value: 80, group: 2, cost: 12000 },
          { name: 'MoMA Sculpture Garden', value: 78, group: 2, cost: 10000 },
          { name: 'Eggs on Eggs on Eggs', value: 85, group: 2, cost: 15000 },
          { name: 'Grand Award Wine List', value: 80, group: 2, cost: 10000 },
          { name: 'Upscale & Sophisticated', value: 72, group: 2, cost: 6000 },
          
          // Group 3 - Secondary Connected - Menu items & descriptors
          { name: 'Truffles', value: 70, group: 3, cost: 4000 },
          { name: 'Cocktails', value: 60, group: 3, cost: 2500 },
          { name: 'Lunch', value: 55, group: 3, cost: 2000 },
          { name: 'Dinner', value: 60, group: 3, cost: 2500 },
          { name: 'Seasonal & Local', value: 65, group: 3, cost: 4000 },
          { name: 'Caviar Hot Dogs', value: 70, group: 3, cost: 5000 },
          
          // Group 4 - Isolated/Contextual - Business & booking details
          { name: 'Union Square Hospitality Group (USHG)', value: 60, group: 4, cost: 3000 },
          { name: 'Artful & Refined', value: 55, group: 4, cost: 2000 },
          { name: '28-Day Reservations', value: 50, group: 4, cost: 1500 },
          { name: 'Hospitality Included', value: 52, group: 4, cost: 1800 },

          // ============================================
          // LE BERNARDIN RESTAURANT KEYWORDS
          // ============================================
          // Group 1 - Top Level (Most Connected) - Core concepts
          { name: 'Le Bernardin', value: 95, group: 1, cost: 28000 },
          { name: 'Three Michelin Stars', value: 92, group: 1, cost: 25000 },
          { name: 'Eric Ripert', value: 88, group: 1, cost: 20000 },
          { name: 'Seafood', value: 85, group: 1, cost: 18000 },
          
          // Group 2 - Connected to Top Level - Dining experiences & style
          { name: 'Fine Dining', value: 82, group: 2, cost: 12000 },
          { name: 'French Cuisine', value: 80, group: 2, cost: 10000 },
          { name: 'Tasting Menu', value: 78, group: 2, cost: 9000 },
          { name: 'Prix Fixe', value: 75, group: 2, cost: 8000 },
          { name: 'Elegant', value: 70, group: 2, cost: 6000 },
          { name: 'Contemporary', value: 68, group: 2, cost: 5500 },
          { name: 'Upscale', value: 72, group: 2, cost: 7000 },
          { name: 'Professional Service', value: 75, group: 2, cost: 8000 },
          { name: 'Luxurious Decor', value: 70, group: 2, cost: 6000 },
          { name: 'Wine', value: 72, group: 2, cost: 7000 },
          { name: 'Sommelier', value: 68, group: 2, cost: 5500 },
          { name: 'Expert Service', value: 70, group: 2, cost: 6000 },
          
          // Group 3 - Secondary Connected - Menu sections & descriptors
          { name: 'Almost Raw', value: 65, group: 3, cost: 4000 },
          { name: 'Barely Touched', value: 65, group: 3, cost: 4000 },
          { name: 'Lightly Cooked', value: 65, group: 3, cost: 4000 },
          { name: 'Business Casual', value: 55, group: 3, cost: 2500 },
          { name: 'Reservations Required', value: 60, group: 3, cost: 3000 },
          { name: 'Special Occasions', value: 58, group: 3, cost: 2800 },
          { name: 'The Fish is the Star', value: 62, group: 3, cost: 3500 },
          
          // Group 4 - Signature Dishes (Isolated/Contextual)
          { name: 'Tuna with Foie Gras', value: 72, group: 4, cost: 7000 },
          { name: 'Slowly Baked Salmon with Caviar', value: 70, group: 4, cost: 6500 },
          { name: 'Pistachio Dessert', value: 60, group: 4, cost: 4000 },
          { name: 'Poached Lobster', value: 68, group: 4, cost: 5500 },
          { name: 'Dover Sole', value: 65, group: 4, cost: 5000 },
          { name: 'Scallop with Caviar', value: 66, group: 4, cost: 5200 },
          { name: 'Halibut', value: 62, group: 4, cost: 4500 },
          { name: 'Peruvian Dark Chocolate Tart', value: 58, group: 4, cost: 3800 },
          { name: 'Four-Star NY Times', value: 55, group: 4, cost: 3000 },
          { name: 'La Liste Top Restaurants', value: 52, group: 4, cost: 2500 },

          // ============================================
          // THE CARLYLE HOTEL KEYWORDS
          // ============================================
          // Group 1 - Top Level (Most Connected) - Core concepts
          { name: 'Cafe Carlyle', value: 95, group: 1, cost: 28000 },
          { name: 'The Carlyle', value: 92, group: 1, cost: 25000 },
          { name: 'Bemelmans Bar', value: 88, group: 1, cost: 20000 },
          { name: 'Art Deco', value: 85, group: 1, cost: 18000 },
          { name: 'Luxury Hotel', value: 82, group: 1, cost: 15000 },
          
          // Group 2 - Connected to Top Level - Venues & experiences
          { name: 'Classic Cabaret', value: 80, group: 2, cost: 12000 },
          { name: 'Dowling\'s at The Carlyle', value: 78, group: 2, cost: 10000 },
          { name: 'Ludwig Bemelmans', value: 75, group: 2, cost: 9000 },
          { name: 'Madeline Murals', value: 72, group: 2, cost: 8000 },
          { name: 'Live Entertainment', value: 75, group: 2, cost: 9000 },
          { name: 'Supper Club', value: 70, group: 2, cost: 7000 },
          { name: 'Rosewood Hotel', value: 72, group: 2, cost: 8000 },
          { name: 'Upper East Side', value: 78, group: 2, cost: 10000 },
          { name: 'Five-Star', value: 80, group: 2, cost: 11000 },
          { name: 'Iconic', value: 68, group: 2, cost: 6000 },
          { name: 'Celebrities', value: 72, group: 2, cost: 8000 },
          
          // Group 3 - Secondary Connected - Details & atmosphere
          { name: 'Dress Code', value: 60, group: 3, cost: 4000 },
          { name: 'Evenings', value: 55, group: 3, cost: 3000 },
          { name: 'Concerts', value: 65, group: 3, cost: 5000 },
          { name: '76th Street', value: 52, group: 3, cost: 2500 },
          { name: 'Madison Avenue', value: 68, group: 3, cost: 6000 },
          { name: 'Central Park', value: 75, group: 3, cost: 9000 },
          
          // Group 4 - Isolated/Contextual - Amenities & services
          { name: 'Valmont Spa', value: 58, group: 4, cost: 4000 },
          { name: 'Yves Durif Salon', value: 52, group: 4, cost: 3000 },
          { name: 'Fitness Center', value: 50, group: 4, cost: 2500 },
          { name: 'Pet-Friendly', value: 48, group: 4, cost: 2000 },
          { name: 'Concierge', value: 55, group: 4, cost: 3500 },
          { name: '24-Hour Service', value: 58, group: 4, cost: 4000 },
          { name: 'Central Park Views', value: 65, group: 4, cost: 5000 },
          { name: 'Valet Parking', value: 50, group: 4, cost: 2500 },

          // ============================================
          // JEAN-GEORGES AT THE MARK (Restaurant)
          // ============================================
          // Group 1 - Top Level
          { name: 'Jean-Georges Vongerichten', value: 92, group: 1, cost: 25000 },
          { name: 'Jean-Georges at The Mark', value: 90, group: 1, cost: 22000 },
          
          // Group 2 - Connected to Top Level
          { name: 'Fresh from the Market', value: 75, group: 2, cost: 9000 },
          { name: 'World Class', value: 72, group: 2, cost: 8000 },
          { name: 'Innovative Seasonings', value: 70, group: 2, cost: 7000 },
          { name: 'Hand Crafted Bar', value: 68, group: 2, cost: 6000 },
          { name: 'Comfortable Dining Room', value: 65, group: 2, cost: 5500 },
          { name: 'French-Inspired', value: 72, group: 2, cost: 8000 },
          { name: 'Global Bistro', value: 70, group: 2, cost: 7000 },
          
          // Group 3 - Secondary
          { name: 'People Watching', value: 55, group: 3, cost: 3000 },
          { name: 'Brunch', value: 60, group: 3, cost: 4000 },

          // ============================================
          // THE MARK HOTEL
          // ============================================
          // Group 1 - Top Level
          { name: 'The Mark Hotel', value: 90, group: 1, cost: 22000 },
          
          // Group 2 - Connected to Top Level
          { name: 'Polished', value: 68, group: 2, cost: 6000 },
          { name: 'Art Deco-Inspired', value: 70, group: 2, cost: 7000 },
          { name: 'Swanky Bar', value: 72, group: 2, cost: 8000 },
          { name: 'Metropolitan Museum of Art', value: 78, group: 2, cost: 10000 },
          
          // Group 3 - Secondary
          { name: 'Salon', value: 52, group: 3, cost: 2500 },

          // ============================================
          // THE PLAZA HOTEL
          // ============================================
          // Group 1 - Top Level
          { name: 'The Plaza', value: 95, group: 1, cost: 28000 },
          
          // Group 2 - Connected to Top Level
          { name: 'Landmark Building', value: 75, group: 2, cost: 9000 },
          { name: '19th-Century Architecture', value: 70, group: 2, cost: 7000 },
          { name: 'Afternoon Tea', value: 72, group: 2, cost: 8000 },
          { name: 'Spa', value: 68, group: 2, cost: 6000 },
          
          // Group 3 - Secondary
          { name: 'Gym', value: 50, group: 3, cost: 2500 },

          // ============================================
          // THE ST. REGIS HOTEL
          // ============================================
          // Group 1 - Top Level
          { name: 'The St. Regis', value: 92, group: 1, cost: 25000 },
          
          // Group 2 - Connected to Top Level
          { name: 'King Cole Bar', value: 78, group: 2, cost: 10000 },
          { name: 'Steam Room', value: 60, group: 2, cost: 4000 },

          // ============================================
          // THE BACCARAT HOTEL
          // ============================================
          // Group 1 - Top Level
          { name: 'The Baccarat', value: 90, group: 1, cost: 22000 },
          
          // Group 2 - Connected to Top Level
          { name: 'Elegant Bar', value: 72, group: 2, cost: 8000 },
          { name: 'Indoor Pool', value: 65, group: 2, cost: 5500 },
          { name: 'Empire State Building', value: 70, group: 2, cost: 7000 },

          // ============================================
          // SHARED KEYWORDS (All venues)
          // ============================================
          { name: 'Restaurant', value: 70, group: 2, cost: 5000 },
          { name: 'New York', value: 75, group: 3, cost: 8000 },
          { name: '57th Street', value: 55, group: 3, cost: 3500 },
          { name: '51st Street', value: 50, group: 3, cost: 1500 },
          { name: 'Midtown Manhattan', value: 58, group: 3, cost: 2500 },
          { name: 'Lobster', value: 65, group: 3, cost: 3000 },
          { name: 'Lunch', value: 55, group: 3, cost: 2000 },
          { name: 'Dinner', value: 60, group: 3, cost: 2500 },
          { name: 'Hotel', value: 70, group: 2, cost: 5000 },
          { name: 'Luxury', value: 75, group: 2, cost: 9000 }
        ];
        
        defaultKeywords.forEach(keyword => this.addKeyword(keyword));
        
        // ============================================
        // THE MODERN CONNECTIONS
        // ============================================
        this.addConnection('The Modern', 'Restaurant');
        this.addConnection('The Modern', 'MoMA Museum');
        this.addConnection('The Modern', 'Sculpture Garden');
        this.addConnection('The Modern', 'The Modern (Dining Room)');
        this.addConnection('The Modern', 'The Bar Room');
        this.addConnection('The Modern', 'The Kitchen Table');
        this.addConnection('The Modern', 'Two Michelin Stars');
        this.addConnection('The Modern', 'Union Square Hospitality Group (USHG)');
        this.addConnection('The Modern', 'Hospitality Included');
        this.addConnection('The Modern', 'Grand Award Wine List');
        this.addConnection('The Modern', 'Upscale & Sophisticated');
        this.addConnection('The Modern', 'New York');
        this.addConnection('MoMA Museum', 'MoMA Sculpture Garden');
        this.addConnection('MoMA Museum', 'Artful & Refined');
        this.addConnection('The Modern (Dining Room)', 'Two Michelin Stars');
        this.addConnection('The Modern (Dining Room)', 'Eggs on Eggs on Eggs');
        this.addConnection('The Modern (Dining Room)', 'Seasonal & Local');
        this.addConnection('The Bar Room', 'Cocktails');
        this.addConnection('The Bar Room', 'Caviar Hot Dogs');
        this.addConnection('The Kitchen Table', 'Seasonal & Local');
        this.addConnection('Upscale & Sophisticated', 'The Modern (Dining Room)');
        this.addConnection('Restaurant', 'Lunch');
        this.addConnection('Restaurant', 'Dinner');
        this.addConnection('Dinner', 'Lobster');
        this.addConnection('Dinner', 'Truffles');

        // ============================================
        // LE BERNARDIN CONNECTIONS
        // ============================================
        this.addConnection('Le Bernardin', 'Three Michelin Stars');
        this.addConnection('Le Bernardin', 'Eric Ripert');
        this.addConnection('Le Bernardin', 'Seafood');
        this.addConnection('Le Bernardin', 'Fine Dining');
        this.addConnection('Le Bernardin', 'French Cuisine');
        this.addConnection('Le Bernardin', 'Restaurant');
        this.addConnection('Le Bernardin', 'New York');
        this.addConnection('Le Bernardin', 'Midtown Manhattan');
        this.addConnection('Le Bernardin', '51st Street');
        this.addConnection('Le Bernardin', 'Tasting Menu');
        this.addConnection('Le Bernardin', 'Prix Fixe');
        this.addConnection('Le Bernardin', 'Elegant');
        this.addConnection('Le Bernardin', 'Contemporary');
        this.addConnection('Le Bernardin', 'Professional Service');
        this.addConnection('Le Bernardin', 'Expert Service');
        this.addConnection('Le Bernardin', 'Wine');
        this.addConnection('Le Bernardin', 'Sommelier');
        this.addConnection('Le Bernardin', 'Luxurious Decor');
        this.addConnection('Eric Ripert', 'Three Michelin Stars');
        this.addConnection('Eric Ripert', 'French Cuisine');
        this.addConnection('Seafood', 'Almost Raw');
        this.addConnection('Seafood', 'Barely Touched');
        this.addConnection('Seafood', 'Lightly Cooked');
        this.addConnection('Seafood', 'The Fish is the Star');
        this.addConnection('Seafood', 'Tuna with Foie Gras');
        this.addConnection('Seafood', 'Slowly Baked Salmon with Caviar');
        this.addConnection('Seafood', 'Poached Lobster');
        this.addConnection('Seafood', 'Dover Sole');
        this.addConnection('Seafood', 'Scallop with Caviar');
        this.addConnection('Seafood', 'Halibut');
        this.addConnection('Three Michelin Stars', 'Four-Star NY Times');
        this.addConnection('Three Michelin Stars', 'La Liste Top Restaurants');
        this.addConnection('Fine Dining', 'Upscale');
        this.addConnection('Fine Dining', 'Special Occasions');
        this.addConnection('Fine Dining', 'Reservations Required');
        this.addConnection('Fine Dining', 'Business Casual');
        this.addConnection('Tasting Menu', 'Almost Raw');
        this.addConnection('Tasting Menu', 'Barely Touched');
        this.addConnection('Tasting Menu', 'Lightly Cooked');
        this.addConnection('Pistachio Dessert', 'Le Bernardin');
        this.addConnection('Peruvian Dark Chocolate Tart', 'Le Bernardin');
        this.addConnection('Wine', 'Sommelier');
        this.addConnection('Lobster', 'Poached Lobster');
        
        // ============================================
        // THE CARLYLE CONNECTIONS
        // ============================================
        this.addConnection('Cafe Carlyle', 'The Carlyle');
        this.addConnection('Cafe Carlyle', 'Classic Cabaret');
        this.addConnection('Cafe Carlyle', 'Live Entertainment');
        this.addConnection('Cafe Carlyle', 'Supper Club');
        this.addConnection('Cafe Carlyle', 'Concerts');
        this.addConnection('Cafe Carlyle', 'Celebrities');
        this.addConnection('Cafe Carlyle', 'Evenings');
        this.addConnection('Cafe Carlyle', 'Cocktails');
        this.addConnection('Cafe Carlyle', 'Dress Code');
        this.addConnection('The Carlyle', 'Bemelmans Bar');
        this.addConnection('The Carlyle', 'Art Deco');
        this.addConnection('The Carlyle', 'Luxury Hotel');
        this.addConnection('The Carlyle', 'Rosewood Hotel');
        this.addConnection('The Carlyle', 'Five-Star');
        this.addConnection('The Carlyle', 'Upper East Side');
        this.addConnection('The Carlyle', '76th Street');
        this.addConnection('The Carlyle', 'Madison Avenue');
        this.addConnection('The Carlyle', 'New York');
        this.addConnection('The Carlyle', 'Iconic');
        this.addConnection('The Carlyle', 'Dowling\'s at The Carlyle');
        this.addConnection('The Carlyle', 'Valmont Spa');
        this.addConnection('The Carlyle', 'Yves Durif Salon');
        this.addConnection('The Carlyle', 'Fitness Center');
        this.addConnection('The Carlyle', 'Concierge');
        this.addConnection('The Carlyle', '24-Hour Service');
        this.addConnection('The Carlyle', 'Valet Parking');
        this.addConnection('The Carlyle', 'Pet-Friendly');
        this.addConnection('Bemelmans Bar', 'Art Deco');
        this.addConnection('Bemelmans Bar', 'Ludwig Bemelmans');
        this.addConnection('Bemelmans Bar', 'Madeline Murals');
        this.addConnection('Bemelmans Bar', 'Cocktails');
        this.addConnection('Bemelmans Bar', 'Live Entertainment');
        this.addConnection('Ludwig Bemelmans', 'Madeline Murals');
        this.addConnection('Luxury Hotel', 'Five-Star');
        this.addConnection('Luxury Hotel', 'Central Park Views');
        this.addConnection('Upper East Side', 'Central Park');
        this.addConnection('Upper East Side', 'Madison Avenue');
        this.addConnection('Upper East Side', '76th Street');
        this.addConnection('Dowling\'s at The Carlyle', 'Fine Dining');
        this.addConnection('Dowling\'s at The Carlyle', 'Restaurant');

        // ============================================
        // JEAN-GEORGES AT THE MARK CONNECTIONS
        // ============================================
        this.addConnection('Jean-Georges Vongerichten', 'Jean-Georges at The Mark');
        this.addConnection('Jean-Georges Vongerichten', 'World Class');
        this.addConnection('Jean-Georges Vongerichten', 'Innovative Seasonings');
        this.addConnection('Jean-Georges at The Mark', 'The Mark Hotel');
        this.addConnection('Jean-Georges at The Mark', 'Restaurant');
        this.addConnection('Jean-Georges at The Mark', 'Fresh from the Market');
        this.addConnection('Jean-Georges at The Mark', 'Hand Crafted Bar');
        this.addConnection('Jean-Georges at The Mark', 'Comfortable Dining Room');
        this.addConnection('Jean-Georges at The Mark', 'French-Inspired');
        this.addConnection('Jean-Georges at The Mark', 'Global Bistro');
        this.addConnection('Jean-Georges at The Mark', 'People Watching');
        this.addConnection('Jean-Georges at The Mark', 'Brunch');
        this.addConnection('Jean-Georges at The Mark', 'Lunch');
        this.addConnection('Jean-Georges at The Mark', 'Dinner');
        this.addConnection('Jean-Georges at The Mark', 'Iconic');
        this.addConnection('Jean-Georges at The Mark', 'Upper East Side');
        this.addConnection('Jean-Georges at The Mark', 'New York');

        // ============================================
        // THE MARK HOTEL CONNECTIONS
        // ============================================
        this.addConnection('The Mark Hotel', 'Hotel');
        this.addConnection('The Mark Hotel', 'Luxury');
        this.addConnection('The Mark Hotel', 'Upper East Side');
        this.addConnection('The Mark Hotel', 'Central Park');
        this.addConnection('The Mark Hotel', 'Metropolitan Museum of Art');
        this.addConnection('The Mark Hotel', 'Polished');
        this.addConnection('The Mark Hotel', 'Art Deco-Inspired');
        this.addConnection('The Mark Hotel', 'Swanky Bar');
        this.addConnection('The Mark Hotel', 'Fitness Center');
        this.addConnection('The Mark Hotel', 'Salon');
        this.addConnection('The Mark Hotel', 'New York');
        this.addConnection('The Mark Hotel', '57th Street');

        // ============================================
        // THE PLAZA HOTEL CONNECTIONS
        // ============================================
        this.addConnection('The Plaza', 'Hotel');
        this.addConnection('The Plaza', 'Luxury');
        this.addConnection('The Plaza', 'Landmark Building');
        this.addConnection('The Plaza', '19th-Century Architecture');
        this.addConnection('The Plaza', 'Central Park');
        this.addConnection('The Plaza', 'Afternoon Tea');
        this.addConnection('The Plaza', 'Spa');
        this.addConnection('The Plaza', 'Gym');
        this.addConnection('The Plaza', 'Iconic');
        this.addConnection('The Plaza', 'New York');
        this.addConnection('The Plaza', '57th Street');

        // ============================================
        // THE ST. REGIS HOTEL CONNECTIONS
        // ============================================
        this.addConnection('The St. Regis', 'Hotel');
        this.addConnection('The St. Regis', 'Luxury');
        this.addConnection('The St. Regis', 'Midtown Manhattan');
        this.addConnection('The St. Regis', 'MoMA Museum');
        this.addConnection('The St. Regis', 'Central Park');
        this.addConnection('The St. Regis', 'Gym');
        this.addConnection('The St. Regis', 'Steam Room');
        this.addConnection('The St. Regis', 'King Cole Bar');
        this.addConnection('The St. Regis', 'Iconic');
        this.addConnection('The St. Regis', 'New York');
        this.addConnection('The St. Regis', '57th Street');

        // ============================================
        // THE BACCARAT HOTEL CONNECTIONS
        // ============================================
        this.addConnection('The Baccarat', 'Hotel');
        this.addConnection('The Baccarat', 'Luxury');
        this.addConnection('The Baccarat', 'MoMA Museum');
        this.addConnection('The Baccarat', 'Central Park');
        this.addConnection('The Baccarat', 'Empire State Building');
        this.addConnection('The Baccarat', 'French Cuisine');
        this.addConnection('The Baccarat', 'Elegant Bar');
        this.addConnection('The Baccarat', 'Afternoon Tea');
        this.addConnection('The Baccarat', 'Spa');
        this.addConnection('The Baccarat', 'Gym');
        this.addConnection('The Baccarat', 'Indoor Pool');
        this.addConnection('The Baccarat', 'New York');
        this.addConnection('The Baccarat', '57th Street');

        // ============================================
        // ADDITIONAL CARLYLE CONNECTIONS
        // ============================================
        this.addConnection('The Carlyle', 'Hotel');
        this.addConnection('The Carlyle', 'Classic Cabaret');
        this.addConnection('The Carlyle', '57th Street');

        // ============================================
        // SHARED LOCATION CONNECTIONS
        // ============================================
        this.addConnection('New York', 'Midtown Manhattan');
        this.addConnection('New York', '51st Street');
        this.addConnection('New York', 'Upper East Side');
        this.addConnection('New York', '57th Street');
        this.addConnection('Midtown Manhattan', '51st Street');
        this.addConnection('Midtown Manhattan', '57th Street');
        this.addConnection('Hotel', 'Luxury');
        this.addConnection('Hotel', 'Concierge');
        this.addConnection('Luxury', 'Five-Star');
      }
      
      this.updateChatAnalytics();
    }
  };

  function initializeAfterStorageSync() {
    bootstrapStorageSync().finally(() => window.ShopThatData.initialize());
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAfterStorageSync);
  } else {
    initializeAfterStorageSync();
  }
})();

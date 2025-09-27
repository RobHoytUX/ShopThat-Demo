/* Shared Data Management System for Keywords Integration */
(function() {
  // Storage keys
  const STORAGE_KEYS = {
    keywords: 'st_keywords_v1',
    connections: 'st_connections_v1',
    chatAnalytics: 'st_chat_analytics_v1',
    keywordUsage: 'st_keyword_usage_v1',
    sessions: 'st_chat_sessions_v1'
  };

  // Shared data management
  window.ShopThatData = {
    // Keywords management
    getKeywords() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.keywords) || '[]');
      } catch {
        return [];
      }
    },

    saveKeywords(keywords) {
      localStorage.setItem(STORAGE_KEYS.keywords, JSON.stringify(keywords));
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

    // Connections management
    getConnections() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.connections) || '[]');
      } catch {
        return [];
      }
    },

    saveConnections(connections) {
      localStorage.setItem(STORAGE_KEYS.connections, JSON.stringify(connections));
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
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.chatAnalytics) || '{}');
      } catch {
        return {};
      }
    },

    saveChatAnalytics(analytics) {
      localStorage.setItem(STORAGE_KEYS.chatAnalytics, JSON.stringify(analytics));
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
      
      localStorage.setItem(STORAGE_KEYS.keywordUsage, JSON.stringify(usage));
      this.updateChatAnalytics();
    },

    getKeywordUsage() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.keywordUsage) || '{}');
      } catch {
        return {};
      }
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
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) || '[]');
      } catch {
        return [];
      }
    },

    saveChatSessions(sessions) {
      localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
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
      localStorage.removeItem(STORAGE_KEYS.keywords);
      localStorage.removeItem(STORAGE_KEYS.connections);
      localStorage.removeItem(STORAGE_KEYS.chatAnalytics);
      localStorage.removeItem(STORAGE_KEYS.keywordUsage);
      localStorage.removeItem(STORAGE_KEYS.sessions);
    },

    // Initialize with default data if empty
    initialize() {
      const keywords = this.getKeywords();
      // Force reinitialize with correct node levels - updated Jan 2025
      if (keywords.length === 0 || !keywords.find(k => k.name === 'Pharrell') || 
          (keywords.find(k => k.name === 'Pharrell') && keywords.find(k => k.name === 'Pharrell').group === 1)) {
        // Clear existing data first
        this.clearData();
        // Initialize with new keyword data
        const defaultKeywords = [
          { name: 'Yayoi Kusama', value: 90, group: 1, cost: 20000 },
          { name: 'Louis Vuitton', value: 80, group: 1, cost: 2000 },
          { name: 'Pharrell', value: 75, group: 2, cost: 5000 },
          { name: 'Infinity Mirrors', value: 85, group: 2, cost: 15000 },
          { name: 'Painted Dots', value: 65, group: 2, cost: 3000 },
          { name: 'Pumpkins', value: 60, group: 2, cost: 2000 },
          { name: 'Gisele Bundchen', value: 70, group: 2, cost: 2000 },
          { name: 'MoMa', value: 45, group: 3, cost: 370 },
          { name: 'FeiFei Sun', value: 35, group: 3, cost: 150 },
          { name: 'Central Park', value: 40, group: 3, cost: 150 }
        ];
        
        defaultKeywords.forEach(keyword => this.addKeyword(keyword));
        
        // Add some default connections
        this.addConnection('Yayoi Kusama', 'Louis Vuitton');
        this.addConnection('Yayoi Kusama', 'Infinity Mirrors');
        this.addConnection('Yayoi Kusama', 'Painted Dots');
        this.addConnection('Yayoi Kusama', 'Pumpkins');
        this.addConnection('Louis Vuitton', 'Gisele Bundchen');
        this.addConnection('Pharrell', 'Louis Vuitton');
      }
      
      this.updateChatAnalytics();
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ShopThatData.initialize());
  } else {
    window.ShopThatData.initialize();
  }
})();

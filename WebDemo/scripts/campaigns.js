      // Comprehensive keyword database by category
      const extractedKeywords = {
        people: [
          { text: 'Yayoi Kusama', confidence: 95, frequency: 47, relevance: 'high' },
          { text: 'Bernard Arnault', confidence: 88, frequency: 12, relevance: 'high' },
          { text: 'Nicolas Ghesquière', confidence: 82, frequency: 8, relevance: 'medium' },
          { text: 'Frank Gehry', confidence: 76, frequency: 5, relevance: 'medium' }
        ],
        places: [
          { text: 'Fondation Louis Vuitton', confidence: 92, frequency: 23, relevance: 'high' },
          { text: 'Paris', confidence: 89, frequency: 31, relevance: 'high' },
          { text: 'Tokyo', confidence: 78, frequency: 15, relevance: 'medium' },
          { text: 'New York', confidence: 72, frequency: 9, relevance: 'medium' }
        ],
        products: [
          { text: 'Capucines Bag', confidence: 94, frequency: 28, relevance: 'high' },
          { text: 'Pochette Accessoires', confidence: 91, frequency: 22, relevance: 'high' },
          { text: 'Christopher Backpack', confidence: 85, frequency: 18, relevance: 'high' },
          { text: 'Archlight Sneaker', confidence: 79, frequency: 14, relevance: 'medium' },
          { text: 'Infinity Dots Collection', confidence: 87, frequency: 25, relevance: 'high' }
        ],
        organizations: [
          { text: 'Louis Vuitton', confidence: 96, frequency: 52, relevance: 'high' },
          { text: 'LVMH', confidence: 84, frequency: 16, relevance: 'high' },
          { text: 'Gagosian Gallery', confidence: 73, frequency: 7, relevance: 'medium' },
          { text: 'David Zwirner Gallery', confidence: 69, frequency: 4, relevance: 'low' }
        ],
        events: [
          { text: 'Collaboration Launch', confidence: 90, frequency: 19, relevance: 'high' },
          { text: 'Fashion Week Paris', confidence: 86, frequency: 11, relevance: 'high' },
          { text: 'Art Basel', confidence: 74, frequency: 6, relevance: 'medium' },
          { text: 'Venice Biennale', confidence: 68, frequency: 3, relevance: 'low' }
        ],
        topics: [
          { text: 'Contemporary Art', confidence: 88, frequency: 34, relevance: 'high' },
          { text: 'Luxury Fashion', confidence: 93, frequency: 41, relevance: 'high' },
          { text: 'Artistic Collaboration', confidence: 85, frequency: 26, relevance: 'high' },
          { text: 'Pop Art', confidence: 79, frequency: 17, relevance: 'medium' },
          { text: 'Minimalism', confidence: 71, frequency: 8, relevance: 'medium' },
          { text: 'Avant-garde', confidence: 67, frequency: 5, relevance: 'low' }
        ]
      };

      // DOM elements
      const uploadArea = document.getElementById('uploadArea');
      const fileInput = document.getElementById('fileInput');
      const progressContainer = document.getElementById('progressContainer');
      const progressLine = document.getElementById('progressLine');
      const progressStatus = document.getElementById('progressStatus');
      const keywordSelection = document.getElementById('keywordSelection');
      const keywordGrid = document.getElementById('keywordGrid');
      const campaignActions = document.getElementById('campaignActions');

      // File upload handling
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', handleDragOver);
      uploadArea.addEventListener('dragleave', handleDragLeave);
      uploadArea.addEventListener('drop', handleDrop);
      fileInput.addEventListener('change', handleFileSelect);

      function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      }

      function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
      }

      function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          processFile(files[0]);
        }
      }

      function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
          processFile(file);
        }
      }

      function processFile(file) {
        // Validate file
        if (!validateFile(file)) return;

        // Start processing
        uploadArea.classList.add('uploading');
        progressContainer.classList.add('active');
        
        // Phase 1: Document Upload & Processing
        setActiveStep(1);
        progressStatus.innerHTML = '<p>📄 Uploading and parsing document content...</p>';
        
        setTimeout(() => {
          setCompletedStep(1);
          setActiveStep(2);
          progressStatus.innerHTML = '<p>🤖 AI analyzing document for semantic meaning and extracting entities...</p>';
          
          setTimeout(() => {
            setCompletedStep(2);
            setActiveStep(3);
            progressStatus.innerHTML = '<p>🏷️ Categorizing keywords by type and relevance...</p>';
            showKeywordSelection();
            
            setTimeout(() => {
              setCompletedStep(3);
              // Phase 3 continues with user interaction
            }, 1000);
          }, 2500);
        }, 2000);
      }

      function validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
          'application/vnd.ms-excel', 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
          'text/plain',
          'text/html'
        ];
        
        if (file.size > maxSize) {
          alert('File size must be less than 50MB');
          return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
          alert('Please upload a valid document file (PDF, DOC, DOCX, XLS, XLSX, TXT, HTML)');
          return false;
        }
        
        return true;
      }

      function setActiveStep(stepNumber) {
        document.getElementById(`step${stepNumber}`).classList.add('active');
        updateProgressLine(stepNumber);
      }

      function setCompletedStep(stepNumber) {
        const step = document.getElementById(`step${stepNumber}`);
        step.classList.remove('active');
        step.classList.add('completed');
        step.querySelector('.progress-step-circle').innerHTML = '✓';
      }

      function updateProgressLine(stepNumber) {
        const progressPercentage = ((stepNumber - 1) / 5) * 100;
        progressLine.style.width = `${progressPercentage}%`;
      }

      function showKeywordSelection() {
        keywordSelection.classList.add('active');
        campaignActions.classList.add('active');
        populateKeywordCategories();
        initializeKeywordControls();
      }

      function populateKeywordCategories() {
        const categoriesContainer = document.getElementById('keywordCategories');
        categoriesContainer.innerHTML = '';

        Object.keys(extractedKeywords).forEach(categoryKey => {
          const keywords = extractedKeywords[categoryKey];
          const categoryDiv = document.createElement('div');
          categoryDiv.className = 'keyword-category';
          
          categoryDiv.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${categoryKey}')">
              <div class="category-title">
                <div class="category-badge ${categoryKey}"></div>
                ${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
              </div>
              <div class="category-count">${keywords.length}</div>
            </div>
            <div class="category-content expanded" id="category-${categoryKey}">
              <div class="keyword-grid">
                ${keywords.map((keyword, index) => `
                  <div class="keyword-item ${keyword.relevance === 'high' ? 'selected' : ''}" data-category="${categoryKey}" data-relevance="${keyword.relevance}">
                    <input type="checkbox" class="keyword-checkbox" id="${categoryKey}-${index}" ${keyword.relevance === 'high' ? 'checked' : ''}>
                    <div class="keyword-content">
                      <div class="keyword-text">${keyword.text}</div>
                      <div class="keyword-meta">
                        <span class="keyword-frequency">Used ${keyword.frequency}x</span>
                        <span class="keyword-relevance ${keyword.relevance}">${keyword.relevance} priority</span>
                      </div>
                    </div>
                    <span class="keyword-confidence">${keyword.confidence}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
          
          categoriesContainer.appendChild(categoryDiv);
        });

        // Add click handlers for keyword items
        document.querySelectorAll('.keyword-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
              const checkbox = item.querySelector('input');
              checkbox.checked = !checkbox.checked;
            }
            item.classList.toggle('selected', item.querySelector('input').checked);
          });
        });
      }

      function toggleCategory(categoryKey) {
        const content = document.getElementById(`category-${categoryKey}`);
        content.classList.toggle('expanded');
      }

      // Action buttons
      document.getElementById('createCampaignBtn').addEventListener('click', createCampaign);
      document.getElementById('startOverBtn').addEventListener('click', startOver);
      document.getElementById('cancelBtn').addEventListener('click', cancel);

      function initializeKeywordControls() {
        // Search functionality
        document.getElementById('keywordSearch').addEventListener('input', filterKeywords);
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterKeywords();
          });
        });

        // Bulk actions
        document.getElementById('selectHighPriority').addEventListener('click', () => {
          document.querySelectorAll('[data-relevance="high"] input').forEach(cb => {
            cb.checked = true;
            cb.closest('.keyword-item').classList.add('selected');
          });
        });

        document.getElementById('selectAll').addEventListener('click', () => {
          document.querySelectorAll('.keyword-checkbox').forEach(cb => {
            cb.checked = true;
            cb.closest('.keyword-item').classList.add('selected');
          });
        });

        document.getElementById('clearAll').addEventListener('click', () => {
          document.querySelectorAll('.keyword-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('.keyword-item').classList.remove('selected');
          });
        });

        // Custom keyword addition
        document.getElementById('addCustomKeyword').addEventListener('click', addCustomKeyword);
      }

      function filterKeywords() {
        const searchTerm = document.getElementById('keywordSearch').value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        
        document.querySelectorAll('.keyword-item').forEach(item => {
          const text = item.querySelector('.keyword-text').textContent.toLowerCase();
          const category = item.dataset.category;
          
          const matchesSearch = text.includes(searchTerm);
          const matchesFilter = activeFilter === 'all' || category === activeFilter;
          
          item.style.display = matchesSearch && matchesFilter ? 'flex' : 'none';
        });
      }

      function addCustomKeyword() {
        const input = document.getElementById('customKeyword');
        const keyword = input.value.trim();
        
        if (!keyword) return;
        
        // Add to topics category
        const topicsGrid = document.querySelector('#category-topics .keyword-grid');
        const keywordItem = document.createElement('div');
        keywordItem.className = 'keyword-item';
        keywordItem.dataset.category = 'topics';
        keywordItem.dataset.relevance = 'medium';
        
        const keywordId = `custom-${Date.now()}`;
        keywordItem.innerHTML = `
          <input type="checkbox" class="keyword-checkbox" id="${keywordId}" checked>
          <div class="keyword-content">
            <div class="keyword-text">${keyword}</div>
            <div class="keyword-meta">
              <span class="keyword-frequency">Custom</span>
              <span class="keyword-relevance medium">manual</span>
            </div>
          </div>
          <span class="keyword-confidence">N/A</span>
        `;
        
        keywordItem.classList.add('selected');
        keywordItem.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            const checkbox = keywordItem.querySelector('input');
            checkbox.checked = !checkbox.checked;
          }
          keywordItem.classList.toggle('selected', keywordItem.querySelector('input').checked);
        });
        
        topicsGrid.appendChild(keywordItem);
        input.value = '';
      }

      function createCampaign() {
        const selectedKeywords = Array.from(document.querySelectorAll('.keyword-checkbox:checked'))
          .map(checkbox => {
            return {
              text: checkbox.closest('.keyword-item').querySelector('.keyword-text').textContent,
              category: checkbox.closest('.keyword-item').dataset.category
            };
          });

        if (selectedKeywords.length === 0) {
          alert('Please select at least one keyword for your campaign.');
          return;
        }

        // Continue to Phase 4
        setActiveStep(4);
        progressStatus.innerHTML = '<p>🚀 Generating campaign interface and setting up automation...</p>';
        
        setTimeout(() => {
          setCompletedStep(4);
          setActiveStep(5);
          progressStatus.innerHTML = '<p>🔍 Scanning database and associating relevant articles...</p>';
          
          setTimeout(() => {
            setCompletedStep(5);
            setActiveStep(6);
            progressStatus.innerHTML = '<p>📊 Creating campaign dashboard and analytics...</p>';
            
            setTimeout(() => {
              setCompletedStep(6);
              progressStatus.innerHTML = '<p>✅ Campaign created successfully!</p>';
              
              // Show success message
              alert(`🎉 Campaign created successfully with ${selectedKeywords.length} keywords!\n\n📋 Selected keywords:\n${selectedKeywords.map(k => `• ${k.text} (${k.category})`).join('\n')}\n\n🚀 Your campaign is now live and scanning for relevant content!`);
              
              // Reset the form
              setTimeout(startOver, 2000);
            }, 1500);
          }, 2000);
        }, 1500);
      }

      function startOver() {
        uploadArea.classList.remove('uploading');
        progressContainer.classList.remove('active');
        keywordSelection.classList.remove('active');
        campaignActions.classList.remove('active');
        
        // Reset progress steps
        document.querySelectorAll('.progress-step').forEach(step => {
          step.classList.remove('active', 'completed');
          step.querySelector('.progress-step-circle').innerHTML = step.querySelector('.progress-step-circle').innerHTML.replace('✓', step.id.slice(-1));
        });
        
        progressLine.style.width = '0%';
        fileInput.value = '';
      }

      function cancel() {
        if (confirm('Are you sure you want to cancel? All progress will be lost.')) {
          startOver();
        }
      }

      // Dark mode functionality
      function initDarkMode() {
        const darkModeToggle = document.getElementById('darkModeToggle');
        const body = document.body;
        
        // Check for saved dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
          body.classList.add('dark-mode');
        }
        
        // Toggle dark mode
        if (darkModeToggle) {
          darkModeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isNowDark = body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isNowDark);
          });
        }
      }

      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
      } else {
        initDarkMode();
      }

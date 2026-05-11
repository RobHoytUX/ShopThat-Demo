      // Campaign data
      const campaignData = {
        kusama: {
          spend: '$20,000',
          conversions: '1000',
          engagementRate: '$1.25',
          improvement: '1.5%',
          chatbotClicks: '200,000',
          clickPercentage: '20%',
          avgCost: '$0.02',
          publishers: {
            topArticles: 'Vogue, WWD, InStyle',
            highestCost: '$ 2',
            highestKeyword: '$ 0.50',
            internalConversion: '2%',
            externalConversion: '3%',
            topConversions: 'Vogue, WWD, InStyle'
          }
        },
        murakami: {
          spend: '$15,000',
          conversions: '850',
          engagementRate: '$1.76',
          improvement: '2.1%',
          chatbotClicks: '175,000',
          clickPercentage: '18%',
          avgCost: '$0.03',
          publishers: {
            topArticles: 'Elle, Harper\'s Bazaar, Vogue',
            highestCost: '$ 1.8',
            highestKeyword: '$ 0.45',
            internalConversion: '1.8%',
            externalConversion: '2.7%',
            topConversions: 'Elle, Harper\'s Bazaar'
          }
        },
        'core-values': {
          spend: '$12,500',
          conversions: '720',
          engagementRate: '$1.74',
          improvement: '1.8%',
          chatbotClicks: '150,000',
          clickPercentage: '15%',
          avgCost: '$0.025',
          publishers: {
            topArticles: 'Forbes, Business Week, WSJ',
            highestCost: '$ 1.5',
            highestKeyword: '$ 0.40',
            internalConversion: '1.5%',
            externalConversion: '2.2%',
            topConversions: 'Forbes, Business Week'
          }
        }
      };

      // Campaign switching functionality
      function initCampaignSwitcher() {
        const dropdownWrapper = document.querySelector('.campaign-dropdown-wrapper');
        const dropdown = document.getElementById('campaignDropdown');
        const campaignText = document.getElementById('campaignText');
        const campaignOptions = document.querySelectorAll('.campaign-option');
        
        let isOpen = false;
        let selectedCampaign = 'kusama';
        
        // Update selected option styling
        function updateSelectedOption() {
          campaignOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === selectedCampaign) {
              option.classList.add('selected');
            }
          });
        }
        
        // Toggle dropdown
        function toggleDropdown() {
          isOpen = !isOpen;
          dropdownWrapper.classList.toggle('open', isOpen);
          dropdown.classList.toggle('open', isOpen);
        }
        
        // Close dropdown
        function closeDropdown() {
          if (isOpen) {
            isOpen = false;
            dropdownWrapper.classList.remove('open');
            dropdown.classList.remove('open');
          }
        }
        
        // Handle campaign selection
        function selectCampaign(value, text) {
          selectedCampaign = value;
          campaignText.textContent = text;
          updateSelectedOption();
          updateDashboardData(value);
          closeDropdown();
        }
        
        // Event listeners
        if (dropdownWrapper) {
          dropdownWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
          });
        }
        
        campaignOptions.forEach(option => {
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            selectCampaign(option.dataset.value, option.textContent);
          });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
          closeDropdown();
        });
        
        // Initialize
        updateSelectedOption();
      }

      function updateDashboardData(campaign) {
        const data = campaignData[campaign];
        if (!data) return;

        // Update spend circle
        const spendAmount = document.querySelector('.spend-amount');
        if (spendAmount) spendAmount.textContent = data.spend;

        // Update performance & engagement metrics in the new card structure
        const performanceMetrics = document.querySelectorAll('.performance-metrics-grid .metric-item');
        if (performanceMetrics.length >= 5) {
          // Publisher Led Conversions
          performanceMetrics[0].querySelector('.metric-value').textContent = data.conversions;
          
          // Engagement Rate
          performanceMetrics[1].querySelector('.metric-value').textContent = data.engagementRate;
          performanceMetrics[1].querySelector('.metric-unit').textContent = data.improvement + ' improvement';
          
          // Keyword Click in Chatbot
          performanceMetrics[2].querySelector('.metric-value').textContent = data.chatbotClicks;
          
          // Click Percentage
          performanceMetrics[3].querySelector('.metric-value').textContent = data.clickPercentage;
          
          // Average Cost - this is now in the metric-value element
          const avgCostElement = document.querySelector('.performance-metrics-grid .rpv-section-1:last-child .metric-value');
          if (avgCostElement) {
            avgCostElement.textContent = data.avgCost;
          }
        }

        // Update publishers data in the new card structure
        const publisherCards = document.querySelectorAll('.publishers-metrics .keyword-performance-item');
        if (publisherCards.length >= 6) {
          // Top Articles
          publisherCards[0].querySelector('.keyword-metric-value').textContent = data.publishers.topArticles;
          
          // Highest Cost Articles
          publisherCards[1].querySelector('.keyword-metric-value').textContent = data.publishers.highestCost;
          
          // Highest Cost Keyword
          publisherCards[2].querySelector('.keyword-metric-value').textContent = data.publishers.highestKeyword;
          
          // Internal Conversion
          publisherCards[3].querySelector('.keyword-metric-value').textContent = data.publishers.internalConversion;
          
          // External Conversion
          publisherCards[4].querySelector('.keyword-metric-value').textContent = data.publishers.externalConversion;
          
          // Top Conversions
          publisherCards[5].querySelector('.keyword-metric-value').textContent = data.publishers.topConversions;
        }

        // Update charts if needed (placeholder for future enhancement)
        updateCharts(campaign);
      }

      function updateCharts(campaign) {
        // Placeholder for updating chart data based on selected campaign
        // This could be enhanced to show different data sets for each campaign
        console.log('Updating charts for campaign:', campaign);
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

      // Initialize charts
      function initCharts() {
        // Keywords Performance Chart
        const keywordsCtx = document.getElementById('keywordsChart');
        if (keywordsCtx) {
          new Chart(keywordsCtx, {
            type: 'line',
            data: {
              labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
              datasets: [
                {
                  label: 'Art',
                  data: [20, 35, 45, 55, 40, 50, 35],
                  borderColor: '#ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'Museum',
                  data: [30, 25, 35, 30, 45, 35, 40],
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'Polka Dots',
                  data: [15, 30, 25, 40, 20, 45, 50],
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'Infinity Mirror',
                  data: [25, 20, 30, 35, 25, 30, 25],
                  borderColor: '#8b5cf6',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  tension: 0.4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: '#f3f4f6'
                  }
                },
                x: {
                  grid: {
                    color: '#f3f4f6'
                  }
                }
              }
            }
          });
        }

        // Conversion Chart
        const conversionCtx = document.getElementById('conversionChart');
        if (conversionCtx) {
          new Chart(conversionCtx, {
            type: 'line',
            data: {
              labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
              datasets: [
                {
                  label: 'Revenue',
                  data: [20, 40, 60, 80, 55, 70, 65],
                  borderColor: '#06b6d4',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  tension: 0.4
                },
                {
                  label: 'Keyword Spend',
                  data: [30, 35, 25, 45, 20, 60, 70],
                  borderColor: '#8b5cf6',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  tension: 0.4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: '#f3f4f6'
                  }
                },
                x: {
                  grid: {
                    color: '#f3f4f6'
                  }
                }
              }
            }
          });
        }
      }
      
      // =====================================================
      // REWARDS CALCULATOR (TectoniQ-style)
      // =====================================================

      var SCENARIOS = {
        bearish: {
          totalSales: 200000000, rewardAmount: 1, launchPrice: 1.00, priceAt1Year: 0.50,
          fairPrice: 1.00, headwinds: 5, salesGrowth: 0, totalHeadwinds: 53000
        },
        steady: {
          totalSales: 200000000, rewardAmount: 1, launchPrice: 1.00, priceAt1Year: 1.00,
          fairPrice: 1.00, headwinds: 0, salesGrowth: 5, totalHeadwinds: 53000
        },
        growth: {
          totalSales: 200000000, rewardAmount: 1.5, launchPrice: 1.00, priceAt1Year: 1.50,
          fairPrice: 1.00, headwinds: 0, salesGrowth: 15, totalHeadwinds: 53000
        },
        'high-growth': {
          totalSales: 200000000, rewardAmount: 2, launchPrice: 1.00, priceAt1Year: 2.50,
          fairPrice: 1.00, headwinds: 0, salesGrowth: 30, totalHeadwinds: 53000
        }
      };

      var INFO_CONTENT = {
        totalSales: {
          title: 'Total Sales Per Month',
          description: 'The total monthly sales volume across all retailers using the TectoniQ platform. This represents the gross merchandise value (GMV) before any commissions or costs. For example, $200 million means retailers collectively sell $200M worth of products each month.'
        },
        rewardAmount: {
          title: 'Reward Amount (%)',
          description: 'The percentage of each sale that is returned to retailers as crypto rewards. For example, 1% means for every $1,200 sale, the retailer receives $12 worth of cryptocurrency tokens. This is the core incentive mechanism of the TectoniQ ecosystem.'
        },
        launchPrice: {
          title: 'Token Launch Price',
          description: 'The initial price of the TectoniQ token when it first launches. This serves as the baseline for calculating token appreciation and the initial value of rewards earned. Typically set at $1.00 for simplicity in ICO scenarios.'
        },
        priceAt1Year: {
          title: 'Token Price at 1 Year',
          description: 'The projected or actual price of the token after one year. This helps calculate potential appreciation and the future value of accumulated rewards. For example, if tokens launch at $1 but reach $1.50 after a year, early reward recipients see 50% appreciation.'
        },
        fairPrice: {
          title: 'Fair Issuance Price',
          description: 'The determined fair market value for token issuance, used for valuation and distribution calculations. This may differ from launch price based on market analysis, comparable projects, or algorithmic pricing models.'
        },
        headwinds: {
          title: 'Trade Headwinds / Revenue Drag',
          description: 'The percentage of revenue lost due to market friction, conversion costs, or trading inefficiencies. This includes crypto-to-fiat conversion fees (2.5%), slippage, liquidity issues, and other transaction costs that reduce net returns.'
        },
        salesGrowth: {
          title: 'Sales Growth (%)',
          description: 'The expected month-over-month growth rate in total sales. For example, 5% growth means if this month has $200M in sales, next month is projected at $210M. This compounds over time, reflecting platform adoption and retailer expansion.'
        },
        totalHeadwinds: {
          title: 'Total Headwinds',
          description: 'Fixed costs and headwinds in dollar terms that impact overall profitability. This includes operational costs, platform fees, infrastructure expenses, and other non-percentage-based costs that reduce net revenue regardless of volume.'
        }
      };

      function formatCurrency(value) {
        if (!isFinite(value)) return '$0';
        var abs = Math.abs(value);
        if (abs >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
        if (abs >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
        if (abs >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
        return '$' + value.toFixed(2);
      }

      function readCalcState() {
        return {
          totalSales:     parseFloat(document.getElementById('totalSales').value) || 0,
          rewardAmount:   parseFloat(document.getElementById('rewardAmount').value) || 0,
          launchPrice:    parseFloat(document.getElementById('launchPrice').value) || 0,
          priceAt1Year:   parseFloat(document.getElementById('priceAt1Year').value) || 0,
          fairPrice:      parseFloat(document.getElementById('fairPrice').value) || 0,
          headwinds:      parseFloat(document.getElementById('headwinds').value) || 0,
          salesGrowth:    parseFloat(document.getElementById('salesGrowth').value) || 0,
          totalHeadwinds: parseFloat(document.getElementById('totalHeadwinds').value) || 0
        };
      }

      function syncRangeDisplays(s) {
        document.getElementById('rewardAmountValue').textContent = s.rewardAmount.toFixed(1) + '%';
        document.getElementById('headwindsValue').textContent = s.headwinds.toFixed(1) + '%';
        document.getElementById('salesGrowthValue').textContent = s.salesGrowth + '%';
      }

      function recalc() {
        var s = readCalcState();
        syncRangeDisplays(s);

        var monthlyReward = s.totalSales * (s.rewardAmount / 100);
        var tokensEarned = monthlyReward;
        var priceMultiplier = s.launchPrice > 0 ? s.priceAt1Year / s.launchPrice : 0;
        var totalRewards = tokensEarned * priceMultiplier;
        var tokenAppreciation = s.launchPrice > 0
          ? ((s.priceAt1Year - s.launchPrice) / s.launchPrice) * 100
          : 0;

        document.getElementById('tokensEarned').textContent = formatCurrency(tokensEarned);
        document.getElementById('totalRewards').textContent = formatCurrency(totalRewards);
        document.getElementById('monthlyReward').textContent = formatCurrency(monthlyReward);
        document.getElementById('tokenAppreciation').textContent = tokenAppreciation.toFixed(1) + '%';
      }

      function applyScenario(name) {
        var v = SCENARIOS[name];
        if (!v) return;
        document.getElementById('totalSales').value = v.totalSales;
        document.getElementById('rewardAmount').value = v.rewardAmount;
        document.getElementById('launchPrice').value = v.launchPrice.toFixed(2);
        document.getElementById('priceAt1Year').value = v.priceAt1Year.toFixed(2);
        document.getElementById('fairPrice').value = v.fairPrice.toFixed(2);
        document.getElementById('headwinds').value = v.headwinds;
        document.getElementById('salesGrowth').value = v.salesGrowth;
        document.getElementById('totalHeadwinds').value = v.totalHeadwinds;
        document.querySelectorAll('#scenarioPresets .pill-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-preset') === name);
        });
        recalc();
      }

      function openCalcInfoModal(key) {
        var content = INFO_CONTENT[key];
        if (!content) return;
        var modal = document.getElementById('calcInfoModal');
        document.getElementById('calcInfoModalTitle').textContent = content.title;
        document.getElementById('calcInfoModalBody').textContent = content.description;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
      }

      function closeCalcInfoModal() {
        var modal = document.getElementById('calcInfoModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
      }

      function initRewardsCalculator() {
        var calcBtn = document.getElementById('rewardsCalcBtn');
        var calcView = document.getElementById('calculatorView');
        var mainView = document.getElementById('main');

        function openRewardsCalculator() {
          if (!mainView || !calcView) return;
          mainView.style.display = 'none';
          calcView.classList.add('active');
          recalc();
          if (history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search + '#rewards-calculator');
          }
        }
        function closeRewardsCalculator() {
          if (!mainView || !calcView) return;
          calcView.classList.remove('active');
          mainView.style.display = 'block';
          if (location.hash === '#rewards-calculator' && history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }

        if (calcBtn) {
          calcBtn.addEventListener('click', function() {
            if (calcView && calcView.classList.contains('active')) {
              closeRewardsCalculator();
            } else {
              openRewardsCalculator();
            }
          });
        }
        if (location.hash === '#rewards-calculator') {
          openRewardsCalculator();
        }
        window.addEventListener('hashchange', function() {
          if (location.hash === '#rewards-calculator' && calcView && !calcView.classList.contains('active')) {
            openRewardsCalculator();
          }
        });

        document.querySelectorAll('#scenarioPresets .pill-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            applyScenario(btn.getAttribute('data-preset'));
          });
        });

        ['totalSales','rewardAmount','launchPrice','priceAt1Year',
         'fairPrice','headwinds','salesGrowth','totalHeadwinds'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.addEventListener('input', recalc);
        });

        document.querySelectorAll('#calculatorView .info-icon').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            openCalcInfoModal(btn.getAttribute('data-info'));
          });
        });

        var modal = document.getElementById('calcInfoModal');
        var modalClose = document.getElementById('calcInfoModalClose');
        if (modalClose) modalClose.addEventListener('click', closeCalcInfoModal);
        if (modal) {
          modal.addEventListener('click', function(e) {
            if (e.target === modal) closeCalcInfoModal();
          });
        }
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') closeCalcInfoModal();
        });

        applyScenario('bearish');
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          initDarkMode();
          initCampaignSwitcher();
          initCharts();
          initRewardsCalculator();
        });
      } else {
        initDarkMode();
        initCampaignSwitcher();
        initCharts();
        initRewardsCalculator();
      }

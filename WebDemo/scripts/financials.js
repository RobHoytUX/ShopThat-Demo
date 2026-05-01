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
      // RETAILER BENEFITS CALCULATOR (TectoniQ-style)
      // =====================================================

      var benefitChartInst = null, rateCompChartInst = null, accumChartInst = null;

      var CC_BENCHMARKS = [
        { key:'chase_preferred', name:'Chase Sapphire Preferred', rate:0.01, type:'cash' },
        { key:'chase_reserve',   name:'Chase Sapphire Reserve',   rate:0.01, type:'cash' },
        { key:'amex_gold',       name:'Amex Gold Card',           rate:0.01, type:'cash' },
        { key:'amex_plat',       name:'Amex Platinum Card',       rate:0.01, type:'cash' },
        { key:'citi_double',     name:'Citi Double Cash',          rate:0.02, type:'cash' },
        { key:'venture_x',      name:'Capital One Venture X',     rate:0.02, type:'cash' },
        { key:'gemini',          name:'Gemini Credit Card',        rate:0.01, type:'btc' },
        { key:'coinbase_base',   name:'Coinbase One Card — Base',  rate:0.02, type:'btc' },
        { key:'coinbase_top',    name:'Coinbase One Card — Top',   rate:0.04, type:'btc' }
      ];

      var PRESETS = {
        conservative: { gmv:6.699, growth:10, horizon:1, price:-1, scenario:'-0.40', stake:25, lock:3, apy:8 },
        expected:     { gmv:7.301, growth:25, horizon:3, price:-0.602, scenario:'0', stake:50, lock:6, apy:12 },
        optimistic:   { gmv:7.699, growth:50, horizon:5, price:0, scenario:'0.20', stake:75, lock:12, apy:20 }
      };

      function pillVal(bind) {
        var el = document.querySelector('[data-bind="'+bind+'"] .pill-btn.active');
        return el ? el.getAttribute('data-value') : null;
      }

      function readState() {
        var gmvLog = parseFloat(document.getElementById('monthlyGMV').value);
        var preciseOn = document.getElementById('gmvPrecise').checked;
        var monthlyGMV = preciseOn ? parseFloat(document.getElementById('gmvPreciseInput').value) || 20000000 : Math.pow(10, gmvLog);
        var annualGrowth = parseFloat(document.getElementById('annualGrowth').value) / 100;
        var horizon = parseInt(pillVal('horizon')) || 3;
        var tqtPrice = Math.pow(10, parseFloat(document.getElementById('tqtPrice').value));
        var priceScenario = parseFloat(pillVal('priceScenario')) || 0;
        var stakePct = parseFloat(document.getElementById('stakePct').value) / 100;
        var lockMonths = parseInt(pillVal('lockPeriod')) || 6;
        var compound = document.getElementById('compoundToggle').checked;
        var cashbackTier = parseFloat(pillVal('cashbackTier')) || 0.0125;
        var stakingAPY = parseFloat(document.getElementById('stakingAPY').value) / 100;
        var btcReturn = parseFloat(document.getElementById('btcReturn').value) / 100;
        var indepBTC = document.getElementById('independentBTC').checked;
        var geminiBTC = indepBTC ? parseFloat(document.getElementById('geminiBtcReturn').value)/100 : btcReturn;
        var coinbaseBTC = indepBTC ? parseFloat(document.getElementById('coinbaseBtcReturn').value)/100 : btcReturn;
        var avgTx = parseFloat(document.getElementById('avgTxSize').value) || 650;
        var customRateOn = document.getElementById('customRateToggle').checked;
        var customRate = customRateOn ? parseFloat(document.getElementById('customRate').value)/100 : 0;
        var customPricePath = null;
        if (document.getElementById('customPricePathToggle').checked) {
          customPricePath = [];
          for (var y = 0; y < horizon; y++) {
            var inp = document.getElementById('customPriceY'+y);
            customPricePath.push(inp ? parseFloat(inp.value) || tqtPrice : tqtPrice);
          }
        }
        return { monthlyGMV:monthlyGMV, annualGrowth:annualGrowth, horizon:horizon, tqtPrice:tqtPrice,
          priceScenario:priceScenario, stakePct:stakePct, lockMonths:lockMonths, compound:compound,
          cashbackTier:cashbackTier, stakingAPY:stakingAPY, btcReturn:btcReturn,
          geminiBTC:geminiBTC, coinbaseBTC:coinbaseBTC, avgTx:avgTx,
          customRate:customRate, customRateOn:customRateOn, customPricePath:customPricePath };
      }

      function autoSelectTier(avgTx) {
        if (avgTx >= 2000) return 0.015;
        if (avgTx >= 500)  return 0.0125;
        return 0.0075;
      }

      function tierLabel(rate) {
        if (rate === 0.015)  return 'Tier 3';
        if (rate === 0.0125) return 'Tier 2';
        return 'Tier 1';
      }

      function priceAtYear(s, yr) {
        if (s.customPricePath && s.customPricePath[yr] !== undefined) return s.customPricePath[yr];
        return s.tqtPrice * Math.pow(1 + s.priceScenario, yr);
      }

      function computeBenefit(s) {
        var years = s.horizon;
        var yearData = [];
        var accumTokens = 0;
        for (var y = 0; y < years; y++) {
          var annualGMV = s.monthlyGMV * 12 * Math.pow(1 + s.annualGrowth, y);
          var cashbackUSD = annualGMV * s.cashbackTier;
          var priceBOY = priceAtYear(s, y);
          var priceEOY = priceAtYear(s, y + 1);
          var convPrice = Math.max(priceBOY, priceBOY); // TWAP ≈ current for demo
          var cashbackTokens = cashbackUSD / convPrice;
          var stakedTokens = cashbackTokens * s.stakePct;
          var periods = 12 / s.lockMonths;
          var stakingTokens = 0;
          if (s.compound) {
            var bal = stakedTokens;
            for (var p = 0; p < periods; p++) {
              var yld = bal * (s.stakingAPY * s.lockMonths / 12);
              stakingTokens += yld;
              bal += yld;
            }
          } else {
            stakingTokens = stakedTokens * s.stakingAPY;
          }
          var stakingUSD = stakingTokens * priceEOY;
          accumTokens += cashbackTokens + stakingTokens;
          var appreciation = accumTokens * (priceEOY - priceBOY);
          yearData.push({
            year: y + 1, annualGMV: annualGMV, cashbackUSD: cashbackUSD,
            cashbackTokens: cashbackTokens, stakedTokens: stakedTokens,
            stakingTokens: stakingTokens, stakingUSD: stakingUSD,
            appreciation: appreciation, priceBOY: priceBOY, priceEOY: priceEOY,
            accumTokens: accumTokens,
            totalBenefit: cashbackUSD + stakingUSD + Math.max(0, appreciation)
          });
        }
        var lastY = yearData[yearData.length - 1];
        var firstY = yearData[0];
        var effectiveRate = firstY.annualGMV > 0 ? firstY.totalBenefit / firstY.annualGMV : 0;
        var breakeven2 = s.cashbackTier > 0 ? (0.02 / s.cashbackTier) * s.tqtPrice : 0;
        var breakeven1btc = s.cashbackTier > 0 ? (0.01 / s.cashbackTier) * s.tqtPrice : 0;
        return { yearData:yearData, firstYear:firstY, effectiveRate:effectiveRate,
          breakeven2:breakeven2, breakeven1btc:breakeven1btc, accumTokens:accumTokens };
      }

      function enabledBenchmarks() {
        var out = [];
        document.querySelectorAll('#benchmarkChecks input[type="checkbox"]').forEach(function(cb) {
          if (cb.checked) {
            var key = cb.getAttribute('data-cc');
            var bm = CC_BENCHMARKS.find(function(b){ return b.key === key; });
            if (bm) out.push(bm);
          }
        });
        return out;
      }

      function fmtCur(v) {
        if (Math.abs(v) >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
        if (Math.abs(v) >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
        if (Math.abs(v) >= 1e3) return '$' + (v/1e3).toFixed(1) + 'K';
        if (Math.abs(v) < 0.01 && v !== 0) return '$' + v.toFixed(4);
        return '$' + v.toFixed(2);
      }
      function fmtNum(v) {
        if (Math.abs(v) >= 1e9) return (v/1e9).toFixed(1) + 'B';
        if (Math.abs(v) >= 1e6) return (v/1e6).toFixed(1) + 'M';
        if (Math.abs(v) >= 1e3) return (v/1e3).toFixed(1) + 'K';
        return v.toFixed(0);
      }
      function fmtPct(v) { return (v*100).toFixed(2) + '%'; }

      function updateDisplay(r, s) {
        var f = r.firstYear;
        document.getElementById('resBenefitUSD').textContent = fmtCur(f.totalBenefit);
        document.getElementById('resBenefitSub').textContent = fmtPct(r.effectiveRate) + ' effective rate';
        document.getElementById('resCashbackUSD').textContent = fmtCur(f.cashbackUSD);
        document.getElementById('resCashbackTQT').textContent = fmtNum(f.cashbackTokens) + ' TQT';
        document.getElementById('resStakingUSD').textContent = fmtCur(f.stakingUSD);
        document.getElementById('resStakingTQT').textContent = fmtNum(f.stakingTokens) + ' TQT';
        var lastY = r.yearData[r.yearData.length - 1];
        document.getElementById('resPortfolioUSD').textContent = fmtCur(r.accumTokens * lastY.priceEOY);
        document.getElementById('resPortfolioTQT').textContent = fmtNum(r.accumTokens) + ' TQT accumulated';

        // Breakdown table
        var tb = document.getElementById('breakdownBody');
        if (tb) {
          var rows = [
            ['Annual GMV at selected horizon start', fmtCur(f.annualGMV)],
            ['Cashback Rate (' + tierLabel(s.cashbackTier) + ') TWAP-protected conversion', fmtPct(s.cashbackTier)],
            ['Cashback Earned (USD)', fmtCur(f.cashbackUSD)],
            ['Cashback Tokens &divide; max(P_current, P_TWAP)', fmtNum(f.cashbackTokens)],
            ['Tokens Staked (' + (s.stakePct*100).toFixed(0) + '%) at ' + (s.stakingAPY*100).toFixed(0) + '% APY', fmtNum(f.stakedTokens)],
            ['Staking Yield (Tokens) ' + (s.compound ? 'compound' : 'simple'), fmtNum(f.stakingTokens)],
            ['Staking Yield (USD) at projected price', fmtCur(f.stakingUSD)],
            ['Price Appreciation on Accumulated Tokens', fmtCur(Math.max(0, f.appreciation))],
            ['Total Annual Benefit', fmtCur(f.totalBenefit)],
            ['Effective Reward Rate', fmtPct(r.effectiveRate)],
            ['Breakeven TQT Price (vs 2% CC)', fmtCur(r.breakeven2)]
          ];
          tb.innerHTML = rows.map(function(r){ return '<tr><td>'+r[0]+'</td><td style="text-align:right;font-weight:600">'+r[1]+'</td></tr>'; }).join('');
        }

        // Breakeven cards
        document.getElementById('breakeven2pct').textContent = fmtCur(r.breakeven2);
        document.getElementById('breakeven1btc').textContent = fmtCur(r.breakeven1btc);

        // Benchmark table
        updateBenchmarkTable(s, r);
        updateCalcCharts(r, s);
        updateScenarioMatrix(s);
      }

      function updateBenchmarkTable(s, r) {
        var body = document.getElementById('benchmarkBody');
        if (!body) return;
        var annualGMV = s.monthlyGMV * 12;
        var sensLog = parseFloat(document.getElementById('sensitivityPrice').value);
        var sensPrice = Math.pow(10, sensLog);
        document.getElementById('sensitivityPriceVal').textContent = fmtCur(sensPrice);
        var benchmarks = enabledBenchmarks();
        var tqtRow = { name:'TQT Cashback (' + tierLabel(s.cashbackTier) + ')', rate:s.cashbackTier, val:annualGMV * s.cashbackTier, type:'tqt' };
        var rows = [tqtRow];
        benchmarks.forEach(function(bm) {
          var val = annualGMV * bm.rate;
          if (bm.type === 'btc') {
            var btcRet = bm.key === 'gemini' ? s.geminiBTC : s.coinbaseBTC;
            val = val * (1 + btcRet);
          }
          rows.push({ name:bm.name, rate:bm.rate, val:val, type:bm.type });
        });
        if (s.customRateOn) {
          rows.push({ name:'Custom Benchmark', rate:s.customRate, val:annualGMV * s.customRate, type:'cash' });
        }
        body.innerHTML = rows.map(function(r) {
          var suffix = r.type === 'btc' ? ' (incl. BTC return)' : '';
          return '<tr><td>' + r.name + suffix + '</td><td>' + fmtPct(r.rate) + '</td><td>' + fmtCur(r.val) + '</td><td>' + fmtPct(r.val / annualGMV) + '</td></tr>';
        }).join('');
      }

      function updateCalcCharts(r, s) {
        var isDark = document.body.classList.contains('dark-mode');
        var gc = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        var tc = isDark ? '#a0a0c0' : '#6a6a8a';
        [benefitChartInst, rateCompChartInst, accumChartInst].forEach(function(c){ if(c) c.destroy(); });

        var labels = r.yearData.map(function(d){ return 'Year ' + d.year; });
        var bCtx = document.getElementById('benefitChart');
        if (bCtx) {
          benefitChartInst = new Chart(bCtx, {
            type:'bar', data:{
              labels:labels,
              datasets:[
                { label:'Cashback', data:r.yearData.map(function(d){return d.cashbackUSD;}), backgroundColor:'rgba(99,102,241,0.8)' },
                { label:'Staking Yield', data:r.yearData.map(function(d){return d.stakingUSD;}), backgroundColor:'rgba(16,185,129,0.8)' },
                { label:'Price Appreciation', data:r.yearData.map(function(d){return Math.max(0,d.appreciation);}), backgroundColor:'rgba(245,158,11,0.8)' }
              ]
            }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:tc}}},
              scales:{ x:{stacked:true,grid:{color:gc},ticks:{color:tc}}, y:{stacked:true,beginAtZero:true,grid:{color:gc},ticks:{color:tc}} } }
          });
        }

        var benchmarks = enabledBenchmarks();
        var annualGMV = s.monthlyGMV * 12;
        var rateLabels = ['TQT (' + tierLabel(s.cashbackTier) + ')'];
        var rateData = [r.effectiveRate * 100];
        var rateColors = ['rgba(99,102,241,0.8)'];
        benchmarks.forEach(function(bm) {
          rateLabels.push(bm.name);
          var effRate = bm.rate;
          if (bm.type === 'btc') effRate = bm.rate * (1 + s.btcReturn);
          rateData.push(effRate * 100);
          rateColors.push(bm.type === 'btc' ? 'rgba(245,158,11,0.7)' : 'rgba(156,163,175,0.7)');
        });
        var rcCtx = document.getElementById('rateCompChart');
        if (rcCtx) {
          rateCompChartInst = new Chart(rcCtx, {
            type:'bar', data:{
              labels:rateLabels, datasets:[{ label:'Effective Rate %', data:rateData, backgroundColor:rateColors }]
            }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
              plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true,grid:{color:gc},ticks:{color:tc}}, y:{grid:{color:gc},ticks:{color:tc}} } }
          });
        }

        var aCtx = document.getElementById('accumChart');
        if (aCtx) {
          var running = 0;
          var accumData = r.yearData.map(function(d){ running = d.accumTokens; return running; });
          accumChartInst = new Chart(aCtx, {
            type:'line', data:{
              labels:labels, datasets:[{ label:'Accumulated TQT', data:accumData, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)', fill:true, tension:0.35 }]
            }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
              scales:{ x:{grid:{color:gc},ticks:{color:tc}}, y:{beginAtZero:true,grid:{color:gc},ticks:{color:tc}} } }
          });
        }
      }

      function updateScenarioMatrix(s) {
        var body = document.getElementById('matrixBody');
        if (!body) return;
        var gmvScenarios = [
          { label:'Conservative', growth:0.10 },
          { label:'Expected', growth:0.25 },
          { label:'Optimistic', growth:0.50 }
        ];
        var priceScenarios = [-0.40, 0, 0.20];
        var values = [];
        var min = Infinity, max = -Infinity;
        gmvScenarios.forEach(function(gs) {
          var row = [];
          priceScenarios.forEach(function(ps) {
            var ss = Object.assign({}, s, { annualGrowth:gs.growth, priceScenario:ps, horizon:3 });
            var res = computeBenefit(ss);
            var total = 0;
            res.yearData.forEach(function(d){ total += d.totalBenefit; });
            row.push(total);
            if (total < min) min = total;
            if (total > max) max = total;
          });
          values.push({ label:gs.label, cells:row });
        });
        var currentGrowth = s.annualGrowth;
        var currentPS = s.priceScenario;
        var html = '';
        values.forEach(function(r) {
          html += '<tr><td style="font-weight:600">' + r.label + '</td>';
          r.cells.forEach(function(v, ci) {
            var pct = max > min ? (v - min) / (max - min) : 0.5;
            var rr = Math.round(220 - pct * 180);
            var gg = Math.round(80 + pct * 140);
            var bb = Math.round(80);
            var isCurrent = false;
            var gIdx = values.indexOf(r);
            if (gIdx === 0 && currentGrowth <= 0.15 || gIdx === 1 && currentGrowth > 0.15 && currentGrowth <= 0.35 || gIdx === 2 && currentGrowth > 0.35) {
              if (ci === 0 && currentPS <= -0.2 || ci === 1 && currentPS > -0.2 && currentPS < 0.1 || ci === 2 && currentPS >= 0.1) {
                isCurrent = true;
              }
            }
            html += '<td style="background:rgba('+rr+','+gg+','+bb+',0.25);color:#1a1a2e" class="' + (isCurrent ? 'cell-current' : '') + '">' + fmtCur(v) + '</td>';
          });
          html += '</tr>';
        });
        body.innerHTML = html;
      }

      function applyPreset(name) {
        var p = PRESETS[name];
        if (!p) return;
        document.getElementById('monthlyGMV').value = p.gmv;
        document.getElementById('annualGrowth').value = p.growth;
        document.getElementById('tqtPrice').value = p.price;
        document.getElementById('stakePct').value = p.stake;
        document.getElementById('stakingAPY').value = p.apy;
        setPill('horizon', String(p.horizon));
        setPill('priceScenario', p.scenario);
        setPill('lockPeriod', String(p.lock));
        document.querySelectorAll('#scenarioPresets .pill-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-preset') === name);
        });
        syncSliderDisplays();
        recalc();
      }

      function setPill(bind, val) {
        document.querySelectorAll('[data-bind="'+bind+'"] .pill-btn').forEach(function(b) {
          b.classList.toggle('active', b.getAttribute('data-value') === val);
        });
      }

      function syncSliderDisplays() {
        var gmvLog = parseFloat(document.getElementById('monthlyGMV').value);
        document.getElementById('gmvVal').textContent = fmtCur(Math.pow(10, gmvLog));
        document.getElementById('growthVal').textContent = document.getElementById('annualGrowth').value + '%';
        var tqtLog = parseFloat(document.getElementById('tqtPrice').value);
        document.getElementById('tqtPriceVal').textContent = fmtCur(Math.pow(10, tqtLog));
        document.getElementById('stakeVal').textContent = document.getElementById('stakePct').value + '%';
        document.getElementById('apyVal').textContent = document.getElementById('stakingAPY').value + '%';
        document.getElementById('btcReturnVal').textContent = document.getElementById('btcReturn').value + '%';
        document.getElementById('avgTxVal').textContent = '$' + parseInt(document.getElementById('avgTxSize').value).toLocaleString();
        if (document.getElementById('independentBTC').checked) {
          document.getElementById('geminiBtcVal').textContent = document.getElementById('geminiBtcReturn').value + '%';
          document.getElementById('coinbaseBtcVal').textContent = document.getElementById('coinbaseBtcReturn').value + '%';
        }
        if (document.getElementById('customRateToggle').checked) {
          document.getElementById('customRateVal').textContent = parseFloat(document.getElementById('customRate').value).toFixed(2) + '%';
        }
        var sensLog = parseFloat(document.getElementById('sensitivityPrice').value);
        document.getElementById('sensitivityPriceVal').textContent = fmtCur(Math.pow(10, sensLog));
      }

      function recalc() {
        syncSliderDisplays();
        var s = readState();
        var r = computeBenefit(s);
        updateDisplay(r, s);
      }

      function exportToCSV() {
        var s = readState();
        var r = computeBenefit(s);
        var headers = ['Year','Annual GMV','Cashback USD','Cashback TQT','Staked TQT','Staking Yield TQT','Staking Yield USD','Appreciation USD','Total Benefit','Accum TQT','Price BOY','Price EOY'];
        var rows = r.yearData.map(function(d) {
          return [d.year, d.annualGMV.toFixed(2), d.cashbackUSD.toFixed(2), d.cashbackTokens.toFixed(0),
            d.stakedTokens.toFixed(0), d.stakingTokens.toFixed(0), d.stakingUSD.toFixed(2),
            d.appreciation.toFixed(2), d.totalBenefit.toFixed(2), d.accumTokens.toFixed(0),
            d.priceBOY.toFixed(4), d.priceEOY.toFixed(4)];
        });
        var csv = [headers.join(',')].concat(rows.map(function(r){return r.join(',');})).join('\n');
        var blob = new Blob([csv], {type:'text/csv'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'retailer_benefits.csv'; a.click();
        URL.revokeObjectURL(url);
      }

      function buildCustomPricePath(horizon) {
        var grp = document.getElementById('customPricePathGroup');
        if (!grp) return;
        grp.innerHTML = '';
        for (var y = 0; y < horizon; y++) {
          var div = document.createElement('div');
          div.className = 'param-group';
          div.innerHTML = '<label>Year ' + (y+1) + ' TQT Price ($)</label><input type="number" id="customPriceY' + y + '" value="0.25" step="0.01" min="0.001">';
          grp.appendChild(div);
          div.querySelector('input').addEventListener('input', recalc);
        }
      }

      function initRewardsCalculator() {
        var calcBtn = document.getElementById('rewardsCalcBtn');
        var calcView = document.getElementById('calculatorView');
        var mainView = document.getElementById('main');
        var exportBtn = document.getElementById('exportData');

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
        if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

        // Preset buttons
        document.querySelectorAll('#scenarioPresets .pill-btn').forEach(function(btn) {
          btn.addEventListener('click', function() { applyPreset(btn.getAttribute('data-preset')); });
        });

        // Pill groups (radio-style)
        document.querySelectorAll('.calc-params [data-bind]').forEach(function(grp) {
          grp.querySelectorAll('.pill-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              grp.querySelectorAll('.pill-btn').forEach(function(b){ b.classList.remove('active'); });
              btn.classList.add('active');
              if (grp.getAttribute('data-bind') === 'horizon' && document.getElementById('customPricePathToggle').checked) {
                buildCustomPricePath(parseInt(btn.getAttribute('data-value')));
              }
              recalc();
            });
          });
        });

        // Results tab switching
        document.querySelectorAll('.calc-results-tabs .pill-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.calc-results-tabs .pill-btn').forEach(function(b){ b.classList.remove('active'); });
            btn.classList.add('active');
            document.querySelectorAll('.calc-restab-pane').forEach(function(p){ p.style.display = 'none'; });
            var pane = document.getElementById('pane-' + btn.getAttribute('data-restab'));
            if (pane) pane.style.display = 'block';
            if (btn.getAttribute('data-restab') === 'charts') recalc();
          });
        });

        // Range sliders + number inputs -> recalc on input
        document.querySelectorAll('.calc-params input[type="range"], .calc-params input[type="number"]').forEach(function(inp) {
          inp.addEventListener('input', recalc);
        });

        // Checkboxes -> recalc
        document.querySelectorAll('.calc-params input[type="checkbox"]').forEach(function(cb) {
          cb.addEventListener('change', function() {
            // Toggle visibility for dependent groups
            if (cb.id === 'gmvPrecise') {
              document.getElementById('gmvPreciseInput').style.display = cb.checked ? 'block' : 'none';
            }
            if (cb.id === 'independentBTC') {
              document.getElementById('independentBTCGroup').style.display = cb.checked ? 'block' : 'none';
            }
            if (cb.id === 'customRateToggle') {
              document.getElementById('customRateGroup').style.display = cb.checked ? 'block' : 'none';
            }
            if (cb.id === 'customPricePathToggle') {
              var grp = document.getElementById('customPricePathGroup');
              grp.style.display = cb.checked ? 'block' : 'none';
              if (cb.checked) buildCustomPricePath(parseInt(pillVal('horizon')) || 3);
            }
            recalc();
          });
        });

        // Sensitivity price slider
        var sensSlider = document.getElementById('sensitivityPrice');
        if (sensSlider) sensSlider.addEventListener('input', function() { recalc(); });

        // Advanced toggle
        var advToggle = document.getElementById('advancedToggle');
        var advBody = document.getElementById('advancedBody');
        var arrow = advToggle ? advToggle.querySelector('.toggle-arrow') : null;
        if (advToggle) {
          advToggle.addEventListener('click', function() {
            var open = advBody.style.display !== 'none';
            advBody.style.display = open ? 'none' : 'block';
            if (arrow) arrow.classList.toggle('open', !open);
          });
        }

        // Auto-select tier when avg tx changes
        document.getElementById('avgTxSize').addEventListener('input', function() {
          var autoTier = autoSelectTier(parseFloat(this.value));
          setPill('cashbackTier', String(autoTier));
          recalc();
        });

        // Initial run
        syncSliderDisplays();
        recalc();
      }

      function formatCurrency(value) { return fmtCur(value); }
      function formatNumber(value) { return fmtNum(value); }

      // Initialize when DOM is ready
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

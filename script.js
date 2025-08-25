class CurrencyConverter {
    constructor() {
        this.apiKey = 'demo'; // Using demo mode for this example
        this.baseUrl = 'https://api.exchangerate-api.com/v4/latest/';
        this.fallbackRates = {
            'USD': { 'NZD': 1.65, 'USD': 1 },
            'NZD': { 'USD': 0.61, 'NZD': 1 }
        };
        this.currentRates = null;
        this.lastUpdated = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.populateHistoricalRates();
        this.loadInitialRates();
    }

    bindEvents() {
        // Convert button
        document.getElementById('convertButton').addEventListener('click', () => {
            this.convertCurrency();
        });

        // Swap button
        document.getElementById('swapButton').addEventListener('click', () => {
            this.swapCurrencies();
        });

        // Input change events
        document.getElementById('fromAmount').addEventListener('input', () => {
            if (this.currentRates) {
                this.convertCurrency();
            }
        });

        // Currency change events
        document.getElementById('fromCurrency').addEventListener('change', () => {
            this.updateQuickConvertButtons();
            if (this.currentRates && document.getElementById('fromAmount').value) {
                this.convertCurrency();
            }
        });

        document.getElementById('toCurrency').addEventListener('change', () => {
            if (this.currentRates && document.getElementById('fromAmount').value) {
                this.convertCurrency();
            }
        });

        // Quick convert buttons
        document.querySelectorAll('.quick-convert').forEach(button => {
            button.addEventListener('click', (e) => {
                const amount = e.target.getAttribute('data-amount');
                document.getElementById('fromAmount').value = amount;
                this.convertCurrency();
            });
        });

        // Enter key on amount input
        document.getElementById('fromAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convertCurrency();
            }
        });
    }

    async loadInitialRates() {
        this.showLoading(true);
        try {
            await this.fetchExchangeRates('USD');
        } catch (error) {
            console.warn('Failed to fetch live rates, using fallback:', error);
            this.currentRates = this.fallbackRates;
            this.lastUpdated = new Date();
        }
        this.showLoading(false);
        this.updateQuickConvertButtons();
    }

    async fetchExchangeRates(baseCurrency) {
        try {
            // Try to fetch from API (will likely fail due to CORS in demo)
            const response = await fetch(`${this.baseUrl}${baseCurrency}`);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            this.currentRates = {
                [baseCurrency]: data.rates
            };
            this.lastUpdated = new Date(data.date);
        } catch (error) {
            // Use fallback rates with some variation for demo
            const variation = 0.02; // 2% variation
            const baseRate = this.fallbackRates[baseCurrency === 'USD' ? 'USD' : 'NZD'];
            const rate = baseCurrency === 'USD' ? 
                baseRate['NZD'] * (1 + (Math.random() - 0.5) * variation) :
                baseRate['USD'] * (1 + (Math.random() - 0.5) * variation);
            
            this.currentRates = {
                'USD': { 'NZD': rate, 'USD': 1 },
                'NZD': { 'USD': 1/rate, 'NZD': 1 }
            };
            this.lastUpdated = new Date();
        }
    }

    async convertCurrency() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const fromAmount = parseFloat(document.getElementById('fromAmount').value);

        if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
            this.showError('Please enter a valid amount');
            return;
        }

        this.showLoading(true);

        try {
            // Ensure we have rates for the base currency
            if (!this.currentRates || !this.currentRates[fromCurrency]) {
                await this.fetchExchangeRates(fromCurrency);
            }

            const rate = this.getExchangeRate(fromCurrency, toCurrency);
            const convertedAmount = fromAmount * rate;

            // Update UI
            document.getElementById('toAmount').value = convertedAmount.toFixed(2);
            this.updateExchangeRateInfo(fromCurrency, toCurrency, rate);

        } catch (error) {
            this.showError('Failed to convert currency. Please try again.');
            console.error('Conversion error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    getExchangeRate(fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return 1;
        
        if (this.currentRates && this.currentRates[fromCurrency]) {
            return this.currentRates[fromCurrency][toCurrency] || 1;
        }
        
        // Fallback to static rates
        return this.fallbackRates[fromCurrency][toCurrency] || 1;
    }

    swapCurrencies() {
        const fromCurrency = document.getElementById('fromCurrency');
        const toCurrency = document.getElementById('toCurrency');
        const fromAmount = document.getElementById('fromAmount');
        const toAmount = document.getElementById('toAmount');

        // Swap currency selections
        const tempCurrency = fromCurrency.value;
        fromCurrency.value = toCurrency.value;
        toCurrency.value = tempCurrency;

        // Swap amounts if both exist
        if (toAmount.value && fromAmount.value) {
            const tempAmount = fromAmount.value;
            fromAmount.value = toAmount.value;
            toAmount.value = tempAmount;
        }

        this.updateQuickConvertButtons();
        
        // Convert if amount exists
        if (fromAmount.value) {
            this.convertCurrency();
        }
    }

    updateExchangeRateInfo(fromCurrency, toCurrency, rate) {
        const rateInfo = document.getElementById('exchangeRateInfo');
        const rateElement = document.getElementById('exchangeRate');
        const lastUpdatedElement = document.getElementById('lastUpdated');

        rateElement.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
        lastUpdatedElement.textContent = this.lastUpdated.toLocaleString();
        
        rateInfo.classList.remove('hidden');
    }

    updateQuickConvertButtons() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const buttons = document.querySelectorAll('.quick-convert');
        
        buttons.forEach(button => {
            const amount = button.getAttribute('data-amount');
            const symbol = fromCurrency === 'USD' ? '$' : 'NZ$';
            button.textContent = `${symbol}${amount}`;
        });
    }

    populateHistoricalRates() {
        const tbody = document.getElementById('historicalRates');
        const today = new Date();
        
        // Generate mock historical data
        const historicalData = [];
        for (let i = 7; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const baseRate = 1.65;
            const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
            const rate = baseRate + variation;
            const previousRate = i === 7 ? rate : historicalData[historicalData.length - 1].rate;
            const change = rate - previousRate;
            
            historicalData.push({
                date: date.toLocaleDateString(),
                rate: rate,
                change: change
            });
        }

        tbody.innerHTML = historicalData.map(data => {
            const changeClass = data.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const changeIcon = data.change >= 0 ? '↗' : '↘';
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td class="py-2 text-gray-900 dark:text-white">${data.date}</td>
                    <td class="py-2 text-right text-gray-900 dark:text-white">${data.rate.toFixed(4)}</td>
                    <td class="py-2 text-right ${changeClass}">
                        ${changeIcon} ${Math.abs(data.change).toFixed(4)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
}

// Dark mode toggle functionality
class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Check for saved theme or default to light
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            this.enableDarkMode();
        }

        // Add theme toggle button
        this.addThemeToggle();
    }

    addThemeToggle() {
        const header = document.querySelector('header');
        const toggleButton = document.createElement('button');
        toggleButton.className = 'btn secondary absolute top-6 right-6 p-2';
        toggleButton.innerHTML = `
            <svg class="w-5 h-5 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
        `;
        
        header.style.position = 'relative';
        header.appendChild(toggleButton);
        
        toggleButton.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    enableDarkMode() {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }

    disableDarkMode() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }

    toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
    new ThemeManager();
});
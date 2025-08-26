// script.js (top-level)
let deferredPrompt;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e; // keep for later
});

async function maybeShowInstallPrompt() {
  if (!isMobile || !deferredPrompt) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return; // already installed

  const { outcome } = await deferredPrompt.prompt(); // must be called in a gesture
  deferredPrompt = null; // one-shot
  // optional: console.log('Install outcome:', outcome);
}

function wireFirstGestureInstall() {
  const once = { once: true, passive: true };
  document.addEventListener('touchend', maybeShowInstallPrompt, once);
  document.addEventListener('click',    maybeShowInstallPrompt, once);

  const amt = document.getElementById('fromAmount');
  if (amt) amt.addEventListener('input', maybeShowInstallPrompt, once);

  const swap = document.getElementById('swapButton');
  if (swap) {
    swap.addEventListener('click',    maybeShowInstallPrompt, once);
    swap.addEventListener('touchend', maybeShowInstallPrompt, once);
  }
}

window.addEventListener('load', wireFirstGestureInstall);

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
});


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
        
        // Current currency pair
        this.fromCurrency = 'USD';
        this.toCurrency = 'NZD';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCurrencyDisplay();
        this.loadInitialRates();
    }

    bindEvents() {
        // Swap button
        document.getElementById('swapButton').addEventListener('click', () => {
            this.swapCurrencies();
        });

        // Input change events - auto convert as user types
        document.getElementById('fromAmount').addEventListener('input', () => {
            if (this.currentRates) {
                this.convertCurrency();
            }
        });

        // Multiply amount input - auto calculate multiplied amount
        document.getElementById('multiplyAmount').addEventListener('input', () => {
            this.calculateMultipliedAmount();
        });

        // Enter key on amount input (for accessibility)
        document.getElementById('fromAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convertCurrency();
            }
        });

        // Enter key on multiply input (for accessibility)
        document.getElementById('multiplyAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.calculateMultipliedAmount();
            }
        });
    }

    async loadInitialRates() {
        this.showLoading(true);
        try {
            await this.fetchExchangeRates(this.fromCurrency);
        } catch (error) {
            console.warn('Failed to fetch live rates, using fallback:', error);
            this.currentRates = this.fallbackRates;
            this.lastUpdated = new Date();
        }
        this.showLoading(false);
        this.updateCurrentRateDisplay();
    }

    async fetchExchangeRates(baseCurrency) {
        try {
            // Try to fetch from a working free API
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            this.currentRates = {
                [baseCurrency]: data.rates
            };
            this.lastUpdated = new Date();
        } catch (error) {
            console.warn('API fetch failed, using fallback rates:', error);
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
        const fromAmount = parseFloat(document.getElementById('fromAmount').value);

        // Clear output if no valid input
        if (!fromAmount || isNaN(fromAmount) || fromAmount <= 0) {
            document.getElementById('toAmount').value = '';
            document.getElementById('multipliedAmount').value = '';
            return;
        }

        try {
            // Ensure we have rates for the base currency
            if (!this.currentRates || !this.currentRates[this.fromCurrency]) {
                await this.fetchExchangeRates(this.fromCurrency);
            }

            const rate = this.getExchangeRate(this.fromCurrency, this.toCurrency);
            const convertedAmount = fromAmount * rate;

            // Update UI
            document.getElementById('toAmount').value = convertedAmount.toFixed(2);
            this.updateCurrentRateDisplay();

            // Also calculate multiplied amount if multiply value exists
            this.calculateMultipliedAmount();

        } catch (error) {
            this.showError('Failed to convert currency. Please try again.');
            console.error('Conversion error:', error);
        }
    }

    calculateMultipliedAmount() {
        const convertedAmount = parseFloat(document.getElementById('toAmount').value);
        const multiplyValue = parseFloat(document.getElementById('multiplyAmount').value);

        // Clear multiplied amount if no valid inputs
        if (!convertedAmount || isNaN(convertedAmount) || convertedAmount <= 0 ||
            !multiplyValue || isNaN(multiplyValue) || multiplyValue <= 0) {
            document.getElementById('multipliedAmount').value = '';
            return;
        }

        const multipliedAmount = convertedAmount * multiplyValue;
        document.getElementById('multipliedAmount').value = multipliedAmount.toFixed(2);
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
        const fromAmount = document.getElementById('fromAmount');
        const toAmount = document.getElementById('toAmount');

        // Swap the currency values
        const tempCurrency = this.fromCurrency;
        this.fromCurrency = this.toCurrency;
        this.toCurrency = tempCurrency;

        // Update the display
        this.updateCurrencyDisplay();

        // Swap amounts if both exist
        if (toAmount.value && fromAmount.value) {
            const tempAmount = fromAmount.value;
            fromAmount.value = toAmount.value;
            toAmount.value = tempAmount;
        }

        this.updateCurrentRateDisplay();
        
        // Convert if amount exists
        if (fromAmount.value) {
            this.convertCurrency();
        }
    }

    updateCurrencyDisplay() {
        // Update currency labels
        document.getElementById('fromCurrencyLabel').textContent = this.fromCurrency;
        document.getElementById('toCurrencyLabel').textContent = this.toCurrency;

        // Update currency symbols in the inputs
        const fromSymbol = this.getCurrencySymbol(this.fromCurrency);
        const toSymbol = this.getCurrencySymbol(this.toCurrency);
        
        document.getElementById('fromCurrencySymbol').textContent = fromSymbol;
        document.getElementById('toCurrencySymbol').textContent = toSymbol;
        document.getElementById('multipliedCurrencySymbol').textContent = toSymbol;
    }

    getCurrencySymbol(currency) {
        const symbols = {
            'USD': '$',
            'NZD': '$'
        };
        return symbols[currency] || currency;
    }

    getCurrencyName(currency) {
        const names = {
            'USD': 'US Dollar',
            'NZD': 'New Zealand Dollar'
        };
        return names[currency] || currency;
    }

    updateCurrentRateDisplay() {
        const currentRateDisplay = document.getElementById('currentRateDisplay');
        const currentRateText = document.getElementById('currentRateText');

        if (this.currentRates) {
            const rate = this.getExchangeRate(this.fromCurrency, this.toCurrency);
            currentRateText.textContent = `1 ${this.fromCurrency} = ${rate.toFixed(4)} ${this.toCurrency}`;
            currentRateDisplay.classList.remove('hidden');
        }
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
        const toggleButton = document.getElementById('themeToggle');
        
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
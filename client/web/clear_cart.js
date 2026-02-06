// Clear cart from localStorage
const fs = require('fs');
const path = require('path');
const os = require('os');

// Try to find and clear the cart
const localStoragePath = path.join(os.homedir(), 'Library/Application Support/Qoder/Local Storage');
console.log('Cart clearing script - run this in browser console:');
console.log("localStorage.removeItem('cartsByCountry');");
console.log("localStorage.removeItem('cart');");
console.log("window.dispatchEvent(new Event('cartUpdated'));");

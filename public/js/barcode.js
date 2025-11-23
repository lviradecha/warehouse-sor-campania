// barcode.js
const BarcodeHelper = {
    generate(value) {
        return `/print-barcode.html?code=${value}`;
    }
};
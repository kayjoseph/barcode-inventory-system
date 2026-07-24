const express = require('express');
const path    = require('path');
const db      = require('./db');
const { generateEAN13, generateBarcodeImage } = require('./barcode');

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
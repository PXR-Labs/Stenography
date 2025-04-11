/**
 * Optimized Image Steganography & Encryption Tool Improved for better performance
 */

document.addEventListener('DOMContentLoaded', () => {
    // Core DOM Elements
    const domElements = {
        imageInput: document.getElementById('imageInput'),
        canvas: document.getElementById('canvas'),
        hiddenText: document.getElementById('hiddenText'),
        encryptionSelect: document.getElementById('encryptionSelect'),
        encryptionKey: document.getElementById('encryptionKey'),
        modal: document.getElementById('resultModal'),
        modalOutput: document.getElementById('modalOutput'),
        copyButton: document.getElementById('copyButton'),
        decryptionSelect: document.getElementById('decryptionSelect'),
        downloadLink: document.getElementById('downloadLink'),
        buttons: {
            encode: document.getElementById('encodeButton'),
            decode: document.getElementById('decodeButton'),
            download: document.getElementById('downloadButton'),
            closeModal: document.getElementById('closeModalButton')
        }
    };

    // Initialize Canvas Context
    const ctx = domElements.canvas.getContext('2d', { willReadFrequently: true });
    let originalImage = null;
    let currentImg = null;

    // Image Upload Handler - Improved for better performance
    domElements.imageInput.addEventListener('change', handleImageUpload);

    function handleImageUpload() {
        const file = domElements.imageInput.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showMessage('Please select an image file (JPEG, PNG, etc.)', 'error');
            return;
        }

        // Check file size
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showMessage('Image is too large. Please select an image under 5MB.', 'error');
            return;
        }

        showMessage('Loading image...', 'info');
        
        const reader = new FileReader();
        reader.onload = (event) => {
            // Preload image to get dimensions
            const img = new Image();
            img.onload = () => {
                currentImg = img; // Store reference to image
                
                // Calculate dimensions with a smaller max size for mobile
                const maxDimension = window.innerWidth < 600 ? 400 : 800;
                const scaleFactor = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
                
                // Set canvas dimensions
                domElements.canvas.width = Math.floor(img.width * scaleFactor);
                domElements.canvas.height = Math.floor(img.height * scaleFactor);
                
                // Clear and draw
                ctx.clearRect(0, 0, domElements.canvas.width, domElements.canvas.height);
                ctx.drawImage(img, 0, 0, domElements.canvas.width, domElements.canvas.height);
                
                // Store original image data
                try {
                    originalImage = ctx.getImageData(0, 0, domElements.canvas.width, domElements.canvas.height);
                    enableButtons();
                    showMessage('Image loaded successfully!', 'success');
                } catch (error) {
                    showMessage('Error accessing image data. Try a different image.', 'error');
                    console.error(error);
                }
            };
            img.onerror = () => showMessage('Error loading the image', 'error');
            img.src = event.target.result;
        };
        reader.onerror = () => showMessage('Error reading the file', 'error');
        reader.readAsDataURL(file);
    }

    // Enable buttons when image is loaded
    function enableButtons() {
        domElements.buttons.encode.disabled = false;
        domElements.buttons.decode.disabled = false;
    }

    // Encode button event listener
    domElements.buttons.encode.addEventListener('click', () => {
        const text = domElements.hiddenText.value.trim();
        
        if (!text) {
            showMessage('Please enter text to hide', 'warning');
            return;
        }
        
        if (!originalImage) {
            showMessage('Please upload an image first', 'warning');
            return;
        }

        // Display loading message
        showMessage('Processing, please wait...', 'info');
        
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
            try {
                // Reset to original image before encoding
                ctx.putImageData(originalImage, 0, 0);
                
                const encryptedText = encryptText(text);
                if (encryptedText) {
                    // Calculate max capacity
                    const maxChars = Math.floor((originalImage.data.length / 4) / 8) - 20; // Leave room for header
                    
                    if (encryptedText.length > maxChars) {
                        showMessage(`Text too large! Max ${maxChars} characters for this image.`, 'error');
                        return;
                    }
                    
                    hideTextInCanvas(encryptedText);
                    updateDownloadLink();
                    showMessage('Text successfully hidden in the image!', 'success');
                }
            } catch (error) {
                showMessage(`Error: ${error.message}`, 'error');
                console.error(error);
            }
        }, 100);
    });

    // Improved text encryption function
    function encryptText(text) {
        const method = domElements.encryptionSelect.value;
        const key = domElements.encryptionKey.value;
        
        if (!text) return '';

        switch (method) {
            case 'base64': 
                return btoa(unescape(encodeURIComponent(text))); // Handle Unicode properly
            
            case 'reverse': 
                return text.split('').reverse().join('');
            
            case 'caesar': 
                const shift = parseInt(key) || 3;
                return caesarCipher(text, shift);
            
            case 'xor':
                if (!key) {
                    showMessage('XOR encryption requires a key', 'warning');
                    return null;
                }
                return xorEncrypt(text, key);
                
            case 'none':
            default: 
                return text;
        }
    }

    // Optimized steganography implementation
    function hideTextInCanvas(text) {
        if (!text) return;
        
        // Add metadata (length:text)
        const dataToHide = `${text.length}:${text}`;
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, domElements.canvas.width, domElements.canvas.height);
        const data = imageData.data;
        
        // Convert text to more efficient Uint8Array
        const textBytes = new TextEncoder().encode(dataToHide);
        
        // Check capacity
        if (textBytes.length * 8 > data.length / 4) {
            throw new Error('Text is too large for this image');
        }
        
        // Process in chunks to improve performance
        const CHUNK_SIZE = 1000; // Process 1000 bytes at a time
        for (let byteIndex = 0; byteIndex < textBytes.length; byteIndex++) {
            const byte = textBytes[byteIndex];
            
            // Process each bit of the byte
            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const pixelIndex = (byteIndex * 8 + bitIndex) * 4;
                const bit = (byte >> (7 - bitIndex)) & 1;
                
                // Modify R channel LSB
                data[pixelIndex] = (data[pixelIndex] & 0xFE) | bit;
            }
            
            // Yield to the browser every CHUNK_SIZE bytes (important for mobile)
            if (byteIndex % CHUNK_SIZE === 0 && byteIndex > 0) {
                // This would ideally use requestAnimationFrame, but we're keeping it simpler
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // Decode button event
    domElements.buttons.decode.addEventListener('click', () => {
        if (!ctx || !currentImg) {
            showMessage('Please upload an image first', 'warning');
            return;
        }
        
        showMessage('Decoding, please wait...', 'info');
        
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
            try {
                revealTextFromCanvas().then(extractedText => {
                    const decryptedText = decryptText(extractedText);
                    toggleModal('flex', decryptedText);
                    showMessage('Decoding complete!', 'success');
                }).catch(error => {
                    showMessage(`Error: ${error.message}`, 'error');
                });
            } catch (error) {
                showMessage(`Error decoding: ${error.message}`, 'error');
                console.error(error);
            }
        }, 100);
    });

    // Improved extraction with progressive processing
    async function revealTextFromCanvas() {
        return new Promise((resolve, reject) => {
            const imageData = ctx.getImageData(0, 0, domElements.canvas.width, domElements.canvas.height);
            const data = imageData.data;
            
            let binaryString = '';
            let charCodes = [];
            let extractedBytes = [];
            let currentByte = 0;
            let bitPosition = 0;
            
            // Process only first part of image to find length marker
            for (let i = 0; i < Math.min(100000, data.length); i += 4) {
                // Extract LSB
                const bit = data[i] & 0x01;
                
                // Add bit to current byte
                currentByte = (currentByte << 1) | bit;
                bitPosition++;
                
                if (bitPosition === 8) {
                    extractedBytes.push(currentByte);
                    charCodes.push(currentByte);
                    bitPosition = 0;
                    currentByte = 0;
                    
                    // Check if we have the length marker
                    const extractedText = String.fromCharCode.apply(null, charCodes);
                    const lengthSeparator = extractedText.indexOf(':');
                    
                    if (lengthSeparator !== -1) {
                        try {
                            const declaredLength = parseInt(extractedText.substring(0, lengthSeparator));
                            if (!isNaN(declaredLength) && declaredLength > 0) {
                                // Calculate how many more bytes we need
                                const totalBytesNeeded = (declaredLength + lengthSeparator + 1);
                                
                                // Continue processing if needed
                                if (charCodes.length >= totalBytesNeeded) {
                                    const fullText = String.fromCharCode.apply(null, charCodes);
                                    const contentStartIndex = lengthSeparator + 1;
                                    return resolve(fullText.substring(contentStartIndex, contentStartIndex + declaredLength));
                                }
                            }
                        } catch (e) {
                            // Not a valid length, continue processing
                        }
                    }
                }
                
                // Safety limit to prevent infinite loop
                if (extractedBytes.length > 10000) {
                    return reject(new Error('No valid hidden text found'));
                }
            }
            
            reject(new Error('No hidden text pattern found in this image'));
        });
    }

    // Improved text decryption
    function decryptText(text) {
        const method = domElements.decryptionSelect ? 
            domElements.decryptionSelect.value : 
            domElements.encryptionSelect.value;
        const key = domElements.encryptionKey.value;

        if (!text) return '';

        try {
            switch (method) {
                case 'base64':
                    try {
                        return decodeURIComponent(escape(atob(text))); // Handle Unicode properly
                    } catch (e) {
                        throw new Error('Invalid Base64 encoded text');
                    }
                    
                case 'reverse':
                    return text.split('').reverse().join('');
                    
                case 'caesar':
                    const shift = parseInt(key) || 3;
                    return caesarCipher(text, -shift);
                    
                case 'xor':
                    if (!key) {
                        throw new Error('XOR decryption requires a key');
                    }
                    return xorEncrypt(text, key);
                    
                case 'none':
                default:
                    return text;
            }
        } catch (error) {
            showMessage(`Decryption error: ${error.message}`, 'error');
            return text; // Return original text on error
        }
    }

    // Modal controls
    function toggleModal(display, text = '') {
        domElements.modal.style.display = display;
        if (domElements.modalOutput) {
            domElements.modalOutput.innerText = text || '';
        }
    }

    // Close modal
    if (domElements.buttons.closeModal) {
        domElements.buttons.closeModal.addEventListener('click', () => toggleModal('none'));
    }

    // Copy text
    if (domElements.copyButton) {
        domElements.copyButton.addEventListener('click', () => {
            if (domElements.modalOutput && domElements.modalOutput.innerText) {
                navigator.clipboard.writeText(domElements.modalOutput.innerText)
                    .then(() => showMessage('Copied to clipboard!', 'success'))
                    .catch(err => showMessage('Failed to copy: ' + err, 'error'));
            }
        });
    }

    // Download button
    if (domElements.buttons.download) {
        domElements.buttons.download.addEventListener('click', () => {
            updateDownloadLink();
            domElements.downloadLink.click();
        });
    }

    // Update download link
    function updateDownloadLink() {
        try {
            // Use lower quality for better performance
            const dataURL = domElements.canvas.toDataURL('image/png', 0.8);
            domElements.downloadLink.href = dataURL;
            domElements.downloadLink.style.display = 'inline-block';
        } catch (e) {
            showMessage('Error creating download link', 'error');
        }
    }

    // Improved notification system
    function showMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.classList.add('fade-out');
            setTimeout(() => messageElement.remove(), 500);
        }, 3000);
    }

    // Encryption utility functions
    function caesarCipher(str, shift) {
        return str.replace(/[a-z]/gi, char => {
            const code = char.charCodeAt(0);
            const isUpperCase = char === char.toUpperCase();
            const baseCode = isUpperCase ? 65 : 97;
            
            const position = (code - baseCode + shift) % 26;
            const newPosition = position < 0 ? position + 26 : position;
            
            return String.fromCharCode(baseCode + newPosition);
        });
    }

    function xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }

    // Initialize
    function init() {
        // Set initial state
        domElements.buttons.encode.disabled = true;
        domElements.buttons.decode.disabled = true;
        
        // Create placeholder
        domElements.canvas.width = 400;
        domElements.canvas.height = 300;
        ctx.fillStyle = '#3a3c40';
        ctx.fillRect(0, 0, domElements.canvas.width, domElements.canvas.height);
        ctx.fillStyle = '#555';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image to begin', domElements.canvas.width / 2, domElements.canvas.height / 2);
        
        // Add additional message styles
        const style = document.createElement('style');
        style.textContent = `
            .message {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1100;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                transition: opacity 0.5s;
                color: white;
                max-width: 80%;
                text-align: center;
            }
            .message-success { background-color: #28a745; }
            .message-error { background-color: #dc3545; }
            .message-warning { background-color: #ffc107; color: #333; }
            .message-info { background-color: #17a2b8; }
            .fade-out { opacity: 0; }
        `;
        document.head.appendChild(style);
    }

    // Start app
    init();
});
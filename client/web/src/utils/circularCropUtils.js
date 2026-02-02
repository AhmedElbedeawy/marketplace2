/**
 * Circular Image Cropping Utility
 * Crops image to circular format matching Ccard.png dimensions
 * Returns canvas with cropped circular image
 */

export const CircularCropUtils = {
  /**
   * Create a circular cropped image
   * @param {File} imageFile - The image file to crop
   * @param {number} circleDiameter - Circle diameter in pixels (default: 200)
   * @returns {Promise<Blob>} - Returns blob of cropped image
   */
  cropCircular: async (imageFile, circleDiameter = 200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to circle diameter
          canvas.width = circleDiameter;
          canvas.height = circleDiameter;
          
          // Create circular clipping region
          ctx.beginPath();
          ctx.arc(circleDiameter / 2, circleDiameter / 2, circleDiameter / 2, 0, Math.PI * 2);
          ctx.clip();
          
          // Calculate image positioning to fill circle
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = Math.max(circleDiameter / imgWidth, circleDiameter / imgHeight);
          
          const scaledWidth = imgWidth * ratio;
          const scaledHeight = imgHeight * ratio;
          const x = (circleDiameter - scaledWidth) / 2;
          const y = (circleDiameter - scaledHeight) / 2;
          
          // Draw image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  },

  /**
   * Get cropped image as data URL
   * @param {File} imageFile - The image file to crop
   * @param {number} circleDiameter - Circle diameter in pixels (default: 200)
   * @returns {Promise<string>} - Returns data URL of cropped image
   */
  cropCircularToDataURL: async (imageFile, circleDiameter = 200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = circleDiameter;
          canvas.height = circleDiameter;
          
          ctx.beginPath();
          ctx.arc(circleDiameter / 2, circleDiameter / 2, circleDiameter / 2, 0, Math.PI * 2);
          ctx.clip();
          
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = Math.max(circleDiameter / imgWidth, circleDiameter / imgHeight);
          
          const scaledWidth = imgWidth * ratio;
          const scaledHeight = imgHeight * ratio;
          const x = (circleDiameter - scaledWidth) / 2;
          const y = (circleDiameter - scaledHeight) / 2;
          
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  },

  /**
   * Create preview with drag/zoom capability and Ccard frame overlay
   * @param {File} imageFile - The image file
   * @param {HTMLCanvasElement} canvas - Canvas element to render on
   * @param {number} width - Canvas width (default: 180)
   * @param {number} height - Canvas height (default: 214)
   * @returns {Object} - Image state and control methods
   */
  createCookCardCropper: (imageFile, canvas, width = 180, height = 214) => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const frame = new Image();
          frame.onload = () => {
            const state = {
              img,
              frame,
              offsetX: 0,
              offsetY: 0,
              scale: Math.max(width / img.width, height / img.height),
              isDragging: false,
              startX: 0,
              startY: 0,
              minScale: Math.max(width / img.width, height / img.height),
              maxScale: 3
            };

            // Center image initially
            state.offsetX = (width - img.width * state.scale) / 2;
            state.offsetY = (height - img.height * state.scale) / 2;

            const redraw = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // 1. Draw image background
              const scaledWidth = img.width * state.scale;
              const scaledHeight = img.height * state.scale;
              ctx.drawImage(img, state.offsetX, state.offsetY, scaledWidth, scaledHeight);
              
              // 2. Draw frame overlay (Ccard.png)
              ctx.drawImage(frame, 0, 0, width, height);
            };

            // Mouse/Touch events for dragging
            const handleMouseDown = (e) => {
              state.isDragging = true;
              const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
              const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
              state.startX = clientX - state.offsetX;
              state.startY = clientY - state.offsetY;
            };

            const handleMouseMove = (e) => {
              if (state.isDragging) {
                const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
                const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
                state.offsetX = clientX - state.startX;
                state.offsetY = clientY - state.startY;
                
                // Constrain offsets to keep image covering canvas
                const scaledWidth = img.width * state.scale;
                const scaledHeight = img.height * state.scale;
                state.offsetX = Math.min(0, Math.max(width - scaledWidth, state.offsetX));
                state.offsetY = Math.min(0, Math.max(height - scaledHeight, state.offsetY));
                
                redraw();
              }
            };

            const handleMouseUp = () => {
              state.isDragging = false;
            };

            canvas.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            
            // Touch support
            canvas.addEventListener('touchstart', (e) => {
              e.preventDefault();
              handleMouseDown(e);
            });
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);

            canvas.addEventListener('wheel', (e) => {
              e.preventDefault();
              const oldScale = state.scale;
              state.scale += (e.deltaY > 0 ? -0.05 : 0.05);
              state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale));
              
              // Zoom toward mouse position
              const rect = canvas.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              
              const scaleRatio = state.scale / oldScale;
              state.offsetX = mouseX - (mouseX - state.offsetX) * scaleRatio;
              state.offsetY = mouseY - (mouseY - state.offsetY) * scaleRatio;
              
              // Constrain offsets
              const scaledWidth = img.width * state.scale;
              const scaledHeight = img.height * state.scale;
              state.offsetX = Math.min(0, Math.max(width - scaledWidth, state.offsetX));
              state.offsetY = Math.min(0, Math.max(height - scaledHeight, state.offsetY));
              
              redraw();
            });

            redraw();

            resolve({
              state,
              redraw,
              cleanup: () => {
                canvas.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                canvas.removeEventListener('touchstart', handleMouseDown);
                window.removeEventListener('touchmove', handleMouseMove);
                window.removeEventListener('touchend', handleMouseUp);
              },
              getCroppedImage: () => {
                const cropCanvas = document.createElement('canvas');
                const cropCtx = cropCanvas.getContext('2d');
                cropCanvas.width = width;
                cropCanvas.height = height;
                
                const scaledWidth = img.width * state.scale;
                const scaledHeight = img.height * state.scale;
                cropCtx.drawImage(img, state.offsetX, state.offsetY, scaledWidth, scaledHeight);
                
                return cropCanvas.toDataURL('image/png');
              }
            });
          };
          frame.src = '/assets/cooks/Ccard.png';
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  },

  /**
   * Create preview with drag/zoom capability
   * @param {File} imageFile - The image file
   * @param {HTMLCanvasElement} canvas - Canvas element to render on
   * @param {number} circleDiameter - Circle diameter (default: 200)
   * @returns {Object} - Image state and control methods
   */
  createInteractiveCropper: (imageFile, canvas, circleDiameter = 200) => {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      canvas.width = circleDiameter;
      canvas.height = circleDiameter;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const state = {
            img,
            offsetX: 0,
            offsetY: 0,
            scale: 1,
            isDragging: false,
            startX: 0,
            startY: 0,
            minScale: circleDiameter / Math.max(img.width, img.height),
            maxScale: 5
          };

          // Initial draw
          const redraw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw image
            const scaledWidth = img.width * state.scale;
            const scaledHeight = img.height * state.scale;
            ctx.drawImage(img, state.offsetX, state.offsetY, scaledWidth, scaledHeight);
            
            // Draw circle overlay
            ctx.strokeStyle = '#FF7A00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(circleDiameter / 2, circleDiameter / 2, circleDiameter / 2, 0, Math.PI * 2);
            ctx.stroke();
            
            // Darken area outside circle
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(circleDiameter / 2, circleDiameter / 2, circleDiameter / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          };

          // Mouse events
          canvas.addEventListener('mousedown', (e) => {
            state.isDragging = true;
            state.startX = e.clientX - state.offsetX;
            state.startY = e.clientY - state.offsetY;
          });

          canvas.addEventListener('mousemove', (e) => {
            if (state.isDragging) {
              state.offsetX = e.clientX - state.startX;
              state.offsetY = e.clientY - state.startY;
              redraw();
            }
          });

          canvas.addEventListener('mouseup', () => {
            state.isDragging = false;
          });

          canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const oldScale = state.scale;
            state.scale += (e.deltaY > 0 ? -0.1 : 0.1);
            state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale));
            
            // Adjust offset to zoom toward center
            const scaleDiff = state.scale - oldScale;
            state.offsetX -= (canvas.width / 2) * (scaleDiff / oldScale);
            state.offsetY -= (canvas.height / 2) * (scaleDiff / oldScale);
            
            redraw();
          });

          redraw();

          resolve({
            state,
            redraw,
            getCroppedImage: () => {
              const cropCanvas = document.createElement('canvas');
              const cropCtx = cropCanvas.getContext('2d');
              cropCanvas.width = circleDiameter;
              cropCanvas.height = circleDiameter;
              
              // Create circular mask
              cropCtx.beginPath();
              cropCtx.arc(circleDiameter / 2, circleDiameter / 2, circleDiameter / 2, 0, Math.PI * 2);
              cropCtx.clip();
              
              // Draw cropped image
              const scaledWidth = img.width * state.scale;
              const scaledHeight = img.height * state.scale;
              cropCtx.drawImage(img, state.offsetX, state.offsetY, scaledWidth, scaledHeight);
              
              return cropCanvas.toDataURL('image/png');
            }
          });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageFile);
    });
  },
};

export default CircularCropUtils;

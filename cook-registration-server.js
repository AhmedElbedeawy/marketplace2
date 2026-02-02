const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// HTML form page
const htmlForm = `
<!DOCTYPE html>
<html>
<head>
  <title>Cook Registration - Web</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 500px; width: 90%; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    h1 { color: #2C2C2C; margin-bottom: 10px; font-size: 28px; }
    .subtitle { color: #888; margin-bottom: 30px; font-size: 14px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 14px; }
    input, select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: white; }
    input:focus, select:focus { outline: none; border-color: #FF7A00; }
    
    .lang-toggle { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .lang-btn { background: #eee; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; margin-left: 10px; font-weight: 600; }
    .lang-btn.active { background: #FF7A00; color: white; }
    
    button { background: #FF7A00; color: white; padding: 12px; width: 100%; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; }
    button:hover { background: #e66a00; }
    #message { margin-top: 20px; padding: 12px; border-radius: 6px; text-align: center; display: none; }
    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    
    /* Interactive Cropper Styles */
    .cropper-container { margin-bottom: 20px; text-align: center; }
    #canvas-wrapper { 
      display: none; 
      margin: 15px auto; 
      border: 1px solid #ddd; 
      border-radius: 12px; 
      overflow: hidden; 
      cursor: move; 
      width: 180px; 
      height: 214px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
      position: relative;
    }
    #cropper-canvas { display: block; }
    .upload-btn-wrapper { position: relative; overflow: hidden; display: inline-block; width: 100%; margin-bottom: 10px; }
    .btn-outline { border: 2px solid #FF7A00; color: #FF7A00; background-color: white; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; display: block; width: 100%; text-align: center; }
    .upload-btn-wrapper input[type=file] { font-size: 100px; position: absolute; left: 0; top: 0; opacity: 0; }
    #crop-btn { display: none; margin-bottom: 10px; background: #FF7A00; }
    #preview-container { display: none; margin: 15px auto; width: 180px; height: 214px; position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    #cropped-img { width: 100%; height: 100%; object-fit: cover; }
    #frame-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; z-index: 1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="lang-toggle">
      <button type="button" class="lang-btn active" id="en-btn">EN</button>
      <button type="button" class="lang-btn" id="ar-btn">AR</button>
    </div>
    <h1 id="title-text">👨‍🍳 Cook Registration</h1>
    <p class="subtitle" id="subtitle-text">Join our marketplace and start sharing your culinary expertise</p>
    <form id="registerForm">
      <div class="form-group">
        <label id="label-name">Full Name *</label>
        <input type="text" id="name" placeholder="e.g., Chef Ahmed" required>
      </div>
      <div class="form-group">
        <label id="label-email">Email *</label>
        <input type="email" id="email" placeholder="your@email.com" required>
      </div>
      <div class="form-group">
        <label id="label-phone">Phone *</label>
        <input type="text" id="phone" placeholder="10-digit phone number" required>
      </div>
      <div class="form-group">
        <label id="label-expertise">Area of Expertise *</label>
        <select id="expertise" required>
          <option value="" disabled selected>Select your expertise</option>
        </select>
      </div>
      
      <div class="form-group">
        <label id="label-photo">Profile Photo *</label>
        <div class="cropper-container">
          <div class="upload-btn-wrapper">
            <button type="button" class="btn-outline" id="choose-photo-btn">Choose Profile Photo</button>
            <input type="file" id="photoInput" accept="image/*">
          </div>
          
          <div id="canvas-wrapper">
            <canvas id="cropper-canvas"></canvas>
          </div>
          
          <div id="preview-container">
            <img id="cropped-img" src="" alt="Preview">
            <img id="frame-overlay" src="/assets/cooks/Ccard.png" alt="Frame">
          </div>
          
          <button type="button" id="crop-btn">Apply Frame</button>
        </div>
      </div>

      <div class="form-group">
        <label id="label-area">Location/Area</label>
        <input type="text" id="area" placeholder="e.g., Cairo, Giza">
      </div>
      <button type="submit" id="submit-btn">Register as Cook</button>
    </form>
    <div id="message"></div>
  </div>
  <script>
    let cropperState = null;
    let currentLang = 'en';
    
    const translations = {
      en: {
        title: "👨‍🍳 Cook Registration",
        subtitle: "Join our marketplace and start sharing your culinary expertise",
        name: "Full Name *",
        email: "Email *",
        phone: "Phone *",
        expertise: "Area of Expertise *",
        choosePhoto: "Choose Profile Photo",
        applyFrame: "Apply Frame",
        area: "Location/Area",
        submit: "Register as Cook",
        photoLabel: "Profile Photo *",
        selectExp: "Select your expertise",
        successMsg: "✅ Registration successful! Your profile is under review.",
        errorPhoto: "❌ Please upload and apply frame to your photo"
      },
      ar: {
        title: "👨‍🍳 تسجيل شيف جديد",
        subtitle: "انضم إلى سوقنا وابدأ في مشاركة خبراتك في الطهي",
        name: "الاسم الكامل *",
        email: "البريد الإلكتروني *",
        phone: "رقم الهاتف *",
        expertise: "مجال التخصص *",
        choosePhoto: "اختر صورة الشخصية",
        applyFrame: "تطبيق الإطار",
        area: "المنطقة / الموقع",
        submit: "سجل كشيف",
        photoLabel: "الصورة الشخصية *",
        selectExp: "اختر تخصصك",
        successMsg: "✅ تم التسجيل بنجاح! ملفك الشخصي قيد المراجعة.",
        errorPhoto: "❌ يرجى رفع الصورة وتطبيق الإطار"
      }
    };

    const expertiseOptions = {
      en: [
        { key: 'pastry_bakery', title: 'Pastry & Bakery' },
        { key: 'oriental_pastry', title: 'Oriental Pastry' },
        { key: 'appetizer_salad', title: 'Appetizer & Salad' },
        { key: 'meat', title: 'Meat' },
        { key: 'fish_seafood', title: 'Fish & Seafood' },
        { key: 'vegetable_vegetarian', title: 'Vegetable & Vegetarian' },
        { key: 'fast_food', title: 'Fast Food / Line Cook' },
        { key: 'multi_specialty', title: 'Multi-Specialty' }
      ],
      ar: [
        { key: 'pastry_bakery', title: 'المخبوزات والمعجنات' },
        { key: 'oriental_pastry', title: 'الحلويات الشرقية' },
        { key: 'appetizer_salad', title: 'المقبلات / السلطات' },
        { key: 'meat', title: 'شيف لحوم' },
        { key: 'fish_seafood', title: 'السمك والمأكولات البحرية' },
        { key: 'vegetable_vegetarian', title: 'شيف خضار / أطباق نباتية' },
        { key: 'fast_food', title: 'شيف أطباق سريعة / مطبخ سريع' },
        { key: 'multi_specialty', title: 'متعدد التخصصات' }
      ]
    };

    const canvas = document.getElementById('cropper-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const previewContainer = document.getElementById('preview-container');
    const cropBtn = document.getElementById('crop-btn');
    const photoInput = document.getElementById('photoInput');
    const croppedImg = document.getElementById('cropped-img');
    const frameImg = new Image();
    frameImg.src = '/assets/cooks/Ccard.png';
    frameImg.onload = () => { if (cropperState) redraw(); };

    function updateLanguage(lang) {
      currentLang = lang;
      document.getElementById('en-btn').classList.toggle('active', lang === 'en');
      document.getElementById('ar-btn').classList.toggle('active', lang === 'ar');
      document.dir = lang === 'ar' ? 'rtl' : 'ltr';
      
      const t = translations[lang];
      document.getElementById('title-text').innerText = t.title;
      document.getElementById('subtitle-text').innerText = t.subtitle;
      document.getElementById('label-name').innerText = t.name;
      document.getElementById('label-email').innerText = t.email;
      document.getElementById('label-phone').innerText = t.phone;
      document.getElementById('label-expertise').innerText = t.expertise;
      document.getElementById('label-photo').innerText = t.photoLabel;
      document.getElementById('label-area').innerText = t.area;
      document.getElementById('choose-photo-btn').innerText = t.choosePhoto;
      document.getElementById('crop-btn').innerText = t.applyFrame;
      document.getElementById('submit-btn').innerText = t.submit;
      
      const expSelect = document.getElementById('expertise');
      const currentVal = expSelect.value;
      expSelect.innerHTML = '<option value="" disabled ' + (!currentVal ? 'selected' : '') + '>' + t.selectExp + '</option>';
      expertiseOptions[lang].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.key;
        option.innerText = opt.title;
        if (opt.key === currentVal) option.selected = true;
        expSelect.appendChild(option);
      });
    }

    document.getElementById('en-btn').onclick = () => updateLanguage('en');
    document.getElementById('ar-btn').onclick = () => updateLanguage('ar');
    updateLanguage('en');

    const redraw = () => {
      if (!cropperState) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sw = cropperState.img.width * cropperState.scale;
      const sh = cropperState.img.height * cropperState.scale;
      ctx.drawImage(cropperState.img, cropperState.offsetX, cropperState.offsetY, sw, sh);
      if (frameImg.complete) {
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
      }
    };

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          canvasWrapper.style.display = 'block';
          previewContainer.style.display = 'none';
          cropBtn.style.display = 'block';
          
          const width = 180;
          const height = 214;
          canvas.width = width;
          canvas.height = height;

          cropperState = {
            img,
            offsetX: 0,
            offsetY: 0,
            scale: Math.max(width / img.width, height / img.height),
            isDragging: false,
            startX: 0,
            startY: 0,
            minScale: Math.max(width / img.width, height / img.height)
          };

          cropperState.offsetX = (width - img.width * cropperState.scale) / 2;
          cropperState.offsetY = (height - img.height * cropperState.scale) / 2;

          redraw();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    const handleMove = (ex, ey) => {
      if (cropperState && cropperState.isDragging) {
        cropperState.offsetX = ex - cropperState.startX;
        cropperState.offsetY = ey - cropperState.startY;
        
        const sw = cropperState.img.width * cropperState.scale;
        const sh = cropperState.img.height * cropperState.scale;
        cropperState.offsetX = Math.min(0, Math.max(canvas.width - sw, cropperState.offsetX));
        cropperState.offsetY = Math.min(0, Math.max(canvas.height - sh, cropperState.offsetY));
        redraw();
      }
    };

    canvas.onmousedown = (e) => {
      if (!cropperState) return;
      cropperState.isDragging = true;
      cropperState.startX = e.clientX - cropperState.offsetX;
      cropperState.startY = e.clientY - cropperState.offsetY;
    };

    canvas.ontouchstart = (e) => {
      if (!cropperState) return;
      e.preventDefault();
      cropperState.isDragging = true;
      const touch = e.touches[0];
      cropperState.startX = touch.clientX - cropperState.offsetX;
      cropperState.startY = touch.clientY - cropperState.offsetY;
    };

    window.onmousemove = (e) => handleMove(e.clientX, e.clientY);
    window.ontouchmove = (e) => {
      if (cropperState && cropperState.isDragging) e.preventDefault();
      const touch = e.touches ? e.touches[0] : null;
      if (touch) handleMove(touch.clientX, touch.clientY);
    };

    window.onmouseup = () => { if (cropperState) cropperState.isDragging = false; };
    window.ontouchend = () => { if (cropperState) cropperState.isDragging = false; };
    
    canvas.onwheel = (e) => {
      if (!cropperState) return;
      e.preventDefault();
      const oldScale = cropperState.scale;
      cropperState.scale += (e.deltaY > 0 ? -0.05 : 0.05);
      cropperState.scale = Math.max(cropperState.minScale, Math.min(3, cropperState.scale));
      
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ratio = cropperState.scale / oldScale;
      
      cropperState.offsetX = mx - (mx - cropperState.offsetX) * ratio;
      cropperState.offsetY = my - (my - cropperState.offsetY) * ratio;
      
      const sw = cropperState.img.width * cropperState.scale;
      const sh = cropperState.img.height * cropperState.scale;
      cropperState.offsetX = Math.min(0, Math.max(canvas.width - sw, cropperState.offsetX));
      cropperState.offsetY = Math.min(0, Math.max(canvas.height - sh, cropperState.offsetY));
      redraw();
    };

    cropBtn.onclick = () => {
      if (!cropperState) return;
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = 180;
      cropCanvas.height = 214;
      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(cropperState.img, cropperState.offsetX, cropperState.offsetY, cropperState.img.width * cropperState.scale, cropperState.img.height * cropperState.scale);
      
      croppedImg.src = cropCanvas.toDataURL('image/png');
      canvasWrapper.style.display = 'none';
      previewContainer.style.display = 'block';
      cropBtn.style.display = 'none';
    };

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageDiv = document.getElementById('message');
      const t = translations[currentLang];
      
      if (!cropperState || previewContainer.style.display === 'none') {
        messageDiv.className = 'error';
        messageDiv.innerHTML = t.errorPhoto;
        messageDiv.style.display = 'block';
        return;
      }

      const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        expertise: document.getElementById('expertise').value,
        area: document.getElementById('area').value || 'Not specified',
        profilePhoto: croppedImg.src
      };
      try {
        const response = await fetch('/api/cooks/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        messageDiv.className = result.success ? 'success' : 'error';
        messageDiv.innerHTML = result.success ? t.successMsg : ('❌ ' + (result.message || result.error));
        messageDiv.style.display = 'block';
        if (result.success) {
          document.getElementById('registerForm').reset();
          previewContainer.style.display = 'none';
          cropperState = null;
        }
      } catch (error) {
        messageDiv.className = 'error';
        messageDiv.innerHTML = '❌ Error: ' + error.message;
        messageDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>
`;

// Root route
app.get('/', (req, res) => {
  res.send(htmlForm);
});

// Serve static assets AFTER root route to prevent index.html hijacking
const workspaceRoot = '/Users/AhmedElbedeawy/Desktop/Marketplace Project';
const publicAssetsPath = path.join(workspaceRoot, 'client/web/public');
app.use(express.static(publicAssetsPath));
app.use('/assets', express.static(path.join(publicAssetsPath, 'assets')));

// API Routes
app.post('/api/cooks/register', (req, res) => {
  try {
    const { name, email, phone, expertise, area } = req.body;
    console.log('Cook registration received:', name);
    
    // Validate
    if (!name || !email || !phone || !expertise) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // In production, this would save to MongoDB via the main backend
    res.json({
      success: true,
      message: 'Cook registration successful! Your profile is under review.',
      data: { id: 'cook_' + Date.now(), name, email, expertise }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Cook Registration Server (Web) running on port 4000' });
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n✅ Cook Registration Server (Web) running on http://localhost:${PORT}`);
  console.log(`📱 Access: http://localhost:${PORT}\n`);
});

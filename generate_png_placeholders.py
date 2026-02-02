#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

# Directory where to save placeholder images
dishes_dir = "/Users/AhmedElbedeawy/Desktop/Marketplace Project/client/web/public/assets/dishes"

# Define placeholder images with their names and colors
placeholders = {
    "Placeholder M.png": ("#D4A574", "#8B6F47", "Molokhia"),  # Brown tones
    "Placeholder D.png": ("#8B4513", "#D2691E", "Duck"),  # Dark brown/chocolate
    "Placeholder W.png": ("#DAA520", "#B8860B", "Grape Leaves"),  # Gold tones
    "Placeholder S.png": ("#FF8C00", "#FF6347", "Tawook"),  # Orange/red
    "Placeholder F.png": ("#CD5C5C", "#8B3A3A", "Fattah"),  # Indian red
    "Placeholder K.png": ("#A0522D", "#654321", "Moussaka"),  # Sienna/brown
    "Placeholder H.png": ("#6B4423", "#3E2723", "Pigeon"),  # Deep brown
}

for filename, (color1, color2, label) in placeholders.items():
    # Create a new image with gradient
    img = Image.new('RGB', (300, 300), color1)
    draw = ImageDraw.Draw(img)
    
    # Draw gradient effect with rectangles
    for i in range(300):
        ratio = i / 300
        # Simple linear interpolation between two colors
        r1, g1, b1 = int(color1[1:3], 16), int(color1[3:5], 16), int(color1[5:7], 16)
        r2, g2, b2 = int(color2[1:3], 16), int(color2[3:5], 16), int(color2[5:7], 16)
        
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        
        draw.line([(0, i), (300, i)], fill=(r, g, b))
    
    # Add circles for visual interest
    draw.ellipse([50, 50, 120, 120], fill=(255, 255, 255, 50), outline=None)
    draw.ellipse([180, 150, 260, 220], fill=(255, 255, 255, 30), outline=None)
    
    # Save the image
    filepath = os.path.join(dishes_dir, filename)
    img.save(filepath)
    print(f"✓ Created {filename}")

print("\nAll placeholder PNG images created successfully!")

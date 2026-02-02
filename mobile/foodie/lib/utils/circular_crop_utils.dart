import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

/// Circular Image Cropping Utility for Flutter
/// Crops image to circular format matching Ccard.png dimensions
class CircularCropUtils {
  /// Default circle diameter in pixels
  static const double defaultDiameter = 200;

  /// Crop image to circular format
  /// Returns the cropped image file
  static Future<File> cropCircular(
    File imageFile, {
    double circleDiameter = defaultDiameter,
  }) async {
    final bytes = await imageFile.readAsBytes();
    final image = img.decodeImage(bytes);

    if (image == null) {
      throw Exception('Failed to decode image');
    }

    // Calculate dimensions
    final diameter = circleDiameter.toInt();

    // Get aspect ratio and calculate scaling
    final ratio = diameter / (image.width > image.height ? image.width : image.height).toDouble();
    final scaledWidth = (image.width * ratio).toInt();
    final scaledHeight = (image.height * ratio).toInt();

    // Create new image with circular background
    final croppedImage = img.Image(width: diameter, height: diameter);
    
    // Fill with white background
    img.fill(croppedImage, color: img.ColorRgba8(255, 255, 255, 255));

    // Scale image
    final scaled = img.copyResize(image,
        width: scaledWidth, height: scaledHeight, interpolation: img.Interpolation.linear);

    // Calculate offset to center the image
    final offsetX = ((diameter - scaledWidth) / 2).toInt();
    final offsetY = ((diameter - scaledHeight) / 2).toInt();

    // Composite scaled image onto the canvas
    img.compositeImage(croppedImage, scaled,
        dstX: offsetX, dstY: offsetY);

    // Apply circular mask
    final maskedImage = _applyCircularMask(croppedImage, diameter);

    // Save cropped image
    final outputPath = imageFile.path.replaceAll('.jpg', '_cropped.png').replaceAll('.jpeg', '_cropped.png');
    final outputFile = File(outputPath);
    await outputFile.writeAsBytes(img.encodePng(maskedImage));

    return outputFile;
  }

  /// Apply circular mask to image
  static img.Image _applyCircularMask(img.Image image, int diameter) {
    final center = diameter / 2;
    final radius = diameter / 2;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        // Calculate distance from center
        final dx = x - center;
        final dy = y - center;
        final distance = math.sqrt((dx * dx + dy * dy).toDouble());

        // If outside circle, make transparent
        if (distance > radius) {
          image.setPixelRgba(x, y, 0, 0, 0, 0);
        }
      }
    }

    return image;
  }

  /// Get cropped image as Uint8List
  static Future<Uint8List> cropCircularToBytes(
    File imageFile, {
    double circleDiameter = defaultDiameter,
  }) async {
    final croppedFile = await cropCircular(imageFile, circleDiameter: circleDiameter);
    return await croppedFile.readAsBytes();
  }

  /// Create a preview widget for the cropper
  static Widget createCropperPreview({
    required ImageProvider imageProvider,
    required double circleDiameter,
    required Function(String dataUrl) onCropComplete,
    Color overlayColor = const Color(0xFF000000),
    double overlayOpacity = 0.3,
  }) {
    return CropperPreviewWidget(
      imageProvider: imageProvider,
      circleDiameter: circleDiameter,
      onCropComplete: onCropComplete,
      overlayColor: overlayColor,
      overlayOpacity: overlayOpacity,
    );
  }
}

/// Interactive Cropper Preview Widget
class CropperPreviewWidget extends StatefulWidget {
  final ImageProvider imageProvider;
  final double circleDiameter;
  final Function(String dataUrl) onCropComplete;
  final Color overlayColor;
  final double overlayOpacity;

  const CropperPreviewWidget({
    Key? key,
    required this.imageProvider,
    required this.circleDiameter,
    required this.onCropComplete,
    this.overlayColor = const Color(0xFF000000),
    this.overlayOpacity = 0.3,
  }) : super(key: key);

  @override
  State<CropperPreviewWidget> createState() => _CropperPreviewWidgetState();
}

class _CropperPreviewWidgetState extends State<CropperPreviewWidget> {
  late ImageStream _imageStream;
  ImageStreamListener? _imageStreamListener;
  ui.Image? _uiImage;
  Offset _offset = Offset.zero;
  double _scale = 1;
  final double _minScale = 0.5;
  final double _maxScale = 5;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  void _loadImage() {
    _imageStream = widget.imageProvider.resolve(ImageConfiguration.empty);
    _imageStreamListener = ImageStreamListener((ImageInfo image, bool synchronousCall) {
      setState(() {
        _uiImage = image.image;
        _scale = 1.0;
        _offset = Offset.zero;
      });
    });
    _imageStream.addListener(_imageStreamListener!);
  }

  @override
  void dispose() {
    if (_imageStreamListener != null) {
      _imageStream.removeListener(_imageStreamListener!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Cropper Canvas
        Container(
          width: widget.circleDiameter,
          height: widget.circleDiameter,
          decoration: BoxDecoration(
            color: Colors.grey[300],
            borderRadius: BorderRadius.circular(widget.circleDiameter / 2),
          ),
          child: _uiImage != null
              ? GestureDetector(
                  onPanUpdate: (details) {
                    setState(() {
                      _offset += details.delta;
                    });
                  },
                  onLongPressMoveUpdate: (details) {
                    setState(() {
                      final centerDy = (context.findRenderObject() as RenderBox).size.height / 2;
                      final scaleChange = details.globalPosition.dy > centerDy
                          ? 0.01
                          : -0.01;
                      _scale = (_scale + scaleChange).clamp(_minScale, _maxScale);
                    });
                  },
                  child: CustomPaint(
                    painter: CircularCropPainter(
                      image: _uiImage!,
                      offset: _offset,
                      scale: _scale,
                      circleDiameter: widget.circleDiameter,
                      overlayColor: widget.overlayColor,
                      overlayOpacity: widget.overlayOpacity,
                    ),
                    size: Size(widget.circleDiameter, widget.circleDiameter),
                  ),
                )
              : const Center(child: CircularProgressIndicator()),
        ),
        const SizedBox(height: 16),
        // Controls
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _scale = (_scale - 0.1).clamp(_minScale, _maxScale);
                });
              },
              child: const Text('Zoom Out'),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _scale = (_scale + 0.1).clamp(_minScale, _maxScale);
                });
              },
              child: const Text('Zoom In'),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _offset = Offset.zero;
                  _scale = 1.0;
                });
              },
              child: const Text('Reset'),
            ),
          ],
        ),
      ],
    );
  }
}

/// Custom Painter for Circular Crop
class CircularCropPainter extends CustomPainter {
  final ui.Image image;
  final Offset offset;
  final double scale;
  final double circleDiameter;
  final Color overlayColor;
  final double overlayOpacity;

  CircularCropPainter({
    required this.image,
    required this.offset,
    required this.scale,
    required this.circleDiameter,
    required this.overlayColor,
    required this.overlayOpacity,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final radius = circleDiameter / 2;
    final center = Offset(radius, radius);

    // Draw image with transformation
    canvas.save();
    
    // Calculate image dimensions
    final imgAspectRatio = image.width / image.height;
    final canvasAspectRatio = size.width / size.height;
    
    late double displayWidth;
    late double displayHeight;
    
    if (imgAspectRatio > canvasAspectRatio) {
      displayHeight = size.height * scale;
      displayWidth = displayHeight * imgAspectRatio;
    } else {
      displayWidth = size.width * scale;
      displayHeight = displayWidth / imgAspectRatio;
    }

    // Apply offset and draw image
    canvas.translate(offset.dx, offset.dy);
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble()),
      Rect.fromLTWH(
        (size.width - displayWidth) / 2,
        (size.height - displayHeight) / 2,
        displayWidth,
        displayHeight,
      ),
      Paint(),
    );
    
    canvas.restore();

    // Draw circle outline
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0xFFFF7A00)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke,
    );

    // Draw overlay outside circle
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = overlayColor.withValues(alpha: overlayOpacity)
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(CircularCropPainter oldDelegate) {
    return oldDelegate.offset != offset || oldDelegate.scale != scale;
  }
}


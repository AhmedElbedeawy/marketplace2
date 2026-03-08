import 'dart:convert';
import 'package:flutter/material.dart';
import '../config/api_config.dart';

/// Convert relative URLs to absolute URLs for uploaded assets
/// Handles /uploads/ paths and other relative paths
String getAbsoluteUrl(String? relativeUrl) {
  final raw = (relativeUrl ?? '').trim();
  if (raw.isEmpty) return raw;

  // Base64 data URLs - NEVER prefix with API host
  if (raw.startsWith('data:image/')) return raw;

  // Already absolute URL
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  // Asset paths
  if (raw.startsWith('assets/')) return raw;

  // Uploaded paths - prepend API host
  if (raw.startsWith('/uploads/')) return 'https://api.eltekkeya.com$raw';
  if (raw.startsWith('uploads/')) return 'https://api.eltekkeya.com/$raw';

  return raw;
}

/// Check if a URL is an uploaded asset path
bool isUploadPath(String? url) {
  if (url == null || url.isEmpty) return false;
  return url.startsWith('/uploads/');
}

/// Check if URL is a base64 data URL
bool isBase64Image(String? url) {
  if (url == null || url.isEmpty) return false;
  return url.startsWith('data:image/');
}

/// Get ImageProvider for any URL type (network, asset, base64)
/// Returns appropriate ImageProvider based on URL type
ImageProvider getImageProvider(String? url) {
  if (url == null || url.isEmpty) {
    return const AssetImage('assets/icons/Profile.png');
  }
  
  // Check for known demo placeholder filenames - treat as placeholder
  final lowerUrl = url.toLowerCase();
  if (lowerUrl.contains('k1.png') || lowerUrl.contains('c1.png') || 
      lowerUrl.contains('profile.png') || lowerUrl.contains('avatar.png') ||
      lowerUrl.contains('default.png') || lowerUrl.contains('placeholder.png')) {
    return const AssetImage('assets/icons/Profile.png');
  }
  
  // Additional check: if URL path contains only demo filename without extension
  if (lowerUrl == 'k1' || lowerUrl == 'c1' || 
      lowerUrl.endsWith('/k1') || lowerUrl.endsWith('/c1') ||
      lowerUrl.endsWith('/k1.png') || lowerUrl.endsWith('/c1.png')) {
    return const AssetImage('assets/icons/Profile.png');
  }
  
  // Base64 data URL → Image.memory
  if (url.startsWith('data:image/')) {
    try {
      final base64Data = url.split(',').last;
      return MemoryImage(base64Decode(base64Data));
    } catch (e) {
      return const AssetImage('assets/icons/Profile.png');
    }
  }
  
  // HTTP URL → NetworkImage with cache busting for uploads
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Add timestamp query parameter to bust cache for uploaded images
    if (url.contains('/uploads/')) {
      final separator = url.contains('?') ? '&' : '?';
      return NetworkImage('$url${separator}t=${DateTime.now().millisecondsSinceEpoch}');
    }
    return NetworkImage(url);
  }
  
  // /uploads path → NetworkImage with API prefix
  if (url.startsWith('/uploads/')) {
    return NetworkImage(getAbsoluteUrl(url));
  }
  
  // Asset path
  if (url.startsWith('assets/')) {
    return AssetImage(url);
  }
  
  // Default to placeholder
  return const AssetImage('assets/icons/Profile.png');
}

/// Smart image widget that handles all URL types automatically
class SmartImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;
  
  const SmartImage({
    super.key,
    this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  });
  
  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    
    // Handle null/empty
    if (url == null || url.isEmpty) {
      return placeholder ?? _buildPlaceholder();
    }
    
    // Base64 data URL → Image.memory
    if (url.startsWith('data:image/')) {
      try {
        final base64Data = url.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, __, ___) => errorWidget ?? _buildPlaceholder(),
        );
      } catch (e) {
        return errorWidget ?? _buildPlaceholder();
      }
    }
    
    // HTTP URL → Image.network
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return Image.network(
        url,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return placeholder ?? _buildPlaceholder();
        },
        errorBuilder: (_, __, ___) => errorWidget ?? _buildPlaceholder(),
      );
    }
    
    // /uploads path → Image.network with API prefix
    if (url.startsWith('/uploads/')) {
      final resolvedUrl = getAbsoluteUrl(url);
      return Image.network(
        resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return placeholder ?? _buildPlaceholder();
        },
        errorBuilder: (_, __, ___) => errorWidget ?? _buildPlaceholder(),
      );
    }
    
    // uploads/ path (without leading slash)
    if (url.startsWith('uploads/')) {
      final resolvedUrl = getAbsoluteUrl(url);
      return Image.network(
        resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return placeholder ?? _buildPlaceholder();
        },
        errorBuilder: (_, __, ___) => errorWidget ?? _buildPlaceholder(),
      );
    }
    
    // Asset path
    if (url.startsWith('assets/')) {
      return Image.asset(
        url,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => errorWidget ?? _buildPlaceholder(),
      );
    }
    
    // Default
    return placeholder ?? _buildPlaceholder();
  }
  
  Widget _buildPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: Colors.grey[200],
      child: const Icon(Icons.image, color: Colors.grey),
    );
  }
}
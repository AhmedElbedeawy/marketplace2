import '../config/api_config.dart';

/// Convert relative URLs to absolute URLs for uploaded assets
/// Handles /uploads/ paths and other relative paths
String getAbsoluteUrl(String? relativeUrl) {
  if (relativeUrl == null || relativeUrl.isEmpty) {
    return '';
  }
  
  // Already absolute URL
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  
  // Uploaded icon path - prepend static base URL
  if (relativeUrl.startsWith('/uploads/')) {
    return '${ApiConfig.staticBaseUrl}$relativeUrl';
  }
  
  // Relative path that's not an upload - return as-is
  return relativeUrl;
}

/// Check if a URL is an uploaded asset path
bool isUploadPath(String? url) {
  if (url == null || url.isEmpty) return false;
  return url.startsWith('/uploads/');
}

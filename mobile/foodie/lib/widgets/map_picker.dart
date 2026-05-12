import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';

/// A place suggestion returned by the backend proxy.
class _PlaceSuggestion {
  final String placeId;
  final String description;

  const _PlaceSuggestion({required this.placeId, required this.description});
}

class MapPicker extends StatefulWidget {
  final double initialLat;
  final double initialLng;
  final String title;

  const MapPicker({
    Key? key,
    this.initialLat = 24.7136,
    this.initialLng = 46.6753,
    this.title = 'Pick Location',
  }) : super(key: key);

  @override
  State<MapPicker> createState() => _MapPickerState();
}

class _MapPickerState extends State<MapPicker> {
  late LatLng _selectedLocation;
  final Completer<GoogleMapController> _mapController = Completer();
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();

  List<_PlaceSuggestion> _suggestions = [];
  bool _isFetchingSuggestions = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _selectedLocation = LatLng(widget.initialLat, widget.initialLng);
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  // ── Autocomplete ────────────────────────────────────────────────────────────

  void _onSearchChanged() {
    _debounce?.cancel();
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() => _suggestions = []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 600), () => _fetchSuggestions(query));
  }

  Future<void> _fetchSuggestions(String input) async {
    setState(() => _isFetchingSuggestions = true);
    try {
      final uri = Uri.parse(ApiConfig.placesAutocomplete())
          .replace(queryParameters: {'input': input, 'language': 'en'});

      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final predictions = (data['predictions'] as List? ?? []);
        setState(() {
          _suggestions = predictions
              .map((p) => _PlaceSuggestion(
                    placeId: p['place_id'] as String? ?? '',
                    description: p['description'] as String? ?? '',
                  ))
              .where((s) => s.placeId.isNotEmpty)
              .toList();
        });
      } else {
        debugPrint('[MapPicker] Autocomplete error ${response.statusCode}: ${response.body}');
        setState(() => _suggestions = []);
      }
    } catch (e) {
      debugPrint('[MapPicker] Autocomplete exception: $e');
      if (mounted) setState(() => _suggestions = []);
    } finally {
      if (mounted) setState(() => _isFetchingSuggestions = false);
    }
  }

  Future<void> _onSuggestionTap(_PlaceSuggestion suggestion) async {
    // Fill the search field and clear dropdown
    _searchController.text = suggestion.description;
    _searchController.selection = TextSelection.fromPosition(
      TextPosition(offset: suggestion.description.length),
    );
    setState(() => _suggestions = []);
    _searchFocus.unfocus();

    // Fetch lat/lng from details proxy
    try {
      final uri = Uri.parse(ApiConfig.placesDetails())
          .replace(queryParameters: {'place_id': suggestion.placeId});

      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final location =
            data['result']?['geometry']?['location'] as Map<String, dynamic>?;
        if (location != null) {
          final lat = (location['lat'] as num).toDouble();
          final lng = (location['lng'] as num).toDouble();
          await _updateLocation(LatLng(lat, lng));
        }
      } else {
        debugPrint('[MapPicker] Details error ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      debugPrint('[MapPicker] Details exception: $e');
    }
  }

  // ── Map helpers ─────────────────────────────────────────────────────────────

  void _onMapTap(LatLng location) {
    // Clear the search field when user taps the map directly
    _searchController.clear();
    setState(() {
      _selectedLocation = location;
      _suggestions = [];
    });
  }

  Future<void> _updateLocation(LatLng location) async {
    setState(() => _selectedLocation = location);
    final controller = await _mapController.future;
    controller.animateCamera(CameraUpdate.newLatLngZoom(location, 15));
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, _selectedLocation),
            child: const Text(
              'Confirm',
              style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // ── Native map (uses Android/iOS SDK key from Manifest / Info.plist) ──
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _selectedLocation, zoom: 15),
            onMapCreated: (controller) => _mapController.complete(controller),
            onTap: _onMapTap,
            markers: {
              Marker(
                markerId: const MarkerId('selected_pin'),
                position: _selectedLocation,
                draggable: true,
                onDragEnd: (pos) => setState(() => _selectedLocation = pos),
              ),
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: true,
            mapToolbarEnabled: false,
          ),

          // ── Search bar + suggestions dropdown ──────────────────────────────
          Positioned(
            top: 10,
            left: 15,
            right: 15,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Search text field
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.12),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocus,
                    decoration: InputDecoration(
                      hintText: 'Search for a place…',
                      border: InputBorder.none,
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      suffixIcon: _isFetchingSuggestions
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : (_searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, color: Colors.grey),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _suggestions = []);
                                  },
                                )
                              : null),
                    ),
                  ),
                ),

                // Suggestions list
                if (_suggestions.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 2),
                    constraints: const BoxConstraints(maxHeight: 220),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: _suggestions.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, indent: 16, endIndent: 16),
                      itemBuilder: (context, index) {
                        final s = _suggestions[index];
                        return ListTile(
                          dense: true,
                          leading:
                              const Icon(Icons.location_on_outlined, color: Colors.grey),
                          title: Text(
                            s.description,
                            style: const TextStyle(fontSize: 13),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () => _onSuggestionTap(s),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

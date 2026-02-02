import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_places_flutter/google_places_flutter.dart';
import 'package:google_places_flutter/model/prediction.dart';
import 'package:geocoding/geocoding.dart';
import '../../config/theme.dart';

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
  final Completer<GoogleMapController> _controller = Completer();
  final TextEditingController _searchController = TextEditingController();
  
  // Use a dummy key if not provided via dart-define
  final String _googleMapsApiKey = const String.fromEnvironment('GOOGLE_MAPS_API_KEY', defaultValue: 'YOUR_GOOGLE_MAPS_API_KEY');

  @override
  void initState() {
    super.initState();
    _selectedLocation = LatLng(widget.initialLat, widget.initialLng);
  }

  void _onMapTap(LatLng location) {
    setState(() {
      _selectedLocation = location;
    });
  }

  Future<void> _onPlaceSelected(Prediction prediction) async {
    if (prediction.lat != null && prediction.lng != null) {
      final lat = double.parse(prediction.lat!);
      final lng = double.parse(prediction.lng!);
      _updateLocation(LatLng(lat, lng));
    } else {
      // If lat/lng not in prediction, fetch it
      try {
        final locations = await locationFromAddress(prediction.description!);
        if (locations.isNotEmpty) {
          _updateLocation(LatLng(locations.first.latitude, locations.first.longitude));
        }
      } catch (e) {
        debugPrint('Error fetching location: $e');
      }
    }
  }

  Future<void> _updateLocation(LatLng location) async {
    setState(() {
      _selectedLocation = location;
    });
    final GoogleMapController controller = await _controller.future;
    controller.animateCamera(CameraUpdate.newLatLngZoom(location, 15));
  }

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
            onPressed: () {
              Navigator.pop(context, _selectedLocation);
            },
            child: const Text(
              'Confirm',
              style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _selectedLocation,
              zoom: 15,
            ),
            onMapCreated: (GoogleMapController controller) {
              _controller.complete(controller);
            },
            onTap: _onMapTap,
            markers: {
              Marker(
                markerId: const MarkerId('selected_pin'),
                position: _selectedLocation,
                draggable: true,
                onDragEnd: (newPosition) {
                  setState(() {
                    _selectedLocation = newPosition;
                  });
                },
              ),
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: true,
            mapToolbarEnabled: false,
          ),
          Positioned(
            top: 10,
            left: 15,
            right: 15,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: GooglePlaceAutoCompleteTextField(
                textEditingController: _searchController,
                googleAPIKey: _googleMapsApiKey,
                inputDecoration: const InputDecoration(
                  hintText: 'Search for a place...',
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 15, vertical: 15),
                  prefixIcon: Icon(Icons.search, color: Colors.grey),
                ),
                debounceTime: 800,
                isLatLngRequired: true,
                getPlaceDetailWithLatLng: (Prediction prediction) {
                  _onPlaceSelected(prediction);
                },
                itemClick: (Prediction prediction) {
                  _searchController.text = prediction.description!;
                  _searchController.selection = TextSelection.fromPosition(
                    TextPosition(offset: prediction.description!.length),
                  );
                },
                seperatedBuilder: const Divider(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

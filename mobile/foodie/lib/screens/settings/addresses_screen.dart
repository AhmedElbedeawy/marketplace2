import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/address.dart';
import '../../widgets/map_picker.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({Key? key}) : super(key: key);

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) {
        context.read<AddressProvider>().fetchAddresses();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final addressProvider = context.watch<AddressProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isRTL ? 'العناوين المحفوظة' : 'Saved Addresses',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppTheme.accentColor),
            onPressed: () {
              _showAddressForm(context, isRTL);
            },
          ),
        ],
      ),
      body: addressProvider.isLoading && addressProvider.addresses.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => addressProvider.fetchAddresses(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: addressProvider.addresses.length,
                itemBuilder: (context, index) {
                  final address = addressProvider.addresses[index];
                  return _buildAddressCard(context, isRTL, address);
                },
              ),
            ),
    );
  }

  Widget _buildAddressCard(BuildContext context, bool isRTL, Address address) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: address.isDefault
            ? Border.all(color: AppTheme.accentColor, width: 2)
            : Border.all(color: AppTheme.dividerColor.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                address.label.toLowerCase() == 'home'
                    ? Icons.home
                    : address.label.toLowerCase() == 'work'
                        ? Icons.work
                        : Icons.location_on,
                color: AppTheme.accentColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                address.label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const Spacer(),
              if (address.isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isRTL ? 'افتراضي' : 'Default',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.accentColor,
                    ),
                  ),
                )
              else
                TextButton(
                  onPressed: () => context
                      .read<AddressProvider>()
                      .setDefaultAddress(address.id),
                  child: Text(isRTL ? 'تعيين كافتراضي' : 'Set Default'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${address.addressLine1}${address.addressLine2 != null ? ", ${address.addressLine2}" : ""}\n${address.city}, ${address.countryCode}',
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showAddressForm(context, isRTL, address: address),
                  icon: const Icon(Icons.edit, size: 16),
                  label: Text(isRTL ? 'تعديل' : 'Edit'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.textPrimary,
                    side: const BorderSide(color: AppTheme.dividerColor),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showDeleteDialog(context, isRTL, address.id),
                  icon: const Icon(Icons.delete_outline, size: 16),
                  label: Text(isRTL ? 'حذف' : 'Delete'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAddressForm(BuildContext context, bool isRTL, {Address? address}) {
    final isEdit = address != null;
    final labelController = TextEditingController(text: address?.label ?? 'Home');
    final line1Controller = TextEditingController(text: address?.addressLine1 ?? '');
    final line2Controller = TextEditingController(text: address?.addressLine2 ?? '');
    final cityController = TextEditingController(text: address?.city ?? '');
    final countryController = TextEditingController(text: address?.countryCode ?? 'SA');
    double lat = address?.lat ?? 24.7136;
    double lng = address?.lng ?? 46.6753;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(
            isEdit
                ? (isRTL ? 'تعديل العنوان' : 'Edit Address')
                : (isRTL ? 'إضافة عنوان جديد' : 'Add New Address'),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: labelController,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'التصنيف' : 'Label',
                    prefixIcon: const Icon(Icons.label_outline),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: line1Controller,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'العنوان - السطر 1' : 'Address Line 1',
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: line2Controller,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'العنوان - السطر 2' : 'Address Line 2',
                    prefixIcon: const Icon(Icons.location_on_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: cityController,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'المدينة' : 'City',
                    prefixIcon: const Icon(Icons.location_city),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: countryController,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'رمز البلد' : 'Country Code',
                    prefixIcon: const Icon(Icons.flag_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () async {
                    final LatLng? result = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => MapPicker(
                          initialLat: lat,
                          initialLng: lng,
                          title: isRTL ? 'اختر الموقع' : 'Pick Location',
                        ),
                      ),
                    );

                    if (result != null) {
                      setDialogState(() {
                        lat = result.latitude;
                        lng = result.longitude;
                      });
                    }
                  },
                  icon: const Icon(Icons.map),
                  label: Text(isRTL ? 'تحديد على الخريطة' : 'Pick on Map'),
                ),
                Text('Lat: ${lat.toStringAsFixed(6)}, Lng: ${lng.toStringAsFixed(6)}',
                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(isRTL ? 'إلغاء' : 'Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final newAddress = Address(
                  id: address?.id ?? '',
                  label: labelController.text,
                  addressLine1: line1Controller.text,
                  addressLine2: line2Controller.text,
                  city: cityController.text,
                  countryCode: countryController.text,
                  lat: lat,
                  lng: lng,
                  isDefault: address?.isDefault ?? false,
                );

                bool success = false;
                if (isEdit) {
                  success = await context
                      .read<AddressProvider>()
                      .updateAddress(address.id, newAddress);
                } else {
                  success = await context.read<AddressProvider>().addAddress(newAddress);
                }

                if (success && context.mounted) {
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentColor,
                foregroundColor: Colors.white,
              ),
              child: Text(isRTL ? 'حفظ' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, bool isRTL, String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'حذف العنوان' : 'Delete Address'),
        content: Text(
          isRTL
              ? 'هل أنت متأكد من حذف هذا العنوان؟'
              : 'Are you sure you want to delete this address?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final success = await context.read<AddressProvider>().deleteAddress(id);
              if (success && context.mounted) {
                Navigator.pop(context);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(isRTL ? 'حذف' : 'Delete'),
          ),
        ],
      ),
    );
  }
}


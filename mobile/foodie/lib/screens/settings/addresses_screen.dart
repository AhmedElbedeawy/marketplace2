import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/address_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/address.dart';
import '../../widgets/map_picker.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({Key? key}) : super(key: key);

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final ScrollController _scrollController = ScrollController();

  bool _showInlineForm = false;
  Address? _editingAddress;

  // Form controllers — non-null only while _showInlineForm == true
  TextEditingController? _line1Controller;
  TextEditingController? _line2Controller;
  TextEditingController? _cityController;
  TextEditingController? _deliveryNotesController;
  String _selectedLabel = 'Home';
  String _selectedCountryCode = 'SA';
  double _formLat = 24.7136;
  double _formLng = 46.6753;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) context.read<AddressProvider>().fetchAddresses();
    });
  }

  @override
  void dispose() {
    _disposeFormControllers();
    _scrollController.dispose();
    super.dispose();
  }

  void _disposeFormControllers() {
    _line1Controller?.dispose();
    _line2Controller?.dispose();
    _cityController?.dispose();
    _deliveryNotesController?.dispose();
    _line1Controller = null;
    _line2Controller = null;
    _cityController = null;
    _deliveryNotesController = null;
  }

  void _openForm({Address? address}) {
    _disposeFormControllers();
    setState(() {
      _editingAddress = address;
      _showInlineForm = true;
      _selectedLabel = address?.label ?? 'Home';
      _selectedCountryCode = address?.countryCode ?? 'SA';
      _line1Controller = TextEditingController(text: address?.addressLine1 ?? '');
      _line2Controller = TextEditingController(text: address?.addressLine2 ?? '');
      _cityController = TextEditingController(text: address?.city ?? '');
      _deliveryNotesController = TextEditingController(text: address?.deliveryNotes ?? '');
      // Treat (0,0) as "no location selected" — default to Riyadh centre so the
      // map picker opens somewhere sensible rather than the middle of the ocean.
      final rawLat = address?.lat ?? 0.0;
      final rawLng = address?.lng ?? 0.0;
      _formLat = (rawLat == 0.0 && rawLng == 0.0) ? 24.7136 : rawLat;
      _formLng = (rawLat == 0.0 && rawLng == 0.0) ? 46.6753 : rawLng;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _closeForm() {
    _disposeFormControllers();
    setState(() {
      _showInlineForm = false;
      _editingAddress = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final addressProvider = context.watch<AddressProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      isRTL ? 'العناوين المحفوظة' : 'Saved Addresses',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _openForm(),
                    child: const Icon(Icons.add, color: AppTheme.accentColor, size: 24),
                  ),
                ],
              ),
            ),
            Expanded(
              child: addressProvider.isLoading && addressProvider.addresses.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: () => addressProvider.fetchAddresses(),
                      child: ListView(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                        children: [
                          ...addressProvider.addresses.map(
                            (address) => _buildAddressCard(context, isRTL, address),
                          ),
                          if (_showInlineForm)
                            _buildInlineForm(context, isRTL),
                        ],
                      ),
                    ),
            ),
          ],
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
                  onPressed: () async {
                    final token = context.read<AuthProvider>().token;
                    if (token != null) {
                      await context.read<AddressProvider>().setDefaultAddress(token, address.id);
                      context.read<AddressProvider>().fetchAddresses();
                    }
                  },
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
                  onPressed: () => _openForm(address: address),
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

  Widget _buildInlineForm(BuildContext context, bool isRTL) {
    final isEdit = _editingAddress != null;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.accentColor.withValues(alpha: 0.4)),
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
          Text(
            isEdit
                ? (isRTL ? 'تعديل العنوان' : 'Edit Address')
                : (isRTL ? 'إضافة عنوان جديد' : 'Add New Address'),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          // Address Line 1
          _formField(
            controller: _line1Controller!,
            label: isRTL ? 'سطر العنوان الأول' : 'Address Line 1',
            hint: isRTL ? 'أدخل العنوان' : 'Enter address',
          ),
          const SizedBox(height: 12),
          // Address Line 2 (Optional)
          _formField(
            controller: _line2Controller!,
            label: isRTL ? 'سطر العنوان الثاني (اختياري)' : 'Address Line 2 (Optional)',
            hint: isRTL ? 'شقة، طابق...' : 'Apt, Floor, etc.',
          ),
          const SizedBox(height: 12),
          // City
          _formField(
            controller: _cityController!,
            label: isRTL ? 'المدينة' : 'City',
            hint: isRTL ? 'أدخل المدينة' : 'Enter city',
          ),
          const SizedBox(height: 12),
          // Country dropdown (before Label — unified order: Line1/Line2/City/Country/Label/Notes/Map)
          Text(
            isRTL ? 'الدولة' : 'Country',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _selectedCountryCode,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
            items: [
              DropdownMenuItem(value: 'SA', child: Text(isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia')),
              DropdownMenuItem(value: 'AE', child: Text(isRTL ? 'الإمارات' : 'UAE')),
              DropdownMenuItem(value: 'EG', child: Text(isRTL ? 'مصر' : 'Egypt')),
              DropdownMenuItem(value: 'KW', child: Text(isRTL ? 'الكويت' : 'Kuwait')),
            ],
            onChanged: (v) => setState(() => _selectedCountryCode = v ?? 'SA'),
          ),
          const SizedBox(height: 12),
          // Label dropdown
          Text(
            isRTL ? 'التصنيف' : 'Label',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: _selectedLabel,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
            items: [
              DropdownMenuItem(value: 'Home', child: Text(isRTL ? 'المنزل' : 'Home')),
              DropdownMenuItem(value: 'Work', child: Text(isRTL ? 'العمل' : 'Work')),
              DropdownMenuItem(value: 'Other', child: Text(isRTL ? 'أخرى' : 'Other')),
            ],
            onChanged: (v) => setState(() => _selectedLabel = v ?? 'Home'),
          ),
          const SizedBox(height: 12),
          // Delivery Notes (Optional)
          _formField(
            controller: _deliveryNotesController!,
            label: isRTL ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)',
            hint: isRTL ? 'أي تعليمات خاصة...' : 'Any special instructions...',
            maxLines: 3,
            keyboardType: TextInputType.multiline,
          ),
          const SizedBox(height: 12),
          // Select Location on Map
          GestureDetector(
            onTap: () async {
              final LatLng? result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => MapPicker(
                    initialLat: _formLat,
                    initialLng: _formLng,
                    title: isRTL ? 'اختر الموقع' : 'Select Location',
                  ),
                ),
              );
              if (result != null && mounted) {
                setState(() {
                  _formLat = result.latitude;
                  _formLng = result.longitude;
                });
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE0E0E0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.map_outlined, color: Color(0xFF6B7280), size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      (_formLat != 24.7136 || _formLng != 46.6753)
                          ? '${_formLat.toStringAsFixed(4)}, ${_formLng.toStringAsFixed(4)}'
                          : (isRTL ? 'اختر الموقع على الخريطة' : 'Select Location on Map'),
                      style: TextStyle(
                        fontSize: 14,
                        color: (_formLat != 24.7136 || _formLng != 46.6753)
                            ? AppTheme.textPrimary
                            : const Color(0xFF9E9E9E),
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Color(0xFF9E9E9E), size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _closeForm,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(isRTL ? 'إلغاء' : 'Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () async {
                    final token = context.read<AuthProvider>().token;
                    if (token == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Authentication required')),
                      );
                      return;
                    }
                    bool success = false;
                    if (isEdit) {
                      success = await context.read<AddressProvider>().updateAddress(
                        token: token,
                        id: _editingAddress!.id,
                        addressLine1: _line1Controller!.text,
                        addressLine2: _line2Controller!.text.isEmpty ? null : _line2Controller!.text,
                        city: _cityController!.text,
                        countryCode: _selectedCountryCode,
                        label: _selectedLabel,
                        deliveryNotes: _deliveryNotesController!.text.isEmpty ? null : _deliveryNotesController!.text,
                        lat: _formLat,
                        lng: _formLng,
                      );
                    } else {
                      final newAddr = await context.read<AddressProvider>().createAddress(
                        token: token,
                        addressLine1: _line1Controller!.text,
                        addressLine2: _line2Controller!.text.isEmpty ? null : _line2Controller!.text,
                        city: _cityController!.text,
                        countryCode: _selectedCountryCode,
                        label: _selectedLabel,
                        deliveryNotes: _deliveryNotesController!.text.isEmpty ? null : _deliveryNotesController!.text,
                        lat: _formLat,
                        lng: _formLng,
                      );
                      success = newAddr != null;
                    }
                    if (success && mounted) {
                      _closeForm();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(isRTL ? 'حفظ' : 'Save'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _formField({
    required TextEditingController controller,
    required String label,
    String? hint,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          minLines: 1,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF9E9E9E)),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
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
              final token = context.read<AuthProvider>().token;
              if (token != null) {
                final success = await context.read<AddressProvider>().deleteAddress(token, id);
                if (success && context.mounted) {
                  Navigator.pop(context);
                }
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

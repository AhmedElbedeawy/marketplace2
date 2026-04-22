import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/food_provider.dart';
import 'refine_action_sheet.dart';

class RefineButton extends StatelessWidget {
  final VoidCallback? onApply;
  final bool isMenuPage;

  const RefineButton({
    Key? key,
    this.onApply,
    this.isMenuPage = false,
  }) : super(key: key);

  void _showRefineActionSheet(BuildContext context) {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      builder: (bottomSheetContext) => RefineActionSheet(
        categories: foodProvider.categories.map((c) => c.name).toList(),
        onApply: () {
          // RefineActionSheet already pops itself in _applyFilters()
          // Just call the callback (Menu page: empty, Home page: may refresh)
          if (onApply != null) {
            onApply!();
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showRefineActionSheet(context),
      child: Container(
        height: 44,
        width: 44,
        decoration: BoxDecoration(
          color: const Color(0xFFFF7A00),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: const Icon(Icons.tune, color: Colors.white, size: 22),
      ),
    );
  }
}

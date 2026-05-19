import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/food_provider.dart';
import 'refine_action_sheet.dart';

class RefineButton extends StatefulWidget {
  final VoidCallback? onApply;
  final bool isMenuPage;
  final Future<bool> Function()? beforeTap;

  const RefineButton({
    Key? key,
    this.onApply,
    this.isMenuPage = false,
    this.beforeTap,
  }) : super(key: key);

  @override
  State<RefineButton> createState() => _RefineButtonState();
}

class _RefineButtonState extends State<RefineButton> {
  bool _isOpen = false;

  void _showRefineActionSheet(BuildContext context) {
    if (_isOpen) return;
    setState(() => _isOpen = true);

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
          if (widget.onApply != null) {
            widget.onApply!();
          }
        },
      ),
    ).whenComplete(() {
      if (mounted) setState(() => _isOpen = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        if (widget.beforeTap != null) {
          final ok = await widget.beforeTap!();
          if (!ok) return;
        }
        if (context.mounted) _showRefineActionSheet(context);
      },
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

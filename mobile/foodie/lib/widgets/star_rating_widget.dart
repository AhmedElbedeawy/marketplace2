import 'package:flutter/material.dart';

/// Star Rating Widget for Cook Cards
class StarRatingWidget extends StatelessWidget {
  final double rating;
  final int? ratingCount;
  final Function(double)? onRatingChanged;
  final bool readOnly;
  final double itemSize;
  final Color filledColor;
  final Color unfilledColor;

  const StarRatingWidget({
    Key? key,
    required this.rating,
    this.ratingCount,
    this.onRatingChanged,
    this.readOnly = true,
    this.itemSize = 16.0,
    this.filledColor = const Color(0xFFFF7A00),
    this.unfilledColor = const Color(0xFFF5F5F5),
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: List.generate(5, (index) {
            final isFilled = index < rating.toInt() || 
                (index == rating.toInt() && rating % 1 >= 0.5);
            return Icon(
              isFilled ? Icons.star : Icons.star_border,
              size: itemSize,
              color: isFilled ? filledColor : unfilledColor,
            );
          }),
        ),
        if (ratingCount != null && ratingCount! > 0)
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Text(
              '($ratingCount)',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: Color(0xFF2C2C2C),
              ),
            ),
          ),
      ],
    );
  }
}

/// Rating Dialog for users to rate cooks
class RatingDialog extends StatefulWidget {
  final String cookName;
  final Function(int rating, String? review) onSubmit;
  final VoidCallback onClose;

  const RatingDialog({
    Key? key,
    required this.cookName,
    required this.onSubmit,
    required this.onClose,
  }) : super(key: key);

  @override
  State<RatingDialog> createState() => _RatingDialogState();
}

class _RatingDialogState extends State<RatingDialog> {
  int selectedRating = 0;
  final reviewController = TextEditingController();

  @override
  void dispose() {
    reviewController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Rate ${widget.cookName}',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF2C2C2C),
              ),
            ),
            const SizedBox(height: 24),
            // Star Rating Selector
            Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return GestureDetector(
                    onTap: () => setState(() => selectedRating = index + 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(
                        Icons.star,
                        size: 32,
                        color: index < selectedRating
                            ? const Color(0xFFFF7A00)
                            : const Color(0xFFF5F5F5),
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 24),
            // Review Text Field
            TextField(
              controller: reviewController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Add a review (optional)',
                hintStyle: const TextStyle(color: Color(0xFFCCCCCC)),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFF5F5F5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFFF5F5F5)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: widget.onClose,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFFFF7A00)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Cancel',
                      style: TextStyle(
                        color: Color(0xFFFF7A00),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: selectedRating == 0
                        ? null
                        : () {
                            widget.onSubmit(selectedRating, reviewController.text.isNotEmpty ? reviewController.text : null);
                            widget.onClose();
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: selectedRating == 0 ? Colors.grey : const Color(0xFFFF7A00),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Submit',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
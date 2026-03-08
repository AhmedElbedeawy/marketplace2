/// Delivery Fee Calculator - mirrors web logic exactly
/// Used by CartProvider to calculate delivery fees with batching

class DeliveryFeeResult {
  final double totalDeliveryFee;
  final Map<String, double> deliveryFeeByCook;
  final Map<String, int> batchCountByCook;

  DeliveryFeeResult({
    required this.totalDeliveryFee,
    required this.deliveryFeeByCook,
    required this.batchCountByCook,
  });
}

/// Calculate delivery fees for cart items
/// [cartItems] - items with cookId, prepTime, deliveryFee, fulfillmentMode
/// [cookCombineConfig] - map of cookId to timing preference ('combined' or 'separate')
DeliveryFeeResult calcDeliveryFees(
  List<dynamic> cartItems, {
  Map<String, String> cookCombineConfig = const {},
}) {
  if (cartItems.isEmpty) {
    return DeliveryFeeResult(
      totalDeliveryFee: 0,
      deliveryFeeByCook: {},
      batchCountByCook: {},
    );
  }

  // Group items by cook
  final Map<String, List<dynamic>> itemsByCook = {};
  for (final item in cartItems) {
    final cookId = item.cookId ?? 'unknown';
    if (!itemsByCook.containsKey(cookId)) {
      itemsByCook[cookId] = [];
    }
    itemsByCook[cookId]!.add(item);
  }

  final Map<String, double> deliveryFeeByCook = {};
  final Map<String, int> batchCountByCook = {};
  double totalDeliveryFee = 0;

  // Calculate fee per cook
  for (final cookId in itemsByCook.keys) {
    final items = itemsByCook[cookId]!;

    // Filter delivery items only
    final deliveryItems = items.where((item) {
      final mode = item.fulfillmentMode ?? 'pickup';
      return mode == 'delivery';
    }).toList();

    if (deliveryItems.isEmpty) {
      deliveryFeeByCook[cookId] = 0.0;
      batchCountByCook[cookId] = 0;
      continue;
    }

    // Get combine preference for this cook
    final timingPreference = cookCombineConfig[cookId] ?? 'separate';

    if (timingPreference == 'combined') {
      // Combined: one fee per cook (highest fee)
      final maxFee = deliveryItems.fold<double>(
        0,
        (max, item) {
          final fee = (item.deliveryFee ?? 0.0).toDouble();
          return fee > max ? fee : max;
        },
      );
      deliveryFeeByCook[cookId] = maxFee;
      batchCountByCook[cookId] = 1;
      totalDeliveryFee += maxFee;
    } else {
      // Separate: group by prep time, one fee per batch
      final Map<int, List<dynamic>> batches = {};

      for (final item in deliveryItems) {
        // Normalize prepTime to minutes
        final int readyTime = _normalizePrepTime(item.prepTime ?? item.prepTimeMinutes ?? 30);

        if (!batches.containsKey(readyTime)) {
          batches[readyTime] = [];
        }
        batches[readyTime]!.add(item);
      }

      // Sum max fee per batch
      double cookFee = 0;
      for (final readyTime in batches.keys) {
        final batchItems = batches[readyTime]!;
        final batchFee = batchItems.fold<double>(
          0,
          (max, item) {
            final fee = (item.deliveryFee ?? 0.0).toDouble();
            return fee > max ? fee : max;
          },
        );
        cookFee += batchFee;
      }

      deliveryFeeByCook[cookId] = cookFee;
      batchCountByCook[cookId] = batches.length;
      totalDeliveryFee += cookFee;
    }
  }

  return DeliveryFeeResult(
    totalDeliveryFee: totalDeliveryFee,
    deliveryFeeByCook: deliveryFeeByCook,
    batchCountByCook: batchCountByCook,
  );
}

/// Get number of deliveries for a cook group
int getDeliveryCount(List<dynamic> items, {String timingPreference = 'separate'}) {
  final deliveryItems = items.where((item) {
    final mode = item.fulfillmentMode ?? 'pickup';
    return mode == 'delivery';
  }).toList();

  if (deliveryItems.isEmpty) return 0;
  if (timingPreference == 'combined') return 1;

  // Count unique prep times
  final Set<int> prepTimes = {};
  for (final item in deliveryItems) {
    final readyTime = _normalizePrepTime(item.prepTime ?? item.prepTimeMinutes ?? 30);
    prepTimes.add(readyTime);
  }

  return prepTimes.length;
}

/// Normalize prep time to minutes (handles both int and string formats)
int _normalizePrepTime(dynamic prepTime) {
  if (prepTime is String && prepTime.contains(':')) {
    // Convert "16:00" to minutes
    final parts = prepTime.split(':');
    final hours = int.tryParse(parts[0]) ?? 0;
    final minutes = int.tryParse(parts[1]) ?? 0;
    return hours * 60 + minutes;
  } else {
    return (prepTime is int) ? prepTime : (int.tryParse(prepTime.toString()) ?? 30);
  }
}

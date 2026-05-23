import '../models/order.dart';
import '../utils/arabic_utils.dart';

// ── Order item grouping ───────────────────────────────────────────────────────

class ItemGroup {
  final String cookId;
  final String cookName;
  final String fulfillmentMode;
  final DateTime? readyAt;
  final List<OrderItem> items;

  ItemGroup({
    required this.cookId,
    required this.cookName,
    required this.fulfillmentMode,
    this.readyAt,
    required this.items,
  });
}

List<ItemGroup> groupItemsByFulfillmentAndReady(
    List<SubOrder> subOrders, String timingPreference) {
  final Map<String, ItemGroup> groups = {};
  for (final subOrder in subOrders) {
    final fulfillmentMode = subOrder.fulfillmentMode ?? 'pickup';
    final cookName = subOrder.cookName ?? 'Cook';
    final cookId = subOrder.cookId;
    for (final item in subOrder.items) {
      final readyAt = timingPreference == 'separate' && item.readyAt != null
          ? item.readyAt
          : null;
      final groupKey =
          '${cookId}_${fulfillmentMode}_${readyAt?.toIso8601String() ?? 'combined'}';
      if (!groups.containsKey(groupKey)) {
        groups[groupKey] = ItemGroup(
          cookId: cookId,
          cookName: cookName,
          fulfillmentMode: fulfillmentMode,
          readyAt: readyAt,
          items: [],
        );
      }
      groups[groupKey]!.items.add(item);
    }
  }
  return groups.values.toList();
}

// ── Per-order view model ──────────────────────────────────────────────────────

class OrderDisplayData {
  final Map<String, List<ItemGroup>> cookGroups;
  final Map<String, double> cookTotals;
  final String createdAtStr;
  final String shortOrderId;
  final String orderTotalStr;
  final String orderTotalStrAr;
  final Map<String, String> cookTotalStrs;
  final Map<String, String> cookTotalStrsAr;
  final bool hasPickup;
  final bool hasDelivery;

  OrderDisplayData({
    required this.cookGroups,
    required this.cookTotals,
    required this.createdAtStr,
    required this.shortOrderId,
    required this.orderTotalStr,
    required this.orderTotalStrAr,
    required this.cookTotalStrs,
    required this.cookTotalStrsAr,
    required this.hasPickup,
    required this.hasDelivery,
  });
}

// ── Pure mapper: List<Order> → Map<orderId, OrderDisplayData> ─────────────────
// Called once after fetchOrders succeeds. O(n×m) total, O(1) per UI read.

String _fmtDate(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} '
    '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

String _shortId(String id) => id.length > 6 ? id.substring(id.length - 6) : id;

Map<String, OrderDisplayData> buildOrderDisplayCache(List<Order> orders) {
  final cache = <String, OrderDisplayData>{};

  for (final order in orders) {
    if (order.subOrders.isEmpty) continue;

    final timingPreference =
        order.subOrders.first.timingPreference ?? 'separate';
    final groups =
        groupItemsByFulfillmentAndReady(order.subOrders, timingPreference);

    final cookGroups = <String, List<ItemGroup>>{};
    for (final group in groups) {
      cookGroups.putIfAbsent(group.cookId, () => []).add(group);
    }

    final cookTotals = <String, double>{};
    for (final entry in cookGroups.entries) {
      final cookId = entry.key;
      final itemGroups = entry.value;
      final itemsSubtotal = itemGroups.fold<double>(
        0,
        (sum, g) => sum +
            g.items.fold<double>(
              0,
              (s, item) => s + (item.price * item.quantity).toDouble(),
            ),
      );
      final deliveryFees = order.subOrders
          .where((sub) =>
              sub.cookId == cookId && sub.fulfillmentMode == 'delivery')
          .fold<double>(0, (sum, sub) => sum + sub.deliveryFee);
      cookTotals[cookId] = itemsSubtotal + deliveryFees;
    }

    final cookTotalStrs = <String, String>{};
    final cookTotalStrsAr = <String, String>{};
    for (final entry in cookTotals.entries) {
      final fixed = entry.value.toStringAsFixed(2);
      cookTotalStrs[entry.key] = fixed;
      cookTotalStrsAr[entry.key] = toArabicNumerals(fixed);
    }

    final orderTotalFixed = order.totalAmount.toStringAsFixed(2);
    bool hasPickup = false;
    bool hasDelivery = false;
    for (final sub in order.subOrders) {
      if (sub.fulfillmentMode == 'pickup') hasPickup = true;
      if (sub.fulfillmentMode == 'delivery') hasDelivery = true;
      if (hasPickup && hasDelivery) break;
    }

    cache[order.id] = OrderDisplayData(
      cookGroups: cookGroups,
      cookTotals: cookTotals,
      createdAtStr: _fmtDate(order.createdAt),
      shortOrderId: _shortId(order.id),
      orderTotalStr: orderTotalFixed,
      orderTotalStrAr: toArabicNumerals(orderTotalFixed),
      cookTotalStrs: cookTotalStrs,
      cookTotalStrsAr: cookTotalStrsAr,
      hasPickup: hasPickup,
      hasDelivery: hasDelivery,
    );
  }

  return cache;
}

import '../models/food.dart';
import '../providers/filter_provider.dart';

class FilterUtil {
  static List<Food> applyFilters(List<Food> foods, FilterProvider filterProvider) {
    List<Food> filtered = List.from(foods);

    // Price Range Filter
    filtered = filtered.where((food) {
      final price = food.price;
      return price >= filterProvider.minPrice && price <= filterProvider.maxPrice;
    }).toList();

    // Category Filter
    if (filterProvider.selectedCategories.isNotEmpty) {
      filtered = filtered.where((food) {
        return filterProvider.selectedCategories.contains(food.category);
      }).toList();
    }

    // Cook Name Filter - search in cooks list
    if (filterProvider.cookNameFilter.isNotEmpty) {
      final query = filterProvider.cookNameFilter.toLowerCase();
      filtered = filtered.where((food) {
        return food.cooks.any((cook) => 
          cook.cookName.toLowerCase().contains(query)
        );
      }).toList();
    }

    // Order Type Filter - would need additional backend data
    // Skipped for now

    // Delivery Time Filter - map prepTime to delivery time
    // Only show items with prepTime within the selected range
    final maxDeliveryMinutes = int.parse(filterProvider.deliveryTime);
    filtered = filtered.where((food) {
      return food.prepTime <= maxDeliveryMinutes;
    }).toList();

    // Distance Filter - would need location data from backend
    // Skipped for now

    // Popularity Toggles
    if (filterProvider.showOnlyPopularCooks) {
      filtered = filtered.where((food) {
        return food.cooks.any((cook) => cook.cookRating >= 4.5);
      }).toList();
    }

    if (filterProvider.showOnlyPopularDishes) {
      filtered = filtered.where((food) {
        return food.rating >= 4.5;
      }).toList();
    }

    // Sorting
    switch (filterProvider.sortBy) {
      case 'Rating':
        filtered.sort((a, b) => b.rating.compareTo(a.rating));
        break;
      case 'Price (Low–High)':
        filtered.sort((a, b) => a.price.compareTo(b.price));
        break;
      case 'Price (High–Low)':
        filtered.sort((a, b) => b.price.compareTo(a.price));
        break;
      case 'Delivery Time':
        filtered.sort((a, b) => a.prepTime.compareTo(b.prepTime));
        break;
      case 'Distance':
        // Would need location data
        break;
      case 'Recommended':
      default:
        // Keep original order
        break;
    }

    return filtered;
  }
}

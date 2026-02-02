import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../models/food.dart';
import '../../widgets/shared_app_header.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/star_rating_widget.dart';
import '../../widgets/cook_details_dialog.dart';

class SeeAllCooksScreen extends StatefulWidget {
  const SeeAllCooksScreen({Key? key}) : super(key: key);

  @override
  State<SeeAllCooksScreen> createState() => _SeeAllCooksScreenState();
}

class _SeeAllCooksScreenState extends State<SeeAllCooksScreen> {
  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            SharedAppHeader(
              title: isRTL ? 'الطهاة الأعلى تقييماً' : 'Top-rated Cooks',
              showBackButton: true,
              onBackPressed: () {
                // Return to origin tab
                final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
                navigationProvider.returnToOrigin();
                Navigator.pop(context);
              },
            ),
            Expanded(
              child: _buildCooksGrid(isRTL, languageProvider),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildCooksGrid(bool isRTL, LanguageProvider languageProvider) {
    return Consumer<FoodProvider>(
      builder: (context, foodProvider, _) {
        final cooks = foodProvider.popularChefs;

        if (cooks.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.people_outline,
                  size: 80,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'لا يوجد طهاة' : 'No cooks available',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.84, // Width = 84% of Height
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: cooks.length,
          itemBuilder: (context, index) {
            final cook = cooks[index];
            return _buildCookCard(cook, isRTL, languageProvider);
          },
        );
      },
    );
  }

  Widget _buildCookCard(Chef cook, bool isRTL, LanguageProvider languageProvider) {
    final String cookImage = cook.profileImage ?? 'k1.png';
    final bool isAssetImage = !cookImage.startsWith('http');

    return GestureDetector(
      onTap: () {
        showDialog(
          context: context,
          builder: (context) => CookDetailsDialog(cook: cook),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              // 1. Cook Image
              Positioned.fill(
                child: isAssetImage
                    ? Image.asset(
                        'assets/cooks/$cookImage',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(0xFFF5F5F5),
                          child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                        ),
                      )
                    : CachedNetworkImage(
                        imageUrl: cookImage,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(
                          color: const Color(0xFFF5F5F5),
                          child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                        ),
                      ),
              ),
              // 2. Overlay Frame
              Positioned.fill(
                child: Image.asset(
                  'assets/cooks/Ccard.png',
                  fit: BoxFit.fill,
                  errorBuilder: (_, __, ___) => Container(),
                ),
              ),
              // 3. Info Overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.9),
                      ],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Stars Rating
                      StarRatingWidget(
                        rating: cook.rating,
                        ratingCount: 0,
                        itemSize: 11,
                        filledColor: const Color(0xFFCEA45A),
                        unfilledColor: Colors.white.withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 3),
                      // Cook Name
                      Text(
                        cook.name,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 3),
                      // Expertise with Gradient Lines
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 28,
                            child: Container(
                              height: 1,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.centerRight,
                                  end: Alignment.centerLeft,
                                  colors: [Color(0xFFCEA45A), Color(0xFF111211)],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              languageProvider.getExpertiseTitle(cook.expertise),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFFCEA45A),
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(width: 6),
                          SizedBox(
                            width: 28,
                            child: Container(
                              height: 1,
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                  colors: [Color(0xFFCEA45A), Color(0xFF111211)],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      // Orders Count
                      Text(
                        '${cook.ordersCount} orders',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFFCEA45A),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

}


import React, { useState, useEffect } from 'react'; // Test Save
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  Button, 
  TextField, 
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Rating,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Chip,
  FormControl,
  Select,
  MenuItem,
  Slider,
  Switch,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Search as SearchIcon, 
  FilterList as FilterListIcon, 
  ChevronRight as ChevronRightIcon, 
  LocationOn as LocationOnIcon, 
  Star as StarIcon,
  ArrowBack as ArrowBackIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import api, { STATIC_BASE_URL, getAbsoluteUrl, normalizeImageUrl } from '../../utils/api';

const FoodieMenu = () => {
  const { language, isRTL, t } = useLanguage();
  const { countryCode, currencyCode, cart, addToCart: contextAddToCart } = useCountry();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { kitchenId } = useParams();

  const [products, setProducts] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('dish');
  const [activeKitchen, setActiveKitchen] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [dishOffers, setDishOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMainImage, setSelectedMainImage] = useState(null);
  const [selectedFulfillment, setSelectedFulfillment] = useState(null);
  const [fulfillmentError, setFulfillmentError] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [cartWarningOpen, setCartWarningOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [flyingItem, setFlyingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(location.state?.initialCategoryId || null);
  const [flowSessionId, setFlowSessionId] = useState(null);
  const [flowOrigin, setFlowOrigin] = useState(null);
  const [flowCompleted, setFlowCompleted] = useState(false);
  const [favoriteCooks, setFavoriteCooks] = useState([]);

  // =====================================================
  // FILTER STATE (matching Mobile FilterProvider exactly)
  // =====================================================
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(500);
  const [orderType, setOrderType] = useState('All'); // All, Delivery, Pickup
  const [deliveryTime, setDeliveryTime] = useState('60'); // 15, 30, 45, 60
  const [distance, setDistance] = useState(30); // 1-50 km
  const [showOnlyPopularCooks, setShowOnlyPopularCooks] = useState(false);
  const [showOnlyPopularDishes, setShowOnlyPopularDishes] = useState(false);
  const [sortBy, setSortBy] = useState('Recommended'); // Recommended, Rating, Price (Low–High), Price (High–Low), Delivery Time, Distance
  const [tempFilters, setTempFilters] = useState({}); // Temporary state for filter dialog

  // Reset all filters to defaults
  const clearAllFilters = () => {
    setMinPrice(0);
    setMaxPrice(500);
    setSelectedCategory(null);
    setOrderType('All');
    setDeliveryTime('60');
    setDistance(30);
    setShowOnlyPopularCooks(false);
    setShowOnlyPopularDishes(false);
    setSortBy('Recommended');
    setSearchQuery('');
  };

  // Check if any filters are active
  const hasActiveFilters = minPrice > 0 || maxPrice < 500 || selectedCategory || 
    orderType !== 'All' || deliveryTime !== '60' || distance < 30 || 
    showOnlyPopularCooks || showOnlyPopularDishes || sortBy !== 'Recommended' || searchQuery;

  // Apply temp filters from dialog
  const applyFilters = () => {
    setMinPrice(tempFilters.minPrice ?? 0);
    setMaxPrice(tempFilters.maxPrice ?? 500);
    setOrderType(tempFilters.orderType ?? 'All');
    setDeliveryTime(tempFilters.deliveryTime ?? '60');
    setDistance(tempFilters.distance ?? 30);
    setShowOnlyPopularCooks(tempFilters.showOnlyPopularCooks ?? false);
    setShowOnlyPopularDishes(tempFilters.showOnlyPopularDishes ?? false);
    setSortBy(tempFilters.sortBy ?? 'Recommended');
    if (tempFilters.selectedCategory !== undefined) {
      setSelectedCategory(tempFilters.selectedCategory);
    }
    setFilterOpen(false);
  };

  // Open filter dialog with current values
  const openFilterDialog = () => {
    setTempFilters({
      minPrice,
      maxPrice,
      orderType,
      deliveryTime,
      distance,
      showOnlyPopularCooks,
      showOnlyPopularDishes,
      sortBy,
      selectedCategory
    });
    setFilterOpen(true);
  };

  // Sort options (matching Mobile)
  const sortOptions = [
    'Recommended',
    'Rating',
    'Price (Low–High)',
    'Price (High–Low)',
    'Delivery Time',
    'Distance'
  ];

  // Delivery time options (matching Mobile)
  const deliveryTimeOptions = ['15', '30', '45', '60'];

  // Default/fallback categories (for offline or initial load)
  const defaultCategories = [
    { _id: '1', nameEn: 'Roasted', nameAr: 'محمرات', icons: { web: '/assets/categories/Roasted.png' } },
    { _id: '2', nameEn: 'Grilled', nameAr: 'مشويات', icons: { web: '/assets/categories/Grilled.png' } },
    { _id: '3', nameEn: 'Casseroles', nameAr: 'طواجن', icons: { web: '/assets/categories/Casseroles.png' } },
    { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية', icons: { web: '/assets/categories/Traditional.png' } },
    { _id: '5', nameEn: 'Fried', nameAr: 'مقليات', icons: { web: '/assets/categories/Fried.png' } },
    { _id: '6', nameEn: 'Oven', nameAr: 'اكلات بالفرن', icons: { web: '/assets/categories/Oven.png' } },
    { _id: '7', nameEn: 'Sides', nameAr: 'اطباق جانبية', icons: { web: '/assets/categories/Sides.png' } },
    { _id: '8', nameEn: 'Deserts', nameAr: 'حلويات شرقية', icons: { web: '/assets/categories/Desert.png' } },
    { _id: '9', nameEn: 'Salads', nameAr: 'سلطات', icons: { web: '/assets/categories/Salads.png' } },
  ];

  // State for categories - always use default categories (API categories are outdated)
  const [categories, setCategories] = useState(defaultCategories);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Get display name based on language
  const getCategoryName = (category) => {
    return language === 'ar' ? (category.nameAr || category.nameEn || category.name) : (category.nameEn || category.name);
  };

  // Get category icon URL - uses shared getAbsoluteUrl helper
  const getCategoryIcon = (category) => {
    const iconPath = category.icons?.web || category.icon || '';
    return getAbsoluteUrl(iconPath);
  };

  // Active filter chips
  const activeFilterChips = [];
  if (orderType !== 'All') {
    activeFilterChips.push({ label: orderType, key: 'orderType' });
  }
  if (minPrice > 0 || maxPrice < 500) {
    activeFilterChips.push({ label: `${minPrice}-${maxPrice} ${currencyCode}`, key: 'price' });
  }
  if (deliveryTime !== '60') {
    activeFilterChips.push({ label: `${deliveryTime} min`, key: 'deliveryTime' });
  }
  if (distance < 30) {
    activeFilterChips.push({ label: `Within ${distance.toFixed(0)} km`, key: 'distance' });
  }
  if (showOnlyPopularCooks) {
    activeFilterChips.push({ label: 'Popular Cooks', key: 'popularCooks' });
  }
  if (showOnlyPopularDishes) {
    activeFilterChips.push({ label: 'Featured Dishes', key: 'popularDishes' });
  }
  if (sortBy !== 'Recommended') {
    activeFilterChips.push({ label: `Sort: ${sortBy}`, key: 'sortBy' });
  }

  const formatCurrency = (amount, lang) => {
    return localeFormatCurrency(amount, lang || language, currencyCode);
  };

  // DUMMY DATA FOR RESTORATION - 10 Featured Dishes with Cook Assignments
  const dummyProducts = [
    // C1 - Amal Kitchen (Traditional Egyptian)
    {
      _id: 'd1',
      name: 'Molokhia',
      nameAr: 'ملوخية',
      price: 65,
      photoUrl: '/assets/dishes/M.png',
      description: 'Molokhia with garlic and coriander',
      descriptionAr: 'ملوخية متشوّحة بالثوم والكزبرة',
      longDescription: 'Traditional Egyptian molokhia made from fresh jute leaves, sautéed with garlic and coriander in ghee, served hot with a rich homemade flavor.',
      longDescriptionAr: 'الملوخية المصرية الطازجة مطهية على الطريقة التقليدية، متشوّحة بالثوم والكزبرة في السمن البلدي، وتُقدَّم ساخنة بنكهة غنية وطعم بيتي أصيل.',
      category: { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية' },
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C2 - Chef Mohamed (Grilled & BBQ)
    {
      _id: 'd2',
      name: 'Roasted Country Duck',
      nameAr: 'بط محمّر',
      price: 95,
      photoUrl: '/assets/dishes/D.png',
      description: 'Golden roasted country duck',
      descriptionAr: 'بطة بلدي محمّرة',
      longDescription: 'Traditional oven-roasted country duck, seasoned to perfection, crispy outside and tender inside, served with rice or baladi bread.',
      longDescriptionAr: 'بطة بلدي متبّلة ومحمّرة في الفرن حتى تصبح ذهبية ومقرمشة من الخارج، طرية وغنية بالعصارة من الداخل، وتُقدَّم مع الأرز أو الخبز البلدي.',
      category: { _id: '1', nameEn: 'Roasted', nameAr: 'محمرات' },
      cook: { _id: 'c2', name: 'Chef Mohamed', storeName: 'Chef Mohamed Kitchen' }
    },
    // C1 - Amal Kitchen
    {
      _id: 'd3',
      name: 'Stuffed Grape Leaves',
      nameAr: 'محشي ورق عنب',
      price: 75,
      photoUrl: '/assets/dishes/W.png',
      description: 'Grape leaves stuffed with seasoned rice',
      descriptionAr: 'ورق عنب محشو أرز متبّل',
      longDescription: 'Tender grape leaves stuffed with seasoned rice, herbs, and spices, slow-cooked for a perfectly balanced tangy and savory flavor.',
      longDescriptionAr: 'ورق عنب محشو بخليط الأرز المتبّل بالأعشاب والتوابل، مطهو ببطء ليمنحك طعماً متوازناً بين الحموضة والنكهة الغنية.',
      category: { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية' },
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C2 - Chef Mohamed
    {
      _id: 'd4',
      name: 'Shish Tawook',
      nameAr: 'شيش طاووك',
      price: 85,
      photoUrl: '/assets/dishes/S.png',
      description: 'Marinated grilled chicken',
      descriptionAr: 'دجاج متبّل مشوي',
      longDescription: 'Juicy chicken cubes marinated in yogurt and spices, grilled to golden perfection and served with garlic sauce or tahini.',
      longDescriptionAr: 'قطع دجاج متبّلة بالزبادي والتوابل ومشوية حتى تصبح ذهبية وطرية، تُقدَّم مع صوص الثوم أو الطحينة لنكهة شرقية متكاملة.',
      category: { _id: '2', nameEn: 'Grilled', nameAr: 'مشويات' },
      cook: { _id: 'c2', name: 'Chef Mohamed', storeName: 'Chef Mohamed Kitchen' }
    },
    // C3 - Mama Nadia (Casseroles)
    {
      _id: 'd5',
      name: 'Lamb Shank Fattah',
      nameAr: 'فتة موزة ضاني',
      price: 120,
      photoUrl: '/assets/dishes/F.png',
      description: 'Egyptian fattah topped with tender lamb shank',
      descriptionAr: 'فتة مصرية بالموزة الضاني الطرية',
      longDescription: 'A classic Egyptian fattah layered with rice, crispy bread, and garlic tomato sauce, topped with slow-cooked lamb shank that is tender and full of flavor.',
      longDescriptionAr: 'طبق فتة مصري فاخر بطبقات الأرز والخبز المحمّص وصلصة الطماطم بالثوم، تعلوه موزة ضاني مطهية ببطء حتى تذوب في الفم.',
      category: { _id: '3', nameEn: 'Casseroles', nameAr: 'طواجن' },
      cook: { _id: 'c3', name: 'Mama Nadia', storeName: 'Mama Nadia Home Cooking' }
    },
    // C1 - Amal Kitchen
    {
      _id: 'd6',
      name: 'Beef Moussaka',
      nameAr: 'مسقعة باللحمة',
      price: 80,
      photoUrl: '/assets/dishes/K.png',
      description: 'Eggplant with tomato sauce and minced beef',
      descriptionAr: 'باذنجان بصلصة طماطم ولحم مفروم',
      longDescription: 'Fried eggplant layered with seasoned tomato sauce and minced beef, baked together into a warm, hearty, home-style dish.',
      longDescriptionAr: 'شرائح باذنجان مقلية مع صلصة طماطم متبّلة ولحم مفروم مطهو بعناية، مخبوزة معاً لتقديم طبق دافئ وغني بالنكهة على الطريقة البيتية.',
      category: { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية' },
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C3 - Mama Nadia
    {
      _id: 'd7',
      name: 'Stuffed Pigeon',
      nameAr: 'حمام محشي',
      price: 150,
      photoUrl: '/assets/dishes/H.png',
      description: 'Pigeon stuffed with Egyptian spiced rice',
      descriptionAr: 'حمام محشي أرز بالخلطة المصرية',
      longDescription: 'Tender country pigeon stuffed with Egyptian spiced rice mixed with giblets and spices, slow-cooked for a rich and deeply traditional flavor.',
      longDescriptionAr: 'حمام بلدي محشو بأرز متبّل بالخلطة المصرية المميزة من الكبد والقوانص والتوابل، ثم مطهو حتى يصبح طرياً ومليئاً بالنكهة الشرقية الأصيلة.',
      category: { _id: '3', nameEn: 'Casseroles', nameAr: 'طواجن' },
      cook: { _id: 'c3', name: 'Mama Nadia', storeName: 'Mama Nadia Home Cooking' }
    },
    // C4 - Hassan Grill House
    {
      _id: 'd8',
      name: 'Shish Tawook',
      nameAr: 'شيش طاووك',
      price: 85,
      photoUrl: '/assets/dishes/S.png',
      description: 'Marinated grilled chicken',
      descriptionAr: 'دجاج متبّل مشوي',
      longDescription: 'Juicy chicken cubes marinated in yogurt and spices, grilled to golden perfection and served with garlic sauce or tahini.',
      longDescriptionAr: 'قطع دجاج متبّلة بالزبادي والتوابل ومشوية حتى تصبح ذهبية وطرية، تُقدَّم مع صوص الثوم أو الطحينة لنكهة شرقية متكاملة.',
      category: { _id: '2', nameEn: 'Grilled', nameAr: 'مشويات' },
      cook: { _id: 'c4', name: 'Hassan Grill House', storeName: 'Hassan Grill House' }
    },
    // C5 - El Sheikh Falafel
    {
      _id: 'd9',
      name: 'Molokhia',
      nameAr: 'ملوخية',
      price: 60,
      photoUrl: '/assets/dishes/M.png',
      description: 'Molokhia with garlic and coriander',
      descriptionAr: 'ملوخية متشوّحة بالثوم والكزبرة',
      longDescription: 'Traditional Egyptian molokhia made from fresh jute leaves, sautéed with garlic and coriander in ghee, served hot with a rich homemade flavor.',
      longDescriptionAr: 'الملوخية المصرية الطازجة مطهية على الطريقة التقليدية، متشوّحة بالثوم والكزبرة في السمن البلدي، وتُقدَّم ساخنة بنكهة غنية وطعم بيتي أصيل.',
      category: { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية' },
      cook: { _id: 'c5', name: 'El Sheikh Falafel', storeName: 'El Sheikh Falafel' }
    },
    // C6 - Abu Ali Koshary
    {
      _id: 'd10',
      name: 'Beef Moussaka',
      nameAr: 'مسقعة باللحمة',
      price: 75,
      photoUrl: '/assets/dishes/K.png',
      description: 'Eggplant with tomato sauce and minced beef',
      descriptionAr: 'باذنجان بصلصة طماطم ولحم مفروم',
      longDescription: 'Fried eggplant layered with seasoned tomato sauce and minced beef, baked together into a warm, hearty, home-style dish.',
      longDescriptionAr: 'شرائح باذنجان مقلية مع صلصة طماطم متبّلة ولحم مفروم مطهو بعناية، مخبوزة معاً لتقديم طبق دافئ وغني بالنكهة على الطريقة البيتية.',
      category: { _id: '4', nameEn: 'Traditional', nameAr: 'تقليدية' },
      cook: { _id: 'c6', name: 'Abu Ali Koshary', storeName: 'Abu Ali Koshary' }
    }
  ];

  const dummyKitchens = [
    {
      _id: 'c1',
      name: 'Amal Kitchen',
      storeName: 'Amal Kitchen',
      expertise: 'Traditional Egyptian',
      profilePhoto: '/assets/cooks/C1.png',
      rating: 4.9,
      specialty: 'Home-style Egyptian',
      ratings: { average: 4.9, count: 323 },
      dishes: [
        {'_id': 'd1', 'name': 'Molokhia', 'nameAr': 'ملوخية', 'price': 65, 'photoUrl': '/assets/dishes/M.png'},
        {'_id': 'd3', 'name': 'Stuffed Grape Leaves', 'nameAr': 'محشي ورق عنب', 'price': 75, 'photoUrl': '/assets/dishes/W.png'},
        {'_id': 'd6', 'name': 'Beef Moussaka', 'nameAr': 'مسقعة باللحمة', 'price': 80, 'photoUrl': '/assets/dishes/K.png'}
      ]
    },
    {
      _id: 'c2',
      name: 'Chef Mohamed',
      storeName: 'Chef Mohamed Kitchen',
      expertise: 'Grilled & BBQ',
      profilePhoto: '/assets/cooks/C2.png',
      rating: 4.8,
      specialty: 'Authentic Grills',
      ratings: { average: 4.8, count: 256 },
      dishes: [
        {'_id': 'd2', 'name': 'Roasted Country Duck', 'nameAr': 'بط محمّر', 'price': 95, 'photoUrl': '/assets/dishes/D.png'},
        {'_id': 'd4', 'name': 'Shish Tawook', 'nameAr': 'شيش طاووك', 'price': 85, 'photoUrl': '/assets/dishes/S.png'}
      ]
    },
    {
      _id: 'c3',
      name: 'Mama Nadia',
      storeName: 'Mama Nadia Home Cooking',
      expertise: 'Casseroles',
      profilePhoto: '/assets/cooks/C3.png',
      rating: 4.7,
      specialty: 'Tagine Specialist',
      ratings: { average: 4.7, count: 189 },
      dishes: [
        {'_id': 'd5', 'name': 'Lamb Shank Fattah', 'nameAr': 'فتة موزة ضاني', 'price': 120, 'photoUrl': '/assets/dishes/F.png'},
        {'_id': 'd7', 'name': 'Stuffed Pigeon', 'nameAr': 'حمام محشي', 'price': 150, 'photoUrl': '/assets/dishes/H.png'}
      ]
    },
    {
      _id: 'c4',
      name: 'Hassan Grill House',
      storeName: 'Hassan Grill House',
      expertise: 'Grilled & BBQ',
      profilePhoto: '/assets/cooks/C4.png',
      rating: 4.9,
      specialty: 'Grilled Specialities',
      ratings: { average: 4.9, count: 412 },
      dishes: [
        {'_id': 'd4', 'name': 'Shish Tawook', 'nameAr': 'شيش طاووك', 'price': 85, 'photoUrl': '/assets/dishes/S.png'}
      ]
    },
    {
      _id: 'c5',
      name: 'El Sheikh Falafel',
      storeName: 'El Sheikh Falafel',
      expertise: 'Fried & Sides',
      profilePhoto: '/assets/cooks/C5.png',
      rating: 4.6,
      specialty: 'Falafel & Sides',
      ratings: { average: 4.6, count: 245 },
      dishes: [
        {'_id': 'd1', 'name': 'Molokhia', 'nameAr': 'ملوخية', 'price': 60, 'photoUrl': '/assets/dishes/M.png'}
      ]
    },
    {
      _id: 'c6',
      name: 'Abu Ali Koshary',
      storeName: 'Abu Ali Koshary',
      expertise: 'Traditional Egyptian',
      profilePhoto: '/assets/cooks/C6.png',
      rating: 4.8,
      specialty: 'Koshary Specialist',
      ratings: { average: 4.8, count: 312 },
      dishes: [
        {'_id': 'd6', 'name': 'Beef Moussaka', 'nameAr': 'مسقعة باللحمة', 'price': 75, 'photoUrl': '/assets/dishes/K.png'}
      ]
    },
    {
      _id: 'c7',
      name: 'Sakura Sushi Place',
      storeName: 'Sakura Sushi Place',
      expertise: 'Asian Fusion',
      profilePhoto: '/assets/cooks/C7.png',
      rating: 4.5,
      specialty: 'Sushi & Asian',
      ratings: { average: 4.5, count: 178 },
      dishes: []
    },
    {
      _id: 'c8',
      name: 'Pizza Italia Master',
      storeName: 'Pizza Italia Master',
      expertise: 'Pizza & Italian',
      profilePhoto: '/assets/cooks/C8.png',
      rating: 4.7,
      specialty: 'Italian Cuisine',
      ratings: { average: 4.7, count: 267 },
      dishes: []
    },
    {
      _id: 'c9',
      name: 'Sweet Tooth Bakery',
      storeName: 'Sweet Tooth Bakery',
      expertise: 'Desserts & Baking',
      profilePhoto: '/assets/cooks/C9.png',
      rating: 4.9,
      specialty: 'Desserts',
      ratings: { average: 4.9, count: 198 },
      dishes: []
    },
    {
      _id: 'c10',
      name: 'Meat Lovers Station',
      storeName: 'Meat Lovers Station',
      expertise: 'Grilled Meats',
      profilePhoto: '/assets/cooks/C10.png',
      rating: 4.6,
      specialty: 'Premium Meats',
      ratings: { average: 4.6, count: 156 },
      dishes: []
    }
  ];

  // Grouping dishes for Browse by Dish - PHASE 3: Uses AdminDish data structure
  // AdminDish has: _id, nameEn, nameAr, imageUrl, category, minPrice, offerCount
  const groupedDishes = products.reduce((acc, dish) => {
    // PHASE 3: Use adminDishId as key, not name
    const dishKey = dish._id;
    
    // Apply category filter (PHASE 3: compare dish.category._id)
    if (selectedCategory && dish.category?._id !== selectedCategory) return acc;

    if (!acc[dishKey]) {
      acc[dishKey] = {
        _id: dish._id,
        name: dish.nameEn || dish.name,
        nameAr: dish.nameAr,
        // PHASE 3: Use adminDish.imageUrl with fallback to photoUrl
        image: dish.imageUrl || dish.photoUrl || '/assets/dishes/placeholder.png',
        category: dish.category,
        minPrice: dish.minPrice || dish.price,
        kitchenCount: dish.offerCount || 0,
        // Include description fields for dish detail view
        description: dish.description,
        descriptionAr: dish.descriptionAr,
        longDescription: dish.longDescription,
        longDescriptionAr: dish.longDescriptionAr,
        kitchens: []
      };
    }
    // PHASE 3: For with-stats, offerCount comes from API, don't increment
    return acc;
  }, {});

  useEffect(() => {
    if (location.state?.initialCategoryId) {
      setSelectedCategory(location.state.initialCategoryId);
    }
  }, [location.state?.initialCategoryId]);

  useEffect(() => {
    if (location.state?.initialSearchQuery) {
      setSearchQuery(location.state.initialSearchQuery);
    }
  }, [location.state?.initialSearchQuery]);

  useEffect(() => {
    if (!loading && location.state?.openDishDialog && location.state?.initialSearchQuery) {
      const dish = groupedDishes[location.state.initialSearchQuery];
      if (dish) {
        setSelectedDish(dish);
        // Clear the state so it doesn't reopen on every render/refresh
        navigate(location.pathname, { replace: true, state: { ...location.state, openDishDialog: false } });
      }
    }
  }, [loading, location.state, groupedDishes, navigate, location.pathname]);

  // Handle kitchen route parameter for direct navigation to kitchen profile
  useEffect(() => {
    if (kitchenId && !loading && kitchens.length > 0) {
      // Robust lookup handling both Cook ID and User ID
      const kitchen = kitchens.find(k => 
        String(k._id) === String(kitchenId) || 
        String(k.userId) === String(kitchenId) || 
        (k.userId && String(k.userId._id) === String(kitchenId))
      );
      if (kitchen) {
        setViewMode('kitchen');
        setActiveKitchen(kitchen);
      }
    }
  }, [kitchenId, loading, kitchens]);

  // Handle viewMode and selectedKitchenId from navigation state
  useEffect(() => {
    if (!loading && location.state?.selectedKitchenId && kitchens.length > 0) {
      const targetId = location.state.selectedKitchenId;
      const kitchen = kitchens.find(k => 
        String(k._id) === String(targetId) || 
        String(k.userId) === String(targetId) || 
        (k.userId && String(k.userId._id) === String(targetId))
      );
      if (kitchen) {
        setViewMode(location.state.viewMode || 'kitchen');
        setActiveKitchen(kitchen);
        // Clear the state so it doesn't reapply on every render
        navigate(location.pathname, { replace: true, state: { ...location.state, viewMode: undefined, selectedKitchenId: undefined } });
      }
    } else if (!loading && location.state?.viewMode && !location.state?.selectedKitchenId) {
      // Just switching view mode without a specific kitchen
      setViewMode(location.state.viewMode);
      setActiveKitchen(null);
      navigate(location.pathname, { replace: true, state: { ...location.state, viewMode: undefined } });
    }
  }, [loading, location.state, kitchens, navigate, location.pathname]);

  // DESIGN TOKENS (MATCHING FoodieHome.js)
  const COLORS = { 
    primaryOrange: '#FF7A00', 
    darkBrown: '#2B1E16', 
    warmBrown: '#5A3E2B', 
    bgCream: '#FAF5F3', 
    white: '#FFFFFF', 
    bodyGray: '#6B6B6B', 
    mutedGray: '#A6A6A6', 
    borderGray: '#E8E2DF' 
  };

  useEffect(() => {
    fetchData();
  }, [countryCode, minPrice, maxPrice, selectedCategory, orderType, deliveryTime, distance, showOnlyPopularCooks, showOnlyPopularDishes, sortBy, searchQuery]);

  // Handle offer click - show offer detail
  const handleOfferClick = (offer) => {
    console.log('🖱️ handleOfferClick - Raw offer:', {
      _id: offer._id,
      cook: offer.cook,
      cookId: offer.cook?._id,
      deliveryFee: offer.deliveryFee,
      prepReadyConfig: offer.prepReadyConfig,
      images: offer.images,
      imagesLength: offer.images?.length,
      adminDishImage: offer.adminDish?.imageUrl
    });
    
    // Transform fulfillmentModes to fulfillmentOptions array for UI consistency
    const fulfillmentOptions = [];
    if (offer.fulfillmentModes?.delivery) fulfillmentOptions.push('delivery');
    if (offer.fulfillmentModes?.pickup) fulfillmentOptions.push('pickup');
    
    // Create enriched offer with properly mapped fields
    const enrichedOffer = {
      ...offer,
      fulfillmentOptions,
      // Ensure cook info is preserved
      cook: offer.cook,
      // Ensure images array exists (cook-uploaded images)
      images: offer.images || [],
      // Map name fields from adminDish
      name: offer.adminDish?.nameEn || offer.name,
      nameAr: offer.adminDish?.nameAr || offer.nameAr,
      // Map description fields from adminDish
      description: offer.adminDish?.descriptionEn || offer.adminDish?.longDescription || offer.description,
      descriptionAr: offer.adminDish?.descriptionAr || offer.adminDish?.longDescriptionAr,
      // Map portion size
      portionSize: offer.portionSize,
      // Map prep time config
      prepReadyConfig: offer.prepReadyConfig,
      // Map delivery fee
      deliveryFee: offer.deliveryFee
    };
    
    console.log('🖱️ handleOfferClick - Enriched offer:', {
      images: enrichedOffer.images,
      imagesLength: enrichedOffer.images?.length,
      hasCookImages: enrichedOffer.images && enrichedOffer.images.length > 0
    });
    
    setSelectedOffer(enrichedOffer);
    setQuantity(1);
    // CORRECTED: Use cook images FIRST, admin image ONLY if no cook images
    const cookImages = enrichedOffer.images;
    const hasCookImages = cookImages && cookImages.length > 0;
    setSelectedMainImage(hasCookImages ? cookImages[0] : (enrichedOffer?.adminDish?.imageUrl || null));
    setSelectedFulfillment(null);
    setFulfillmentError(false);
  };

  // Apply filters to dummy data (for demo mode fallback)
  const filterDummyData = (items, type) => {
    let filtered = [...items];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (type === 'products') {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
      } else {
        filtered = filtered.filter(k => (k.storeName || k.name).toLowerCase().includes(query));
      }
    }

    // Filter by category (products only)
    if (type === 'products' && selectedCategory) {
      filtered = filtered.filter(p => p.category?._id === selectedCategory);
    }

    // Filter by price range
    if (type === 'products') {
      filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);
    }

    // Filter by distance (for cooks with lat/lng)
    if (type === 'cooks') {
      const userLat = parseFloat(sessionStorage.getItem('userLat'));
      const userLng = parseFloat(sessionStorage.getItem('userLng'));
      if (userLat && userLng) {
        filtered = filtered.filter(k => {
          const cookLat = k.lat || k.location?.lat || 24.7136;
          const cookLng = k.lng || k.location?.lng || 46.6753;
          const dist = getDistanceFromLatLonInKm(userLat, userLng, cookLat, cookLng);
          return dist <= distance;
        });
      }
    }

    // Filter by rating/sort
    if (sortBy === 'Rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'Price (Low–High)' && type === 'products') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price (High–Low)' && type === 'products') {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
  };

  // Haversine distance calculation
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const deg2rad = (deg) => deg * (Math.PI/180);

  const fetchData = async () => {
    setLoading(true);
    try {
      const lat = sessionStorage.getItem('userLat');
      const lng = sessionStorage.getItem('userLng');

      // Build filter params (matching Mobile API)
      const filterParams = new URLSearchParams();
      if (lat && lng) {
        filterParams.set('lat', lat);
        filterParams.set('lng', lng);
      }
      filterParams.set('minPrice', minPrice);
      filterParams.set('maxPrice', maxPrice);
      if (selectedCategory) {
        filterParams.set('category', selectedCategory);
      }
      if (orderType !== 'All') {
        filterParams.set('orderType', orderType);
      }
      filterParams.set('deliveryTime', deliveryTime);
      filterParams.set('distance', distance);
      if (showOnlyPopularCooks) {
        filterParams.set('popularCooks', 'true');
      }
      if (showOnlyPopularDishes) {
        filterParams.set('popularDishes', 'true');
      }
      filterParams.set('sortBy', sortBy);
      filterParams.set('search', searchQuery);

      const filterQuery = filterParams.toString();

      const [prodRes, cookRes] = await Promise.all([
        // PHASE 3: Use AdminDish endpoint instead of Product
        api.get('/public/admin-dishes/with-stats'),
        api.get(`/cooks?${filterQuery}`)
      ]);

      const prodData = prodRes.data;
      const cookData = cookRes.data;

      // PHASE 3: Handle AdminDish response (either {dishes: [...]} or [...]) or fallback to dummy
      const dishesList = prodData?.dishes || (Array.isArray(prodData) ? prodData : []);
      const kitchensList = Array.isArray(cookData) ? cookData : (cookData.data || cookData.cooks || []);

      // Use API data, or apply filters to dummy data if API returns empty
      // IMPORTANT: Use consistent data source - if one is dummy, both should be dummy
      const hasFilters = minPrice > 0 || maxPrice < 500 || selectedCategory || orderType !== 'All' || 
                        deliveryTime !== '60' || distance < 30 || showOnlyPopularCooks || 
                        showOnlyPopularDishes || sortBy !== 'Recommended' || searchQuery;

      // DEBUG: Always use dummy data for testing
      const forceDummyData = false;
      
      // Check if we should use dummy data (API returned empty or we want consistent dummy data)
      // NOTE: Now showing AdminDishes even without offers (offerCount: 0)
      const useDummyDishes = dishesList.length === 0 || forceDummyData;
      const useDummyKitchens = kitchensList.length === 0 || forceDummyData;
      
      // If either API returns empty, use dummy data for both to ensure consistency
      const useDummyData = useDummyDishes || useDummyKitchens || forceDummyData;
      
      // DEBUG: Log API response details
      console.log('📊 === MENU API RESPONSE ===');
      console.log(`  Dishes returned: ${dishesList.length}`);
      console.log(`  Kitchens returned: ${kitchensList.length}`);
      console.log(`  useDummyDishes: ${useDummyDishes}`);
      console.log(`  useDummyKitchens: ${useDummyKitchens}`);
      console.log(`  useDummyData: ${useDummyData}`);
      console.log(`  DEV_ONLY: ${process.env.REACT_APP_DEV_ONLY || 'false'}`);
      
      // Log WHY we're using dummy data
      if (dishesList.length === 0) {
        console.log('⚠️ REASON: dishesList is EMPTY - will show empty state or fallback');
      } else if (useDummyDishes) {
        console.log('⚠️ REASON: useDummyDishes flag is TRUE');
      }
      
      if (dishesList[0]) {
        console.log('  Sample dish:', {
          _id: dishesList[0]._id,
          nameEn: dishesList[0].nameEn,
          imageUrl: dishesList[0].imageUrl,
          offerCount: dishesList[0].offerCount
        });
      }
      console.log('📊 === END MENU API RESPONSE ===\n');

      if (dishesList.length > 0 && !useDummyData) {
        console.log('fetchData: Using API dishes:', dishesList.length);
        setProducts(dishesList);
      } else if (hasFilters) {
        // Apply filters to dummy data when API returns empty with active filters
        console.log('fetchData: Using filtered dummy dishes');
        setProducts(filterDummyData(dummyProducts, 'products'));
      } else {
        console.log('fetchData: Using dummy dishes:', dummyProducts.length);
        setProducts(dummyProducts);
      }

      if (kitchensList.length > 0 && !useDummyData) {
        console.log('fetchData: Using API kitchens:', kitchensList.length);
        setKitchens(kitchensList);
      } else if (hasFilters) {
        // Apply filters to dummy data when API returns empty with active filters
        console.log('fetchData: Using filtered dummy kitchens');
        setKitchens(filterDummyData(dummyKitchens, 'cooks'));
      } else {
        console.log('fetchData: Using dummy kitchens:', dummyKitchens.length);
        setKitchens(dummyKitchens);
      }

    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      // Apply filters to dummy data on error
      const hasFilters = minPrice > 0 || maxPrice < 500 || selectedCategory || searchQuery;
      setProducts(hasFilters ? filterDummyData(dummyProducts, 'products') : dummyProducts);
      setKitchens(hasFilters ? filterDummyData(dummyKitchens, 'cooks') : dummyKitchens);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setActiveKitchen(null);
    }
  };

  // PHASE 3: Filter dishes by nameEn/nameAr (AdminDish has bilingual names)
  const filteredDishes = Object.values(groupedDishes).filter(dish => {
    const searchLower = searchQuery.toLowerCase();
    const nameEn = (dish.nameEn || dish.name || '').toLowerCase();
    const nameAr = (dish.nameAr || '').toLowerCase();
    return nameEn.includes(searchLower) || nameAr.includes(searchLower);
  });

  const filteredKitchens = kitchens.filter(kitchen => 
    (kitchen.storeName || kitchen.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getKitchenMenu = (kitchen) => {
    if (!kitchen) {
      console.log('getKitchenMenu: No kitchen provided');
      return [];
    }
    // Robust mapping between products and kitchens
    const kitchenId = String(kitchen._id);
    const userId = kitchen.userId ? String(kitchen.userId._id || kitchen.userId) : null;
    
    console.log('getKitchenMenu: Looking for dishes for kitchen:', kitchenId, kitchen.storeName || kitchen.name);
    console.log('getKitchenMenu: Total products:', products.length);
    
    const menuItems = products.filter(p => {
      const cookId = p.cook ? String(p.cook._id || p.cook) : null;
      const match = cookId === kitchenId || (userId && cookId === userId);
      if (match) {
        console.log('getKitchenMenu: Found match -', p.name, 'cookId:', cookId);
      }
      return match;
    });
    
    console.log('getKitchenMenu: Found', menuItems.length, 'items');
    return menuItems;
  };

  // Handle dish click - fetch offers and open dialog (PHASE 3: uses adminDishId)
  const handleDishClick = async (dish) => {
    const sessionId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setFlowSessionId(sessionId);
    setFlowOrigin('menu');
    setFlowCompleted(false);
    
    // PHASE 3: Store AdminDish info for display
    setSelectedDish({ 
      name: dish.nameEn || dish.name, 
      nameAr: dish.nameAr, 
      _id: dish._id, 
      category: dish.category,
      longDescription: dish.longDescription,
      longDescriptionAr: dish.longDescriptionAr,
      description: dish.description,
      descriptionAr: dish.descriptionAr
    });
    setLoadingOffers(true);
    setDishOffers([]);
    
    try {
      // PHASE 3: Use adminDishId to fetch offers
      const response = await api.get(`/dish-offers/by-admin-dish/${dish._id}`);
      const data = response.data;
      
      if (data.success && data.offers && data.offers.length > 0) {
        // Filter out offers without valid cook info
        const validOffers = data.offers.filter(o => o.cook && o.cook._id);
        console.log('🍽️ Dish offers from API (PHASE 3):', validOffers.map(o => ({
          name: o.name, 
          cookId: o.cook?._id, 
          cookName: o.cook?.storeName || o.cook?.name,
          images: o.images,
          adminDishImage: o.adminDish?.imageUrl
        })));
        console.log('🍽️ Filtered out', data.offers.length - validOffers.length, 'offers with null cook');
        setDishOffers(validOffers);
      } else {
        // Generate dummy offers from dummyKitchens that have this dish
        const dummyOffers = generateDummyOffersForDish(dish);
        setDishOffers(dummyOffers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Generate dummy offers from dummyKitchens that have this dish
      const dummyOffers = generateDummyOffersForDish(dish);
      setDishOffers(dummyOffers);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Generate dummy offers for a dish from dummyKitchens
  const generateDummyOffersForDish = (dish) => {
    const offers = [];
    const dishName = dish.nameEn || dish.name;
    const dishNameAr = dish.nameAr;
    
    // Find all kitchens that have this dish in their dishes array
    dummyKitchens.forEach(kitchen => {
      // Check if kitchen has dishes array and find matching dish
      const kitchenDishes = kitchen.dishes || [];
      const kitchenDish = kitchenDishes.find(d => 
        d.name === dishName || d.nameAr === dishNameAr
      );
      
      if (kitchenDish) {
        offers.push({
          _id: `offer_${kitchen._id}_${dish._id}`,
          name: dishName,
          nameAr: dishNameAr,
          price: kitchenDish.price,
          cook: {
            _id: kitchen._id,
            name: kitchen.name,
            storeName: kitchen.storeName,
            profilePhoto: kitchen.profilePhoto,
            ratings: kitchen.ratings || { average: 4.5, count: 100 }
          },
          dishRatings: { average: kitchen.ratings?.average || 4.5, count: kitchen.ratings?.count || 100 },
          images: [kitchenDish.photoUrl || dish.photoUrl],
          adminDish: {
            _id: dish._id,
            name: dishName,
            nameAr: dishNameAr,
            imageUrl: dish.photoUrl,
            longDescription: dish.longDescription,
            longDescriptionAr: dish.longDescriptionAr,
            description: dish.description,
            descriptionAr: dish.descriptionAr
          }
        });
      }
    });
    
    return offers;
  };

  //Handle back from offer detail to offer list
  const handleBackToOfferList = () => {
    setSelectedOffer(null);
    setQuantity(1);
  };

  // Handle kitchen click - navigate to Menu page with By Kitchen toggle
  const handleKitchenClick = (kitchenId) => {
    console.log('🔍 handleKitchenClick called with:', kitchenId);
    console.log('📋 Available kitchens:', kitchens.map(k => ({ id: k._id, name: k.name || k.storeName })));
    
    setSelectedDish(null);
    setSelectedOffer(null);
    
    // Robust lookup handling both Cook ID and User ID
    const kitchen = kitchens.find(k => 
      String(k._id) === String(kitchenId) || 
      String(k.userId) === String(kitchenId) || 
      (k.userId && String(k.userId._id) === String(kitchenId))
    );
    
    console.log('🏪 Found kitchen:', kitchen ? kitchen.name || kitchen.storeName : 'NOT FOUND');
    
    setViewMode('kitchen');
    if (kitchen) {
      setActiveKitchen(kitchen);
      console.log('✅ Set active kitchen:', kitchen.name || kitchen.storeName);
    } else {
      console.warn('⚠️ Kitchen not found, navigating with state:', kitchenId);
      // If not found in current list, try navigating with state to trigger a fresh check
      navigate('/foodie/menu', { state: { viewMode: 'kitchen', selectedKitchenId: kitchenId } });
    }
  };

  // Handle add to cart with fly animation - PHASE 3: 2-layer model
  const handleAddToCart = (offer, event) => {
    // Check fulfillment selection if both options available
    const hasDelivery = offer.fulfillmentOptions?.includes('delivery');
    const hasPickup = offer.fulfillmentOptions?.includes('pickup');
    const hasBothOptions = hasDelivery && hasPickup;
    
    if (hasBothOptions && !selectedFulfillment) {
      setFulfillmentError(true);
      return;
    }
    
    // Create cart item - Store all required fields for delivery batching
    const hasCookImages = offer.images && offer.images.length > 0;
    const selectedMode = hasBothOptions ? selectedFulfillment : (hasDelivery ? 'delivery' : 'pickup');
    const cookId = String(offer.cook?._id || offer.cook || 'unknown');
    
    // Calculate prepTimeMinutes based on prepReadyConfig optionType
    const config = offer.prepReadyConfig || {};
    let prepTimeMinutes;
    if (config.optionType === 'fixed') {
      prepTimeMinutes = config.prepTimeMinutes || 30;
    } else if (config.optionType === 'range') {
      // Use average of min and max for batching purposes
      prepTimeMinutes = Math.round((config.prepTimeMinMinutes + config.prepTimeMaxMinutes) / 2) || 30;
    } else if (config.optionType === 'cutoff') {
      // For cutoff, use beforeCutoffReadyTime or default to 60 minutes
      prepTimeMinutes = config.beforeCutoffReadyTime || 60;
    } else {
      prepTimeMinutes = offer.prepTime || 30;
    }
    
    const cartItem = {
      offerId: offer._id,
      dishId: offer.adminDishId || offer.adminDish?._id,
      cookId: cookId,
      kitchenId: cookId,
      kitchenName: offer.cook?.storeName || offer.cook?.name || 'Unknown Kitchen',
      name: offer.name,
      price: offer.price,
      quantity,
      priceAtAdd: offer.price,
      photoUrl: getAbsoluteUrl(hasCookImages ? offer.images[0] : offer.adminDish?.imageUrl),
      prepTimeMinutes: prepTimeMinutes,
      fulfillmentMode: selectedMode,
      deliveryFee: offer.deliveryFee || 0,
      countryCode: countryCode,
    };
    
    // Check if adding from a different kitchen
    const hasMultipleKitchens = cart.length > 0 && cart.some(item => {
      const itemKitchenId = item.kitchenId?._id || item.kitchenId;
      const offerKitchenId = offer.cook?._id || offer.cook;
      return itemKitchenId !== offerKitchenId;
    });
      
    // Check if we've already shown the multi-kitchen warning
    const warningShown = localStorage.getItem('multiKitchenWarningShown') === 'true';
      
    // Show informational confirmation only if:
    // 1. Adding from different kitchen
    // 2. Warning hasn't been shown yet in this cart session
    if (hasMultipleKitchens && !warningShown) {
      setPendingItem(cartItem);
      setCartWarningOpen(true);
      return;
    }
      
    // Add to cart using context
    contextAddToCart(cartItem);
    
    // Show success notification
    showNotification(language === 'ar' ? 'تمت إضافة المنتج إلى السلة' : 'Item added to cart', 'success');
    
    // Dispatch custom event to update cart badge (already handled in context)
    window.dispatchEvent(new Event('cartUpdated'));
      
    // Trigger fly animation
    if (event && event.currentTarget) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setFlyingItem({
        // CORRECTED: Same image priority as cart item - cook images FIRST
        image: getAbsoluteUrl(hasCookImages ? offer.images[0] : offer.adminDish?.imageUrl),
        startX: buttonRect.left + buttonRect.width / 2,
        startY: buttonRect.top + buttonRect.height / 2,
      });
        
      setTimeout(() => setFlyingItem(null), 1000);
    }
      
    // IMMEDIATELY close all popups and return to origin
    setSelectedOffer(null);
    setSelectedDish(null);
    setDishOffers([]);
    setQuantity(1);
      
    // Reset flow tracking
    setFlowSessionId(null);
    setFlowOrigin(null);
    setFlowCompleted(false);
  };

  const addToCart = (product, kitchen) => {
    const cartItem = {
      ...product,
      offerId: product._id || product.offerId,
      dishId: product.adminDishId || product.adminDish?._id || product.dishId,
      cookId: kitchen._id,
      kitchenId: kitchen._id,
      kitchenName: kitchen.storeName || kitchen.name,
      name: product.name,
      price: product.price,
      quantity: 1,
      priceAtAdd: product.price,
      photoUrl: product.images?.[0] || product.photoUrl || product.image,
      prepTimeMinutes: product.prepTime || product.prepReadyConfig?.prepTimeMinutes || 30,
      deliveryFee: product.deliveryFee || 0,
      fulfillmentMode: product.fulfillmentMode || 'pickup',
      countryCode: countryCode,
    };

    // Check if adding from a different kitchen
    const differentKitchen = cart.length > 0 && cart.some(item => item.kitchenId !== kitchen._id);
    
    if (differentKitchen) {
      setPendingItem(cartItem);
      setCartWarningOpen(true);
    } else {
      contextAddToCart(cartItem);
      
      // Dispatch custom event to update cart badge
      window.dispatchEvent(new Event('cartUpdated'));
      // In a real app, we would call the API here
    }
  };

  const confirmAddToCart = () => {
    contextAddToCart(pendingItem);
    setCartWarningOpen(false);
    
    // Mark warning as shown for this cart session
    localStorage.setItem('multiKitchenWarningShown', 'true');
    
    // Success notification
    showNotification(language === 'ar' ? 'تمت إضافة المنتج إلى السلة' : 'Item added to cart', 'success');
    
    setPendingItem(null);
    
    // Dispatch custom event to update cart badge
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Close dialogs if they were open
    setSelectedOffer(null);
    setSelectedDish(null);
    setDishOffers([]);
  };

  // Handle cook favorite toggle
  const handleCookFavoriteToggle = async (event, cookId) => {
    event.stopPropagation(); // Prevent card click
    
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification(language === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first', 'warning');
      return;
    }

    const isFavorite = favoriteCooks.includes(cookId);

    try {
      // Use toggle endpoint
      const response = await api.post('/favorites/cook', { cookId });
      const data = response.data;

      if (response.status === 200) {
        if (data.favorited) {
          setFavoriteCooks([...favoriteCooks, cookId]);
        } else {
          setFavoriteCooks(favoriteCooks.filter(id => id !== cookId));
        }
        // Dispatch event for other components to update
        window.dispatchEvent(new Event('favoritesUpdated'));
      }
    } catch (error) {
      console.error('Error toggling cook favorite:', error);
    }
  };

  // Load favorite cooks on mount
  useEffect(() => {
    const loadFavoriteCooks = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await api.get('/favorites/cooks');
        if (response.status === 200) {
          const cooks = response.data;
          setFavoriteCooks(cooks.map(cook => cook._id));
        }
      } catch (error) {
        console.error('Error loading favorite cooks:', error);
      }
    };

    loadFavoriteCooks();
    
    // Listen for login/logout events
    window.addEventListener('storage', loadFavoriteCooks);
    return () => window.removeEventListener('storage', loadFavoriteCooks);
  }, []);

  return (
    <Box sx={{ direction: isRTL ? 'rtl' : 'ltr', px: '52px', py: 3, bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Container maxWidth={false} disableGutters>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.darkBrown, textAlign: isRTL ? 'right' : 'left', fontFamily: 'Inter' }}>
            {language === 'ar' ? 'المنيو' : 'Menu'}
          </Typography>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{
              bgcolor: COLORS.white,
              borderRadius: '20px',
              '& .MuiToggleButton-root': {
                px: 2,
                py: 0.5,
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 600,
                border: 'none',
                color: COLORS.bodyGray,
                '&.Mui-selected': {
                  bgcolor: COLORS.primaryOrange,
                  color: COLORS.white,
                  '&:hover': {
                    bgcolor: COLORS.primaryOrange,
                  }
                }
              }
            }}
          >
            <ToggleButton value="dish">
              {language === 'ar' ? 'بالطبق' : 'By Dish'}
            </ToggleButton>
            <ToggleButton value="kitchen">
              {language === 'ar' ? 'بالمطبخ' : 'By Kitchen'}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            placeholder={language === 'ar' ? 'عن أي شيء تبحث؟' : 'What are you looking for?'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: COLORS.primaryOrange }} />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': {
                height: '48px',
                '& fieldset': { borderColor: '#EAE5E2', borderRadius: '12px', border: '1px solid #EAE5E2' },
                '&:hover fieldset': { borderColor: COLORS.primaryOrange },
                '&.Mui-focused fieldset': { borderColor: COLORS.primaryOrange },
              },
            }}
          />
          <IconButton 
            onClick={openFilterDialog}
            sx={{ 
              bgcolor: hasActiveFilters ? COLORS.primaryOrange : COLORS.white, 
              borderRadius: '12px', 
              width: '48px', 
              height: '48px',
              border: '1px solid #E5E7EB',
              color: hasActiveFilters ? COLORS.white : COLORS.primaryOrange,
              '&:hover': { bgcolor: hasActiveFilters ? '#E66A00' : '#F5F5F5' }
            }}
          >
            <FilterListIcon />
          </IconButton>
        </Box>

        {/* Active Filter Chips */}
        {activeFilterChips.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {activeFilterChips.map((chip, index) => (
              <Chip
                key={index}
                label={chip.label}
                onDelete={chip.key === 'category' 
                  ? () => setSelectedCategory(null)
                  : chip.key === 'orderType'
                    ? () => setOrderType('All')
                    : chip.key === 'price'
                      ? () => { setMinPrice(0); setMaxPrice(500); }
                      : chip.key === 'deliveryTime'
                        ? () => setDeliveryTime('60')
                        : chip.key === 'distance'
                          ? () => setDistance(30)
                          : chip.key === 'popularCooks'
                            ? () => setShowOnlyPopularCooks(false)
                            : chip.key === 'popularDishes'
                              ? () => setShowOnlyPopularDishes(false)
                              : chip.key === 'sortBy'
                                ? () => setSortBy('Recommended')
                                : undefined
                }
                sx={{
                  bgcolor: COLORS.white,
                  border: `1px solid ${COLORS.primaryOrange}`,
                  color: COLORS.primaryOrange,
                  '& .MuiChip-label': { fontWeight: 500 },
                  '& .MuiChip-deleteIcon': { color: COLORS.primaryOrange }
                }}
              />
            ))}
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: COLORS.primaryOrange }} />
          </Box>
        ) : viewMode === 'dish' ? (
          <Box>
            {/* Category Tabs - Connected to Dishes Container */}
            <Box sx={{ pl: 6, pr: 6 }}>
            <Tabs
              value={selectedCategory || 'all'}
              onChange={(event, newValue) => setSelectedCategory(newValue === 'all' ? null : newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile={false}
              sx={{
                minHeight: '48px',
                '& .MuiTabs-indicator': {
                  display: 'none'
                },
                '& .MuiTab-root': {
                  minHeight: '48px',
                  minWidth: '100px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: COLORS.bodyGray,
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  border: '1px solid',
                  borderColor: COLORS.borderGray,
                  borderBottom: 'none',
                  bgcolor: COLORS.white,
                  position: 'relative',
                  ml: -0.5, // Negative margin for overlap
                  zIndex: 1, // Base z-index
                  // Simple z-index for directional overlay
                  '&:not(.Mui-selected)': {
                    zIndex: 10,
                  },
                  '&:first-of-type:not(.Mui-selected)': {
                    zIndex: isRTL ? 5 : 15, // First tab
                  },
                  '&:last-of-type:not(.Mui-selected)': {
                    zIndex: isRTL ? 15 : 5, // Last tab opposite
                  },
                  /* Trapezoid shape effect - only for non-last tabs */
                  '&:not(:last-of-type)::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: -6,
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '48px solid',
                    borderTopColor: COLORS.borderGray,
                    zIndex: -1,
                  },
                  '&:not(.Mui-selected):not(:last-of-type)::after': {
                    borderTopColor: '#F5F5F5',
                  },
                  '&.Mui-selected:not(:last-of-type)::after': {
                    borderTopColor: COLORS.white,
                  },
                  '&:not(.Mui-selected)': {
                    bgcolor: '#F5F5F5', // Light grey for inactive tabs
                    '&:hover': {
                      bgcolor: '#F0F0F0',
                    }
                  },
                  '&.Mui-selected': {
                    color: COLORS.primaryOrange,
                    bgcolor: COLORS.white,
                    borderColor: COLORS.borderGray,
                    borderBottom: 'none',
                    zIndex: 200, // Much higher z-index to ensure active tab always overlays all other tabs
                    position: 'relative',
                  },
                },
                '& .MuiTabs-scroller': {
                  overflowX: 'auto !important',
                  display: 'flex',
                },
                '& .MuiTabs-flexContainer': {
                  pb: 0,
                  alignItems: 'flex-start',
                  '& .MuiTab-root:first-of-type': {
                    ml: 0, // Remove negative margin for first tab to preserve left border
                  }
                }
              }}
            >
              <Tab
                value="all"
                label={language === 'ar' ? 'الكل' : 'All'}
                sx={{
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  border: '1px solid',
                  borderColor: COLORS.borderGray,
                  borderBottom: 'none',
                }}
              />
              {categories.map((cat) => (
                <Tab
                  key={cat._id}
                  value={cat._id}
                  label={language === 'ar' ? (cat.nameAr || cat.nameEn || cat.name) : (cat.nameEn || cat.name)}
                  sx={{
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    border: '1px solid',
                    borderColor: COLORS.borderGray,
                    borderBottom: 'none',
                  }}
                />
              ))}
            </Tabs>
            </Box>

            <Box sx={{ 
              bgcolor: COLORS.white, 
              borderRadius: '24px 24px 24px 24px', // Rounded on all edges
              p: 3, 
              mt: 0, // Remove top margin since tabs connect directly
              border: '1px solid',
              borderColor: COLORS.borderGray,
              position: 'relative',
              zIndex: 1, // Lower z-index to allow tab extension to overlay
            }}>
              <Grid container spacing={3}>
                {filteredDishes.length === 0 ? (
                  <Grid item xs={12}>
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography sx={{ color: COLORS.bodyGray, fontSize: '18px' }}>
                        {language === 'ar' ? 'لا توجد أطباق متاحة' : 'No dishes available'}
                      </Typography>
                      <Typography sx={{ color: COLORS.mutedGray, fontSize: '14px', mt: 1 }}>
                        {language === 'ar' ? `إجمالي الأطباق: ${products.length}` : `Total Dishes: ${products.length}`}
                      </Typography>
                    </Box>
                  </Grid>
                ) : (
                  filteredDishes.map((dish) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={dish._id}>
                      <Card 
                        onClick={() => handleDishClick(dish)}
                        sx={{ 
                          borderRadius: '20px', 
                          overflow: 'hidden', 
                          boxShadow: 'none',
                          border: '1px solid #E8E2DF',
                          bgcolor: '#FAF5F3',
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-4px)' }
                        }}
                      >
                        {/* PHASE 3: Use adminDish.imageUrl with STATIC_BASE_URL handling */}
                        {/* PHASE 3: Use adminDish.imageUrl with getAbsoluteUrl helper */}
                        {(() => {
                          const imageUrl = normalizeImageUrl(dish.imageUrl || dish.image || dish.photoUrl);
                          return (
                            <Box
                              sx={{ 
                                width: '100%', 
                                height: '160px', 
                                bgcolor: '#E8DACC',
                                backgroundImage: `url(${imageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: '20px'
                              }}
                            />
                          );
                        })()}
                        <Box sx={{ p: 2 }}>
                          {/* PHASE 3: Bilingual name display */}
                          <Typography sx={{ fontWeight: 700, color: COLORS.darkBrown, mb: 0.5, fontSize: isRTL ? '22px' : '18px' }}>
                            {language === 'ar' ? (dish.nameAr || dish.name) : (dish.name || dish.nameEn)}
                          </Typography>
                          {/* PHASE 3: Show offer count from with-stats endpoint (with safety default) */}
                          <Typography sx={{ color: COLORS.bodyGray, fontSize: isRTL ? '18px' : '15px', mb: 1.5 }}>
                            {language === 'ar' ? `متاح من ${dish.kitchenCount || dish.offerCount || 0} مطابخ` : `Available from ${dish.kitchenCount || dish.offerCount || 0} kitchens`}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* PHASE 3: Show 'From' with minPrice from with-stats (with safety default) */}
                            <Typography sx={{ fontWeight: 700, color: COLORS.primaryOrange }}>
                              {dish.minPrice !== undefined && dish.minPrice !== null
                                ? (language === 'ar' ? `تبدأ من ${formatCurrency(dish.minPrice)}` : `From ${formatCurrency(dish.minPrice)}`)
                                : (language === 'ar' ? '—' : '—')}
                            </Typography>
                            <IconButton size="small" sx={{ color: COLORS.primaryOrange }}>
                              <ChevronRightIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </Box>
          </Box>
        ) : activeKitchen ? (
          <Box>
            {/* Kitchen Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <IconButton onClick={() => setActiveKitchen(null)} sx={{ color: COLORS.darkBrown }}>
                <ChevronRightIcon sx={{ transform: isRTL ? 'none' : 'rotate(180deg)' }} />
              </IconButton>
              <Avatar src={getAbsoluteUrl(activeKitchen?.profilePhoto)} sx={{ width: 80, height: 80, borderRadius: '16px' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.darkBrown }}>
                  {activeKitchen.storeName || activeKitchen.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={activeKitchen.rating || 4.5} readOnly size="small" />
                  <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                    (120+ reviews)
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.darkBrown, mb: 2 }}>
              {language === 'ar' ? 'الأطباق المتاحة' : 'Available Dishes'}
            </Typography>
            
            {/* Traditional List Layout with Category Headers */}
            {(() => {
              const menuItems = getKitchenMenu(activeKitchen);
              if (menuItems.length === 0) {
                return (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: COLORS.bodyGray }}>
                      {language === 'ar' ? 'لا توجد أطباق متاحة' : 'No dishes available'}
                    </Typography>
                  </Box>
                );
              }
              return defaultCategories.map(category => {
                const categoryItems = menuItems.filter(p => p.category?._id === category._id);
                if (categoryItems.length === 0) return null;
                const categoryName = getCategoryName(category);
              
              return (
                <Box key={category._id} sx={{ mb: 4 }}>
                  <Typography sx={{ fontWeight: 700, color: COLORS.bodyGray, mb: 2, borderBottom: `2px solid ${COLORS.bodyGray}`, display: 'inline-block', fontSize: '18px' }}>
                    {categoryName}
                  </Typography>
                  <Grid container spacing={2}>
                    {categoryItems.map((product) => (
                      <Grid item xs={12} key={product._id}>
                        <Card sx={{ p: 2, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 2, boxShadow: 'none', border: '1px solid #E8E2DF', bgcolor: '#FAF5F3' }}>
                          <Box
                            sx={{ 
                              width: 80, 
                              height: 80, 
                              borderRadius: '16px', 
                              backgroundImage: `url(${normalizeImageUrl(product.photoUrl || product.imageUrl || product.image)})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              bgcolor: '#F5F5F5'
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 700, color: COLORS.darkBrown }}>
                              {product.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrientation: 'vertical', overflow: 'hidden' }}>
                              {product.description}
                            </Typography>
                            <Typography sx={{ fontWeight: 700, color: COLORS.primaryOrange }}>
                              {formatCurrency(product.price, language)}
                            </Typography>
                          </Box>
                          <Button 
                            variant="contained" 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product, activeKitchen);
                            }}
                            sx={{ 
                              bgcolor: COLORS.primaryOrange, 
                              borderRadius: '8px', 
                              textTransform: 'none',
                              minWidth: '100px',
                              '&:hover': { bgcolor: '#E66A00' }
                            }}
                          >
                            {language === 'ar' ? 'أضف' : 'Add'}
                          </Button>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              );
            });
          })()}
          </Box>
        ) : (
          <Box sx={{ 
            bgcolor: COLORS.white, 
            borderRadius: '24px', 
            p: 3, 
            mt: 3 
          }}>
            <Grid container spacing={3}>
              {filteredKitchens.length === 0 ? (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography sx={{ color: COLORS.bodyGray, fontSize: '18px' }}>
                      {language === 'ar' ? 'لا توجد مطابخ متاحة' : 'No kitchens available'}
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                filteredKitchens.map((kitchen) => (
                  <Grid item xs={12} sm={6} md={4} key={kitchen._id}>
                    <Card 
                      onClick={() => setActiveKitchen(kitchen)}
                      sx={{ 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        boxShadow: 'none',
                        border: '1px solid #E8E2DF',
                        bgcolor: '#FAF5F3',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)' },
                        position: 'relative'
                      }}
                    >
                      {/* Favorite Icon */}
                      <IconButton
                        onClick={(e) => handleCookFavoriteToggle(e, kitchen._id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: isRTL ? 'auto' : 8,
                          left: isRTL ? 8 : 'auto',
                          zIndex: 1,
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' }
                        }}
                      >
                        {favoriteCooks.includes(kitchen._id) ? (
                          <FavoriteIcon sx={{ color: COLORS.primaryOrange }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ color: COLORS.bodyGray }} />
                        )}
                      </IconButton>
                      <Box sx={{ display: 'flex', p: 2, alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={getAbsoluteUrl(kitchen?.profilePhoto)} 
                          sx={{ width: 64, height: 64, borderRadius: '12px' }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: COLORS.darkBrown, fontSize: isRTL ? '22px' : '18px' }}>
                            {kitchen.storeName || kitchen.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ color: '#FFB800', fontSize: '16px' }} />
                            <Typography sx={{ fontSize: isRTL ? '18px' : '15px', fontWeight: 600 }}>
                              {kitchen.rating || '4.5'}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: isRTL ? '17px' : '14px', color: COLORS.bodyGray }}>
                            {t('expertise', { returnObjects: true })[kitchen.expertise]?.title || kitchen.specialty || (language === 'ar' ? 'أكل بيتي مصري' : 'Egyptian Home Food')}
                          </Typography>
                        </Box>
                        <IconButton sx={{ color: COLORS.primaryOrange }}>
                          <ChevronRightIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        )}

        {/* Dish Selection Dialog - PHASE 3: Uses adminDishId */}
        <Dialog 
          open={Boolean(selectedDish && !selectedOffer)} 
          onClose={() => {
            setSelectedDish(null);
            setDishOffers([]);
          }}
          fullWidth
          maxWidth="sm"
          PaperProps={{ sx: { borderRadius: '24px' } }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: COLORS.darkBrown, pt: 3 }}>
            {/* PHASE 3: Display bilingual dish name */}
            {selectedDish ? (language === 'ar' ? (selectedDish.nameAr || selectedDish.name) : selectedDish.name) : ''}
            <Typography variant="body2" sx={{ color: COLORS.bodyGray, mt: 0.5 }}>
              {language === 'ar' ? 'اختر المطبخ المفضل لديك' : 'Select your preferred kitchen'}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            {loadingOffers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: COLORS.primaryOrange }} />
              </Box>
            ) : (
              <List sx={{ pt: 0 }}>
                {dishOffers
                  .sort((a, b) => {
                    // Priority 1: Kitchens already in cart
                    const aInCart = cart.some(item => item.kitchenId === a.cook?._id);
                    const bInCart = cart.some(item => item.kitchenId === b.cook?._id);
                    if (aInCart && !bInCart) return -1;
                    if (!aInCart && bInCart) return 1;
                    
                    // Priority 2: Highest rated
                    const aRating = a.cook?.rating || 4.5;
                    const bRating = b.cook?.rating || 4.5;
                    if (aRating !== bRating) return bRating - aRating;
                    
                    // Priority 3: Lowest price
                    return a.price - b.price;
                  })
                  .map((product) => (
                  <ListItem 
                    key={product._id}
                    sx={{ 
                      border: '1px solid #EEE', 
                      borderRadius: '16px', 
                      mb: 1.5,
                      '&:hover': { bgcolor: '#FAFAFA' }
                    }}
                  >
                    <ListItemAvatar onClick={() => handleKitchenClick(product.cook?._id || product.cook)} sx={{ cursor: 'pointer' }}>
                      <Avatar src={getAbsoluteUrl(product?.cook?.profilePhoto)} sx={{ borderRadius: '8px' }} />
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Typography 
                          sx={{ 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            '&:hover': { color: COLORS.primaryOrange, textDecoration: 'underline' }
                          }}
                          onClick={() => handleKitchenClick(product.cook?._id || product.cook)}
                        >
                          {product.cook?.storeName || product.cook?.name}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Rating value={product.cook?.rating || 4.5} readOnly size="small" />
                            <Typography component="span" variant="caption" sx={{ color: COLORS.bodyGray }}>
                              (120+)
                            </Typography>
                          </Box>
                        </React.Fragment>
                      }
                    />
                    <Box sx={{ textAlign: isRTL ? 'left' : 'right' }}>
                      <Typography sx={{ fontWeight: 700, color: COLORS.primaryOrange, mb: 1 }}>
                        {formatCurrency(product.price, language)}
                      </Typography>
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={() => handleOfferClick(product)}
                        sx={{ 
                          bgcolor: COLORS.primaryOrange, 
                          borderRadius: '8px',
                          textTransform: 'none',
                          px: 2
                        }}
                      >
                        {language === 'ar' ? 'عرض' : 'View'}
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
        </Dialog>

        {/* Offer Detail Dialog - PHASE 3: Uses offer.images[] first, fallback to adminDish.imageUrl */}
        <Dialog 
          open={Boolean(selectedOffer)} 
          onClose={() => {
            setSelectedOffer(null);
            setQuantity(1);
          }}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: '24px' } }}
        >
          {selectedOffer && (
            <>
              <Box sx={{ position: 'fixed', top: 0, right: 0, bgcolor: '#FF7A00', color: 'white', px: 2, py: 0.5, zIndex: 9999, fontSize: '12px', fontWeight: 'bold' }}>BUILD_STAMP: FEB04_A1</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #EEE' }}>
                <IconButton onClick={handleBackToOfferList} sx={{ mr: 1 }}>
                  <ArrowBackIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {/* PHASE 3: Bilingual offer name */}
                  {selectedOffer ? (language === 'ar' ? (selectedOffer.nameAr || selectedOffer.name) : selectedOffer.name) : ''}
                </Typography>
              </Box>
              <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Image Gallery - CORRECTED: Cook images FIRST, admin fallback ONLY if no cook images */}
                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        width: '100%',
                        height: '300px',
                        borderRadius: '16px',
                        // CORRECTED PRIORITY: 
                        // 1. User-selected thumbnail
                        // 2. Cook-uploaded images (first/default)
                        // 3. Admin image ONLY if NO cook images exist
                        // 4. Placeholder fallback
                        backgroundImage: `url(${getAbsoluteUrl(
                          selectedMainImage || 
                          (selectedOffer?.images?.length > 0 ? selectedOffer.images[0] : null) || 
                          selectedOffer?.adminDish?.imageUrl
                        ) || '/assets/dishes/placeholder.png'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        mb: 2,
                      }}
                    />
                    {/* Thumbnails: Show ALL cook-uploaded images when more than 1 exists */}
                    {selectedOffer?.images && selectedOffer.images.length > 1 && (
                      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                        {selectedOffer.images.map((img, index) => {
                          const isDefault = index === 0;
                          const isSelected = selectedMainImage === img;
                          return (
                            <Box
                              key={index}
                              onClick={() => setSelectedMainImage(img)}
                              sx={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                backgroundImage: `url(${getAbsoluteUrl(img)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                border: isSelected ? '3px solid #FF7A00' : (isDefault ? '2px solid #FF7A00' : '2px solid #DDD'),
                                flexShrink: 0,
                                cursor: 'pointer',
                                position: 'relative',
                                '&:hover': { border: '3px solid #FF7A00' }
                              }}
                            >
                              {isDefault && (
                                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(255,122,0,0.8)', color: 'white', fontSize: '8px', textAlign: 'center', py: 0.25 }}>
                                  {language === 'ar' ? 'افتراضي' : 'Default'}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Grid>

                  {/* Dish Info */}
                  <Grid item xs={12} md={6}>
                    {/* Dish Name */}
                    <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.darkBrown, mb: 1 }}>
                      {selectedOffer ? (language === 'ar' ? (selectedOffer.nameAr || selectedOffer.name) : selectedOffer.name) : ''}
                    </Typography>

                    {/* Dish Ratings */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating 
                          value={selectedOffer.dishRatings?.average || 0} 
                          readOnly 
                          precision={0.1}
                          size="small"
                        />
                        <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                          ({selectedOffer.dishRatings?.count || 0} {language === 'ar' ? 'تقييم' : 'ratings'})
                        </Typography>
                      </Box>
                    </Box>

                    {/* Description */}
                    {(selectedOffer.description || selectedOffer.descriptionAr) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: COLORS.bodyGray, lineHeight: 1.6 }}>
                          {language === 'ar' 
                            ? (selectedOffer.descriptionAr || selectedOffer.description)
                            : (selectedOffer.description || selectedOffer.descriptionAr)
                          }
                        </Typography>
                      </Box>
                    )}

                    {/* Portion */}
                    {selectedOffer.portionSize && (
                      <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1 }}>
                        <strong>{language === 'ar' ? 'الحجم: ' : 'Portion: '}</strong>{selectedOffer.portionSize}
                      </Typography>
                    )}

                    {/* Preparation Time */}
                    {(() => {
                      const prepConfig = selectedOffer.prepReadyConfig;
                      if (!prepConfig) return null;
                      
                      // Check optionType first to determine display
                      const optionType = prepConfig.optionType;
                      
                      // Cutoff rule - check first
                      if (optionType === 'cutoff' && prepConfig.cutoffTime) {
                        return (
                          <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1 }}>
                            <strong>{language === 'ar' ? 'وقت التحضير: ' : 'Prep Time: '}</strong>
                            {language === 'ar' 
                              ? `اطلب قبل ${prepConfig.cutoffTime} (جاهز بحلول ${prepConfig.beforeCutoffReadyTime || 'غير محدد'})`
                              : `Order before ${prepConfig.cutoffTime} (Ready by ${prepConfig.beforeCutoffReadyTime || 'N/A'})`
                            }
                          </Typography>
                        );
                      }
                      
                      // Time range
                      if (optionType === 'range' && prepConfig.prepTimeMinMinutes && prepConfig.prepTimeMaxMinutes) {
                        return (
                          <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1 }}>
                            <strong>{language === 'ar' ? 'وقت التحضير: ' : 'Prep Time: '}</strong>
                            {prepConfig.prepTimeMinMinutes}-{prepConfig.prepTimeMaxMinutes} {language === 'ar' ? 'دقيقة' : 'min'}
                          </Typography>
                        );
                      }
                      
                      // Fixed time (default)
                      if (prepConfig.prepTimeMinutes) {
                        return (
                          <Typography variant="body2" sx={{ color: COLORS.bodyGray, mb: 1 }}>
                            <strong>{language === 'ar' ? 'وقت التحضير: ' : 'Prep Time: '}</strong>
                            {prepConfig.prepTimeMinutes} {language === 'ar' ? 'دقيقة' : 'min'}
                          </Typography>
                        );
                      }
                      
                      return null;
                    })()}

                    {/* Price */}
                    <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.primaryOrange, mb: 2 }}>
                      {formatCurrency(selectedOffer.price, language)}
                    </Typography>

                    {/* Quantity Selector */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {language === 'ar' ? 'الكمية' : 'Quantity'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton 
                          size="small"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          sx={{ 
                            bgcolor: COLORS.bgCream,
                            '&:hover': { bgcolor: '#F0EBE8' }
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>-</Typography>
                        </IconButton>
                        <Typography sx={{ minWidth: '40px', textAlign: 'center', fontWeight: 600, fontSize: '18px' }}>
                          {quantity}
                        </Typography>
                        <IconButton 
                          size="small"
                          onClick={() => setQuantity(quantity + 1)}
                          sx={{ 
                            bgcolor: COLORS.bgCream,
                            '&:hover': { bgcolor: '#F0EBE8' }
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>+</Typography>
                        </IconButton>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Cook/Kitchen Info - Clickable */}
                    <Box 
                      onClick={() => handleKitchenClick(selectedOffer.cook?._id || selectedOffer.cook)}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        mb: 2, 
                        p: 2, 
                        bgcolor: COLORS.bgCream,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#F0EBE8' }
                      }}
                    >
                      <Avatar 
                        src={getAbsoluteUrl(selectedOffer?.cook?.profilePhoto)} 
                        sx={{ width: 48, height: 48, borderRadius: '8px' }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600, color: COLORS.darkBrown }}>
                          {selectedOffer.cook?.storeName || selectedOffer.cook?.name || 'Unknown Kitchen'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Rating 
                            value={selectedOffer.cook?.ratings?.average || 4.5} 
                            readOnly 
                            size="small" 
                            precision={0.1}
                          />
                          <Typography variant="caption" sx={{ color: COLORS.bodyGray }}>
                            ({selectedOffer.cook?.ratings?.count || '120+'})
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Fulfillment Selection */}
                    {(() => {
                      const hasDelivery = selectedOffer.fulfillmentOptions?.includes('delivery');
                      const hasPickup = selectedOffer.fulfillmentOptions?.includes('pickup');
                      const hasBothOptions = hasDelivery && hasPickup;
                      
                      if (hasBothOptions) {
                        return (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: fulfillmentError ? 'error.main' : 'inherit' }}>
                              {language === 'ar' ? 'كيف تريد استلام طلبك؟ *' : 'How would you like to receive your order? *'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                fullWidth
                                variant={selectedFulfillment === 'delivery' ? 'contained' : 'outlined'}
                                onClick={() => { setSelectedFulfillment('delivery'); setFulfillmentError(false); }}
                                sx={{
                                  bgcolor: selectedFulfillment === 'delivery' ? COLORS.primaryOrange : 'transparent',
                                  borderColor: fulfillmentError ? 'error.main' : COLORS.primaryOrange,
                                  color: selectedFulfillment === 'delivery' ? 'white' : COLORS.primaryOrange,
                                  '&:hover': { bgcolor: selectedFulfillment === 'delivery' ? '#E06900' : 'rgba(255,122,0,0.1)' }
                                }}
                              >
                                {language === 'ar' ? 'توصيل' : 'Delivery'}
                              </Button>
                              <Button
                                fullWidth
                                variant={selectedFulfillment === 'pickup' ? 'contained' : 'outlined'}
                                onClick={() => { setSelectedFulfillment('pickup'); setFulfillmentError(false); }}
                                sx={{
                                  bgcolor: selectedFulfillment === 'pickup' ? COLORS.primaryOrange : 'transparent',
                                  borderColor: fulfillmentError ? 'error.main' : COLORS.primaryOrange,
                                  color: selectedFulfillment === 'pickup' ? 'white' : COLORS.primaryOrange,
                                  '&:hover': { bgcolor: selectedFulfillment === 'pickup' ? '#E06900' : 'rgba(255,122,0,0.1)' }
                                }}
                              >
                                {language === 'ar' ? 'استلام' : 'Pickup'}
                              </Button>
                            </Box>
                            {fulfillmentError && (
                              <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>
                                {language === 'ar' ? 'الرجاء اختيار التوصيل أو الاستلام' : 'Please choose delivery or pickup'}
                              </Typography>
                            )}
                          </Box>
                        );
                      } else if (hasDelivery || hasPickup) {
                        return (
                          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F5F5F5', borderRadius: '8px' }}>
                            <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                              {language === 'ar' ? 'متاح للـ: ' : 'Available for: '}
                              <strong>{hasDelivery ? (language === 'ar' ? 'التوصيل' : 'Delivery') : (language === 'ar' ? 'الاستلام' : 'Pickup')}</strong>
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    })()}

                    {/* Add to Cart Button */}
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={(e) => handleAddToCart(selectedOffer, e)}
                      sx={{
                        bgcolor: '#595757',
                        color: COLORS.white,
                        py: 1.5,
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#484646' }
                      }}
                    >
                      {language === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart'}
                    </Button>
                  </Grid>
                </Grid>
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* Flying Cart Animation */}
        {flyingItem && (
          <Box
            sx={{
              position: 'fixed',
              left: flyingItem.startX,
              top: flyingItem.startY,
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundImage: `url(${flyingItem.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: 9999,
              pointerEvents: 'none',
              animation: 'flyToCart 1s ease-in-out forwards',
              '@keyframes flyToCart': {
                '0%': {
                  transform: 'translate(0, 0) scale(1)',
                  opacity: 1,
                },
                '100%': {
                  transform: `translate(${(isRTL ? -1 : 1) * (window.innerWidth - flyingItem.startX - 30)}px, ${-flyingItem.startY}px) scale(0.2)`,
                  opacity: 0,
                },
              },
            }}
          />
        )}

        {/* Multi-Kitchen Warning Dialog */}
        <Dialog open={cartWarningOpen} onClose={() => setCartWarningOpen(false)}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {language === 'ar' ? 'تنبيه طلب من مطابخ متعددة' : 'Multi-Kitchen Order Warning'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {language === 'ar' 
                ? 'أنت تقوم بإضافة أصناف من مطابخ مختلفة. سيشمل هذا الطلب مواقع استلام متعددة.' 
                : 'You are adding items from another kitchen. This order will include multiple pickup locations.'}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setCartWarningOpen(false)} color="inherit">
              {language === 'ar' ? 'الرجوع' : 'Go back'}
            </Button>
            <Button onClick={confirmAddToCart} variant="contained" sx={{ bgcolor: COLORS.primaryOrange }}>
              {language === 'ar' ? 'استمرار' : 'Continue'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Refine / Filter Dialog - Full Mobile Implementation */}
        <Dialog
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          PaperProps={{ 
            sx: { 
              maxWidth: '500px', 
              width: '100%',
              height: '100vh',
              maxHeight: '100vh',
              overflow: 'hidden',
              m: 0,
              position: 'fixed',
              top: 0,
              right: isRTL ? 0 : 'auto',
              left: isRTL ? 'auto' : 0,
              bottom: 0,
              borderRadius: 0 // Remove rounded corners
            } 
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: '22px', pb: 1, color: COLORS.darkBrown, flexShrink: 0 }}>
            {language === 'ar' ? 'تحسين' : 'Refine Search'}
          </DialogTitle>
          <DialogContent sx={{ 
            pt: 0, 
            px: 3, 
            pb: 2, 
            overflowY: 'auto',
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' } // Chrome/Safari
          }}>
            <Box>
              {/* Price Range */}
              <Typography sx={{ fontWeight: 600, mb: 1.5, mt: 1, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'نطاق السعر' : 'Price Range'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: COLORS.bodyGray, mb: 0.5, display: 'block' }}>{language === 'ar' ? 'الحد الأدنى' : 'Min'}</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={tempFilters.minPrice ?? 0}
                    onChange={(e) => setTempFilters({ ...tempFilters, minPrice: parseFloat(e.target.value) || 0 })}
                    placeholder={`0 ${currencyCode}`}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: COLORS.bodyGray, mb: 0.5, display: 'block' }}>{language === 'ar' ? 'الحد الأقصى' : 'Max'}</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={tempFilters.maxPrice ?? 500}
                    onChange={(e) => setTempFilters({ ...tempFilters, maxPrice: parseFloat(e.target.value) || 500 })}
                    placeholder={`${currencyCode} 500`}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
              </Grid>

              {/* Categories */}
              <Typography sx={{ fontWeight: 600, mb: 1.5, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'الفئات' : 'Categories'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {categories.map((cat) => (
                  <Chip
                    key={cat._id}
                    label={language === 'ar' ? (cat.nameAr || cat.nameEn || cat.name) : (cat.nameEn || cat.name)}
                    onClick={() => {
                      const current = tempFilters.selectedCategory;
                      setTempFilters({ ...tempFilters, selectedCategory: current === cat._id ? null : cat._id });
                    }}
                    sx={{
                      bgcolor: (tempFilters.selectedCategory ?? null) === cat._id ? COLORS.primaryOrange : COLORS.white,
                      color: (tempFilters.selectedCategory ?? null) === cat._id ? COLORS.white : COLORS.darkBrown,
                      border: `1px solid ${(tempFilters.selectedCategory ?? null) === cat._id ? COLORS.primaryOrange : COLORS.borderGray}`,
                      fontWeight: 600,
                      fontSize: '12px',
                      height: '32px',
                      '&:hover': { 
                        bgcolor: (tempFilters.selectedCategory ?? null) === cat._id ? COLORS.primaryOrange : '#F5F5F5',
                        borderColor: COLORS.primaryOrange
                      },
                      '& .MuiChip-label': { px: 2 }
                    }}
                  />
                ))}
              </Box>

              {/* Order Type */}
              <Typography sx={{ fontWeight: 600, mb: 1, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'نوع الطلب' : 'Order Type'}
              </Typography>
              <ToggleButtonGroup
                value={tempFilters.orderType ?? 'All'}
                exclusive
                onChange={(e, value) => value && setTempFilters({ ...tempFilters, orderType: value })}
                fullWidth
                sx={{ 
                  height: '40px',
                  '& .MuiToggleButton-root': { 
                    textTransform: 'none', 
                    fontWeight: 600,
                    color: COLORS.darkBrown,
                    '&.Mui-selected': {
                      bgcolor: COLORS.primaryOrange,
                      color: COLORS.white,
                      '&:hover': { bgcolor: COLORS.primaryOrange }
                    }
                  } 
                }}
              >
                <ToggleButton value="All" sx={{ borderRadius: '8px 0 0 8px' }}>
                  {language === 'ar' ? 'الكل' : 'All'}
                </ToggleButton>
                <ToggleButton value="Delivery">
                  {language === 'ar' ? 'توصيل' : 'Delivery'}
                </ToggleButton>
                <ToggleButton value="Pickup" sx={{ borderRadius: '0 8px 8px 0' }}>
                  {language === 'ar' ? 'استلام' : 'Pickup'}
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Delivery Time */}
              <Typography sx={{ fontWeight: 600, mb: 1, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'وقت التوصيل' : 'Delivery Time'}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={tempFilters.deliveryTime ?? '60'}
                  onChange={(e) => setTempFilters({ ...tempFilters, deliveryTime: e.target.value })}
                  sx={{ borderRadius: '10px', height: '40px' }}
                >
                  {deliveryTimeOptions.map((time) => (
                    <MenuItem key={time} value={time}>
                      {language === 'ar' ? `خلال ${time} دقيقة` : `Within ${time} min`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Distance */}
              <Typography sx={{ fontWeight: 600, mb: 1, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'المسافة' : 'Distance'}
              </Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={tempFilters.distance ?? 30}
                  onChange={(e, value) => setTempFilters({ ...tempFilters, distance: value })}
                  min={1}
                  max={50}
                  sx={{ 
                    color: COLORS.primaryOrange,
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                      bgcolor: COLORS.white,
                      border: `2px solid ${COLORS.primaryOrange}`
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.bodyGray, display: 'block', textAlign: 'center', mt: -1 }}>
                {language === 'ar' 
                  ? `إظهار الطهاة في غضون ${(tempFilters.distance ?? 30).toFixed(0)} كم`
                  : `Show Cooks within ${(tempFilters.distance ?? 30).toFixed(0)} km`}
              </Typography>

              {/* Popularity */}
              <Typography sx={{ fontWeight: 600, mb: 1, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'الشهرة' : 'Popularity'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                  {language === 'ar' ? 'إظهار الطهاة المشهورين فقط' : 'Show only Popular Cooks'}
                </Typography>
                <Switch
                  checked={tempFilters.showOnlyPopularCooks ?? false}
                  onChange={(e) => setTempFilters({ ...tempFilters, showOnlyPopularCooks: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.primaryOrange }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: COLORS.primaryOrange } }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: COLORS.bodyGray }}>
                  {language === 'ar' ? 'إظهار الأطباق المميزة فقط' : 'Show only Featured Dishes'}
                </Typography>
                <Switch
                  checked={tempFilters.showOnlyPopularDishes ?? false}
                  onChange={(e) => setTempFilters({ ...tempFilters, showOnlyPopularDishes: e.target.checked })}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.primaryOrange }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: COLORS.primaryOrange } }}
                />
              </Box>

              {/* Sort By */}
              <Typography sx={{ fontWeight: 600, mb: 1, mt: 3, fontSize: '15px', color: COLORS.darkBrown }}>
                {language === 'ar' ? 'الترتيب' : 'Sort By'}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={tempFilters.sortBy ?? 'Recommended'}
                  onChange={(e) => setTempFilters({ ...tempFilters, sortBy: e.target.value })}
                  sx={{ borderRadius: '10px', height: '40px', mb: 2 }}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => {
                setTempFilters({
                  minPrice: 0,
                  maxPrice: 500,
                  orderType: 'All',
                  deliveryTime: '60',
                  distance: 30,
                  showOnlyPopularCooks: false,
                  showOnlyPopularDishes: false,
                  sortBy: 'Recommended',
                  selectedCategory: null
                });
              }}
              fullWidth
              variant="outlined"
              sx={{ 
                borderRadius: '24px', 
                height: '42px',
                borderColor: COLORS.darkBrown,
                color: COLORS.darkBrown
              }}
            >
              {language === 'ar' ? 'مسح' : 'Clear'}
            </Button>
            <Button 
              onClick={applyFilters}
              fullWidth
              variant="contained"
              sx={{ 
                bgcolor: COLORS.primaryOrange, 
                borderRadius: '24px', 
                height: '42px',
                '&:hover': { bgcolor: '#E66A00' }
              }}
            >
              {language === 'ar' ? 'تطبيق' : 'Apply'}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
};

export default FoodieMenu;

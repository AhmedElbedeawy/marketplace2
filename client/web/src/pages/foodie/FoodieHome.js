import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, TextField, InputAdornment, Button, Container, Grid, CardMedia, Avatar, Rating, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { Search as SearchIcon, Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon, Restaurant as RestaurantIcon, Facebook as FacebookIcon, Twitter as TwitterIcon, Instagram as InstagramIcon, LinkedIn as LinkedInIcon, YouTube as YouTubeIcon, ArrowBack as ArrowBackIcon, ChevronRight as ChevronRightIcon, ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTypographyStyle, getSxTypography } from '../../utils/typography';
import { useCountry } from '../../contexts/CountryContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import api, { STATIC_BASE_URL, getAbsoluteUrl, normalizeImageUrl } from '../../utils/api';
import { getCookImageUrl } from '../../utils/imageHelper';
import CookDetailsDialog from '../../components/CookDetailsDialog';
import TopRatedCookCard from '../../components/TopRatedCookCard';
import HomeLoadingOverlay from '../../components/HomeLoadingOverlay';
import MenuDishModalHost from '../../components/foodie/MenuDishModalHost';

const toArabicDigits = (num) => {
  return num.toString().replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

const FoodieHome = () => {
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode, cart, addToCart } = useCountry();
  const { showNotification } = useNotification();
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const loggedInUser = storedUser;
  const loggedInFirstName = loggedInUser?.name?.split(' ')[0] || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const navigate = useNavigate();
  const [selectedCook, setSelectedCook] = useState(null);
  const [popularDishes, setPopularDishes] = useState([]);
  const [topCooks, setTopCooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true); // Start true - overlay shows immediately
  const heroLoadedRef = useRef(false);
  const modalHostRef = useRef(null);
  const [stats, setStats] = useState({ totalDishes: 0, totalCooks: 0 });
  const [cartWarningOpen, setCartWarningOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [locationGateOpen, setLocationGateOpen] = useState(false);

  // DUMMY DATA FOR RESTORATION - 10 Featured Dishes with Cook Assignments
  const dummyPopularDishes = [
    // C1 - Amal Kitchen (Traditional Egyptian)
    {
      _id: 'd1',
      nameEn: 'Molokhia',
      nameAr: 'ملوخية',
      description: 'Molokhia with garlic and coriander',
      descriptionAr: 'ملوخية متشوّحة بالثوم والكزبرة',
      longDescription: 'Traditional Egyptian molokhia made from fresh jute leaves, sautéed with garlic and coriander in ghee, served hot with a rich homemade flavor.',
      longDescriptionAr: 'الملوخية المصرية الطازجة مطهية على الطريقة التقليدية، متشوّحة بالثوم والكزبرة في السمن البلدي، وتُقدَّم ساخنة بنكهة غنية وطعم بيتي أصيل.',
      price: 65,
      photoUrl: '/assets/dishes/M.png',
      category: 'Traditional',
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C2 - Chef Mohamed (Grilled & BBQ)
    {
      _id: 'd2',
      nameEn: 'Roasted Country Duck',
      nameAr: 'بط محمّر',
      description: 'Golden roasted country duck',
      descriptionAr: 'بطة بلدي محمّرة',
      longDescription: 'Traditional oven-roasted country duck, seasoned to perfection, crispy outside and tender inside, served with rice or baladi bread.',
      longDescriptionAr: 'بطة بلدي متبّلة ومحمّرة في الفرن حتى تصبح ذهبية ومقرمشة من الخارج، طرية وغنية بالعصارة من الداخل، وتُقدَّم مع الأرز أو الخبز البلدي.',
      price: 95,
      photoUrl: '/assets/dishes/D.png',
      category: 'Roasted',
      cook: { _id: 'c2', name: 'Chef Mohamed', storeName: 'Chef Mohamed Kitchen' }
    },
    // C1 - Amal Kitchen
    {
      _id: 'd3',
      nameEn: 'Stuffed Grape Leaves',
      nameAr: 'محشي ورق عنب',
      description: 'Grape leaves stuffed with seasoned rice',
      descriptionAr: 'ورق عنب محشو أرز متبّل',
      longDescription: 'Tender grape leaves stuffed with seasoned rice, herbs, and spices, slow-cooked for a perfectly balanced tangy and savory flavor.',
      longDescriptionAr: 'ورق عنب محشو بخليط الأرز المتبّل بالأعشاب والتوابل، مطهو ببطء ليمنحك طعماً متوازناً بين الحموضة والنكهة الغنية.',
      price: 75,
      photoUrl: '/assets/dishes/W.png',
      category: 'Traditional',
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C2 - Chef Mohamed
    {
      _id: 'd4',
      nameEn: 'Shish Tawook',
      nameAr: 'شيش طاووك',
      description: 'Marinated grilled chicken',
      descriptionAr: 'دجاج متبّل مشوي',
      longDescription: 'Juicy chicken cubes marinated in yogurt and spices, grilled to golden perfection and served with garlic sauce or tahini.',
      longDescriptionAr: 'قطع دجاج متبّلة بالزبادي والتوابل ومشوية حتى تصبح ذهبية وطرية، تُقدَّم مع صوص الثوم أو الطحينة لنكهة شرقية متكاملة.',
      price: 85,
      photoUrl: '/assets/dishes/S.png',
      category: 'Grilled',
      cook: { _id: 'c2', name: 'Chef Mohamed', storeName: 'Chef Mohamed Kitchen' }
    },
    // C3 - Mama Nadia (Casseroles)
    {
      _id: 'd5',
      nameEn: 'Lamb Shank Fattah',
      nameAr: 'فتة موزة ضاني',
      description: 'Egyptian fattah topped with tender lamb shank',
      descriptionAr: 'فتة مصرية بالموزة الضاني الطرية',
      longDescription: 'A classic Egyptian fattah layered with rice, crispy bread, and garlic tomato sauce, topped with slow-cooked lamb shank that is tender and full of flavor.',
      longDescriptionAr: 'طبق فتة مصري فاخر بطبقات الأرز والخبز المحمّص وصلصة الطماطم بالثوم، تعلوه موزة ضاني مطهية ببطء حتى تذوب في الفم.',
      price: 120,
      photoUrl: '/assets/dishes/F.png',
      category: 'Casseroles',
      cook: { _id: 'c3', name: 'Mama Nadia', storeName: 'Mama Nadia Home Cooking' }
    },
    // C1 - Amal Kitchen
    {
      _id: 'd6',
      nameEn: 'Beef Moussaka',
      nameAr: 'مسقعة باللحمة',
      description: 'Eggplant with tomato sauce and minced beef',
      descriptionAr: 'باذنجان بصلصة طماطم ولحم مفروم',
      longDescription: 'Fried eggplant layered with seasoned tomato sauce and minced beef, baked together into a warm, hearty, home-style dish.',
      longDescriptionAr: 'شرائح باذنجان مقلية مع صلصة طماطم متبّلة ولحم مفروم مطهو بعناية، مخبوزة معاً لتقديم طبق دافئ وغني بالنكهة على الطريقة البيتية.',
      price: 80,
      photoUrl: '/assets/dishes/K.png',
      category: 'Traditional',
      cook: { _id: 'c1', name: 'Amal Kitchen', storeName: 'Amal Kitchen' }
    },
    // C3 - Mama Nadia
    {
      _id: 'd7',
      nameEn: 'Stuffed Pigeon',
      nameAr: 'حمام محشي',
      description: 'Pigeon stuffed with Egyptian spiced rice',
      descriptionAr: 'حمام محشي أرز بالخلطة المصرية',
      longDescription: 'Tender country pigeon stuffed with Egyptian spiced rice mixed with giblets and spices, slow-cooked for a rich and deeply traditional flavor.',
      longDescriptionAr: 'حمام بلدي محشو بأرز متبّل بالخلطة المصرية المميزة من الكبد والقوانص والتوابل، ثم مطهو حتى يصبح طرياً ومليئاً بالنكهة الشرقية الأصيلة.',
      price: 150,
      photoUrl: '/assets/dishes/H.png',
      category: 'Casseroles',
      cook: { _id: 'c3', name: 'Mama Nadia', storeName: 'Mama Nadia Home Cooking' }
    },
    // C4 - Hassan Grill House
    {
      _id: 'd8',
      nameEn: 'Shish Tawook',
      nameAr: 'شيش طاووك',
      description: 'Marinated grilled chicken',
      descriptionAr: 'دجاج متبّل مشوي',
      longDescription: 'Juicy chicken cubes marinated in yogurt and spices, grilled to golden perfection and served with garlic sauce or tahini.',
      longDescriptionAr: 'قطع دجاج متبّلة بالزبادي والتوابل ومشوية حتى تصبح ذهبية وطرية، تُقدَّم مع صوص الثوم أو الطحينة لنكهة شرقية متكاملة.',
      price: 85,
      photoUrl: '/assets/dishes/S.png',
      category: 'Grilled',
      cook: { _id: 'c4', name: 'Hassan Grill House', storeName: 'Hassan Grill House' }
    },
    // C5 - El Sheikh Falafel
    {
      _id: 'd9',
      nameEn: 'Molokhia',
      nameAr: 'ملوخية',
      description: 'Molokhia with garlic and coriander',
      descriptionAr: 'ملوخية متشوّحة بالثوم والكزبرة',
      longDescription: 'Traditional Egyptian molokhia made from fresh jute leaves, sautéed with garlic and coriander in ghee, served hot with a rich homemade flavor.',
      longDescriptionAr: 'الملوخية المصرية الطازجة مطهية على الطريقة التقليدية، متشوّحة بالثوم والكزبرة في السمن البلدي، وتُقدَّم ساخنة بنكهة غنية وطعم بيتي أصيل.',
      price: 60,
      photoUrl: '/assets/dishes/M.png',
      category: 'Traditional',
      cook: { _id: 'c5', name: 'El Sheikh Falafel', storeName: 'El Sheikh Falafel' }
    },
    // C6 - Abu Ali Koshary
    {
      _id: 'd10',
      nameEn: 'Beef Moussaka',
      nameAr: 'مسقعة باللحمة',
      description: 'Eggplant with tomato sauce and minced beef',
      descriptionAr: 'باذنجان بصلصة طماطم ولحم مفروم',
      longDescription: 'Fried eggplant layered with seasoned tomato sauce and minced beef, baked together into a warm, hearty, home-style dish.',
      longDescriptionAr: 'شرائح باذنجان مقلية مع صلصة طماطم متبّلة ولحم مفروم مطهو بعناية، مخبوزة معاً لتقديم طبق دافئ وغني بالنكهة على الطريقة البيتية.',
      price: 75,
      photoUrl: '/assets/dishes/K.png',
      category: 'Traditional',
      cook: { _id: 'c6', name: 'Abu Ali Koshary', storeName: 'Abu Ali Koshary' }
    }
  ];

  const dummyTopCooks = [
    {
      _id: 'c1',
      name: 'Amal Kitchen',
      storeName: 'Amal Kitchen',
      expertise: [{ nameEn: 'Traditional Egyptian', nameAr: 'أكل بيتي مصري' }],
      profilePhoto: '/assets/cooks/C1.png',
      ratings: { average: 4.9, count: 323 },
      ordersCount: 450,
      dishes: [
        {'_id': 'd1', 'name': 'Molokhia', 'nameAr': 'ملوخية', 'price': 65, 'photoUrl': '/assets/dishes/M.png'},
        {'_id': 'd3', 'name': 'Stuffed Grape Leaves', 'nameAr': 'محشي ورق عنب', 'price': 75, 'photoUrl': '/assets/dishes/W.png'},
        {'_id': 'd6', 'name': 'Beef Moussaka', 'nameAr': 'مسقعة باللحمة', 'price': 80, 'photoUrl': '/assets/dishes/K.png'}
      ],
    },
    {
      _id: 'c2',
      name: 'Chef Mohamed',
      storeName: 'Chef Mohamed Kitchen',
      expertise: [{ nameEn: 'Grilled & BBQ', nameAr: 'مشويات' }],
      profilePhoto: '/assets/cooks/C2.png',
      ratings: { average: 4.8, count: 256 },
      ordersCount: 320,
      dishes: [
        {'_id': 'd2', 'name': 'Roasted Country Duck', 'nameAr': 'بط محمّر', 'price': 95, 'photoUrl': '/assets/dishes/D.png'},
        {'_id': 'd4', 'name': 'Shish Tawook', 'nameAr': 'شيش طاووك', 'price': 85, 'photoUrl': '/assets/dishes/S.png'}
      ],
    },
    {
      _id: 'c3',
      name: 'Mama Nadia',
      storeName: 'Mama Nadia Home Cooking',
      expertise: [{ nameEn: 'Casseroles', nameAr: 'طواجن' }],
      profilePhoto: '/assets/cooks/C3.png',
      ratings: { average: 4.7, count: 189 },
      ordersCount: 280,
      dishes: [
        {'_id': 'd5', 'name': 'Lamb Shank Fattah', 'nameAr': 'فتة موزة ضاني', 'price': 120, 'photoUrl': '/assets/dishes/F.png'},
        {'_id': 'd7', 'name': 'Stuffed Pigeon', 'nameAr': 'حمام محشي', 'price': 150, 'photoUrl': '/assets/dishes/H.png'}
      ],
    },
    {
      _id: 'c4',
      name: 'Hassan Grill House',
      storeName: 'Hassan Grill House',
      expertise: [{ nameEn: 'Grilled & BBQ', nameAr: 'مشويات' }],
      profilePhoto: '/assets/cooks/C4.png',
      ratings: { average: 4.9, count: 412 },
      ordersCount: 510,
      dishes: [
        {'_id': 'd4', 'name': 'Shish Tawook', 'nameAr': 'شيش طاووك', 'price': 85, 'photoUrl': '/assets/dishes/S.png'}
      ],
    },
    {
      _id: 'c5',
      name: 'El Sheikh Falafel',
      storeName: 'El Sheikh Falafel',
      expertise: [{ nameEn: 'Fried & Sides', nameAr: 'مقليات وأطباق جانبية' }],
      profilePhoto: '/assets/cooks/C5.png',
      ratings: { average: 4.6, count: 245 },
      ordersCount: 310,
      dishes: [
        {'_id': 'd1', 'name': 'Molokhia', 'nameAr': 'ملوخية', 'price': 60, 'photoUrl': '/assets/dishes/M.png'}
      ],
    },
    {
      _id: 'c6',
      name: 'Abu Ali Koshary',
      storeName: 'Abu Ali Koshary',
      expertise: [{ nameEn: 'Traditional Egyptian', nameAr: 'أكل مصري تقليدي' }],
      profilePhoto: '/assets/cooks/C6.png',
      ratings: { average: 4.8, count: 312 },
      ordersCount: 425,
      dishes: [
        {'_id': 'd6', 'name': 'Beef Moussaka', 'nameAr': 'مسقعة باللحمة', 'price': 75, 'photoUrl': '/assets/dishes/K.png'}
      ],
    },
    {
      _id: 'c7',
      name: 'Sakura Sushi Place',
      storeName: 'Sakura Sushi Place',
      expertise: [{ nameEn: 'Asian Fusion', nameAr: 'مطبخ آسيوي' }],
      profilePhoto: '/assets/cooks/C7.png',
      ratings: { average: 4.5, count: 178 },
      ordersCount: 220,
      dishes: [],
    },
    {
      _id: 'c8',
      name: 'Pizza Italia Master',
      storeName: 'Pizza Italia Master',
      expertise: [{ nameEn: 'Pizza & Italian', nameAr: 'بيتزا ومطبخ إيطالي' }],
      profilePhoto: '/assets/cooks/C8.png',
      ratings: { average: 4.7, count: 267 },
      ordersCount: 340,
      dishes: [],
    },
    {
      _id: 'c9',
      name: 'Sweet Tooth Bakery',
      storeName: 'Sweet Tooth Bakery',
      expertise: [{ nameEn: 'Desserts & Baking', nameAr: 'حلويات ومعجنات' }],
      profilePhoto: '/assets/cooks/C9.png',
      ratings: { average: 4.9, count: 198 },
      ordersCount: 285,
      dishes: [],
    },
    {
      _id: 'c10',
      name: 'Meat Lovers Station',
      storeName: 'Meat Lovers Station',
      expertise: [{ nameEn: 'Grilled Meats', nameAr: 'مشويات لحوم' }],
      profilePhoto: '/assets/cooks/C10.png',
      ratings: { average: 4.6, count: 156 },
      ordersCount: 195,
      dishes: [],
    }
  ];

  // DESIGN TOKENS
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

  const SPACING = {
    section: 100,
    internal: 24,
    gap: 16,
    base: 8
  };

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

  // Fetch categories from API on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Sort by sortOrder ascending (null/missing = 9999, then displayName tie-breaker)
          const getDisplayName = (cat) => {
            const baseName = (cat.nameEn || cat.name || '').trim();
            const displayName = baseName === 'Traditional Egyptian Dishes' ? 'Traditional' : baseName;
            return displayName;
          };
          
          const sorted = [...response.data].sort((a, b) => {
            const nameA = getDisplayName(a);
            const nameB = getDisplayName(b);
            
            const soA = Number.isFinite(a.sortOrder) ? a.sortOrder : 9999;
            const soB = Number.isFinite(b.sortOrder) ? b.sortOrder : 9999;
            
            if (soA !== soB) return soA - soB;
            return nameA.localeCompare(nameB);
          });
          
          setCategories(sorted);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Get display name with aliasing for long names
  const getCategoryName = (category) => {
    const baseName = (category.nameEn || category.name || '').trim();
    const displayName = baseName === 'Traditional Egyptian Dishes' ? 'Traditional' : baseName;
    return language === 'ar' ? (category.nameAr || displayName) : displayName;
  };

  // Get category icon URL - maps API icon filenames to correct asset paths
  const getCategoryIcon = (category) => {
    // Apply alias for display
    const baseName = (category.nameEn || category.name || '').trim();
    const displayName = baseName === 'Traditional Egyptian Dishes' ? 'Traditional' : baseName;
    
    // Known category name mapping (using displayName after aliasing)
    const normalizedKey = displayName.toLowerCase().trim();
    const nameMap = {
      'grilled': 'Grilled',
      'fried': 'Fried',
      'casseroles': 'Casseroles',
      'oven dishes': 'Oven',
      'salads': 'Salads',
      'desserts': 'Desert',  // Desert.png (filename mismatch)
      'traditional': 'Traditional',
      'roasted': 'Roasted',
      'sides': 'Sides',
    };
    
    // Priority 1: For known categories, ALWAYS use local asset mapping
    // This prevents bad API upload paths (/uploads/...) from replacing working built-in assets
    if (nameMap.hasOwnProperty(normalizedKey)) {
      return `/assets/categories/${nameMap[normalizedKey]}.png`;
    }
    
    // Priority 2 (for UNKNOWN categories only): Use icons.web if valid
    if (typeof category.icons?.web === 'string' && category.icons.web.trim() !== '' && category.icons.web.startsWith('/')) {
      return getAbsoluteUrl(category.icons.web);
    }
    
    // Priority 3 (for UNKNOWN categories only): Use legacy icon field
    if (typeof category.icon === 'string' && category.icon.trim() !== '' && category.icon.startsWith('/')) {
      return getAbsoluteUrl(category.icon);
    }
    
    // Final fallback for unknown categories with no valid API paths
    return '/assets/categories/Default.png';
  };

  const checkHasLocation = () => {
    const lat = sessionStorage.getItem('userLat');
    if (lat) return true;
    setLocationGateOpen(true);
    return false;
  };

  const handleCategoryClick = (categoryId) => {
    if (!checkHasLocation()) return;
    navigate('/foodie/menu', { state: { selectedCategoryId: categoryId } });
  };

  const formatCurrency = (amount) => {
    return localeFormatCurrency(amount, language, currencyCode);
  };
  const [quantity, setQuantity] = useState(1);
  const [flyingItem, setFlyingItem] = useState(null);

  // Refs for scroll containers
  const featuredScrollRef = useRef(null);
  const cooksScrollRef = useRef(null);
  const menuScrollRef = useRef(null);

  // Scroll state - only track if can scroll next (end side)
  const [featuredCanScrollNext, setFeaturedCanScrollNext] = useState(true);
  const [cooksCanScrollNext, setCooksCanScrollNext] = useState(true);
  const [menuCanScrollNext, setMenuCanScrollNext] = useState(true);

  // Update scroll state
  const updateScrollState = (ref, setState) => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    const isRTLMode = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
    
    if (isRTLMode) {
      // In RTL, scrollLeft is negative when scrolled, 0 at right edge
      setState(Math.abs(scrollLeft) < scrollWidth - clientWidth - 10);
    } else {
      // In LTR, scrollLeft increases when scrolled right
      setState(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Handle scroll
  const handleScrollNext = (ref) => {
    if (!ref.current) return;
    const scrollAmount = 600;
    ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Check scroll state on mount and resize
  useEffect(() => {
    const updateAll = () => {
      updateScrollState(featuredScrollRef, setFeaturedCanScrollNext);
      updateScrollState(cooksScrollRef, setCooksCanScrollNext);
      updateScrollState(menuScrollRef, setMenuCanScrollNext);
    };
    updateAll();
    window.addEventListener('resize', updateAll);
    return () => window.removeEventListener('resize', updateAll);
  }, []);

  // Fetch Marketplace Data based on Country
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const lat = sessionStorage.getItem('userLat');
        const lng = sessionStorage.getItem('userLng');
        const geoParams = lat && lng ? `&lat=${lat}&lng=${lng}` : '';

        // Fetch Stats
        const statsData = await api.get('/products/stats');
        if (statsData.data.success) setStats(statsData.data.data);

        // Fetch Popular Dishes marked with isPopular=true from backend
        try {
          // This endpoint returns all dishes sorted by popularity
          const featuredResponse = await api.get(`/public/admin-dishes/featured?limit=10&country=${countryCode}`);
          const featured = Array.isArray(featuredResponse.data) ? featuredResponse.data : (featuredResponse.data?.dishes || []);
          
          // Filter to only dishes with active offers (offerCount > 0)
          // Real live data - no dummy fallback
          const realDishes = featured.filter(d => d.nameEn && d.isActive && d.isPopular);
          
          console.log(`✅ Featured dishes: ${realDishes.length} dishes with isPopular=true`);
          realDishes.forEach((d, i) => {
            console.log(`  [${i + 1}] ${d.nameEn}`);
          });
          
          setPopularDishes(realDishes);
        } catch (error) {
          console.warn('❌ Failed to fetch featured dishes:', error);
          setPopularDishes([]);
        }

        // Fetch Top Cooks
        const cooksData = await api.get(`/cooks/top-rated?limit=10&country=${countryCode}${geoParams}`);
        console.log('Top cooks API response:', cooksData.data);
        
        if (cooksData.data.success && cooksData.data.data && cooksData.data.data.length > 0) {
          // Validate that cooks have required fields
          const validCooks = cooksData.data.data.filter(c => c.name || c.storeName);
          if (validCooks.length > 0) {
            // Sort by admin flag (if any), rating, then order volume
            const sortedCooks = [...validCooks].sort((a, b) => {
              if ((b.ratings?.average || 0) !== (a.ratings?.average || 0)) {
                return (b.ratings?.average || 0) - (a.ratings?.average || 0);
              }
              return (b.ordersCount || 0) - (a.ordersCount || 0);
            });
            setTopCooks(sortedCooks);
          } else {
            console.warn('API returned cooks but none have valid names, using dummy data');
            setTopCooks(dummyTopCooks);
          }
        } else {
          console.log('No cooks from API, using dummy data');
          setTopCooks(dummyTopCooks);
        }

        // Update stats if empty
        // Stats are now fetched from API above, no dummy fallback needed

      } catch (error) {
        console.error('Error fetching marketplace data:', error);
        // Fall back to dummy data when API fails
        setPopularDishes(dummyPopularDishes);
        setTopCooks(dummyTopCooks);
      } finally {
        setLoading(false);
        // If hero already loaded but overlay still showing, hide it
        if (heroLoadedRef.current) {
          setShowOverlay(false);
        }
      }
    };
    fetchData();
  }, [countryCode]);

  // Handle Featured Dish click - Open dialog with offers (PHASE 3: uses adminDishId)
  const handleFeaturedDishClick = (dish) => {
    if (!checkHasLocation()) return;
    if (!modalHostRef.current) return;
    modalHostRef.current.openDish(dish);
  };

  // Generate dummy offers for a dish from dummyTopCooks

  // Handle View All click - navigate to Menu page without pre-selected category
  const handleViewAllClick = () => {
    if (!checkHasLocation()) return;
    navigate('/foodie/menu');
  };

  // Handle offer selection from dish dialog


  const fetchSuggestions = async (query) => {
    if (!query.trim()) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    try {
      const response = await api.get(`/public/admin-dishes/search?q=${encodeURIComponent(query)}&country=${countryCode}&limit=7`);
      setSearchSuggestions(Array.isArray(response.data) ? response.data : []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSearchSuggestions([]);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounceRef.current);
    if (!val.trim()) { setSearchSuggestions([]); setShowSuggestions(false); return; }
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSuggestionSelect = (dish) => {
    if (!checkHasLocation()) return;
    setShowSuggestions(false);
    setSearchQuery(language === 'ar' ? (dish.nameAr || dish.nameEn) : dish.nameEn);
    navigate('/foodie/menu', {
      state: {
        searchQuery: dish.nameEn,
        selectedAdminDishId: dish._id,
        openDishDialog: true
      }
    });
  };

  const handleSearch = (query = searchQuery) => {
    if (!query.trim()) return;
    if (!checkHasLocation()) return;
    setShowSuggestions(false);
    navigate('/foodie/menu', { state: { searchQuery: query } });
  };

  return (
    <>
      <HomeLoadingOverlay active={showOverlay} />
      <Box sx={{ direction: isRTL ? 'rtl' : 'ltr', minHeight: 'auto', bgcolor: 'transparent' }}>

      {/* HERO IMAGE SECTION */}
      <Box sx={{ 
        mb: `${SPACING.section}px`, 
        position: 'relative',
        maxWidth: '1400px',
        mx: 'auto',
        px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' }
      }}>
        <Box 
          component="img" 
          src="/assets/images/Hero.png" 
          alt="Hero" 
          sx={{ 
            width: '100%', 
            height: 'auto', 
            objectFit: 'cover', 
            borderRadius: '16px', 
            display: 'block',
            transform: isRTL ? 'scaleX(-1)' : 'scaleX(1)',
          }}
          onLoad={() => {
            if (!heroLoadedRef.current) {
              heroLoadedRef.current = true;
              setShowOverlay(false);
            }
          }}
        />
        {/* Text overlay on hero image */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: isRTL ? 'auto' : { xs: '16px', sm: '24px', md: '36px', lg: '52px' },
          right: isRTL ? { xs: '16px', sm: '24px', md: '36px', lg: '52px' } : 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 2,
          gap: { xs: '12px', sm: '16px', md: '20px', lg: '24px' },
          paddingLeft: isRTL ? '0px' : { xs: '8px', sm: '12px', md: '16px', lg: '20px' },
          paddingRight: isRTL ? { xs: '8px', sm: '12px', md: '16px', lg: '20px' } : '0px',
        }}>
          {/* Promotional Text */}
          <Typography sx={{
            ...getTypographyStyle('h1', language),
            fontWeight: 600,
            color: COLORS.white,
            lineHeight: '1.4',
            textAlign: isRTL ? 'right' : 'left',
            maxWidth: '750px',
            whiteSpace: 'pre-wrap',
            fontSize: 'clamp(18px, 2.5vw, 28px)',
          }}>
            {loggedInUser
              ? (language === 'ar'
                  ? `أهلاً، ${loggedInFirstName}!\nنفسك في إيه النهارده؟`
                  : `Hello, ${loggedInFirstName}!\nWhat are you craving today?`)
              : (language === 'ar'
                  ? 'وحشك لمة العيلة على الأكل\u061f\nأكلة واحدة كفاية ترجعك لأحلى لحظات عشتها.'
                  : 'Miss family gatherings around the table?\nOne dish is all it takes to bring you back.')}
          </Typography>
        
          {/* Search Bar with Autocomplete */}
          <Box ref={searchWrapperRef} sx={{ position: 'relative', width: { xs: '90%', sm: 'calc(100vw * 0.44 - 80px)', md: 'calc(100vw * 0.44 - 100px)', lg: 'calc(100vw * 0.44 - 52px)' }, maxWidth: '500px' }}>
            <Box sx={
            {
            width: '100%',
            height: { xs: '40px', sm: '50px' },
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid white',
            borderRadius: '30px',
            paddingX: { xs: '12px', sm: '16px' },
            gap: '8px',
            }}>
            <SearchIcon sx={{ color: '#ECBD97', fontSize: { xs: '16px', sm: '20px' } }} />
            <TextField
              placeholder={language === 'ar' ? 'نفسك في إيه النهارده؟' : 'What are you craving today?'}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => searchQuery.trim() && searchSuggestions.length > 0 && setShowSuggestions(true)}
              variant="standard"
              fullWidth
              sx={{
                '& .MuiInput-underline:before': { borderBottom: 'none' },
                '& .MuiInput-underline:hover:before': { borderBottom: 'none !important' },
                '& .MuiInput-underline:after': { borderBottom: 'none' },
                '& .MuiInputBase-input': {
                  fontSize: 'clamp(14px, 1.5vw, 18px)',
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  color: '#ECBD97',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#ECBD97',
                  opacity: 1,
                  fontWeight: 600,
                  fontSize: 'clamp(14px, 1.5vw, 18px)',
                },
              }}
            />
          </Box>

          {/* Autocomplete dropdown */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <Box sx={{
              position: 'absolute',
              top: '54px',
              left: 0,
              right: 0,
              bgcolor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              zIndex: 9999,
              overflow: 'hidden',
              direction: isRTL ? 'rtl' : 'ltr',
            }}>
              {searchSuggestions.map((dish) => {
                const displayName = language === 'ar' ? (dish.nameAr || dish.nameEn) : dish.nameEn;
                const categoryDisplay = language === 'ar' ? dish.categoryNameAr : dish.categoryNameEn;
                return (
                  <Box
                    key={dish._id}
                    onMouseDown={() => handleSuggestionSelect(dish)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#FFF5EE' },
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    {dish.imageUrl ? (
                      <Box
                        component="img"
                        src={getAbsoluteUrl(dish.imageUrl)}
                        alt={displayName}
                        sx={{ width: 36, height: 36, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#F3F4F6', flexShrink: 0 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '14px', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayName}
                      </Typography>
                      {categoryDisplay && (
                        <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                          {categoryDisplay}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
          </Box>

          {/* Descriptive Text Below Search Bar */}
          <Typography sx={{
            fontFamily: "Inter",
            fontSize: 'clamp(12px, 1.5vw, 18px)',
            fontWeight: 400,
            color: COLORS.white,
            lineHeight: "1.6",
            textAlign: isRTL ? "right" : "left",
            maxWidth: "600px",
            whiteSpace: "pre-wrap",
            display: { xs: 'none', sm: 'block' }
          }}>
            {language === "ar"
              ? "الأكل المصري عمره ما كان وصفة، ده إحساس، وتوقيت، و طعم اتربّينا عليه.\nكل وقت ليه أكله، وكل أكلة ليها وقت. آخر حاجة بنسيبها وإحنا مسافرين،\nواول حاجه بنتلم عليها لما بنرجع."
              : "Egyptian food was never just a recipe.\nIt's memory, timing, and the flavors we grew up with.\nThe last thing we leave behind, and the first that brings us together again."}
          </Typography>

          {/* Statistics Section */}
          <Box sx={{
            display: 'flex',
            gap: { xs: '24px', sm: '36px', lg: '48px' },
            mt: '12px',
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'flex-start',
            alignSelf: 'flex-start',
            width: 'fit-content'
          }}>
            {/* Total Dishes */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography sx={{ 
                fontSize: 'clamp(24px, 4vw, 36px)', 
                fontWeight: 'bold', 
                color: COLORS.white, 
                lineHeight: '1.2',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {language === 'ar' ? `${toArabicDigits(stats.totalDishes)}+` : `${stats.totalDishes}+`}
              </Typography>
              <Typography sx={{ 
                fontSize: 'clamp(14px, 2vw, 22px)', 
                color: '#ECBD97', 
                fontWeight: 400,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {language === 'ar' ? 'عدد الأطباق' : 'Total Dishes'}
              </Typography>
            </Box>

            {/* Total Cooks */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography sx={{ 
                fontSize: 'clamp(24px, 4vw, 36px)', 
                fontWeight: 'bold', 
                color: COLORS.white, 
                lineHeight: '1.2',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {language === 'ar' ? `${toArabicDigits(stats.totalCooks)}+` : `${stats.totalCooks}+`}
              </Typography>
              <Typography sx={{ 
                fontSize: 'clamp(14px, 2vw, 22px)', 
                color: '#ECBD97', 
                fontWeight: 400,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {language === 'ar' ? 'عدد الطهاة' : 'Total Cooks'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* FEATURED DISHES - CLEAN REBUILD */}
      <Box sx={{ mb: `${SPACING.section}px`, position: 'relative', maxWidth: '1400px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '8px', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            <Typography sx={{ fontFamily: 'Inter', fontSize: isRTL ? '32px' : '28px', lineHeight: '1.4', fontWeight: 700, color: COLORS.darkBrown, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'الأطباق المميزة' : 'Featured Dishes'}
            </Typography>
            <Button onClick={() => { if (!checkHasLocation()) return; navigate('/foodie/featured-dishes'); }} sx={{ color: COLORS.primaryOrange, fontWeight: 600, fontSize: '14px', textTransform: 'none', '&:hover': { background: 'transparent' } }}>
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </Box>
          <Typography sx={{ fontSize: { xs: '12px', sm: '14px' }, lineHeight: '1.6', fontWeight: 400, color: COLORS.bodyGray, mb: '24px', textAlign: isRTL ? 'right' : 'left', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            {language === 'ar' ? 'أطباق اختارناها بعناية بناءً على ترشيحات المستخدمين' : 'Carefully selected based on user recommendations'}
          </Typography>
          <Box sx={{ position: 'relative' }}>
            {/* Navigation Arrow */}
            {featuredCanScrollNext && (
              <IconButton 
                onClick={() => handleScrollNext(featuredScrollRef)}
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRTL ? 'left' : 'right']: '60px',
                  width: 44,
                  height: 44,
                  bgcolor: COLORS.white,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  border: `1px solid ${COLORS.borderGray}`,
                  zIndex: 2,
                  '&:hover': { 
                    bgcolor: COLORS.bgCream,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <ChevronRightIcon sx={{ 
                  fontSize: 24, 
                  color: COLORS.darkBrown,
                  transform: isRTL ? 'rotate(180deg)' : 'none'
                }} />
              </IconButton>
            )}
            {/* Scroll Container */}
            <Box 
              ref={featuredScrollRef}
              onScroll={() => updateScrollState(featuredScrollRef, setFeaturedCanScrollNext)}
              sx={{ 
                display: 'flex', 
                gap: '15px', 
                overflowX: 'auto', 
                px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' },
                pb: '0', 
                '&::-webkit-scrollbar': { display: 'none' }, 
                scrollbarWidth: 'none'
              }}>
            {popularDishes.map((item) => (
              <Box 
                key={item._id} 
                onClick={() => handleFeaturedDishClick(item)}
                sx={{ 
                  minWidth: '200px', 
                  width: '200px',
                  height: '200px', 
                  bgcolor: '#FAF5F3',
                  borderRadius: '28px', 
                  overflow: 'hidden', 
                  boxShadow: 'none', 
                  border: '1px solid #E8E2DF',
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {/* PHASE 3: Use AdminDish.imageUrl with normalizeImageUrl helper */}
                <Box sx={{ 
                  width: '100%', 
                  height: '114px', 
                  bgcolor: '#E8DACC',
                  backgroundImage: `url(${normalizeImageUrl(item.photoUrl || item.imageUrl)})`,
                  backgroundSize: 'cover', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundPosition: 'center', 
                  flexShrink: 0, 
                  borderRadius: '28px' 
                }} />
                <Box sx={{ flex: 1, p: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '50px' }}>
                  {/* PHASE 3: Bilingual name display */}
                  <Box sx={{ textAlign: isRTL ? 'right' : 'left', minHeight: '45px' }}>
                    <Typography sx={{ ...getSxTypography('label', language), fontWeight: 700, color: COLORS.darkBrown, lineHeight: '1.2', mb: '2px' }}>
                      {language === 'ar' ? (item.nameAr || item.nameEn) : (item.nameEn || item.name)}
                    </Typography>
                    <Typography sx={{ ...getSxTypography('caption', language), color: COLORS.bodyGray, lineHeight: '1.2' }}>
                      {language === 'ar' ? (item.descriptionAr || item.description || 'نكهة بيتية غنية') : (item.description || 'Home-Style Flavor')}
                    </Typography>
                  </Box>
                  {/* Price row - always aligned at bottom */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', mt: 'auto' }}>
                    {(() => {
                      // Use minPrice first (from offers), then fallback to price field for display
                      const price = item.minPrice !== null && item.minPrice !== undefined ? item.minPrice : item.price;
                      return price && price > 0 ? (
                        <Typography sx={{ ...getSxTypography('bodySmall', language), fontWeight: 600, color: '#FF7A00' }}>
                          From {formatCurrency(price)}
                        </Typography>
                      ) : null;
                    })()}
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeaturedDishClick(item);
                      }}
                      sx={{ 
                        color: '#FF7A00',
                        p: 0.5
                      }}
                    >
                      <ChevronRightIcon sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          </Box>
      </Box>

      {/* TOP-RATED COOKS */}
      <Box sx={{ mb: `${SPACING.section}px`, position: 'relative', maxWidth: '1400px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '8px', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            <Typography sx={{ fontFamily: 'Inter', fontSize: isRTL ? '32px' : '28px', lineHeight: '1.4', fontWeight: 700, color: COLORS.darkBrown, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'الطهاة الأعلى تقييماً' : 'Top-rated Cooks'}
            </Typography>
            <Button onClick={() => { if (!checkHasLocation()) return; navigate('/foodie/top-cooks'); }} sx={{ color: COLORS.primaryOrange, fontWeight: 600, fontSize: '14px', textTransform: 'none', '&:hover': { background: 'transparent' } }}>
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </Box>
          <Typography sx={{ fontSize: { xs: '12px', sm: '14px' }, lineHeight: '1.6', fontWeight: 400, color: COLORS.bodyGray, mb: '24px', textAlign: isRTL ? 'right' : 'left', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            {language === 'ar' ? 'الأعلى في معدلات إعادة الطلب' : 'Highest Repeat Order Rate'}
          </Typography>
          <Box sx={{ position: 'relative' }}>
            {/* Navigation Arrow */}
            {cooksCanScrollNext && (
              <IconButton 
                onClick={() => handleScrollNext(cooksScrollRef)}
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRTL ? 'left' : 'right']: '60px',
                  width: 44,
                  height: 44,
                  bgcolor: COLORS.white,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  border: `1px solid ${COLORS.borderGray}`,
                  zIndex: 2,
                  '&:hover': { 
                    bgcolor: COLORS.bgCream,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <ChevronRightIcon sx={{ 
                  fontSize: 24, 
                  color: COLORS.darkBrown,
                  transform: isRTL ? 'rotate(180deg)' : 'none'
                }} />
              </IconButton>
            )}
            {/* Scroll Container */}
            <Box 
              ref={cooksScrollRef}
              onScroll={() => updateScrollState(cooksScrollRef, setCooksCanScrollNext)}
              sx={{ 
                display: 'flex', 
                gap: '20px',
                overflowX: 'auto', 
                px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' },
                pb: '0', 
                '&::-webkit-scrollbar': { display: 'none' }, 
                scrollbarWidth: 'none'
              }}>
            {topCooks.map((chef) => (
              <TopRatedCookCard
                key={chef._id}
                cookId={chef._id}
                cookName={chef.storeName || chef.name}
                expertise={chef.expertise?.[0]?.nameEn || chef.expertise}
                profilePhoto={getCookImageUrl(chef)}
                rating={chef.ratings?.average}
                ratingCount={chef.ratings?.count}
                ordersCount={chef.ordersCount}
                onClick={() => { if (!checkHasLocation()) return; setSelectedCook(chef); }}
                onRate={(cookId, ratingData) => console.log('Rating cook:', cookId, ratingData)}
                width="180px"
                height="214px"
                cardOverlayImage="/assets/cooks/Ccard.png"
              />
            ))}
          </Box>
          </Box>
      </Box>

      {/* Cook Details Dialog */}
      <CookDetailsDialog
        open={Boolean(selectedCook)}
        onClose={() => setSelectedCook(null)}
        cook={selectedCook}
      />

      {/* Multi-Kitchen Warning Dialog */}
      <Dialog open={cartWarningOpen} onClose={() => setCartWarningOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {language === 'ar' ? 'تنبيه طلب من مطابخ متعددة' : 'Multi-Kitchen Order Warning'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {language === 'ar' 
              ? 'أنت تقوم بإضافة أصناف من مطبخ مختلف. سيشمل هذا الطلب مواقع استلام متعددة.' 
              : 'You are adding items from another kitchen. This order will include multiple pickup locations.'}
          </Typography>
        </DialogContent>
        <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setCartWarningOpen(false)} color="inherit">
            {language === 'ar' ? 'الرجوع' : 'Go back'}
          </Button>
          <Button 
            onClick={() => {
              addToCart(pendingItem);
              setCartWarningOpen(false);
              localStorage.setItem('multiKitchenWarningShown', 'true');
              showNotification(language === 'ar' ? 'تمت إضافة المنتج إلى السلة' : 'Item added to cart', 'success');
              setPendingItem(null);
              window.dispatchEvent(new Event('cartUpdated'));
              // Close detail dialogs
              setSelectedOffer(null);
              setSelectedDish(null);
              setDishOffers([]);
            }} 
            variant="contained" 
            sx={{ bgcolor: COLORS.primaryOrange, '&:hover': { bgcolor: '#E66A00' } }}
          >
            {language === 'ar' ? 'استمرار' : 'Continue'}
          </Button>
        </Box>
      </Dialog>

      {/* MENU - CATEGORIES */}
      <Box sx={{ mb: `${SPACING.section}px`, position: 'relative', maxWidth: '1400px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '8px', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            <Typography sx={{ fontFamily: 'Inter', fontSize: isRTL ? '32px' : '28px', lineHeight: '1.4', fontWeight: 700, color: COLORS.darkBrown, textAlign: isRTL ? 'right' : 'left' }}>
              {language === 'ar' ? 'المنيو' : 'Menu'}
            </Typography>
            <Button onClick={handleViewAllClick} sx={{ color: COLORS.primaryOrange, fontWeight: 600, fontSize: '14px', textTransform: 'none', '&:hover': { background: 'transparent' } }}>
              {language === 'ar' ? 'عرض الكل' : 'View All'}
            </Button>
          </Box>
          <Typography sx={{ fontSize: { xs: '12px', sm: '14px' }, lineHeight: '1.6', fontWeight: 400, color: COLORS.bodyGray, mb: '24px', textAlign: isRTL ? 'right' : 'left', px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' } }}>
            {language === 'ar' ? 'مجموعة أطباق مختارة بعناية' : 'Carefully curated selection of dishes'}
          </Typography>
          <Box sx={{ position: 'relative' }}>
            {/* Navigation Arrow */}
            {menuCanScrollNext && (
              <IconButton 
                onClick={() => handleScrollNext(menuScrollRef)}
                sx={{ 
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRTL ? 'left' : 'right']: '60px',
                  width: 44,
                  height: 44,
                  bgcolor: COLORS.white,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  border: `1px solid ${COLORS.borderGray}`,
                  zIndex: 2,
                  '&:hover': { 
                    bgcolor: COLORS.bgCream,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }
                }}
              >
                <ChevronRightIcon sx={{ 
                  fontSize: 24, 
                  color: COLORS.darkBrown,
                  transform: isRTL ? 'rotate(180deg)' : 'none'
                }} />
              </IconButton>
            )}
            {/* Scroll Container */}
            <Box 
              ref={menuScrollRef}
              onScroll={() => updateScrollState(menuScrollRef, setMenuCanScrollNext)}
              sx={{ 
                display: 'flex', 
                gap: '16px', 
                overflowX: 'auto', 
                px: { xs: '16px', sm: '24px', md: '36px', lg: '52px' },
                pb: '0', 
                '&::-webkit-scrollbar': { display: 'none' }, 
                scrollbarWidth: 'none'
              }}>
            {categories.map((cat) => {
              const iconUrl = getCategoryIcon(cat);
              const displayName = getCategoryName(cat);
              return (
              <Box key={cat._id} onClick={() => handleCategoryClick(cat._id)} sx={{ position: 'relative', minWidth: '200px', width: '200px', height: '220px', flexShrink: 0, cursor: 'pointer' }}>
                {/* Background Layer - Bottom Positioned */}
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '200px', height: '160px', bgcolor: '#FAF5F3', borderRadius: '28px', border: '1px solid #E8E2DF', zIndex: 1 }} />
                
                {/* Category Image - Top Aligned with Overlap */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '200px', height: '170px', backgroundImage: iconUrl ? `url(${iconUrl})` : 'none', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', borderRadius: '8px', zIndex: 2 }} />
                
                {/* Text Area - Bottom 72px */}
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '72px', p: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 3, borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: isRTL ? '24px' : '20px', lineHeight: '20px', fontWeight: 600, color: COLORS.darkBrown, textAlign: 'center' }}>
                    {displayName}
                  </Typography>
                </Box>
              </Box>
              );
            })}
          </Box>
          </Box>
      </Box>

      {/* APP DOWNLOAD */}
      <Box sx={{ 
        mx: { xs: '16px', sm: '24px', md: '36px', lg: '52px' },
        height: { xs: 'auto', md: '390px' },
        bgcolor: '#FAF5F3',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        mb: `${SPACING.section}px`,
        borderRadius: '28px',
        overflow: 'hidden',
        border: '1px solid #E8E2DF'
      }}>
        {/* Background Image */}
        <Box
          component="img"
          src="/assets/images/Dapp.png"
          alt="Download App"
          sx={{
            height: '100%',
            width: '50%',
            objectFit: 'contain',
            transform: isRTL ? 'scaleX(-1)' : 'none',
          }}
        />
        
        {/* Text Overlay - Center Aligned */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          maxWidth: '450px',
          zIndex: 5,
        }}>
          <Typography sx={{ 
            fontFamily: 'Inter',
            fontSize: isRTL ? '40px' : '36px',
            lineHeight: '1.2', 
            fontWeight: 700, 
            color: COLORS.darkBrown,
            textAlign: 'center',
          }}>
            {language === 'ar' ? 'نزل التطبيق' : 'Download the App'}
          </Typography>
          
          <Typography sx={{ 
            fontSize: isRTL ? '26px' : '20px',
            lineHeight: '1.4', 
            fontWeight: 400, 
            color: COLORS.darkBrown,
            textAlign: 'center',
          }}>
            {language === 'ar' ? 'وخلي طعم مصر اقرب' : 'Bring Egyptian flavors closer to you'}
          </Typography>
          
          {/* App Store Buttons */}
          <Box sx={{ 
            display: 'flex', 
            gap: '16px',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            mt: '8px',
          }}>
            <Box
              component="img"
              src="/assets/images/GS.png"
              alt="Google Play"
              sx={{
                height: '50px',
                width: 'auto',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            />
            <Box
              component="img"
              src="/assets/images/AS.png"
              alt="App Store"
              sx={{
                height: '50px',
                width: 'auto',
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* PARTNERSHIP */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: '16px', md: '24px' }, px: { xs: '16px', sm: '24px', md: '36px' }, mb: `${SPACING.section}px`, maxWidth: '1400px', mx: 'auto' }}>
        <Container maxWidth="sm" sx={{ maxWidth: '100%', bgcolor: COLORS.white, p: `${SPACING.internal}px`, borderRadius: '16px', border: `1px solid ${COLORS.borderGray}` }}>
          <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.darkBrown, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'ar' ? 'انضم الينا كشريك' : 'Join as Partner'}
          </Typography>
          <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.bodyGray, mb: '24px', textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'ar' ? 'أجلب المزيد من العملاء وحقق أحلام بيزنسك' : 'Bring more customers and achieve your business dreams'}
          </Typography>
          <Button variant="contained" fullWidth sx={{ height: '44px', borderRadius: '10px', background: `linear-gradient(90deg, #FF8A1D, #FF6F00)`, color: COLORS.white, fontWeight: 600, textTransform: 'none' }}>
            {language === 'ar' ? 'انضم الآن' : 'Join Now'}
          </Button>
        </Container>
        <Container maxWidth="sm" sx={{ maxWidth: '100%', bgcolor: COLORS.darkBrown, p: `${SPACING.internal}px`, borderRadius: '16px', color: COLORS.white }}>
          <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.white, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'ar' ? 'طور مسارك المهني' : 'Career Development'}
          </Typography>
          <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, mb: '24px', textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'ar' ? 'كن جزءاً من طريق يرفع طموحك إلى احتراف الطهي' : 'Elevate your culinary expertise'}
          </Typography>
          <Button variant="contained" fullWidth sx={{ height: '44px', borderRadius: '10px', background: `linear-gradient(90deg, #FF8A1D, #FF6F00)`, color: COLORS.white, fontWeight: 600, textTransform: 'none' }}>
            {language === 'ar' ? 'اعرف المزيد' : 'Learn More'}
          </Button>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box sx={{ bgcolor: COLORS.darkBrown, color: COLORS.white, py: `${SPACING.section}px`, px: `${SPACING.internal}px`, backgroundImage: 'url(/assets/images/Ad1.png)', backgroundSize: 'cover', backgroundPosition: 'center', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(43, 30, 22, 0.85)', zIndex: 0 }, position: 'relative', maxWidth: '1400px', mx: 'auto' }}>
        <Container maxWidth="lg" sx={{ maxWidth: '1240px', position: 'relative', zIndex: 1 }}>
          <Grid container spacing={ `${SPACING.internal}px` } sx={{ mb: `${SPACING.internal}px` }}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.white, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'من نحن' : 'About Us'}
              </Typography>
              <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'منصة تربط الطهاة بمحبي الطعام' : 'Connecting cooks with food lovers'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.white, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'السياسات' : 'Policies'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${SPACING.base}px` }}>
                <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                  {language === 'ar' ? 'شروط الاستخدام' : 'Terms'}
                </Typography>
                <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                  {language === 'ar' ? 'خصوصية' : 'Privacy'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.white, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'الوظائف' : 'Careers'}
              </Typography>
              <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'انضم لفريقنا' : 'Join Our Team'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography sx={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, color: COLORS.white, mb: '16px', textAlign: isRTL ? 'right' : 'left' }}>
                {language === 'ar' ? 'اتصل بنا' : 'Contact'}
              </Typography>
              <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 400, color: COLORS.white, textAlign: isRTL ? 'right' : 'left' }}>
                info@elnakha.com
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: `1px solid ${COLORS.borderGray}`, pt: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: `${SPACING.gap}px`, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <Box sx={{ display: 'flex', gap: `${SPACING.gap}px`, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <FacebookIcon sx={{ cursor: 'pointer' }} />
              <TwitterIcon sx={{ cursor: 'pointer' }} />
              <InstagramIcon sx={{ cursor: 'pointer' }} />
              <LinkedInIcon sx={{ cursor: 'pointer' }} />
              <YouTubeIcon sx={{ cursor: 'pointer' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: `${SPACING.gap * 2}px`, flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <Typography sx={{ fontSize: '14px', lineHeight: '22px', fontWeight: 600, color: COLORS.white, mb: '8px' }}>
                    {language === 'ar' ? 'المؤسس' : 'Founder'} {i}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', lineHeight: '18px', fontWeight: 400, color: COLORS.mutedGray }}>
                    {language === 'ar' ? 'تأسيس' : 'Founding'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

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

      {/* Shared Modal Host */}
      <MenuDishModalHost
        ref={modalHostRef}
        onAddToCart={(cartItem) => {
          addToCart(cartItem);
          window.dispatchEvent(new Event('cartUpdated'));
        }}
      />

      {/* Location Gate Dialog */}
      <Dialog open={locationGateOpen} onClose={() => setLocationGateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
          {language === 'ar' ? 'حدد موقعك أولاً' : 'Set your location first'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {language === 'ar'
              ? 'يرجى تحديد موقعك لاستعراض الأطباق والطهاة القريبين منك.'
              : 'Please set your location to browse dishes and cooks near you.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 3 }}>
          <Button
            fullWidth variant="contained"
            onClick={() => { setLocationGateOpen(false); navigate('/foodie/profile', { state: { openAddAddress: true } }); }}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {language === 'ar' ? 'تحديد الموقع' : 'Set Location'}
          </Button>
          <Button fullWidth onClick={() => setLocationGateOpen(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
    </>
  );
};

export default FoodieHome;
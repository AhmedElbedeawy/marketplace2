import React from 'react';
import { Box, Button, Container, Grid, Typography, Card, CardContent, IconButton, Divider } from '@mui/material';
import { Add, Remove, ShoppingCart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';

import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';

const FoodieCart = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode, cart, updateQuantity, removeFromCart } = useCountry();
  const [cartItems, setCartItems] = React.useState([]);

  const formatCurrency = (amount, decimals = 2) => {
    return localeFormatCurrency(amount, language, currencyCode);
  };

  // Helper function to normalize image path
  const normalizeImagePath = (photoUrl) => {
    if (!photoUrl) return null;
    
    // If it's already a full URL, return as is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    
    // If it starts with /assets, return as is (absolute path)
    if (photoUrl.startsWith('/assets/')) {
      return photoUrl;
    }
    
    // If it's just a filename like "M.png" or "Placeholder M.svg"
    // Assume it's in /assets/dishes/
    if (photoUrl.includes('.png') || photoUrl.includes('.jpg') || photoUrl.includes('.svg')) {
      return `/assets/dishes/${photoUrl}`;
    }
    
    return photoUrl;
  };

  // Group current cart by kitchen
  const groupCartItems = (currentCart) => {
    console.log('🛒 Processing cart from context:', currentCart);
    
    // If cart is empty, reset the multi-kitchen warning flag
    if (!currentCart || currentCart.length === 0) {
      localStorage.removeItem('multiKitchenWarningShown');
      setCartItems([]);
      return;
    }
    
    // Group cart items by kitchen
    const groupedByKitchen = {};
    currentCart.forEach(item => {
      if (!groupedByKitchen[item.kitchenId]) {
        groupedByKitchen[item.kitchenId] = {
          cookId: item.kitchenId,
          cookName: item.kitchenName,
          items: []
        };
      }
      const normalizedImage = normalizeImagePath(item.photoUrl);
      groupedByKitchen[item.kitchenId].items.push({
        offerId: item.offerId || item.dishId,
        foodId: item.offerId || item.dishId,
        foodName: item.name,
        price: item.priceAtAdd || item.price,
        quantity: item.quantity,
        image: normalizedImage,
      });
    });
    
    setCartItems(Object.values(groupedByKitchen));
  };

  // Sync with context cart
  React.useEffect(() => {
    groupCartItems(cart);
  }, [cart]);

  const handleQuantityChange = (cookId, foodId, newQuantity) => {
    updateQuantity(cookId, foodId, newQuantity);
  };

  const handleRemoveItem = (cookId, foodId) => {
    removeFromCart(cookId, foodId);
  };

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, cook) =>
      sum +
      cook.items.reduce((cookSum, item) => cookSum + item.price * item.quantity, 0),
    0
  );
  const deliveryFee = 5;
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
          px: '52px',
          bgcolor: '#FAF5F3',
        }}
      >
        <ShoppingCart sx={{ fontSize: 80, color: '#D1D5DB', mb: 2 }} />
        <Typography variant="h6" sx={{ fontSize: '20px', fontWeight: 600, color: '#2C2C2C', mb: 1 }}>
          {language === 'ar' ? 'السلة فارغة' : 'Your cart is empty'}
        </Typography>
        <Typography sx={{ fontSize: '14px', color: '#6B6B6B', mb: 3 }}>
          {language === 'ar' ? 'أضف بعض الأطباق اللذيذة!' : 'Add some delicious dishes!'}
        </Typography>
        <Button
          variant="contained"
          sx={{
            bgcolor: '#FF7A00',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 600,
            px: 4,
            py: 1.5,
            borderRadius: '16px',
            textTransform: 'none',
            '&:hover': {
              bgcolor: '#E56A00',
            },
          }}
          onClick={() => navigate('/foodie/menu')}
        >
          {language === 'ar' ? 'تصفح الأطباق' : 'Browse Dishes'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: '52px', py: 3, direction: isRTL ? 'rtl' : 'ltr', bgcolor: '#FAF5F3', minHeight: '100vh' }}>
      <Container maxWidth={false} disableGutters>
        {/* Title */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#2B1E16', textAlign: isRTL ? 'right' : 'left', fontFamily: 'Inter' }}>
            {language === 'ar' ? 'السلة' : 'Cart'}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            {cartItems.map((cook) => (
              <Card
                key={cook.cookId}
                sx={{
                  mb: 3,
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Cook Header */}
                <Box
                  sx={{
                    backgroundColor: '#E5DEDD',
                    p: 2,
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                    {cook.cookName}
                  </Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                    {formatCurrency(cook.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                  </Typography>
                </Box>

                {/* Items */}
                {cook.items.map((item, itemIndex) => (
                  <Box
                    key={`${cook.cookId}-${item.foodId}-${itemIndex}`}
                    sx={{
                      p: 2,
                      borderBottom: '1px solid #E5E7EB',
                      display: 'flex',
                      gap: 2,
                      '&:last-child': {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    {/* Image */}
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        backgroundColor: '#D1D5DB',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.foodName} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            borderRadius: '12px'
                          }} 
                        />
                      ) : (
                        <Typography sx={{ fontSize: '10px', color: '#6B6B6B', textAlign: 'center' }}>
                          No image
                        </Typography>
                      )}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                        {item.foodName}
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#6B6B6B', mt: 0.5 }}>
                        {formatCurrency(item.price)}
                      </Typography>
                    </Box>

                    {/* Quantity Control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleQuantityChange(cook.cookId, item.foodId, item.quantity - 1)}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: '#FF7A00',
                          color: '#595757',
                          '&:hover': {
                            bgcolor: '#E56A00',
                          },
                        }}
                      >
                        <Remove sx={{ fontSize: 18 }} />
                      </IconButton>
                      <Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleQuantityChange(cook.cookId, item.foodId, item.quantity + 1)}
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: '#FF7A00',
                          color: '#595757',
                          '&:hover': {
                            bgcolor: '#E56A00',
                          },
                        }}
                      >
                        <Add sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Card>
            ))}
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                position: 'sticky',
                top: 20,
              }}
            >
              <CardContent>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#2C2C2C', mb: 2 }}>
                  {language === 'ar' ? 'الملخص' : 'Order Summary'}
                </Typography>

                {/* Summary Rows */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '14px', color: '#6B6B6B' }}>
                      {language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}
                    </Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                      {formatCurrency(subtotal)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ fontSize: '14px', color: '#6B6B6B' }}>
                      {language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
                    </Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                      {formatCurrency(deliveryFee)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Total */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2C' }}>
                    {language === 'ar' ? 'الإجمالي' : 'Total'}
                  </Typography>
                  <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#2C2C2C' }}>
                    {formatCurrency(total)}
                  </Typography>
                </Box>

                {/* Checkout Button */}
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    bgcolor: '#595757',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: '16px',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#3F3B3B',
                    },
                  }}
                  onClick={() => navigate('/foodie/checkout')}
                >
                  {language === 'ar' ? 'إتمام الطلب' : 'Proceed to Checkout'}
                </Button>

                {/* Multi-Kitchen Warning Message */}
                {cartItems.length > 1 && (
                  <Typography
                    sx={{
                      mt: 2,
                      fontSize: '13px',
                      color: '#DC2626',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}
                  >
                    {language === 'ar'
                      ? 'يشمل هذا الطلب مواقع استلام متعددة'
                      : 'This order includes multiple pickup locations'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default FoodieCart;

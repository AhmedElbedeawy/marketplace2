import React from 'react';
import { Box, Button, Container, Grid, Typography, Card, CardContent, IconButton, Divider, FormControlLabel, Switch, Tooltip } from '@mui/material';
import { Add, Remove, ShoppingCart, LocalShipping, Schedule } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';

import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import { normalizeImageUrl } from '../../utils/api';

const FoodieCart = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const { countryCode, currencyCode, cart, updateQuantity, removeFromCart } = useCountry();
  const [cartItems, setCartItems] = React.useState([]);
  
  // Store combine/separate preferences per cook
  const [cookPreferences, setCookPreferences] = React.useState(() => {
    const saved = localStorage.getItem('cookPreferences');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Persist preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('cookPreferences', JSON.stringify(cookPreferences));
  }, [cookPreferences]);

  const formatCurrency = (amount, decimals = 2) => {
    return localeFormatCurrency(amount, language, currencyCode);
  };

  // Using normalizeImageUrl from utils/api for consistent image handling

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
      const normalizedImage = normalizeImageUrl(item.photoUrl || item.imageUrl || item.image);
      groupedByKitchen[item.kitchenId].items.push({
        offerId: item.offerId || item.dishId,
        foodId: item.offerId || item.dishId,
        foodName: item.name,
        price: item.priceAtAdd || item.price,
        quantity: item.quantity,
        image: normalizedImage,
        fulfillmentMode: item.fulfillmentMode,
        deliveryFee: item.deliveryFee || 0,
        prepTime: item.prepTime,
        prepReadyConfig: item.prepReadyConfig,
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

  // Get ready time for an item (in minutes)
  const getReadyTime = (item) => {
    return item.prepTime || item.prepReadyConfig?.prepTimeMinutes || 30;
  };

  // Group items by ready time batches
  const groupByReadyTime = (items) => {
    const batches = [];
    items.forEach(item => {
      const readyTime = getReadyTime(item);
      console.log(`[DEBUG groupByReadyTime] item: ${item.dishName || item.name}, cookId: ${item.cookId || item.kitchenId}, prepTime: ${item.prepTime}, prepReadyConfig:`, item.prepReadyConfig, `→ readyTime: ${readyTime}`);
      const existingBatch = batches.find(batch => batch.readyTime === readyTime);
      if (existingBatch) {
        existingBatch.items.push(item);
      } else {
        batches.push({ readyTime, items: [item] });
      }
    });
    console.log(`[DEBUG groupByReadyTime] Total batches: ${batches.length}, batch keys:`, batches.map(b => b.readyTime));
    return batches;
  };

  // Calculate totals with per-cook delivery fee logic
  // Rule: Delivery fee is per dispatch batch, not per item
  // Pickup orders have 0 delivery fee
  // If combined: charge ONE delivery fee (highest) - all items delivered together
  // If separate: charge delivery fee per batch - items with same ready time delivered together
  const calculateCookDeliveryFee = (cookItems, cookId) => {
    // Get all delivery items for this cook
    const deliveryItems = cookItems.filter(item => item.fulfillmentMode === 'delivery');
    
    if (deliveryItems.length === 0) return 0; // All pickup or no delivery
    
    const preference = cookPreferences[cookId]?.timingPreference || 'separate';
    
    if (preference === 'combined') {
      // Combined: charge ONE delivery fee (the highest)
      const fees = deliveryItems.map(item => item.deliveryFee || 0);
      return Math.max(...fees);
    } else {
      // Separate: group by ready time, charge per batch
      const batches = groupByReadyTime(deliveryItems);
      return batches.reduce((total, batch) => {
        const batchFee = Math.max(...batch.items.map(item => item.deliveryFee || 0));
        return total + batchFee;
      }, 0);
    }
  };
  
  // Toggle combine/separate preference for a cook
  const toggleTimingPreference = (cookId) => {
    setCookPreferences(prev => ({
      ...prev,
      [cookId]: {
        ...prev[cookId],
        timingPreference: prev[cookId]?.timingPreference === 'combined' ? 'separate' : 'combined'
      }
    }));
  };
  
  // Check if a cook has items with different ready times
  const hasDifferentReadyTimes = (cookItems) => {
    if (cookItems.length <= 1) return false;
    // Use same getReadyTime logic for consistency
    const firstPrep = getReadyTime(cookItems[0]);
    const hasDifferent = cookItems.some(item => {
      const itemPrep = getReadyTime(item);
      return itemPrep !== firstPrep;
    });
    console.log(`[DEBUG hasDifferentReadyTimes] firstPrep: ${firstPrep}, hasDifferent: ${hasDifferent}, items:`, cookItems.map(i => ({ name: i.dishName || i.name, prep: getReadyTime(i) })));
    return hasDifferent;
  };

  const subtotal = cartItems.reduce(
    (sum, cook) =>
      sum +
      cook.items.reduce((cookSum, item) => cookSum + item.price * item.quantity, 0),
    0
  );

  // Calculate delivery fee per cook
  const deliveryFeesByCook = cartItems.map(cook => {
    const deliveryItems = cook.items.filter(item => item.fulfillmentMode === 'delivery');
    const preference = cookPreferences[cook.cookId]?.timingPreference || 'separate';
    const batches = groupByReadyTime(deliveryItems);
    const numDeliveries = preference === 'combined' ? (deliveryItems.length > 0 ? 1 : 0) : batches.length;
    
    return {
      cookId: cook.cookId,
      cookName: cook.cookName,
      fee: calculateCookDeliveryFee(cook.items, cook.cookId),
      hasMultipleItems: cook.items.length > 1,
      hasDeliveryItems: deliveryItems.length > 0,
      hasPickupItems: cook.items.some(item => item.fulfillmentMode === 'pickup'),
      hasDifferentTimes: hasDifferentReadyTimes(cook.items),
      timingPreference: preference,
      numDeliveries,
      deliveryItemsCount: deliveryItems.length,
      batches,
    };
  });

  const totalDeliveryFee = deliveryFeesByCook.reduce((sum, cook) => sum + cook.fee, 0);
  const total = subtotal + totalDeliveryFee;

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
    <>
      <Box sx={{ position: "fixed", top: 0, right: 0, bgcolor: "#00AA00", color: "white", px: 2, py: 0.5, zIndex: 9999, fontSize: "12px", fontWeight: "bold" }}>BUILD_STAMP: FEB04_A1</Box>
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
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                      {cook.cookName}
                    </Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                      {formatCurrency(cook.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                    </Typography>
                  </Box>
                  
                  {/* Combine/Separate Toggle - Only show for multiple items with different times */}
                  {(() => {
                    const cookFeeInfo = deliveryFeesByCook.find(c => c.cookId === cook.cookId);
                    console.log(`[DEBUG Toggle] cookId: ${cook.cookId}, hasMultipleItems: ${cookFeeInfo?.hasMultipleItems}, hasDifferentTimes: ${cookFeeInfo?.hasDifferentTimes}, batches: ${cookFeeInfo?.batches?.length}, hasDeliveryItems: ${cookFeeInfo?.hasDeliveryItems}`);
                    if (!cookFeeInfo?.hasMultipleItems || !cookFeeInfo?.hasDifferentTimes) return null;
                    
                    const isDelivery = cookFeeInfo.hasDeliveryItems;
                    const isCombined = cookFeeInfo.timingPreference === 'combined';
                    
                    return (
                      <Box sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        bgcolor: '#FAF5F3', 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isDelivery ? (
                            <LocalShipping sx={{ fontSize: 18, color: '#FF7A00' }} />
                          ) : (
                            <Schedule sx={{ fontSize: 18, color: '#FF7A00' }} />
                          )}
                          <Typography sx={{ fontSize: '13px', color: '#2C2C2C' }}>
                            {isDelivery 
                              ? (language === 'ar' 
                                ? 'دمج العناصر في توصيل واحد (توفير الشحن)' 
                                : 'Combine items into one delivery (save shipping)')
                              : (language === 'ar'
                                ? 'تحضير جميع العناصر معاً للاستلام'
                                : 'Prepare all items together for pickup')
                            }
                          </Typography>
                        </Box>
                        <Tooltip title={isCombined 
                          ? (language === 'ar' ? 'سيتم توصيل جميع العناصر معاً' : 'All items will be delivered together')
                          : (language === 'ar' ? 'سيتم توصيل كل عنصر على حدة' : 'Each item delivered separately')
                        }>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isCombined}
                                onChange={() => toggleTimingPreference(cook.cookId)}
                                size="small"
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#FF7A00',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#FF7A00',
                                  },
                                }}
                              />
                            }
                            label=""
                          />
                        </Tooltip>
                      </Box>
                    );
                  })()}
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
                      {/* Show fulfillment mode */}
                      <Typography sx={{ fontSize: '11px', color: '#FF7A00', mt: 0.5 }}>
                        {item.fulfillmentMode === 'delivery' 
                          ? (language === 'ar' ? 'توصيل' : 'Delivery')
                          : (language === 'ar' ? 'استلام' : 'Pickup')
                        }
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
                  
                  {/* Show delivery fees per cook */}
                  {deliveryFeesByCook.map(cook => (
                    cook.fee > 0 && (
                      <Box key={cook.cookId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: '14px', color: '#6B6B6B' }}>
                          {language === 'ar' 
                            ? `توصيل: ${cook.cookName} (${cook.numDeliveries} ${cook.numDeliveries === 1 ? 'توصيلة' : 'توصيلات'})`
                            : `Delivery: ${cook.cookName} (${cook.numDeliveries} ${cook.numDeliveries === 1 ? 'delivery' : 'deliveries'})`
                          }
                        </Typography>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                          {formatCurrency(cook.fee)}
                        </Typography>
                      </Box>
                    )
                  ))}
                  
                  {/* Show zero delivery fee if all are pickup */}
                  {totalDeliveryFee === 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontSize: '14px', color: '#6B6B6B' }}>
                        {language === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}
                      </Typography>
                      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#2C2C2C' }}>
                        {language === 'ar' ? 'مجاني' : 'Free'}
                      </Typography>
                    </Box>
                  )}
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
    </>
  );
};

export default FoodieCart;

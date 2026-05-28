import React, { useState } from 'react';
import { Box, Button, Container, Grid, Typography, Card, CardContent, IconButton, Divider, FormControlLabel, Switch, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add, Remove, ShoppingCart, LocalShipping, Schedule } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCountry } from '../../contexts/CountryContext';

import { formatCurrency as localeFormatCurrency } from '../../utils/localeFormatter';
import { normalizeImageUrl } from '../../utils/api';
import api from '../../utils/api';
import { calcDeliveryFees, getDeliveryCount } from '../../utils/deliveryFeeCalculator';

const FoodieCart = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const handleCheckoutClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthGateOpen(true);
    } else {
      navigate('/foodie/checkout');
    }
  };
  const { countryCode, currencyCode, cart, updateQuantity, removeFromCart, clearCart, setCart, fetchCartFromBackend } = useCountry();
  const [cartItems, setCartItems] = React.useState([]);
  const [fetchedPrepTimes, setFetchedPrepTimes] = React.useState({});
  const [stockLevels, setStockLevels] = React.useState({}); // Map: offerId_portionKey -> stock
  
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

  // Group current cart by cookId
  const groupCartItems = (currentCart) => {
    console.log('🛒 [DEBUG] Processing cart from context:', currentCart);
    
    // If cart is empty, reset the multi-kitchen warning flag
    if (!currentCart || currentCart.length === 0) {
      localStorage.removeItem('multiKitchenWarningShown');
      setCartItems([]);
      return;
    }
    
    // DEBUG: Log each cart item's fields before grouping
    currentCart.forEach((item, idx) => {
      console.log(`[DEBUG] Cart item ${idx}: dishId=${item.dishId}, offerId=${item.offerId}, cookId=${item.cookId} (type: ${typeof item.cookId}), kitchenId=${item.kitchenId} (type: ${typeof item.kitchenId}), prepTimeMinutes=${item.prepTimeMinutes}, deliveryFee=${item.deliveryFee}, fulfillmentMode=${item.fulfillmentMode}, kitchenName=${item.kitchenName}`);
    });
    
    // Group cart items by cookId (fallback to kitchenId for backward compatibility)
    const groupedByCook = {};
    currentCart.forEach(item => {
      const rawCookId = item.cookId || item.kitchenId;
      const isNull = rawCookId === null || rawCookId === undefined || rawCookId === 'null' || rawCookId === 'undefined';
      console.log(`[DEBUG] Checking item "${item.name}": rawCookId=${rawCookId}, type=${typeof rawCookId}, isNull=${isNull}, !rawCookId=${!rawCookId}`);
      if (isNull || !rawCookId) {
        console.warn('[DEBUG] SKIPPING item with null cookId:', item.name);
        return; // Skip items without valid cookId
      }
      const cookId = String(rawCookId);
      if (!groupedByCook[cookId]) {
        groupedByCook[cookId] = {
          cookId: cookId,
          cookName: item.kitchenName || 'Unknown Kitchen',
          items: []
        };
      }
      const normalizedImage = normalizeImageUrl(item.photoUrl || item.imageUrl || item.image);
      groupedByCook[cookId].items.push({
        // Identity fields (CRITICAL for quantity sync)
        offerId: item.offerId || item.dishId,
        foodId: item.offerId || item.dishId,
        cookId: cookId,
        portionKey: item.portionKey,
        portionLabel: item.portionLabel,
        extras: item.extras,
        pickupLocationId: item.pickupLocationId,
        adminDishId: item.adminDishId || item.dishId,
        // Display fields (support both backend and web formats)
        foodName: item.foodName || item.name || item.dishName,
        name: item.name || item.dishName,
        kitchenName: item.kitchenName || item.cookName,
        // Other fields
        price: item.priceAtAdd || item.price,
        priceAtAdd: item.priceAtAdd || item.price,
        quantity: item.quantity,
        image: normalizedImage,
        photoUrl: item.photoUrl || item.imageUrl || item.image,
        fulfillmentMode: item.fulfillmentMode,
        deliveryFee: item.deliveryFee || 0,
        prepTimeMinutes: item.prepTimeMinutes || item.prepTime || 30,
      });
    });
    
    // DEBUG: Log grouping results
    console.log('[DEBUG] Grouped by cook count:', Object.keys(groupedByCook).length);
    Object.keys(groupedByCook).forEach(key => {
      const group = groupedByCook[key];
      console.log(`[DEBUG] Cook group "${key}": name="${group.cookName}", items=${group.items.length}`);
      group.items.forEach((item, idx) => {
        console.log(`[DEBUG]   Item ${idx}: name="${item.foodName}", prepTime=${item.prepTimeMinutes}, mode=${item.fulfillmentMode}, fee=${item.deliveryFee}`);
      });
    });
    
    setCartItems(Object.values(groupedByCook));
  };

  // Sync with context cart
  React.useEffect(() => {
    groupCartItems(cart);
  }, [cart]);
  
  // REFRESH ON ENTER: Fetch backend cart when cart page opens.
  // Backend is the source of truth — always replace local cart with backend state.
  // This ensures items added/removed on another platform are visible on cart open.
  React.useEffect(() => {
    const refreshCart = async () => {
      console.log('🔄 [CART-PAGE] Refreshing cart from backend on mount');
      const backendItems = await fetchCartFromBackend();

      if (backendItems && backendItems.length > 0) {
        console.log('✅ [CART-PAGE] Backend cart replacing local cart:', backendItems.length, 'items');
        setCart(backendItems);
      } else {
        // Backend is empty or fetch failed — do NOT wipe local cart.
        // Local items may be guest adds not yet synced, or this is a transient failure.
        console.log('⚠️ [CART-PAGE] Backend cart empty or fetch failed — preserving local cart');
      }
    };

    refreshCart();
  }, []); // Only on mount
  
  // CRITICAL: Revalidate cart stock on mount
  React.useEffect(() => {
    const revalidateStock = async () => {
      if (!cart || cart.length === 0) return;
      
      try {
        console.log('🔄 [CART] Revalidating stock for', cart.length, 'items');
        
        const response = await api.post('/cart/refresh-stock', {
          cartItems: cart
        });
        
        if (response.data.success) {
          const { updatedItems, hasChanges } = response.data;
          
          if (hasChanges) {
            // Update cart with adjusted quantities
            const newCart = updatedItems
              .filter(item => !item.shouldRemove)
              .map(item => ({
                ...item,
                quantity: item.quantity
              }));
            
            setCart(newCart);
            
            // Store stock levels for quantity buttons
            const stockMap = {};
            updatedItems.forEach(item => {
              const key = `${item.offerId || item.dishId}_${item.portionKey || ''}`;
              stockMap[key] = item.currentStock || 0;
            });
            setStockLevels(stockMap);
            
            // Show notification
            const removedCount = response.data.removedItems?.length || 0;
            if (removedCount > 0) {
              alert('Stock changed. Check cart.');
            }
          }
        }
      } catch (error) {
        console.error('❌ [CART] Stock revalidation failed:', error);
        // Non-critical - continue with existing cart
      }
    };
    
    revalidateStock();
  }, []); // Only on mount

  const handleQuantityChange = (cookId, foodId, newQuantity, portionKey = null) => {
    updateQuantity(cookId, foodId, newQuantity, portionKey);
  };

  const handleRemoveItem = (cookId, foodId) => {
    removeFromCart(cookId, foodId);
  };

  // Get ready time for an item (in minutes)
  // Handles both number format (45) and legacy string format ("16:00")
  const getReadyTime = (item) => {
    const prepTime = item.prepTimeMinutes;
    
    // If it's already a number, return it
    if (typeof prepTime === 'number') {
      return prepTime;
    }
    
    // If it's a string that looks like a time (e.g., "16:00"), convert to minutes from midnight
    if (typeof prepTime === 'string' && prepTime.includes(':')) {
      const [hours, minutes] = prepTime.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Try to parse as number
    const parsed = parseInt(prepTime, 10);
    return isNaN(parsed) ? 30 : parsed; // Default to 30 if invalid
  };

  // Group items by cookId → fulfillmentMode → prepTimeMinutes
  const groupByReadyTime = (items) => {
    const batches = [];
    items.forEach(item => {
      const readyTime = getReadyTime(item);
      if (!readyTime) {
        console.warn("[DEBUG] Missing prepTimeMinutes for cart item", item.foodName);
        // Treat as single batch
        batches.push({ readyTime: 'unknown', items: [item] });
        return;
      }
      const existingBatch = batches.find(batch => batch.readyTime === readyTime);
      if (existingBatch) {
        existingBatch.items.push(item);
      } else {
        batches.push({ readyTime, items: [item] });
      }
    });
    console.log('[DEBUG] Batches created:', batches.map(b => ({ prepTime: b.readyTime, items: b.items.map(i => i.foodName) })));
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
    
    console.log(`[DEBUG] calculateCookDeliveryFee for cook ${cookId}:`, {
      totalItems: cookItems.length,
      deliveryItems: deliveryItems.length,
      deliveryItemNames: deliveryItems.map(i => i.foodName),
    });
    
    if (deliveryItems.length === 0) return 0; // All pickup or no delivery
    
    const preference = cookPreferences[cookId]?.timingPreference || 'separate';
    
    if (preference === 'combined') {
      // Combined: charge ONE delivery fee (the highest)
      const fees = deliveryItems.map(item => item.deliveryFee || 0);
      const maxFee = Math.max(...fees);
      console.log(`[DEBUG] Cook ${cookId} COMBINED: fees=${fees}, maxFee=${maxFee}`);
      return maxFee;
    } else {
      // Separate: group by ready time, charge per batch
      const batches = groupByReadyTime(deliveryItems);
      const totalFee = batches.reduce((total, batch) => {
        const batchFee = Math.max(...batch.items.map(item => item.deliveryFee || 0));
        return total + batchFee;
      }, 0);
      console.log(`[DEBUG] Cook ${cookId} SEPARATE: batchCount=${batches.length}, totalFee=${totalFee}`);
      return totalFee;
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
    return cookItems.some(item => {
      const itemPrep = getReadyTime(item);
      return itemPrep !== firstPrep;
    });
  };

  const subtotal = cartItems.reduce(
    (sum, cook) =>
      sum +
      cook.items.reduce((cookSum, item) => cookSum + item.price * item.quantity, 0),
    0
  );

  // Flatten cart items for shared calculator
  const flatCartItems = cartItems.flatMap(cook => 
    cook.items.map(item => ({
      ...item,
      cookId: cook.cookId,
      kitchenId: cook.cookId,
      prepTimeMinutes: item.prepTimeMinutes || item.prepTime
    }))
  );

  // Use shared delivery fee calculator
  const { totalDeliveryFee, deliveryFeeByCook, batchCountByCook } = calcDeliveryFees(flatCartItems, cookPreferences);

  // Map to existing structure for UI compatibility
  const deliveryFeesByCook = cartItems.map(cook => {
    const deliveryItems = cook.items.filter(item => item.fulfillmentMode === 'delivery');
    const preference = cookPreferences[cook.cookId]?.timingPreference || 'separate';
    const batches = groupByReadyTime(deliveryItems);
    const numDeliveries = batchCountByCook[cook.cookId] || 0;
    const fee = deliveryFeeByCook[cook.cookId] || 0;
    
    return {
      cookId: cook.cookId,
      cookName: cook.cookName,
      fee,
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
          component={Link} to="/foodie/menu"
        >
          {language === 'ar' ? 'تصفح الأطباق' : 'Browse Dishes'}
        </Button>
      </Box>
    );
  }

  return (
    <>
      {process.env.NODE_ENV !== 'production' && (
        <Box sx={{ position: "fixed", top: 0, right: 0, bgcolor: "#00AA00", color: "white", px: 2, py: 0.5, zIndex: 9999, fontSize: "12px", fontWeight: "bold" }}>BUILD_STAMP: FEB04_A1</Box>
      )}
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
                  
                  {/* Combine/Separate Toggle - Only show for delivery with multiple batches */}
                  {(() => {
                    const cookFeeInfo = deliveryFeesByCook.find(c => c.cookId === cook.cookId);
                    // Show toggle only when: multiple items, delivery mode, and multiple batches
                    if (!cookFeeInfo?.hasDeliveryItems) return null;
                    if (cook.items.length <= 1) return null;
                    if (cookFeeInfo.batches.length <= 1) return null;
                    
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
                        {item.portionLabel || item.portionKey ? `${item.portionLabel || item.portionKey} | ${formatCurrency(item.price)}` : formatCurrency(item.price)}
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
                        onClick={() => handleQuantityChange(cook.cookId, item.foodId, item.quantity - 1, item.portionKey)}
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
                        onClick={() => {
                          // CRITICAL: Check against live stock
                          const stockKey = `${item.foodId}_${item.portionKey || ''}`;
                          const availableStock = stockLevels[stockKey] ?? 999;
                          if (item.quantity < availableStock) {
                            handleQuantityChange(cook.cookId, item.foodId, item.quantity + 1, item.portionKey);
                          }
                        }}
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
                  onClick={handleCheckoutClick}
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

      {/* Auth gate dialog for guests attempting checkout */}
      <Dialog open={authGateOpen} onClose={() => setAuthGateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>
          {language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Sign in required'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {language === 'ar'
              ? 'يرجى تسجيل الدخول أو إنشاء حساب لإتمام الطلب. سلتك محفوظة.'
              : 'Please sign in or create an account to proceed. Your cart is saved.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 3 }}>
          <Button
            fullWidth variant="contained"
            onClick={() => { setAuthGateOpen(false); navigate('/login?redirect=/foodie/checkout'); }}
            sx={{ bgcolor: '#FF7A00', '&:hover': { bgcolor: '#E66A00' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </Button>
          <Button
            fullWidth variant="outlined"
            onClick={() => { setAuthGateOpen(false); navigate('/signup?redirect=/foodie/checkout'); }}
            sx={{ borderColor: '#FF7A00', color: '#FF7A00', borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {language === 'ar' ? 'إنشاء حساب' : 'Create Account'}
          </Button>
          <Button fullWidth onClick={() => setAuthGateOpen(false)} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FoodieCart;

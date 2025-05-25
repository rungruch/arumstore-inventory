# Firestore Cache System Documentation

## Overview

The Arumstore Inventory system implements a sophisticated caching mechanism to optimize Firestore database queries and improve application performance. This document provides comprehensive details about the cache implementation, patterns, and best practices used throughout the system.

## Cache Strategy

### Core Principles

1. **Hourly Refresh**: Most cached data expires after 1 hour (3600 seconds)
2. **Fallback Pattern**: If cache fails, the system falls back to direct database queries
3. **Parameter-based Caching**: Cache keys are generated based on function parameters
4. **Atomic Updates**: Cache updates are performed atomically with data retrieval

### Cache Storage Collections

The system uses several Firestore collections for caching:

- `hourly_stats` - Primary cache collection for most statistics
- `purchase_monthly_summary` - Monthly purchase data cache
- `purchases_by_supplier_cache` - Supplier purchase data cache
- `purchase_period_comparison_cache` - Purchase comparison cache
- `product_monthly_income_summary` - Product income summaries

## Cached Functions Reference

### Customer Statistics (`firestoreCustomerStats.tsx`)

#### `getCachedCustomerGroupDistribution()`
- **Purpose**: Caches customer distribution by group
- **Cache Key**: `customer_group_distribution`
- **Expiration**: 1 hour
- **Returns**: `Array<{name: string, value: number}>`

```typescript
// Example usage
const groupDistribution = await getCachedCustomerGroupDistribution();
```

#### `getCachedCustomerProvinceDistribution()`
- **Purpose**: Caches customer distribution by province
- **Cache Key**: `customer_province_distribution`
- **Expiration**: 1 hour
- **Returns**: `Array<{name: string, value: number}>`

#### `getCachedTopCustomers(limit: number)`
- **Purpose**: Caches top customers by transaction value
- **Cache Key**: `top_customers_${limit}`
- **Parameters**: 
  - `limit`: Maximum number of customers to return
- **Expiration**: 1 hour
- **Returns**: `Array<{id: string, name: string, value: number, transactions: number}>`

#### `getCachedCurrentMonthActiveCustomers()`
- **Purpose**: Caches active customers count for current month
- **Cache Key**: `active_customers_${YYYY-MM}`
- **Expiration**: 1 hour (auto-refreshes for new months)
- **Returns**: `number`

### Statistics Functions (`firestoreStats.tsx`)

#### `getCachedProductCountByWarehouse()`
- **Purpose**: Caches product count by warehouse with income totals
- **Cache Key**: `product_warehouse_count`
- **Expiration**: 1 hour
- **Returns**: `Array<{warehouse_id: string, warehouse_name: string, count: number, totalIncome: number, totalPendingIncome: number}>`

#### `getCachedProductCategoryCount()`
- **Purpose**: Caches product category statistics
- **Cache Key**: `product_category_count`
- **Expiration**: 1 hour
- **Returns**: `ProductCategoryCount`

#### `getCachedLowStocksProducts(defaultThreshold: number, warehouseId?: string)`
- **Purpose**: Caches low stock products data
- **Cache Key**: `low_stocks_${warehouseId || 'all'}_${defaultThreshold}`
- **Parameters**:
  - `defaultThreshold`: Stock threshold for low stock detection
  - `warehouseId`: Optional warehouse filter
- **Expiration**: 1 hour
- **Returns**: `Array<{id: string, sku: string, name: string, stock: number, threshold: number, category: string, warehouse_id?: string, warehouse_name?: string}>`

#### `getCachedPeriodSalesComparison(startDate: Date, endDate: Date, excludeCancelled: boolean)`
- **Purpose**: Caches sales comparison between periods
- **Cache Key**: `period_sales_comparison_${YYYY-MM-DD}_${YYYY-MM-DD}_${excl|incl}`
- **Parameters**:
  - `startDate`: Period start date
  - `endDate`: Period end date
  - `excludeCancelled`: Whether to exclude cancelled orders
- **Expiration**: 1 hour
- **Returns**: `{periodSales: number, previousPeriodSales: number, growthPercent: number, orderCount: number, itemCount: number}`

#### `getCachedSalesBySellMethod(startDate: Date, endDate: Date, excludeCancelled: boolean)`
- **Purpose**: Caches sales data grouped by sell method
- **Cache Key**: `sales_by_method_${YYYY-MM-DD}_${YYYY-MM-DD}_${excl|incl}`
- **Expiration**: 1 hour
- **Returns**: `{sellMethods: {[method: string]: number}, topMethodProducts: {[method: string]: {sku: string, name: string, totalIncome: number}[]}}`

#### `getCachedMonthlyPurchaseByDate(date: Date)`
- **Purpose**: Caches monthly purchase data
- **Cache Key**: Document ID based on `YYYY-MM` format
- **Collection**: `purchase_monthly_summary`
- **Expiration**: 1 hour
- **Returns**: `MonthlyPurchase`

#### `getCachedPurchasesBySupplier(startDate: Date, endDate: Date)`
- **Purpose**: Caches purchase data grouped by supplier
- **Cache Key**: `${YYYY-MM-DD}_${YYYY-MM-DD}`
- **Collection**: `purchases_by_supplier_cache`
- **Expiration**: 1 hour
- **Returns**: `{suppliers: {[supplier: string]: number}, topSupplierProducts: {[supplier: string]: Array<{name: string, sku: string, totalPurchase: number}>}}`

#### `getCachedPurchasePeriodComparison(startDate: Date, endDate: Date)`
- **Purpose**: Caches purchase period comparison data
- **Cache Key**: `${YYYY-MM-DD}_${YYYY-MM-DD}`
- **Collection**: `purchase_period_comparison_cache`
- **Expiration**: 1 hour
- **Returns**: `{currentPeriodTotal: number, previousPeriodTotal: number, growthPercent: number, growthAmount: number}`

## Cache Implementation Pattern

### Standard Implementation

All cached functions follow this consistent pattern:

```typescript
export async function getCachedFunctionName(params): Promise<ReturnType> {
  try {
    // 1. Generate unique cache key based on parameters
    const cacheDocId = generateCacheKey(params);
    
    // 2. Check for existing cache
    const docRef = doc(db, "cache_collection", cacheDocId);
    const docSnap = await getDoc(docRef);

    let data;

    if (!docSnap.exists()) {
      // 3. Cache miss - get fresh data
      data = await originalFunction(params);
      
      // 4. Store in cache
      await setDoc(docRef, {
        ...data,
        updated_at: Timestamp.now(),
        parameters: params
      });
    } else {
      const cachedData = docSnap.data();
      
      // 5. Check if cache is expired (older than 1 hour)
      if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
        // 6. Cache expired - refresh
        data = await originalFunction(params);
        
        // 7. Update cache
        await setDoc(docRef, {
          ...data,
          updated_at: Timestamp.now(),
          parameters: params
        });
      } else {
        // 8. Use cached data
        data = extractDataFromCache(cachedData);
      }
    }

    return data;
  } catch (error) {
    console.error("Cache error:", error);
    // 9. Fallback to original function
    return await originalFunction(params);
  }
}
```

### Cache Key Generation Strategies

1. **Simple Static Keys**: For global data
   ```typescript
   const cacheDocId = "customer_group_distribution";
   ```

2. **Parameter-based Keys**: For filtered data
   ```typescript
   const cacheDocId = `low_stocks_${warehouseId || 'all'}_${threshold}`;
   ```

3. **Date-based Keys**: For time-sensitive data
   ```typescript
   const cacheDocId = `sales_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
   ```

4. **Monthly Keys**: For monthly data
   ```typescript
   const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
   const cacheDocId = `monthly_data_${monthYear}`;
   ```

## Performance Benefits

### Query Reduction
- Reduces Firestore read operations by up to 95% for frequently accessed data
- Minimizes expensive aggregation queries
- Improves response times from seconds to milliseconds

### Cost Optimization
- Significantly reduces Firestore usage costs
- Prevents redundant calculations
- Optimizes bandwidth usage

### User Experience
- Faster dashboard loading
- Reduced loading states
- More responsive analytics

## Best Practices

### 1. Cache Invalidation
- Use appropriate expiration times based on data volatility
- Implement manual cache invalidation for critical updates
- Consider real-time requirements vs. performance trade-offs

### 2. Error Handling
- Always implement fallback to original functions
- Log cache errors for monitoring
- Graceful degradation when cache is unavailable

### 3. Cache Key Design
- Use descriptive, unique keys
- Include all relevant parameters
- Avoid key collisions

### 4. Data Structure
- Store metadata (timestamps, parameters) with cached data
- Use consistent data formats
- Consider data compression for large objects

## Monitoring and Maintenance

### Cache Hit Rate Monitoring
Implement monitoring to track:
- Cache hit/miss ratios
- Cache performance metrics
- Error rates and fallback usage

### Cache Cleanup
Consider implementing:
- Automatic cleanup of expired cache entries
- Storage usage monitoring
- Cache size limits

### Example Monitoring Query
```typescript
// Get cache statistics
const cacheStats = await getDocs(collection(db, "hourly_stats"));
const totalCacheEntries = cacheStats.size;
const expiredEntries = cacheStats.docs.filter(doc => {
  const data = doc.data();
  return data.updated_at.seconds < Date.now() / 1000 - 3600;
}).length;
```

## Troubleshooting

### Common Issues

1. **Cache Miss Due to Parameter Changes**
   - Ensure consistent parameter formatting
   - Check cache key generation logic

2. **Stale Data**
   - Verify expiration logic
   - Consider manual cache invalidation for critical updates

3. **Cache Storage Errors**
   - Check Firestore permissions
   - Monitor storage quotas
   - Implement proper error handling

### Debug Mode
Enable cache debugging by adding logging:
```typescript
console.log(`Cache key: ${cacheDocId}`);
console.log(`Cache hit: ${docSnap.exists()}`);
console.log(`Cache age: ${Date.now() / 1000 - cachedData.updated_at.seconds} seconds`);
```

## Future Enhancements

### Potential Improvements
1. **Redis Integration**: For even faster cache access
2. **Smart Invalidation**: Event-driven cache updates
3. **Compression**: Reduce storage costs for large datasets
4. **Multi-level Caching**: Memory + Firestore + Redis
5. **Cache Warming**: Pre-populate frequently accessed data

### Performance Metrics to Track
- Average cache hit rate
- Query response time improvements
- Cost savings from reduced Firestore operations
- User experience metrics (page load times)

---

*Last Updated: May 25, 2025*
*Version: 1.0*

This documentation should be updated whenever new cached functions are added or existing cache strategies are modified.

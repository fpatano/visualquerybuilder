# TPC-DS Sample Queries for Visual SQL Query Builder

This directory contains carefully curated sample SQL queries from the TPC-DS benchmark dataset that showcase the capabilities of the Visual SQL Query Builder. All queries use the `samples.tpcds_sf1` schema which is available in every Databricks workspace.

## 🎯 **Query Complexity Levels**

### 🌱 **Beginner (1-2 tables)**
- **01_customer_demographics.sql** - Simple customer analysis
- Perfect for learning basic JOINs and WHERE clauses

### 🌿 **Intermediate (3-4 tables)**
- **02_store_sales_performance.sql** - Store performance analysis
- **03_customer_purchase_journey.sql** - Customer purchase patterns
- **06_time_based_sales_trends.sql** - Temporal sales analysis

### 🌳 **Advanced (5-6 tables)**
- **04_multi_channel_sales.sql** - Cross-channel comparison
- **05_inventory_sales_correlation.sql** - Inventory analysis
- **07_customer_segmentation.sql** - Customer analytics
- **08_promotion_effectiveness.sql** - Marketing ROI analysis

## 📊 **Sample Queries Overview**

### 1. **Customer Demographics Analysis** 
**File**: `01_customer_demographics.sql`
- **Tables**: 2 (customer, customer_demographics)
- **Demonstrates**: Basic INNER JOIN, WHERE filtering, column selection
- **Business Value**: Customer characteristic analysis
- **Visual Elements**: Simple 2-table join with clear relationships

### 2. **Store Sales Performance**
**File**: `02_store_sales_performance.sql`
- **Tables**: 3 (store_sales, store, item)
- **Demonstrates**: Multiple JOINs, aggregations, GROUP BY
- **Business Value**: Store performance by product category
- **Visual Elements**: 3-table star schema with aggregations

### 3. **Customer Purchase Journey**
**File**: `03_customer_purchase_journey.sql`
- **Tables**: 4 (customer, customer_address, store_sales, store_returns)
- **Demonstrates**: Complex business logic, LEFT JOINs, subqueries
- **Business Value**: Customer purchase patterns and returns
- **Visual Elements**: Customer journey flow with optional returns

### 4. **Multi-Channel Sales Analysis**
**File**: `04_multi_channel_sales.sql`
- **Tables**: 5 (store_sales, store, item, date_dim, customer + web_sales, web_site)
- **Demonstrates**: Complex analytics, multiple data sources, UNION logic
- **Business Value**: Cross-channel performance comparison
- **Visual Elements**: Parallel channel analysis with shared dimensions

### 5. **Inventory and Sales Correlation**
**File**: `05_inventory_sales_correlation.sql`
- **Tables**: 6 (item, inventory, warehouse, store_sales, web_sales, date_dim)
- **Demonstrates**: Complex business intelligence, multiple dimensions
- **Business Value**: Inventory-sales correlation analysis
- **Visual Elements**: Multi-dimensional analysis with inventory tracking

### 6. **Time-Based Sales Trends**
**File**: `06_time_based_sales_trends.sql`
- **Tables**: 4 (date_dim, store_sales, item, web_sales)
- **Demonstrates**: Temporal analytics, seasonal analysis, trend identification
- **Business Value**: Seasonal sales pattern analysis
- **Visual Elements**: Time-based analysis with seasonal patterns

### 7. **Customer Segmentation Analysis**
**File**: `07_customer_segmentation.sql`
- **Tables**: 5 (customer, customer_demographics, household_demographics, customer_address, store_sales, web_sales)
- **Demonstrates**: Customer analytics, segmentation, behavioral analysis
- **Business Value**: Customer value segmentation
- **Visual Elements**: Customer profiling with behavioral analysis

### 8. **Promotion Effectiveness Analysis**
**File**: `08_promotion_effectiveness.sql`
- **Tables**: 4 (promotion, date_dim, store_sales, item, web_sales)
- **Demonstrates**: Marketing analytics, ROI analysis, promotional impact
- **Business Value**: Promotion performance and ROI measurement
- **Visual Elements**: Marketing campaign analysis with ROI calculation

## 🚀 **How to Use These Samples**

### **Import into Visual Query Builder**
1. Open the Visual SQL Query Builder
2. Click the "Import" button in the header
3. Select any `.sql` file from this directory
4. The query will automatically populate the SQL editor
5. Click "Sync to Canvas" to visualize the query structure

### **Learning Path**
1. **Start with**: `01_customer_demographics.sql` (beginner)
2. **Progress to**: `02_store_sales_performance.sql` (intermediate)
3. **Advance to**: `04_multi_channel_sales.sql` (advanced)
4. **Master with**: `05_inventory_sales_correlation.sql` (expert)

### **Customization Tips**
- Modify the `LIMIT` clauses to adjust result set sizes
- Change date ranges in WHERE clauses for different time periods
- Adjust category filters in the `i.i_category IN (...)` clauses
- Modify customer segment thresholds in CASE statements

## 🔍 **What Each Query Demonstrates**

### **Join Types**
- **INNER JOIN**: Primary relationships (customer → sales)
- **LEFT JOIN**: Optional relationships (sales → returns)
- **Multiple JOINs**: Complex business scenarios

### **Analytical Functions**
- **Aggregations**: SUM, COUNT, AVG for business metrics
- **Grouping**: GROUP BY for dimensional analysis
- **Filtering**: WHERE and HAVING for data selection
- **Conditional Logic**: CASE statements for business rules

### **Business Scenarios**
- **Customer Analytics**: Demographics, segmentation, behavior
- **Sales Analysis**: Performance, trends, channel comparison
- **Inventory Management**: Stock levels, sales correlation
- **Marketing ROI**: Promotion effectiveness, campaign analysis

## 📈 **Expected Results**

Each query is designed to return meaningful business insights:
- **Customer queries**: 50-200 rows with customer profiles
- **Sales queries**: 100-500 rows with performance metrics
- **Analytics queries**: 100-1000 rows with business intelligence
- **All queries**: Include proper LIMIT clauses to prevent timeouts

## 🎨 **Visual Builder Features Demonstrated**

- **Table Relationships**: Clear join paths and foreign keys
- **Column Selection**: Meaningful business columns
- **Filtering Logic**: Business-relevant WHERE conditions
- **Aggregations**: Business metrics and KPIs
- **Complex Joins**: Multi-table business scenarios
- **Business Logic**: Real-world analytical use cases

## 🔧 **Technical Notes**

- **Schema**: All queries use `samples.tpcds_sf1.*` tables
- **Performance**: Queries include LIMIT clauses for reasonable execution times
- **Compatibility**: Works with any Databricks workspace (TPC-DS is standard)
- **Scalability**: Can be modified for larger datasets by adjusting filters

## 📚 **Additional Resources**

- **TPC-DS Documentation**: [Official TPC-DS specification](http://www.tpc.org/tpcds/)
- **Databricks TPC-DS**: Available in every workspace under `samples.tpcds_sf1`
- **Query Optimization**: Use these samples to learn query performance tuning
- **Business Intelligence**: Adapt these patterns for your own business scenarios

---

**Happy Query Building! 🚀**

These samples provide a comprehensive foundation for learning and demonstrating the Visual SQL Query Builder's capabilities across various business scenarios and complexity levels.

# TPC-DS Sample Queries for Visual SQL Query Builder

This directory contains **3 carefully curated sample SQL queries** from the TPC-DS benchmark dataset that showcase the capabilities of the Visual SQL Query Builder. All queries are designed to render beautifully in the visual interface and use the `samples.tpcds_sf1` schema available in every Databricks workspace.

## 🎯 **Query Complexity Levels**

### 🌱 **Beginner (2 tables)**
- **01_customer_demographics.sql** - Simple customer analysis
- Perfect for learning basic JOINs and WHERE clauses

### 🌿 **Intermediate (3 tables)**
- **02_store_sales_performance.sql** - Store performance analysis
- Demonstrates multiple JOINs and aggregations

### 🌳 **Advanced (4 tables)**
- **03_customer_purchase_journey.sql** - Customer purchase patterns
- Shows complex business logic with multiple dimensions

## 📊 **Sample Queries Overview**

### 1. **Customer Demographics Analysis** 
**File**: `01_customer_demographics.sql`
- **Tables**: 2 (customer, customer_demographics)
- **Demonstrates**: Basic INNER JOIN, WHERE filtering, column selection
- **Business Value**: Customer characteristic analysis
- **Visual Elements**: Simple 2-table join with clear relationships
- **Expected Results**: ~50-100 rows of customer profiles

### 2. **Store Sales Performance**
**File**: `02_store_sales_performance.sql`
- **Tables**: 3 (store_sales, store, item)
- **Demonstrates**: Multiple JOINs, aggregations, GROUP BY
- **Business Value**: Store performance by product category
- **Visual Elements**: 3-table star schema with aggregations
- **Expected Results**: ~100 rows of store performance metrics

### 3. **Customer Purchase Journey**
**File**: `03_customer_purchase_journey.sql`
- **Tables**: 4 (customer, customer_address, store_sales, item)
- **Demonstrates**: Complex business logic, multiple JOINs, aggregations
- **Business Value**: Customer purchase patterns and location analysis
- **Visual Elements**: Customer journey flow with location and purchase data
- **Expected Results**: ~100 rows of customer purchase insights

## 🚀 **How to Use These Samples**

### **Import into Visual Query Builder**
1. Open the Visual SQL Query Builder
2. Click the "Import" button in the header
3. Select any `.sql` file from this directory
4. The query will automatically populate the SQL editor
5. Click "Sync to Canvas" to visualize the query structure

### **Learning Path**
1. **Start with**: `01_customer_demographics.sql` (2 tables)
2. **Progress to**: `02_store_sales_performance.sql` (3 tables)
3. **Master with**: `03_customer_purchase_journey.sql` (4 tables)

### **Customization Tips**
- Modify the `LIMIT` clauses to adjust result set sizes
- Change date ranges in WHERE clauses for different time periods
- Adjust category filters in the `i.i_category IN (...)` clauses
- Modify customer thresholds in HAVING clauses

## 🔍 **What Each Query Demonstrates**

### **Join Types**
- **INNER JOIN**: Primary relationships (customer → demographics)
- **Multiple JOINs**: Progressive complexity (2 → 3 → 4 tables)
- **Clear Relationships**: Well-defined foreign key relationships

### **Analytical Functions**
- **Aggregations**: SUM, COUNT, AVG for business metrics
- **Grouping**: GROUP BY for dimensional analysis
- **Filtering**: WHERE and HAVING for data selection
- **Business Logic**: Meaningful business scenarios

### **Business Scenarios**
- **Customer Analytics**: Demographics and characteristics
- **Sales Analysis**: Store performance and product categories
- **Customer Journey**: Purchase patterns and location insights

## 📈 **Expected Results**

Each query is designed to return meaningful business insights:
- **Customer queries**: 50-100 rows with customer profiles
- **Sales queries**: 100 rows with performance metrics
- **All queries**: Include proper LIMIT clauses to prevent timeouts
- **Clean data**: Well-structured results that render beautifully

## 🎨 **Visual Builder Features Demonstrated**

- **Table Relationships**: Clear join paths and foreign keys
- **Column Selection**: Meaningful business columns
- **Filtering Logic**: Business-relevant WHERE conditions
- **Aggregations**: Business metrics and KPIs
- **Progressive Complexity**: From simple to advanced scenarios
- **Business Logic**: Real-world analytical use cases

## 🔧 **Technical Notes**

- **Schema**: All queries use `samples.tpcds_sf1.*` tables
- **Performance**: Queries include LIMIT clauses for reasonable execution times
- **Compatibility**: Works with any Databricks workspace (TPC-DS is standard)
- **Visualization**: Designed to render clearly in the visual builder
- **Simplicity**: Focused on clarity over complexity

## 📚 **Why This Approach?**

We've chosen to provide **3 clean, focused queries** instead of many complex ones because:

1. **Better Learning**: Progressive complexity is easier to understand
2. **Visual Clarity**: Simpler queries render more clearly in the visual builder
3. **Immediate Success**: Users can see results quickly and understand the flow
4. **Customization**: Easy to modify and extend for their own needs
5. **Performance**: Faster execution and better user experience

## 📚 **Additional Resources**

- **TPC-DS Documentation**: [Official TPC-DS specification](http://www.tpc.org/tpcds/)
- **Databricks TPC-DS**: Available in every workspace under `samples.tpcds_sf1`
- **Query Optimization**: Use these samples to learn query performance tuning
- **Business Intelligence**: Adapt these patterns for your own business scenarios

---

**Happy Query Building! 🚀**

These 3 focused samples provide a solid foundation for learning and demonstrating the Visual SQL Query Builder's capabilities across progressive complexity levels.

-- Time-Based Sales Trends Analysis
-- 4-table join showing sales trends over time with seasonal patterns
-- Demonstrates: Temporal analytics, seasonal analysis, trend identification

SELECT 
    d.d_year,
    d.d_month,
    d.d_month_name,
    d.d_day_name,
    d.d_holiday,
    i.i_category,
    i.i_brand,
    COUNT(DISTINCT ss.ss_ticket_number) as store_transactions,
    SUM(ss.ss_quantity) as store_quantity,
    SUM(ss.ss_sales_price) as store_sales,
    COUNT(DISTINCT ws.ws_order_number) as web_transactions,
    SUM(ws.ws_quantity) as web_quantity,
    SUM(ws.ws_sales_price) as web_sales,
    ROUND(AVG(ss.ss_sales_price), 2) as avg_store_ticket,
    ROUND(AVG(ws.ws_sales_price), 2) as avg_web_ticket
FROM samples.tpcds_sf1.date_dim d
LEFT JOIN samples.tpcds_sf1.store_sales ss
    ON d.d_date_sk = ss.ss_sold_date_sk
LEFT JOIN samples.tpcds_sf1.item i
    ON ss.ss_item_sk = i.i_item_sk
LEFT JOIN samples.tpcds_sf1.web_sales ws
    ON d.d_date_sk = ws.ws_sold_date_sk
    AND i.i_item_sk = ws.ws_item_sk
WHERE d.d_year IN (1999, 2000, 2001)
    AND d.d_month IN (12, 1, 2, 6, 7, 8)  -- Winter and Summer months
    AND i.i_category IS NOT NULL
GROUP BY d.d_year, d.d_month, d.d_month_name, d.d_day_name, d.d_holiday, i.i_category, i.i_brand
HAVING store_transactions > 0 OR web_transactions > 0
ORDER BY d.d_year, d.d_month, store_sales DESC, web_sales DESC
LIMIT 200;

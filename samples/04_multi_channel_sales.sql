-- Multi-Channel Sales Analysis
-- 5-table join comparing sales performance across store, web, and catalog channels
-- Demonstrates: Complex analytics, multiple data sources, UNION-like logic

SELECT 
    'Store' as channel,
    s.s_store_name,
    i.i_category,
    d.d_year,
    d.d_month,
    SUM(ss.ss_sales_price) as total_sales,
    COUNT(*) as transaction_count
FROM samples.tpcds_sf1.store_sales ss
INNER JOIN samples.tpcds_sf1.store s
    ON ss.ss_store_sk = s.s_store_sk
INNER JOIN samples.tpcds_sf1.item i
    ON ss.ss_item_sk = i.i_item_sk
INNER JOIN samples.tpcds_sf1.date_dim d
    ON ss.ss_sold_date_sk = d.d_date_sk
INNER JOIN samples.tpcds_sf1.customer c
    ON ss.ss_customer_sk = c.c_customer_sk
WHERE d.d_year = 2000
    AND i.i_category IN ('Electronics', 'Home', 'Sports')
GROUP BY s.s_store_name, i.i_category, d.d_year, d.d_month

UNION ALL

SELECT 
    'Web' as channel,
    w.w_web_site_name as location_name,
    i.i_category,
    d.d_year,
    d.d_month,
    SUM(ws.ws_sales_price) as total_sales,
    COUNT(*) as transaction_count
FROM samples.tpcds_sf1.web_sales ws
INNER JOIN samples.tpcds_sf1.web_site w
    ON ws.ws_web_site_sk = w.w_web_site_sk
INNER JOIN samples.tpcds_sf1.item i
    ON ws.ws_item_sk = i.i_item_sk
INNER JOIN samples.tpcds_sf1.date_dim d
    ON ws.ws_sold_date_sk = d.d_date_sk
INNER JOIN samples.tpcds_sf1.customer c
    ON ws.ws_bill_customer_sk = c.c_customer_sk
WHERE d.d_year = 2000
    AND i.i_category IN ('Electronics', 'Home', 'Sports')
GROUP BY w.w_web_site_name, i.i_category, d.d_year, d.d_month

ORDER BY channel, total_sales DESC
LIMIT 200;

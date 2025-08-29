-- Store Sales Performance Analysis
-- 3-table join showing sales performance by store and item category
-- Demonstrates: Multiple JOINs, aggregations, GROUP BY

SELECT 
    s.s_store_name,
    s.s_store_id,
    i.i_category,
    i.i_brand,
    SUM(ss.ss_quantity) as total_quantity,
    SUM(ss.ss_sales_price) as total_sales,
    COUNT(*) as transaction_count
FROM samples.tpcds_sf1.store_sales ss
INNER JOIN samples.tpcds_sf1.store s
    ON ss.ss_store_sk = s.s_store_sk
INNER JOIN samples.tpcds_sf1.item i
    ON ss.ss_item_sk = i.i_item_sk
WHERE ss.ss_sold_date_sk >= 2451545  -- Year 2000
    AND ss.ss_sold_date_sk <= 2451910  -- Year 2001
GROUP BY s.s_store_name, s.s_store_id, i.i_category, i.i_brand
ORDER BY total_sales DESC
LIMIT 100;

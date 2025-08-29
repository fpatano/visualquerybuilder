-- Promotion Effectiveness Analysis
-- 4-table join analyzing promotion performance and ROI
-- Demonstrates: Marketing analytics, ROI analysis, promotional impact

SELECT 
    p.p_promo_sk,
    p.p_promo_name,
    p.p_promo_type,
    p.p_promo_cost,
    p.p_promo_start_date_sk,
    p.p_promo_end_date_sk,
    d.d_year,
    d.d_month,
    i.i_category,
    i.i_brand,
    COUNT(DISTINCT ss.ss_ticket_number) as store_promoted_sales,
    SUM(ss.ss_sales_price) as store_promoted_revenue,
    COUNT(DISTINCT ws.ws_order_number) as web_promoted_sales,
    SUM(ws.ws_sales_price) as web_promoted_revenue,
    (store_promoted_revenue + web_promoted_revenue) as total_promoted_revenue,
    ROUND((total_promoted_revenue - p.p_promo_cost) / p.p_promo_cost * 100, 2) as roi_percentage,
    CASE 
        WHEN roi_percentage > 200 THEN 'Excellent'
        WHEN roi_percentage > 100 THEN 'Good'
        WHEN roi_percentage > 50 THEN 'Fair'
        WHEN roi_percentage > 0 THEN 'Poor'
        ELSE 'Loss'
    END as promotion_performance
FROM samples.tpcds_sf1.promotion p
INNER JOIN samples.tpcds_sf1.date_dim d
    ON p.p_promo_start_date_sk <= d.d_date_sk 
    AND p.p_promo_end_date_sk >= d.d_date_sk
LEFT JOIN samples.tpcds_sf1.store_sales ss
    ON d.d_date_sk = ss.ss_sold_date_sk
    AND ss.ss_promo_sk = p.p_promo_sk
LEFT JOIN samples.tpcds_sf1.item i
    ON ss.ss_item_sk = i.i_item_sk
LEFT JOIN samples.tpcds_sf1.web_sales ws
    ON d.d_date_sk = ws.ws_sold_date_sk
    AND ws.ws_promo_sk = p.p_promo_sk
WHERE d.d_year IN (1999, 2000, 2001)
    AND p.p_promo_cost > 0
    AND p.p_promo_type IN ('Bundle', 'Discount', 'Rebate')
GROUP BY 
    p.p_promo_sk, p.p_promo_name, p.p_promo_type, p.p_promo_cost,
    p.p_promo_start_date_sk, p.p_promo_end_date_sk, d.d_year, d.d_month,
    i.i_category, i.i_brand
HAVING total_promoted_revenue > 0
ORDER BY roi_percentage DESC
LIMIT 100;

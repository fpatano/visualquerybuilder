-- Inventory and Sales Correlation Analysis
-- 6-table join analyzing inventory levels, sales performance, and item characteristics
-- Demonstrates: Complex business intelligence, multiple dimensions, correlation analysis

SELECT 
    i.i_item_sk,
    i.i_item_id,
    i.i_product_name,
    i.i_category,
    i.i_brand,
    i.i_class,
    i.i_current_price,
    inv.inv_quantity_on_hand,
    inv.inv_warehouse_sk,
    w.w_warehouse_name,
    COUNT(DISTINCT ss.ss_ticket_number) as store_sales_count,
    SUM(ss.ss_quantity) as store_sales_quantity,
    SUM(ss.ss_sales_price) as store_sales_amount,
    COUNT(DISTINCT ws.ws_order_number) as web_sales_count,
    SUM(ws.ws_quantity) as web_sales_quantity,
    SUM(ws.ws_sales_price) as web_sales_amount,
    CASE 
        WHEN inv.inv_quantity_on_hand > 0 THEN 'In Stock'
        WHEN inv.inv_quantity_on_hand = 0 THEN 'Out of Stock'
        ELSE 'Unknown'
    END as stock_status
FROM samples.tpcds_sf1.item i
LEFT JOIN samples.tpcds_sf1.inventory inv
    ON i.i_item_sk = inv.inv_item_sk
LEFT JOIN samples.tpcds_sf1.warehouse w
    ON inv.inv_warehouse_sk = w.w_warehouse_sk
LEFT JOIN samples.tpcds_sf1.store_sales ss
    ON i.i_item_sk = ss.ss_item_sk
    AND ss.ss_sold_date_sk >= 2451545  -- Year 2000
LEFT JOIN samples.tpcds_sf1.web_sales ws
    ON i.i_item_sk = ws.ws_item_sk
    AND ws.ws_sold_date_sk >= 2451545  -- Year 2000
LEFT JOIN samples.tpcds_sf1.date_dim d
    ON COALESCE(ss.ss_sold_date_sk, ws.ws_sold_date_sk) = d.d_date_sk
WHERE i.i_category IN ('Electronics', 'Home', 'Sports', 'Books')
    AND (inv.inv_quantity_on_hand > 0 OR ss.ss_item_sk IS NOT NULL OR ws.ws_item_sk IS NOT NULL)
GROUP BY 
    i.i_item_sk, i.i_item_id, i.i_product_name, i.i_category, i.i_brand, i.i_class, 
    i.i_current_price, inv.inv_quantity_on_hand, inv.inv_warehouse_sk, w.w_warehouse_name
HAVING store_sales_count > 0 OR web_sales_count > 0
ORDER BY (store_sales_amount + web_sales_amount) DESC
LIMIT 100;

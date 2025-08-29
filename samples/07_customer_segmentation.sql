-- Customer Segmentation Analysis
-- 5-table join performing customer segmentation based on demographics and behavior
-- Demonstrates: Customer analytics, segmentation, behavioral analysis

SELECT 
    c.c_customer_sk,
    c.c_first_name,
    c.c_last_name,
    c.c_email_address,
    cd.cd_education_status,
    cd.cd_marital_status,
    cd.cd_gender,
    hd.hd_income_band_sk,
    ca.ca_city,
    ca.ca_state,
    ca.ca_country,
    COUNT(DISTINCT ss.ss_ticket_number) as store_visits,
    SUM(ss.ss_sales_price) as store_spending,
    COUNT(DISTINCT ws.ws_order_number) as web_orders,
    SUM(ws.ws_sales_price) as web_spending,
    (store_spending + web_spending) as total_spending,
    CASE 
        WHEN (store_spending + web_spending) >= 10000 THEN 'High Value'
        WHEN (store_spending + web_spending) >= 5000 THEN 'Medium Value'
        WHEN (store_spending + web_spending) >= 1000 THEN 'Low Value'
        ELSE 'Minimal'
    END as customer_segment,
    CASE 
        WHEN store_visits > web_orders THEN 'Store Preferred'
        WHEN web_orders > store_visits THEN 'Web Preferred'
        ELSE 'Omnichannel'
    END as channel_preference
FROM samples.tpcds_sf1.customer c
INNER JOIN samples.tpcds_sf1.customer_demographics cd
    ON c.c_current_cdemo_sk = cd.cd_demo_sk
INNER JOIN samples.tpcds_sf1.household_demographics hd
    ON c.c_current_hdemo_sk = hd.hd_demo_sk
INNER JOIN samples.tpcds_sf1.customer_address ca
    ON c.c_current_addr_sk = ca.ca_address_sk
LEFT JOIN samples.tpcds_sf1.store_sales ss
    ON c.c_customer_sk = ss.ss_customer_sk
    AND ss.ss_sold_date_sk >= 2451545  -- Year 2000
LEFT JOIN samples.tpcds_sf1.web_sales ws
    ON c.c_customer_sk = ws.ws_bill_customer_sk
    AND ws.ws_sold_date_sk >= 2451545  -- Year 2000
WHERE cd.cd_education_status IN ('College', 'Graduate degree')
    AND hd.hd_income_band_sk >= 5  -- Higher income bands
GROUP BY 
    c.c_customer_sk, c.c_first_name, c.c_last_name, c.c_email_address,
    cd.cd_education_status, cd.cd_marital_status, cd.cd_gender,
    hd.hd_income_band_sk, ca.ca_city, ca.ca_state, ca.ca_country
HAVING total_spending > 0
ORDER BY total_spending DESC
LIMIT 100;

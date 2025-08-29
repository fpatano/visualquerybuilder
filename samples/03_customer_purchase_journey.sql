-- Customer Purchase Journey Analysis
-- 4-table join showing customer purchase patterns and returns
-- Demonstrates: Complex business logic, LEFT JOINs, subqueries

SELECT 
    c.c_customer_sk,
    c.c_first_name,
    c.c_last_name,
    ca.ca_city,
    ca.ca_state,
    COUNT(DISTINCT ss.ss_ticket_number) as purchase_count,
    SUM(ss.ss_sales_price) as total_spent,
    COUNT(sr.sr_returned_date_sk) as return_count,
    SUM(sr.sr_return_amt) as total_returned
FROM samples.tpcds_sf1.customer c
INNER JOIN samples.tpcds_sf1.customer_address ca
    ON c.c_current_addr_sk = ca.ca_address_sk
INNER JOIN samples.tpcds_sf1.store_sales ss
    ON c.c_customer_sk = ss.ss_customer_sk
LEFT JOIN samples.tpcds_sf1.store_returns sr
    ON ss.ss_ticket_number = sr.sr_ticket_number
    AND ss.ss_item_sk = sr.sr_item_sk
WHERE ss.ss_sold_date_sk >= 2451545  -- Year 2000
GROUP BY c.c_customer_sk, c.c_first_name, c.c_last_name, ca.ca_city, ca.ca_state
HAVING purchase_count >= 5
ORDER BY total_spent DESC
LIMIT 100;

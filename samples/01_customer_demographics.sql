-- Customer Demographics Analysis
-- Simple 2-table join showing customer characteristics
-- Demonstrates: Basic JOIN, WHERE filtering, column selection

SELECT 
    c.c_customer_sk,
    c.c_first_name,
    c.c_last_name,
    c.c_email_address,
    cd.cd_education_status,
    cd.cd_marital_status,
    cd.cd_gender
FROM samples.tpcds_sf1.customer c
INNER JOIN samples.tpcds_sf1.customer_demographics cd
    ON c.c_current_cdemo_sk = cd.cd_demo_sk
WHERE cd.cd_education_status = 'College'
LIMIT 100;

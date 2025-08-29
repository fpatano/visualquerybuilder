SELECT 
    c.c_name,
    c.c_nationkey,
    o.o_orderkey,
    o.o_orderdate,
    o.o_totalprice,
    l.l_partkey,
    l.l_quantity,
    l.l_extendedprice
FROM 
    samples.tpch.customer as c
    JOIN samples.tpch.orders as o ON c.c_custkey = o.o_custkey
    JOIN samples.tpch.lineitem as l ON o.o_orderkey = l.l_orderkey
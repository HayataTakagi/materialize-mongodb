#!/bin/sh
for i in 10200040 10200036 10200038 10200009 10200013 10200023 10200003 10200021 10200043 10200026 10200022 10200014 10200027 10200041 10200029 10200019 10200007 10200011 10200015 10200042
do
  curl -X POST \
    http://192.168.33.11:3000/findOneTest \
    -H 'Content-Type: application/json' \
    -H 'cache-control: no-cache' \
    -d "{\"model_name\":\"Story\", \"query\": {\"_id\" :${i}}, \"populate\": [\"author\", \"fans\"], \"test_id\": 1102002, \"exName\": \"ex1\"}"
done

#!/bin/sh
j=0
testId=$(date +%s)
query_array=(10200078 10200043 10200028 10200075 10200041 10200092 10200039 10200004 10200058 10200015 10200020 10200044 10200053 10200008 10200009 10200030 10200022 10200057 10200086 10200080 10200021 10200037 10200079 10200073 10200023 10200000 10200095 10200077 10200067 10200081 10200027 10200061 10200088 10200096 10200032 10200026 10200050 10200072 10200085 10200048 10200045 10200097 10200090 10200013 10200076 10200069 10200059 10200065 10200051 10200012)
for i in "${query_array[@]}"
do
  j=$((j+1))
  curl -X POST \
    http://192.168.33.11:3000/findOne \
    -H 'Content-Type: application/json' \
    -H 'cache-control: no-cache' \
    -d "{\"modelName\":\"Story\", \"query\": {\"_id\" :${i}}, \"populate\": [\"author\", \"fans\", \"publication\", \"comments\"], \"processNum\": ${j} ,\"processNumAll\": ${#query_array[*]}, \"testId\": ${testId}}"
    sleep 1
done
echo TestId is ${testId}. This has copied.
echo ${testId} | pbcopy #クリップボードにtestIdをコピー

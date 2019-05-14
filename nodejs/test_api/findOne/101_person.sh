#!/bin/sh
j=0
testId=$(date +%s)
query_array=(10100281 10100337 10100046 10100495 10100393 10100382 10100463 10100012 10100354 10100250 10100059 10100347 10100181 10100496 10100403 10100176 10100134 10100444 10100345 10100385 10100224 10100159 10100207 10100122 10100346 10100082 10100009 10100118 10100055 10100103 10100466 10100342 10100378 10100025 10100360 10100085 10100193 10100068 10100146 10100261 10100274 10100325 10100364 10100011 10100471 10100228 10100477 10100129 10100071 10100315)
for i in "${query_array[@]}"
do
  j=$((j+1))
  curl -X POST \
    http://192.168.33.11:3000/findOne \
    -H 'Content-Type: application/json' \
    -H 'cache-control: no-cache' \
    -d "{\"modelName\":\"Person\", \"query\": {\"_id\" :${i}}, \"populate\": [\"stories\"], \"processNum\": ${j} ,\"processNumAll\": ${#query_array[*]}, \"testId\": ${testId}}"
    sleep 1
done
echo TestId is ${testId}. This has copied.
echo ${testId} | pbcopy #クリップボードにtestIdをコピー

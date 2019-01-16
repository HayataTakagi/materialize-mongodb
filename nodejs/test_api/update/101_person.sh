#!/bin/sh
j=1
query_array=(10100281 10100337 10100046 10100495 10100393 10100382 10100463 10100012 10100354 10100250 10100059 10100347 10100181 10100496 10100403 10100176 10100134 10100444 10100345 10100385 10100224 10100159 10100207 10100122 10100346 10100082 10100009 10100118 10100055 10100103 10100466 10100342 10100378 10100025 10100360 10100085 10100193 10100068 10100146 10100261 10100274 10100325 10100364 10100011 10100471 10100228 10100477 10100129 10100071 10100315)
curl -X POST \
http://192.168.33.11:3000/start \
-H 'Content-Type: application/json' \
-H 'cache-control: no-cache'
for i in "${query_array[@]}"
do
  curl -X POST \
  http://192.168.33.11:3000/update \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d "{\"model_name\": \"Person\", \"query\":{ \"_id\": ${i}}, \"update_document\": {\"name\":\"卒研太郎7\"} ,\"log_level\": 1, \"process_num\": ${j} ,\"process_num_all\": ${#query_array[*]}}"
  j=$((j+1))
done
curl -X POST \
http://192.168.33.11:3000/finish \
-H 'Content-Type: application/json' \
-H 'cache-control: no-cache' \
-d "{\"log_level\": 4, \"process_num\": ${j} ,\"process_num\": ${#query_array[*]}}"

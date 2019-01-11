#!/bin/sh
j=1
# query_array=(10200040 10200036 10200038 10200009 10200013)
# query_array=(10200040 10200036 10200038 10200009 10200013 10200023 10200003 10200021 10200043 10200026 10200022 10200014 10200027 10200041 10200029 10200019 10200007 10200011 10200015 10200042)
query_array=(10200037 10200027 10200022 10200012 10200043 10200008 10200036 10200039 10200013 10200048 10200038 10200010 10200011 10200009 10200002 10200031 10200003 10200025 10200044 10200032 10200046 10200014 10200029 10200020 10200019 10200001 10200017 10200042 10200007 10200016 10200024 10200018 10200045 10200034 10200026 10200021 10200041 10200028 10200030 10200040)
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
  -d "{\"model_name\": \"Story\", \"query\":{ \"_id\": ${i}}, \"document\": {\"title\":\"ごめんなさい\"} ,\"log_level\": 1, \"process_num\": ${j} ,\"process_num_all\": ${#query_array[*]}}"
  j=$((j+1))
done
curl -X POST \
http://192.168.33.11:3000/finish \
-H 'Content-Type: application/json' \
-H 'cache-control: no-cache' \
-d "{\"log_level\": 4, \"process_num\": ${j} ,\"process_num\": ${#query_array[*]}}"

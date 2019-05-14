#!/bin/sh
for (( i = 0; i < 1000; i++ )); do
  curl -X POST \
    http://192.168.33.11:3000/insertMany \
    -H 'Content-Type: application/json' \
    -H 'cache-control: no-cache' \
    -d @./../../../python/fixtures/components/101_person_$(($i+1)).json
done

#!/bin/sh
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/104_publisher_1.json
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/104_publisher_2.json
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/104_publisher_3.json

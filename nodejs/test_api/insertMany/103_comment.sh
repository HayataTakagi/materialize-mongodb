#!/bin/sh
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/103_comment_1.json
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/103_comment_2.json
curl -X POST \
  http://192.168.33.11:3000/insertMany \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d @./../../../python/fixtures/components/103_comment_3.json

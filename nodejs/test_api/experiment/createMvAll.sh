#!/bin/sh

# MV作成
# curl -m 150\
#   -X POST \
#   http://192.168.33.11:3000/createMvAll \
#   -H 'Content-Type: application/json' \
#   -H 'cache-control: no-cache' \
#   -d '{"logLevel": 3}'

while [[ true ]]; do
  res=$(curl \
          -X POST \
          http://192.168.33.11:3000/checkCompletedCreatedMv \
          -H 'Content-Type: application/json' \
          -H 'cache-control: no-cache' \
          -d "{\"checkModelList\": [\"Person\", \"Story\", \"Comment\", \"Publisher\"], \"mvNum\": 100000, \"logLevel\": 3}")
  # 未終了のモデル数を取得
  uncompleteLngth=$(echo $res | jq ".uncomplete" | jq length)
  if [[ $uncompleteLngth == 0 ]]; then
    echo ALL Finish!
    break
  else
    echo unFinish: ${uncompleteLngth}
    sleep 60
  fi
done
#MV作成終了音
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/Media\ Keys.aif

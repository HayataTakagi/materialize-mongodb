#実験数
processPerModel=20000
analysisPerQuery=1000

#testId
testId1=201020201
testId2=201020202
testId3=201020203

#実験名
testName1="3A-1"
testName1="3A-2"
testName1="3A-3"

modelList=("Person" "Story" "Comment" "Publisher")
modelLength=${#modelList[@]}
allProcess=$((processPerModel*modelLength))
analysisPeri=$((analysisPerQuery*modelLength))

# IDリストをインポート
. ./components/101_person_100th.txt
. ./components/102_story_100th.txt
. ./components/103_comment_100th.txt
. ./components/104_publisher_100th.txt

# updateリストをインポート
. ./components/update_20thq2u.txt

updateIndex=0

# ==================[1]=================
# DB初期化
curl -X POST \
  http://192.168.33.11:3000/removeCollections \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{"isRemoveAll": 1, "logLevel": 1}'
sleep 5
# データ流し込み
for file in `\find ./../insertMany/ -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    echo Run ${file}
    ${file} > ~/workspace/materialize-mongodb/nodejs/log/insertMany.log
  fi
done

# 実体化なしテスト開始
for i in `seq 0 $(($allProcess-1))`
do
  countInModel=$(($i/$modelLength))
  echo allCount:$(($i+1))/${allProcess}, countInModel: ${countInModel}
  if [[ $countInModel == ${updateArray[updateIndex]} ]]; then
    # 全モデルにupdateが終了次第indexを次に進める
    if [[ $(($i%$modelLength)) == $(($modelLength-1)) ]]; then
      updateIndex=$(($updateIndex+1))  # updateメソッドindexを加算
    fi
    # update処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Person\", \"query\":{ \"_id\": ${personIds[countInModel]}}, \"updateDocument\": {\"name\":\"卒研太郎124\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Story\", \"query\":{ \"_id\": ${storyIds[countInModel]}}, \"updateDocument\": {\"title\":\"卒研ストーリー124\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Comment\", \"query\":{ \"_id\": ${commentIds[countInModel]}}, \"updateDocument\": {\"speak\":{\"speaker\": 10100839, \"comment\": \"卒研頑張ろう。\"}} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Publisher\", \"query\":{ \"_id\": ${publisherIds[countInModel]}}, \"updateDocument\": {\"address\":\"つくば市天王台\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    fi
  else
    # find処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Person\", \"query\": {\"_id\" :${personIds[countInModel]}}, \"populate\": [], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Story\", \"query\": {\"_id\" :${storyIds[countInModel]}}, \"populate\": [\"author\", \"fans\", \"publication\", \"comments\"], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Comment\", \"query\": {\"_id\" :${commentIds[countInModel]}}, \"populate\": [\"speak.speaker\", \"story\"], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Publisher\", \"query\": {\"_id\" :${publisherIds[countInModel]}}, \"populate\": [], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": ${testName1}}"
    fi
  fi
done
#終了音の再生
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif

# ==================[2]=================
# 変数初期化
updateIndex=0
# DB初期化(クエリログは残す)
curl -X POST \
  http://192.168.33.11:3000/removeCollections \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{"isRemoveAll": 0, "isRemoveOriginal":1, "isRemoveMv": 1, "isRemoveLog": 0, "isRemoveMvLog": 1, "logLevel": 1}'
sleep 5
# データ流し込み
for file in `\find ./../insertMany/ -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    echo Run ${file}
    ${file} > ~/workspace/materialize-mongodb/nodejs/log/insertMany.log
  fi
done

# MV作成
curl -X POST \
  http://192.168.33.11:3000/createMvAll \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d "{\"logLevel\": 3, \"testPattern\": ${testName2}}"

# MVが完全に作り終わるまでsleep
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

#全実体化テスト開始
for i in `seq 0 $(($allProcess-1))`
do
  countInModel=$(($i/$modelLength))
  echo allCount:$(($i+1))/${allProcess}, countInModel: ${countInModel}
  if [[ $countInModel == ${updateArray[updateIndex]} ]]; then
    # 全モデルにupdateが終了次第indexを次に進める
    if [[ $(($i%$modelLength)) == $(($modelLength-1)) ]]; then
      updateIndex=$(($updateIndex+1))  # updateメソッドindexを加算
    fi
    # update処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Person\", \"query\":{ \"_id\": ${personIds[countInModel]}}, \"updateDocument\": {\"name\":\"卒研太郎124\"} ,\"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Story\", \"query\":{ \"_id\": ${storyIds[countInModel]}}, \"updateDocument\": {\"title\":\"卒研ストーリー124\"} ,\"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Comment\", \"query\":{ \"_id\": ${commentIds[countInModel]}}, \"updateDocument\": {\"speak\":{\"speaker\": 10100839, \"comment\": \"卒研頑張ろう。\"}} ,\"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Publisher\", \"query\":{ \"_id\": ${publisherIds[countInModel]}}, \"updateDocument\": {\"address\":\"つくば市天王台\"} ,\"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    fi
  else
    # find処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Person\", \"query\": {\"_id\" :${personIds[countInModel]}}, \"populate\": [], \"testId\": ${testId2}, \"processNum\": $(($i+1)), \"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Story\", \"query\": {\"_id\" :${storyIds[countInModel]}}, \"populate\": [\"author\", \"fans\", \"publication\", \"comments\"], \"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Comment\", \"query\": {\"_id\" :${commentIds[countInModel]}}, \"populate\": [\"speak.speaker\", \"story\"], \"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Publisher\", \"query\": {\"_id\" :${publisherIds[countInModel]}}, \"populate\": [], \"testId\": ${testId2}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess},  \"testPattern\": ${testName2}}"
    fi
  fi
done
#終了音の再生
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif

==================[3]=================

# 変数初期化
updateIndex=0
# DB初期化(クエリログは残す)
curl -X POST \
  http://192.168.33.11:3000/removeCollections \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{"isRemoveAll": 0, "isRemoveOriginal":1, "isRemoveMv": 1, "isRemoveLog": 0, "isRemoveMvLog": 1, "logLevel": 1}'
sleep 5
#データ流し込み
for file in `\find ./../insertMany/ -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    echo Run ${file}
    ${file} > ~/workspace/materialize-mongodb/nodejs/log/insertMany.log
  fi
done

#提案手法テスト開始
for i in `seq 0 $(($allProcess-1))`
do
  # 所定のタイミングでMV化条件を検討する
  if [[ $(($i%$analysisPeri)) == 0 ]]; then
    # まずMV化すべきモデルを取得し、MV化が終了するまでsleepする
    res=$(curl \
          -X POST \
          http://192.168.33.11:3000/checkShouldCreatedMv \
          -H 'Content-Type: application/json' \
          -H 'cache-control: no-cache' \
          -d "{\"logLevel\": 3, \"testId\": ${testId3}}")
    shouldList=$(echo $res | jq ".shouldCreateMvList")
    # MV化実行
    curl -X POST \
    http://192.168.33.11:3000/judgeCreateMv \
    -H 'Content-Type: application/json' \
    -H 'cache-control: no-cache' \
    -d "{\"logLevel\": 3, \"testId\": ${testId3}}"
    --max-time 2400
    # MVが完全に作り終わるまでsleep
    while [[ true ]]; do
      res=$(curl \
            -X POST \
            http://192.168.33.11:3000/checkCompletedCreatedMv \
            -H 'Content-Type: application/json' \
            -H 'cache-control: no-cache' \
            -d "{\"checkModelList\": ${shouldList}, \"mvNum\": 100000, \"logLevel\": 3}")
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
  fi
  countInModel=$(($i/$modelLength))
  echo allCount:$(($i+1))/${allProcess}, countInModel: ${countInModel}
  if [[ $countInModel == ${updateArray[updateIndex]} ]]; then
    # 全モデルにupdateが終了次第indexを次に進める
    if [[ $(($i%$modelLength)) == $(($modelLength-1)) ]]; then
      updateIndex=$(($updateIndex+1))  # updateメソッドindexを加算
    fi
    # update処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Person\", \"query\":{ \"_id\": ${personIds[countInModel]}}, \"updateDocument\": {\"name\":\"卒研太郎124\"} ,\"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Story\", \"query\":{ \"_id\": ${storyIds[countInModel]}}, \"updateDocument\": {\"title\":\"卒研ストーリー124\"} ,\"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Comment\", \"query\":{ \"_id\": ${commentIds[countInModel]}}, \"updateDocument\": {\"speak\":{\"speaker\": 10100839, \"comment\": \"卒研頑張ろう。\"}} ,\"testId\": ${testId3},\"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Publisher\", \"query\":{ \"_id\": ${publisherIds[countInModel]}}, \"updateDocument\": {\"address\":\"つくば市天王台\"} ,\"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    fi
  else
    # find処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Person\", \"query\": {\"_id\" :${personIds[countInModel]}}, \"populate\": [], \"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Story\", \"query\": {\"_id\" :${storyIds[countInModel]}}, \"populate\": [\"author\", \"fans\", \"publication\", \"comments\"], \"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Comment\", \"query\": {\"_id\" :${commentIds[countInModel]}}, \"populate\": [\"speak.speaker\", \"story\"], \"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Publisher\", \"query\": {\"_id\" :${publisherIds[countInModel]}}, \"populate\": [], \"testId\": ${testId3}, \"processNum\": $(($i+1)) , \"processNumAll\": ${allProcess},  \"testPattern\": ${testName3}}"
    fi
  fi
done

#終了音の再生
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif

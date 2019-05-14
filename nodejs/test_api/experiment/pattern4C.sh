#実験数
processPerModel=20000
analysisPerQuery=1000

#testId
testId1=201020301
testId2=201020302
testId3=201020303

#実験名
testName="4C"
testName1=$(echo ${testName}-1)
testName2=$(echo ${testName}-2)
testName3=$(echo ${testName}-3)


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
. ./components/update_20thq6u.txt

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
      -d "{\"modelName\": \"Person\", \"query\":{ \"_id\": ${personIds[countInModel]}}, \"updateDocument\": {\"name\":\"卒研太郎124\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Story\", \"query\":{ \"_id\": ${storyIds[countInModel]}}, \"updateDocument\": {\"title\":\"卒研ストーリー124\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Comment\", \"query\":{ \"_id\": ${commentIds[countInModel]}}, \"updateDocument\": {\"speak\":{\"speaker\": 10100839, \"comment\": \"卒研頑張ろう。\"}} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
      http://192.168.33.11:3000/update \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"modelName\": \"Publisher\", \"query\":{ \"_id\": ${publisherIds[countInModel]}}, \"updateDocument\": {\"address\":\"つくば市天王台\"} , \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    fi
  else
    # find処理
    if [[ $(($i%$modelLength)) == 0 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Person\", \"query\": {\"_id\" :${personIds[countInModel]}}, \"populate\": [], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 1 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Story\", \"query\": {\"_id\" :${storyIds[countInModel]}}, \"populate\": [\"author\", \"fans\", \"publication\", \"comments\"], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 2 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Comment\", \"query\": {\"_id\" :${commentIds[countInModel]}}, \"populate\": [\"speak.speaker\", \"story\"], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    elif [[ $(($i%$modelLength)) == 3 ]]; then
      curl -X POST \
        http://192.168.33.11:3000/findOne \
        -H 'Content-Type: application/json' \
        -H 'cache-control: no-cache' \
        -d "{\"modelName\":\"Publisher\", \"query\": {\"_id\" :${publisherIds[countInModel]}}, \"populate\": [], \"isUseMv\": 0, \"testId\": ${testId1}, \"processNum\": $(($i+1)) ,\"processNumAll\": ${allProcess}, \"testPattern\": \"${testName1}\"}"
    fi
  fi
done
#終了音の再生
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif

# 実験結果を保存
res=$(curl -X POST \
      http://192.168.33.11:3000/aggregateByTestId \
      -H 'Content-Type: application/json' \
      -H 'cache-control: no-cache' \
      -d "{\"testId3\": ${testId3}, \"logLevel\": 3}")
echo $res | jq '.' > ${testName}.txt


#終了音の再生
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif
afplay /System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/burn\ complete.aif

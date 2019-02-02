# データ流し込み
for file in `\find ./../insertMany/ -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    echo Run ${file}
    ${file} > ~/workspace/materialize-mongodb/nodejs/log/insertMany.log
  fi
done

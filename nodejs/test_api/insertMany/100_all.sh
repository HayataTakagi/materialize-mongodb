#!/bin/sh
# このファイル自身以外のディレクトリ内のファイルを実行する
for file in `\find . -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    echo Run ${file}
    ${file} > ~/workspace/materialize-mongodb/nodejs/log/insertMany.log
  fi
done

#!/bin/sh
# このファイル自身以外のディレクトリ内のファイルを実行する
# ./101_filename.pyの様なpythonファイルのみ実行
for file in `\find . -maxdepth 1 -type f`; do
  if [ $file != $0 ];then
    if [[ $file =~ ^\./1[0-9]{2}_.*\.py$ ]];then
      echo Run ${file}
      python3 ${file}
    fi
  fi
done

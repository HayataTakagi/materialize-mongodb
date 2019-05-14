# 卒業研究2018 高木颯汰
## 題目
- NoSQL型データベースシステムの実体化ビュー選択に関する研究
- https://www.mast.tsukuba.ac.jp/intra/thesis/fy2019/pdf/201511446.pdf (学内専用)

## 研究について
- MongoDBを実体化ビューを用いて高速化する研究です。
- バックエンドはnode.js, 実験に用いるRESTful APIの実装にexpress.jsを使用しています。
- ミドルウェア実装にMongooseを使用しています。

## ディレクトリ構成
```
├── README.md
├── Vagrantfile            <= 開発環境構築用
├── nodejs                 <= バックエンド
│   ├── log
│   ├── mongoose
│   ├── node_modules
│   ├── package-lock.json
│   ├── package.json
│   └── test_api
├── paper                  <= 論文
│   ├── deim
│   └── mast
├── python                 <= テストデータ作成用
│   ├── fixtures
│   ├── requirements.txt
│   └── tools
└── sotsuken.box
```

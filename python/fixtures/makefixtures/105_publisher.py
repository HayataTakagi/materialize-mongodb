import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def publisher():
    fake = Factory.create('ja_JP')
    ys = []  # json書き込み用配列に追加
    for i in range(Ex01.publisher_number):
        date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
        data = cl.OrderedDict()  # 格納するフィールドを定義
        data["_id"] = str(105) + str(i).zfill(5)
        data["name"] = fake.company()
        data["address"] = fake.address()
        data["created_at"] = date
        data["updated_at"] = date
        ys.append(data)  # json書き込み用配列に追加
    doc = cl.OrderedDict()
    doc["model_name"] = "Publisher"
    doc["log_level"] = 1
    doc["document"] = ys
    fw = open('./../components/105_publisher.json', 'w')
    json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力


if __name__ == '__main__':
    publisher()

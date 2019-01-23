import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def person():
    fake = Factory.create('ja_JP')
    ys = []  # json書き込み用配列に追加
    for i in range(round(Ex01.person_number/2)):
        date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
        data = cl.OrderedDict()  # 格納するフィールドを定義
        data["_id"] = str(101) + str(i).zfill(5)
        data["name"] = fake.name()
        data["age"] = random.randint(1, 100)
        data["created_at"] = date
        data["updated_at"] = date
        ys.append(data)  # json書き込み用配列に追加
    doc = cl.OrderedDict()
    doc["modelName"] = "Person"
    doc["logLevel"] = 1
    doc["document"] = ys
    fw = open('./../components/101_person_1.json', 'w')
    json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力
    ys = []  # json書き込み用配列に追加
    for i in range(round(Ex01.person_number/2), Ex01.person_number):
        date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
        data = cl.OrderedDict()  # 格納するフィールドを定義
        data["_id"] = str(101) + str(i).zfill(5)
        data["name"] = fake.name()
        data["age"] = random.randint(1, 100)
        data["created_at"] = date
        data["updated_at"] = date
        ys.append(data)  # json書き込み用配列に追加
    doc = cl.OrderedDict()
    doc["modelName"] = "Person"
    doc["logLevel"] = 1
    doc["document"] = ys
    fw = open('./../components/101_person_2.json', 'w')
    json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力


if __name__ == '__main__':
    person()

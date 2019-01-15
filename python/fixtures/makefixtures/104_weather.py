import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def weather():
    fake = Factory.create('ja_JP')
    ys = []  # json書き込み用配列に追加
    weather_list = ["晴れ", "曇り", "雨"]
    for i in range(Ex01.weather_number):
        date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
        data = cl.OrderedDict()  # 格納するフィールドを定義
        data["_id"] = str(104) + str(i).zfill(5)
        data["weather"] = random.choice(weather_list)
        data["date"] = date
        data["created_at"] = date
        data["updated_at"] = date
        ys.append(data)  # json書き込み用配列に追加
    doc = cl.OrderedDict()
    doc["model_name"] = "Weather"
    doc["log_level"] = 1
    doc["document"] = ys
    fw = open('./../components/104_weather.json', 'w')
    json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力


if __name__ == '__main__':
    weather()

import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def story():
    fake = Factory.create('ja_JP')
    person_array = range(10100000, 10100000+Ex01.person_number)  # ユーザーidのArray
    publisher_array = range(10400000, 10400000+Ex01.publisher_number)
    for j in range(Ex01.story_split):
        ys = []  # json書き込み用配列に追加
        for i in range(round(Ex01.story_number*j/Ex01.story_split), round(Ex01.story_number*(j+1)/Ex01.story_split)):
            date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
            data = cl.OrderedDict()  # 格納するフィールドを定義
            data["_id"] = str(102) + str(i).zfill(5)
            data["title"] = fake.word(ext_word_list=None)
            data["author"] = random.choice(person_array)
            data["fans"] = random.sample(person_array, random.randint(Ex01.min_fans, Ex01.max_fans))
            data["publication"] = random.choice(publisher_array)
            data["created_at"] = date
            data["updated_at"] = date
            ys.append(data)  # json書き込み用配列に追加
        doc = cl.OrderedDict()
        doc["modelName"] = "Story"
        doc["logLevel"] = 1
        doc["processNum"] = j+1
        doc["processNumAll"] = Ex01.story_split
        doc["document"] = ys
        fw = open(f'./../components/102_story_{j+1}.json', 'w')
        json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力

if __name__ == '__main__':
    story()

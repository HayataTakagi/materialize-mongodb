import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def comment():
    fake = Factory.create('ja_JP')
    person_array = range(10100000, 10100000+Ex01.person_number)  # ユーザーidのArray
    story_array = range(10200000, 10200000+Ex01.story_number)  # ストーリーidのArray
    for j in range(Ex01.comment_split):
        ys = []  # json書き込み用配列に追加
        for i in range(round(Ex01.comment_number*j/Ex01.comment_split), round(Ex01.comment_number*(j+1)/Ex01.comment_split)):
        # for i in range(round(Ex01.comment_number/3)):
            date = fake.date_time_this_decade().strftime("%Y-%m-%d %H:%M:%S")  # created_at & updated_at用
            data = cl.OrderedDict()  # 格納するフィールドを定義
            data["_id"] = str(103) + str(i).zfill(5)
            data["speak"] = {}
            data["speak"]["speaker"] = random.choice(person_array)
            data["speak"]["comment"]= fake.sentence(nb_words=6, variable_nb_words=True, ext_word_list=None)
            data["story"] = random.choice(story_array)
            data["created_at"] = date
            data["updated_at"] = date
            ys.append(data)  # json書き込み用配列に追加
        doc = cl.OrderedDict()
        doc["modelName"] = "Comment"
        doc["logLevel"] = 1
        doc["processNum"] = j+1
        doc["processNumAll"] = Ex01.comment_split
        doc["document"] = ys
        fw = open(f'./../components/103_comment_{j+1}.json', 'w')
        json.dump(doc, fw, indent=2, ensure_ascii=False)  # jsonファイルを出力

if __name__ == '__main__':
    comment()

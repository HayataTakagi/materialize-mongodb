import json
import collections as cl
from faker import Factory
import random
from public import Ex01

def comment():
    fake = Factory.create('ja_JP')
    ys = []  # json書き込み用配列に追加
    person_array = range(10100000, 10100000+Ex01.person_number-1)  # ユーザーidのArray
    story_array = range(10200000, 10200000+Ex01.story_number-1)  # ストーリーidのArray
    for i in range(Ex01.comment_number):
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
    fw = open('./../components/103_comment.json', 'w')
    json.dump(ys, fw, indent=2, ensure_ascii=False)  # 中間fixtureファイルを出力


if __name__ == '__main__':
    comment()

class Ex01:
    person_number = 10000  # 作成するユーザー数
    person_doc_per = 100  # 作成するユーザーの1ファイルのドキュメント数
    person_split = round(person_number / person_doc_per)  # 分割数

    story_number = 10000  # 作成するストーリーの数
    story_doc_per = 50  # 作成するストーリーの1ファイルのドキュメント数
    story_split = round(story_number / story_doc_per)  # 分割数
    min_fans = 1  # 最小ファン数
    max_fans = 100 # 最大ファン数

    comment_number = 10000 # 作成するコメント数
    comment_doc_per = 100  # 作成するコメントの1ファイルのドキュメント数
    comment_split = round(comment_number / comment_doc_per)  # 分割数

    publisher_number = 10000 # 作成する出版社数
    publisher_doc_per = 100  # 作成する出版社の1ファイルのドキュメント数
    publisher_split = round(publisher_number / publisher_doc_per)  # 分割数

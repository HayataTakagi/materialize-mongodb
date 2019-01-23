import random

if __name__ == '__main__':
    start = 10400000
    end = 10400999
    trials = 200
    id_array = random.sample(range(start,end), trials)
    map_array = list(map(str, id_array))
    print(' '.join(map_array))

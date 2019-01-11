import random

if __name__ == '__main__':
    start = 10200001
    end = 10200049
    trials = 40
    id_array = random.sample(range(start,end), trials)
    map_array = list(map(str, id_array))
    print(' '.join(map_array))

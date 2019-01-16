import random

if __name__ == '__main__':
    start = 10100000
    end = 10100499
    trials = 50
    id_array = random.sample(range(start,end), trials)
    map_array = list(map(str, id_array))
    print(' '.join(map_array))

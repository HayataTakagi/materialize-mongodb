import random

if __name__ == '__main__':
    start = 10400000
    end = 10499999
    trials = 99999
    id_array = random.sample(range(start,end), trials)
    map_array = list(map(str, id_array))
    print('publisherIds=(' + ' '.join(map_array) + ')')

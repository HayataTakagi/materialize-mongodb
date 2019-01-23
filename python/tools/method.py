import random

if __name__ == '__main__':
    trials = 100
    trial_array = range(trials)
    # update_process = [30,40,50,60,70,75,80,85,90,95]
    # update_process = [30,50,70,80,90]
    # update_process = [50,70,90]
    update_process = [50]
    method_array = []
    for item in trial_array:
        if item in update_process:
            method_array.append("update")
        else:
            method_array.append("findOne")
    # map_array = list(map(str, method_array))
    print("\""+'" "'.join(method_array)+"\"")
    # print(method_array)

import pandas as pd
import os
import logging
import sys
import pickle
import numpy as np
import itertools as it
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn import metrics

TARGET_PREFIX = 'cat'
SERVICE_COLUMNES = 'service__'
TITLE_COLUMN = 'service__title'

cache = dict()
logging.basicConfig(filename="error.log", level=logging.DEBUG)

# def load
# model.fit(X_train, Y_train)
# # save the model to disk
# filename = 'finalized_model.sav'
# pickle.dump(model, open(filename, 'wb'))
 
# # load the model from disk
# loaded_model = pickle.load(open(filename, 'rb'))
# result = loaded_model.score(X_test, Y_test)

def get_model(unique_id):
    clf = cache.get(unique_id)
    if clf is None:
        filename = './FileBank/models/trained/{uid}.sav'.format(uid = unique_id)
        clf = pickle.load(open(filename, 'rb'))
        cache[unique_id] = clf
        raise Exception('{k} is not trained.'.format(k=unique_id))

    return clf

def train_working(unique_id, options):
    # urllib.quote(unicode(str).encode('utf-8'), safe='~()*!.\'')
    logging.debug(unique_id)  

    clf = RandomForestClassifier()
    # if key in cache:
    #     clf = cache[key]
    # else:
    csv_name = './models/training/{uid}.csv'.format(uid = unique_id)
    logging.debug(csv_name)
    data_raw = pd.read_csv(csv_name)
    logging.debug("After read")
    X = data_raw.loc[:, np.logical_and(~data_raw.columns.str.startswith(TARGET_PREFIX), ~data_raw.columns.str.startswith(SERVICE_COLUMNES))]
    Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]

    # X_train, _, Y_train, _ = train_test_split(X, Y, test_size=0.3, random_state=42)

    # clf = clf.fit(X_train, Y_train)
    clf = clf.fit(X, Y)

    filename = './models/trained/{uid}.sav'.format(uid = unique_id)
    pickle.dump(clf, open(filename, 'wb'))

    cache[unique_id] = clf

    os.remove(csv_name)

    logging.debug("OK")        
    print("Ok")

def train(unique_id, options):
    # urllib.quote(unicode(str).encode('utf-8'), safe='~()*!.\'')
    logging.debug(unique_id)  

    clf = RandomForestClassifier()
    # if key in cache:
    #     clf = cache[key]
    # else:
    csv_name = './FileBank/models/training/{uid}.csv'.format(uid = unique_id)
    logging.debug(csv_name)
    data_raw = pd.read_csv(csv_name)
    logging.debug("After read")
    X = data_raw.loc[:, ~data_raw.columns.str.startswith(TARGET_PREFIX)]
    Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]

    X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.3, random_state=42)

    titles = pd.DataFrame()
    titles[TITLE_COLUMN] = X_test[TITLE_COLUMN].copy()
    
    X_train_clean = X_train.drop(TITLE_COLUMN, axis=1)
    X_test_clean = X_test.drop(TITLE_COLUMN, axis=1)

    clf = clf.fit(X_train_clean, Y_train)

    filename = './FileBank/models/trained/{uid}.sav'.format(uid = unique_id)
    pickle.dump(clf, open(filename, 'wb'))

    cache[unique_id] = clf

    os.remove(csv_name)

    Y_pred = clf.predict(X_test_clean)

    accuracy = metrics.accuracy_score(Y_test, Y_pred)

    print("Accuracy:", accuracy)

    # return Y_test.values, Y_pred, X_train.shape[0] - count , titles.values, accuracy
    return Y_test.values, Y_pred, titles.values, accuracy

def matrix_subset(server_name, db_name, options):
    key = '{sn}_ON_{db}'.format(sn=server_name, db=db_name)
    logging.debug('key ' + key)
    clf = RandomForestClassifier()

    csv_name = './nomenclature_model/{sn}_ON_{db}.csv'.format(sn = server_name, db = db_name)
    data_raw = pd.read_csv(csv_name)
    logging.debug('nomenclature read')
    X = data_raw.loc[:, ~data_raw.columns.str.startswith(TARGET_PREFIX)]
    Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]

    _, X_test, _, Y_test = train_test_split(X, Y, test_size=0.3, random_state=42)
    logging.debug('train test split')

    # if cache.get(key) is None:
    #     train(server_name, db_name, options)

    clf = cache[key]

    column_name = TARGET_PREFIX + str(options['idx_filtering'])
    X_test[column_name] = Y_test[column_name].copy()

    X_test_filtered = X_test[X_test[column_name].eq(1)]
    Y_test_filtered = Y_test[Y_test[column_name].eq(1)]

    titles = pd.DataFrame()
    titles[TITLE_COLUMN] = X_test_filtered[TITLE_COLUMN].copy()

    X_test_filtered_raw =  X_test_filtered.loc[:, np.logical_and(~X_test_filtered.columns.str.startswith(SERVICE_COLUMNES), ~X_test_filtered.columns.str.startswith(column_name))] 

    Y_pred = clf.predict(X_test_filtered_raw)
    logging.debug('prediction ready')

    return Y_test_filtered.values, Y_pred, titles.values

# def evaluate(server_name, db_name, options):
#     key = '{sn}_ON_{db}'.format(sn=server_name, db=db_name)

#     clf = RandomForestClassifier()
#     if key not in cache:
#         train(server_name, db_name, options)

#     clf = cache[key]
#     csv_name = './nomenclature_model/{sn}_ON_{db}.csv'.format(sn = server_name, db = db_name)
#     logging.debug(csv_name)
#     data_raw = pd.read_csv(csv_name)
#     logging.debug("After read")
#     X = data_raw.loc[:, np.logical_and(~data_raw.columns.str.startswith(TARGET_PREFIX), ~data_raw.columns.str.startswith(SERVICE_COLUMNES))]
#     Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]
#     _, X_test, _, Y_test = train_test_split(X, Y, test_size=0.3, random_state=42)
    
#     Y_pred = clf.predict(X_test)

#     accuracy = metrics.accuracy_score(Y_test, Y_pred)
#     print("Accuracy:", accuracy)

#     return accuracy

# def evaluate(server_name, db_name, options):
#     csv_name = './nomenclature_model/{sn}_ON_{db}.csv'.format(sn = server_name, db = db_name)
#     data_raw = pd.read_csv(csv_name)
#     X = data_raw.loc[:, ~data_raw.columns.str.startswith(TARGET_PREFIX)]
#     Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]

#     X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.3, random_state=42)

#     clf = RandomForestClassifier()
#     clf = clf.fit(X_train, Y_train)
    
#     Y_pred = clf.predict(X_test)

#     accuracy = metrics.accuracy_score(Y_test, Y_pred)
#     print("Accuracy:", accuracy)
#     return accuracy

# def matrix(server_name, db_name, options):
#     key = '{sn}_ON_{db}'.format(sn=server_name, db=db_name)
#     logging.debug('key ' + key)
#     clf = RandomForestClassifier()

#     csv_name = './nomenclature_model/{sn}_ON_{db}.csv'.format(sn = server_name, db = db_name)
#     data_raw = pd.read_csv(csv_name)
#     logging.debug('nomenclature read')
#     X = data_raw.loc[:, np.logical_and(~data_raw.columns.str.startswith(TARGET_PREFIX), ~data_raw.columns.str.startswith(SERVICE_COLUMNES))]
#     Y = data_raw.loc[:, data_raw.columns.str.startswith(TARGET_PREFIX)]

#     X_train, X_test, _, Y_test = train_test_split(X, Y, test_size=0.3, random_state=42)
#     logging.debug('train test split')

#     if cache.get(key) is None:
#         train(server_name, db_name, options)

#     clf = cache[key]
    
#     Y_pred = clf.predict(X_test)
#     logging.debug('prediction ready')

#     return Y_test.values, Y_pred, X_train.shape[0], X_test.shape[0]

def predict(unique_id, data, options):
    clf = get_model(unique_id)

    data_raw = data['x_test']
    df = pd.DataFrame ([data_raw[1]],columns=data_raw[0])
    X = df.loc[:, ~df.columns.str.startswith(TARGET_PREFIX)]

    Y_pred = clf.predict(X)

    elem = 1
    list_of_elems = Y_pred[0].tolist()
    result = []
    for i in range(len(list_of_elems)):
        if list_of_elems[i] == elem:
            result.append(i)
    return result

def predict_proba(unique_id, data, options):
    clf = get_model(unique_id)

    data_raw = data['x_test']
    df = pd.DataFrame ([data_raw[1]],columns=data_raw[0])
    X = df.loc[:, ~df.columns.str.startswith(TARGET_PREFIX)]

    Y_pred = clf.predict(X)
    Y_by_category = clf.predict_proba(X)

    Y_by_datapoint = []
    for i in range(Y_pred.shape[0]):
        probs = {}
        for j, cat_probability in enumerate(Y_by_category):
            probs[f"{j}"] = 1 - cat_probability[i][0]
        Y_by_datapoint.append(probs)

    return Y_by_datapoint

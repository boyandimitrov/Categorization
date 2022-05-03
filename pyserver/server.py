from flask import Flask, json, request, jsonify, abort, make_response
import gzip
import sys
sys.path.append('/app/')

import logging
# logging.basicConfig(filename="./pyserver/logs/std.log", 
# 					format='%(asctime)s %(message)s', 
# 					filemode='w') 
# logger=logging.getLogger() 
# logger.setLevel(logging.INFO) 
logging.basicConfig(filename="error.log", level=logging.DEBUG)

from app import rf

companies = [{"id": 1, "name": "Company One"}, {"id": 2, "name": "Company Two"}]

api = Flask(__name__)

@api.route('/companies', methods=['GET'])
def get_companies():
    return json.dumps(companies)

# @api.route('/evaluate',methods = ['POST'])  
# def evaluate():
#     server_name = request.form['server_name']
#     db_name = request.form['db_name']
#     options = json.loads(request.form['options'])

#     score = rf.evaluate(server_name, db_name, options)

#     return make_response(jsonify(accuracy=score))

@api.route('/train',methods = ['POST'])  
def train():
    print('enter')
    unique_id = request.form['unique_id']
    options = json.loads(request.form['options'])
    print(unique_id)

    try:
        Y_test, Y_pred, X_test, accuracy = rf.train(unique_id, options)
        X = {
            "test" : Y_test.tolist(), 
            "prediction" : Y_pred.tolist(),
            "titles" : X_test.tolist(),
            # "accuracy" : str(round(accuracy, 2))
            "accuracy" : round(accuracy, 4)
        }

        result = gzip.compress(json.dumps(X).encode('utf8'), 5) 
        logging.debug('compression ready')

        response = make_response(result)
        response.headers['Content-length'] = len(result)
        response.headers['Content-Encoding'] = 'gzip'
        logging.debug('response ready')
        return response
    except Exception as err:
        print(str(err))
        abort(make_response(jsonify(message=str(err)), 500))

    return make_response(jsonify(success=True), 200)

# @api.route('/matrix',methods = ['POST'])  
# def matrix():
#     logging.debug('Enter matrix')
#     server_name = request.form['server_name']
#     db_name = request.form['db_name']
#     options = json.loads(request.form['options'])

#     logging.debug('Params matrix ' + server_name + ' ' + db_name)

#     Y_test, Y_pred, train_count, test_count = rf.matrix(server_name, db_name, options)

#     logging.debug('Prediction ready')

#     # result = json.dumps(score.tolist())
#     X = {
#         "test" : Y_test.tolist(), 
#         "prediction" : Y_pred.tolist(),
#         "train_count" : train_count,
#         "test_count" : test_count
#     }

#     try:
#         result = gzip.compress(json.dumps(X).encode('utf8'), 5) 
#         logging.debug('compression ready')
#     except:
#         e = sys.exc_info()
#         logging.error(e)
#         print(e)

#     response = make_response(result)
#     response.headers['Content-length'] = len(result)
#     response.headers['Content-Encoding'] = 'gzip'
#     logging.debug('response ready')
#     return response

# @api.route('/matrix_subset',methods = ['POST'])  
# def matrix_subset():
#     logging.debug('Enter matrix subset')
#     server_name = request.form['server_name']
#     db_name = request.form['db_name']
#     options = json.loads(request.form['options'])

#     logging.debug('Params matrix ' + server_name + ' ' + db_name)

#     Y_test, Y_pred, titles = rf.matrix_subset(server_name, db_name, options)

#     logging.debug('Prediction subset ready')

#     # result = json.dumps(score.tolist())
#     X = {
#         "test" : Y_test.tolist(), 
#         "prediction" : Y_pred.tolist(),
#         "titles" : titles.tolist()
#     }

#     try:
#         result = gzip.compress(json.dumps(X).encode('utf8'), 5) 
#         logging.debug('compression ready')
#     except:
#         e = sys.exc_info()
#         logging.error(e)
#         print(e)

#     response = make_response(result)
#     response.headers['Content-length'] = len(result)
#     response.headers['Content-Encoding'] = 'gzip'
#     logging.debug('response ready')
#     return response

# @api.route('/train',methods = ['POST'])  
# def train():
#     print('enter')
#     unique_id = request.form['unique_id']
#     options = json.loads(request.form['options'])
#     print(unique_id)

#     try:
#         rf.train(unique_id, options)
#     except Exception as err:
#         print(str(err))
#         abort(make_response(jsonify(message=str(err)), 500))

#     return make_response(jsonify(success=True), 200)

# @api.route('/predict',methods = ['POST'])  
# def predict():
#     server_name = request.form['server_name']
#     db_name = request.form['db_name']
#     data = json.loads(request.form['data'])
#     options = json.loads(request.form['options'])

#     try:
#         indexes = rf.predict(server_name, db_name, data, options)
#     except Exception as err:
#         abort(make_response(jsonify(message=str(err)), 500))

#     return make_response(jsonify(indexes=indexes))

@api.route('/predict_proba',methods = ['POST'])  
def predict_proba():
    unique_id = request.form['unique_id']
    print(unique_id)
    data = json.loads(request.form['data'])
    options = json.loads(request.form['options'])

    try:
        indexes = rf.predict_proba(unique_id, data, options)
    except Exception as err:
        abort(make_response(jsonify(message=str(err)), 500))

    return make_response(jsonify(indexes=indexes))

if __name__ == '__main__':
    api.run(host='0.0.0.0', port=3310)
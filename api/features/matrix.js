

const get_matching_indexes = (array) => {
    array.reduce(function(acc, value, idx) {
        if (value === 1)
            acc.push(idx);
        return acc;
    }, []); 

    return array;
}

const get_all_pairs = (test_indexes, pred_indexes) => {
    if ( test_indexes.indexOf(1) === -1 || pred_indexes.indexOf(1) === -1 ) {
        return [];
    }

    let intersection = [];
    test_indexes.forEach((item, idx) => {
        if ( item && pred_indexes[idx]) {
            intersection.push(idx);
        }
    })
    let result = intersection.map(item => { return {pair : [item, item], value : 1} } );

    let value_devider = test_indexes.filter(elem => elem === 1).length * pred_indexes.filter(elem => elem === 1).length;
    for (let i=0; i< test_indexes.length; i++) {
        let current_value = test_indexes[i];
        if ( !current_value || intersection.indexOf(i) > -1 ) {
            continue;
        }

        
        for (let j=0; j<pred_indexes.length; j++) {
            if ( pred_indexes[j] ) {
                result.push( { pair : [i, j], value : 1 / value_devider})
            }
        }
    }

    return result;
}

const fill_matrix = (matrix, pairs) => {
    pairs.forEach(({pair, value}) => {
        matrix[pair[0]+1][pair[1]+1] += value;
    });
    const i = 0;
}

let confusion_matrix = (categories, {prediction, test}) => {
    let rows = ["Actual / Prediction"].concat(categories);
    let matrix = categories.map(item => {
        return [item].concat(Array(categories.length).fill(0));
    });
    matrix.unshift(rows);

    for (let i=0; i < test.length; i++) {
        let test_indexes = get_matching_indexes(test[i]);
        let pred_indexes = get_matching_indexes(prediction[i]);

        let pairs = get_all_pairs(test_indexes, pred_indexes);
        fill_matrix(matrix, pairs);
    }

    const i = 0;

    return matrix;
}

let matrix_errors = (cats, data, real, predicted) => {
    let errors = [];
    for ( let i=0; i< data.titles.length; i++ ) {
        let idx_category = cats.indexOf(real);

        if ( data.prediction[i][idx_category] === 0) {
            let test_indexes = get_matching_indexes(data.test[i])
            let pred_indexes = get_matching_indexes(data.prediction[i])
            
            let test_categories = [];
            let predicted_categories = [];
            test_indexes.forEach((item, idx) => parseInt(item) && test_categories.push(cats[idx]));
            pred_indexes.forEach((item, idx) => parseInt(item) && predicted_categories.push(cats[idx]));

            if ( predicted_categories.indexOf(predicted) > -1) {
                errors.push({title : data.titles[i], real : test_categories, prediction: predicted_categories })
            }
        }
    }

    return errors;
}

let get_category_index = (cats, cat) => {
    for( let i=0; i < cats.length; i++ ) {
        if ( cats[i] === cat ) {
            return i;
        }
    }
    return -1;
}

let matrix_subset = async(token, {real, predicted})    => {
    let db_name = token.qualified_name || token.db_name;
    let server_name = token.server_name;
    let full_tenant_id = `${server_name}_ON_${db_name}`;
    const tenant_config = require(`../../config/tenants/${full_tenant_id}_algorithm`);

    let index = get_category_index(tenant_config.categories, real);

    let response = await proxy_call('matrix_subset', token.server_name, db_name, {}, {
        idx_filtering : index,
        algorithm : tenant_config.algorithm
    })

    let json = JSON.parse(response);

    return matrix_errors(tenant_config.categories, json, real, predicted);
}

module.exports = {confusion_matrix}